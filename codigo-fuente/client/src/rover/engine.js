// =====================================================================================
//  Rover · motor puro del auto-runner lateral (docs/GAME_DESIGN.md · "Rover").
//  JS puro (ESM): sin React, sin DOM y sin Math.random → se prueba con node:test.
//
//  Unidades: "u" ≈ 1 metro de juego; tiempo en segundos. El eje y crece hacia ARRIBA
//  (y = 0 es el suelo llano). El Rover sale en x = 0 y la meta está en x = trackLength(zona).
//
//  Reglas clave (decisiones del equipo):
//   · Batería: capacidad por nivel {1:100, 2:130, 3:170}. La pista de la zona z gasta EXACTAMENTE
//     el 80 % de CAPACITY[z] si no chocas (drainPerUnit = 0,8 · CAPACITY[z] / trackLength(z)),
//     así el Rover del nivel mínimo llega con un 20 % de margen (≈ 4 choques).
//   · Cada choque gasta el 5 % de la capacidad del Rover. Batería a 0 antes de la meta →
//     regreso de emergencia (se pierde la mitad de lo recogido, redondeando hacia abajo).
//   · Pista determinista a partir de (semilla, zona) con piezas diseñadas a mano. Es JUSTA:
//     cada grupo de obstáculos tiene una ventana de despegue cómoda y entre grupos siempre hay
//     pista para aterrizar, reaccionar y volver a saltar (checkFairness lo comprueba).
//   · Simulación a paso fijo (120 Hz): el resultado no depende de los fps de la pantalla.
//
//  Uso típico (ver RoverRun.jsx):
//    const track = generateTrack('LUNA-4821', 2);
//    const run = createRun(track, 2);
//    stepRun(run, track, { pressed, held });   // 120 veces por segundo (modifica `run`)
//    run.events → [{ type: 'jump' | 'land' | 'hit' | 'collect' | 'low' | 'critical' | 'goal' | 'empty' | 'abort', … }]
//    runResult(run, track) → objeto para onFinish()
// =====================================================================================

// ---------------------------------------------------------------- números del juego

/** Capacidad de la batería del Rover según su nivel. */
export const CAPACITY = Object.freeze({ 1: 100, 2: 130, 3: 170 });
/** Parte de CAPACITY[zona] que gasta la pista de esa zona sin choques. */
export const DRAIN_SHARE = 0.8;
/** Parte de la capacidad del Rover que cuesta cada choque. */
export const HIT_SHARE = 0.05;
/** Margen de seguridad (raya en la barra de batería), en %. */
export const RESERVE_PCT = 20;
/** Batería crítica (aviso fuerte), en %. */
export const CRITICAL_PCT = 10;
/** Objetos que se pueden recoger (mismas claves que result.collected). */
export const ITEM_KINDS = Object.freeze(['ice', 'metal', 'samples']);
export const DEFAULT_SEED = 'LUNA-0000';

/**
 * Física del Rover. La gravedad es "de juego": saltos lentos y larguísimos para que se note
 * que en la Luna la gravedad es 1/6 de la de la Tierra (no es la cifra real en m/s²).
 */
export const PHYS = Object.freeze({
  dt: 1 / 120, // paso fijo de simulación
  gravity: 12.5, // u/s² mientras subes con el botón pulsado y al caer
  jumpSpeed: 9.2, // u/s de impulso al saltar → altura máxima ≈ 3,4 u y ≈ 1,5 s en el aire
  cutGravity: 1.9, // si sueltas mientras subes, la gravedad se multiplica (salto corto)
  coyote: 0.1, // s: aún puedes saltar justo después de meter las ruedas en un cráter
  buffer: 0.12, // s: si pulsas un poco antes de aterrizar, salta al tocar el suelo
  baseSpeed: 7, // u/s al empezar
  ramp: 0.12, // la velocidad sube un 12 % a lo largo de la pista (muy poco)
  startFactor: 0.45, // arranque suave tras la cuenta atrás
  bumpSpeed: 5.2, // rebote hacia arriba tras un choque (nunca se cae ni se queda atascado)
  hitSlow: 0.55, // velocidad tras un choque…
  hitRecover: 0.8, // …que se recupera en este tiempo
  invuln: 1.0, // s de invulnerabilidad tras un choque
  roverHalfW: 1.25, // caja "generosa" para recoger objetos
  roverH: 1.35,
  hitHalfW: 0.95, // caja de choque (más pequeña que el dibujo: perdona los roces)
  hitTop: 1.15,
  hitBottom: 0.06,
  rockInset: 0.15, // fracción del ancho de la roca que se perdona a cada lado
  rockTopInset: 0.12, // fracción de la altura de la roca que se perdona arriba
  craterEdge: 0.35, // u del borde del cráter que aún cuentan como suelo firme
  itemR: 0.55,
  collectPad: 0.3,
  reaction: 0.55, // s mínimos en el suelo entre aterrizar (peor caso) y tener que saltar otra vez
  minWindow: 0.3, // s mínimos de ventana para despegar en cada grupo de obstáculos
  startRunway: 2.4, // s tranquilos al empezar antes de la primera ventana de salto
  finishRunway: 10 // u llanos antes de la meta
});

/**
 * Piezas (patrones) diseñadas a mano. dx es relativo al inicio del grupo. Un grupo con varias
 * piezas se salta de UNA vez (lo garantiza su ventana de despegue).
 */
export const PATTERNS = Object.freeze({
  craterS: [{ type: 'crater', dx: 0, w: 2.6, d: 0.85 }],
  craterM: [{ type: 'crater', dx: 0, w: 3.3, d: 1.05 }],
  craterL: [{ type: 'crater', dx: 0, w: 4.1, d: 1.25 }],
  rockS: [{ type: 'boulder', dx: 0, w: 1.3, h: 0.95 }],
  rockM: [{ type: 'boulder', dx: 0, w: 1.7, h: 1.3 }],
  twinRocks: [
    { type: 'boulder', dx: 0, w: 1.2, h: 0.9 },
    { type: 'boulder', dx: 2.5, w: 1.25, h: 1.0 }
  ],
  rockCrater: [
    { type: 'boulder', dx: 0, w: 1.15, h: 0.9 },
    { type: 'crater', dx: 2.3, w: 2.6, d: 0.85 }
  ]
});

