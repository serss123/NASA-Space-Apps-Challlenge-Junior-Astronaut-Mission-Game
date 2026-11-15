// Minijuego "Cables cortocircuitados" (avería `cables`: mientras siga roto, el escudo no se puede cargar).
// Cuadro eléctrico con 4 cables rotos a la izquierda y 4 enchufes a la derecha (orden según la semilla).
// Cada cable tiene color + símbolo + palabra: nunca depende solo del color.
// Se conecta tocando un cable y luego su enchufe (o al revés), arrastrando del cable al enchufe,
// o con el teclado (Tab/flechas + Enter/Espacio; Escape suelta el cable que llevas).
// Error → chispas + temblor y se vuelve a intentar (tras 2 fallos con un cable, su enchufe se ilumina).
// Los 4 conectados → "Circuito reparado ⚡🛡️" → onSuccess() una sola vez.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio/sfx.js';
import { useI18n } from '../i18n.jsx';
import RichText from '../ui/components/RichText.jsx';
import { derangement, rngFor, shuffle } from './seededRandom.js';
import './minigames.css';

// Colores de la paleta Okabe–Ito (pensada para el daltonismo), algo aclarados para fondo oscuro.
export const CABLE_TYPES = [
  { id: 'red', shape: 'triangle', glyph: '▲', color: '#ec6a2c', word: { es: 'rojo', en: 'red' }, shapeName: { es: 'triángulo', en: 'triangle' } },
  { id: 'blue', shape: 'circle', glyph: '●', color: '#56b4e9', word: { es: 'azul', en: 'blue' }, shapeName: { es: 'círculo', en: 'circle' } },
  { id: 'yellow', shape: 'square', glyph: '■', color: '#f0e442', word: { es: 'amarillo', en: 'yellow' }, shapeName: { es: 'cuadrado', en: 'square' } },
  { id: 'green', shape: 'star', glyph: '★', color: '#22b98d', word: { es: 'verde', en: 'green' }, shapeName: { es: 'estrella', en: 'star' } }
];
const N = CABLE_TYPES.length;
const INK = '#0b1020';
const CELEBRATE_MS = 650;
const DRAG_SLOP_PX = 8;
const WRONG_MS = 750;
const CLICK_GUARD_MS = 700;
export const HINT_AFTER = 2; // fallos con un mismo cable antes de iluminar su enchufe

const TXT = {
  instr: {
    es: 'Toca un cable y luego el enchufe con su mismo símbolo. También puedes arrastrarlo.',
    en: 'Tap a cable, then the socket with the same symbol. You can also drag it.'
  },
  kbd: { es: 'Teclado: Tab / flechas + Enter', en: 'Keyboard: Tab / arrows + Enter' },
  fact: {
    es: 'Las partículas de una tormenta solar ([[sep]]) pueden provocar fallos en la electrónica: por eso hay que revisar los circuitos.',
    en: 'Particles from a solar storm ([[sep]]) can make electronics fail: that’s why circuits must be checked.'
  },
  board: { es: 'Cuadro eléctrico del escudo', en: 'Shield electrical panel' },
  cables: { es: 'Cables rotos', en: 'Broken cables' },
  sockets: { es: 'Enchufes', en: 'Sockets' },
  noPower: { es: 'Escudo sin corriente', en: 'Shield has no power' },
  repaired: { es: '¡Circuito reparado!', en: 'Circuit repaired!' },
  canCharge: { es: 'El escudo ya se puede cargar.', en: 'The shield can be charged again.' },
  notNow: { es: 'Ahora no', en: 'Not now' }
};

const STATUS_ICON = { hold: '✋', socket: '🔌', ok: '✅', wrong: '⚡', idle: '🔧', done: '🛡️' };

/**
 * Tablero determinista: left[fila] = tipo de cable en esa fila de la izquierda;
 * right[fila] = tipo de enchufe en esa fila de la derecha. Ningún cable queda justo enfrente
 * de su enchufe (desarreglo), así siempre hay que cruzar.
 */
