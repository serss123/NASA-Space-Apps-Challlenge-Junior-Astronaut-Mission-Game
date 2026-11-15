// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Real space weather → game days for "Sol a Sol".
// Input: compact DONKI records (see server/src/donkiCompact.js) and, when available, RadLab daily means.
// Output: an UNBROKEN timeline: one object per day, calm days included.
// Used by the server (LIVE mission), by the browser fallback (client/src/data/loadTimeline.js) and by the script
// that builds the ARCHIVE copy (server/scripts/build-archive.mjs), so it depends on neither Node nor the browser.
//
// Texts of every day (Spanish first, English mirror; see docs/DESIGN.md §4 and §6):
//   headline  { es, en }          kid language, at most 10 words, plain text (no markup, emoji, acronyms or
//                                 units), rounded numbers, present tense (it also reads well in the forecast).
//   kid       [{ icon, es, en }]  0–3 kid facts, most important first, at most 12 words each, past tense.
//                                 They may hold glossary pills [[id|text]] (render them with RichText) and they
//                                 never repeat the headline: show the headline first, then the facts.
//   summary   { es, en }          technical (instruments, flare classes, km/s, UTC times): only for the
//                                 grown-ups part of the data page.

import { dayOf, eachDay, timeOf } from './dates.js';

/** Reference "normal day" for radiation (as in the team's master plan: 1–7 May 2024, before the big storm). */
export const DEFAULT_BASELINE = { from: '2024-05-01', to: '2024-05-07' };

/** Icons a kid fact may carry (the UI draws one per fact). */
export const KID_ICONS = Object.freeze(['flare', 'cme', 'magnet', 'particles', 'radiation', 'calm', 'mars']);

/** Size limits of the kid texts (docs/DESIGN.md §6; the tests check them). */
export const KID_LIMITS = Object.freeze({ headlineWords: 10, factWords: 12, facts: 3 });

/** A CME at least this fast (km/s) is "una nube de plasma muy rápida" / "a very fast plasma cloud". */
export const FAST_CME_KMS = 1000;

const STATION_INSTRUMENTS = {
  moonOrbit: ['CRaTER-D1D2'],
  iss: ['DosTel1', 'DosTel2'],
  mars: ['MSL-RAD-Surface'],
  deepSpace: ['BPD']
};