/**
 * Zonas. `seconds` es la duración aproximada a velocidad base (trackLength = seconds · baseSpeed).
 * `mix` es la proporción de cada objeto; `clusters`, los grupos de obstáculos; `terrain`, las
 * lomas (colinas sin obstáculos encima).
 */
export const ZONES = Object.freeze({
  1: Object.freeze({
    id: 1,
    name: Object.freeze({ es: 'Borde del cráter Shackleton', en: 'Shackleton crater rim' }),
    sampleName: Object.freeze({ es: 'anortosita', en: 'anorthosite' }),
    seconds: 35,
    items: 11,
    mix: Object.freeze({ metal: 0.36, samples: 0.37, ice: 0.27 }), // = TRACK_ITEMS del simulador del motor
    clusters: 7,
    patterns: Object.freeze({ craterS: 4, craterM: 2, rockS: 4, rockM: 1 }),
    terrain: Object.freeze({ chance: 0.45, double: 0.1, start: 0.4, h: [0.3, 0.6], w: [8, 12] }),
    light: 'sun',
    difficulty: 'easy'
  }),
  2: Object.freeze({
    id: 2,
    name: Object.freeze({ es: 'Cresta de conexión', en: 'Connecting Ridge' }),
    sampleName: Object.freeze({ es: 'brecha de impacto', en: 'impact breccia' }),
    seconds: 45,
    items: 13,
    mix: Object.freeze({ metal: 0.46, samples: 0.38, ice: 0.16 }),
    clusters: 9,
    patterns: Object.freeze({ craterS: 2, craterM: 3, craterL: 1, rockS: 2, rockM: 3, twinRocks: 2 }),
    terrain: Object.freeze({ chance: 0.75, double: 0.3, start: 0.7, h: [1.0, 1.8], w: [11, 16] }),
    light: 'sun',
    difficulty: 'medium'
  }),
  3: Object.freeze({
    id: 3,
    name: Object.freeze({ es: 'Cráter en sombra permanente', en: 'Permanently shadowed crater' }),
    sampleName: Object.freeze({ es: 'regolito helado', en: 'icy regolith' }),
    seconds: 55,
    items: 15,
    mix: Object.freeze({ ice: 0.47, samples: 0.4, metal: 0.13 }),
    clusters: 14,
    patterns: Object.freeze({ craterS: 2, craterM: 3, craterL: 2, rockS: 2, rockM: 3, twinRocks: 2, rockCrater: 2 }),
    terrain: Object.freeze({ chance: 0.2, double: 0, start: 0.2, h: [0.25, 0.5], w: [8, 11] }),
    light: 'dark',
    difficulty: 'hard'
  })
});

// Alturas de los objetos sobre el suelo (centro del objeto).
const GROUND_LIFT = 0.75; // en el suelo: se recoge rodando
const ARC_LIFT = 2.75; // encima de un obstáculo: se recoge al saltarlo
const HIGH_LIFT = 3.3; // en el aire en un tramo llano: hace falta un salto "extra"
const MIN_ITEM_GAP = 2.2; // separación mínima entre objetos elegidos
const HILL_AFTER = 1; // u entre el final de un grupo y el inicio de una loma
const HILL_BEFORE = 1; // u entre una loma y la ventana de despegue del grupo siguiente
const START_HILL_X = 4; // la cuenta atrás empieza en suelo llano
const GROUND_RES = 0.05; // resolución del mapa de alturas
const GROUND_FROM = -40; // el suelo se dibuja también detrás de la salida…
const GROUND_PAST = 60; // …y más allá de la meta
const RIM_H = 0.22; // altura del labio de los cráteres
const RIM_W = 0.28;

export const NO_INPUT = Object.freeze({ pressed: false, held: false });

// ---------------------------------------------------------------- utilidades puras

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Zona válida 1..3 (cualquier otra cosa → 1). */
export function clampZone(zone) {
  const n = Math.round(Number(zone));
  return Number.isFinite(n) ? clamp(n, 1, 3) : 1;
}

/** Nivel del Rover válido 1..3 (cualquier otra cosa → 1). */
export function clampLevel(level) {
  const n = Math.round(Number(level));
  return Number.isFinite(n) ? clamp(n, 1, 3) : 1;
}

