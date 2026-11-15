// Minijuego "Expedición con el Rover": auto-runner lateral en <canvas>. El Rover avanza solo;
// el niño solo controla el SALTO (Espacio / ↑ / W / clic o toque en la pista / botón SALTAR).
//
//   <RoverRun zone={1|2|3} roverLevel={1..3} seed="LUNA-4821" reducedMotion onFinish={(r) => …} onCancel={…} />
//
// Pantallas: intro → cuenta atrás 3-2-1 (saltable) → carrera (pausa con P / Esc / botón) → final.
//  · onCancel(): solo desde la intro (antes de arrancar; no cuesta nada en el juego).
//  · onFinish(result): una sola vez, al pulsar "Volver a la base" en la pantalla final.
//    result = { completed, emergency, aborted, collected: { ice, metal, samples }, collisions, batteryLeft, progress, zone }
//
// La lógica vive en engine.js (pura, con pruebas) y el dibujo en draw.js. Aquí solo hay pantallas,
// entrada (teclado / puntero / táctil), el bucle con paso fijo y el HUD accesible en el DOM.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { sfx } from '../audio/sfx.js';
import { useI18n } from '../i18n.jsx';
import RichText from '../ui/components/RichText.jsx';
import {
  CRITICAL_PCT,
  DEFAULT_SEED,
  ITEM_KINDS,
  PHYS,
  RESERVE_PCT,
  ZONES,
  abortRun,
  batteryPct,
  clampLevel,
  clampZone,
  coastStep,
  createRun,
  generateTrack,
  progressOf,
  runResult,
  stepRun,
  zonePlan
} from './engine.js';
import { createFx, createScene, drawScene, drawStill, fitCanvas, fxEvent, fxTick } from './draw.js';
import './rover.css';

const COUNTDOWN_S = 3;
const GO_FLASH_S = 0.7;
const ENDING_S = { goal: 1.7, emergency: 2.4 };
const MAX_STEPS_PER_FRAME = 24; // 0,2 s de simulación como mucho por fotograma

const ITEM_ICON = { ice: '🧊', metal: '🔩', samples: '🪨' };

const pct = (n, lang) => (lang === 'es' ? `${n} %` : `${n}%`);

// ---------------------------------------------------------------- textos (es / en)

