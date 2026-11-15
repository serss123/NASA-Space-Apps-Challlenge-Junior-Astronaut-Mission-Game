// =====================================================================================
//  Rover · dibujo en <canvas> 2D. Solo primitivas: sin imágenes, sin emojis, sin fuentes externas.
//  Arte original: el Rover (seis ruedas, panel solar, mástil con cámara, antena) es diseño propio.
//
//  Capas (de atrás hacia delante): cielo negro con estrellas → Sol bajo y la Tierra (zonas 1–2)
//  → montañas lejanas (paralaje lento) → colinas cercanas → suelo con cráteres → sombras largas
//  → rocas → bandera de meta → objetos → Rover → partículas → oscuridad con faro (zona 3) → destello.
//
//  Coordenadas: el mundo usa "u" con y hacia arriba (engine.js); la cámara lo pasa a píxeles CSS.
//  El contexto llega ya escalado por devicePixelRatio (lo hace RoverRun.jsx).
// =====================================================================================
import { PHYS, groundAt, hashString, mulberry32, slopeAt } from './engine.js';

/** Encuadre: ancho visible en u, posición del Rover y del horizonte (fracciones del lienzo). */
export const VIEW = Object.freeze({ width: 30, narrowWidth: 24, narrowPx: 560, roverAt: 0.27, horizon: 0.72 });

const WHEEL_R = 0.36;
const MAX_PARTS = 240;
const TAU = Math.PI * 2;

/** Paletas por zona (colores vivos sobre fondo oscuro). */
export const THEMES = Object.freeze({
  1: {
    sky: ['#000105', '#030716', '#0b1434'],
    stars: 150,
    sun: { x: 0.12, y: 0.2, r: 0.024 },
    earth: { x: 0.8, y: 0.24, r: 0.026 },
    far: { parallax: 0.08, base: 0.035, amp: 0.21, freq: 0.085, top: '#767c9a', bottom: '#2a2f47', crest: 'rgba(255, 240, 205, 0.75)', crestW: 1.6 },
    near: { parallax: 0.3, base: -0.02, amp: 0.075, freq: 0.11, top: '#454a62', bottom: '#1d2030' },
    ground: { top: '#d2cbbb', mid: '#8e887c', deep: '#2b2a33', line: '#fff6e2', pebble: '#6f6a61', strata: 'rgba(40, 36, 30, 0.12)' },
    crater: { top: 'rgba(14, 13, 24, 0.92)', bottom: '#050509', rim: 'rgba(255, 246, 226, 0.65)' },
    rock: { lit: '#ece6d8', mid: '#a7a194', dark: '#5c574f', line: '#2a2722', frost: null },
    shadow: 'rgba(6, 7, 16, 0.42)',
    shadowLen: 3.4,
    dust: '206, 199, 184',
    dark: false
  },
  2: {
    sky: ['#000105', '#04081a', '#0e163a'],
    stars: 160,
    sun: { x: 0.07, y: 0.15, r: 0.022 },
    earth: { x: 0.64, y: 0.33, r: 0.028 },
    far: { parallax: 0.07, base: 0.02, amp: 0.13, freq: 0.07, top: '#7a7a92', bottom: '#2c2d45', crest: 'rgba(255, 236, 196, 0.7)', crestW: 1.4 },
    near: { parallax: 0.33, base: 0.0, amp: 0.11, freq: 0.075, top: '#4c4c63', bottom: '#1f1f30' },
    ground: { top: '#cbbfaa', mid: '#877d6e', deep: '#2b2830', line: '#fff1d8', pebble: '#6b6257', strata: 'rgba(48, 38, 28, 0.13)' },
    crater: { top: 'rgba(16, 12, 22, 0.92)', bottom: '#060408', rim: 'rgba(255, 241, 216, 0.65)' },
    rock: { lit: '#e8dccb', mid: '#a59784', dark: '#5f5448', line: '#2c251f', frost: null },
    shadow: 'rgba(8, 6, 16, 0.42)',
    shadowLen: 3.8,
    dust: '204, 192, 172',
    dark: false
  },
  3: {
    sky: ['#000000', '#01020a', '#050916'],
    stars: 190,
    sun: null,
    earth: null,
    // La pared del cráter sube muy alto: solo su borde, allá arriba, recibe la luz del Sol
    far: { parallax: 0.05, base: 0.5, amp: 0.13, freq: 0.05, top: '#1d2540', bottom: '#0a0e1b', crest: 'rgba(255, 210, 130, 0.95)', crestW: 2.6, rimGlow: true },
    near: { parallax: 0.26, base: 0.0, amp: 0.09, freq: 0.1, top: '#0d1222', bottom: '#060810' },
    ground: { top: '#9aa8cf', mid: '#4a5574', deep: '#0e111d', line: '#e4f4ff', pebble: '#2e3550', strata: 'rgba(170, 210, 255, 0.07)' },
    crater: { top: 'rgba(4, 6, 14, 0.94)', bottom: '#010206', rim: 'rgba(214, 240, 255, 0.8)' },
    rock: { lit: '#b9c6e6', mid: '#66718f', dark: '#272d42', line: '#0e111c', frost: '#ecfaff' },
    shadow: null,
    shadowLen: 0,
    dust: '170, 186, 214',
    dark: true,
    darkness: 0.8,
    darkRGB: '1, 3, 10'
  }
});

/** Ancho visible en u según el ancho del lienzo (en móvil se acerca un poco). */
export function viewWidth(cssW) {
  return cssW < VIEW.narrowPx ? VIEW.narrowWidth : VIEW.width;
}

// ---------------------------------------------------------------- ruido determinista para el paisaje

function hash01(i, salt) {
  let h = Math.imul((i | 0) ^ Math.imul(salt | 0, 0x9e3779b1), 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, salt) {
  const i = Math.floor(x);
  const f = x - i;
  const t = f * f * (3 - 2 * f);
  return hash01(i, salt) * (1 - t) + hash01(i + 1, salt) * t;
}
/** Picos afilados (montañas lejanas). */
function ridgeNoise(u, salt) {
  let n = 0;
  let amp = 0.6;
  let fr = 1;
  for (let o = 0; o < 3; o++) {
    n += amp * (1 - Math.abs(2 * vnoise(u * fr, salt + o * 17) - 1));
    amp *= 0.45;
    fr *= 2.3;
  }
  return n / 0.9915;
}
/** Lomas suaves (colinas cercanas). */
const softNoise = (u, salt) => 0.65 * vnoise(u, salt) + 0.35 * vnoise(u * 2.1, salt + 5);

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------- escena (lo que no cambia en la carrera)

/** Datos precalculados para una pista: estrellas, formas de rocas, capa de oscuridad… */
export function createScene(track) {
  const theme = THEMES[track.zone] || THEMES[1];
  const salt = hashString(`${track.seed}|sky|${track.zone}`);
  const rng = mulberry32(salt);
  const tints = ['255,255,255', '210,225,255', '255,240,214', '190,210,255'];
  const stars = Array.from({ length: theme.stars }, () => ({
    x: rng(),
    y: rng() ** 1.25,
    s: 0.7 + rng() * 1.5,
    a: 0.3 + rng() * 0.7,
    tw: 0.6 + rng() * 2.4,
    ph: rng() * TAU,
    c: tints[Math.floor(rng() * tints.length)]
  }));
  const bright = Array.from({ length: 5 }, () => ({ x: rng(), y: 0.08 + rng() * 0.5, s: 1.6 + rng() * 1.2, ph: rng() * TAU }));
  return { track, theme, stars, bright, salt: salt & 0xffff, rocks: new Map(), samples: new Map(), dark: null };
}

/** Polígono irregular de una roca (u, relativo a su centro en el suelo). Cacheado por obstáculo. */
function rockShape(scene, o) {
  let pts = scene.rocks.get(o.id);
  if (pts) return pts;
  const rng = mulberry32(o.shape);
  const n = 9;
  pts = [[-o.w / 2, -0.08]];
  for (let i = 1; i < n; i++) {
    const a = Math.PI * (1 - i / n);
    const rx = (o.w / 2) * (0.88 + rng() * 0.18);
    const ry = o.h * (0.78 + rng() * 0.26);
    pts.push([Math.cos(a) * rx, Math.max(0.05, Math.sin(a) * ry)]);
  }
  pts.push([o.w / 2, -0.08]);
  // La cima visible coincide con la altura de la roca
  const top = Math.max(...pts.map((p) => p[1]));
  pts = pts.map(([x, y]) => [x, y > 0 ? (y / top) * o.h : y]);
  const pits = Array.from({ length: 2 }, () => ({ x: (rng() - 0.5) * o.w * 0.5, y: o.h * (0.3 + rng() * 0.35), r: 0.06 + rng() * 0.07 }));
  const shape = { pts, pits };
  scene.rocks.set(o.id, shape);
  return shape;
}

/** Contorno de una muestra de roca (u, centrado). Cacheado por objeto. */
function sampleShape(scene, it) {
  let s = scene.samples.get(it.id);
  if (s) return s;
  const rng = mulberry32(hashString(`${scene.track.seed}|smp|${it.id}`));
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * TAU;
    const r = 0.36 * (0.82 + rng() * 0.3);
    return [Math.cos(a) * r, Math.sin(a) * r * 0.86];
  });
  const bits = Array.from({ length: 6 }, () => ({ x: (rng() - 0.5) * 0.4, y: (rng() - 0.5) * 0.36, r: 0.05 + rng() * 0.07, a: rng() * TAU, c: Math.floor(rng() * 5) }));
  s = { pts, bits };
  scene.samples.set(it.id, s);
  return s;
}