/** Texto → entero sin signo de 32 bits (FNV-1a + mezcla final de MurmurHash3). */
export function hashString(str) {
  const s = String(str ?? '');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Generador Mulberry32: semilla uint32 → función que devuelve números en [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randRange = (rng, [lo, hi]) => lo + rng() * (hi - lo);

/** Elige una clave según sus pesos { clave: peso } (solo entre las que pasan `allow`). */
function pickWeighted(rng, weights, allow = () => true) {
  const entries = Object.entries(weights).filter(([k, w]) => w > 0 && allow(k));
  const list = entries.length ? entries : Object.entries(weights);
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of list) {
    r -= w;
    if (r < 0) return k;
  }
  return list[list.length - 1][0];
}

/** Baraja (Fisher–Yates) una copia. */
function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Reparte `n` objetos según la mezcla (método del mayor resto): siempre suman exactamente n.
 * itemCounts({ metal: .4, samples: .45, ice: .15 }, 12) → { metal: 5, samples: 5, ice: 2 }
 */
export function itemCounts(mix, n) {
  const keys = Object.keys(mix);
  const total = keys.reduce((s, k) => s + mix[k], 0) || 1;
  const raw = keys.map((k) => (mix[k] / total) * n);
  const out = Object.fromEntries(keys.map((k, i) => [k, Math.floor(raw[i])]));
  let left = n - keys.reduce((s, k) => s + out[k], 0);
  const order = keys.map((k, i) => ({ k, r: raw[i] - Math.floor(raw[i]), i })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let j = 0; left > 0; j = (j + 1) % order.length, left--) out[order[j].k] += 1;
  return out;
}

/** Mitad de cada objeto, redondeando hacia abajo (regreso de emergencia). */
export function halveItems(items) {
  const out = {};
  for (const k of ITEM_KINDS) out[k] = Math.floor((items?.[k] || 0) / 2);
  return out;
}

// ---------------------------------------------------------------- pista: medidas y física analítica

/** Distancia de la salida a la meta (u). */
export function trackLength(zone) {
  return ZONES[clampZone(zone)].seconds * PHYS.baseSpeed;
}

/** Velocidad de crucero en la posición x (sube un poquito a lo largo de la pista). */
export function speedAt(x, length) {
  return PHYS.baseSpeed * (1 + PHYS.ramp * clamp(length > 0 ? x / length : 0, 0, 1));
}

/** Salto completo (botón mantenido) desde suelo llano a velocidad v. */
export function fullJump(v) {
  const time = (2 * PHYS.jumpSpeed) / PHYS.gravity;
  return { time, length: v * time, apex: (PHYS.jumpSpeed * PHYS.jumpSpeed) / (2 * PHYS.gravity) };
}

/** Intervalo de tiempo [t1, t2] en el que un salto completo está a una altura ≥ h (o null). */
export function timeAbove(h) {
  const v0 = PHYS.jumpSpeed;
  const g = PHYS.gravity;
  const disc = v0 * v0 - 2 * g * h;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  return [(v0 - s) / g, (v0 + s) / g];
}

/** Caja de choque de una roca (con la parte que se perdona ya quitada). */
export function boulderBox(o) {
  return { x0: o.x0 + o.w * PHYS.rockInset, x1: o.x1 - o.w * PHYS.rockInset, top: (o.base || 0) + o.h * (1 - PHYS.rockTopInset) };
}

/** Interior "peligroso" de un cráter: si las ruedas tocan ahí → choque. */
export function craterInterior(o) {
  return { x0: o.x0 + PHYS.craterEdge, x1: o.x1 - PHYS.craterEdge };
}

/**
 * Ventana de despegue (posición x del centro del Rover) para superar con UN salto completo todos
 * los obstáculos de un grupo, a velocidad v y desde suelo llano. Devuelve { lo, hi } (vacía si lo > hi).
 * Es la base de la regla de pista justa y del piloto automático de las pruebas.
 */
export function takeoffWindow(obstacles, v) {
  let lo = -Infinity;
  let hi = Infinity;
  const T = (2 * PHYS.jumpSpeed) / PHYS.gravity;
  for (const o of obstacles) {
    if (o.type === 'boulder') {
      const b = boulderBox(o);
      const ta = timeAbove(b.top - (o.base || 0) - PHYS.hitBottom);
      if (!ta) return { lo: Infinity, hi: -Infinity };
      // Debe estar por encima de la roca mientras las cajas se solapan en horizontal
      hi = Math.min(hi, b.x0 - PHYS.hitHalfW - v * ta[0]);
      lo = Math.max(lo, b.x1 + PHYS.hitHalfW - v * ta[1]);
    } else {
      const c = craterInterior(o);
      hi = Math.min(hi, c.x0 + v * PHYS.coyote * 0.5); // despegar antes de hundirse (con medio coyote de margen)
      lo = Math.max(lo, c.x1 - v * T); // aterrizar pasado el interior
    }
  }
  return { lo, hi };
}

// ---------------------------------------------------------------- pista: construcción

function craterProfile(dx, o) {
  const r = o.w / 2;
  const ax = Math.abs(dx);
  let y = 0;
  if (ax < r) y -= (o.d * (1 + Math.cos((Math.PI * dx) / r))) / 2; // cuenco
  const rim = (ax - r) / RIM_W;
  if (rim > -4 && rim < 4) y += RIM_H * Math.exp(-rim * rim); // labio levantado
  return y;
}

function hillProfile(x, hill) {
  if (x <= hill.x0 || x >= hill.x1) return 0;
  return (hill.h * (1 - Math.cos((2 * Math.PI * (x - hill.x0)) / (hill.x1 - hill.x0)))) / 2;
}

/** Altura del terreno (solo lomas) en x: sirve para apoyar las rocas. */
function hillsAt(hills, x) {
  let y = 0;
  for (const h of hills) y += hillProfile(x, h);
  return y;
}

function buildGround(length, hills, obstacles) {
  const n = Math.ceil((length + GROUND_PAST - GROUND_FROM) / GROUND_RES) + 1;
  const h = new Float64Array(n);
  const xAt = (i) => GROUND_FROM + i * GROUND_RES;
  const idx = (x) => clamp(Math.round((x - GROUND_FROM) / GROUND_RES), 0, n - 1);
  for (const hill of hills) {
    for (let i = idx(hill.x0); i <= idx(hill.x1); i++) h[i] += hillProfile(xAt(i), hill);
  }
  for (const o of obstacles) {
    if (o.type !== 'crater') continue;
    const r = o.w / 2 + RIM_W * 4;
    for (let i = idx(o.cx - r); i <= idx(o.cx + r); i++) h[i] += craterProfile(xAt(i) - o.cx, o);
  }
  return { x0: GROUND_FROM, res: GROUND_RES, h };
}

/** Altura del suelo en x (interpolando el mapa de alturas de la pista). */
export function groundAt(track, x) {
  const g = track.ground;
  const f = (x - g.x0) / g.res;
  const i = Math.floor(f);
  if (i <= 0) return g.h[0];
  if (i >= g.h.length - 1) return g.h[g.h.length - 1];
  const t = f - i;
  return g.h[i] * (1 - t) + g.h[i + 1] * t;
}

/** Pendiente del suelo en x (para inclinar el Rover). */
export function slopeAt(track, x, half = 0.9) {
  return (groundAt(track, x + half) - groundAt(track, x - half)) / (2 * half);
}

/**
 * Construye una pista a partir de una descripción (la usa el generador y las pruebas):
 * { zone, seed, length, obstacles: [{ type, x0, w, h|d, cluster? }], hills: [{ x0, w|x1, h }], items: [{ kind, x, y? , lift? }] }
 */
export function buildTrack({ zone = 1, seed = '', length, obstacles = [], hills = [], items = [] } = {}) {
  const z = clampZone(zone);
  const L = length ?? trackLength(z);
  const hl = hills
    .map((hh) => ({ x0: hh.x0, x1: hh.x1 ?? hh.x0 + hh.w, h: hh.h }))
    .sort((a, b) => a.x0 - b.x0);
  const obs = obstacles
    .map((o) => ({ ...o }))
    .sort((a, b) => a.x0 - b.x0)
    .map((o, i) => {
      const x1 = o.x0 + o.w;
      const base = o.type === 'boulder' ? hillsAt(hl, o.x0 + o.w / 2) : 0;
      return {
        id: i,
        type: o.type,
        x0: o.x0,
        x1,
        w: o.w,
        cx: o.x0 + o.w / 2,
        h: o.type === 'boulder' ? o.h : 0,
        d: o.type === 'crater' ? o.d : 0,
        base,
        cluster: o.cluster ?? i,
        shape: o.shape ?? hashString(`${seed}|${z}|o${i}`)
      };
    });
  // Grupos de obstáculos (los que se saltan de una vez)
  const byCluster = new Map();
  for (const o of obs) {
    if (!byCluster.has(o.cluster)) byCluster.set(o.cluster, []);
    byCluster.get(o.cluster).push(o.id);
  }
  const clusters = [...byCluster.values()]
    .map((ids) => ({ obstacles: ids, x0: Math.min(...ids.map((i) => obs[i].x0)), x1: Math.max(...ids.map((i) => obs[i].x1)) }))
    .sort((a, b) => a.x0 - b.x0)
    .map((c, i) => ({ id: i, ...c }));
  clusters.forEach((c) => c.obstacles.forEach((oi) => (obs[oi].cluster = c.id)));

  const ground = buildGround(L, hl, obs);
  const track = { zone: z, seed: String(seed), length: L, obstacles: obs, clusters, hills: hl, items: [], ground };
  track.items = items
    .map((it) => ({ kind: it.kind, x: it.x, y: it.y ?? groundAt(track, it.x) + (it.lift ?? GROUND_LIFT), type: it.type || 'ground' }))
    .sort((a, b) => a.x - b.x)
    .map((it, i) => ({ id: i, ...it }));
  return track;
}

// ---------------------------------------------------------------- pista: generador determinista

const V_MIN = PHYS.baseSpeed;
const V_MAX = PHYS.baseSpeed * (1 + PHYS.ramp);

/** Ventana relativa al inicio del grupo para las velocidades extremas (cota segura para cualquier x). */
function clusterShape(obs) {
  const placed = obs.map((o) => ({ ...o, x0: o.dx, x1: o.dx + o.w, base: 0 }));
  const span = Math.max(...placed.map((o) => o.x1));
  const wMin = takeoffWindow(placed, V_MIN);
  const wMax = takeoffWindow(placed, V_MAX);
  return {
    span,
    lead: -Math.min(wMin.lo, wMax.lo), // cuánto antes del grupo puede empezar a despegar
    hiMin: Math.min(wMin.hi, wMax.hi), // el despegue más tardío posible (cota segura)
    landMax: Math.max(wMin.hi + fullJump(V_MIN).length, wMax.hi + fullJump(V_MAX).length), // aterrizaje más lejano (peor caso)
    ok: wMin.hi - wMin.lo >= PHYS.minWindow * V_MIN && wMax.hi - wMax.lo >= PHYS.minWindow * V_MAX
  };
}

/** Copia del patrón con tamaños un poco variados (±8 %); si la variación lo hiciera injusto, usa el original. */
function instantiate(patternId, rng) {
  const base = PATTERNS[patternId];
  const jit = base.map((o) => {
    const k = 0.92 + rng() * 0.16;
    return o.type === 'crater' ? { ...o, w: o.w * k, d: o.d * (0.92 + rng() * 0.16) } : { ...o, w: o.w * k, h: o.h * (0.92 + rng() * 0.16) };
  });
  const shape = clusterShape(jit);
  if (shape.ok) return { obs: jit, ...shape };
  const plain = base.map((o) => ({ ...o }));
  return { obs: plain, ...clusterShape(plain) };
}

/** Distancia mínima entre los INICIOS de dos grupos seguidos A → B (aterrizar + reaccionar + saltar). */
function minStartGap(A, B) {
  return Math.max(A.span + 1, A.landMax + PHYS.reaction * V_MAX - B.hiMin);
}

/**
 * Genera la pista de una zona. Determinista: misma (semilla, zona) → misma pista.
 * 1) Elige la secuencia de grupos de obstáculos y lomas. 2) Coloca todo lo más junto posible
 * respetando las reglas de pista justa. 3) Reparte el sitio sobrante al azar (solo alarga huecos,
 * así las reglas se siguen cumpliendo). 4) Coloca los objetos en huecos pensados para ellos.
 */
export function generateTrack(seed = DEFAULT_SEED, zone = 1) {
  const z = clampZone(zone);
  const cfg = ZONES[z];
  const rng = mulberry32(hashString(`${seed ?? ''}|rover|z${z}`));
  const L = trackLength(z);
  const firstLo = PHYS.startRunway * PHYS.baseSpeed;
  const endLimit = L - PHYS.finishRunway;

  // 1) Secuencia
  const seq = [];
  const addHill = () => seq.push({ kind: 'hill', w: randRange(rng, cfg.terrain.w), h: randRange(rng, cfg.terrain.h) });
  if (rng() < cfg.terrain.start) addHill();
  let prev = null;
  let prev2 = null;
  for (let i = 0; i < cfg.clusters; i++) {
    const pat = pickWeighted(rng, cfg.patterns, (p) => !(i === 0 && PATTERNS[p].length > 1) && !(p === prev && p === prev2));
    seq.push({ kind: 'cluster', pattern: pat, ...instantiate(pat, rng) });
    prev2 = prev;
    prev = pat;
    if (i < cfg.clusters - 1 && rng() < cfg.terrain.chance) {
      addHill();
      if (rng() < cfg.terrain.double) addHill();
    }
  }

  // 2) Colocación mínima (si no cabe, se quitan elementos del final)
  const layout = (list) => {
    let cursor = 0;
    let prevKind = 'start';
    let last = null;
    for (const el of list) {
      if (el.kind === 'hill') {
        el.min = prevKind === 'start' ? Math.max(cursor, START_HILL_X) : prevKind === 'cluster' ? cursor + HILL_AFTER : cursor;
        cursor = el.min + el.w;
      } else {
        let start = prevKind === 'hill' ? cursor + el.lead + HILL_BEFORE : cursor;
        start = last ? Math.max(start, last.min + minStartGap(last, el)) : Math.max(start, firstLo + el.lead);
        el.min = start;
        cursor = start + el.span;
        last = el;
      }
      prevKind = el.kind;
    }
    return cursor;
  };
  let end = layout(seq);
  while (seq.length > 1 && end > endLimit) {
    seq.pop();
    while (seq.length && seq[seq.length - 1].kind === 'hill') seq.pop();
    end = layout(seq);
  }

  // 3) Reparto del sitio sobrante: cada elemento (y el tramo final) recibe una parte al azar
  const slack = Math.max(0, endLimit - end);
  const weights = seq.map((el, i) => (el.kind === 'hill' ? 0.35 : 0.6) + rng() * (i === 0 ? 0.4 : 1));
  weights.push(0.4 + rng() * 0.8);
  const wsum = weights.reduce((s, w) => s + w, 0);
  let shift = 0;
  seq.forEach((el, i) => {
    shift += (slack * weights[i]) / wsum;
    el.start = el.min + shift;
  });

  // 4) Obstáculos y lomas con posiciones absolutas
  const obstacles = [];
  const hills = [];
  let ci = 0;
  for (const el of seq) {
    if (el.kind === 'hill') hills.push({ x0: el.start, w: el.w, h: el.h });
    else {
      for (const o of el.obs) obstacles.push({ type: o.type, x0: el.start + o.dx, w: o.w, h: o.h, d: o.d, cluster: ci });
      ci += 1;
    }
  }
  const track = buildTrack({ zone: z, seed, length: L, obstacles, hills });

  // 5) Objetos: huecos candidatos → elegir N repartidos → asignar tipos barajados
  const slots = itemSlots(track);
  const chosen = chooseSlots(rng, slots, cfg.items);
  const counts = itemCounts(cfg.mix, chosen.length);
  const bag = shuffle(
    rng,
    Object.entries(counts).flatMap(([k, n]) => Array.from({ length: n }, () => k))
  );
  track.items = chosen.map((slot, i) => ({ id: i, kind: bag[i], x: slot.x, y: slot.y, type: slot.type }));
  return track;
}

/** Huecos donde tiene sentido poner un objeto (todos alcanzables y sin trampas). */
function itemSlots(track) {
  const L = track.length;
  const slots = [];
  const ground = (x, type = 'ground') => slots.push({ x, y: groundAt(track, x) + GROUND_LIFT, type });
  const D = fullJump(V_MAX).length;
  const R = PHYS.reaction * V_MAX;
  const windows = track.clusters.map((c) => {
    const obs = c.obstacles.map((i) => track.obstacles[i]);
    const v = speedAt(c.x0, L);
    return { c, w: takeoffWindow(obs, v), v };
  });
  // Encima de cada grupo de obstáculos: se recoge al saltarlo
  for (const { c } of windows) {
    const cx = (c.x0 + c.x1) / 2;
    const top = Math.max(...c.obstacles.map((i) => (track.obstacles[i].type === 'boulder' ? track.obstacles[i].h : 0)));
    slots.push({ x: cx, y: Math.max(ARC_LIFT, top + 1.45), type: 'arc' });
  }
  // Tramos libres: donde el Rover va rodando (entre el peor aterrizaje y la ventana siguiente)
  const free = [];
  let from = 6;
  for (const { w } of windows) {
    free.push([from, w.lo - 0.6]);
    from = w.hi + D + 0.6;
  }
  free.push([from, L - 3]);
  for (const [a, b] of free) {
    const len = b - a;
    if (len < 1) continue;
    const n = Math.min(4, Math.max(1, Math.floor(len / 3.5)));
    for (let k = 0; k < n; k++) ground(a + ((k + 0.5) * len) / n);
    // Tramo largo: un objeto alto que pide un salto "de regalo"
    if (len >= D + 2 * R) {
      const x = (a + b) / 2;
      slots.push({ x, y: groundAt(track, x) + HIGH_LIFT, type: 'high' });
    }
  }
  // Cimas de las lomas
  for (const h of track.hills) ground((h.x0 + h.x1) / 2, 'hill');
  return slots.filter((s) => s.x > 3 && s.x < L - 2);
}

/** Elige n huecos repartidos por toda la pista (muestreo por tramos + relleno del hueco más grande). */
function chooseSlots(rng, slots, n) {
  const sorted = slots.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length <= n) return sorted;
  const chosen = [];
  const far = (s) => chosen.every((c) => Math.abs(c.x - s.x) >= MIN_ITEM_GAP);
  const lo = sorted[0].x;
  const hi = sorted[sorted.length - 1].x + 1e-6;
  const span = (hi - lo) / n;
  for (let b = 0; b < n; b++) {
    const a0 = lo + b * span;
    const a1 = a0 + span;
    const pool = sorted.filter((s) => s.x >= a0 && s.x < a1 && !chosen.includes(s) && far(s));
    if (pool.length) chosen.push(pool[Math.floor(rng() * pool.length)]);
  }
  while (chosen.length < n) {
    let best = null;
    let bestD = -1;
    for (const s of sorted) {
      if (chosen.includes(s)) continue;
      const d = Math.min(...chosen.map((c) => Math.abs(c.x - s.x)));
      if (d > bestD) {
        bestD = d;
        best = s;
      }
    }
    if (!best) break;
    chosen.push(best);
  }
  return chosen.sort((a, b) => a.x - b.x);
}