const TXT = {
  zone: (z) => ({ es: `Zona ${z}`, en: `Zone ${z}` }),
  simTag: { es: 'SIMULADO', en: 'SIMULATED' },
  simNote: { es: 'El camino y los objetos los inventa el juego. La ciencia es real.', en: 'The game invents the path and the items. The science is real.' },
  goalTitle: { es: 'Objetivo', en: 'Goal' },
  goal: (s) => ({
    es: `Llega a la bandera 🏁 y recoge hielo 🧊, metal 🔩 y muestras de ${s.es} 🪨.`,
    en: `Reach the flag 🏁 and pick up ice 🧊, metal 🔩 and ${s.en} samples 🪨.`
  }),
  controlsTitle: { es: 'Cómo se juega', en: 'How to play' },
  controls: {
    es: 'El Rover avanza solo. Tú solo **saltas**: Espacio, ↑, W, un clic en la pista o el botón SALTAR. Mantén pulsado para saltar un poco más alto. Salta los cráteres y las rocas.',
    en: 'The Rover drives by itself. You only **jump**: Space, ↑, W, a click on the track or the JUMP button. Hold it to jump a bit higher. Jump over craters and rocks.'
  },
  gravityTitle: { es: 'Gravedad lunar', en: 'Lunar gravity' },
  gravity: {
    es: 'En la Luna la [[lunar-gravity|gravedad]] es 1/6 de la de la Tierra: pesas 6 veces menos y los saltos son lentos y larguísimos.',
    en: 'On the Moon, [[lunar-gravity|gravity]] is 1/6 of Earth’s: you weigh 6 times less, and jumps are slow and super long.'
  },
  batteryTitle: { es: 'Batería', en: 'Battery' },
  battery: (p, lang) => ({
    es: `La [[battery|batería]] se gasta al avanzar: este viaje usa el **${pct(p.use, lang)}** y te deja **${pct(p.margin, lang)}** de margen. Cada choque gasta otro **${pct(p.hit, lang)}** (aguantas unos **${p.hits} choques**). Si llega a 0, el Rover vuelve en modo emergencia y pierdes la mitad de lo recogido.`,
    en: `The [[battery]] drains as you drive: this trip uses **${pct(p.use, lang)}** and leaves you a **${pct(p.margin, lang)}** margin. Each crash costs another **${pct(p.hit, lang)}** (you can take about **${p.hits} crashes**). If it hits 0, the Rover comes back in emergency mode and you lose half of what you collected.`
  }),
  planUse: { es: 'Viaje', en: 'Trip' },
  planMargin: { es: 'Margen', en: 'Margin' },
  planLabel: (p, lang) => ({
    es: `Plan de batería: el viaje usa ${pct(p.use, lang)} y quedan ${pct(p.margin, lang)} de margen.`,
    en: `Battery plan: the trip uses ${pct(p.use, lang)} and leaves a ${pct(p.margin, lang)} margin.`
  }),
  roverBattery: (lv, cap) => ({ es: `Tu Rover (nivel ${lv}) lleva una batería de ${cap}.`, en: `Your Rover (level ${lv}) has a battery of ${cap}.` }),
  locked: (lv, z) => ({
    es: `⚠️ Esta zona pide un Rover de nivel ${z} y el tuyo es de nivel ${lv}: la batería no llega. Mejóralo en el garaje.`,
    en: `⚠️ This zone needs a level ${z} Rover and yours is level ${lv}: the battery will not last. Upgrade it in the garage.`
  }),
  start: { es: '¡Arrancar!', en: 'Start!' },
  back: { es: 'Volver', en: 'Back' },
  backNote: { es: 'Volver ahora no cuesta nada.', en: 'Going back now costs nothing.' },
  previewLabel: (z) => ({ es: `Vista de la zona ${z} con el Rover en la salida`, en: `View of zone ${z} with the Rover at the start` }),
  // HUD
  batteryLabel: { es: 'Batería del Rover', en: 'Rover battery' },
  batteryText: (n, low, lang) => ({
    es: `${pct(n, lang)}${low ? ', en la reserva' : ''}`,
    en: `${pct(n, lang)}${low ? ', in the reserve' : ''}`
  }),
  reserveMark: (lang) => ({ es: `Reserva ${pct(RESERVE_PCT, lang)}`, en: `Reserve ${pct(RESERVE_PCT, lang)}` }),
  progressLabel: { es: 'Camino hasta la bandera', en: 'Way to the flag' },
  itemsLabel: { es: 'Recogido', en: 'Collected' },
  item: { ice: { es: 'Hielo', en: 'Ice' }, metal: { es: 'Metal', en: 'Metal' }, samples: { es: 'Muestras', en: 'Samples' } },
  pauseBtn: { es: 'Pausa (P o Esc)', en: 'Pause (P or Esc)' },
  stageLabel: { es: 'Pista del Rover. Pulsa Espacio, flecha arriba o toca para saltar.', en: 'Rover track. Press Space, up arrow or tap to jump.' },
  keys: { es: 'Saltar: Espacio · ↑ · W · clic · Pausa: P · Esc', en: 'Jump: Space · ↑ · W · click · Pause: P · Esc' },
  jump: { es: 'SALTAR', en: 'JUMP' },
  jumpLabel: { es: 'Saltar (mantén para saltar más alto)', en: 'Jump (hold to jump higher)' },
  // Cuenta atrás y pausa
  ready: { es: '¡Prepárate! Tú solo saltas.', en: 'Get ready! You only jump.' },
  skipCount: { es: 'Empezar ya', en: 'Start now' },
  go: { es: '¡YA!', en: 'GO!' },
  pausedTitle: { es: 'Pausa', en: 'Paused' },
  pausedText: { es: 'El Rover espera quieto: la batería no se gasta.', en: 'The Rover waits: the battery does not drain.' },
  resume: { es: 'Continuar', en: 'Continue' },
  abort: { es: 'Abortar la misión', en: 'Abort the mission' },
  abortNote: {
    es: 'Si abortas, el Rover vuelve en modo emergencia y pierdes la mitad de lo recogido.',
    en: 'If you abort, the Rover comes back in emergency mode and you lose half of what you collected.'
  },
  // Avisos para lectores de pantalla
  got: (k) => ({
    ice: { es: '🧊 +1 hielo', en: '🧊 +1 ice' },
    metal: { es: '🔩 +1 metal', en: '🔩 +1 metal' },
    samples: { es: '🪨 +1 muestra', en: '🪨 +1 sample' }
  })[k],
  hitSay: (lang) => ({ es: `💥 ¡Choque! −${pct(5, lang)} de batería`, en: `💥 Crash! −${pct(5, lang)} battery` }),
  lowSay: { es: '⚠️ Batería en la reserva', en: '⚠️ Battery in the reserve' },
  criticalSay: { es: '⚠️ ¡Batería casi vacía!', en: '⚠️ Battery almost empty!' },
  goalSay: { es: '🏁 ¡Meta!', en: '🏁 Finish!' },
  emptySay: { es: '🚨 Batería agotada', en: '🚨 Battery empty' },
  // Final
  bannerGoal: { es: '🏁 ¡Meta!', en: '🏁 Finish!' },
  bannerEmpty: { es: '🚨 ¡Batería agotada!', en: '🚨 Battery empty!' },
  endGoal: { es: '¡Llegaste a la meta!', en: 'You reached the flag!' },
  endEmergency: { es: 'Regreso de emergencia', en: 'Emergency return' },
  endAborted: { es: 'Misión abortada', en: 'Mission aborted' },
  msgGoal: { es: 'El Rover vuelve a la base con todo lo que recogiste.', en: 'The Rover drives back to base with everything you collected.' },
  msgEmergency: {
    es: 'La batería se agotó: el rover vuelve en modo emergencia. Pierdes la mitad de lo recogido, pero tú estás a salvo.',
    en: 'The battery ran out: the rover comes back in emergency mode. You lose half of what you collected, but you are safe.'
  },
  msgAborted: {
    es: 'Has pedido volver: el rover vuelve en modo emergencia. Pierdes la mitad de lo recogido, pero tú estás a salvo.',
    en: 'You asked to come back: the rover returns in emergency mode. You lose half of what you collected, but you are safe.'
  },
  lootTitle: { es: 'Te llevas a la base', en: 'You bring back to base' },
  found: (n) => ({ es: `de ${n}`, en: `of ${n}` }),
  lost: (n) => ({ es: `pierdes ${n}`, en: `you lose ${n}` }),
  statBattery: { es: 'Batería que queda', en: 'Battery left' },
  statHits: { es: 'Choques', en: 'Crashes' },
  statProgress: { es: 'Camino recorrido', en: 'Distance covered' },
  hitsCost: (n, lang) => ({ es: `(−${pct(n * 5, lang)})`, en: `(−${pct(n * 5, lang)})` }),
  home: { es: 'Volver a la base', en: 'Back to base' },
  endArt: { es: 'El Rover al terminar la expedición', en: 'The Rover at the end of the expedition' }
};

