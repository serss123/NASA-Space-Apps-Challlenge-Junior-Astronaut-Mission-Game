// Minijuego "Antena descalibrada" (avería `antenna`: sin previsión del tiempo espacial ni misiones de la NASA).
// Tres diales de 0 a 100: Frecuencia, Giro (acimut) e Inclinación (elevación), con un objetivo según la semilla.
// Cada dial cambia una cosa de la onda en pantalla: frecuencia → nº de ondas, giro → desplazamiento (fase),
// inclinación → altura (amplitud). Cuando los 3 están a ±5 de su objetivo: "¡Señal fijada!" → un mensaje
// viaja de la Tierra a la Luna en 1,3 s (sin viaje animado con movimiento reducido) → onSuccess() una vez.
// Controles: botones ◀ ▶ grandes (paso 5; mantener pulsado repite), flechas con el dial enfocado
// (Mayús = paso 1; RePág/AvPág = 10; Inicio/Fin), o girar el dial con el puntero (opcional). Sin fallo ni prisa.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio/sfx.js';
import { useI18n } from '../i18n.jsx';
import RichText from '../ui/components/RichText.jsx';
import { randInt, randIntAway, rngFor } from './seededRandom.js';
import './minigames.css';

export const DIALS = [
  { id: 'freq', icon: '〰️', label: { es: 'Frecuencia', en: 'Frequency' }, hint: { es: 'cuántas ondas', en: 'how many waves' } },
  { id: 'turn', icon: '🧭', label: { es: 'Giro', en: 'Turn' }, hint: { es: 'mueve la onda', en: 'slides the wave' } },
  { id: 'tilt', icon: '📐', label: { es: 'Inclinación', en: 'Tilt' }, hint: { es: 'altura de la onda', en: 'wave height' } }
];
export const TOLERANCE = 5;
export const STEP = 5;
export const FINE_STEP = 1;
export const PAGE_STEP = 10;
export const TRAVEL_S = 1.3; // distancia Tierra–Luna / velocidad de la luz ≈ 384 400 km / 299 792 km/s
const HOLD_DELAY_MS = 380; // mantener pulsado ◀ ▶: espera antes de repetir…
const HOLD_EVERY_MS = 110; // …y ritmo de repetición
const CLICK_GUARD_MS = 700;
const LOCK_PAUSE_MS = 500; // tiempo para leer "¡Señal fijada!" antes del viaje
const ARRIVED_MS = 750; // celebración al llegar el mensaje, antes de onSuccess
const REDUCED_DONE_MS = 900; // con movimiento reducido: de "fijada" a onSuccess, sin viaje animado
const KNOB_MIN_DEG = -135;
const KNOB_MAX_DEG = 135;

const TXT = {
  instr: {
    es: 'Gira los 3 diales hasta que tu onda (línea continua) tape la onda de rayas.',
    en: 'Turn the 3 dials until your wave (solid line) covers the dashed wave.'
  },
  kbd: { es: 'Teclado: flechas · Mayús = fino', en: 'Keyboard: arrows · Shift = fine' },
  fact: {
    es: 'Un mensaje tarda unos 1,3 segundos en ir de la Tierra a la Luna ([[signal-delay]]). ¡A Marte tarda minutos!',
    en: 'A message takes about 1.3 seconds to travel from the Earth to the Moon ([[signal-delay]]). To Mars it takes minutes!'
  },
  screen: { es: 'Pantalla de señal', en: 'Signal screen' },
  target: { es: 'Objetivo', en: 'Target' },
  yours: { es: 'Tu antena', en: 'Your antenna' },
  signal: { es: 'Señal', en: 'Signal' },
  signalLabel: { es: 'Fuerza de la señal', en: 'Signal strength' },
  locked: { es: '¡Señal fijada!', en: 'Signal locked!' },
  received: { es: '¡Mensaje recibido!', en: 'Message received!' },
  earth: { es: 'Tierra', en: 'Earth' },
  moon: { es: 'Luna', en: 'Moon' },
  less: { es: 'Bajar', en: 'Lower' },
  more: { es: 'Subir', en: 'Raise' },
  notNow: { es: 'Ahora no', en: 'Not now' }
};