/**
 * Comprueba que la pista es justa (independiente del generador):
 *  · cada grupo de obstáculos tiene una ventana de despegue ≥ PHYS.minWindow segundos,
 *  · entre dos grupos seguidos, aterrizando en el peor caso queda ≥ PHYS.reaction s de pista,
 *  · los obstáculos y sus ventanas están en suelo llano (ninguna loma debajo),
 *  · la primera ventana llega tras unos segundos tranquilos y todo acaba antes de la meta.
 * Devuelve { ok, problems: [texto…] }.
 */
export function checkFairness(track) {
  const problems = [];
  const L = track.length;
  const obsOf = (c) => c.obstacles.map((i) => track.obstacles[i]);
  let prev = null;
  const sorted = track.obstacles.slice().sort((a, b) => a.x0 - b.x0);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].x0 < sorted[i - 1].x1) problems.push(`obstáculos solapados en x=${sorted[i].x0.toFixed(1)}`);
  }
  for (const c of track.clusters) {
    const obs = obsOf(c);
    const vs = [speedAt(c.x0, L), speedAt(c.x1, L)];
    for (const v of vs) {
      const w = takeoffWindow(obs, v);
      if (!(w.hi - w.lo >= PHYS.minWindow * v - 1e-9)) problems.push(`grupo ${c.id}: ventana de ${((w.hi - w.lo) / v).toFixed(2)} s`);
    }
    const w = takeoffWindow(obs, vs[0]);
    if (!prev && w.lo < PHYS.startRunway * PHYS.baseSpeed - 1e-9) problems.push(`grupo ${c.id}: demasiado cerca de la salida`);
    if (c.x1 > L - PHYS.finishRunway + 1e-9) problems.push(`grupo ${c.id}: demasiado cerca de la meta`);
    for (const h of track.hills) {
      if (h.x1 > Math.min(w.lo, c.x0) - 0.5 && h.x0 < c.x1 + 0.5) problems.push(`grupo ${c.id}: hay una loma bajo el salto`);
    }
    if (prev) {
      const vA = speedAt(prev.c.x1, L);
      const vB = speedAt(c.x0, L);
      const wA = takeoffWindow(obsOf(prev.c), vA);
      const landing = wA.hi + fullJump(Math.max(vA, vB)).length;
      const latest = takeoffWindow(obs, vB).hi;
      if (latest - landing < PHYS.reaction * vB - 1e-9) {
        problems.push(`grupos ${prev.c.id}→${c.id}: solo ${((latest - landing) / vB).toFixed(2)} s para reaccionar`);
      }
    }
    prev = { c };
  }
  return { ok: problems.length === 0, problems };
}