// ---------- small helpers ----------
const classRank = (c) => {
  if (typeof c !== 'string' || !c) return -1;
  const letter = { X: 4, M: 3, C: 2, B: 1, A: 0 }[c[0].toUpperCase()] ?? -1;
  return letter * 100 + (parseFloat(c.slice(1)) || 0);
};
/** Size of an X-class flare ('X5.8' → 5.8); 0 for any other class. */
const flareMagnitude = (c) => (typeof c === 'string' && c[0] === 'X' ? parseFloat(c.slice(1)) || 1 : 0);
const groupBy = (list, keyFn) => {
  const m = new Map();
  for (const it of list || []) {
    const k = keyFn(it);
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  return m;
};
const round1 = (v) => Math.round(v * 10) / 10;
/** One decimal at most, with a decimal comma in Spanish (8.67 → '8,7'). */
const dec1 = (v, lang) => (lang === 'es' ? String(round1(v)).replace('.', ',') : String(round1(v)));
const kpText = dec1;
const fmtX = (x) => (x >= 10 ? Math.round(x) : round1(x));
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Rounds a multiplier for kids: whole numbers below 100, tens below 1,000 and hundreds above
 * (45.3 → 45, 213.6 → 210, 301.6 → 300). `null` if it is not a number.
 */
export function kidRound(x) {
  if (x == null || !Number.isFinite(x)) return null;
  if (x < 100) return Math.round(x);
  if (x < 1000) return Math.round(x / 10) * 10;
  return Math.round(x / 100) * 100;
}

const wholeNumber = (n, lang) => Math.round(n).toLocaleString(lang === 'es' ? 'es-ES' : 'en-US');
/** A kid-rounded multiplier as text in each language (1,200 / 1200). */
const timesText = (x, lang) => wholeNumber(kidRound(x) ?? 0, lang);

const NUMBER_WORDS = {
  es: ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'],
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
};
/** A count for kids: words up to ten (feminine in Spanish, as in "dos nubes", "tres llamaradas"), digits above. */
const count = (n, lang) => (Number.isInteger(n) && n >= 0 && n <= 10 ? NUMBER_WORDS[lang][n] : wholeNumber(n, lang));

/** "a", "a y b", "a, b y c" (English: "and"). */
function listText(items, lang) {
  const and = lang === 'es' ? ' y ' : ' and ';
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')}${and}${items[items.length - 1]}`;
}

/** Level 0–3 from the multiplier measured by CRaTER near the Moon. */
export function levelFromMultiplier(x) {
  if (x == null || !Number.isFinite(x)) return null;
  if (x < 3) return 0;
  if (x < 30) return 1;
  if (x < 150) return 2;
  return 3;
}

/** Level 0–3 of a shock from the speed of its CME (rule of the team's master plan). */
export function levelFromCmeSpeed(speed) {
  if (!speed) return 1;
  if (speed < 1000) return 1;
  if (speed < 2000) return 2;
  return 3;
}

// ---------- RadLab ----------
function stationMeans(radlabDay, ids) {
  if (!radlabDay) return null;
  const vals = ids.map((id) => radlabDay.instruments?.[id]).filter(Boolean);
  if (!vals.length) return null;
  return {
    mean: vals.reduce((s, v) => s + v.mean, 0) / vals.length,
    max: Math.max(...vals.map((v) => v.max))
  };
}

/** Reference mean of every station: a fixed period or the median of the window. */
export function computeBaseline(radlab, baseline = DEFAULT_BASELINE) {
  const daily = radlab?.daily || [];
  const out = {};
  for (const [station, ids] of Object.entries(STATION_INSTRUMENTS)) {
    let vals;
    if (baseline === 'median') {
      vals = daily.map((d) => stationMeans(d, ids)?.mean).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
      out[station] = vals.length ? vals[Math.floor(vals.length / 2)] : null;
    } else {
      vals = daily
        .filter((d) => d.date >= baseline.from && d.date <= baseline.to)
        .map((d) => stationMeans(d, ids)?.mean)
        .filter((v) => Number.isFinite(v));
      out[station] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    }
  }
  return out;
}

// ---------- DONKI index by day ----------
function indexDonki(donki = {}) {
  const cmeById = new Map((donki.CME || []).map((c) => [c.id, c]));
  const kpByDay = new Map();
  for (const g of donki.GST || []) {
    for (const k of g.kp || []) {
      const d = dayOf(k.time);
      if (!d) continue;
      const prev = kpByDay.get(d);
      if (!prev || k.kp > prev.kpMax) kpByDay.set(d, { kpMax: k.kp, id: g.id, link: g.link });
    }
  }
  return {
    flr: groupBy(donki.FLR, (f) => dayOf(f.peakTime || f.beginTime)),
    cme: groupBy(donki.CME, (c) => dayOf(c.startTime)),
    sep: groupBy(donki.SEP, (s) => dayOf(s.eventTime)),
    ips: groupBy((donki.IPS || []).filter((i) => /earth/i.test(i.location || '')), (i) => dayOf(i.eventTime)),
    wsa: groupBy(donki.WSAEnlilSimulations, (w) => dayOf(w.modelCompletionTime)),
    notes: groupBy(donki.notifications, (n) => dayOf(n.issueTime)),
    kpByDay,
    cmeById
  };
}

function shockSpeed(ips, cmeById) {
  const speeds = (ips.linked || []).map((id) => cmeById.get(id)?.speed).filter((s) => Number.isFinite(s));
  return speeds.length ? Math.max(...speeds) : null;
}

/** Does DONKI link this shock to a CME? (Some shocks come from fast solar-wind streams instead.) */
const isCmeDriven = (ips, cmeById) => (ips.linked || []).some((id) => cmeById.has(id) || /-CME-\d+$/.test(id));

/** A model run "predicts" only arrivals after it was made (DONKI also keeps late runs of past arrivals). */
function isUpcoming(prediction) {
  const made = Date.parse(prediction.madeAt);
  const arrival = Date.parse(prediction.arrivalTime);
  return Number.isFinite(arrival) && (!Number.isFinite(made) || arrival > made);
}

const NOTE_PRIORITY = { SEP: 0, IPS: 1, CME: 2, FLR: 3, GST: 4, RBE: 5, MPC: 6, HSS: 7, Report: 9 };

// ---------- dates in texts ----------
const MONTHS = {
  es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};
export function formatDate(iso, lang = 'es') {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return lang === 'es' ? `${d} de ${MONTHS.es[m - 1]} de ${y}` : `${MONTHS.en[m - 1]} ${d}, ${y}`;
}
const shortDate = (iso, lang) => {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number);
  return lang === 'es' ? `${d} de ${MONTHS.es[m - 1]}` : `${MONTHS.en[m - 1]} ${d}`;
};