// Datos científicos de cada zona (con palabras del glosario)
const FACTS = {
  1: {
    es: 'En el [[south-pole|polo sur]] de la Luna el Sol nunca sube alto: va rozando el horizonte y las sombras son larguísimas. Las rocas claras son [[anorthosite|anortosita]], la piedra de las tierras altas lunares.',
    en: 'At the Moon’s [[south-pole|south pole]] the Sun never climbs high: it skims the horizon and shadows are super long. The bright rocks are [[anorthosite]], the stone of the lunar highlands.'
  },
  2: {
    es: 'Esta cresta une el [[crater|cráter]] Shackleton con su vecino, el cráter de Gerlache. Aquí abunda la [[breccia|brecha de impacto]]: trocitos de roca rotos y pegados por el golpe de un meteorito.',
    en: 'This ridge links Shackleton [[crater]] with its neighbour, de Gerlache crater. It is full of [[breccia|impact breccia]]: bits of broken rock glued together by a meteorite strike.'
  },
  3: {
    es: 'Al fondo de un [[psr|cráter en sombra permanente]] nunca llega el Sol: hace más de 200 °C bajo cero y el [[water-ice|hielo de agua]] puede llevar ahí miles de millones de años.',
    en: 'Sunlight never reaches the bottom of a [[psr|permanently shadowed crater]]: it is colder than −200 °C, and [[water-ice|water ice]] may have been there for billions of years.'
  }
};

// Una frase de lección al terminar
const LESSONS = {
  perfect: {
    es: '¡Conducción perfecta! Llegaste con todo tu margen de [[battery|batería]]: así planean sus viajes los equipos de un [[rover]].',
    en: 'Perfect driving! You arrived with your whole [[battery]] margin: that is how [[rover]] teams plan their trips.'
  },
  hits: {
    es: 'Cada choque gastó [[battery|batería]] extra. Para eso sirve el margen de seguridad: para los imprevistos.',
    en: 'Each crash used extra [[battery]]. That is what the safety margin is for: surprises.'
  },
  emergency: {
    es: 'Sin margen no hay vuelta: por eso los rovers de verdad guardan [[battery|batería]] de reserva. Un Rover mejorado lleva más batería y más margen.',
    en: 'No margin, no way home: that is why real rovers keep reserve [[battery]] power. An upgraded Rover carries more battery and more margin.'
  },
  aborted: {
    es: 'Volver a tiempo también es una buena decisión de astronauta: lo primero es estar a salvo.',
    en: 'Turning back in time is a good astronaut decision too: safety comes first.'
  }
};

// ---------------------------------------------------------------- utilidades

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

function hudOf(s, track) {
  const exact = batteryPct(s);
  let battery = Math.round(exact);
  if (battery === 0 && exact > 0) battery = 1; // no mostrar 0 % mientras aún queda algo
  return {
    battery,
    progress: Math.floor(progressOf(s, track) * 100),
    ice: s.collected.ice,
    metal: s.collected.metal,
    samples: s.collected.samples,
    low: exact < RESERVE_PCT - 1e-6,
    critical: exact < CRITICAL_PCT
  };
}

const sameHud = (a, b) => !!a && !!b && Object.keys(a).every((k) => a[k] === b[k]);

/** Lienzo con un fotograma quieto (vista previa en la intro y en el final). */
function StillCanvas({ scene, sim, hazard = false, label, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !sim) return undefined;
    const draw = () => drawStill(canvas, scene, sim, { hazard });
    draw();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    ro?.observe(canvas);
    return () => ro?.disconnect();
  }, [scene, sim, hazard]);
  return <canvas ref={ref} className={className} role="img" aria-label={label} />;
}

// ---------------------------------------------------------------- componente público

/** Se reinicia por completo si cambian la zona, el nivel o la semilla. */
export default function RoverRun(props) {
  const zone = clampZone(props.zone ?? 1);
  const roverLevel = clampLevel(props.roverLevel ?? 1);
  const seed = props.seed == null || props.seed === '' ? DEFAULT_SEED : String(props.seed);
  return <RoverRunGame key={`${seed}|${zone}|${roverLevel}`} {...props} zone={zone} roverLevel={roverLevel} seed={seed} />;
}