export function makeCableLayout(seed) {
  const rng = rngFor(seed, ':cables');
  const left = shuffle(rng, CABLE_TYPES.map((_, i) => i));
  const moveTo = derangement(rng, N); // el cable de la fila r va al enchufe de la fila moveTo[r] (≠ r)
  const right = new Array(N);
  left.forEach((type, r) => {
    right[moveTo[r]] = type;
  });
  return { left, right };
}

/** ¿Este cable va en el enchufe de esta fila? (puro) */
export const isMatch = (layout, cableType, socketRow) => layout.right[socketRow] === cableType;

/**
 * Medidas del tablero según su ancho en px (fuente única: el CSS las recibe como variables).
 * cableW: ancho de la columna de cables (fracción); socketLeft: dónde empiezan los enchufes (fracción);
 * holePx: distancia del borde izquierdo del enchufe al centro de su agujero.
 */
export function boardGeometry(w) {
  return w < 400 ? { narrow: true, cableW: 0.4, socketLeft: 0.58, holePx: 24 } : { narrow: false, cableW: 0.36, socketLeft: 0.64, holePx: 30 };
}

/** Curva suave del cable (Bézier cúbica) entre dos puntos. */
export function wirePath(x1, y1, x2, y2) {
  const k = Math.max(30, (x2 - x1) * 0.55);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${(x1 + k).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - k).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
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

/** Tamaño de maquetación (sin transform) de un elemento, siguiendo sus cambios. */
function useBoxSize(ref, fallback) {
  const [size, setSize] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
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
  return size;
}

/** Símbolo dibujado en SVG (el mismo en cable, enchufe y mensajes). `fill` por defecto: el color del cable. */
export function CableSymbol({ type, size = 22, fill }) {
  const c = CABLE_TYPES[type];
  const common = { fill: fill ?? c.color, stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' };
  let shape;
  if (c.shape === 'triangle') shape = <polygon points="12,2.5 22,20.5 2,20.5" {...common} />;
  else if (c.shape === 'circle') shape = <circle cx="12" cy="12" r="9.5" {...common} />;
  else if (c.shape === 'square') shape = <rect x="3" y="3" width="18" height="18" rx="2.5" {...common} />;
  else shape = <polygon points="12,1.8 14.9,8.4 22.2,9.1 16.7,14 18.3,21.2 12,17.5 5.7,21.2 7.3,14 1.8,9.1 9.1,8.4" {...common} />;
  return (
    <svg className="mg-sym" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {shape}
    </svg>
  );
}

/** Componente público. Si cambia la semilla, el cuadro empieza de cero (key). */
export default function CableRepair({ seed = 'LUNA-0000', reducedMotion = false, onSuccess, onSolved, onCancel }) {
  const s = String(seed ?? 'LUNA-0000');
  return <CableRepairGame key={s} seed={s} reducedMotion={!!reducedMotion} onSuccess={onSuccess} onSolved={onSolved} onCancel={onCancel} />;
}

function CableRepairGame({ seed, reducedMotion, onSuccess, onSolved, onCancel }) {
  const onSolvedRef = useRef(onSolved);
  onSolvedRef.current = onSolved;
  const { t } = useI18n();
  const reduced = usePrefersReducedMotion() || reducedMotion;
  const layout = useMemo(() => makeCableLayout(seed), [seed]);

  const [connected, setConnected] = useState(() => CABLE_TYPES.map(() => false)); // por tipo de cable
  const [selected, setSelected] = useState(null); // { kind: 'cable', type } | { kind: 'socket', row }
  const [wrong, setWrong] = useState(null); // { cableRow, socketRow, n } → chispas + temblor
  const [justConnected, setJustConnected] = useState(null); // tipo recién conectado (destello)
  const [misses, setMisses] = useState(() => CABLE_TYPES.map(() => 0)); // fallos por tipo de cable
  const [drag, setDrag] = useState(null); // { type, x, y } cable arrastrado (coordenadas del tablero)
  const [hoverSocket, setHoverSocket] = useState(null);
  const [msg, setMsg] = useState(null); // { kind, es, en } mensaje de ayuda

  const rootRef = useRef(null);
  const boardRef = useRef(null);
  const doneRef = useRef(null);
  const cableRefs = useRef([]);
  const socketRefs = useRef([]);
  const connectedRef = useRef(connected);
  const selectedRef = useRef(null); // copia "al momento" de `selected` para los manejadores
  const dragRef = useRef(null); // { id, row, type, sx, sy, moved, wasSelected, pairWithSocket }
  const lastPointerUpRef = useRef(-Infinity);
  const lastDragDropRef = useRef(-Infinity);
  const wrongTimerRef = useRef(0);
  const wrongCountRef = useRef(0);
  const pendingFocusRef = useRef(null);
  const firedRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });
  useEffect(() => () => window.clearTimeout(wrongTimerRef.current), []);

  const box = useBoxSize(boardRef, { w: 560, h: 216 });
  const geo = boardGeometry(box.w);
  const count = connected.filter(Boolean).length;
  const done = count === N;
  const rowOfCable = (type) => layout.left.indexOf(type);
  const rowOfSocket = (type) => layout.right.indexOf(type);
  const rowY = (r) => ((r + 0.5) / N) * box.h;
  const tipX = box.w * geo.cableW;
  const socketX = box.w * geo.socketLeft;
  const holeX = socketX + geo.holePx;

  const select = useCallback((next) => {
    selectedRef.current = next;
    setSelected(next);
  }, []);

  const clearSelection = useCallback(() => {
    select(null);
    setMsg(null);
  }, [select]);

  /** Intenta conectar un cable (tipo) con un enchufe (fila). Sonidos y foco aquí, nunca en un updater. */
  const tryConnect = useCallback(
    (type, socketRow, { viaKeyboard = false } = {}) => {
      const cur = connectedRef.current;
      if (cur.every(Boolean) || cur[type]) return;
      const socketType = layout.right[socketRow];
      const cableRow = layout.left.indexOf(type);
      const a = CABLE_TYPES[type];
      select(null);
      if (socketType === type) {
        const next = cur.slice();
        next[type] = true;
        connectedRef.current = next;
        setConnected(next);
        setJustConnected(type);
        const allDone = next.every(Boolean);
        if (!allDone) sfx.play('power'); // al terminar suena 'ok' (celebración)
        setMsg({ kind: 'ok', es: `¡Cable ${a.glyph} ${a.word.es} conectado!`, en: `${a.glyph} ${a.word.en} cable connected!` });
        // El cable y su enchufe se desactivan: si uno tenía el foco (teclado, lector de pantalla
        // o un click en algunos navegadores), lo pasamos al siguiente cable suelto para no perderlo.
        const active = document.activeElement;
        const hadFocus = !!active && (active === cableRefs.current[cableRow] || active === socketRefs.current[socketRow]);
        if (hadFocus || viaKeyboard) {
          if (allDone) pendingFocusRef.current = { kind: 'done' };
          else {
            for (let k = 1; k <= N; k++) {
              const r = (cableRow + k) % N;
              if (!next[layout.left[r]]) {
                pendingFocusRef.current = { kind: 'cable', row: r };
                break;
              }
            }
          }
        }
      } else {
        sfx.play('spark');
        window.clearTimeout(wrongTimerRef.current);
        wrongCountRef.current += 1;
        setWrong({ cableRow, socketRow, n: wrongCountRef.current });
        wrongTimerRef.current = window.setTimeout(() => setWrong(null), WRONG_MS);
        setMisses((m) => m.map((v, i) => (i === type ? v + 1 : v)));
        const b = CABLE_TYPES[socketType];
        setMsg({
          kind: 'wrong',
          es: `¡Chispas! Ese enchufe es ${b.glyph} ${b.word.es}. Busca el ${a.glyph}.`,
          en: `Sparks! That socket is ${b.glyph} ${b.word.en}. Look for the ${a.glyph}.`
        });
        // Con teclado, el foco vuelve al cable para intentarlo otra vez
        if (viaKeyboard) pendingFocusRef.current = { kind: 'cable', row: cableRow };
      }
    },
    [layout, select]
  );

  // Foco tras conectar (los botones conectados se desactivan y perderían el foco)
  useLayoutEffect(() => {
    const target = pendingFocusRef.current;
    if (!target) return;
    pendingFocusRef.current = null;
    if (target.kind === 'done') doneRef.current?.focus({ preventScroll: true });
    else if (target.kind === 'cable') cableRefs.current[target.row]?.focus({ preventScroll: true });
  });

  // Celebración y éxito (una sola vez; el temporizador se cancela si nos desmontan)
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

  // Escape suelta primero el cable que llevas (y solo después cierra la ventana). Va con un oyente
  // nativo porque la ventana (ui/Modal.jsx) escucha Escape en su <section>, antes que React.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const d = dragRef.current;
      if (!selectedRef.current && !d) return;
      e.stopPropagation();
      e.preventDefault();
      if (d) {
        dragRef.current = null;
        setDrag(null);
        setHoverSocket(null);
        try {
          if (boardRef.current?.hasPointerCapture?.(d.id)) boardRef.current.releasePointerCapture(d.id);
        } catch {
          /* ya liberada */
        }
      }
      clearSelection();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [clearSelection]);

  const selectCable = (type) => {
    const c = CABLE_TYPES[type];
    select({ kind: 'cable', type });
    sfx.play('click');
    setMsg({
      kind: 'hold',
      es: `Llevas el cable ${c.glyph} ${c.word.es}: toca su enchufe ${c.glyph}.`,
      en: `You’re holding the ${c.glyph} ${c.word.en} cable: tap its ${c.glyph} socket.`
    });
  };

  /** Pulsar un cable (toque, teclado o lector de pantalla). */
  const activateCable = (row, viaKeyboard) => {
    if (done) return;
    const type = layout.left[row];
    if (connectedRef.current[type]) return;
    const sel = selectedRef.current;
    if (sel?.kind === 'socket') return tryConnect(type, sel.row, { viaKeyboard });
    if (sel?.kind === 'cable' && sel.type === type) return clearSelection(); // segundo toque: lo suelta
    selectCable(type);
  };

  /** Pulsar un enchufe. */
  const activateSocket = (row, viaKeyboard) => {
    if (done) return;
    if (connectedRef.current[layout.right[row]]) return;
    const sel = selectedRef.current;
    if (sel?.kind === 'cable') return tryConnect(sel.type, row, { viaKeyboard });
    if (sel?.kind === 'socket' && sel.row === row) return clearSelection();
    const st = CABLE_TYPES[layout.right[row]];
    select({ kind: 'socket', row });
    sfx.play('click');
    setMsg({ kind: 'socket', es: `Enchufe ${st.glyph} ${st.word.es} elegido: ahora toca su cable.`, en: `${st.glyph} ${st.word.en} socket chosen: now tap its cable.` });
  };

  // Los clicks que llegan justo después de un toque/arrastre ya se trataron con eventos de puntero
  const isPointerClick = (e) => e.detail > 0 && performance.now() - lastPointerUpRef.current < CLICK_GUARD_MS;

  // ---------- arrastrar desde un cable ----------
  const toBoard = (e) => {
    const el = boardRef.current;
    const r = el.getBoundingClientRect();
    const k = r.width ? el.offsetWidth / r.width : 1; // por si la ventana se anima con scale()
    return { x: (e.clientX - r.left) * k - el.clientLeft, y: (e.clientY - r.top) * k - el.clientTop };
  };

  const socketAt = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.('[data-socket]');
    if (!el || !boardRef.current?.contains(el)) return null;
    const row = Number(el.dataset.socket);
    return Number.isInteger(row) ? row : null;
  };

  const onCablePointerDown = (row) => (e) => {
    if (done || dragRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const type = layout.left[row];
    if (connectedRef.current[type]) return;
    e.preventDefault();
    try {
      boardRef.current.setPointerCapture(e.pointerId);
    } catch {
      /* sin captura también funciona (peor si el dedo sale del tablero) */
    }
    const sel = selectedRef.current;
    if (sel?.kind === 'socket') {
      // Ya había un enchufe elegido: este toque completa la pareja
      dragRef.current = { id: e.pointerId, row, type, sx: e.clientX, sy: e.clientY, moved: false, pairWithSocket: sel.row };
      return;
    }
    const wasSelected = sel?.kind === 'cable' && sel.type === type;
    dragRef.current = { id: e.pointerId, row, type, sx: e.clientX, sy: e.clientY, moved: false, wasSelected, pairWithSocket: null };
    if (!wasSelected) selectCable(type);
  };

  const onBoardPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId || d.pairWithSocket != null) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > DRAG_SLOP_PX) d.moved = true;
    if (!d.moved) return;
    const p = toBoard(e);
    setDrag({ type: d.type, x: p.x, y: p.y });
    const over = socketAt(e.clientX, e.clientY);
    setHoverSocket((h) => (h === over ? h : over));
  };

  const finishDrag = (e, completed) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    lastPointerUpRef.current = performance.now();
    setDrag(null);
    setHoverSocket(null);
    try {
      if (boardRef.current?.hasPointerCapture?.(e.pointerId)) boardRef.current.releasePointerCapture(e.pointerId);
    } catch {
      /* ya liberada */
    }
    if (!completed) return;
    if (d.pairWithSocket != null) return tryConnect(d.type, d.pairWithSocket);
    if (d.moved) {
      lastDragDropRef.current = performance.now();
      const row = socketAt(e.clientX, e.clientY);
      if (row != null) tryConnect(d.type, row);
      // soltado fuera de un enchufe: el cable sigue en la mano para tocar el enchufe después
      return;
    }
    if (d.wasSelected) clearSelection(); // segundo toque sobre el mismo cable: lo suelta
  };

  // ---------- teclado: flechas entre cables y enchufes ----------
  const onKeyNav = (kind, row) => (e) => {
    const list = kind === 'cable' ? cableRefs.current : socketRefs.current;
    const other = kind === 'cable' ? socketRefs.current : cableRefs.current;
    const enabled = (arr, r) => arr[r] && !arr[r].disabled;
    let target = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const step = e.key === 'ArrowDown' ? 1 : -1;
      for (let k = 1; k < N && !target; k++) {
        const r = (((row + step * k) % N) + N) % N;
        if (enabled(list, r)) target = list[r];
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const goingOther = (kind === 'cable') === (e.key === 'ArrowRight');
      if (goingOther) {
        // la fila más cercana que siga libre en la otra columna
        for (let k = 0; k < N && !target; k++) {
          for (const r of [row + k, row - k]) if (!target && r >= 0 && r < N && enabled(other, r)) target = other[r];
        }
      }
    }
    if (target) {
      e.preventDefault();
      target.focus();
    }
  };

  // ---------- textos ----------
  const progress = t({ es: `${count} de ${N} cables conectados`, en: `${count} of ${N} cables connected` });
  const statusKind = done ? 'done' : (msg?.kind ?? 'idle');
  const statusText = done ? `${t(TXT.repaired)} ${t(TXT.canCharge)}` : msg ? `${t(msg)} · ${progress}` : progress;

  const selectedCableType = selected?.kind === 'cable' ? selected.type : null;
  const hintRow = selectedCableType != null && misses[selectedCableType] >= HINT_AFTER ? rowOfSocket(selectedCableType) : null;
  const rootClass = ['mg-root', 'mg-cables-game', reduced && 'mg-reduced', done && 'mg-is-done'].filter(Boolean).join(' ');
  const boardClass = ['mg-cr-board', geo.narrow && 'mg-cr-narrow', drag && 'mg-is-dragging', selected && 'mg-is-holding'].filter(Boolean).join(' ');
  const boardVars = { '--mg-cable-w': `${geo.cableW * 100}%`, '--mg-socket-left': `${geo.socketLeft * 100}%`, '--mg-hole': `${geo.holePx}px` };

  return (
    <div ref={rootRef} className={rootClass}>
      <p className="mg-instr">
        <span className="mg-instr-icon" aria-hidden="true">
          🔧
        </span>
        <span className="mg-instr-text">{t(TXT.instr)}</span>
        <span className="mg-kbd">⌨️ {t(TXT.kbd)}</span>
      </p>

      <div className="mg-cr-cabinet">
        <div className="mg-cr-head">
          <span className="mg-cr-shield" aria-hidden="true">
            🛡️
          </span>
          <span className="mg-cr-title">
            <span aria-hidden="true">{done ? '⚡ ' : '⚠️ '}</span>
            {done ? t(TXT.repaired) : t(TXT.noPower)}
          </span>
          <span className="mg-cr-leds" aria-hidden="true">
            {CABLE_TYPES.map((c, i) => (
              <span key={c.id} className={`mg-led${connected[i] ? ' mg-is-on' : ''}`}>
                {connected[i] ? '✓' : ''}
              </span>
            ))}
          </span>
          <span className="mg-cr-count" aria-hidden="true">
            {count}/{N}
          </span>
        </div>

        <div
          ref={boardRef}
          className={boardClass}
          style={boardVars}
          role="group"
          aria-label={t(TXT.board)}
          onPointerMove={onBoardPointerMove}
          onPointerUp={(e) => finishDrag(e, true)}
          onPointerCancel={(e) => finishDrag(e, false)}
          onLostPointerCapture={(e) => finishDrag(e, false)}
        >
          {/* Cables ya conectados: por debajo de cables y enchufes (entran "dentro" del enchufe) */}
          <svg className="mg-cr-wires" viewBox={`0 0 ${box.w} ${box.h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
            {CABLE_TYPES.map((c, type) => {
              if (!connected[type]) return null;
              const y2 = rowY(rowOfSocket(type));
              const d = wirePath(tipX - 16, rowY(rowOfCable(type)), socketX + 8, y2);
              return (
                <g key={c.id} className="mg-wire">
                  <path d={d} className="mg-wire-edge" pathLength="1" />
                  <path d={d} className="mg-wire-core" style={{ stroke: c.color }} pathLength="1" />
                  <path d={d} className="mg-wire-flow" pathLength="100" />
                </g>
              );
            })}
          </svg>

          {/* Cables rotos (izquierda) */}
          <div className="mg-cr-col" role="group" aria-label={t(TXT.cables)}>
            {layout.left.map((type, row) => {
              const c = CABLE_TYPES[type];
              const isOn = connected[type];
              const isSel = selectedCableType === type;
              const isWrong = wrong?.cableRow === row;
              const cls = ['mg-cable', isOn && 'mg-is-connected', isSel && 'mg-is-selected', isWrong && 'mg-is-wrong', justConnected === type && 'mg-is-fresh']
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={c.id}
                  ref={(el) => {
                    cableRefs.current[row] = el;
                  }}
                  type="button"
                  className={cls}
                  style={{ top: `${((row + 0.5) / N) * 100}%`, '--c': c.color, '--row': row }}
                  disabled={isOn}
                  aria-pressed={isSel}
                  aria-label={t({
                    es: `Cable ${c.word.es}, ${c.shapeName.es}${isOn ? ', conectado' : ''}`,
                    en: `${c.word.en} cable, ${c.shapeName.en}${isOn ? ', connected' : ''}`
                  })}
                  onPointerDown={onCablePointerDown(row)}
                  onClick={(e) => !isPointerClick(e) && activateCable(row, true)}
                  onKeyDown={onKeyNav('cable', row)}
                >
                  {/* El cuerpo visual se vuelve a montar en cada error para repetir el temblor */}
                  <span key={isWrong ? `w${wrong.n}` : 'idle'} className="mg-cable-body" aria-hidden="true">
                    <span className="mg-cable-wire" />
                    <span className="mg-cable-tag">
                      <CableSymbol type={type} size={geo.narrow ? 16 : 20} fill={INK} />
                      <span className="mg-cable-word">{t(c.word)}</span>
                      {isOn && <span className="mg-cable-ok">✓</span>}
                    </span>
                    <span className="mg-cable-tip">
                      <svg viewBox="0 0 24 24" width="24" height="24" focusable="false">
                        <path d="M1 9 L10 6 M1 12 L12 12 M1 15 L10 18 M4 10 L13 3 M4 14 L13 21" stroke="#e7a35a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                      </svg>
                    </span>
                    {!isOn && <span className="mg-cable-fizz" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Enchufes (derecha) */}
          <div className="mg-cr-col" role="group" aria-label={t(TXT.sockets)}>
            {layout.right.map((type, row) => {
              const c = CABLE_TYPES[type];
              const isOn = connected[type];
              const isSel = selected?.kind === 'socket' && selected.row === row;
              const isWrong = wrong?.socketRow === row;
              const isHint = hintRow === row && !isOn;
              const cls = [
                'mg-socket',
                isOn && 'mg-is-connected',
                isSel && 'mg-is-selected',
                isWrong && 'mg-is-wrong',
                hoverSocket === row && 'mg-is-target',
                selectedCableType != null && !isOn && 'mg-is-waiting',
                isHint && 'mg-is-hint',
                justConnected === type && 'mg-is-fresh'
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <button
                  key={c.id}
                  ref={(el) => {
                    socketRefs.current[row] = el;
                  }}
                  type="button"
                  className={cls}
                  style={{ top: `${((row + 0.5) / N) * 100}%`, '--c': c.color }}
                  data-socket={row}
                  disabled={isOn}
                  aria-pressed={isSel}
                  aria-label={t({
                    es: `Enchufe ${c.word.es}, ${c.shapeName.es}${isOn ? ', conectado' : ''}`,
                    en: `${c.word.en} socket, ${c.shapeName.en}${isOn ? ', connected' : ''}`
                  })}
                  // Los enchufes no se arrastran: el click sirve para ratón, toque, teclado y lector de pantalla.
                  // (Si algún navegador manda un click al soltar un arrastre aquí, ya se trató en pointerup.)
                  onClick={(e) => {
                    if (e.detail > 0 && performance.now() - lastDragDropRef.current < CLICK_GUARD_MS) return;
                    activateSocket(row, e.detail === 0);
                  }}
                  onKeyDown={onKeyNav('socket', row)}
                >
                  <span key={isWrong ? `w${wrong.n}` : 'idle'} className="mg-socket-body" aria-hidden="true">
                    <span className="mg-socket-hole">
                      <CableSymbol type={type} size={geo.narrow ? 18 : 24} />
                    </span>
                    <span className="mg-socket-word">{t(c.word)}</span>
                    {isOn && <span className="mg-socket-ok">✓</span>}
                    {isWrong && <span className="mg-socket-x">✕</span>}
                    {isHint && <span className="mg-socket-hint">👈</span>}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cable que se está arrastrando: por encima de todo (dibujo, sin eventos) */}
          {drag && (
            <svg className="mg-cr-live" viewBox={`0 0 ${box.w} ${box.h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <g className="mg-wire mg-is-live">
                <path d={wirePath(tipX - 16, rowY(rowOfCable(drag.type)), drag.x, drag.y)} className="mg-wire-edge" />
                <path d={wirePath(tipX - 16, rowY(rowOfCable(drag.type)), drag.x, drag.y)} className="mg-wire-core" style={{ stroke: CABLE_TYPES[drag.type].color }} />
                <circle cx={drag.x} cy={drag.y} r="12" className="mg-wire-plug" style={{ fill: CABLE_TYPES[drag.type].color }} />
              </g>
            </svg>
          )}

          {/* Chispas en el enchufe equivocado */}
          {wrong && (
            <span key={wrong.n} className="mg-spark" style={{ left: holeX, top: rowY(wrong.socketRow) }} aria-hidden="true">
              {Array.from({ length: 8 }, (_, k) => (
                <span key={k} className="mg-spark-ray" style={{ '--a': `${k * 45 + 10}deg` }} />
              ))}
            </span>
          )}

          {done && (
            <div ref={doneRef} className="mg-done-banner" tabIndex={-1}>
              <span aria-hidden="true">⚡🛡️</span> {t(TXT.repaired)}
            </div>
          )}
        </div>
      </div>

      <p className="mg-status" aria-live="polite">
        <span className="mg-status-icon" aria-hidden="true">
          {STATUS_ICON[statusKind]}
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