// ---------- the story of a day (shared by the headline, the kid facts and the summary) ----------
function storyOf(day, { fastCmes = 0, lingering = 0 } = {}) {
  const { flares, sep, shocks, geomagnetic, predictions, radiation } = day;
  const cmeShocks = shocks.filter((s) => s.fromCme);
  return {
    date: day.date,
    calm: day.calm,
    measured: radiation.basis === 'measured',
    level: radiation.level,
    x: radiation.multiplier,
    sep: sep.length > 0,
    lingering: lingering > 0, // particles of a previous day still count (estimated radiation)
    shocks: shocks.length,
    cmeShocks: cmeShocks.length,
    fastShocks: cmeShocks.filter((s) => s.speed >= FAST_CME_KMS).length,
    flaresTotal: flares.total,
    mCount: flares.mCount,
    xCount: flares.x.length,
    giantFlare: flares.x.some((c) => flareMagnitude(c) >= 5),
    kp: geomagnetic?.kpMax ?? 0,
    mars: radiation.stations?.mars ?? null,
    earthPrediction: predictions.find((p) => p.location === 'Earth' && isUpcoming(p)) ?? null,
    fastCmes
  };
}

// ---------- headline: the most notable thing of the day (same order of importance as v1) ----------
function headlineOf(s) {
  const n = { es: timesText(s.x, 'es'), en: timesText(s.x, 'en') };
  if (s.measured && s.level === 3) {
    return { kind: 'radiation', es: `¡Muchísima radiación cerca de la Luna: ${n.es} veces lo normal!`, en: `So much radiation near the Moon: ${n.en} times normal!` };
  }
  if (s.measured && s.level === 2) {
    return { kind: 'radiation', es: `Mucha radiación cerca de la Luna: ${n.es} veces lo normal`, en: `Lots of radiation near the Moon: ${n.en} times normal` };
  }
  if (s.sep) return { kind: 'particles', es: 'Llega una lluvia de partículas del Sol', en: 'A solar particle shower arrives' };
  if (s.shocks) return { kind: 'arrival', ...arrivalHeadline(s) };
  if (s.xCount) return { kind: 'flare', ...flareHeadline(s) };
  if (s.kp >= 5) {
    const k = Math.round(s.kp);
    return k >= 7
      ? { kind: 'magnet', es: `Auroras en la Tierra: tormenta magnética de ${k} sobre 9`, en: `Auroras on Earth: magnetic storm of ${k} out of 9` }
      : { kind: 'magnet', es: `En la Tierra, tormenta magnética de ${k} sobre 9`, en: `On Earth, a magnetic storm of ${k} out of 9` };
  }
  if (s.measured && s.level === 1) {
    return { kind: 'radiation', es: `Más radiación cerca de la Luna: ${n.es} veces lo normal`, en: `More radiation near the Moon: ${n.en} times normal` };
  }
  if (s.mars?.x >= 5) {
    return { kind: 'mars', es: `La radiación sube en Marte: ${timesText(s.mars.x, 'es')} veces lo normal`, en: `Radiation rises on Mars: ${timesText(s.mars.x, 'en')} times normal` };
  }
  // Estimated radiation with no new event today: particles of earlier days are still arriving.
  if (s.level > 0) return { kind: 'particles', es: 'Siguen llegando partículas del Sol', en: 'Particles from the Sun keep arriving' };
  if (s.earthPrediction) {
    const at = s.earthPrediction.arrivalTime;
    return { kind: 'forecast', es: `Una nube de plasma podría llegar el ${shortDate(at, 'es')}`, en: `A plasma cloud may arrive on ${shortDate(at, 'en')}` };
  }
  if (s.mCount >= 3) {
    return { kind: 'flare', es: `El Sol está activo: lanza ${count(s.flaresTotal, 'es')} llamaradas`, en: `A busy Sun fires ${count(s.flaresTotal, 'en')} flares` };
  }
  return { kind: 'calm', es: 'Día tranquilo en la base lunar', en: 'A calm day at the Moon base' };
}

// "alcanza(n) la Tierra" (not "llega(n) a la Tierra") keeps every case within 10 words.
function arrivalHeadline(s) {
  if (!s.cmeShocks) return { es: 'Una ráfaga de viento solar alcanza la Tierra', en: 'A gust of solar wind reaches Earth' };
  const { cmeShocks: n, fastShocks: f } = s;
  if (n === 1) {
    return f
      ? { es: 'Una nube de plasma muy rápida alcanza la Tierra', en: 'A very fast plasma cloud reaches Earth' }
      : { es: 'Una nube de plasma alcanza la Tierra', en: 'A plasma cloud reaches Earth' };
  }
  const N = { es: cap(count(n, 'es')), en: cap(count(n, 'en')) };
  if (f === n) return { es: `${N.es} nubes de plasma muy rápidas alcanzan la Tierra`, en: `${N.en} very fast plasma clouds reach Earth` };
  if (f === 0) return { es: `${N.es} nubes de plasma alcanzan la Tierra`, en: `${N.en} plasma clouds reach Earth` };
  return f === 1
    ? { es: `${N.es} nubes de plasma alcanzan la Tierra, una muy rápida`, en: `${N.en} plasma clouds reach Earth, one very fast` }
    : { es: `${N.es} nubes de plasma alcanzan la Tierra, ${count(f, 'es')} muy rápidas`, en: `${N.en} plasma clouds reach Earth, ${count(f, 'en')} very fast` };
}