function RoverRunGame({ zone, roverLevel, seed, reducedMotion = false, onFinish, onCancel }) {
  const { t, lang } = useI18n();
  const reduced = usePrefersReducedMotion() || !!reducedMotion;
  const track = useMemo(() => generateTrack(seed, zone), [seed, zone]);
  const scene = useMemo(() => createScene(track), [track]);
  const plan = useMemo(() => zonePlan(zone, roverLevel), [zone, roverLevel]);
  const previewSim = useMemo(() => createRun(track, roverLevel), [track, roverLevel]);
  const hintId = useId();
  const pauseTitleId = useId();

  // intro | countdown | run | paused | ending | end
  const [screen, setScreen] = useState('intro');
  const [hud, setHud] = useState(() => hudOf(previewSim, track));
  const [count, setCount] = useState(COUNTDOWN_S);
  const [goFlash, setGoFlash] = useState(false);
  const [summary, setSummary] = useState(null); // { result, found, sim }
  const [announce, setAnnounce] = useState('');

  const rootRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const jumpRef = useRef(null);
  const continueRef = useRef(null);
  const endTitleRef = useRef(null);
  const screenRef = useRef('intro'); // copia "al momento" para el bucle y los manejadores
  const simRef = useRef(null);
  const fxRef = useRef(null);
  const loopRef = useRef({ acc: 0, alpha: 1, countdown: COUNTDOWN_S, lastCount: COUNTDOWN_S, ending: 0, go: 0 });
  const inputRef = useRef({ sources: new Set(), presses: 0 });
  const hudRef = useRef(null);
  const resultRef = useRef(null);
  const finishedRef = useRef(false);
  const sayRef = useRef(0);
  // Últimos valores de props y ajustes para el bucle (evita cierres "viejos" en requestAnimationFrame)
  const latest = useRef({ onFinish, onCancel, t, lang, reduced });
  useEffect(() => {
    latest.current = { onFinish, onCancel, t, lang, reduced };
  });

  const go = useCallback((next) => {
    screenRef.current = next;
    setScreen(next);
  }, []);

  const say = useCallback((text) => {
    sayRef.current += 1;
    // El carácter invisible alterno hace que se repita el aviso aunque el texto sea igual
    setAnnounce(`${latest.current.t(text)}${sayRef.current % 2 ? '​' : ''}`);
  }, []);

  // ---------- entrada: varias fuentes (teclas, dedos, botón) pueden mantener el salto ----------
  const clearInput = useCallback(() => {
    inputRef.current.sources.clear();
    inputRef.current.presses = 0;
    jumpRef.current?.classList.remove('is-pressed');
  }, []);
  const press = useCallback((src) => {
    const inp = inputRef.current;
    if (inp.sources.has(src)) return;
    inp.sources.add(src);
    inp.presses += 1;
  }, []);
  const release = useCallback((src) => {
    inputRef.current.sources.delete(src);
  }, []);

  const pushHud = useCallback(() => {
    const s = simRef.current;
    if (!s) return;
    const next = hudOf(s, track);
    if (sameHud(next, hudRef.current)) return;
    hudRef.current = next;
    setHud(next);
  }, [track]);

  // ---------- transiciones ----------
  const start = useCallback(() => {
    if (screenRef.current !== 'intro') return;
    sfx.play('click');
    simRef.current = createRun(track, roverLevel);
    fxRef.current = createFx();
    loopRef.current = { acc: 0, alpha: 1, countdown: COUNTDOWN_S, lastCount: COUNTDOWN_S, ending: 0, go: 0 };
    resultRef.current = null;
    hudRef.current = null;
    clearInput();
    setCount(COUNTDOWN_S);
    pushHud();
    go('countdown');
  }, [track, roverLevel, clearInput, pushHud, go]);

  const beginRun = useCallback(() => {
    if (screenRef.current !== 'countdown') return;
    clearInput(); // el toque que salta la cuenta atrás no cuenta como salto
    loopRef.current.acc = 0;
    loopRef.current.go = GO_FLASH_S;
    setGoFlash(true);
    sfx.play('power');
    go('run');
  }, [clearInput, go]);

  const pause = useCallback(() => {
    if (screenRef.current !== 'run') return;
    clearInput();
    sfx.play('click');
    go('paused');
  }, [clearInput, go]);

  const resume = useCallback(() => {
    if (screenRef.current !== 'paused') return;
    clearInput();
    sfx.play('click');
    go('run');
  }, [clearInput, go]);

  const settle = useCallback(() => {
    const s = simRef.current;
    const result = runResult(s, track);
    resultRef.current = result;
    setSummary({ result, found: { ...s.collected }, sim: { ...s, prevX: s.x, prevY: s.y } });
    pushHud();
    clearInput();
    return result;
  }, [track, pushHud, clearInput]);

  const endRun = useCallback(() => {
    if (resultRef.current || !simRef.current) return;
    settle();
    loopRef.current.ending = 0;
    go('ending');
  }, [settle, go]);

  const showEnd = useCallback(() => {
    if (screenRef.current !== 'ending') return;
    const s = simRef.current;
    if (s) Object.assign(s, { prevX: s.x, prevY: s.y });
    setSummary((prev) => (prev && s ? { ...prev, sim: { ...s } } : prev));
    go('end');
  }, [go]);

  const abort = useCallback(() => {
    const s = simRef.current;
    if (!s || screenRef.current !== 'paused') return;
    abortRun(s);
    s.events.length = 0;
    sfx.play('error');
    settle();
    go('end');
  }, [settle, go]);

  const finish = useCallback(() => {
    if (finishedRef.current || !resultRef.current) return;
    finishedRef.current = true;
    sfx.play('click');
    latest.current.onFinish?.({ ...resultRef.current, collected: { ...resultRef.current.collected } });
  }, []);

  const cancel = useCallback(() => {
    if (screenRef.current !== 'intro') return;
    sfx.play('click');
    latest.current.onCancel?.();
  }, []);

  // ---------- bucle: paso fijo (120 Hz) + dibujo con requestAnimationFrame ----------
  const stageOn = screen === 'countdown' || screen === 'run' || screen === 'paused' || screen === 'ending';

  useEffect(() => {
    if (!stageOn) return undefined;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!stage || !canvas || !ctx) return undefined;
    let raf = 0;
    let last = performance.now();
    let view = fitCanvas(canvas);
    let dpr = window.devicePixelRatio || 1;

    const render = () => {
      const s = simRef.current;
      const fx = fxRef.current;
      if (!s || !fx || !view.w) return;
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      drawScene(ctx, view, scene, s, fx, { alpha: loopRef.current.alpha, reduced: latest.current.reduced });
    };
    const resize = () => {
      view = fitCanvas(canvas);
      render(); // redibuja nítido enseguida (también en pausa)
    };

    const onEvent = (ev, s) => {
      fxEvent(fxRef.current, ev, s, track, latest.current.reduced);
      switch (ev.type) {
        case 'jump':
          sfx.play('jump');
          break;
        case 'collect':
          sfx.play('collect');
          say(TXT.got(ev.kind));
          break;
        case 'hit':
          sfx.play('hit');
          say(TXT.hitSay(latest.current.lang));
          break;
        case 'low':
          sfx.play('alarm'); // una sola vez por carrera (el motor solo lo avisa una vez)
          say(TXT.lowSay);
          break;
        case 'critical':
          say(TXT.criticalSay);
          break;
        case 'goal':
          sfx.play('ok');
          say(TXT.goalSay);
          break;
        case 'empty':
          sfx.play('error');
          say(TXT.emptySay);
          break;
        default:
          break;
      }
    };
    const drain = (s) => {
      if (!s.events.length) return;
      const list = s.events.splice(0, s.events.length);
      for (const ev of list) onEvent(ev, s);
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); // tras volver a la pestaña, sin saltos
      last = now;
      if ((window.devicePixelRatio || 1) !== dpr) {
        dpr = window.devicePixelRatio || 1;
        view = fitCanvas(canvas);
      }
      const s = simRef.current;
      const fx = fxRef.current;
      if (!s || !fx) return;
      const L = loopRef.current;
      const reducedNow = latest.current.reduced;
      const phase = screenRef.current;

      if (phase === 'countdown') {
        L.countdown -= dt;
        const n = Math.max(0, Math.ceil(L.countdown));
        if (n !== L.lastCount) {
          L.lastCount = n;
          if (n > 0) {
            setCount(n);
            sfx.play('click');
          }
        }
        fxTick(fx, dt, s, track, { reduced: reducedNow, moving: false });
        if (L.countdown <= 0) beginRun();
      } else if (phase === 'run') {
        L.acc += dt;
        const inp = inputRef.current;
        let steps = 0;
        while (L.acc >= PHYS.dt && steps < MAX_STEPS_PER_FRAME && s.status === 'running') {
          const pressed = inp.presses > 0;
          inp.presses = 0;
          stepRun(s, track, { pressed, held: inp.sources.size > 0 });
          L.acc -= PHYS.dt;
          steps += 1;
          drain(s);
        }
        if (steps >= MAX_STEPS_PER_FRAME) L.acc = 0;
        L.alpha = s.status === 'running' ? Math.min(1, L.acc / PHYS.dt) : 1;
        fxTick(fx, dt, s, track, { reduced: reducedNow, moving: true });
        if (L.go > 0) {
          L.go -= dt;
          if (L.go <= 0) setGoFlash(false);
        }
        if (s.status !== 'running') endRun();
        else pushHud();
      } else if (phase === 'ending') {
        L.ending += dt;
        L.alpha = 1;
        coastStep(s, track, dt);
        fxTick(fx, dt, s, track, { reduced: reducedNow, moving: true });
        if (L.go > 0) {
          L.go -= dt;
          if (L.go <= 0) setGoFlash(false);
        }
        const wait = s.status === 'goal' ? ENDING_S.goal : ENDING_S.emergency;
        if (L.ending >= wait) showEnd();
      }
      // En pausa no se mueve nada: solo se vuelve a pintar el mismo fotograma
      render();
    };

    // ---------- teclado (en window: funciona aunque el foco esté en otro sitio del modal) ----------
    const isJumpKey = (e) => e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp' || e.code === 'KeyW' || e.key === 'w' || e.key === 'W';
    const isPauseKey = (e) => e.key === 'Escape' || e.key === 'Esc' || e.code === 'KeyP' || e.key === 'p' || e.key === 'P';
    const onButton = (e) => e.target instanceof Element && !!e.target.closest('button');
    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const phase = screenRef.current;
      const jumpKey = isJumpKey(e) || (e.key === 'Enter' && !onButton(e));
      if (phase === 'run') {
        if (jumpKey) {
          e.preventDefault(); // sin desplazar la ventana ni pulsar botones con Espacio
          if (!e.repeat) press(`k:${e.code || e.key}`);
        } else if (isPauseKey(e)) {
          e.preventDefault();
          pause();
        }
      } else if (phase === 'countdown') {
        if (jumpKey) {
          e.preventDefault();
          if (!e.repeat) beginRun();
        }
      } else if (phase === 'paused') {
        if (isPauseKey(e)) {
          e.preventDefault();
          resume();
        }
      } else if (phase === 'ending' && jumpKey) {
        e.preventDefault();
        if (!e.repeat) showEnd();
      }
    };
    const onKeyUp = (e) => {
      if (!(isJumpKey(e) || e.key === 'Enter')) return;
      release(`k:${e.code || e.key}`);
      const phase = screenRef.current;
      if (isJumpKey(e) && (phase === 'run' || phase === 'countdown' || phase === 'ending')) e.preventDefault();
    };
    // Pausa automática si la pestaña se oculta o la ventana pierde el foco (y nada se queda "pulsado")
    const onVisibility = () => {
      if (!document.hidden) return;
      if (screenRef.current === 'run') pause();
      else clearInput();
    };
    const onBlur = () => {
      if (screenRef.current === 'run') pause();
      else clearInput();
    };

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(stage);
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    // Si las fuentes llegan tarde, el "+1" del lienzo se repinta con la buena
    document.fonts?.ready?.then(() => render()).catch(() => {});
    raf = requestAnimationFrame(frame);
    render();

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInput();
    };
  }, [stageOn, scene, track, beginRun, endRun, showEnd, pause, resume, press, release, clearInput, pushHud, say]);

  // ---------- foco: que nunca se pierda fuera del modal ----------
  useEffect(() => {
    if (screen === 'paused') continueRef.current?.focus({ preventScroll: true });
    else if (screen === 'countdown' || screen === 'run') {
      const a = document.activeElement;
      const lost = !a || a === document.body || !rootRef.current?.contains(a);
      if (lost) stageRef.current?.focus({ preventScroll: true });
    } else if (screen === 'end') endTitleRef.current?.focus({ preventScroll: true });
  }, [screen]);

  // ---------- puntero: clic o toque en la pista = saltar (mantener = más alto) ----------
  const onStagePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest('[data-rover-ui]')) return; // botones de los paneles
    e.preventDefault(); // sin selección de texto, menú ni zoom; el foco lo ponemos nosotros
    stageRef.current?.focus({ preventScroll: true });
    const phase = screenRef.current;
    if (phase === 'countdown') return beginRun();
    if (phase === 'ending') return showEnd();
    if (phase !== 'run') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sin captura: seguimos igual */
    }
    press(`p:${e.pointerId}`);
  };
  const onStagePointerUp = (e) => release(`p:${e.pointerId}`);

  const onJumpDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault(); // el foco se queda en la pista (el teclado sigue funcionando)
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* sin captura */
    }
    e.currentTarget.classList.add('is-pressed');
    const phase = screenRef.current;
    if (phase === 'countdown') beginRun();
    else if (phase === 'run') press(`b:${e.pointerId}`);
  };
  const onJumpUp = (e) => {
    e.currentTarget.classList.remove('is-pressed');
    release(`b:${e.pointerId}`);
  };
  const onJumpKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (e.repeat) return;
    e.currentTarget.classList.add('is-pressed');
    if (screenRef.current === 'countdown') beginRun();
    else if (screenRef.current === 'run') press('b:enter');
  };
  const onJumpKeyUp = (e) => {
    if (e.key !== 'Enter') return;
    e.currentTarget.classList.remove('is-pressed');
    release('b:enter');
  };
  const noMenu = (e) => e.preventDefault();

  // ---------- pintado ----------
  const cfg = ZONES[zone];
  const rootClass = ['rover-root', `rover-zone-${zone}`, reduced && 'rover-reduced'].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={rootClass}>
      {screen === 'intro' && <Intro zone={zone} plan={plan} scene={scene} previewSim={previewSim} onStart={start} onBack={cancel} />}

      {stageOn && (
        <>
          <RoverHud hud={hud} onPause={pause} canPause={screen === 'run'} />
          <div className="rover-play">
            <div
              ref={stageRef}
              className={`rover-stage${screen === 'run' ? ' is-running' : ''}`}
              tabIndex={0}
              role="group"
              aria-label={t(TXT.stageLabel)}
              aria-describedby={hintId}
              onPointerDown={onStagePointerDown}
              onPointerUp={onStagePointerUp}
              onPointerCancel={onStagePointerUp}
              onLostPointerCapture={onStagePointerUp}
              onContextMenu={noMenu}
            >
              <canvas ref={canvasRef} className="rover-canvas" aria-hidden="true" />
              <p className="rover-stage-zone">
                <span className="rover-stage-zone-num">{t(TXT.zone(zone))}</span> {t(cfg.name)}
              </p>

              {screen === 'countdown' && (
                <div className="rover-overlay rover-countdown">
                  <p className="rover-ready">{t(TXT.ready)}</p>
                  <span key={count} className="rover-count-num" aria-live="assertive">
                    {count}
                  </span>
                  <button type="button" className="btn btn-secondary rover-skip" data-rover-ui onClick={beginRun}>
                    <span aria-hidden="true">⏭️</span> {t(TXT.skipCount)}
                  </button>
                </div>
              )}

              {goFlash && screen === 'run' && (
                <div className="rover-go" aria-hidden="true">
                  {t(TXT.go)}
                </div>
              )}

              {screen === 'paused' && (
                <div className="rover-overlay rover-pause-panel" data-rover-ui role="dialog" aria-modal="false" aria-labelledby={pauseTitleId}>
                  <h4 id={pauseTitleId} className="rover-pause-title">
                    <span aria-hidden="true">⏸️</span> {t(TXT.pausedTitle)}
                  </h4>
                  <p className="rover-pause-text">{t(TXT.pausedText)}</p>
                  <div className="rover-pause-actions">
                    <button ref={continueRef} type="button" className="btn btn-primary btn-lg" onClick={resume}>
                      <span aria-hidden="true">▶️</span> {t(TXT.resume)}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={abort}>
                      <span aria-hidden="true">🛑</span> {t(TXT.abort)}
                    </button>
                  </div>
                  <p className="rover-pause-note">{t(TXT.abortNote)}</p>
                </div>
              )}

              {screen === 'ending' && summary && (
                <div className={`rover-banner${summary.result.completed ? '' : ' is-emergency'}`} aria-hidden="true">
                  <strong>{t(summary.result.completed ? TXT.bannerGoal : TXT.bannerEmpty)}</strong>
                  {!summary.result.completed && <span>{t(TXT.msgEmergency)}</span>}
                </div>
              )}
            </div>

            <div className="rover-controls">
              <p id={hintId} className="rover-hint">
                <span aria-hidden="true">⌨️ </span>
                {t(TXT.keys)}
              </p>
              <button
                ref={jumpRef}
                type="button"
                className="btn btn-primary btn-lg rover-jump"
                aria-label={t(TXT.jumpLabel)}
                disabled={screen === 'paused' || screen === 'ending'}
                onPointerDown={onJumpDown}
                onPointerUp={onJumpUp}
                onPointerCancel={onJumpUp}
                onLostPointerCapture={onJumpUp}
                onKeyDown={onJumpKeyDown}
                onKeyUp={onJumpKeyUp}
                onContextMenu={noMenu}
              >
                <span className="btn-icon" aria-hidden="true">
                  ⬆️
                </span>
                {t(TXT.jump)}
              </button>
            </div>
          </div>
        </>
      )}

      {screen === 'end' && summary && <EndCard zone={zone} scene={scene} summary={summary} titleRef={endTitleRef} onBack={finish} />}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- HUD

