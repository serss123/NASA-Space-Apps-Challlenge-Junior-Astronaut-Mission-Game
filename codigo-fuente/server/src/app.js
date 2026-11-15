// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Express app of "Sol a Sol" (no listen here, so the tests can start it with a fake fetch).
//
//   GET /api/health                      → { ok, time, uptime, version }
//   GET /api/game/timeline               → ARCHIVE mission (default)
//       ?preset=live&days=21             → last N days of DONKI (LIVE), or the ARCHIVE copy if DONKI fails
//       ?startDate=…&endDate=…[&mode=daily|eventsOnly][&stepDays=N]  → custom range (compatible with the prototype)
//   GET /api/game/events?startDate&endDate&type=all  → DONKI bulletins
//   GET /api/radlab/daily?from&to        → RadLab daily means (proxy: RadLab blocks browsers)
//   GET /api/space/delay?date=YYYY-MM-DD → signal delay to the Moon and to Mars (CALCULATED)
//   GET /api/sources                     → data sources of the game
// In production it also serves the built client (client/dist) with an index.html fallback.
// Privacy: no cookies, no analytics, no stored IPs (they are only counted for one minute, in memory).
// Error answers are { error, code, message: { es, en } }: "error" is for developers (English) and "message"
// may be shown to players.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { todayUTC } from '../../shared/dates.js';
import { earthMarsLightTime, earthMoonLightTime } from '../../shared/marsDelay.js';
import { SOURCES } from './sources.js';
import {
  HttpError,
  LIMITS,
  MODES,
  NOTIFICATION_TYPES,
  PRESETS,
  createTimelineService,
  parseDateParam,
  parseEnumParam,
  parseIntParam
} from './timelineService.js';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DEFAULT_PATHS = Object.freeze({
  archive: path.join(SERVER_DIR, 'data', 'archive-may-2024.json'),
  raw: path.join(SERVER_DIR, 'data', 'raw-may-2024.json'),
  clientDist: path.resolve(SERVER_DIR, '..', 'client', 'dist')
});

/** Origins allowed to call the API from another port (the Vite dev server). */
export const DEV_ORIGINS = Object.freeze(['http://localhost:5173', 'http://127.0.0.1:5173']);

/** Content policy for the built React client: everything comes from our own server. */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self' https://ccmc.gsfc.nasa.gov",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'"
].join('; ');

export const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': CONTENT_SECURITY_POLICY
});

/** The JPL model for the delay to Mars is valid from 1800 to 2050. */
export const DELAY_RANGE = Object.freeze({ from: '1800-01-01', to: '2050-12-31' });

const SILENT_LOGGER = { info() {}, warn() {}, error() {} };

// ---------------------------------------------------------------------------
// Small pieces (exported so they can be tested on their own)
// ---------------------------------------------------------------------------

/** Security headers on every answer. */
export function securityHeaders(req, res, next) {
  res.set(SECURITY_HEADERS);
  next();
}

/**
 * Simple in-memory limiter: `max` requests per IP every `windowMs` → 429 in JSON.
 * It protects the DONKI quota (about 120 calls per hour). IPs only live in memory during the window.
 */