function flareHeadline(s) {
  if (s.giantFlare) return { es: 'El Sol lanza una llamarada gigante', en: 'The Sun fires a huge flare' };
  if (s.xCount === 1) return { es: 'El Sol lanza una llamarada muy fuerte', en: 'The Sun fires a very strong flare' };
  return { es: `El Sol lanza ${count(s.xCount, 'es')} llamaradas muy fuertes`, en: `The Sun fires ${count(s.xCount, 'en')} very strong flares` };
}

// ---------- kid facts: the rest of the day's story, most important first ----------
function kidFactsOf(s, headlineKind) {
  const facts = [];
  const add = (kind, score, icon, text) => facts.push({ kind, score, icon, es: text.es, en: text.en });

  if (s.calm) {
    add('calm', 100, 'calm', { es: 'Ninguna tormenta llegó a la Luna: ¡buen día para explorar!', en: 'No storm reached the Moon: a great day to explore!' });
  }
  if (s.measured && s.level >= 1) {
    add('radiation', 95, 'radiation', {
      es: `La [[radiation|radiación]] cerca de la Luna fue ${timesText(s.x, 'es')} veces la normal.`,
      en: `[[radiation|Radiation]] near the Moon was ${timesText(s.x, 'en')} times normal.`
    });
  } else if (s.measured && !s.calm) {
    add('radiation', 45, 'calm', { es: 'La [[radiation|radiación]] cerca de la Luna se quedó baja.', en: '[[radiation|Radiation]] near the Moon stayed low.' });
  }
  if (s.sep) {
    add('particles', 90, 'particles', { es: 'Llegó una [[sep|lluvia de partículas del Sol]].', en: 'A [[sep|solar particle shower]] arrived.' });
  } else if (s.level > 0 && (s.measured || s.lingering)) {
    add('particles', 70, 'particles', { es: 'Siguieron llegando [[sep|partículas del Sol]].', en: '[[sep|Particles from the Sun]] kept arriving.' });
  }
  if (s.cmeShocks) {
    add('arrival', s.fastShocks ? 85 : 80, 'cme', arrivalFact(s));
  } else if (s.shocks) {
    add('arrival', 80, 'cme', { es: 'Una ráfaga de [[solar-wind|viento solar]] llegó a la Tierra.', en: 'A gust of [[solar-wind|solar wind]] reached Earth.' });
  }
  if (s.xCount) {
    add('flare', s.giantFlare ? 70 : 55, 'flare', flareFact(s));
  } else if (s.flaresTotal >= 3) {
    add('flare', 20, 'flare', { es: `El Sol lanzó ${count(s.flaresTotal, 'es')} [[flare|llamaradas]].`, en: `The Sun fired ${count(s.flaresTotal, 'en')} [[flare|flares]].` });
  }
  if (s.kp >= 5) {
    const k = Math.round(s.kp);
    add('magnet', k >= 8 ? 75 : k === 7 ? 65 : 40, 'magnet', magnetFact(k));
  }
  if (s.mars?.x >= 5) {
    add('mars', 50, 'mars', {
      es: `En [[mars|Marte]], la radiación subió a ${timesText(s.mars.x, 'es')} veces lo normal.`,
      en: `On [[mars|Mars]], radiation rose to ${timesText(s.mars.x, 'en')} times normal.`
    });
  }
  if (s.fastCmes) add('launch', 36, 'cme', launchFact(s.fastCmes));
  if (s.earthPrediction) {
    const at = s.earthPrediction.arrivalTime;
    add('forecast', 35, 'cme', {
      es: `Aviso: una [[cme|nube de plasma]] podría llegar el ${shortDate(at, 'es')}.`,
      en: `Warning: a [[cme|plasma cloud]] could arrive on ${shortDate(at, 'en')}.`
    });
  }

  return facts
    .filter((f) => f.kind === 'calm' || f.kind !== headlineKind) // the headline already tells that part
    .sort((a, b) => b.score - a.score) // stable: equal scores keep the order above
    .slice(0, KID_LIMITS.facts)
    .map(({ icon, es, en }) => ({ icon, es, en }));
}

