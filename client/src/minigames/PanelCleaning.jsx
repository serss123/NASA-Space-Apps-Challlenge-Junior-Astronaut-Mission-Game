// Minijuego "Paneles sucios de regolito" (avería `panels`: con polvo, la base recibe 1 ⚡ menos cada amanecer).
// Tres paneles solares cubiertos de manchas de polvo lunar; cada mancha tiene 3 capas.
// Se limpia de tres formas (ninguna obliga a arrastrar):
//   · frotando: puntero pulsado y moviéndose por encima de las manchas (pincel que sigue al dedo/ratón);
//   · tocando una mancha: cada toque quita 1 capa;
//   · con el teclado: Tab hasta una mancha y Enter/Espacio quita 1 capa (las flechas saltan entre manchas).
// Sin fallo ni prisa: al quitar la última capa → celebración corta → onSuccess() una sola vez.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio/sfx.js';
import { useI18n } from '../i18n.jsx';
import RichText from '../ui/components/RichText.jsx';
import { mulberry32, randFloat, randInt, rngFor } from './seededRandom.js';
import './minigames.css';

export const PANEL_COUNT = 3;
export const BLOBS_PER_PANEL = 3;
export const LAYERS_PER_BLOB = 3;
export const BASE_POWER = 40; // % de producción con todo el polvo encima (sube hasta 100 %)
const RUB_PX_PER_LAYER = 36; // px frotados sobre una mancha para quitarle una capa
const TAP_SLOP_PX = 10; // si el puntero se mueve menos que esto, es un toque
const CLICK_GUARD_MS = 700; // el "click" que llega tras un toque ya se trató en pointerup
const CELEBRATE_MS = 650; // celebración antes de avisar con onSuccess()
const MAX_PUFFS = 14; // nubecitas de polvo a la vez (para no llenar el DOM al frotar deprisa)

const TXT = {
  instr: {
    es: 'Frota el polvo (o toca cada mancha) hasta que los 3 paneles brillen.',
    en: 'Rub off the dust (or tap each spot) until all 3 panels shine.'
  },
  kbd: { es: 'Teclado: Tab + Enter', en: 'Keyboard: Tab + Enter' },
  fact: {
    es: 'El [[regolith]] se pega por [[static-electricity]] y raspa como lija: en el Apolo ensuciaba trajes y aparatos.',
    en: '[[regolith]] sticks because of [[static-electricity]] and scratches like sandpaper: on Apollo it dirtied suits and tools.'
  },
  field: { es: 'Paneles solares con polvo', en: 'Dusty solar panels' },
  panel: { es: 'Panel', en: 'Panel' },
  clean: { es: 'Limpio', en: 'Clean' },
  power: { es: 'Producción', en: 'Power' },
  cleanLabel: { es: 'Paneles limpios', en: 'Panels clean' },
  powerLabel: { es: 'Producción de energía', en: 'Power production' },
  done: { es: '¡Brillan otra vez!', en: 'Shiny again!' },
  allClean: {
    es: '¡Los 3 paneles están limpios! La base recibe toda su energía.',
    en: 'All 3 panels are clean! The base gets all its power.'
  },
  notNow: { es: 'Ahora no', en: 'Not now' }
};

/** "40 %" en español (con espacio fijo), "40%" en inglés. */
export const fmtPct = (n, lang) => (lang === 'es' ? `${n} %` : `${n}%`);

const round1 = (v) => Math.round(v * 10) / 10;

/**
 * Contorno cerrado y suave (Catmull-Rom → Bézier) que pasa por puntos repartidos en círculo a
 * distancias `radii` (fracción de 46 unidades) dentro de una caja SVG de -50 a 50. Puro.
 */
export function blobPath(radii) {
  const n = radii.length;
  const pts = radii.map((r, i) => {
    const a = (i / n) * Math.PI * 2;
    return [Math.cos(a) * r * 46, Math.sin(a) * r * 46];
  });
  const f = (v) => v.toFixed(1);
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    d += ` C ${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)}, ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)}, ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} Z`;
}