/** Resumen de la pista (para pruebas y depuración). */
export function trackStats(track) {
  const kinds = Object.fromEntries(ITEM_KINDS.map((k) => [k, 0]));
  for (const it of track.items) kinds[it.kind] += 1;
  return {
    length: track.length,
    clusters: track.clusters.length,
    obstacles: track.obstacles.length,
    craters: track.obstacles.filter((o) => o.type === 'crater').length,
    boulders: track.obstacles.filter((o) => o.type === 'boulder').length,
    hills: track.hills.length,
    items: track.items.length,
    kinds
  };
}

// ---------------------------------------------------------------- plan de batería (para la intro)

/**
 * Cuánta batería gasta una zona con un Rover de cierto nivel.
 * zonePlan(1, 1) → { capacity: 100, usePct: 80, marginPct: 20, hitPct: 5, maxHits: 4, unlocked: true, … }
 */
export function zonePlan(zone, roverLevel) {
  const z = clampZone(zone);
  const lv = clampLevel(roverLevel);
  const capacity = CAPACITY[lv];
  const usePct = ((DRAIN_SHARE * CAPACITY[z]) / capacity) * 100;
  const marginPct = 100 - usePct;
  const hitPct = HIT_SHARE * 100;
  return {
    zone: z,
    level: lv,
    capacity,
    usePct,
    marginPct,
    hitPct,
    maxHits: Math.max(0, Math.floor(marginPct / hitPct + 1e-9)),
    unlocked: lv >= z
  };
}