// ---------- ayudantes puros (fáciles de probar) ----------
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * Objetivos y valores iniciales deterministas. Cada dial empieza lejos (≥ 25) de su objetivo y en un
 * múltiplo de 5, así con los botones ◀ ▶ (paso 5) siempre se puede llegar a ±5 del objetivo.
 */
export function makeAntennaLayout(seed) {
  const rng = rngFor(seed, ':antenna');
  return DIALS.map(() => {
    const target = randInt(rng, 12, 88);
    const start = clamp(Math.round(randIntAway(rng, 0, 100, target, 28) / STEP) * STEP, 0, 100);
    return { target, start };
  });
}

export const isWithin = (value, target) => Math.abs(value - target) <= TOLERANCE;

/** 0..1: 1 dentro de la tolerancia; baja poco a poco hasta 0 a 50 de distancia. */
export function dialScore(value, target) {
  const d = Math.abs(value - target);
  return d <= TOLERANCE ? 1 : clamp(1 - (d - TOLERANCE) / 45, 0, 1);
}

/** Fuerza de la señal 0–100 % (media de los diales). */
export function signalStrength(values, targets) {
  if (!values.length) return 0;
  const sum = values.reduce((s, v, i) => s + dialScore(v, targets[i]), 0);
  return Math.round((100 * sum) / values.length);
}

/** Barras de cercanía 1–4 (la "cobertura" de cada dial). */
export function closenessBars(value, target) {
  const d = Math.abs(value - target);
  if (d <= TOLERANCE) return 4;
  if (d <= 15) return 3;
  if (d <= 30) return 2;
  return 1;
}

/** Diales → forma de la onda: nº de ondas, desfase (radianes, < 2π para no repetirse) y altura (0..1). */
export function waveShape(freq, turn, tilt) {
  return {
    cycles: 1 + (freq / 100) * 3.5,
    phase: (turn / 100) * Math.PI * 1.6,
    amp: 0.18 + (tilt / 100) * 0.74
  };
}