// ---------------------------------------------------------------- efectos (partículas, cámara, Rover)

/** Estado de los efectos de adorno (no influye en el juego; puede usar Math.random). */
export function createFx() {
  return {
    parts: [],
    time: 0,
    flash: 0,
    shake: 0,
    shakeX: 0,
    shakeY: 0,
    camY: null,
    angle: 0,
    squash: 0,
    squashV: 0,
    wheel: 0,
    lastX: null,
    dustAcc: 0,
    hazard: false,
    goal: false
  };
}

function spawn(fx, p) {
  if (fx.parts.length >= MAX_PARTS) fx.parts.shift();
  fx.parts.push(p);
}

function dustBurst(fx, x, y, n, color, spread = 1) {
  for (let i = 0; i < n; i++) {
    const life = 0.5 + Math.random() * 0.7;
    spawn(fx, {
      kind: 'dust',
      x: x + (Math.random() - 0.5) * 1.2,
      y: y + 0.05,
      vx: (Math.random() - 0.5) * 3 * spread,
      vy: 0.6 + Math.random() * 1.6,
      g: 3.2,
      life,
      max: life,
      size: 0.07 + Math.random() * 0.12,
      color
    });
  }
}

function sparkBurst(fx, x, y, n, color, speed = 3) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Math.random() * 0.4;
    const v = speed * (0.6 + Math.random() * 0.6);
    const life = 0.45 + Math.random() * 0.4;
    spawn(fx, { kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 2, life, max: life, size: 0.08 + Math.random() * 0.08, color });
  }
}

const ITEM_RGB = { ice: '111, 211, 255', metal: '233, 238, 252', samples: '255, 196, 128' };

/** Reacciona a un suceso del motor con partículas, destellos o temblor (menos con movimiento reducido). */
export function fxEvent(fx, ev, sim, track, reduced) {
  const theme = THEMES[track.zone] || THEMES[1];
  const few = (n) => (reduced ? Math.max(1, Math.round(n / 3)) : n);
  switch (ev.type) {
    case 'jump':
      dustBurst(fx, ev.x - 0.6, ev.y, few(6), theme.dust, 0.8);
      break;
    case 'land':
      dustBurst(fx, ev.x, ev.y, few(10), theme.dust, 1.4);
      fx.squashV += reduced ? 1.2 : 3.2;
      break;
    case 'hit': {
      fx.flash = 1;
      fx.shake = reduced ? 0 : 0.3;
      const o = track.obstacles[ev.index];
      const hx = o?.type === 'boulder' ? o.x0 + o.w * 0.3 : ev.x;
      const hy = o?.type === 'boulder' ? (o.base || 0) + o.h * 0.6 : groundAt(track, ev.x);
      for (let i = 0; i < few(10); i++) {
        const life = 0.5 + Math.random() * 0.5;
        spawn(fx, {
          kind: 'chip',
          x: hx,
          y: hy,
          vx: -1.5 + Math.random() * 4,
          vy: 1.5 + Math.random() * 3,
          g: 6,
          life,
          max: life,
          size: 0.08 + Math.random() * 0.1,
          rot: Math.random() * TAU,
          color: theme.rock.mid
        });
      }
      dustBurst(fx, ev.x, groundAt(track, ev.x), few(8), theme.dust, 2);
      break;
    }
    case 'collect': {
      const rgb = ITEM_RGB[ev.kind] || ITEM_RGB.metal;
      sparkBurst(fx, ev.x, ev.y, few(12), rgb);
      spawn(fx, { kind: 'text', text: '+1', x: ev.x, y: ev.y + 0.5, vx: 0, vy: 1.1, g: 0, life: 0.9, max: 0.9, size: 0.62, color: rgb });
      break;
    }
    case 'goal':
      fx.goal = true;
      for (let i = 0; i < few(26); i++) {
        const life = 0.8 + Math.random() * 0.8;
        const c = ['255, 200, 61', '61, 220, 132', '111, 211, 255', '255, 138, 61', '177, 140, 255'][i % 5];
        spawn(fx, {
          kind: 'chip',
          x: track.length + (Math.random() - 0.5) * 2,
          y: groundAt(track, track.length) + 3 + Math.random(),
          vx: (Math.random() - 0.5) * 5,
          vy: 1 + Math.random() * 3.5,
          g: 3,
          life,
          max: life,
          size: 0.09 + Math.random() * 0.08,
          rot: Math.random() * TAU,
          color: c
        });
      }
      break;
    case 'empty':
    case 'abort':
      fx.hazard = true;
      break;
    default:
      break;
  }
}

/**
 * Avanza los efectos un fotograma: postura del Rover (inclinación, amortiguación, ruedas),
 * cámara suave, polvo de las ruedas y partículas. `moving` = el Rover rueda (no en pausa).
 */
export function fxTick(fx, dt, sim, track, { reduced = false, moving = true } = {}) {
  fx.time += dt;
  const theme = THEMES[track.zone] || THEMES[1];
  // Inclinación: sigue la pendiente en el suelo; en el aire, morro arriba al subir y abajo al caer
  const target = sim.grounded ? Math.atan(slopeAt(track, sim.x)) : clamp(sim.vy * 0.03, -0.2, 0.22);
  fx.angle += (target - fx.angle) * Math.min(1, dt * (sim.grounded ? 12 : 5));
  // Amortiguación tipo muelle tras aterrizar
  fx.squashV += (-fx.squash * 140 - fx.squashV * 13) * dt;
  fx.squash = clamp(fx.squash + fx.squashV * dt, -0.4, 1);
  // Ruedas: giran con lo que avanza el Rover
  if (fx.lastX == null) fx.lastX = sim.x;
  fx.wheel -= (sim.x - fx.lastX) / WHEEL_R;
  fx.lastX = sim.x;
  // Cámara: acompaña un poco las lomas (no los saltos)
  const camTarget = groundAt(track, sim.x) * 0.55;
  fx.camY = fx.camY == null ? camTarget : fx.camY + (camTarget - fx.camY) * Math.min(1, dt * 2.5);
  // Temblor y destello se apagan solos
  fx.shake = Math.max(0, fx.shake - dt * 1.5);
  fx.shakeX = !reduced && fx.shake > 0 ? (Math.random() - 0.5) * 2 * fx.shake : 0;
  fx.shakeY = !reduced && fx.shake > 0 ? (Math.random() - 0.5) * 2 * fx.shake : 0;
  fx.flash = Math.max(0, fx.flash - dt * 2.6);
  // Polvo de las ruedas (en la Luna no hay aire: el polvo sube y cae en arco, sin nube)
  if (moving && sim.grounded && sim.status === 'running') {
    fx.dustAcc += dt * (reduced ? 4 : 24);
    while (fx.dustAcc >= 1) {
      fx.dustAcc -= 1;
      const wx = sim.x + (Math.random() < 0.6 ? -1.0 : 0) + (Math.random() - 0.5) * 0.3;
      const life = 0.45 + Math.random() * 0.55;
      spawn(fx, {
        kind: 'dust',
        x: wx,
        y: groundAt(track, wx) + 0.04,
        vx: -0.6 - Math.random() * 1.6,
        vy: 0.7 + Math.random() * 1.7,
        g: 3.6,
        life,
        max: life,
        size: 0.05 + Math.random() * 0.1,
        color: theme.dust
      });
    }
  }
  // Partículas
  const parts = fx.parts;
  let w = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) continue;
    p.vy -= p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.rot != null) p.rot += dt * 8;
    if (p.kind !== 'text' && p.kind !== 'spark') {
      const gy = groundAt(track, p.x);
      if (p.y < gy) {
        p.y = gy;
        p.vy = 0;
        p.vx *= 0.4;
      }
    }
    parts[w++] = p;
  }
  parts.length = w;
}

