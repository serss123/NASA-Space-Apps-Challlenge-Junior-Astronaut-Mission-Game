// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Data service of the game "Sol a Sol".
// It joins three origins and decides the label of every answer:
//   · the ARCHIVE copy (server/data/archive-may-2024.json, the May 2024 mission),
//   · DONKI asked right now (LIVE mission or custom ranges),
//   · RadLab (measured doses; its API refuses browsers, so it goes through here).
// Golden rules:
//   1. ARCHIVE data is never presented as LIVE. If DONKI fails during the LIVE mission, the ARCHIVE copy is served
//      with `fallback: true` and `source: 'ARCHIVO'` (the game can always be played).
//   2. DONKI's quota is protected: a 1-hour cache, shared downloads and a cap of calls per hour.
//   3. Everything that does not need the network is a small pure function (easy to test).
// Texts a player may read (`fallbackMessage`, `meta.title`, `meta.note`, error `message`) are bilingual { es, en }
// and written for 7–12-year-olds; logs and `error` strings are for developers, in English.

import { DEFAULT_BASELINE, buildTimeline, formatDate, summarizeTimeline } from './gameTranslator.js';
import { createCache } from './cache.js';
import { compactDonki } from './donkiCompact.js';
import { DONKI_BASE, fetchDonkiType } from './donkiFetcher.js';
import { fetchRadlabDaily } from './radlab.js';
import { DAY_MS, addDays, dayOf, isISODate, parseDay, todayUTC } from '../../shared/dates.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** DONKI types the timeline needs (MPC, RBE and HSS are not used by the game). */
export const TIMELINE_DONKI_TYPES = Object.freeze(['FLR', 'CME', 'SEP', 'GST', 'IPS', 'WSAEnlilSimulations', 'notifications']);

/** DONKI bulletin types (messageType field). */
export const NOTIFICATION_TYPES = Object.freeze(['FLR', 'SEP', 'CME', 'IPS', 'MPC', 'GST', 'RBE', 'Report']);

export const MODES = Object.freeze(['daily', 'eventsOnly']);
export const PRESETS = Object.freeze(['archive', 'live', 'custom']);

export const LIMITS = Object.freeze({
  liveMinDays: 7,
  liveMaxDays: 30,
  liveDefaultDays: 21,
  customMaxDays: 120,
  eventsMaxDays: 60,
  eventsDefaultDays: 7,
  radlabMaxDays: 31,
  maxStepDays: 30,
  recentDays: 3 // a range that reaches the last 3 days counts as LIVE
});

export const TTL = Object.freeze({
  donki: HOUR, // raw DONKI data of a range
  live: HOUR,
  custom: HOUR,
  events: HOUR,
  radlab: 6 * HOUR,
  radlabPartial: 10 * MINUTE, // if RadLab failed on some day, try again sooner
  failure: 2 * MINUTE // after a DONKI failure, do not insist for 2 minutes
});

const DONKI_INFO = Object.freeze({
  name: 'NASA CCMC · Space Weather Database Of Notifications, Knowledge, Information (DONKI)',
  api: DONKI_BASE,
  web: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/'
});

// ---------------------------------------------------------------------------
// HTTP errors with a message in Spanish and English
// ---------------------------------------------------------------------------

/** Error that the app turns into `{ error, code, message: { es, en } }` with its HTTP status. */
export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message.en);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.messages = message;
    this.extra = extra;
  }

  toJSON() {
    return { error: this.message, code: this.code, message: this.messages, ...this.extra };
  }
}

const badRequest = (code, es, en) => new HttpError(400, code, { es, en });

// ---------------------------------------------------------------------------
// Reading and checking URL parameters (pure functions)
// ---------------------------------------------------------------------------

/** A URL parameter that may be missing but not repeated (`?a=1&a=2` → error 400). */
export function singleParam(query, name) {
  const value = query?.[name];
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') {
    throw badRequest('repeated-param', `El parámetro ${name} solo puede aparecer una vez.`, `The ${name} parameter can only appear once.`);
  }
  return value.trim();
}