/** Trazo SVG de una onda en una caja w×h. `noise` (0..1) añade "estática" fija (sin azar). */
export function wavePath({ cycles, phase, amp }, w, h, noise = 0, samples = 96) {
  const mid = h / 2;
  const a = amp * (h / 2 - 10);
  let d = '';
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    let y = mid - a * Math.sin(2 * Math.PI * cycles * u + phase);
    if (noise > 0) y += noise * h * 0.1 * (0.6 * Math.sin(u * 97.3 + 1.7) + 0.4 * Math.sin(u * 211.9 + 0.4));
    d += `${i ? ' L' : 'M'}${(u * w).toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/** Valor 0..100 ↔ ángulo del dial (0° arriba, sentido horario, hueco abajo). */
export const valueToDeg = (v) => KNOB_MIN_DEG + (clamp(v, 0, 100) / 100) * (KNOB_MAX_DEG - KNOB_MIN_DEG);
export function degToValue(deg) {
  const a = clamp(deg, KNOB_MIN_DEG, KNOB_MAX_DEG);
  return Math.round(((a - KNOB_MIN_DEG) / (KNOB_MAX_DEG - KNOB_MIN_DEG)) * 100);
}

/** Pista para lectores de pantalla (la vista ya tiene las ondas y las barras). */
export function hintFor(value, target) {
  const d = target - value;
  if (Math.abs(d) <= TOLERANCE) return { es: 'en su punto ✓', en: 'right on ✓' };
  const up = d > 0;
  if (Math.abs(d) <= 15) return up ? { es: 'cerca: sube un poco', en: 'close: go up a little' } : { es: 'cerca: baja un poco', en: 'close: go down a little' };
  return up ? { es: 'lejos: sube', en: 'far: go up' } : { es: 'lejos: baja', en: 'far: go down' };
}

const polar = (deg, r, c = 50) => {
  const rad = (deg * Math.PI) / 180;
  return [c + r * Math.sin(rad), c - r * Math.cos(rad)];
};

function arcPath(fromDeg, toDeg, r) {
  const [x0, y0] = polar(fromDeg, r);
  const [x1, y1] = polar(toDeg, r);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

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

/** Ancho de maquetación de un elemento, siguiendo sus cambios. */
function useBoxWidth(ref, fallback) {
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const next = el.clientWidth;
      if (next) setW((cur) => (cur === next ? cur : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

// ---------- dibujos ----------
const KNOB_TICKS = Array.from({ length: 11 }, (_, k) => KNOB_MIN_DEG + k * 27);

function KnobFace({ value, ok }) {
  const deg = valueToDeg(value);
  const [px, py] = polar(deg, 20); // punto indicador en el borde del cuerpo del dial
  return (
    <svg className="mg-knob-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="47" className="mg-knob-ring" />
      {KNOB_TICKS.map((a, k) => {
        const [x0, y0] = polar(a, k % 5 === 0 ? 37 : 40);
        const [x1, y1] = polar(a, 44);
        return <line key={k} x1={x0} y1={y0} x2={x1} y2={y1} className="mg-knob-tick" />;
      })}
      <path d={arcPath(KNOB_MIN_DEG, KNOB_MAX_DEG, 33)} className="mg-knob-track" />
      {value > 0.5 && <path d={arcPath(KNOB_MIN_DEG, deg, 33)} className={`mg-knob-arc${ok ? ' mg-is-ok' : ''}`} />}
      <circle cx="50" cy="50" r="26" className="mg-knob-body" />
      <circle cx={px} cy={py} r="5" className="mg-knob-dot" />
      <text x="50" y="57" textAnchor="middle" className="mg-knob-num">
        {Math.round(value)}
      </text>
    </svg>
  );
}

/** Escena del viaje Tierra → Luna (t en segundos; null = escena quieta, ya llegado). */
function TravelScene({ w, h, t, arrived, labels, fmtSecs }) {
  const ex = 46;
  const mx = w - 42;
  const cy = h / 2 + 2;
  const p = t == null ? 1 : clamp(t / TRAVEL_S, 0, 1);
  // El punto viaja por un arco suave (parábola) entre la Tierra y la Luna
  const x0 = ex + 28;
  const x1 = mx - 20;
  const lift = Math.min(34, h * 0.28);
  const dotX = x0 + (x1 - x0) * p;
  const dotY = cy - lift * 4 * p * (1 - p);
  const arc = `M ${x0} ${cy} Q ${(x0 + x1) / 2} ${cy - lift * 2} ${x1} ${cy}`;
  const secs = fmtSecs(t == null ? TRAVEL_S : clamp(t, 0, TRAVEL_S));
  return (
    <g className={`mg-travel${arrived ? ' mg-is-arrived' : ''}`}>
      <path d={arc} className="mg-travel-path" />
      {/* Tierra: océano, continentes y nubes inventados */}
      <g transform={`translate(${ex} ${cy})`}>
        <circle r="25" className="mg-earth" />
        <path d="M-15 -8 q6 -9 14 -6 q4 6 -2 10 q-6 3 -4 9 q-6 2 -9 -4 z" className="mg-earth-land" />
        <path d="M5 4 q8 -3 11 4 q-2 8 -9 9 q-5 -5 -2 -13 z" className="mg-earth-land" />
        <path d="M-18 9 q8 3 14 0 M2 -16 q7 -2 12 3" className="mg-earth-cloud" />
      </g>
      {/* Luna con cráteres y la base en el polo sur */}
      <g transform={`translate(${mx} ${cy})`}>
        <circle r="18" className="mg-moon" />
        <circle cx="-6" cy="-6" r="4.5" className="mg-moon-crater" />
        <circle cx="7" cy="2" r="3" className="mg-moon-crater" />
        <circle cx="-3" cy="8" r="2.4" className="mg-moon-crater" />
        <path d="M-5 18 a5 5 0 0 1 10 0 z" className="mg-moon-base" />
      </g>
      {!arrived && t != null && (
        <>
          <circle cx={dotX} cy={dotY} r="11" className="mg-travel-glow" />
          <circle cx={dotX} cy={dotY} r="6" className="mg-travel-dot" />
        </>
      )}
      {arrived && (
        <text x={mx} y={cy - 26} textAnchor="middle" className="mg-travel-mail">
          📨
        </text>
      )}
      <text x={ex} y={h - 6} textAnchor="middle" className="mg-travel-label">
        {labels.earth}
      </text>
      <text x={mx} y={h - 6} textAnchor="middle" className="mg-travel-label">
        {labels.moon}
      </text>
      <text x={w / 2} y={h - 8} textAnchor="middle" className="mg-travel-time">
        ⏱ {secs} s
      </text>
    </g>
  );
}

/** Componente público. Si cambia la semilla, la antena empieza de cero (key). */
export default function AntennaCalibration({ seed = 'LUNA-0000', reducedMotion = false, onSuccess, onSolved, onCancel }) {
  const s = String(seed ?? 'LUNA-0000');
  return <AntennaGame key={s} seed={s} reducedMotion={!!reducedMotion} onSuccess={onSuccess} onSolved={onSolved} onCancel={onCancel} />;
}

function AntennaGame({ seed, reducedMotion, onSuccess, onSolved, onCancel }) {
  const onSolvedRef = useRef(onSolved);
  onSolvedRef.current = onSolved;
  const { t, lang } = useI18n();
  const reduced = usePrefersReducedMotion() || reducedMotion;
  const layout = useMemo(() => makeAntennaLayout(seed), [seed]);
  const targets = useMemo(() => layout.map((d) => d.target), [layout]);

  const [values, setValues] = useState(() => layout.map((d) => d.start));
  const valuesRef = useRef(values);
  const [phase, setPhase] = useState('tuning'); // tuning → locked → arrived
  const phaseRef = useRef('tuning');
  const [travelT, setTravelT] = useState(null); // segundos del viaje (null = aún no sale)
  const [bump, setBump] = useState(null); // { dial, n }: "rebote" al intentar pasar de 0 o de 100

  const screenRef = useRef(null);
  const dialsRef = useRef(null);
  const resultRef = useRef(null);
  const holdRef = useRef(null); // pulsación mantenida de ◀ ▶
  const knobDragRef = useRef(null); // giro del dial con el puntero
  const lastPointerUpRef = useRef(-Infinity);
  const lastClickSfxRef = useRef(-Infinity);
  const bumpCountRef = useRef(0);
  const pendingFocusRef = useRef(false);
  const firedRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  const screenW = useBoxWidth(screenRef, 560);
  const screenH = screenW < 420 ? 104 : 116;

  const stopHold = useCallback(() => {
    const h = holdRef.current;
    if (!h) return;
    window.clearTimeout(h.timer);
    window.clearInterval(h.interval);
    holdRef.current = null;
  }, []);
  useEffect(() => stopHold, [stopHold]); // limpieza al desmontar

  const fire = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onSuccessRef.current?.();
  }, []);

  /** Pone un dial en un valor. Devuelve true si cambió. Aquí (no en un efecto) se detecta la señal fijada. */
  const setDial = useCallback(
    (dial, raw) => {
      if (phaseRef.current !== 'tuning') return false;
      const v = clamp(Math.round(raw), 0, 100);
      const cur = valuesRef.current;
      if (cur[dial] === v) return false;
      const next = cur.slice();
      next[dial] = v;
      valuesRef.current = next;
      setValues(next);
      const wasOk = isWithin(cur[dial], targets[dial]);
      const nowOk = isWithin(v, targets[dial]);
      if (next.every((x, i) => isWithin(x, targets[i]))) {
        phaseRef.current = 'locked';
        setPhase('locked');
        stopHold();
        knobDragRef.current = null;
        sfx.play('signal');
        // Los controles se desactivan: si tenían el foco, lo llevamos al cartel del resultado
        const active = document.activeElement;
        if (active && dialsRef.current?.contains(active)) pendingFocusRef.current = true;
      } else if (nowOk && !wasOk) sfx.play('collect');
      else {
        const now = performance.now();
        if (now - lastClickSfxRef.current > 55) {
          sfx.play('click');
          lastClickSfxRef.current = now;
        }
      }
      return true;
    },
    [targets, stopHold]
  );

  /** Suma o resta a un dial. En el tope (0 o 100) no cambia: el dial "rebota" y devuelve false. */
  const nudge = useCallback(
    (dial, delta) => {
      if (phaseRef.current !== 'tuning') return false;
      const cur = valuesRef.current[dial];
      const wanted = clamp(cur + delta, 0, 100);
      if (wanted === cur) {
        bumpCountRef.current += 1;
        setBump({ dial, n: bumpCountRef.current });
        return false;
      }
      return setDial(dial, wanted);
    },
    [setDial]
  );

  // Foco al cartel del resultado cuando los controles se desactivan
  useLayoutEffect(() => {
    if (!pendingFocusRef.current || !resultRef.current) return;
    pendingFocusRef.current = false;
    resultRef.current.focus({ preventScroll: true });
  });

  // Secuencia final: viaje del mensaje (o versión quieta con movimiento reducido) → onSuccess
  useEffect(() => {
    if (phase !== 'locked') return undefined;
    onSolvedRef.current?.(); // señal fijada: si cierran durante el viaje del mensaje, la reparación cuenta
    if (reduced) {
      const id = window.setTimeout(() => {
        sfx.play('ok');
        phaseRef.current = 'arrived';
        setPhase('arrived');
      }, LOCK_PAUSE_MS);
      return () => window.clearTimeout(id);
    }
    let raf = 0;
    let start = 0;
    const tick = (now) => {
      if (!start) start = now;
      const s = Math.min(TRAVEL_S, (now - start) / 1000);
      setTravelT(s);
      if (s < TRAVEL_S) raf = window.requestAnimationFrame(tick);
      else {
        sfx.play('ok');
        phaseRef.current = 'arrived';
        setPhase('arrived');
      }
    };
    const delay = window.setTimeout(() => {
      raf = window.requestAnimationFrame(tick);
    }, LOCK_PAUSE_MS);
    return () => {
      window.clearTimeout(delay);
      window.cancelAnimationFrame(raf);
    };
  }, [phase, reduced]);

  useEffect(() => {
    if (phase !== 'arrived') return undefined;
    const id = window.setTimeout(fire, reduced ? REDUCED_DONE_MS - LOCK_PAUSE_MS : ARRIVED_MS);
    return () => window.clearTimeout(id);
  }, [phase, reduced, fire]);

  // ---------- ◀ ▶ con pulsación mantenida ----------
  const startHold = (dial, delta) => (e) => {
    if (phaseRef.current !== 'tuning') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault(); // sin selección de texto ni menú
    stopHold();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sin captura: soltar el botón también lo detiene */
    }
    nudge(dial, delta);
    const h = { pointerId: e.pointerId, timer: 0, interval: 0 };
    h.timer = window.setTimeout(() => {
      h.interval = window.setInterval(() => {
        if (!nudge(dial, delta)) stopHold();
      }, HOLD_EVERY_MS);
    }, HOLD_DELAY_MS);
    holdRef.current = h;
  };
  const endHold = (e) => {
    const h = holdRef.current;
    if (h && h.pointerId === e.pointerId) stopHold();
    lastPointerUpRef.current = performance.now();
  };
  const onStepClick = (dial, delta) => (e) => {
    // Teclado (Enter/Espacio) y lectores de pantalla; el puntero ya actuó en pointerdown
    if (e.detail > 0 && performance.now() - lastPointerUpRef.current < CLICK_GUARD_MS) return;
    nudge(dial, delta);
  };

  // ---------- dial: teclado ----------
  const onKnobKeyDown = (dial) => (e) => {
    const small = e.shiftKey ? FINE_STEP : STEP;
    const map = { ArrowRight: small, ArrowUp: small, ArrowLeft: -small, ArrowDown: -small, PageUp: PAGE_STEP, PageDown: -PAGE_STEP };
    if (e.key in map) {
      e.preventDefault();
      nudge(dial, map[e.key]);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setDial(dial, e.key === 'Home' ? 0 : 100);
    }
  };

  // ---------- dial: girar con el puntero ----------
  const angleFrom = (e, d) => (Math.atan2(e.clientX - d.cx, -(e.clientY - d.cy)) * 180) / Math.PI;
  const onKnobPointerDown = (dial) => (e) => {
    if (phaseRef.current !== 'tuning') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sin captura */
    }
    const r = e.currentTarget.getBoundingClientRect();
    const d = { id: e.pointerId, dial, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    knobDragRef.current = d;
    // Tocar el borde del dial lo lleva directamente a ese punto; el centro no lo mueve
    if (Math.hypot(e.clientX - d.cx, e.clientY - d.cy) > r.width * 0.18) setDial(dial, degToValue(angleFrom(e, d)));
  };
  const onKnobPointerMove = (e) => {
    const d = knobDragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const v = degToValue(angleFrom(e, d));
    // Evita saltos de 0 a 100 al cruzar el hueco de abajo del dial
    if (Math.abs(v - valuesRef.current[d.dial]) > 40) return;
    setDial(d.dial, v);
  };
  const onKnobPointerEnd = (e) => {
    const d = knobDragRef.current;
    if (d && d.id === e.pointerId) knobDragRef.current = null;
  };

  // ---------- derivados ----------
  const locked = phase !== 'tuning';
  const strength = locked ? 100 : signalStrength(values, targets);
  const okCount = values.filter((v, i) => isWithin(v, targets[i])).length;
  const live = waveShape(values[0], values[1], values[2]);
  const goal = useMemo(() => waveShape(targets[0], targets[1], targets[2]), [targets]);
  const targetD = useMemo(() => wavePath(goal, screenW, screenH), [goal, screenW, screenH]);
  const liveD = locked ? wavePath(goal, screenW, screenH) : wavePath(live, screenW, screenH, (100 - strength) / 100);
  const pctTxt = (n) => (lang === 'es' ? `${n} %` : `${n}%`);
  const fmtSecs = (s) => s.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const showTravel = locked && (reduced || travelT != null || phase === 'arrived');

  let statusIcon = '📡';
  let statusText = t({ es: `${okCount} de 3 diales en su punto`, en: `${okCount} of 3 dials right on` });
  if (phase === 'arrived') {
    statusIcon = '📨';
    statusText = t({
      es: '¡Mensaje de la Tierra recibido en 1,3 s! Llegan la previsión y las misiones.',
      en: 'Message from Earth received in 1.3 s! The forecast and missions are coming.'
    });
  } else if (phase === 'locked') {
    statusIcon = '🔒';
    statusText = t({ es: '¡Señal fijada! Un mensaje viaja desde la Tierra…', en: 'Signal locked! A message is travelling from Earth…' });
  }

  const rootClass = ['mg-root', 'mg-antenna-game', reduced && 'mg-reduced', locked && 'mg-is-locked', phase === 'arrived' && 'mg-is-done'].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      <p className="mg-instr">
        <span className="mg-instr-icon" aria-hidden="true">
          📡
        </span>
        <span className="mg-instr-text">{t(TXT.instr)}</span>
        <span className="mg-kbd">⌨️ {t(TXT.kbd)}</span>
      </p>

      <div ref={screenRef} className="mg-ac-screen" role="img" aria-label={t(TXT.screen)} style={{ height: screenH }}>
        <svg viewBox={`0 0 ${screenW} ${screenH}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <g className="mg-ac-grid">
            {Array.from({ length: 9 }, (_, k) => (
              <line key={`v${k}`} x1={((k + 1) * screenW) / 10} y1="0" x2={((k + 1) * screenW) / 10} y2={screenH} />
            ))}
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={`h${f}`} x1="0" y1={screenH * f} x2={screenW} y2={screenH * f} />
            ))}
          </g>
          {showTravel ? (
            <TravelScene
              w={screenW}
              h={screenH}
              t={reduced ? null : travelT}
              arrived={phase === 'arrived'}
              labels={{ earth: t(TXT.earth), moon: t(TXT.moon) }}
              fmtSecs={fmtSecs}
            />
          ) : (
            <>
              <path d={targetD} className="mg-ac-wave-target" />
              <path d={liveD} className={`mg-ac-wave-live${locked ? ' mg-is-ok' : ''}`} />
            </>
          )}
        </svg>
        {!locked && (
          <span className="mg-ac-legend" aria-hidden="true">
            <span className="mg-ac-key mg-ac-key-target" />
            {t(TXT.target)}
            <span className="mg-ac-key mg-ac-key-live" />
            {t(TXT.yours)}
          </span>
        )}
        {locked && (
          <span ref={resultRef} className="mg-ac-locked" tabIndex={-1}>
            <span aria-hidden="true">{phase === 'arrived' ? '📨 ' : '🔒 '}</span>
            {phase === 'arrived' ? t(TXT.received) : t(TXT.locked)}
          </span>
        )}
        {!locked && <span className="mg-ac-scan" aria-hidden="true" />}
      </div>

      <div className="mg-ac-readout">
        <div
          className={`mg-meter mg-meter-signal${locked ? ' mg-is-full' : ''}`}
          role="progressbar"
          aria-label={t(TXT.signalLabel)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={strength}
          aria-valuetext={pctTxt(strength)}
        >
          <span className="mg-meter-label">
            <span aria-hidden="true">📶</span> <span className="mg-meter-text">{t(TXT.signal)}</span>
          </span>
          <span className="mg-meter-track" aria-hidden="true">
            <span className="mg-meter-fill" style={{ width: `${strength}%` }} />
          </span>
          <span className="mg-meter-value">{pctTxt(strength)}</span>
        </div>
        <p className="mg-status" aria-live="polite">
          <span className="mg-status-icon" aria-hidden="true">
            {statusIcon}
          </span>
          <span>{statusText}</span>
        </p>
      </div>

      <div ref={dialsRef} className="mg-ac-dials">
        {DIALS.map((dial, i) => {
          const v = values[i];
          const ok = isWithin(v, targets[i]);
          const bars = closenessBars(v, targets[i]);
          const label = t(dial.label);
          const bumped = bump?.dial === i;
          return (
            <div key={dial.id} className={`mg-ac-dial${ok ? ' mg-is-ok' : ''}`}>
              <div className="mg-ac-dial-head">
                <span className="mg-ac-dial-icon" aria-hidden="true">
                  {dial.icon}
                </span>
                <span className="mg-ac-dial-name">{label}</span>
                <span className={`mg-ac-check${ok ? ' mg-is-on' : ''}`} aria-hidden="true">
                  {ok ? '✓' : ''}
                </span>
                <span className="mg-ac-bars" aria-hidden="true">
                  {[1, 2, 3, 4].map((b) => (
                    <span key={b} className={`mg-ac-bar${b <= bars ? ' mg-is-on' : ''}`} style={{ height: `${25 * b}%` }} />
                  ))}
                </span>
                <span className="mg-ac-dial-hint" aria-hidden="true">
                  {t(dial.hint)}
                </span>
              </div>
              <div className="mg-ac-dial-ctrl">
                <button
                  type="button"
                  className="btn btn-secondary mg-ac-step mg-ac-less"
                  aria-label={`${t(TXT.less)}: ${label}`}
                  disabled={locked}
                  onPointerDown={startHold(i, -STEP)}
                  onPointerUp={endHold}
                  onPointerCancel={endHold}
                  onLostPointerCapture={endHold}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={onStepClick(i, -STEP)}
                >
                  <span aria-hidden="true">◀</span>
                </button>
                <div
                  className={`mg-knob${ok ? ' mg-is-ok' : ''}`}
                  role="slider"
                  tabIndex={locked ? -1 : 0}
                  aria-label={label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={v}
                  aria-valuetext={`${v} · ${t(hintFor(v, targets[i]))}`}
                  aria-disabled={locked || undefined}
                  onKeyDown={onKnobKeyDown(i)}
                  onPointerDown={onKnobPointerDown(i)}
                  onPointerMove={onKnobPointerMove}
                  onPointerUp={onKnobPointerEnd}
                  onPointerCancel={onKnobPointerEnd}
                  onLostPointerCapture={onKnobPointerEnd}
                >
                  {/* Solo la cara se vuelve a montar al rebotar: el dial conserva el foco y el puntero */}
                  <span key={bumped ? `b${bump.n}` : 'face'} className={`mg-knob-face${bumped ? ' mg-is-bump' : ''}`}>
                    <KnobFace value={v} ok={ok} />
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary mg-ac-step mg-ac-more"
                  aria-label={`${t(TXT.more)}: ${label}`}
                  disabled={locked}
                  onPointerDown={startHold(i, STEP)}
                  onPointerUp={endHold}
                  onPointerCancel={endHold}
                  onLostPointerCapture={endHold}
                  onContextMenu={(e) => e.preventDefault()}
                  onClick={onStepClick(i, STEP)}
                >
                  <span aria-hidden="true">▶</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mg-foot">
        <p className="fact-box mg-fact">
          <span aria-hidden="true">💡 </span>
          <RichText text={TXT.fact} />
        </p>
        {typeof onCancel === 'function' && !locked && (
          <button type="button" className="btn btn-ghost mg-later" onClick={() => onCancel()}>
            {t(TXT.notNow)}
          </button>
        )}
      </div>
    </div>
  );
}
