// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// RadLab client (OSDR, NASA): radiation dose MEASURED by real detectors.
// The API does not accept calls from the browser (CORS), so the server (or the script that builds the
// ARCHIVE copy) calls it and returns daily means.

export const RADLAB_BASE = 'https://visualization.osdr.nasa.gov/radlab/api/';

export const RADLAB_INSTRUMENTS = {
  'CRaTER-D1D2': { label: 'CRaTER', craft: 'LRO', place: 'moonOrbit' },
  DosTel1: { label: 'DOSTEL 1', craft: 'ISS', place: 'iss' },
  DosTel2: { label: 'DOSTEL 2', craft: 'ISS', place: 'iss' },
  'MSL-RAD-Surface': { label: 'RAD', craft: 'Curiosity (MSL)', place: 'marsSurface' },
  BPD: { label: 'BPD', craft: 'BioSentinel', place: 'deepSpace' }
};

const DAY_MS = 86400000;
const nextDay = (d) => new Date(Date.parse(`${d}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);

async function fetchRadlabRows(fromTs, toTs, { fetchImpl = fetch, timeoutMs = 45000 } = {}) {
  const url = `${RADLAB_BASE}?timestamp>=${fromTs}&timestamp<${toTs}&instrument_id&absorbed_dose_rate&format=json`;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`RadLab: HTTP error ${res.status}`);
  const json = await res.json();
  const col = Object.fromEntries((json.columns || []).map((c, i) => [c, i]));
  return (json.data || []).map((row) => [row[col.instrument_id], row[col.absorbed_dose_rate]]);
}

/** Means of one day (UTC) per instrument: { [instrument]: { mean, max, n } } in µGy/h.
 *  If the server takes too long with the whole day, it asks for it in four 6-hour slots. */
export async function fetchRadlabDay(day, opts = {}) {
  let rows;
  try {
    rows = await fetchRadlabRows(day, nextDay(day), opts);
  } catch {
    rows = [];
    const slots = ['00:00', '06:00', '12:00', '18:00'];
    for (let i = 0; i < slots.length; i++) {
      const from = `${day}T${slots[i]}`;
      const to = i + 1 < slots.length ? `${day}T${slots[i + 1]}` : nextDay(day);
      rows.push(...(await fetchRadlabRows(from, to, opts)));
    }
  }
  const acc = {};
  for (const [id, v] of rows) {
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    const a = (acc[id] ??= { sum: 0, n: 0, max: -Infinity });
    a.sum += v;
    a.n += 1;
    a.max = Math.max(a.max, v);
  }
  const out = {};
  for (const [id, a] of Object.entries(acc)) {
    out[id] = { mean: round(a.sum / a.n, 3), max: round(a.max, 3), n: a.n };
  }
  return out;
}

/** Daily means between two dates (both included). Days that fail keep an `error`. */
export async function fetchRadlabDaily(from, to, onProgress, opts = {}) {
  const daily = [];
  for (let d = from; d <= to; d = nextDay(d)) {
    try {
      const instruments = await fetchRadlabDay(d, opts);
      daily.push({ date: d, instruments });
      onProgress?.(d, Object.values(instruments).reduce((s, i) => s + i.n, 0));
    } catch (err) {
      daily.push({ date: d, instruments: {}, error: err.message });
      onProgress?.(d, 0);
    }
  }
  return { unit: 'µGy/h', instruments: RADLAB_INSTRUMENTS, daily };
}

function round(v, n) {
  const k = 10 ** n;
  return Math.round(v * k) / k;
}