export function createRateLimiter({ windowMs = 60 * 1000, max = 30, now = () => Date.now(), maxClients = 10000 } = {}) {
  const hits = new Map(); // ip → { count, reset }

  function forget(t) {
    for (const [ip, entry] of hits) if (entry.reset <= t) hits.delete(ip);
    if (hits.size > maxClients) hits.clear(); // safety valve for memory
  }

  return function rateLimit(req, res, next) {
    const t = now();
    if (hits.size >= maxClients) forget(t);
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    let entry = hits.get(ip);
    if (!entry || entry.reset <= t) {
      entry = { count: 0, reset: t + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;
    const waitSeconds = Math.max(1, Math.ceil((entry.reset - t) / 1000));
    res.set({
      'RateLimit-Limit': String(max),
      'RateLimit-Remaining': String(Math.max(0, max - entry.count)),
      'RateLimit-Reset': String(waitSeconds)
    });
    if (entry.count <= max) return next();
    res.set('Retry-After', String(waitSeconds));
    res.status(429).json({
      error: `Too many requests: wait ${waitSeconds} s and try again.`,
      code: 'rate-limited',
      retryAfter: waitSeconds,
      message: {
        es: `Has pedido datos muchas veces seguidas. Espera ${waitSeconds} segundos y vuelve a probar.`,
        en: `You asked for data many times in a row. Wait ${waitSeconds} seconds and try again.`
      }
    });
  };
}

/** Answer of /api/space/delay for a 'YYYY-MM-DD' date (the method text is for grown-ups). */
export function delayPayload(date) {
  return {
    date,
    moon: earthMoonLightTime(date),
    mars: earthMarsLightTime(date),
    label: 'CALCULADO',
    method: {
      es: 'Calculamos dónde están la Tierra y Marte ese día con sus órbitas medias (JPL) y la ecuación de Kepler; la Luna, con el término principal de su órbita. Retraso = distancia ÷ velocidad de la luz (299 792 km/s).',
      en: 'We work out where the Earth and Mars are on that day from their mean orbits (JPL) and Kepler’s equation; the Moon, from the main term of its orbit. Delay = distance ÷ speed of light (299,792 km/s).'
    },
    reference: {
      name: 'Approximate Positions of the Planets (E. M. Standish, NASA JPL)',
      url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
      validFrom: DELAY_RANGE.from,
      validTo: DELAY_RANGE.to
    }
  };
}

/** Is the request for the ARCHIVE mission? (It spends no DONKI quota, so it skips the limiter.) */
export function wantsArchive(query = {}) {
  if (query.preset !== undefined) return query.preset === 'archive';
  return query.startDate === undefined && query.endDate === undefined;
}

/** Turns any error into { status, body } without leaking internal details. */
export function errorResponse(err) {
  if (err instanceof HttpError) return { status: err.status, body: err.toJSON() };
  if (err?.type === 'entity.too.large') {
    return { status: 413, body: { error: 'Request body too large (max 50 kB).', code: 'too-large', message: { es: 'El cuerpo de la petición es demasiado grande (máx. 50 kB).', en: 'Request body too large (max 50 kB).' } } };
  }
  if (err?.type === 'entity.parse.failed') {
    return { status: 400, body: { error: 'The JSON body is not valid.', code: 'bad-json', message: { es: 'El JSON enviado no es válido.', en: 'The JSON body is not valid.' } } };
  }
  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 404) return { status, body: notFoundBody() };
  if (status < 500) return { status, body: { error: 'Bad request.', code: 'bad-request', message: { es: 'Petición incorrecta.', en: 'Bad request.' } } };
  return { status: 500, body: { error: 'Internal server error.', code: 'internal', message: { es: 'Algo ha fallado en el servidor.', en: 'Something went wrong on the server.' } } };
}

function notFoundBody(what = 'Not found.', hint) {
  return { error: what, code: 'not-found', message: { es: 'No existe esa dirección.', en: 'That address does not exist.' }, ...(hint && { hint }) };
}

function readJson(file, { required }) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (required) throw new Error(`Could not read ${file}: ${err.message}`);
    return null;
  }
}

function readVersion() {
  return readJson(path.join(SERVER_DIR, 'package.json'), { required: false })?.version ?? '0.0.0';
}