/** A real 'YYYY-MM-DD' date (or `undefined` if missing). */
export function parseDateParam(query, name) {
  const value = singleParam(query, name);
  if (value === undefined) return undefined;
  if (!isISODate(value)) {
    throw badRequest(
      'bad-date',
      `${name} debe ser una fecha real con el formato AAAA-MM-DD (por ejemplo 2024-05-01).`,
      `${name} must be a real date written as YYYY-MM-DD (for example 2024-05-01).`
    );
  }
  return value;
}

/** A whole number between `min` and `max` (or `def` if missing). */
export function parseIntParam(query, name, { min, max, def }) {
  const value = singleParam(query, name);
  if (value === undefined) return def;
  const n = /^\d{1,6}$/.test(value) ? Number(value) : NaN;
  if (!(n >= min && n <= max)) {
    throw badRequest('bad-number', `${name} debe ser un número entero de ${min} a ${max}.`, `${name} must be a whole number from ${min} to ${max}.`);
  }
  return n;
}

/** One of the allowed values (or `def` if missing). Returns the value in its official spelling. */
export function parseEnumParam(query, name, allowed, def, { ignoreCase = false } = {}) {
  const value = singleParam(query, name);
  if (value === undefined) return def;
  const found = allowed.find((a) => (ignoreCase ? a.toLowerCase() === value.toLowerCase() : a === value));
  if (!found) {
    const list = allowed.map((a) => `"${a}"`).join(', ');
    throw badRequest('bad-option', `${name} debe ser uno de estos valores: ${list}.`, `${name} must be one of: ${list}.`);
  }
  return found;
}

/** Days between two dates (0 if they are the same). */
export const daysBetween = (from, to) => Math.round((parseDay(to) - parseDay(from)) / DAY_MS);

/** Does the range [from, to] fit completely inside the window { from, to }? */
export const isInside = (from, to, window) => Boolean(window) && from >= window.from && to <= window.to;

/** Does the range [from, to] touch the window { from, to }, even for one day? */
export const overlaps = (from, to, window) => Boolean(window) && from <= window.to && to >= window.from;

/**
 * Checks a range that was already read: both dates, order, nothing in the future and maximum length.
 * Returns `{ startDate, endDate, days }` or throws an HttpError 400 with a clear message.
 */
export function checkRange(startDate, endDate, { maxDays, today, names = ['startDate', 'endDate'] }) {
  const [a, b] = names;
  if (!startDate || !endDate) {
    throw badRequest('missing-date', `Hacen falta las dos fechas: ${a} y ${b} (AAAA-MM-DD).`, `Both dates are needed: ${a} and ${b} (YYYY-MM-DD).`);
  }
  if (startDate > endDate) {
    throw badRequest('range-order', `${a} (${startDate}) debe ser anterior o igual a ${b} (${endDate}).`, `${a} (${startDate}) must be on or before ${b} (${endDate}).`);
  }
  if (endDate > today) {
    throw badRequest(
      'future-date',
      `${b} (${endDate}) está en el futuro: la última fecha posible es hoy, ${today} (UTC).`,
      `${b} (${endDate}) is in the future: the latest possible date is today, ${today} (UTC).`
    );
  }
  const days = daysBetween(startDate, endDate) + 1;
  if (days > maxDays) {
    throw badRequest('range-too-long', `El rango tiene ${days} días; el máximo es ${maxDays}.`, `The range has ${days} days; the maximum is ${maxDays}.`);
  }
  return { startDate, endDate, days };
}

/** Window of the LIVE mission: the last `days` days ending today (UTC). */
export function liveRange(today, days) {
  return { startDate: addDays(today, -(days - 1)), endDate: today };
}

/** 'EN VIVO' if the range reaches the last days; otherwise it is historical data: 'ARCHIVO'. */
export function labelForRange(endDate, today, recentDays = LIMITS.recentDays) {
  return endDate >= addDays(today, -(recentDays - 1)) ? 'EN VIVO' : 'ARCHIVO';
}

