// Utilidades de fechas en UTC (los datos de DONKI y RadLab vienen en UTC).

export const DAY_MS = 86400000;

/** 'AAAA-MM-DD' → milisegundos (medianoche UTC). */
export const parseDay = (s) => Date.parse(`${s}T00:00:00Z`);

/** milisegundos → 'AAAA-MM-DD' (UTC). */
export const toDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Suma días a una fecha 'AAAA-MM-DD'. */
export const addDays = (s, n) => toDay(parseDay(s) + n * DAY_MS);

/** Día UTC de una marca ISO ('2024-05-11T01:23Z' → '2024-05-11'). */
export const dayOf = (iso) => (typeof iso === 'string' && iso.length >= 10 ? iso.slice(0, 10) : null);

/** Hora UTC 'HH:MM' de una marca ISO. */
export const timeOf = (iso) => (typeof iso === 'string' && iso.length >= 16 ? iso.slice(11, 16) : '');

/** Todos los días entre dos fechas, ambas incluidas. */
export function eachDay(from, to) {
  const out = [];
  const end = parseDay(to);
  for (let t = parseDay(from); Number.isFinite(t) && t <= end; t += DAY_MS) out.push(toDay(t));
  return out;
}

/** Fecha UTC de hoy ('AAAA-MM-DD'). */
export const todayUTC = (now = new Date()) => now.toISOString().slice(0, 10);

/** ¿Es una fecha 'AAAA-MM-DD' válida? (ida y vuelta: '2024-02-30' no existe, aunque Date.parse lo acepte) */
export const isISODate = (s) =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(parseDay(s)) && toDay(parseDay(s)) === s;