function arrivalFact(s) {
  const { cmeShocks: n, fastShocks: f } = s;
  if (n === 1) {
    return f
      ? { es: 'Una [[cme|nube de plasma]] muy rápida llegó a la Tierra.', en: 'A very fast [[cme|plasma cloud]] reached Earth.' }
      : { es: 'Una [[cme|nube de plasma]] llegó a la Tierra.', en: 'A [[cme|plasma cloud]] reached Earth.' };
  }
  const N = { es: cap(count(n, 'es')), en: cap(count(n, 'en')) };
  if (f === n) return { es: `${N.es} [[cme|nubes de plasma]] muy rápidas llegaron a la Tierra.`, en: `${N.en} very fast [[cme|plasma clouds]] reached Earth.` };
  if (f === 0) return { es: `${N.es} [[cme|nubes de plasma]] llegaron a la Tierra.`, en: `${N.en} [[cme|plasma clouds]] reached Earth.` };
  return f === 1
    ? { es: `${N.es} [[cme|nubes de plasma]] llegaron a la Tierra; una iba muy rápida.`, en: `${N.en} [[cme|plasma clouds]] reached Earth; one was very fast.` }
    : { es: `${N.es} [[cme|nubes de plasma]] llegaron a la Tierra; ${count(f, 'es')} iban muy rápidas.`, en: `${N.en} [[cme|plasma clouds]] reached Earth; ${count(f, 'en')} were very fast.` };
}

function flareFact(s) {
  const { flaresTotal: t, xCount: k } = s;
  if (t <= 1) {
    return s.giantFlare
      ? { es: 'El Sol lanzó una [[x-class|llamarada gigante]].', en: 'The Sun fired a [[x-class|huge flare]].' }
      : { es: 'El Sol lanzó una [[x-class|llamarada muy fuerte]].', en: 'The Sun fired a [[x-class|very strong flare]].' };
  }
  const T = { es: count(t, 'es'), en: count(t, 'en') };
  if (s.giantFlare) return { es: `El Sol lanzó ${T.es} llamaradas; una fue [[x-class|gigante]].`, en: `The Sun fired ${T.en} flares; one was [[x-class|huge]].` };
  if (k === t) return { es: `El Sol lanzó ${T.es} [[x-class|llamaradas muy fuertes]].`, en: `The Sun fired ${T.en} [[x-class|very strong flares]].` };
  if (k === 1) return { es: `El Sol lanzó ${T.es} llamaradas; una fue [[x-class|muy fuerte]].`, en: `The Sun fired ${T.en} flares; one was [[x-class|very strong]].` };
  return { es: `El Sol lanzó ${T.es} llamaradas; ${count(k, 'es')} fueron [[x-class|muy fuertes]].`, en: `The Sun fired ${T.en} flares; ${count(k, 'en')} were [[x-class|very strong]].` };
}

/** Kp (0–9) as "tormenta magnética de N sobre 9"; strong storms (N ≥ 7) also mention the auroras. */
function magnetFact(k) {
  return k >= 7
    ? { es: `En la Tierra hubo [[aurora|auroras]]: [[geomagnetic-storm|tormenta magnética]] de ${k} sobre 9.`, en: `Earth had [[aurora|auroras]]: a [[geomagnetic-storm|magnetic storm]] of ${k} out of 9.` }
    : { es: `En la Tierra hubo una [[geomagnetic-storm|tormenta magnética]] de ${k} sobre 9.`, en: `Earth had a [[geomagnetic-storm|magnetic storm]] of ${k} out of 9.` };
}

function launchFact(n) {
  if (n === 1) return { es: 'Una [[cme|nube de plasma]] muy rápida salió del Sol.', en: 'A very fast [[cme|plasma cloud]] left the Sun.' };
  return { es: `Salieron del Sol ${count(n, 'es')} [[cme|nubes de plasma]] muy rápidas.`, en: `${cap(count(n, 'en'))} very fast [[cme|plasma clouds]] left the Sun.` };
}