/** Cuts an already built timeline (e.g. the ARCHIVE one), applies the mode and renumbers it. */
export function sliceTimeline(timeline, startDate, endDate, { mode = 'daily', stepDays = 1 } = {}) {
  let days = timeline.filter((d) => d.date >= startDate && d.date <= endDate);
  if (mode === 'eventsOnly') days = days.filter((d) => !d.calm);
  if (stepDays > 1) days = days.filter((_, i) => i % stepDays === 0);
  return days.map((d, i) => ({ ...d, index: i, gameDay: i + 1 }));
}

/** Answer of /api/game/timeline (always the same shape, wherever it comes from). */
export function timelinePayload({ preset, source, meta, timeline, startDate, endDate, generatedAt, mode = 'daily', summary, fallback = null }) {
  return {
    preset,
    source,
    fallback: Boolean(fallback),
    ...(fallback && {
      fallbackReason: fallback.reason,
      fallbackMessage: fallbackMessage(fallback.reason),
      requestedPreset: fallback.requestedPreset
    }),
    meta,
    summary: summary ?? summarizeTimeline(timeline),
    mode,
    totalDays: timeline.length,
    startDate,
    endDate,
    generatedAt,
    timeline
  };
}

// ---------------------------------------------------------------------------
// Network failures: a short reason + a message for kids
// ---------------------------------------------------------------------------

/** Short reason (for logs and for the client) from a network error. */
export function failureReason(err) {
  if (err?.code === 'quota') return 'quota';
  if (err?.code === 'timeout' || err?.name === 'TimeoutError' || err?.name === 'AbortError') return 'timeout';
  if (err?.status === 429) return 'rate-limited';
  if (Number.isInteger(err?.status)) return `http-${err.status}`;
  if (err instanceof SyntaxError) return 'bad-data';
  return 'network';
}

const FALLBACK_TEXT = {
  timeout: { es: 'La NASA ha tardado demasiado en contestar.', en: 'NASA took too long to answer.' },
  quota: { es: 'Ya hemos pedido muchos datos a la NASA en esta hora.', en: 'We have already asked NASA for a lot of data this hour.' },
  'rate-limited': { es: 'La NASA nos ha pedido que esperemos un poco.', en: 'NASA asked us to wait a little.' },
  other: { es: 'Ahora mismo no podemos conectar con la NASA.', en: 'We cannot connect to NASA right now.' }
};

/** Text in both languages that tells the player why the game uses the ARCHIVE copy. */
export function fallbackMessage(reason) {
  const t = FALLBACK_TEXT[reason] || FALLBACK_TEXT.other;
  return {
    es: `${t.es} Juegas con datos reales guardados de mayo de 2024 (ARCHIVO).`,
    en: `${t.en} You are playing with real data saved from May 2024 (ARCHIVE).`
  };
}

// ---------------------------------------------------------------------------
// Protecting the NASA APIs
// ---------------------------------------------------------------------------

/**
 * Global cap of calls per hour to an API (sliding window).
 * `take()` records a call or throws a 'quota' error (with status 429, so donkiFetcher does not retry).
 */
export function createCallBudget({ max, windowMs = HOUR, now = () => Date.now(), name = 'API' }) {
  const stamps = [];
  const prune = (t) => {
    while (stamps.length && stamps[0] <= t - windowMs) stamps.shift();
  };
  return {
    take() {
      const t = now();
      prune(t);
      if (stamps.length >= max) {
        throw Object.assign(new Error(`${name}: ${max} calls already made in the last hour`), { status: 429, code: 'quota' });
      }
      stamps.push(t);
    },
    used() {
      prune(now());
      return stamps.length;
    }
  };
}

/** Rejects with a 'timeout' error if the promise does not settle within `ms` milliseconds. */
export function withDeadline(promise, ms, onTimeout) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      onTimeout?.();
      reject(Object.assign(new Error(`no answer within ${ms} ms`), { code: 'timeout' }));
    }, ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer));
}

