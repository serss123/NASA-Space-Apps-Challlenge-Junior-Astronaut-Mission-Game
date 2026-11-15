// Geometría de la base lunar vista desde arriba (coordenadas del mundo: 1000 × 640).
// Pura (sin React): zonas por las que se puede andar, módulos, grafo de caminos y búsqueda de ruta.

export const WORLD = { w: 1000, h: 640 };
export const ASTRO_RADIUS = 11;

// Módulos de la base. `shape` define su interior; `door` es donde se coloca el astronauta para usarlo.
export const MODULES = [
  { id: 'lifeSupport', icon: '🫁', accent: 'var(--life)', color: '#5ab0ff', shape: { kind: 'circle', cx: 500, cy: 320, r: 88 }, node: [500, 320], label: [500, 418] },
  { id: 'antenna', icon: '📡', accent: 'var(--antenna)', color: '#36c5f0', shape: { kind: 'circle', cx: 500, cy: 110, r: 60 }, node: [500, 110], label: [500, 30] },
  { id: 'farm', icon: '🌱', accent: 'var(--farm)', color: '#5fd068', shape: { kind: 'rect', x: 105, y: 228, w: 200, h: 150, rx: 34 }, node: [205, 303], label: [205, 204] },
  { id: 'shield', icon: '🛡️', accent: 'var(--shield)', color: '#9b7bff', shape: { kind: 'circle', cx: 800, cy: 312, r: 72 }, node: [800, 312], label: [800, 404] },
  { id: 'bed', icon: '🛏️', accent: 'var(--bed)', color: '#ff7eb6', shape: { kind: 'rect', x: 238, y: 470, w: 180, h: 112, rx: 30 }, node: [328, 526], label: [328, 604] },
  { id: 'rover', icon: '🚙', accent: 'var(--rover)', color: '#ff8a3d', shape: { kind: 'rect', x: 590, y: 466, w: 200, h: 120, rx: 26 }, node: [690, 526], label: [690, 606] },
  { id: 'solar', icon: '☀️', accent: 'var(--energy)', color: '#ffc83d', shape: { kind: 'rect', x: 772, y: 36, w: 196, h: 118, rx: 18 }, node: [870, 120], label: [870, 18], outdoor: true }
];
export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m]));

// Pasillos (cápsulas: segmento + radio). El camino a los paneles es exterior (huellas en el regolito).
export const CORRIDORS = [
  { id: 'c-antenna', a: [500, 165], b: [500, 236], r: 24 },
  { id: 'c-farm', a: [300, 312], b: [416, 314], r: 24 },
  { id: 'c-shield', a: [584, 314], b: [732, 314], r: 24 },
  { id: 'c-bed', a: [446, 384], b: [372, 478], r: 24 },
  { id: 'c-rover', a: [554, 384], b: [632, 474], r: 24 },
  { id: 'c-solar', a: [826, 246], b: [860, 150], r: 22, outdoor: true }
];

// Grafo de caminos para ir andando al pulsar con el ratón o el dedo.
export const NAV_NODES = {
  hub: [500, 320],
  antenna: [500, 110],
  aHub: [500, 205],
  farm: [205, 303],
  fHub: [358, 313],
  shield: [800, 312],
  sHub: [658, 314],
  bed: [328, 526],
  bHub: [409, 431],
  rover: [690, 526],
  rHub: [593, 429],
  sOut: [843, 198],
  solar: [870, 110]
};
const EDGES = [
  ['hub', 'aHub'],
  ['aHub', 'antenna'],
  ['hub', 'fHub'],
  ['fHub', 'farm'],
  ['hub', 'sHub'],
  ['sHub', 'shield'],
  ['hub', 'bHub'],
  ['bHub', 'bed'],
  ['hub', 'rHub'],
  ['rHub', 'rover'],
  ['shield', 'sOut'],
  ['sOut', 'solar']
];
const ADJ = {};
for (const [a, b] of EDGES) {
  (ADJ[a] ??= []).push(b);
  (ADJ[b] ??= []).push(a);
}

// ---------- geometría ----------
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

function distToSegment(p, a, b) {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / len2));
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}

/** ¿Está el punto dentro de la forma (con un margen hacia dentro)? */
export function insideShape(p, s, margin = 0) {
  if (s.kind === 'circle') return Math.hypot(p[0] - s.cx, p[1] - s.cy) <= s.r - margin;
  if (s.kind === 'rect') return p[0] >= s.x + margin && p[0] <= s.x + s.w - margin && p[1] >= s.y + margin && p[1] <= s.y + s.h - margin;
  return false;
}

/** ¿Puede estar el astronauta en este punto? */
export function isWalkable(p, margin = ASTRO_RADIUS) {
  for (const m of MODULES) if (insideShape(p, m.shape, margin)) return true;
  for (const c of CORRIDORS) if (distToSegment(p, c.a, c.b) <= c.r - margin * 0.55) return true;
  return false;
}

/** Módulo en el que está el punto (o null si está en un pasillo). */
export function moduleAt(p) {
  for (const m of MODULES) if (insideShape(p, m.shape, 6)) return m;
  return null;
}

/** Mueve respetando las paredes (si choca, intenta deslizar por un eje). */
export function stepMove(p, dx, dy) {
  const full = [p[0] + dx, p[1] + dy];
  if (isWalkable(full)) return full;
  const onlyX = [p[0] + dx, p[1]];
  if (dx && isWalkable(onlyX)) return onlyX;
  const onlyY = [p[0], p[1] + dy];
  if (dy && isWalkable(onlyY)) return onlyY;
  return p;
}

function nearestNode(p) {
  let best = null;
  let bestD = Infinity;
  for (const [id, pos] of Object.entries(NAV_NODES)) {
    const d = dist(p, pos);
    if (d < bestD && segmentWalkable(p, pos)) {
      bestD = d;
      best = id;
    }
  }
  if (best) return best;
  // Si no hay línea directa, el más cercano.
  for (const [id, pos] of Object.entries(NAV_NODES)) {
    const d = dist(p, pos);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

/** ¿Se puede ir en línea recta de a a b sin atravesar paredes? */
export function segmentWalkable(a, b, step = 8) {
  const n = Math.max(1, Math.ceil(dist(a, b) / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (!isWalkable([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], ASTRO_RADIUS * 0.6)) return false;
  }
  return true;
}

/** Ruta (lista de puntos) desde `from` hasta `to` por los pasillos. */
export function findPath(from, to) {
  if (segmentWalkable(from, to)) return [to];
  const start = nearestNode(from);
  const goal = nearestNode(to);
  const prev = { [start]: null };
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === goal) break;
    for (const nx of ADJ[cur] || []) {
      if (!(nx in prev)) {
        prev[nx] = cur;
        queue.push(nx);
      }
    }
  }
  if (!(goal in prev)) return [to];
  const ids = [];
  for (let cur = goal; cur; cur = prev[cur]) ids.unshift(cur);
  const pts = ids.map((id) => NAV_NODES[id]);
  // Atajos: quita puntos intermedios si hay línea directa.
  const out = [];
  let cursor = from;
  for (let i = 0; i < pts.length; i++) {
    const next = pts[i + 1] ?? to;
    if (!segmentWalkable(cursor, next)) {
      out.push(pts[i]);
      cursor = pts[i];
    }
  }
  if (isWalkable(to)) out.push(to);
  else out.push(pts[pts.length - 1]);
  return out;
}

export const START_POS = [470, 330];