// ---------- technical summary (grown-ups part of the data page) ----------
function summaryOf(day, s) {
  const { flares, sep, shocks, cmes } = day;
  const es = [];
  const en = [];
  if (s.measured) {
    es.push(`tasa de dosis de CRaTER (LRO, órbita lunar): ${dec1(s.x, 'es')} × la de un día normal (nivel ${s.level})`);
    en.push(`CRaTER dose rate (LRO, lunar orbit): ${dec1(s.x, 'en')} × a normal day (level ${s.level})`);
  } else if (s.level > 0) {
    const earlier = !s.sep && !s.shocks; // only particles from earlier days
    es.push(`radiación estimada con DONKI: nivel ${s.level}${earlier ? ' (partículas de días anteriores)' : ''}`);
    en.push(`radiation estimated from DONKI: level ${s.level}${earlier ? ' (particles from earlier days)' : ''}`);
  }
  if (flares.total) {
    const one = flares.total === 1;
    const classes = flares.x.length ? ` (${flares.x.join(', ')})` : '';
    es.push(`${flares.total} ${one ? 'llamarada registrada' : 'llamaradas registradas'}${classes}`);
    en.push(`${flares.total} ${one ? 'flare recorded' : 'flares recorded'}${classes}`);
  }
  if (cmes.fastest?.speed) {
    es.push(`la CME más rápida salió a ${cmes.fastest.speed} km/s`);
    en.push(`the fastest CME left at ${cmes.fastest.speed} km/s`);
  }
  if (shocks.length) {
    // Only shocks that DONKI links to a CME are called CME shocks (some come from fast solar-wind streams).
    const many = shocks.length > 1;
    const fromCme = shocks.every((sh) => sh.fromCme);
    const times = shocks.map((sh) => timeOf(sh.eventTime));
    const whatEs = fromCme ? (many ? 'choques de CME' : 'choque de CME') : many ? 'choques interplanetarios' : 'choque interplanetario';
    const whatEn = fromCme ? (many ? 'CME shocks' : 'CME shock') : many ? 'interplanetary shocks' : 'interplanetary shock';
    es.push(`${whatEs} (IPS) en la Tierra a las ${listText(times, 'es')} UTC`);
    en.push(`${whatEn} (IPS) at Earth at ${listText(times, 'en')} UTC`);
  }
  if (sep.length) {
    es.push('partículas energéticas solares (SEP)');
    en.push('solar energetic particles (SEP)');
  }
  if (s.kp >= 5) {
    es.push(`índice Kp ${kpText(s.kp, 'es')}`);
    en.push(`Kp index ${kpText(s.kp, 'en')}`);
  }
  if (s.mars?.x >= 5) {
    es.push(`Marte (RAD, Curiosity): ${dec1(s.mars.x, 'es')} × lo normal, pico de ${dec1(s.mars.peakX, 'es')}`);
    en.push(`Mars (RAD, Curiosity): ${dec1(s.mars.x, 'en')} × normal, peak ${dec1(s.mars.peakX, 'en')}`);
  }
  if (s.earthPrediction) {
    const at = s.earthPrediction.arrivalTime;
    es.push(`el modelo WSA-Enlil prevé un choque en la Tierra el ${shortDate(at, 'es')} a las ${timeOf(at)} UTC`);
    en.push(`the WSA-Enlil model predicts a shock at Earth on ${shortDate(at, 'en')} at ${timeOf(at)} UTC`);
  }
  return {
    es: es.length ? `${cap(es.join('; '))}.` : 'DONKI no registró eventos importantes ese día.',
    en: en.length ? `${cap(en.join('; '))}.` : 'DONKI recorded no major events that day.'
  };
}

function buildTexts(day, extra) {
  const story = storyOf(day, extra);
  const { kind, es, en } = headlineOf(story);
  return { headline: { es, en }, kid: kidFactsOf(story, kind), summary: summaryOf(day, story) };
}