/**
 * Tablero determinista a partir de la semilla (misma semilla → mismas manchas).
 * Cada panel tiene 3 manchas en zigzag. Se guardan dos juegos de posiciones (en % del panel):
 *   wide   → paneles apaisados (pantallas anchas): de izquierda a derecha, arriba/abajo alternando;
 *   narrow → paneles altos (móviles): de arriba abajo, izquierda/derecha alternando.
 * El CSS elige uno u otro según el ancho disponible (@container). `size` (0..1) varía el tamaño;
 * `d` es el contorno abultado de la mancha y `specks` sus granitos (todo con la semilla).
 */
export function makeDustLayout(seed) {
  const rng = rngFor(seed, ':panels');
  const blobs = [];
  for (let p = 0; p < PANEL_COUNT; p++) {
    const flip = rng() < 0.5; // zigzag hacia arriba o hacia abajo
    for (let k = 0; k < BLOBS_PER_PANEL; k++) {
      const up = (k % 2 === 0) !== flip;
      // Contorno abultado e irregular (9 puntos, sin simetrías) y 7 granitos repartidos por dentro
      const radii = Array.from({ length: 9 }, () => randFloat(rng, 0.76, 1));
      const specks = Array.from({ length: 7 }, (_, s) => {
        const a = rng() * Math.PI * 2;
        const dist = 6 + rng() * 26;
        return { x: round1(Math.cos(a) * dist), y: round1(Math.sin(a) * dist), r: round1(1.6 + rng() * 1.8), light: s % 2 === 0 };
      });
      blobs.push({
        id: `p${p}-b${k}`,
        panel: p,
        wide: { x: round1(24 + k * 26 + randFloat(rng, -3, 3)), y: round1((up ? 30 : 70) + randFloat(rng, -4, 4)) },
        narrow: { x: round1(50 + (up ? -1 : 1) * randFloat(rng, 6, 12)), y: round1(18 + k * 32 + randFloat(rng, -2.5, 2.5)) },
        size: Math.round(rng() * 100) / 100,
        rot: randInt(rng, 0, 359),
        d: blobPath(radii),
        specks
      });
    }
  }
  return blobs;
}

// Tamaño de cada capa (la 3 es la de fuera). Al quitar una capa, la mancha encoge y se aclara.
const LAYER_SCALE = { 1: 0.46, 2: 0.72, 3: 1 };