/** `fetch` that can be cancelled at once (`signal`) and that counts every real call in `budget`. */
function guardedFetch(fetchImpl, { signal, budget }) {
  return (url, init = {}) => {
    if (signal.aborted) return Promise.reject(signal.reason);
    try {
      budget?.take();
    } catch (err) {
      return Promise.reject(err);
    }
    const merged = init.signal ? AbortSignal.any([signal, init.signal]) : signal;
    return fetchImpl(url, { ...init, signal: merged });
  };
}

// ---------------------------------------------------------------------------
// The service
// ---------------------------------------------------------------------------

/**
 * @param {object} o
 * @param {object} o.archive          contents of archive-may-2024.json { meta, summary, timeline }
 * @param {object} [o.raw]            contents of raw-may-2024.json { meta: { window }, donki, radlab }
 * @param {Function} [o.fetchImpl]    the real fetch, or a fake one in the tests
 * @param {Function} [o.now]          () => Date (injectable clock)
 * @param {object} [o.logger]         { info, warn, error }
 * @param {number} [o.liveBudgetMs]   time limit for the LIVE mission (12 s)
 * @param {number} [o.customBudgetMs] time limit for a custom range (up to 4 chunks per type)
 * @param {number} [o.radlabBudgetMs] time limit for RadLab (it is slow)
 * @param {number} [o.donkiRetries]   retries per DONKI request
 * @param {number} [o.donkiHourlyLimit]  cap of DONKI calls per hour (its quota is about 120)
 * @param {number} [o.radlabHourlyLimit] cap of RadLab calls per hour
 */