function RoverHud({ hud, onPause, canPause }) {
  const { t, lang } = useI18n();
  const bClass = ['rover-meter', 'rover-battery', hud.low && 'is-low', hud.critical && 'is-critical'].filter(Boolean).join(' ');
  return (
    <div className="rover-hud">
      <div
        className={bClass}
        role="meter"
        aria-label={t(TXT.batteryLabel)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hud.battery}
        aria-valuetext={t(TXT.batteryText(hud.battery, hud.low, lang))}
      >
        <span className="rover-meter-icon" aria-hidden="true">
          {hud.low ? '⚠️' : '🔋'}
        </span>
        <span className="rover-meter-track" aria-hidden="true">
          <span className="rover-meter-fill" style={{ width: `${hud.battery}%` }} />
          <span className="rover-meter-reserve" style={{ left: `${RESERVE_PCT}%` }} title={t(TXT.reserveMark(lang))} />
        </span>
        <span className="rover-meter-value">{pct(hud.battery, lang)}</span>
      </div>
      <div
        className="rover-meter rover-progress"
        role="progressbar"
        aria-label={t(TXT.progressLabel)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hud.progress}
        aria-valuetext={pct(hud.progress, lang)}
      >
        <span className="rover-meter-track" aria-hidden="true">
          <span className="rover-meter-fill" style={{ width: `${hud.progress}%` }} />
          <span className="rover-progress-dot" style={{ left: `${hud.progress}%` }} />
        </span>
        <span className="rover-meter-icon" aria-hidden="true">
          🏁
        </span>
      </div>
      <ul className="rover-items" aria-label={t(TXT.itemsLabel)}>
        {ITEM_KINDS.map((k) => (
          <li key={k} className={`rover-item rover-item-${k}`}>
            <span aria-hidden="true">{ITEM_ICON[k]}</span>
            <span className="sr-only">{t(TXT.item[k])}:</span>
            <strong key={hud[k]} className={hud[k] ? 'rover-item-count is-new' : 'rover-item-count'}>
              {hud[k]}
            </strong>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-round btn-secondary rover-pause" aria-label={t(TXT.pauseBtn)} title={t(TXT.pauseBtn)} onClick={onPause} disabled={!canPause}>
        <span aria-hidden="true">⏸️</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- intro

function Intro({ zone, plan, scene, previewSim, onStart, onBack }) {
  const { t, lang } = useI18n();
  const cfg = ZONES[zone];
  const use = Math.round(plan.usePct);
  const margin = Math.max(0, Math.round(plan.marginPct));
  const p = { use, margin, hit: Math.round(plan.hitPct), hits: plan.maxHits };
  return (
    <div className="rover-intro">
      <div className="rover-intro-art">
        <StillCanvas className="rover-preview" scene={scene} sim={previewSim} label={t(TXT.previewLabel(zone))} />
        <span className="rover-zone-chip">
          <span aria-hidden="true">🚙</span> {t(TXT.zone(zone))}
        </span>
      </div>

      <div className="rover-intro-text">
        <h3 className="rover-title">{t(cfg.name)}</h3>
        <p className="rover-sim-note">
          <span className="tag tag-sim">{t(TXT.simTag)}</span> <span>{t(TXT.simNote)}</span>
        </p>
        <ul className="rover-brief">
          <li>
            <span className="rover-brief-icon" aria-hidden="true">
              🎯
            </span>
            <div>
              <strong>{t(TXT.goalTitle)}</strong>
              <RichText as="p" text={TXT.goal(cfg.sampleName)} />
            </div>
          </li>
          <li>
            <span className="rover-brief-icon" aria-hidden="true">
              🎮
            </span>
            <div>
              <strong>{t(TXT.controlsTitle)}</strong>
              <RichText as="p" text={TXT.controls} />
            </div>
          </li>
          <li>
            <span className="rover-brief-icon" aria-hidden="true">
              🌙
            </span>
            <div>
              <strong>{t(TXT.gravityTitle)}</strong>
              <RichText as="p" text={TXT.gravity} />
            </div>
          </li>
          <li>
            <span className="rover-brief-icon" aria-hidden="true">
              🔋
            </span>
            <div>
              <strong>{t(TXT.batteryTitle)}</strong>
              <RichText as="p" text={TXT.battery(p, lang)} />
              <div className="rover-plan" role="img" aria-label={t(TXT.planLabel(p, lang))}>
                <span className="rover-plan-use" style={{ width: `${Math.min(100, use)}%` }}>
                  <span aria-hidden="true">🚙</span> {t(TXT.planUse)} {pct(use, lang)}
                </span>
                {margin > 0 && (
                  <span className="rover-plan-margin" style={{ width: `${margin}%` }}>
                    <span aria-hidden="true">🛟</span> {pct(margin, lang)}
                  </span>
                )}
              </div>
              <p className="rover-plan-cap">{t(TXT.roverBattery(plan.level, plan.capacity))}</p>
            </div>
          </li>
        </ul>
        {!plan.unlocked && <p className="rover-warn">{t(TXT.locked(plan.level, plan.zone))}</p>}
        <p className="fact-box rover-fact">
          <span aria-hidden="true">💡 </span>
          <RichText text={FACTS[zone]} />
        </p>
      </div>

      <div className="rover-intro-actions">
        <span className="rover-back-note">{t(TXT.backNote)}</span>
        <button type="button" className="btn btn-ghost btn-lg" onClick={onBack}>
          <span aria-hidden="true">↩️</span> {t(TXT.back)}
        </button>
        <button type="button" className="btn btn-primary btn-lg" onClick={onStart} data-autofocus>
          <span aria-hidden="true">🚀</span> {t(TXT.start)}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- final

function EndCard({ zone, scene, summary, titleRef, onBack }) {
  const { t, lang } = useI18n();
  const [sent, setSent] = useState(false);
  const { result, found, sim } = summary;
  const kind = result.completed ? 'goal' : result.aborted ? 'aborted' : 'emergency';
  const title = { goal: TXT.endGoal, emergency: TXT.endEmergency, aborted: TXT.endAborted }[kind];
  const msg = { goal: TXT.msgGoal, emergency: TXT.msgEmergency, aborted: TXT.msgAborted }[kind];
  const icon = { goal: '🏁', emergency: '🚨', aborted: '🛑' }[kind];
  const lesson = result.completed ? (result.collisions === 0 ? LESSONS.perfect : LESSONS.hits) : result.aborted ? LESSONS.aborted : LESSONS.emergency;
  const sampleName = ZONES[zone].sampleName;
  return (
    <div className={`rover-end rover-end-${kind}`}>
      <div className="rover-end-art">
        <StillCanvas className="rover-preview" scene={scene} sim={sim} hazard={kind !== 'goal'} label={t(TXT.endArt)} />
      </div>
      <div className="rover-end-body">
        <h3 ref={titleRef} tabIndex={-1} className="rover-end-title">
          <span aria-hidden="true">{icon} </span>
          {t(title)}
        </h3>
        <p className="rover-end-msg">{t(msg)}</p>

        <h4 className="rover-loot-title">{t(TXT.lootTitle)}</h4>
        <ul className="rover-loot">
          {ITEM_KINDS.map((k) => {
            const kept = result.collected[k];
            const lost = found[k] - kept;
            const name = k === 'samples' ? `${t(TXT.item.samples)} (${t(sampleName)})` : t(TXT.item[k]);
            return (
              <li key={k} className={`rover-loot-item rover-loot-${k}`}>
                <span className="rover-loot-icon" aria-hidden="true">
                  {ITEM_ICON[k]}
                </span>
                <span className="rover-loot-name">{name}</span>
                <strong className="rover-loot-kept">{kept}</strong>
                {kind !== 'goal' && found[k] > 0 && (
                  <span className="rover-loot-lost">
                    {t(TXT.found(found[k]))}
                    {lost > 0 ? ` · ${t(TXT.lost(lost))}` : ''}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <ul className="rover-stats">
          <li>
            <span aria-hidden="true">🔋</span> {t(TXT.statBattery)}: <strong>{pct(result.batteryLeft, lang)}</strong>
          </li>
          <li>
            <span aria-hidden="true">💥</span> {t(TXT.statHits)}: <strong>{result.collisions}</strong>{' '}
            {result.collisions > 0 && <span className="rover-stats-cost">{t(TXT.hitsCost(result.collisions, lang))}</span>}
          </li>
          <li>
            <span aria-hidden="true">🏁</span> {t(TXT.statProgress)}: <strong>{pct(Math.round(result.progress * 100), lang)}</strong>
          </li>
          <li>
            <span className="tag tag-sim">{t(TXT.simTag)}</span>
          </li>
        </ul>

        <p className="fact-box rover-lesson">
          <span aria-hidden="true">💡 </span>
          <RichText text={lesson} />
        </p>

        <div className="rover-end-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg rover-home"
            disabled={sent}
            onClick={() => {
              setSent(true);
              onBack();
            }}
          >
            <span aria-hidden="true">🏠</span> {t(TXT.home)}
          </button>
        </div>
      </div>
    </div>
  );
}