/** Dibujo de una mancha con sus `n` capas (la de fuera primero). Solo decorativo. */
function DustPile({ blob, n }) {
  const layers = [];
  for (let k = n; k >= 1; k--) layers.push(k);
  return (
    <svg className="mg-dust-svg" viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">
      {layers.map((k) => (
        <g key={k} transform={`rotate(${blob.rot + k * 47}) scale(${LAYER_SCALE[k]})`}>
          <path d={blob.d} className={`mg-dust-shape mg-dust-l${k}`} />
          {blob.specks.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} className={s.light ? 'mg-speck-light' : 'mg-speck-dark'} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Resumen del estado (puro): capas quitadas, % limpio, % de producción, limpieza de cada panel… */
export function dustStats(layout, layers) {
  const total = layout.length * LAYERS_PER_BLOB;
  const panelLeft = new Array(PANEL_COUNT).fill(0);
  const panelTotal = new Array(PANEL_COUNT).fill(0);
  let left = 0;
  let spotsGone = 0;
  layout.forEach((b, i) => {
    const n = Math.max(0, layers[i] ?? 0);
    left += n;
    if (n === 0) spotsGone += 1;
    panelLeft[b.panel] += n;
    panelTotal[b.panel] += LAYERS_PER_BLOB;
  });
  const ratio = total ? (total - left) / total : 1;
  return {
    left,
    removed: total - left,
    total,
    spotsGone,
    cleanPct: Math.round(ratio * 100),
    powerPct: Math.round(BASE_POWER + (100 - BASE_POWER) * ratio),
    panelClean: panelTotal.map((tot, p) => (tot ? 1 - panelLeft[p] / tot : 1)), // 0..1 por panel
    cleanPanels: panelLeft.map((n) => n === 0),
    done: left === 0
  };
}

/** prefers-reduced-motion del sistema (se suma a la prop reducedMotion). */
function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [pref, setPref] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setPref(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return pref;
}

/** Nubecita de polvo: 6 motas que salen hacia fuera (azar fijo a partir del número de nube). */
function makePuff(id, idx) {
  const prng = mulberry32(Math.imul(id, 0x9e3779b1));
  const dots = Array.from({ length: 6 }, (_, k) => {
    const ang = (k / 6) * Math.PI * 2 + prng() * 0.8;
    const dist = 18 + prng() * 22;
    return { dx: Math.round(Math.cos(ang) * dist), dy: Math.round(Math.sin(ang) * dist - 10), s: Math.round((0.7 + prng() * 0.7) * 100) / 100 };
  });
  return { id, idx, dots };
}

// Pincel original dibujado en SVG (mango, virola y cerdas). Solo decorativo: las cerdas acaban en el puntero.
function BrushIcon() {
  return (
    <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true" focusable="false">
      <rect x="35" y="2" width="12" height="30" rx="6" transform="rotate(35 41 17)" fill="#ff8a3d" stroke="#7a3a10" strokeWidth="2.5" />
      <rect x="20" y="25" width="18" height="10" rx="3" transform="rotate(35 29 30)" fill="#c9d2e8" stroke="#55607e" strokeWidth="2.5" />
      <path d="M13 33 L27 43 L18 58 Q10 61 6 55 Q3 49 6 44 Z" fill="#ffe08a" stroke="#8a6a12" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M11 45 L19 51 M9 50 L15 55" stroke="#c9a23a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Componente público. Si cambia la semilla, el tablero empieza de cero (key). */
export default function PanelCleaning({ seed = 'LUNA-0000', reducedMotion = false, onSuccess, onSolved, onCancel }) {
  const s = String(seed ?? 'LUNA-0000');
  return <PanelCleaningGame key={s} seed={s} reducedMotion={!!reducedMotion} onSuccess={onSuccess} onSolved={onSolved} onCancel={onCancel} />;
}

function PanelCleaningGame({ seed, reducedMotion, onSuccess, onSolved, onCancel }) {
  const onSolvedRef = useRef(onSolved);
  onSolvedRef.current = onSolved;
  const { t, lang } = useI18n();
  const reduced = usePrefersReducedMotion() || reducedMotion;
  const layout = useMemo(() => makeDustLayout(seed), [seed]);

  // Capas que le quedan a cada mancha. layersRef es la copia "al momento" para los manejadores
  // de puntero (pueden llegar varios eventos antes de que React vuelva a pintar).
  const [layers, setLayers] = useState(() => layout.map(() => LAYERS_PER_BLOB));
  const layersRef = useRef(layers);
  const [puffs, setPuffs] = useState([]); // nubecitas de polvo (solo con animaciones)
  const [rubbing, setRubbing] = useState(false);
  const [hovering, setHovering] = useState(false);

  const fieldRef = useRef(null);
  const brushRef = useRef(null);
  const doneRef = useRef(null);
  const blobRefs = useRef([]);
  const strokeRef = useRef(null); // trazo en curso: { id, x, y, sx, sy, moved, downBlob }
  const rubRef = useRef(null); // índice de mancha → px frotados que aún no quitan capa
  if (rubRef.current === null) rubRef.current = new Map();
  const lastPointerUpRef = useRef(-Infinity);
  const lastTickRef = useRef(-Infinity); // para no saturar el sonido al frotar
  const pendingFocusRef = useRef(null); // a dónde llevar el foco tras quitar una mancha con teclado
  const puffIdRef = useRef(0);
  const firedRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  const stats = dustStats(layout, layers);
  const { done } = stats;

  /** Quita capas: removals = Map(índice → nº de capas). Sonidos, nubes y foco aquí, nunca en un updater. */
  const removeLayers = useCallback(
    (removals) => {
      const cur = layersRef.current;
      if (cur.every((n) => n === 0)) return;
      const next = cur.slice();
      const touched = [];
      const vanished = [];
      for (const [idx, n] of removals) {
        if (!(next[idx] > 0) || !(n > 0)) continue;
        next[idx] = Math.max(0, next[idx] - n);
        touched.push(idx);
        if (next[idx] === 0) vanished.push(idx);
      }
      if (!touched.length) return;
      const before = dustStats(layout, cur);
      const after = dustStats(layout, next);
      layersRef.current = next;
      setLayers(next);

      // Sonido: panel recién limpio > mancha quitada > capa (con un mínimo de tiempo entre "clics").
      // Al terminar suena 'ok' (efecto de celebración).
      if (!after.done) {
        const now = performance.now();
        if (after.cleanPanels.some((c, p) => c && !before.cleanPanels[p])) sfx.play('power');
        else if (vanished.length) sfx.play('collect');
        else if (now - lastTickRef.current > 90) sfx.play('click');
        lastTickRef.current = now;
      }

      // Nubecitas de polvo (se saltan con movimiento reducido)
      if (!reduced) {
        const fresh = touched.map((idx) => makePuff(++puffIdRef.current, idx));
        setPuffs((list) => [...list, ...fresh].slice(-MAX_PUFFS));
      }

      // Si la mancha que tenía el foco desaparece (teclado, lector de pantalla o un toque),
      // el foco salta a la siguiente que quede (o al cartel final) para no perderse.
      const active = document.activeElement;
      if (vanished.some((idx) => blobRefs.current[idx] === active)) {
        if (after.done) pendingFocusRef.current = 'done';
        else {
          const from = vanished[0];
          const order = layout.map((_, k) => (from + 1 + k) % layout.length);
          pendingFocusRef.current = order.find((k) => next[k] > 0) ?? null;
        }
      }
    },
    [layout, reduced]
  );

  // Mueve el foco después de pintar (la mancha quitada ya no está en el DOM)
  useLayoutEffect(() => {
    const target = pendingFocusRef.current;
    if (target == null) return;
    pendingFocusRef.current = null;
    const el = target === 'done' ? doneRef.current : blobRefs.current[target];
    el?.focus({ preventScroll: true });
  });

  // Celebración y aviso de éxito: una sola vez y nunca al desmontar (el temporizador se cancela).
  useEffect(() => {
    if (!done) return undefined;
    sfx.play('ok');
    onSolvedRef.current?.(); // ya está resuelto: si cierran durante la celebración, la reparación cuenta
    const id = window.setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      onSuccessRef.current?.();
    }, CELEBRATE_MS);
    return () => window.clearTimeout(id);
  }, [done]);

  // ---------- puntero: frotar y tocar ----------
  /** Coloca el pincel bajo el puntero (escribe en el DOM: sin repintar React en cada movimiento). */
  const placeBrush = (e) => {
    const field = fieldRef.current;
    const brush = brushRef.current;
    if (!field || !brush) return;
    const r = field.getBoundingClientRect();
    // Corrige la escala si la ventana que nos envuelve se está animando con transform: scale()
    const k = r.width ? field.offsetWidth / r.width : 1;
    const x = (e.clientX - r.left) * k - field.clientLeft;
    const y = (e.clientY - r.top) * k - field.clientTop;
    brush.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  };

  const blobAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.('[data-blob]');
    if (!el || !fieldRef.current?.contains(el)) return null;
    const idx = Number(el.dataset.blob);
    return Number.isInteger(idx) ? idx : null;
  };

  const onPointerDown = (e) => {
    if (done || strokeRef.current) return; // un solo dedo a la vez
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault(); // sin selección de texto ni arrastres del navegador
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sin captura también funciona (peor si el dedo sale del campo) */
    }
    const downEl = e.target.closest?.('[data-blob]');
    strokeRef.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
      moved: false,
      downBlob: downEl ? Number(downEl.dataset.blob) : null
    };
    setRubbing(true);
    placeBrush(e);
  };

  const onPointerMove = (e) => {
    if (e.pointerType !== 'touch') {
      placeBrush(e);
      if (!hovering) setHovering(true);
    }
    const s = strokeRef.current;
    if (!s || s.id !== e.pointerId) return;
    if (e.pointerType === 'touch') placeBrush(e);
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    const dist = Math.hypot(dx, dy);
    if (!s.moved && Math.hypot(e.clientX - s.sx, e.clientY - s.sy) > TAP_SLOP_PX) s.moved = true;
    if (dist < 1) return;
    // Muestreamos el trazo cada ~8 px para no "saltarnos" manchas si el dedo va rápido
    const steps = Math.max(1, Math.ceil(dist / 8));
    const gains = new Map();
    for (let i = 1; i <= steps; i++) {
      const idx = blobAt(s.x + (dx * i) / steps, s.y + (dy * i) / steps);
      if (idx != null && layersRef.current[idx] > 0) gains.set(idx, (gains.get(idx) || 0) + dist / steps);
    }
    s.x = e.clientX;
    s.y = e.clientY;
    if (!gains.size) return;
    const removals = new Map();
    for (const [idx, px] of gains) {
      const acc = (rubRef.current.get(idx) || 0) + px;
      const n = Math.floor(acc / RUB_PX_PER_LAYER);
      rubRef.current.set(idx, acc - n * RUB_PX_PER_LAYER);
      if (n > 0) removals.set(idx, n);
    }
    if (removals.size) removeLayers(removals);
  };

  const endStroke = (e, isTap) => {
    const s = strokeRef.current;
    if (!s || s.id !== e.pointerId) return;
    strokeRef.current = null;
    lastPointerUpRef.current = performance.now();
    setRubbing(false);
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ya estaba liberada */
    }
    // Toque sin arrastrar sobre una mancha → 1 capa (y se olvida lo frotado en ella)
    if (isTap && !s.moved && s.downBlob != null) {
      rubRef.current.set(s.downBlob, 0);
      removeLayers(new Map([[s.downBlob, 1]]));
    }
  };

  // ---------- teclado y lectores de pantalla ----------
  const onBlobClick = (idx) => (e) => {
    // Los clicks que llegan justo después de un toque ya se trataron en pointerup
    if (e.detail > 0 && performance.now() - lastPointerUpRef.current < CLICK_GUARD_MS) return;
    removeLayers(new Map([[idx, 1]]));
  };

  const onBlobKeyDown = (idx) => (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const n = layout.length;
    for (let k = 1; k < n; k++) {
      const j = (((idx + step * k) % n) + n) % n;
      if (layersRef.current[j] > 0) {
        blobRefs.current[j]?.focus();
        return;
      }
    }
  };

  const removePuff = (id) => (e) => {
    if (e.target === e.currentTarget) setPuffs((list) => list.filter((p) => p.id !== id));
  };

  // ---------- textos ----------
  const cleanCount = stats.cleanPanels.filter(Boolean).length;
  const statusText = done
    ? t(TXT.allClean)
    : t({
        es: `${stats.spotsGone} de ${layout.length} manchas quitadas · ${cleanCount} de ${PANEL_COUNT} paneles limpios`,
        en: `${stats.spotsGone} of ${layout.length} dust spots removed · ${cleanCount} of ${PANEL_COUNT} panels clean`
      });

  const rootClass = ['mg-root', 'mg-panels-game', reduced && 'mg-reduced', done && 'mg-is-done'].filter(Boolean).join(' ');
  const fieldClass = ['mg-pc-field', rubbing && 'mg-is-rubbing', (rubbing || hovering) && !done && 'mg-show-brush'].filter(Boolean).join(' ');
  const blobPos = (b) => ({ '--wx': `${b.wide.x}%`, '--wy': `${b.wide.y}%`, '--nx': `${b.narrow.x}%`, '--ny': `${b.narrow.y}%` });

  return (
    <div className={rootClass}>
      <p className="mg-instr">
        <span className="mg-instr-icon" aria-hidden="true">
          🧽
        </span>
        <span className="mg-instr-text">{t(TXT.instr)}</span>
        <span className="mg-kbd">⌨️ {t(TXT.kbd)}</span>
      </p>

      <div
        ref={fieldRef}
        className={fieldClass}
        role="group"
        aria-label={t(TXT.field)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endStroke(e, true)}
        onPointerCancel={(e) => endStroke(e, false)}
        onLostPointerCapture={(e) => endStroke(e, false)}
        onPointerLeave={() => setHovering(false)}
      >
        <div className="mg-pc-sky" aria-hidden="true">
          <span className="mg-pc-sun" />
        </div>
        <div className="mg-pc-ground" aria-hidden="true" />

        <div className="mg-pc-row">
          {Array.from({ length: PANEL_COUNT }, (_, p) => {
            const clean = stats.cleanPanels[p];
            return (
              <div key={p} className={`mg-pc-panel${clean ? ' mg-is-clean' : ''}`} style={{ '--clean': stats.panelClean[p].toFixed(2) }}>
                <div className="mg-pc-frame">
                  <span className="mg-pc-cells" aria-hidden="true" />
                  <span className="mg-pc-glare" aria-hidden="true" />
                  {layout.map((b, i) => {
                    if (b.panel !== p || layers[i] === 0) return null;
                    const n = layers[i];
                    return (
                      <button
                        key={b.id}
                        ref={(el) => {
                          blobRefs.current[i] = el;
                        }}
                        type="button"
                        className="mg-dust"
                        data-blob={i}
                        style={{ ...blobPos(b), '--s': b.size }}
                        aria-label={t({
                          es: `Polvo en el panel ${p + 1}: ${n === 1 ? 'queda 1 capa' : `quedan ${n} capas`}`,
                          en: `Dust on panel ${p + 1}: ${n === 1 ? '1 layer left' : `${n} layers left`}`
                        })}
                        onClick={onBlobClick(i)}
                        onKeyDown={onBlobKeyDown(i)}
                      >
                        {/* key={n}: al perder una capa se vuelve a montar y "rebota" */}
                        <span key={n} className="mg-dust-pile" aria-hidden="true">
                          <DustPile blob={b} n={n} />
                        </span>
                      </button>
                    );
                  })}
                  {puffs.map((pf) =>
                    layout[pf.idx].panel === p ? (
                      <span key={pf.id} className="mg-puff" style={blobPos(layout[pf.idx])} aria-hidden="true" onAnimationEnd={removePuff(pf.id)}>
                        {pf.dots.map((d, k) => (
                          <span key={k} className="mg-puff-dot" style={{ '--dx': `${d.dx}px`, '--dy': `${d.dy}px`, '--ps': d.s }} />
                        ))}
                      </span>
                    ) : null
                  )}
                  {clean && (
                    <span className="mg-pc-ok" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </div>
                <span className="mg-pc-stand" aria-hidden="true" />
                <span className="mg-pc-name">
                  {t(TXT.panel)} {p + 1}
                  {clean && <span aria-hidden="true"> ✓</span>}
                </span>
              </div>
            );
          })}
        </div>

        <div ref={brushRef} className="mg-pc-brush" aria-hidden="true">
          <BrushIcon />
        </div>

        {done && (
          <div ref={doneRef} className="mg-done-banner" tabIndex={-1}>
            <span aria-hidden="true">☀️</span> {t(TXT.done)} <span className="mg-done-sub">⚡ {fmtPct(100, lang)}</span>
          </div>
        )}
      </div>

      <div className="mg-meters">
        <div
          className={`mg-meter mg-meter-clean${done ? ' mg-is-full' : ''}`}
          role="progressbar"
          aria-label={t(TXT.cleanLabel)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stats.cleanPct}
          aria-valuetext={fmtPct(stats.cleanPct, lang)}
        >
          <span className="mg-meter-label">
            <span aria-hidden="true">🧽</span> <span className="mg-meter-text">{t(TXT.clean)}</span>
          </span>
          <span className="mg-meter-track" aria-hidden="true">
            <span className="mg-meter-fill" style={{ width: `${stats.cleanPct}%` }} />
          </span>
          <span className="mg-meter-value">{fmtPct(stats.cleanPct, lang)}</span>
        </div>
        <div
          className={`mg-meter mg-meter-power${done ? ' mg-is-full' : ''}`}
          role="meter"
          aria-label={t(TXT.powerLabel)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stats.powerPct}
          aria-valuetext={fmtPct(stats.powerPct, lang)}
        >
          <span className="mg-meter-label">
            <span aria-hidden="true">⚡</span> <span className="mg-meter-text">{t(TXT.power)}</span>
          </span>
          <span className="mg-meter-track" aria-hidden="true">
            <span className="mg-meter-fill" style={{ width: `${stats.powerPct}%` }} />
          </span>
          <span className="mg-meter-value">{fmtPct(stats.powerPct, lang)}</span>
        </div>
      </div>

      <p className="mg-status" aria-live="polite">
        <span className="mg-status-icon" aria-hidden="true">
          {done ? '☀️' : '🧹'}
        </span>
        <span>{statusText}</span>
      </p>

      <div className="mg-foot">
        <p className="fact-box mg-fact">
          <span aria-hidden="true">💡 </span>
          <RichText text={TXT.fact} />
        </p>
        {typeof onCancel === 'function' && !done && (
          <button type="button" className="btn btn-ghost mg-later" onClick={() => onCancel()}>
            {t(TXT.notNow)}
          </button>
        )}
      </div>
    </div>
  );
}