export function createTimelineService({
  archive,
  raw = null,
  fetchImpl = globalThis.fetch,
  now = () => new Date(),
  cache,
  logger = console,
  liveBudgetMs = 12000,
  customBudgetMs = 20000,
  radlabBudgetMs = 45000,
  donkiRetries = 1,
  donkiHourlyLimit = 100,
  radlabHourlyLimit = 300
} = {}) {
  if (!Array.isArray(archive?.timeline) || !archive.timeline.length || !archive.meta) {
    throw new Error('Invalid ARCHIVE copy: meta or timeline is missing (server/data/archive-may-2024.json).');
  }
  const log = logger ?? { info() {}, warn() {}, error() {} }; // logger: null = no messages
  const clock = () => now().getTime();
  const store = cache ?? createCache({ now: clock });
  const donkiBudget = createCallBudget({ max: donkiHourlyLimit, now: clock, name: 'DONKI' });
  const radlabBudget = createCallBudget({ max: radlabHourlyLimit, now: clock, name: 'RadLab' });
  const archiveWindow = { from: archive.meta.from, to: archive.meta.to };
  const rawWindow = raw?.meta?.window?.from && raw?.meta?.window?.to ? raw.meta.window : null;
  const today = () => todayUTC(now());
  const stamp = () => now().toISOString();

  // The ARCHIVE answer never changes: it is prepared only once.
  const archivePayloadFull = timelinePayload({
    preset: 'archive',
    source: 'ARCHIVO',
    meta: archive.meta,
    summary: archive.summary,
    timeline: archive.timeline,
    startDate: archiveWindow.from,
    endDate: archiveWindow.to,
    generatedAt: archive.meta.builtAt ?? null
  });

  /** A piece of the ARCHIVE copy (with `fallback` if it replaces something else). */
  function archiveSlice(startDate, endDate, { mode = 'daily', stepDays = 1, fallback = null } = {}) {
    const whole = startDate === archiveWindow.from && endDate === archiveWindow.to;
    const timeline = sliceTimeline(archive.timeline, startDate, endDate, { mode, stepDays });
    return timelinePayload({
      preset: 'archive',
      source: 'ARCHIVO',
      meta: whole ? archive.meta : { ...archive.meta, slice: { from: startDate, to: endDate } },
      summary: whole && mode === 'daily' && stepDays === 1 ? archive.summary : undefined,
      timeline,
      mode,
      startDate,
      endDate,
      generatedAt: archive.meta.builtAt ?? null,
      fallback
    });
  }

  /** Downloads several DONKI types AT THE SAME TIME, with one overall time limit for all of them. */
  async function fetchDonki(types, startDate, endDate, budgetMs) {
    const ctrl = new AbortController();
    const opts = { fetchImpl: guardedFetch(fetchImpl, { signal: ctrl.signal, budget: donkiBudget }), timeoutMs: budgetMs, retries: donkiRetries };
    const work = Promise.all(types.map(async (type) => [type, compactDonki(type, await fetchDonkiType(type, startDate, endDate, opts))]));
    try {
      return Object.fromEntries(await withDeadline(work, budgetMs));
    } finally {
      ctrl.abort(); // if something failed or the time ran out, cancel whatever is still running
    }
  }

  /** DONKI data of a range, kept for 1 hour and shared between identical requests. */
  const donkiFor = (startDate, endDate, budgetMs) =>
    store.wrap(`donki:${startDate}:${endDate}`, TTL.donki, () => fetchDonki(TIMELINE_DONKI_TYPES, startDate, endDate, budgetMs));

  // ----- preset=archive -----
  function getArchive({ mode = 'daily', stepDays = 1 } = {}) {
    if (mode === 'daily' && stepDays === 1) return archivePayloadFull;
    return archiveSlice(archiveWindow.from, archiveWindow.to, { mode, stepDays });
  }

  // ----- preset=live -----
  async function getLive({ days = LIMITS.liveDefaultDays, mode = 'daily', stepDays = 1 } = {}) {
    const { startDate, endDate } = liveRange(today(), days);
    const key = `live:${endDate}:${days}:${mode}:${stepDays}`;
    const failKey = `live-failed:${endDate}`;

    const cached = store.get(key);
    if (cached) return cached;
    const recentFailure = store.get(failKey);
    if (recentFailure) return archiveSlice(archiveWindow.from, archiveWindow.to, { fallback: { reason: recentFailure, requestedPreset: 'live' } });

    try {
      return await store.wrap(key, TTL.live, async () => {
        // Always download the largest window (30 days): it serves any `days` with the same 7 calls.
        const donki = await donkiFor(addDays(endDate, -(LIMITS.liveMaxDays - 1)), endDate, liveBudgetMs);
        const timeline = buildTimeline({ donki, startDate, endDate, source: 'EN VIVO', baseline: 'median', mode, stepDays });
        const generatedAt = stamp();
        return timelinePayload({
          preset: 'live',
          source: 'EN VIVO',
          meta: liveMeta({ startDate, endDate, days, fetchedAt: generatedAt }),
          timeline,
          mode,
          startDate,
          endDate,
          generatedAt
        });
      });
    } catch (err) {
      const reason = failureReason(err);
      store.set(failKey, reason, TTL.failure);
      log.warn?.(`[live] DONKI did not answer (${reason}: ${err.message}). Serving the ARCHIVE copy.`);
      return archiveSlice(archiveWindow.from, archiveWindow.to, { fallback: { reason, requestedPreset: 'live' } });
    }
  }

  // ----- custom range (?startDate&endDate) -----
  async function getCustom({ startDate, endDate, mode = 'daily', stepDays = 1 }) {
    const now0 = today();
    checkRange(startDate, endDate, { maxDays: LIMITS.customMaxDays, today: now0 });
    const source = labelForRange(endDate, now0);
    const key = `custom:${startDate}:${endDate}:${mode}:${stepDays}:${source}`;
    try {
      return await store.wrap(key, TTL.custom, async () => {
        const donki = await donkiFor(startDate, endDate, customBudgetMs);
        // If the range falls inside the RadLab copy (April–May 2024), radiation is the MEASURED one, as in the ARCHIVE mission.
        const radlab = overlaps(startDate, endDate, rawWindow) && raw?.radlab?.daily ? raw.radlab : undefined;
        const timeline = buildTimeline({
          donki,
          radlab,
          startDate,
          endDate,
          source,
          baseline: radlab ? DEFAULT_BASELINE : 'median',
          mode,
          stepDays
        });
        const generatedAt = stamp();
        return timelinePayload({
          preset: 'custom',
          source,
          meta: customMeta({ startDate, endDate, source, measured: Boolean(radlab), fetchedAt: generatedAt }),
          timeline,
          mode,
          startDate,
          endDate,
          generatedAt
        });
      });
    } catch (err) {
      if (err instanceof HttpError) throw err;
      const reason = failureReason(err);
      log.warn?.(`[custom ${startDate}..${endDate}] DONKI did not answer (${reason}: ${err.message}).`);
      if (isInside(startDate, endDate, archiveWindow)) {
        return archiveSlice(startDate, endDate, { mode, stepDays, fallback: { reason, requestedPreset: 'custom' } });
      }
      throw new HttpError(
        502,
        'upstream-error',
        {
          es: 'No hemos podido descargar los datos de la NASA. Prueba más tarde o juega la misión de mayo de 2024 (preset=archive).',
          en: 'We could not download NASA’s data. Try again later or play the May 2024 mission (preset=archive).'
        },
        { reason }
      );
    }
  }

  // ----- DONKI bulletins (/api/game/events) -----
  async function getEvents({ startDate, endDate, type = 'all' } = {}) {
    const now0 = today();
    const end = endDate ?? now0;
    const start = startDate ?? addDays(end, -(LIMITS.eventsDefaultDays - 1));
    checkRange(start, end, { maxDays: LIMITS.eventsMaxDays, today: now0 });

    let list;
    let fallback = null;
    try {
      list = await store.wrap(`events:${start}:${end}`, TTL.events, async () => (await fetchDonki(['notifications'], start, end, liveBudgetMs)).notifications);
    } catch (err) {
      const reason = failureReason(err);
      log.warn?.(`[events ${start}..${end}] DONKI did not answer (${reason}: ${err.message}).`);
      if (!isInside(start, end, rawWindow) || !Array.isArray(raw?.donki?.notifications)) {
        throw new HttpError(
          502,
          'upstream-error',
          { es: 'No hemos podido descargar los avisos de la NASA. Prueba más tarde.', en: 'We could not download NASA’s alerts. Try again later.' },
          { reason }
        );
      }
      list = raw.donki.notifications.filter((n) => {
        const d = dayOf(n.issueTime);
        return d && d >= start && d <= end;
      });
      fallback = { reason };
    }

    const wanted = type.toLowerCase();
    const events = list
      .filter((n) => wanted === 'all' || String(n.type).toLowerCase() === wanted)
      .sort((a, b) => String(a.issueTime).localeCompare(String(b.issueTime)))
      .map(({ id, type: kind, issueTime, summary, link }) => ({ id, type: kind, issueTime, summary, link }));

    return {
      source: fallback ? 'ARCHIVO' : labelForRange(end, now0),
      fallback: Boolean(fallback),
      ...(fallback && { fallbackReason: fallback.reason }),
      startDate: start,
      endDate: end,
      type,
      total: events.length,
      events
    };
  }

  // ----- RadLab (/api/radlab/daily) -----
  async function fetchRadlab(from, to) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(Object.assign(new Error('RadLab: timed out'), { code: 'timeout' })), radlabBudgetMs);
    try {
      const fetchGuarded = guardedFetch(fetchImpl, { signal: ctrl.signal, budget: radlabBudget });
      const data = await fetchRadlabDaily(from, to, undefined, { fetchImpl: fetchGuarded, timeoutMs: radlabBudgetMs });
      if (data.daily.every((d) => d.error)) {
        throw new HttpError(
          502,
          'upstream-error',
          { es: 'No hemos podido descargar las medidas de radiación de la NASA. Prueba más tarde.', en: 'We could not download NASA’s radiation measurements. Try again later.' },
          { reason: data.daily[0]?.error ?? 'unknown' }
        );
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function getRadlabDaily({ from, to }) {
    const now0 = today();
    checkRange(from, to, { maxDays: LIMITS.radlabMaxDays, today: now0, names: ['from', 'to'] });

    // Inside the saved copy: answer without calling RadLab.
    if (isInside(from, to, rawWindow) && Array.isArray(raw?.radlab?.daily)) {
      return {
        source: 'ARCHIVO',
        fromArchive: true,
        from,
        to,
        unit: raw.radlab.unit,
        instruments: raw.radlab.instruments,
        daily: raw.radlab.daily.filter((d) => d.date >= from && d.date <= to)
      };
    }

    const ttl = (data) => (data.daily.some((d) => d.error) ? TTL.radlabPartial : TTL.radlab);
    const data = await store.wrap(`radlab:${from}:${to}`, ttl, () => fetchRadlab(from, to));
    return { source: labelForRange(to, now0), fromArchive: false, from, to, ...data };
  }

  return {
    getArchive,
    getLive,
    getCustom,
    getEvents,
    getRadlabDaily,
    /** Calls made to NASA in the last hour (to watch the quota, and for the tests). */
    usage: () => ({ donkiCallsLastHour: donkiBudget.used(), radlabCallsLastHour: radlabBudget.used() }),
    windows: { archive: archiveWindow, raw: rawWindow },
    cache: store
  };
}

// ---------------------------------------------------------------------------
// `meta` texts (a player may read them: kid language)
// ---------------------------------------------------------------------------

function liveMeta({ startDate, endDate, days, fetchedAt }) {
  return {
    id: `moon-live-${endDate}-${days}`,
    title: { es: `El Sol de hoy: los últimos ${days} días`, en: `Today’s Sun: the last ${days} days` },
    site: 'moon-south-pole',
    source: 'EN VIVO',
    from: startDate,
    to: endDate,
    fetchedAt,
    radlab: null, // no measurements: radiation is estimated from DONKI
    note: {
      es: 'Datos reales de la NASA, descargados ahora mismo (EN VIVO). La radiación la calcula el juego con los avisos de la NASA sobre el Sol. Los últimos días aún pueden cambiar.',
      en: 'Real NASA data, downloaded right now (LIVE). The game works out the radiation from NASA’s alerts about the Sun. The latest days may still change.'
    },
    sources: { DONKI: DONKI_INFO }
  };
}

function customMeta({ startDate, endDate, source, measured, fetchedAt }) {
  const when =
    source === 'EN VIVO'
      ? {
          es: 'Datos reales de la NASA, descargados ahora mismo. Llegan hasta hoy, así que son EN VIVO.',
          en: 'Real NASA data, downloaded right now. They reach today, so they are LIVE.'
        }
      : {
          es: 'Datos reales de la NASA sobre días pasados, descargados ahora. Como no son de hoy, llevan la etiqueta ARCHIVO.',
          en: 'Real NASA data about past days, downloaded now. They are not from today, so they carry the ARCHIVE label.'
        };
  const rad = measured
    ? {
        es: 'La radiación de abril y mayo de 2024 es la que midió de verdad la NASA; la del resto de días la calcula el juego.',
        en: 'Radiation in April and May 2024 is what NASA really measured; the game works out the other days.'
      }
    : {
        es: 'La radiación la calcula el juego con los avisos de la NASA sobre el Sol.',
        en: 'The game works out the radiation from NASA’s alerts about the Sun.'
      };
  return {
    id: `custom-${startDate}-${endDate}`,
    title: {
      es: `El Sol del ${formatDate(startDate, 'es')} al ${formatDate(endDate, 'es')}`,
      en: `The Sun from ${formatDate(startDate, 'en')} to ${formatDate(endDate, 'en')}`
    },
    site: 'moon-south-pole',
    source,
    from: startDate,
    to: endDate,
    fetchedAt,
    radlab: measured ? 'ARCHIVO' : null, // 'ARCHIVO' = the saved RadLab measurements were used
    note: { es: `${when.es} ${rad.es}`, en: `${when.en} ${rad.en}` },
    sources: { DONKI: DONKI_INFO }
  };
}