// ---------------------------------------------------------------- la carrera

const PASSED = 2; // obstáculo atravesado durante la invulnerabilidad (no cuenta como choque)

/** Estado inicial de una carrera. El Rover sale en x = 0 con la batería llena. */
export function createRun(track, roverLevel = 1) {
  const level = clampLevel(roverLevel);
  const capacity = CAPACITY[level];
  const y = groundAt(track, 0);
  return {
    zone: track.zone,
    level,
    capacity,
    drainPerUnit: (DRAIN_SHARE * CAPACITY[track.zone]) / track.length,
    hitCost: HIT_SHARE * capacity,
    status: 'running', // 'running' | 'goal' | 'emergency' | 'aborted'
    t: 0,
    x: 0,
    y,
    vy: 0,
    prevX: 0,
    prevY: y,
    grounded: true,
    jumping: false,
    cut: false,
    jumpBuffer: 0,
    craterTime: 0,
    speedFactor: PHYS.startFactor,
    invuln: 0,
    battery: capacity,
    collisions: 0,
    jumps: 0,
    collected: { ice: 0, metal: 0, samples: 0 },
    taken: new Uint8Array(track.items.length),
    hit: new Uint8Array(track.obstacles.length),
    obsCursor: 0,
    itemCursor: 0,
    lowWarned: false,
    criticalWarned: false,
    endX: null,
    endBattery: null,
    events: []
  };
}