// ---------------------------------------------------------------- cámara

function makeCam(view, sim, fx, alpha) {
  const vw = viewWidth(view.w);
  const k = view.w / vw;
  const px = lerp(sim.prevX ?? sim.x, sim.x, alpha);
  const py = lerp(sim.prevY ?? sim.y, sim.y, alpha);
  const camX = px - vw * VIEW.roverAt + (fx.shakeX || 0);
  const camY = (fx.camY ?? 0) + (fx.shakeY || 0);
  const hy = view.h * VIEW.horizon;
  return {
    k,
    W: view.w,
    H: view.h,
    hy,
    camX,
    camY,
    px,
    py,
    x0: camX - 3,
    x1: camX + vw + 3,
    sx: (x) => (x - camX) * k,
    sy: (y) => hy - (y - camY) * k
  };
}

// ---------------------------------------------------------------- capas de fondo

function drawSky(ctx, cam, scene, time, reduced) {
  const th = scene.theme;
  const g = ctx.createLinearGradient(0, 0, 0, cam.hy);
  g.addColorStop(0, th.sky[0]);
  g.addColorStop(0.62, th.sky[1]);
  g.addColorStop(1, th.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cam.W, cam.H);
  // Estrellas: "en el infinito", se mueven un pelín para dar profundidad
  const off = cam.camX * cam.k * 0.015;
  const skyH = cam.hy * 0.98;
  for (const st of scene.stars) {
    const x = (((st.x * cam.W - off) % cam.W) + cam.W) % cam.W;
    let a = st.a;
    if (!reduced) a *= 0.62 + 0.38 * Math.sin(time * st.tw + st.ph);
    ctx.fillStyle = `rgba(${st.c}, ${a.toFixed(3)})`;
    ctx.fillRect(x, st.y * skyH, st.s, st.s);
  }
  // Unas pocas estrellas brillantes con destello en cruz
  ctx.strokeStyle = 'rgba(220, 232, 255, 0.55)';
  ctx.lineWidth = 1;
  for (const b of scene.bright) {
    const x = (((b.x * cam.W - off) % cam.W) + cam.W) % cam.W;
    const y = b.y * skyH;
    const s = b.s * (reduced ? 1 : 0.85 + 0.15 * Math.sin(time * 1.3 + b.ph)) * 2.2;
    ctx.fillStyle = '#f4f7ff';
    ctx.beginPath();
    ctx.arc(x, y, b.s * 0.75, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.stroke();
  }
}

function drawSun(ctx, cam, th) {
  const s = th.sun;
  if (!s) return;
  const x = s.x * cam.W;
  const y = cam.hy - s.y * cam.H;
  const r = s.r * cam.W;
  // Sin atmósfera el cielo sigue negro: solo un halo alrededor del disco
  const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 9);
  glow.addColorStop(0, 'rgba(255, 252, 235, 0.55)');
  glow.addColorStop(0.18, 'rgba(255, 226, 160, 0.2)');
  glow.addColorStop(1, 'rgba(255, 200, 120, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 9, y - r * 9, r * 18, r * 18);
  // Destello horizontal (el Sol rasante del polo sur)
  const flare = ctx.createLinearGradient(x - r * 14, 0, x + r * 14, 0);
  flare.addColorStop(0, 'rgba(255, 236, 190, 0)');
  flare.addColorStop(0.5, 'rgba(255, 244, 220, 0.5)');
  flare.addColorStop(1, 'rgba(255, 236, 190, 0)');
  ctx.fillStyle = flare;
  ctx.fillRect(x - r * 14, y - r * 0.09, r * 28, r * 0.18);
  ctx.fillStyle = '#fffdf4';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function drawEarth(ctx, cam, th) {
  const e = th.earth;
  if (!e) return;
  const x = e.x * cam.W;
  const y = cam.hy - e.y * cam.H;
  const r = e.r * cam.W;
  const halo = ctx.createRadialGradient(x, y, r, x, y, r * 2.2);
  halo.addColorStop(0, 'rgba(110, 170, 255, 0.35)');
  halo.addColorStop(1, 'rgba(110, 170, 255, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.2, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  const ocean = ctx.createRadialGradient(x - r * 0.4, y - r * 0.3, r * 0.1, x, y, r);
  ocean.addColorStop(0, '#5fb0ff');
  ocean.addColorStop(1, '#1747a8');
  ctx.fillStyle = ocean;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  // Continentes y nubes (formas simples)
  ctx.fillStyle = '#5cc27a';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25, y - r * 0.1, r * 0.35, r * 0.22, 0.6, 0, TAU);
  ctx.ellipse(x + r * 0.3, y + r * 0.35, r * 0.25, r * 0.16, -0.4, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x - r * 0.1, y + r * 0.1, r * 0.62, 3.6, 4.6);
  ctx.moveTo(x + r * 0.55, y - r * 0.35);
  ctx.arc(x + r * 0.2, y - r * 0.35, r * 0.35, 0, 1.2);
  ctx.stroke();
  // Lado de noche (el Sol está a la izquierda)
  ctx.fillStyle = 'rgba(2, 6, 20, 0.72)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.62, y, r * 0.95, r * 1.1, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawRidge(ctx, cam, layer, salt, ridged) {
  const step = 6;
  const pts = [];
  const u0 = cam.camX * layer.parallax;
  for (let sx = -step; sx <= cam.W + step; sx += step) {
    const u = (u0 + sx / cam.k) * layer.freq;
    const n = ridged ? ridgeNoise(u, salt) : softNoise(u, salt);
    pts.push([sx, cam.hy - (layer.base + layer.amp * n) * cam.H]);
  }
  ctx.beginPath();
  ctx.moveTo(-step, cam.H);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(cam.W + step, cam.H);
  ctx.closePath();
  const top = cam.hy - (layer.base + layer.amp) * cam.H;
  const g = ctx.createLinearGradient(0, top, 0, cam.hy);
  g.addColorStop(0, layer.top);
  g.addColorStop(1, layer.bottom);
  ctx.fillStyle = g;
  ctx.fill();
  if (layer.crest) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (layer.rimGlow) {
      // Zona 3: el borde del cráter allá arriba recibe sol; aquí abajo, sombra eterna
      ctx.save();
      ctx.shadowColor = 'rgba(255, 196, 110, 0.9)';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = layer.crest;
      ctx.lineWidth = layer.crestW;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = layer.crest;
      ctx.lineWidth = layer.crestW;
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------- suelo, cráteres, rocas, sombras

function groundPath(ctx, cam, track, closeBottom) {
  const step = Math.max(3, Math.round(cam.k * 0.16));
  ctx.beginPath();
  if (closeBottom) ctx.moveTo(-step, cam.H + 2);
  let first = true;
  for (let sx = -step; sx <= cam.W + step; sx += step) {
    const y = cam.sy(groundAt(track, cam.camX + sx / cam.k));
    if (first && !closeBottom) ctx.moveTo(sx, y);
    else ctx.lineTo(sx, y);
    first = false;
  }
  if (closeBottom) {
    ctx.lineTo(cam.W + step, cam.H + 2);
    ctx.closePath();
  }
}

function drawGround(ctx, cam, scene) {
  const { track, theme } = scene;
  const gt = theme.ground;
  groundPath(ctx, cam, track, true);
  const top = cam.sy(2);
  const g = ctx.createLinearGradient(0, top, 0, cam.H);
  g.addColorStop(0, gt.top);
  g.addColorStop(0.3, gt.mid);
  g.addColorStop(1, gt.deep);
  ctx.fillStyle = g;
  ctx.fill();
  // Estratos tenues y piedrecitas enterradas (decoración determinista por casillas)
  ctx.strokeStyle = gt.strata;
  ctx.lineWidth = Math.max(1, cam.k * 0.05);
  for (let band = 1; band <= 3; band++) {
    ctx.beginPath();
    for (let sx = -10; sx <= cam.W + 10; sx += 10) {
      const x = cam.camX + sx / cam.k;
      const y = cam.sy(groundAt(track, x) - band * 0.9 - 0.25 * Math.sin(x * 0.35 + band));
      if (sx === -10) ctx.moveTo(sx, y);
      else ctx.lineTo(sx, y);
    }
    ctx.stroke();
  }
  const cell = 0.9;
  ctx.fillStyle = gt.pebble;
  for (let c = Math.floor(cam.x0 / cell); c <= Math.ceil(cam.x1 / cell); c++) {
    const h = hash01(c, scene.salt);
    if (h > 0.55) continue;
    const x = c * cell + hash01(c, scene.salt + 1) * cell;
    const depth = 0.12 + hash01(c, scene.salt + 2) * 1.6;
    const r = (0.05 + hash01(c, scene.salt + 3) * 0.12) * cam.k;
    ctx.beginPath();
    ctx.ellipse(cam.sx(x), cam.sy(groundAt(track, x) - depth), r * 1.3, r, 0, 0, TAU);
    ctx.fill();
  }
  // Borde de la superficie, iluminado por el Sol rasante
  groundPath(ctx, cam, track, false);
  ctx.strokeStyle = gt.line;
  ctx.globalAlpha = theme.dark ? 0.35 : 0.75;
  ctx.lineWidth = Math.max(1.5, cam.k * 0.07);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawCraters(ctx, cam, scene) {
  const { track, theme } = scene;
  for (const o of track.obstacles) {
    if (o.type !== 'crater' || o.x1 < cam.x0 || o.x0 > cam.x1) continue;
    const lip = 0.12;
    const step = 0.12;
    // Hueco oscuro: del perfil del cuenco hasta el borde lejano (como si viéramos un poco desde arriba)
    ctx.beginPath();
    ctx.moveTo(cam.sx(o.x0), cam.sy(lip));
    for (let x = o.x0; x <= o.x1 + 1e-6; x += step) ctx.lineTo(cam.sx(x), cam.sy(groundAt(track, x)));
    ctx.lineTo(cam.sx(o.x1), cam.sy(lip));
    ctx.quadraticCurveTo(cam.sx(o.cx), cam.sy(lip + 0.5), cam.sx(o.x0), cam.sy(lip));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, cam.sy(lip + 0.5), 0, cam.sy(-o.d));
    g.addColorStop(0, theme.crater.top);
    g.addColorStop(1, theme.crater.bottom);
    ctx.fillStyle = g;
    ctx.fill();
    // Borde lejano iluminado (mira hacia el Sol, a la izquierda) y labios del cráter
    ctx.strokeStyle = theme.crater.rim;
    ctx.lineWidth = Math.max(1.2, cam.k * 0.06);
    ctx.beginPath();
    ctx.moveTo(cam.sx(o.cx), cam.sy(lip + 0.25));
    ctx.quadraticCurveTo(cam.sx(o.x1 - o.w * 0.12), cam.sy(lip + 0.22), cam.sx(o.x1), cam.sy(lip));
    ctx.stroke();
    // Pared interior derecha con algo de luz
    ctx.strokeStyle = theme.dark ? 'rgba(180, 220, 255, 0.25)' : 'rgba(255, 238, 205, 0.35)';
    ctx.beginPath();
    for (let x = o.cx + o.w * 0.15; x <= o.x1 - 0.05; x += step) {
      const y = cam.sy(groundAt(track, x) + 0.04);
      if (x === o.cx + o.w * 0.15) ctx.moveTo(cam.sx(x), y);
      else ctx.lineTo(cam.sx(x), y);
    }
    ctx.stroke();
  }
}

function drawShadows(ctx, cam, scene, sim) {
  const { track, theme } = scene;
  if (!theme.shadow) return;
  ctx.fillStyle = theme.shadow;
  // Sombras larguísimas hacia la derecha: el Sol está bajito a la izquierda (polo sur lunar)
  for (const o of track.obstacles) {
    if (o.type !== 'boulder' || o.x1 + theme.shadowLen * o.h < cam.x0 || o.x0 > cam.x1) continue;
    const len = theme.shadowLen * o.h;
    const x0 = cam.sx(o.x1 - o.w * 0.35);
    const x1 = cam.sx(o.x1 + len);
    const y = cam.sy(o.base || 0);
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, theme.shadow);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, y + cam.k * 0.03, (x1 - x0) / 2, cam.k * 0.12, 0, 0, TAU);
    ctx.fill();
  }
  // Sombra del Rover: se aleja y se aclara cuando salta
  const gy = groundAt(track, cam.px);
  const hgt = Math.max(0, cam.py - gy);
  const a = clamp(0.42 - hgt * 0.09, 0.08, 0.42);
  const sx = cam.sx(cam.px + 0.8 + hgt * 1.3);
  const len = (1.9 + hgt * 0.3) * cam.k;
  const g = ctx.createLinearGradient(sx - len, 0, sx + len, 0);
  g.addColorStop(0, `rgba(6, 7, 16, ${a})`);
  g.addColorStop(1, 'rgba(6, 7, 16, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(sx, cam.sy(groundAt(track, cam.px + 0.8 + hgt * 1.3)) + cam.k * 0.03, len, cam.k * 0.13, 0, 0, TAU);
  ctx.fill();
}

function drawBoulders(ctx, cam, scene, sim, hl = null) {
  const { track, theme } = scene;
  const rt = theme.rock;
  for (const o of track.obstacles) {
    if (o.type !== 'boulder' || o.x1 < cam.x0 || o.x0 > cam.x1) continue;
    const { pts, pits } = rockShape(scene, o);
    const bx = cam.sx(o.cx);
    const by = cam.sy(o.base || 0);
    const k = cam.k;
    const outline = () => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(bx + x * k, by - y * k) : ctx.moveTo(bx + x * k, by - y * k)));
      ctx.closePath();
    };
    outline();
    const g = ctx.createLinearGradient(bx - (o.w / 2) * k, by - o.h * k, bx + (o.w / 2) * k, by);
    g.addColorStop(0, rt.lit);
    g.addColorStop(0.45, rt.mid);
    g.addColorStop(1, rt.dark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = rt.line;
    ctx.lineWidth = Math.max(1.5, k * 0.06);
    ctx.lineJoin = 'round';
    ctx.stroke();
    // Cráteres diminutos en la roca
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (const p of pits) {
      ctx.beginPath();
      ctx.arc(bx + p.x * k, by - p.y * k, p.r * k, 0, TAU);
      ctx.fill();
    }
    // Brillo en la cara que mira al Sol
    ctx.strokeStyle = rt.frost || 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = Math.max(1.5, k * (rt.frost ? 0.11 : 0.07));
    ctx.lineCap = 'round';
    ctx.beginPath();
    const n = pts.length;
    for (let i = 1; i < Math.ceil(n / 2); i++) {
      const [x, y] = pts[i];
      const px = bx + x * k * 0.92;
      const py = by - y * k * 0.94 + (rt.frost ? -k * 0.02 : k * 0.03);
      if (i === 1) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Grietas si ya chocaste con ella
    if (sim && sim.hit && sim.hit[o.id] === 1) {
      ctx.strokeStyle = 'rgba(20, 16, 12, 0.75)';
      ctx.lineWidth = Math.max(1, k * 0.045);
      ctx.beginPath();
      ctx.moveTo(bx - k * o.w * 0.05, by - o.h * k * 0.95);
      ctx.lineTo(bx + k * o.w * 0.08, by - o.h * k * 0.6);
      ctx.lineTo(bx - k * o.w * 0.06, by - o.h * k * 0.35);
      ctx.lineTo(bx + k * o.w * 0.1, by - o.h * k * 0.1);
      ctx.stroke();
    }
    // Zona oscura: la roca solo se ve bien cuando le da el faro (su filo de escarcha se intuye siempre)
    if (hl) {
      const light = Math.max(coneLight(bx, by - o.h * k * 0.5, hl), coneLight(bx, by, hl));
      const a = theme.darkness * (1 - clamp(light * 1.8, 0, 1));
      if (a > 0.01) {
        outline();
        ctx.fillStyle = `rgba(${theme.darkRGB}, ${a.toFixed(3)})`;
        ctx.fill();
      }
    }
  }
}

// ---------------------------------------------------------------- objetos recogibles

function itemGlow(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.1);
  g.addColorStop(0, `rgba(${rgb}, ${a})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.1, 0, TAU);
  ctx.fill();
}

/** Cristales de hielo: tres prismas puntiagudos azules. */
function drawIce(ctx, x, y, k) {
  const shards = [
    { dx: 0, rot: 0, s: 1 },
    { dx: -0.2, rot: -0.45, s: 0.7 },
    { dx: 0.22, rot: 0.4, s: 0.75 }
  ];
  for (const sh of [shards[1], shards[2], shards[0]]) {
    ctx.save();
    ctx.translate(x + sh.dx * k, y + 0.18 * k);
    ctx.rotate(sh.rot);
    const s = sh.s * k;
    ctx.beginPath();
    ctx.moveTo(0, -0.62 * s);
    ctx.lineTo(0.17 * s, -0.36 * s);
    ctx.lineTo(0.15 * s, 0.05 * s);
    ctx.lineTo(-0.15 * s, 0.05 * s);
    ctx.lineTo(-0.17 * s, -0.36 * s);
    ctx.closePath();
    const g = ctx.createLinearGradient(-0.17 * s, -0.62 * s, 0.17 * s, 0.05 * s);
    g.addColorStop(0, '#f2fcff');
    g.addColorStop(0.45, '#7fd9ff');
    g.addColorStop(1, '#1c79b8');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = '#0d4877';
    ctx.lineWidth = Math.max(1, k * 0.045);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-0.04 * s, -0.5 * s);
    ctx.lineTo(-0.06 * s, -0.05 * s);
    ctx.stroke();
    ctx.restore();
  }
}

/** Metal: una tuerca hexagonal plateada (forma distinta a las rocas y al hielo). */
function drawMetal(ctx, x, y, k, time) {
  const r = 0.4 * k;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + Math.PI / 6;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, '#cdd5ea');
  g.addColorStop(0.65, '#8d97b2');
  g.addColorStop(1, '#4d5672');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#2f3550';
  ctx.lineWidth = Math.max(1.2, k * 0.05);
  ctx.stroke();
  ctx.fillStyle = '#353c57';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.38, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = Math.max(1, k * 0.035);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.38, Math.PI * 0.9, Math.PI * 1.6);
  ctx.stroke();
  // Destello
  const tw = 0.6 + 0.4 * Math.sin(time * 4 + x * 0.01);
  ctx.strokeStyle = `rgba(255, 255, 255, ${tw})`;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.75, y - r * 0.55);
  ctx.lineTo(x - r * 0.35, y - r * 0.55);
  ctx.moveTo(x - r * 0.55, y - r * 0.75);
  ctx.lineTo(x - r * 0.55, y - r * 0.35);
  ctx.stroke();
}

const BRECCIA = ['#c4573d', '#f3eee6', '#3a332e', '#dba64e', '#8a95a3'];

/** Muestra de roca de la zona: anortosita clara (1), brecha de colores (2) o regolito helado (3). */
function drawSample(ctx, x, y, k, zone, shape) {
  ctx.beginPath();
  shape.pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * k, y + py * k) : ctx.moveTo(x + px * k, y + py * k)));
  ctx.closePath();
  const r = 0.4 * k;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r * 1.1);
  if (zone === 1) {
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.55, '#d8d4cb');
    g.addColorStop(1, '#9e9a90');
  } else if (zone === 2) {
    g.addColorStop(0, '#a49a8e');
    g.addColorStop(1, '#5a5048');
  } else {
    g.addColorStop(0, '#76809e');
    g.addColorStop(1, '#2b3146');
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = zone === 3 ? '#151a29' : '#3a352e';
  ctx.lineWidth = Math.max(1.2, k * 0.05);
  ctx.stroke();
  ctx.save();
  ctx.clip();
  if (zone === 1) {
    ctx.fillStyle = '#77736c';
    for (const b of shape.bits) {
      ctx.beginPath();
      ctx.arc(x + b.x * k, y + b.y * k, b.r * k * 0.45, 0, TAU);
      ctx.fill();
    }
  } else if (zone === 2) {
    for (const b of shape.bits) {
      ctx.fillStyle = BRECCIA[b.c];
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = b.a + (i / 3) * TAU;
        const px = x + (b.x + Math.cos(a) * b.r * 1.3) * k;
        const py = y + (b.y + Math.sin(a) * b.r * 1.3) * k;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Escarcha encima del regolito
    ctx.fillStyle = 'rgba(236, 250, 255, 0.92)';
    ctx.beginPath();
    ctx.ellipse(x - 0.03 * k, y - 0.27 * k, 0.36 * k, 0.17 * k, -0.15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#9fe6ff';
    for (const b of shape.bits.slice(0, 3)) ctx.fillRect(x + b.x * k, y + b.y * k + 0.05 * k, 0.05 * k, 0.05 * k);
  }
  ctx.restore();
  // Brillo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.ellipse(x - 0.14 * k, y - 0.14 * k, 0.07 * k, 0.045 * k, -0.6, 0, TAU);
  ctx.fill();
}

const SAMPLE_GLOW = { 1: '244, 240, 230', 2: '255, 176, 110', 3: '170, 230, 255' };

function drawItems(ctx, cam, scene, sim, time, reduced, dimOutside) {
  const { track } = scene;
  for (const it of track.items) {
    if (it.x < cam.x0 || it.x > cam.x1) continue;
    if (sim && sim.taken && sim.taken[it.id]) continue;
    const bob = reduced ? 0 : Math.sin(time * 2.6 + it.x * 0.7) * 0.1;
    const x = cam.sx(it.x);
    const y = cam.sy(it.y + bob);
    const k = cam.k;
    const pulse = reduced ? 0.4 : 0.32 + 0.14 * Math.sin(time * 3 + it.x);
    const rgb = it.kind === 'samples' ? SAMPLE_GLOW[track.zone] : ITEM_RGB[it.kind];
    if (dimOutside) ctx.globalAlpha = dimOutside(x, y);
    itemGlow(ctx, x, y, 0.5 * k, rgb, pulse);
    if (it.kind === 'ice') drawIce(ctx, x, y, k);
    else if (it.kind === 'metal') drawMetal(ctx, x, y, k, reduced ? 0 : time);
    else drawSample(ctx, x, y, k, track.zone, sampleShape(scene, it));
    ctx.globalAlpha = 1;
  }
}

function drawGoal(ctx, cam, track, time, reduced) {
  const gx = track.length;
  if (gx < cam.x0 - 4 || gx > cam.x1 + 4) return;
  const k = cam.k;
  const base = groundAt(track, gx);
  const x = cam.sx(gx);
  const y0 = cam.sy(base);
  const y1 = cam.sy(base + 3.3);
  // Línea de meta en el suelo
  ctx.fillStyle = 'rgba(255, 200, 61, 0.85)';
  for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * 0.5 * k - 0.15 * k, y0 - 0.04 * k, 0.3 * k, 0.1 * k);
  // Mástil
  ctx.fillStyle = '#dfe6f8';
  ctx.strokeStyle = '#1d2340';
  ctx.lineWidth = Math.max(1, k * 0.04);
  ctx.fillRect(x - 0.05 * k, y1, 0.1 * k, y0 - y1);
  ctx.strokeRect(x - 0.05 * k, y1, 0.1 * k, y0 - y1);
  // Banderín a cuadros que ondea
  const cols = 5;
  const rows = 3;
  const fw = 1.5 * k;
  const fh = 0.95 * k;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const wave = reduced ? 0 : Math.sin(time * 4 - c * 0.9) * 0.07 * k * (c / cols);
      ctx.fillStyle = (c + r) % 2 ? '#1b2140' : '#f6f8ff';
      ctx.fillRect(x + 0.05 * k + (c * fw) / cols, y1 + 0.05 * k + (r * fh) / rows + wave, fw / cols + 0.5, fh / rows + 0.5);
    }
  }
  ctx.strokeStyle = '#1d2340';
  ctx.strokeRect(x + 0.05 * k, y1 + 0.05 * k, fw, fh);
  // Baliza
  const on = reduced || Math.sin(time * 5) > -0.2;
  ctx.fillStyle = on ? '#ffc83d' : '#8a6a1c';
  ctx.beginPath();
  ctx.arc(x, y1 - 0.12 * k, 0.16 * k, 0, TAU);
  ctx.fill();
  if (on) itemGlow(ctx, x, y1 - 0.12 * k, 0.3 * k, '255, 200, 61', 0.5);
}

// ---------------------------------------------------------------- el Rover (diseño original)

function wheel(ctx, cx, cy, ang, far) {
  const R = WHEEL_R;
  ctx.fillStyle = far ? '#151827' : '#262b41';
  ctx.strokeStyle = '#090b14';
  ctx.lineWidth = 0.05;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // Tacos de la rueda (se ve cómo gira)
  ctx.fillStyle = far ? '#2a2f45' : '#454c6c';
  for (let i = 0; i < 10; i++) {
    const a = ang + (i / 10) * TAU;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86, 0.045, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = far ? '#545c7c' : '#93a0c4';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.58, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = far ? '#9aa3c0' : '#eef2ff';
  ctx.lineWidth = 0.055;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = ang + (i / 3) * TAU;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * R * 0.52, cy + Math.sin(a) * R * 0.52);
  }
  ctx.stroke();
  ctx.fillStyle = far ? '#b5612b' : '#ff8a3d';
  ctx.beginPath();
  ctx.arc(cx, cy, 0.085, 0, TAU);
  ctx.fill();
}

function struts(ctx, off, drop, far) {
  // Suspensión articulada (balancín + bogie, estilizada)
  const hubs = [-1.02, 0, 1.02].map((x) => [x + off, WHEEL_R]);
  const pivL = [-0.5 + off, 0.82 - drop];
  const pivR = [0.62 + off, 0.82 - drop];
  ctx.strokeStyle = far ? '#363c56' : '#5f6888';
  ctx.lineWidth = 0.1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(...hubs[0]);
  ctx.lineTo(...pivL);
  ctx.lineTo(...hubs[1]);
  ctx.moveTo(...pivL);
  ctx.lineTo(pivR[0], pivR[1] + 0.02);
  ctx.lineTo(...hubs[2]);
  ctx.stroke();
  ctx.fillStyle = far ? '#2b3047' : '#8a93b8';
  for (const p of [pivL, pivR]) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], 0.07, 0, TAU);
    ctx.fill();
  }
}

/**
 * Dibuja el Rover. (x, y) = punto medio entre las ruedas a ras de suelo, en píxeles; k = px por u.
 * opts: { angle (rad, + = morro arriba), wheel (rad), squash, ghost (invulnerable), hazard, lights, time, reduced }
 */
export function drawRover(ctx, x, y, k, opts = {}) {
  const { angle = 0, wheel: wa = 0, squash = 0, ghost = false, hazard = false, lights = false, time = 0, reduced = false } = opts;
  const drop = clamp(squash, -0.4, 1) * (reduced ? 0.05 : 0.12);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-angle);
  ctx.scale(k, -k); // ahora dibujamos en u con y hacia arriba
  if (ghost) ctx.globalAlpha = reduced ? 0.6 : Math.floor(time * 12) % 2 ? 0.35 : 0.85;

  // Lado lejano (más oscuro, un poco desplazado): ruedas y suspensión
  const far = 0.13;
  ctx.save();
  ctx.translate(far, 0.06);
  struts(ctx, 0, drop, true);
  for (const wx of [-1.02, 0, 1.02]) wheel(ctx, wx, WHEEL_R, wa, true);
  ctx.restore();

  ctx.save();
  ctx.translate(0, -drop);
  // Antena (detrás del panel)
  ctx.strokeStyle = '#c9d2e8';
  ctx.lineWidth = 0.045;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-1.02, 1.3);
  ctx.quadraticCurveTo(-1.1, 1.8, -1.22, 2.24);
  ctx.stroke();
  const led = reduced || Math.sin(time * 6) > 0;
  ctx.fillStyle = led ? '#ff4d5e' : '#7a2430';
  ctx.beginPath();
  ctx.arc(-1.22, 2.26, 0.075, 0, TAU);
  ctx.fill();
  // Platillo pequeño de la antena
  ctx.fillStyle = '#e9eefc';
  ctx.strokeStyle = '#1d2340';
  ctx.lineWidth = 0.035;
  ctx.beginPath();
  ctx.ellipse(-1.06, 1.52, 0.16, 0.06, 0.5, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // Mástil con la cabeza de cámara (los "ojos" del Rover)
  ctx.fillStyle = '#9aa4c4';
  ctx.strokeStyle = '#1d2340';
  ctx.lineWidth = 0.04;
  ctx.fillRect(0.8, 1.28, 0.1, 0.8);
  ctx.strokeRect(0.8, 1.28, 0.1, 0.8);
  roundRect(ctx, 0.58, 2.02, 0.66, 0.34, 0.1);
  const head = ctx.createLinearGradient(0, 2.36, 0, 2.02);
  head.addColorStop(0, '#ffffff');
  head.addColorStop(1, '#c6cee6');
  ctx.fillStyle = head;
  ctx.fill();
  ctx.lineWidth = 0.05;
  ctx.stroke();
  ctx.fillStyle = '#ff8a3d';
  ctx.fillRect(0.64, 2.3, 0.54, 0.05);
  ctx.fillStyle = '#0b1638';
  ctx.beginPath();
  ctx.arc(1.08, 2.18, 0.105, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#5aa9ff';
  ctx.lineWidth = 0.035;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0.82, 2.18, 0.06, 0, TAU);
  ctx.fillStyle = '#0b1638';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(1.11, 2.21, 0.03, 0, TAU);
  ctx.fill();

  // Panel solar inclinado hacia el Sol bajo
  ctx.save();
  ctx.translate(-0.35, 1.36);
  ctx.rotate(0.06);
  ctx.fillStyle = '#8a93b8';
  ctx.fillRect(-0.05, -0.08, 0.1, 0.1);
  ctx.fillStyle = '#1b388a';
  ctx.strokeStyle = '#0d1a45';
  ctx.lineWidth = 0.04;
  ctx.fillRect(-0.98, 0, 1.96, 0.12);
  ctx.strokeRect(-0.98, 0, 1.96, 0.12);
  ctx.strokeStyle = '#5a9bff';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  for (let i = 1; i < 7; i++) {
    ctx.moveTo(-0.98 + (i * 1.96) / 7, 0.01);
    ctx.lineTo(-0.98 + (i * 1.96) / 7, 0.11);
  }
  ctx.moveTo(-0.97, 0.06);
  ctx.lineTo(0.97, 0.06);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(-0.9, 0.085, 0.7, 0.025);
  ctx.restore();

  // Chasis: carrocería blanca redondeada con franja naranja y morro inclinado
  ctx.beginPath();
  ctx.moveTo(-1.3, 0.78);
  ctx.lineTo(1.12, 0.78);
  ctx.quadraticCurveTo(1.43, 0.8, 1.43, 1.0);
  ctx.lineTo(1.31, 1.22);
  ctx.quadraticCurveTo(1.26, 1.31, 1.1, 1.31);
  ctx.lineTo(-1.16, 1.31);
  ctx.quadraticCurveTo(-1.37, 1.31, -1.37, 1.1);
  ctx.lineTo(-1.37, 0.86);
  ctx.quadraticCurveTo(-1.37, 0.78, -1.3, 0.78);
  ctx.closePath();
  const body = ctx.createLinearGradient(0, 1.31, 0, 0.78);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(1, '#c3cbe3');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ff8a3d';
  ctx.fillRect(-1.4, 0.84, 2.9, 0.13);
  ctx.fillStyle = '#c95f1f';
  ctx.fillRect(-1.4, 0.84, 2.9, 0.025);
  ctx.restore();
  ctx.strokeStyle = '#1d2340';
  ctx.lineWidth = 0.06;
  ctx.stroke();
  // Ventanilla de instrumentos con reflejo
  roundRect(ctx, 0.1, 1.03, 0.98, 0.19, 0.06);
  ctx.fillStyle = '#13204a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 180, 255, 0.8)';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(0.2, 1.17);
  ctx.lineTo(0.55, 1.17);
  ctx.stroke();
  // Juntas de la carrocería y luz de estado
  ctx.strokeStyle = 'rgba(29, 35, 64, 0.35)';
  ctx.lineWidth = 0.025;
  ctx.beginPath();
  ctx.moveTo(-0.45, 1.0);
  ctx.lineTo(-0.45, 1.29);
  ctx.moveTo(-0.95, 1.0);
  ctx.lineTo(-0.95, 1.29);
  ctx.stroke();
  ctx.fillStyle = reduced || Math.sin(time * 3) > -0.5 ? '#3ddc84' : '#1f6b44';
  ctx.beginPath();
  ctx.arc(-1.18, 1.1, 0.05, 0, TAU);
  ctx.fill();
  // Faros
  ctx.fillStyle = lights ? '#fff6c8' : '#ffe08a';
  ctx.beginPath();
  ctx.arc(1.37, 1.02, 0.075, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#1d2340';
  ctx.lineWidth = 0.03;
  ctx.stroke();
  // Luces de emergencia (ámbar) cuando la batería se agota
  if (hazard) {
    const on = reduced || Math.floor(time * 3) % 2 === 0;
    ctx.fillStyle = on ? '#ffb020' : '#7a5410';
    for (const hx of [-0.75, 0.35]) {
      ctx.beginPath();
      ctx.arc(hx, 1.34, 0.09, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  // Lado cercano: suspensión y ruedas delante de la carrocería
  struts(ctx, 0, drop, false);
  for (const wx of [-1.02, 0, 1.02]) wheel(ctx, wx, WHEEL_R, wa, false);
  ctx.restore();

  // Halo de los faros (fuera de la escala para que el brillo sea suave)
  if (lights) {
    const hx = x + Math.cos(-angle) * 1.37 * k - Math.sin(-angle) * 1.02 * -k;
    const hy = y + Math.sin(-angle) * 1.37 * k + Math.cos(-angle) * 1.02 * -k;
    itemGlow(ctx, hx, hy, 0.18 * k, '255, 246, 200', 0.9);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ---------------------------------------------------------------- partículas

function drawParticles(ctx, cam, fx) {
  for (const p of fx.parts) {
    if (p.x < cam.x0 || p.x > cam.x1) continue;
    const a = clamp(p.life / p.max, 0, 1);
    const x = cam.sx(p.x);
    const y = cam.sy(p.y);
    const s = p.size * cam.k;
    if (p.kind === 'dust') {
      ctx.fillStyle = `rgba(${p.color}, ${(a * 0.75).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, TAU);
      ctx.fill();
    } else if (p.kind === 'spark') {
      ctx.fillStyle = `rgba(${p.color}, ${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.6);
      ctx.lineTo(x + s * 0.6, y);
      ctx.lineTo(x, y + s * 1.6);
      ctx.lineTo(x - s * 0.6, y);
      ctx.closePath();
      ctx.fill();
    } else if (p.kind === 'chip') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rot || 0);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color.includes(',') ? `rgb(${p.color})` : p.color;
      ctx.fillRect(-s, -s * 0.7, s * 2, s * 1.4);
      ctx.restore();
    } else if (p.kind === 'text') {
      ctx.font = `700 ${Math.round(s)}px Fredoka, Nunito, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2, s * 0.16);
      ctx.strokeStyle = `rgba(5, 8, 22, ${(a * 0.9).toFixed(3)})`;
      ctx.strokeText(p.text, x, y);
      ctx.fillStyle = `rgba(${p.color}, ${a.toFixed(3)})`;
      ctx.fillText(p.text, x, y);
    }
  }
}