/** Short log line for every API request (no IPs, no personal data). */
function requestLogger(logger) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      logger.info?.(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Math.round(ms)} ms)`);
    });
    next();
  };
}

// ---------------------------------------------------------------------------
// The app
// ---------------------------------------------------------------------------

/**
 * @param {object} [o]
 * @param {Function} [o.fetchImpl]   fetch for DONKI and RadLab (a fake one in the tests)
 * @param {Function} [o.now]         () => Date
 * @param {string}   [o.archivePath] path of archive-may-2024.json
 * @param {string}   [o.rawPath]     path of raw-may-2024.json (saved RadLab data and bulletins)
 * @param {string|null} [o.clientDist] folder of the built client (null = do not serve it)
 * @param {object}   [o.logger]      { info, warn, error } (console by default)
 * @param {object}   [o.rateLimit]   { windowMs, max } for the routes that call DONKI or RadLab
 * @param {*}        [o.trustProxy]  Express 'trust proxy' value when a proxy sits in front (e.g. 1)
 * @param {string[]} [o.corsOrigins] allowed origins besides our own
 * It also accepts the options of createTimelineService: liveBudgetMs, customBudgetMs, radlabBudgetMs,
 * donkiRetries, donkiHourlyLimit, radlabHourlyLimit.
 */
export function createApp({
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  archivePath = DEFAULT_PATHS.archive,
  rawPath = DEFAULT_PATHS.raw,
  clientDist = DEFAULT_PATHS.clientDist,
  logger = console,
  rateLimit = { windowMs: 60 * 1000, max: 30 },
  trustProxy = false,
  corsOrigins = DEV_ORIGINS,
  ...serviceOptions
} = {}) {
  const log = logger ?? SILENT_LOGGER;
  const archive = readJson(archivePath, { required: true });
  const raw = rawPath ? readJson(rawPath, { required: false }) : null;
  if (rawPath && !raw) log.warn?.(`No raw copy (${rawPath}): /api/radlab/daily will always ask RadLab.`);

  const service = createTimelineService({ archive, raw, fetchImpl, now, logger: log, ...serviceOptions });
  const limiter = createRateLimiter({ ...rateLimit, now: () => now().getTime() });
  const limitUnlessArchive = (req, res, next) => (wantsArchive(req.query) ? next() : limiter(req, res, next));
  const version = readVersion();

  const app = express();
  app.disable('x-powered-by');
  if (trustProxy !== false && trustProxy != null) app.set('trust proxy', trustProxy);
  app.use(securityHeaders);
  app.use(express.json({ limit: '50kb' }));

  // ----- API -----
  const api = express.Router();
  api.use(requestLogger(log));
  api.use(cors({ origin: [...corsOrigins], methods: ['GET', 'HEAD', 'OPTIONS'], credentials: false, maxAge: 600 }));
  api.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache'); // the browser may store it, but asks first (ETag)
    next();
  });

  api.get('/health', (req, res) => {
    res.json({ ok: true, time: now().toISOString(), uptime: Math.round(process.uptime()), version });
  });

  api.get('/game/timeline', limitUnlessArchive, async (req, res) => {
    const q = req.query;
    const startDate = parseDateParam(q, 'startDate');
    const endDate = parseDateParam(q, 'endDate');
    const preset = parseEnumParam(q, 'preset', PRESETS, startDate || endDate ? 'custom' : 'archive');
    const mode = parseEnumParam(q, 'mode', MODES, 'daily');
    const stepDays = parseIntParam(q, 'stepDays', { min: 1, max: LIMITS.maxStepDays, def: 1 });

    if (preset === 'archive') return res.json(service.getArchive({ mode, stepDays }));
    if (preset === 'live') {
      const days = parseIntParam(q, 'days', { min: LIMITS.liveMinDays, max: LIMITS.liveMaxDays, def: LIMITS.liveDefaultDays });
      return res.json(await service.getLive({ days, mode, stepDays }));
    }
    res.json(await service.getCustom({ startDate, endDate, mode, stepDays }));
  });

  api.get('/game/events', limiter, async (req, res) => {
    const q = req.query;
    const startDate = parseDateParam(q, 'startDate');
    const endDate = parseDateParam(q, 'endDate');
    const type = parseEnumParam(q, 'type', ['all', ...NOTIFICATION_TYPES], 'all', { ignoreCase: true });
    res.json(await service.getEvents({ startDate, endDate, type }));
  });

  api.get('/radlab/daily', limiter, async (req, res) => {
    const from = parseDateParam(req.query, 'from');
    const to = parseDateParam(req.query, 'to');
    res.json(await service.getRadlabDaily({ from, to }));
  });

  api.get('/space/delay', (req, res) => {
    const date = parseDateParam(req.query, 'date') ?? todayUTC(now());
    if (date < DELAY_RANGE.from || date > DELAY_RANGE.to) {
      throw new HttpError(400, 'date-out-of-range', {
        es: `La fecha debe estar entre ${DELAY_RANGE.from} y ${DELAY_RANGE.to} (validez del modelo de JPL).`,
        en: `The date must be between ${DELAY_RANGE.from} and ${DELAY_RANGE.to} (range of the JPL model).`
      });
    }
    res.json(delayPayload(date));
  });

  api.get('/sources', (req, res) => {
    res.json(SOURCES);
  });

  // Any other API route: 404 in JSON (never the game page).
  api.use((req, res) => {
    res.status(404).json(notFoundBody(`Unknown API route: ${req.method} ${req.originalUrl.slice(0, 200)}`));
  });

  app.use('/api', api);

  // ----- built client (production) -----
  const servingClient = mountClient(app, clientDist);
  if (!servingClient) log.info?.('No client/dist/index.html: serving the API only (in development, Vite serves the game on port 5173).');

  // ----- 404 and errors -----
  app.use((req, res) => {
    const hint = servingClient ? undefined : 'Build the client with "npm run build" or open the Vite dev server at http://localhost:5173.';
    res.status(404).json(notFoundBody('Not found.', hint));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const { status, body } = errorResponse(err);
    if (status >= 500) log.error?.(`${req.method} ${req.originalUrl} → ${status}:`, err);
    res.status(status).json(body);
  });

  return app;
}

/** Serves client/dist if it exists: /assets with an "immutable" cache, and any other GET route → index.html. */
function mountClient(app, clientDist) {
  if (!clientDist) return false;
  const indexHtml = path.join(clientDist, 'index.html');
  if (!fs.existsSync(indexHtml)) return false;

  // Files in /assets carry a hash in their name (index-B0tm.js): they can be cached for a year.
  app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y', index: false, fallthrough: false }));
  app.use(
    express.static(clientDist, {
      index: false,
      maxAge: '1h',
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      }
    })
  );
  // SPA: the game routes (/, /mision, …) return index.html; a missing file gives 404.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (path.extname(req.path)) return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
  return true;
}