// ---------- one day ----------
function buildDay(date, index, idx, radlabByDay, base, source, prevSepLevel) {
  const flrList = [...(idx.flr.get(date) || [])].sort((a, b) => classRank(b.classType) - classRank(a.classType));
  const xList = flrList.filter((f) => f.classType?.startsWith('X'));
  const flares = {
    total: flrList.length,
    mCount: flrList.filter((f) => f.classType?.startsWith('M')).length,
    x: xList.map((f) => f.classType),
    max: flrList[0]?.classType ?? null,
    items: flrList.slice(0, 5).map((f) => ({ id: f.id, classType: f.classType, peakTime: f.peakTime, link: f.link }))
  };

  const cmeList = [...(idx.cme.get(date) || [])].filter((c) => Number.isFinite(c.speed)).sort((a, b) => b.speed - a.speed);
  const cmes = {
    total: (idx.cme.get(date) || []).length,
    fastest: cmeList[0] ? { id: cmeList[0].id, speed: cmeList[0].speed, startTime: cmeList[0].startTime, link: cmeList[0].link } : null
  };

  const sep = (idx.sep.get(date) || []).map((s) => ({ id: s.id, eventTime: s.eventTime, instruments: s.instruments || [], link: s.link }));
  const shocks = (idx.ips.get(date) || []).map((i) => ({
    id: i.id,
    eventTime: i.eventTime,
    location: i.location,
    speed: shockSpeed(i, idx.cmeById),
    fromCme: isCmeDriven(i, idx.cmeById),
    link: i.link
  }));
  const geomagnetic = idx.kpByDay.get(date) || null;

  const seen = new Set();
  const predictions = [];
  for (const w of idx.wsa.get(date) || []) {
    const add = (location, arrivalTime) => {
      if (!arrivalTime) return;
      const key = `${location}|${arrivalTime.slice(0, 13)}`;
      if (seen.has(key)) return;
      seen.add(key);
      predictions.push({ id: w.id, madeAt: w.modelCompletionTime, arrivalTime, location, link: w.link });
    };
    add('Earth', w.estimatedShockArrivalTime);
    for (const imp of w.impacts || []) if (/mars/i.test(imp.location || '')) add('Mars', imp.arrivalTime);
  }
  predictions.sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));

  const notifications = [...(idx.notes.get(date) || [])]
    .sort((a, b) => (NOTE_PRIORITY[a.type] ?? 8) - (NOTE_PRIORITY[b.type] ?? 8))
    .slice(0, 3)
    .map((n) => ({ id: n.id, type: n.type, issueTime: n.issueTime, summary: n.summary, link: n.link }));

  // --- radiation ESTIMATED from DONKI ---
  let sepLevel = 0;
  if (sep.length) {
    const strong = sep.some((s) => s.instruments.some((i) => />\s*100\s*MeV/i.test(i))) || xList.some((f) => flareMagnitude(f.classType) >= 5);
    sepLevel = strong ? 3 : 2;
  }
  const lingering = Math.max(0, prevSepLevel - 1); // the particles keep arriving the next day
  const shockLevel = shocks.length ? Math.max(...shocks.map((s) => levelFromCmeSpeed(s.speed))) : 0;
  let estimatedLevel = Math.max(sepLevel, lingering, shockLevel);
  if (sepLevel && shockLevel) estimatedLevel += 1;
  estimatedLevel = Math.min(3, estimatedLevel);

  // --- radiation MEASURED by RadLab ---
  const rl = radlabByDay?.get(date);
  const stations = {};
  for (const [station, ids] of Object.entries(STATION_INSTRUMENTS)) {
    const s = stationMeans(rl, ids);
    const ref = base?.[station];
    stations[station] = s && ref ? { x: round1(s.mean / ref), peakX: round1(s.max / ref), mean: round1(s.mean) } : null;
  }
  const multiplier = stations.moonOrbit?.x ?? null;
  const measuredLevel = levelFromMultiplier(multiplier);
  const basis = measuredLevel == null ? 'estimated' : 'measured';
  const level = basis === 'measured' ? measuredLevel : estimatedLevel;

  // --- breakdowns the day can cause (SIMULATED chances triggered by real events) ---
  const kp = geomagnetic?.kpMax ?? 0;
  const triggers = {
    cables: xList.length ? 0.8 : sep.length ? 0.3 : 0,
    antenna: shocks.length || kp >= 7 ? 0.6 : kp >= 5 ? 0.3 : 0,
    panels: shocks.length ? 0.4 : 0
  };
  // A shock cause also says whether DONKI links it to a CME, so the UI can name it right ("plasma cloud" or
  // "gust of solar wind").
  const shockCause = shocks.length ? { kind: 'shock', ref: 'IPS', time: shocks[0].eventTime, fromCme: shocks[0].fromCme, link: shocks[0].link } : null;
  const triggerCauses = {
    cables: xList.length
      ? { kind: 'flareX', ref: xList[0].classType, time: xList[0].peakTime, link: xList[0].link }
      : sep.length
        ? { kind: 'sep', ref: 'SEP', time: sep[0].eventTime, link: sep[0].link }
        : null,
    antenna: shockCause
      ? { ...shockCause }
      : kp >= 5
        ? { kind: 'kp', ref: `Kp ${round1(kp)}`, kp: round1(kp), time: null, link: geomagnetic.link }
        : null,
    panels: shockCause ? { ...shockCause } : null
  };

  const calm = !xList.length && !sep.length && !shocks.length && kp < 5 && level === 0;

  const day = {
    index,
    date,
    source,
    calm,
    flares,
    cmes,
    sep,
    shocks,
    geomagnetic,
    predictions,
    notifications,
    radiation: { level, basis, estimatedLevel, measuredLevel, multiplier, stations },
    triggers,
    triggerCauses,
    // Compatibility with the team's prototype (markdown: "stormDamage" and "radiation multiplier")
    stormDamage: [0, 15, 30, 45][level],
    radMultiplier: multiplier != null ? `${fmtX(multiplier)}x` : ['1x', '~10x', '~50x', '~200x'][level]
  };
  const fastCmes = cmeList.filter((c) => c.speed >= FAST_CME_KMS).length;
  Object.assign(day, buildTexts(day, { fastCmes, lingering }));
  return { day, sepLevel: Math.max(sepLevel, lingering) };
}