// ---------------------------------------------------------------- oscuridad del cráter (zona 3)

function darkLayer(scene, W, H, dpr) {
  const pw = Math.max(1, Math.round(W * dpr));
  const ph = Math.max(1, Math.round(H * dpr));
  let d = scene.dark;
  if (!d || d.canvas.width !== pw || d.canvas.height !== ph) {
    const canvas = d?.canvas || (typeof document !== 'undefined' ? document.createElement('canvas') : null);
    if (!canvas) return null;
    canvas.width = pw;
    canvas.height = ph;
    d = { canvas, ctx: canvas.getContext('2d') };
    scene.dark = d;
  }
  d.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return d;
}

/** Intensidad del faro (0..1) en un punto de la pantalla. */
function coneLight(px, py, hl) {
  const dx = px - hl.x;
  const dy = py - hl.y;
  const dist = Math.hypot(dx, dy);
  if (dist > hl.len) return 0;
  let da = Math.atan2(dy, dx) - hl.dir;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  const ang = 1 - clamp(Math.abs(da) / hl.spread, 0, 1);
  return clamp(ang * 1.6, 0, 1) * (1 - dist / hl.len);
}

function headlight(cam, fx) {
  const a = fx.angle;
  const lx = 1.37;
  const ly = 1.02 - clamp(fx.squash, -0.4, 1) * 0.12;
  const x = cam.sx(cam.px) + (Math.cos(a) * lx - Math.sin(a) * ly) * cam.k;
  const y = cam.sy(cam.py) - (Math.sin(a) * lx + Math.cos(a) * ly) * cam.k;
  return { x, y, dir: -a + 0.16, spread: 0.36, len: 17 * cam.k };
}

