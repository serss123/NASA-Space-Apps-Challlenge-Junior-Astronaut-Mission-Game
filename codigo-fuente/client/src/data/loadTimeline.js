// Carga la línea temporal del juego con una cadena de respaldo para que SIEMPRE se pueda jugar:
//   1. Servidor Express (/api/game/timeline) → ARCHIVO o EN VIVO.
//   2. Solo misión EN VIVO: DONKI directamente desde el navegador (CCMC permite CORS) + traductor compartido.
//   3. Copia ARCHIVO incluida en el juego (datos reales de mayo de 2024).
// Nunca se presenta como EN VIVO algo que no lo es: cada resultado lleva su `source` y, si hubo respaldo, `fallback`.
import { buildTimeline } from '@shared/gameTranslator.js';
import { addDays, todayUTC } from '@shared/dates.js';
import archive from './archive-may-2024.json';

const TIMEOUT_MS = 9000;

async function fetchJson(url, ms = TIMEOUT_MS) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function bundledArchive() {
  return { source: 'ARCHIVO', preset: 'archive', fallback: false, meta: archive.meta, summary: archive.summary, timeline: archive.timeline };
}

// --- respaldo: DONKI desde el navegador (solo lo imprescindible, compactado igual que el servidor) ---
const DONKI = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get';
const pickAnalysis = (a = []) => a.find((x) => x.isMostAccurate) || a[a.length - 1] || null;
const ids = (l) => (Array.isArray(l) ? l.map((x) => x.activityID).filter(Boolean) : []);
const COMPACT = {
  FLR: (f) => ({ id: f.flrID, beginTime: f.beginTime, peakTime: f.peakTime, classType: f.classType, link: f.link, linked: ids(f.linkedEvents) }),
  CME: (c) => {
    const a = pickAnalysis(c.cmeAnalyses);
    return { id: c.activityID, startTime: c.startTime, speed: a?.speed ?? null, link: c.link, linked: ids(c.linkedEvents) };
  },
  SEP: (s) => ({ id: s.sepID, eventTime: s.eventTime, instruments: (s.instruments || []).map((i) => i.displayName), link: s.link, linked: ids(s.linkedEvents) }),
  GST: (g) => ({ id: g.gstID, startTime: g.startTime, kp: (g.allKpIndex || []).map((k) => ({ time: k.observedTime, kp: k.kpIndex })), link: g.link }),
  IPS: (i) => ({ id: i.activityID, eventTime: i.eventTime, location: i.location, link: i.link, linked: ids(i.linkedEvents) }),
  WSAEnlilSimulations: (w) => ({
    id: w.simulationID,
    modelCompletionTime: w.modelCompletionTime,
    estimatedShockArrivalTime: w.estimatedShockArrivalTime,
    impacts: (w.impactList || []).map((i) => ({ location: i.location, arrivalTime: i.arrivalTime, isGlancingBlow: i.isGlancingBlow })),
    link: w.link
  })
};

async function liveFromBrowser(days) {
  const end = todayUTC();
  const start = addDays(end, -(days - 1));
  const donki = {};
  await Promise.all(
    Object.keys(COMPACT).map(async (type) => {
      const raw = await fetchJson(`${DONKI}/${type}?startDate=${start}&endDate=${end}`);
      donki[type] = (Array.isArray(raw) ? raw : []).map(COMPACT[type]);
    })
  );
  donki.notifications = [];
  const timeline = buildTimeline({ donki, startDate: start, endDate: end, source: 'EN VIVO', baseline: 'median' });
  return {
    source: 'EN VIVO',
    preset: 'live',
    fallback: false,
    via: 'browser',
    meta: { id: 'moon-live', title: { es: 'El cielo de estos días', en: 'The sky these days' }, from: start, to: end, source: 'EN VIVO' },
    timeline
  };
}

/**
 * @param {'archive'|'live'} preset
 * @returns {Promise<{ source, preset, fallback, fallbackReason?, meta, timeline }>}
 */
export async function loadTimeline(preset = 'archive', { days = 21 } = {}) {
  if (preset === 'archive') {
    // La copia del juego es idéntica a la del servidor: no hace falta esperar a la red.
    return bundledArchive();
  }
  // Misión EN VIVO
  let serverErr = null;
  if (hasServer()) {
    try {
      const data = await fetchJson(`/api/game/timeline?preset=live&days=${days}`);
      if (Array.isArray(data.timeline) && data.timeline.length) return data;
      throw new Error('respuesta vacía');
    } catch (err) {
      serverErr = err;
    }
  }
  try {
    return await liveFromBrowser(days);
  } catch (browserErr) {
    const fallbackReason = [serverErr?.message, browserErr.message].filter(Boolean).join(' · ');
    return { ...bundledArchive(), fallback: true, fallbackReason };
  }
}

// Abierto con doble clic (versión de un solo archivo, file://) no hay servidor: se va directo a DONKI.
function hasServer() {
  return typeof window === 'undefined' || /^https?:$/.test(window.location.protocol);
}