/** Velocidad actual del Rover (u/s). */
export function currentSpeed(s, track) {
  return speedAt(s.x, track.length) * s.speedFactor;
}

/** Batería en % de la capacidad del Rover (0–100). */
export function batteryPct(s) {
  return clamp((s.battery / s.capacity) * 100, 0, 100);
}

/** Avance hacia la meta (0–1). */
export function progressOf(s, track) {
  return clamp((s.endX ?? s.x) / track.length, 0, 1);
}

function finish(s, status, type) {
  s.status = status;
  s.endX = s.x;
  s.battery = Math.max(0, s.battery);
  s.endBattery = s.battery;
  s.events.push({ type, x: s.x, y: s.y });
}

function hitObstacle(s, track, i) {
  const o = track.obstacles[i];
  s.hit[i] = 1;
  s.collisions += 1;
  s.invuln = PHYS.invuln;
  s.speedFactor = Math.min(s.speedFactor, PHYS.hitSlow);
  s.vy = Math.max(s.vy, PHYS.bumpSpeed); // el Rover rebota y sigue: nunca se cae ni se atasca
  s.grounded = false;
  s.jumping = false;
  s.cut = false;
  s.craterTime = 0;
  s.events.push({ type: 'hit', kind: o.type, index: i, x: s.x, y: s.y });
}

/**
 * Avanza la carrera un paso fijo. MODIFICA `s` (por rendimiento) y lo devuelve.
 * input = { pressed: pulsó saltar desde el último paso, held: mantiene pulsado }.
 * Los sucesos del paso se añaden a s.events (quien los lea debe vaciar la lista).
 */
export function stepRun(s, track, input = NO_INPUT, dt = PHYS.dt) {
  if (s.status !== 'running') return s;
  const P = PHYS;
  const held = !!input?.held;
  s.prevX = s.x;
  s.prevY = s.y;
  s.t += dt;

  // 1) El toque se guarda un momento (buffer): así un toque algo temprano también vale
  if (input?.pressed) s.jumpBuffer = P.buffer;
  else if (s.jumpBuffer > 0) s.jumpBuffer = Math.max(0, s.jumpBuffer - dt);

  // 2) Saltar: en el suelo, o recién metidas las ruedas en un cráter (coyote)
  if (s.jumpBuffer > 0 && s.grounded && s.craterTime <= P.coyote) {
    s.vy = P.jumpSpeed;
    s.grounded = false;
    s.jumping = true;
    s.cut = false;
    s.jumpBuffer = 0;
    s.craterTime = 0;
    s.jumps += 1;
    s.events.push({ type: 'jump', x: s.x, y: s.y });
  }
  // Salto variable: si sueltas mientras subes, el salto se corta (más bajo y más corto)
  if (s.jumping && s.vy > 0 && !held) s.cut = true;

  // 3) Avance horizontal (siempre hacia la derecha, sin pasarse de la meta)
  if (s.speedFactor < 1) s.speedFactor = Math.min(1, s.speedFactor + ((1 - P.hitSlow) / P.hitRecover) * dt);
  s.x = Math.min(track.length, s.x + speedAt(s.x, track.length) * s.speedFactor * dt);

  // 4) Vertical: gravedad constante en cada paso (integración exacta) y aterrizaje
  if (s.grounded) {
    s.y = groundAt(track, s.x);
  } else {
    const g = P.gravity * (s.jumping && s.cut && s.vy > 0 ? P.cutGravity : 1);
    s.y += s.vy * dt - 0.5 * g * dt * dt;
    s.vy -= g * dt;
    const gy = groundAt(track, s.x);
    if (s.y <= gy) {
      s.y = gy; // una cuesta que sube "empuja" al Rover; si ya bajaba, aterriza
      if (s.vy <= 0) {
        s.vy = 0;
        s.grounded = true;
        s.jumping = false;
        s.cut = false;
        s.events.push({ type: 'land', x: s.x, y: s.y });
      }
    }
  }

  // 5) Obstáculos cercanos
  const obs = track.obstacles;
  while (s.obsCursor < obs.length && obs[s.obsCursor].x1 + 3 < s.x) s.obsCursor++;
  let inCrater = -1;
  for (let i = s.obsCursor; i < obs.length && obs[i].x0 - 3 < s.x; i++) {
    const o = obs[i];
    if (s.hit[i]) continue;
    if (o.type === 'crater') {
      if (!s.grounded) continue;
      const c = craterInterior(o);
      if (s.x > c.x0 && s.x < c.x1) inCrater = i;
    } else {
      const b = boulderBox(o);
      const overlap = s.x + P.hitHalfW > b.x0 && s.x - P.hitHalfW < b.x1 && s.y + P.hitBottom < b.top && s.y + P.hitTop > o.base;
      if (!overlap) continue;
      if (s.invuln > 0) s.hit[i] = PASSED;
      else hitObstacle(s, track, i);
    }
  }
  if (inCrater >= 0) {
    if (s.invuln > 0) {
      s.hit[inCrater] = PASSED;
      s.craterTime = 0;
    } else {
      s.craterTime += dt;
      if (s.craterTime > P.coyote) hitObstacle(s, track, inCrater);
    }
  } else {
    s.craterTime = 0;
  }

  // 6) Objetos: la caja del Rover (generosa) toca el círculo del objeto
  const items = track.items;
  while (s.itemCursor < items.length && items[s.itemCursor].x + 3 < s.x) s.itemCursor++;
  const bx0 = s.x - P.roverHalfW;
  const bx1 = s.x + P.roverHalfW;
  const by0 = s.y;
  const by1 = s.y + P.roverH;
  const rr = (P.itemR + P.collectPad) ** 2;
  for (let i = s.itemCursor; i < items.length && items[i].x - 3 < s.x; i++) {
    if (s.taken[i]) continue;
    const it = items[i];
    const dx = Math.max(bx0 - it.x, 0, it.x - bx1);
    const dy = Math.max(by0 - it.y, 0, it.y - by1);
    if (dx * dx + dy * dy <= rr) {
      s.taken[i] = 1;
      s.collected[it.kind] += 1;
      s.events.push({ type: 'collect', kind: it.kind, index: i, x: it.x, y: it.y });
    }
  }

  // 7) Temporizadores, batería y final
  if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);
  // Calculada (no acumulada) para que no haya error de redondeo: capacidad − distancia − choques
  s.battery = s.capacity - s.drainPerUnit * s.x - s.hitCost * s.collisions;
  if (s.x >= track.length) {
    finish(s, 'goal', 'goal'); // llegar a la meta gana aunque la batería toque justo 0
  } else if (s.battery <= 1e-9) {
    finish(s, 'emergency', 'empty');
  } else {
    const pct = (s.battery / s.capacity) * 100;
    if (!s.lowWarned && pct < RESERVE_PCT - 1e-6) {
      s.lowWarned = true;
      s.events.push({ type: 'low' });
    }
    if (!s.criticalWarned && pct < CRITICAL_PCT) {
      s.criticalWarned = true;
      s.events.push({ type: 'critical' });
    }
  }
  return s;
}