const DARK_BAND = 0.8; // u sobre el suelo que oscurece la capa (suelo y bocas de los cráteres)

/** Camino que cubre el suelo y una franja por encima (la zona que ilumina el faro). */
function bandPath(c, cam, track, lift) {
  const step = Math.max(4, Math.round(cam.k * 0.3));
  c.beginPath();
  c.moveTo(-step, cam.H + 2);
  for (let sx = -step; sx <= cam.W + step; sx += step) c.lineTo(sx, cam.sy(groundAt(track, cam.camX + sx / cam.k) + lift));
  c.lineTo(cam.W + step, cam.H + 2);
  c.closePath();
}

function drawDarkness(ctx, cam, scene, hl, dpr) {
  const th = scene.theme;
  const layer = darkLayer(scene, cam.W, cam.H, dpr);
  if (layer) {
    const d = layer.ctx;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, cam.W, cam.H);
    // Oscuridad solo en el suelo y justo encima: en el vacío el haz no se ve en el aire,
    // solo lo que toca (la pared lejana y el cielo con estrellas quedan como están)
    bandPath(d, cam, scene.track, DARK_BAND);
    const g = d.createLinearGradient(0, cam.sy(DARK_BAND), 0, cam.sy(0.2));
    g.addColorStop(0, `rgba(${th.darkRGB}, 0)`);
    g.addColorStop(1, `rgba(${th.darkRGB}, ${th.darkness})`);
    d.fillStyle = g;
    d.fill();
    // El faro "recorta" la oscuridad
    d.globalCompositeOperation = 'destination-out';
    const rg = d.createRadialGradient(hl.x, hl.y, 0.2 * cam.k, hl.x, hl.y, hl.len);
    rg.addColorStop(0, 'rgba(0, 0, 0, 1)');
    rg.addColorStop(0.6, 'rgba(0, 0, 0, 0.88)');
    rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    d.fillStyle = rg;
    d.beginPath();
    d.moveTo(hl.x, hl.y);
    d.arc(hl.x, hl.y, hl.len, hl.dir - hl.spread, hl.dir + hl.spread);
    d.closePath();
    d.fill();
    // Un poco de luz alrededor del Rover y de la baliza de meta
    const glow = (x, y, r, a) => {
      const gg = d.createRadialGradient(x, y, 0, x, y, r);
      gg.addColorStop(0, `rgba(0, 0, 0, ${a})`);
      gg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      d.fillStyle = gg;
      d.beginPath();
      d.arc(x, y, r, 0, TAU);
      d.fill();
    };
    glow(cam.sx(cam.px), cam.sy(cam.py + 1), 3.4 * cam.k, 0.75);
    const gx = scene.track.length;
    if (gx > cam.x0 - 6 && gx < cam.x1 + 6) glow(cam.sx(gx), cam.sy(groundAt(scene.track, gx) + 2.5), 4 * cam.k, 0.8);
    ctx.drawImage(layer.canvas, 0, 0, cam.W, cam.H);
  }
  // Luz cálida del faro (suma de luz) solo sobre el suelo y lo que hay encima
  ctx.save();
  bandPath(ctx, cam, scene.track, 0.3);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const warm = ctx.createRadialGradient(hl.x, hl.y, 0, hl.x, hl.y, hl.len);
  warm.addColorStop(0, 'rgba(255, 236, 170, 0.2)');
  warm.addColorStop(1, 'rgba(255, 236, 170, 0)');
  ctx.fillStyle = warm;
  ctx.beginPath();
  ctx.moveTo(hl.x, hl.y);
  ctx.arc(hl.x, hl.y, hl.len, hl.dir - hl.spread, hl.dir + hl.spread);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return hl;
}