/**
 * Builds the game timeline.
 * @param {object} p
 * @param {object} p.donki     compact records by type { FLR, CME, SEP, GST, IPS, WSAEnlilSimulations, notifications, … }
 * @param {object} [p.radlab]  { daily: [{ date, instruments: { id: { mean, max, n } } }] }
 * @param {string} p.startDate 'YYYY-MM-DD'
 * @param {string} p.endDate   'YYYY-MM-DD'
 * @param {'ARCHIVO'|'EN VIVO'} [p.source]
 * @param {object|'median'} [p.baseline] RadLab reference period, or 'median'
 * @param {'daily'|'eventsOnly'} [p.mode]  'eventsOnly' skips calm days (compatibility)
 * @param {number} [p.stepDays]           keeps one day every N (compatibility)
 */
export function buildTimeline({ donki, radlab, startDate, endDate, source = 'ARCHIVO', baseline = DEFAULT_BASELINE, mode = 'daily', stepDays = 1 }) {
  const idx = indexDonki(donki);
  const radlabByDay = radlab?.daily ? new Map(radlab.daily.map((d) => [d.date, d])) : null;
  const base = radlab?.daily ? computeBaseline(radlab, baseline) : null;
  let prevSep = 0;
  let days = eachDay(startDate, endDate).map((date, i) => {
    const { day, sepLevel } = buildDay(date, i, idx, radlabByDay, base, source, prevSep);
    prevSep = sepLevel;
    return day;
  });
  if (mode === 'eventsOnly') days = days.filter((d) => !d.calm);
  if (stepDays > 1) days = days.filter((_, i) => i % stepDays === 0);
  return days.map((d, i) => ({ ...d, index: i, gameDay: i + 1 }));
}

/** Summary of the window for the final report ("While you played, the real Sun did this"). */
export function summarizeTimeline(timeline) {
  const allX = timeline.flatMap((d) => d.flares.x.map((c) => ({ c, date: d.date })));
  const maxFlare = timeline
    .flatMap((d) => (d.flares.max ? [{ c: d.flares.max, date: d.date }] : []))
    .sort((a, b) => classRank(b.c) - classRank(a.c))[0] || null;
  const kp = timeline.filter((d) => d.geomagnetic).sort((a, b) => b.geomagnetic.kpMax - a.geomagnetic.kpMax)[0];
  const rad = timeline.filter((d) => d.radiation.multiplier != null).sort((a, b) => b.radiation.multiplier - a.radiation.multiplier)[0];
  const iss = timeline.filter((d) => d.radiation.stations?.iss).sort((a, b) => b.radiation.stations.iss.x - a.radiation.stations.iss.x)[0];
  const mars = timeline.filter((d) => d.radiation.stations?.mars).sort((a, b) => b.radiation.stations.mars.peakX - a.radiation.stations.mars.peakX)[0];
  const fastest = timeline.filter((d) => d.cmes.fastest).sort((a, b) => b.cmes.fastest.speed - a.cmes.fastest.speed)[0];
  return {
    days: timeline.length,
    from: timeline[0]?.date,
    to: timeline[timeline.length - 1]?.date,
    xFlares: allX.length,
    maxFlare,
    maxKp: kp ? { kp: kp.geomagnetic.kpMax, date: kp.date } : null,
    maxMoonRadiation: rad ? { x: rad.radiation.multiplier, date: rad.date } : null,
    maxIssRadiation: iss ? { x: iss.radiation.stations.iss.x, date: iss.date } : null,
    maxMarsRadiation: mars ? { x: mars.radiation.stations.mars.x, peakX: mars.radiation.stations.mars.peakX, date: mars.date } : null,
    fastestCme: fastest ? { speed: fastest.cmes.fastest.speed, date: fastest.date } : null,
    sepDays: timeline.filter((d) => d.sep.length).length,
    shockDays: timeline.filter((d) => d.shocks.length).length,
    stormNights: timeline.filter((d) => d.radiation.level > 0).length,
    calmDays: timeline.filter((d) => d.calm).length
  };
}