/** Abortar desde la pausa = regreso de emergencia (se pierde la mitad de lo recogido). */
export function abortRun(s) {
  if (s.status === 'running') finish(s, 'aborted', 'abort');
  return s;
}

/**
 * Movimiento de adorno tras terminar (frena y cae al suelo). No cambia el resultado:
 * runResult usa la posición y la batería guardadas al terminar.
 */
export function coastStep(s, track, dt = PHYS.dt) {
  if (s.status === 'running') return s;
  if (s.coastV == null) s.coastV = s.status === 'aborted' ? 0 : currentSpeed(s, track);
  const decel = s.status === 'goal' ? 4.2 : 8;
  s.coastV = Math.max(0, s.coastV - decel * dt);
  s.prevX = s.x;
  s.prevY = s.y;
  s.x += s.coastV * dt;
  const gy = groundAt(track, s.x);
  if (s.grounded) s.y = gy;
  else {
    s.y += s.vy * dt - 0.5 * PHYS.gravity * dt * dt;
    s.vy -= PHYS.gravity * dt;
    if (s.y <= gy) {
      s.y = gy;
      s.vy = 0;
      s.grounded = true;
    }
  }
  return s;
}

/**
 * Resultado para onFinish(). Si terminó por emergencia o se abortó, se conserva la mitad de
 * cada objeto (redondeando hacia abajo).
 */
export function runResult(s, track) {
  const completed = s.status === 'goal';
  const aborted = s.status === 'aborted' || s.status === 'running';
  const emergency = !completed;
  const found = { ice: s.collected.ice, metal: s.collected.metal, samples: s.collected.samples };
  const battery = s.endBattery ?? Math.max(0, s.battery);
  return {
    completed,
    emergency,
    aborted,
    collected: emergency ? halveItems(found) : found,
    collisions: s.collisions,
    batteryLeft: Math.round(clamp((battery / s.capacity) * 100, 0, 100)),
    progress: Math.round(progressOf(s, track) * 1000) / 1000,
    zone: track.zone
  };
}

// ---------------------------------------------------------------- piloto automático (pruebas)

/**
 * Piloto automático: salta cada grupo dentro de su ventana y mantiene el botón hasta aterrizar.
 * `where` ∈ [0, 1] elige el punto de la ventana (0,5 = el centro); con `rng` cada grupo usa un punto
 * al azar entre 0,1 y 0,9 (un "niño" que no siempre salta igual). Devuelve policy(state) → input.
 */
export function makeAutopilot(track, { where = 0.5, rng = null } = {}) {
  let ci = 0;
  let jumpedFor = -1;
  let holding = false;
  const targets = new Map();
  return function policy(s) {
    while (ci < track.clusters.length && s.x > track.clusters[ci].x1 + 0.5) ci++;
    const c = track.clusters[ci];
    let pressed = false;
    if (c && jumpedFor !== ci && s.grounded) {
      const obs = c.obstacles.map((i) => track.obstacles[i]);
      const w = takeoffWindow(obs, currentSpeed(s, track));
      if (!targets.has(ci)) targets.set(ci, rng ? 0.1 + 0.8 * rng() : where);
      const target = w.lo + (w.hi - w.lo) * targets.get(ci);
      if (s.x >= target) {
        pressed = true;
        jumpedFor = ci;
        holding = true;
      }
    }
    if (s.grounded && !pressed) holding = false;
    return { pressed, held: pressed || holding };
  };
}

/** Juega una carrera completa con una estrategia (para pruebas y para el simulador de equilibrio). */
export function simulateRun(track, roverLevel, policy = null, { maxSeconds = 600 } = {}) {
  const s = createRun(track, roverLevel);
  const maxSteps = Math.ceil(maxSeconds / PHYS.dt);
  for (let i = 0; i < maxSteps && s.status === 'running'; i++) {
    stepRun(s, track, policy ? policy(s, track) : NO_INPUT);
    s.events.length = 0;
  }
  return { state: s, result: runResult(s, track) };
}