/** Escarcha que brilla cuando la toca el faro (y apenas fuera de él). */
function drawFrost(ctx, cam, scene, hl, time, reduced) {
  const { track } = scene;
  const cell = 0.55;
  for (let c = Math.floor(cam.x0 / cell); c <= Math.ceil(cam.x1 / cell); c++) {
    if (hash01(c, scene.salt + 9) > 0.42) continue;
    const x = c * cell + hash01(c, scene.salt + 10) * cell;
    const lift = hash01(c, scene.salt + 11) * 0.12;
    const sx = cam.sx(x);
    const sy = cam.sy(groundAt(track, x) + lift);
    const light = coneLight(sx, sy, hl);
    const tw = reduced ? 0.8 : 0.5 + 0.5 * Math.sin(time * (3 + hash01(c, 3) * 4) + c);
    const a = clamp(0.1 + light * 1.1 * tw, 0, 1);
    const s = (0.05 + light * 0.1) * cam.k;
    ctx.strokeStyle = `rgba(226, 248, 255, ${a.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, cam.k * 0.03);
    ctx.beginPath();
    ctx.moveTo(sx - s, sy);
    ctx.lineTo(sx + s, sy);
    ctx.moveTo(sx, sy - s);
    ctx.lineTo(sx, sy + s);
    ctx.stroke();
  }
  // Las rocas y los bordes de cráter tienen un filo de escarcha que se intuye en la oscuridad
  ctx.strokeStyle = 'rgba(200, 236, 255, 0.4)';
  ctx.lineWidth = Math.max(1, cam.k * 0.05);
  for (const o of track.obstacles) {
    if (o.x1 < cam.x0 || o.x0 > cam.x1) continue;
    ctx.beginPath();
    if (o.type === 'boulder') {
      const { pts } = rockShape(scene, o);
      const bx = cam.sx(o.cx);
      const by = cam.sy(o.base || 0);
      pts.slice(1, -1).forEach(([px, py], i) => (i ? ctx.lineTo(bx + px * cam.k, by - py * cam.k) : ctx.moveTo(bx + px * cam.k, by - py * cam.k)));
    } else {
      ctx.moveTo(cam.sx(o.x0 - 0.3), cam.sy(0.15));
      ctx.quadraticCurveTo(cam.sx(o.cx), cam.sy(0.7), cam.sx(o.x1 + 0.3), cam.sy(0.15));
    }
    ctx.stroke();
  }
}

// ---------------------------------------------------------------- fotograma completo

/**
 * Pinta un fotograma.
 *  ctx: contexto 2D ya escalado por devicePixelRatio · view: { w, h, dpr } en píxeles CSS
 *  scene: createScene(track) · sim: estado del motor · fx: createFx()
 *  opts: { alpha (interpolación entre pasos 0..1), reduced, hazard }
 */
export function drawScene(ctx, view, scene, sim, fx, opts = {}) {
  const { alpha = 1, reduced = false } = opts;
  if (!view.w || !view.h) return;
  const cam = makeCam(view, sim, fx, alpha);
  const th = scene.theme;
  const time = fx.time;
  ctx.save();
  drawSky(ctx, cam, scene, time, reduced);
  drawSun(ctx, cam, th);
  drawEarth(ctx, cam, th);
  drawRidge(ctx, cam, th.far, scene.salt + 101, true);
  drawRidge(ctx, cam, th.near, scene.salt + 202, false);
  drawGround(ctx, cam, scene);
  drawCraters(ctx, cam, scene);
  drawShadows(ctx, cam, scene, sim);
  // Zona oscura: el faro decide qué se ve (suelo, rocas y objetos)
  const hl = th.dark ? headlight(cam, fx) : null;
  drawBoulders(ctx, cam, scene, sim, hl);
  if (hl) {
    drawDarkness(ctx, cam, scene, hl, view.dpr || 1);
    drawFrost(ctx, cam, scene, hl, time, reduced);
  }
  drawGoal(ctx, cam, scene.track, time, reduced);
  const dim = hl ? (x, y) => clamp(0.62 + coneLight(x, y, hl) * 0.8, 0, 1) : null;
  drawItems(ctx, cam, scene, sim, time, reduced, dim);
  drawRover(ctx, cam.sx(cam.px), cam.sy(cam.py), cam.k, {
    angle: fx.angle,
    wheel: fx.wheel,
    squash: fx.squash,
    ghost: sim.invuln > 0 && sim.status === 'running',
    hazard: fx.hazard || opts.hazard,
    lights: th.dark,
    time,
    reduced
  });
  drawParticles(ctx, cam, fx);

  // Destello rojo al chocar (más suave con movimiento reducido)
  if (fx.flash > 0) {
    const a = fx.flash * (reduced ? 0.22 : 0.4);
    const g = ctx.createRadialGradient(cam.W / 2, cam.H / 2, Math.min(cam.W, cam.H) * 0.25, cam.W / 2, cam.H / 2, Math.max(cam.W, cam.H) * 0.75);
    g.addColorStop(0, 'rgba(255, 77, 94, 0)');
    g.addColorStop(1, `rgba(255, 77, 94, ${a.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cam.W, cam.H);
  }
  // Viñeta ámbar en modo emergencia
  if (fx.hazard || opts.hazard) {
    const pulse = reduced ? 0.25 : 0.18 + 0.12 * Math.sin(time * 6);
    const g = ctx.createRadialGradient(cam.W / 2, cam.H / 2, Math.min(cam.W, cam.H) * 0.3, cam.W / 2, cam.H / 2, Math.max(cam.W, cam.H) * 0.8);
    g.addColorStop(0, 'rgba(255, 176, 32, 0)');
    g.addColorStop(1, `rgba(255, 176, 32, ${pulse.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cam.W, cam.H);
  }
  ctx.restore();
}

/** Ajusta el tamaño interno de un lienzo a su tamaño en pantalla × devicePixelRatio. Devuelve view. */
export function fitCanvas(canvas, maxDpr = 2.5) {
  const w = canvas.clientWidth || 0;
  const h = canvas.clientHeight || 0;
  const dpr = Math.min(maxDpr, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const pw = Math.max(1, Math.round(w * dpr));
  const ph = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  return { w, h, dpr };
}

/** Pinta un fotograma quieto en un lienzo cualquiera (vista previa de la intro y del final). */
export function drawStill(canvas, scene, sim, opts = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const view = fitCanvas(canvas);
  if (!view.w || !view.h) return;
  const fx = createFx();
  fx.time = opts.time ?? 1.2;
  fx.camY = groundAt(scene.track, sim.x) * 0.55;
  fx.angle = Math.atan(slopeAt(scene.track, sim.x));
  fx.hazard = !!opts.hazard;
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  drawScene(ctx, view, scene, sim, fx, { alpha: 1, reduced: true, hazard: opts.hazard });
}

// Exportado para pruebas manuales y para quien quiera el tamaño del Rover
export const ROVER_SIZE = Object.freeze({ length: 2.8, height: 2.36, wheel: WHEEL_R, hitHalfW: PHYS.hitHalfW });
