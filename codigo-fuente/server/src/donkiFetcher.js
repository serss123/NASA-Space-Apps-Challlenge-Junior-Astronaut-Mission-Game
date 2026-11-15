// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// DONKI client (CCMC, NASA): no key, with date chunks, retries and a time limit.
// New CCMC address (the api.nasa.gov one answers 404 and DEMO_KEY gets blocked very quickly).

export const DONKI_BASE = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get';

// Record types used by the game.
export const DONKI_TYPES = [
  'FLR', // solar flares (classes C, M, X)
  'CME', // coronal mass ejections (with their speed)
  'SEP', // solar energetic particles (radiation)
  'GST', // geomagnetic storms (Kp index)
  'IPS', // interplanetary shocks (arrival of a CME or a fast solar-wind stream)
  'MPC', // magnetopause crossings
  'RBE', // radiation belt enhancements
  'HSS', // high-speed solar-wind streams
  'WSAEnlilSimulations', // model runs that predict when each CME arrives
  'notifications' // bulletins with a text summary
];

const DAY_MS = 86400000;
const toISODate = (ms) => new Date(ms).toISOString().slice(0, 10);
const parseDay = (s) => Date.parse(`${s}T00:00:00Z`);

/** Splits a range into chunks (CCMC limits each request; we use 30 days to be safe). */
export function splitDateRange(startDate, endDate, maxDays = 30) {
  const chunks = [];
  let cur = parseDay(startDate);
  const end = parseDay(endDate);
  if (!Number.isFinite(cur) || !Number.isFinite(end) || cur > end) return chunks;
  while (cur <= end) {
    const chunkEnd = Math.min(cur + (maxDays - 1) * DAY_MS, end);
    chunks.push({ startDate: toISODate(cur), endDate: toISODate(chunkEnd) });
    cur = chunkEnd + DAY_MS;
  }
  return chunks;
}

async function fetchJsonWithRetry(url, { fetchImpl = fetch, timeoutMs = 20000, retries = 2 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'SolASol-educational-game' },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (res.status === 429) throw Object.assign(new Error('DONKI: rate limit reached (429)'), { status: 429 });
      if (!res.ok) throw Object.assign(new Error(`DONKI: HTTP error ${res.status}`), { status: res.status });
      const text = await res.text();
      if (!text.trim()) return []; // DONKI answers with an empty body when there are no records
      return JSON.parse(text);
    } catch (err) {
      lastErr = err;
      if (err.status === 429 || err.status === 404) break; // do not insist
      if (attempt < retries) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/** Downloads every record of one DONKI type between two dates (YYYY-MM-DD, both included). */
export async function fetchDonkiType(type, startDate, endDate, opts = {}) {
  const results = [];
  for (const chunk of splitDateRange(startDate, endDate, 30)) {
    const url = new URL(`${DONKI_BASE}/${type}`);
    url.searchParams.set('startDate', chunk.startDate);
    url.searchParams.set('endDate', chunk.endDate);
    if (type === 'notifications') url.searchParams.set('type', 'all');
    if (type === 'WSAEnlilSimulations' || type === 'CME') {
      // the API defaults; kept explicit so the request is reproducible
    }
    const data = await fetchJsonWithRetry(url, opts);
    if (Array.isArray(data)) results.push(...data);
  }
  return results;
}

/** Downloads several types (one after another, to respect the limit of about 120 requests per hour). */
export async function fetchDonkiAll(types, startDate, endDate, opts = {}) {
  const out = {};
  for (const type of types) out[type] = await fetchDonkiType(type, startDate, endDate, opts);
  return out;
}
