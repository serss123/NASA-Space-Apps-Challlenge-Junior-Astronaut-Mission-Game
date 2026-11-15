// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Top-down map of the base: the astronaut moves with WASD / arrows, or by tapping the floor or a module.
// Inside a module, E / Space / Enter opens its panel. Tapping a module makes the astronaut walk there.
// The module labels are paper stickers (HTML buttons over the SVG art). On small maps they shrink to icon-only round
// buttons (44 px; the name stays as the accessible name and shows again on the module the astronaut is in).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BALANCE } from '../../engine/index.js';
import { useI18n } from '../../i18n.jsx';
import { sfx } from '../../audio/sfx.js';
import Icon from '../components/Icon.jsx';
import Astronaut from './Astronaut.jsx';
import BaseArt from './BaseArt.jsx';
import { MODULE_BY_ID, MODULES, START_POS, WORLD, findPath, isWalkable, moduleAt, stepMove } from './layout.js';
import './basemap.css';

const SPEED = 250; // world units per second
const KEYMAP = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };

/** The <Icon> name of every module. */
export const MODULE_ICONS = {
  lifeSupport: 'life-support',
  antenna: 'antenna',
  farm: 'farm',
  shield: 'shield',
  bed: 'bed',
  rover: 'rover',
  solar: 'solar-panel'
};

export const MODULE_NAMES = {
  lifeSupport: { es: 'Soporte Vital', en: 'Life Support' },
  antenna: { es: 'Antena', en: 'Antenna' },
  farm: { es: 'Granja', en: 'Farm' },
  shield: { es: 'Escudo', en: 'Shield' },
  bed: { es: 'Cama', en: 'Bed' },
  rover: { es: 'Rover', en: 'Rover' },
  solar: { es: 'Paneles solares', en: 'Solar panels' }
};

function stars(level) {
  return '★'.repeat(level) + '☆'.repeat(Math.max(0, BALANCE.maxLevel - level));
}

export default function BaseMap({ state, paused, reducedMotion, suitColor, onUse, highlight, walkTo }) {
  const { t } = useI18n();
  const wrapRef = useRef(null);
  const astroRef = useRef(null);
  const pos = useRef([...START_POS]);
  const keys = useRef(new Set());
  const path = useRef([]);
  const pendingUse = useRef(null);
  const [here, setHere] = useState(() => moduleAt(START_POS)?.id ?? null);
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState(1);
  const [hideRotate, setHideRotate] = useState(false);
  // The "turn your phone" hint goes away by itself after a few seconds (it never covers the map).
  useEffect(() => {
    const id = setTimeout(() => setHideRotate(true), 8000);
    return () => clearTimeout(id);
  }, []);
  const hereRef = useRef(here);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onUseRef = useRef(onUse);
  onUseRef.current = onUse;

  const night = state.phase !== 'day';
  const dark = state.phase === 'day' ? Math.min(1, Math.max(0, 1 - state.stamina / (BALANCE.stamina.base + state.levels.lifeSupport))) : 1;

  const place = useCallback(() => {
    const el = astroRef.current;
    if (!el) return;
    el.style.left = `${(pos.current[0] / WORLD.w) * 100}%`;
    el.style.top = `${(pos.current[1] / WORLD.h) * 100}%`;
  }, []);

  // Movement loop.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let wasWalking = false;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      let moving = false;
      if (!pausedRef.current) {
        let vx = 0;
        let vy = 0;
        for (const k of keys.current) {
          const d = KEYMAP[k];
          if (d) {
            vx += d[0];
            vy += d[1];
          }
        }
        if (vx || vy) {
          path.current = [];
          pendingUse.current = null;
          const len = Math.hypot(vx, vy);
          const next = stepMove(pos.current, (vx / len) * SPEED * dt, (vy / len) * SPEED * dt);
          moving = next[0] !== pos.current[0] || next[1] !== pos.current[1];
          if (vx) setFacing(vx > 0 ? 1 : -1);
          pos.current = next;
        } else if (path.current.length) {
          const target = path.current[0];
          const dx = target[0] - pos.current[0];
          const dy = target[1] - pos.current[1];
          const dist = Math.hypot(dx, dy);
          const step = SPEED * 1.15 * dt;
          if (Math.abs(dx) > 2) setFacing(dx > 0 ? 1 : -1);
          if (dist <= step) {
            pos.current = [...target];
            path.current.shift();
          } else {
            pos.current = [pos.current[0] + (dx / dist) * step, pos.current[1] + (dy / dist) * step];
          }
          moving = true;
          if (!path.current.length && pendingUse.current) {
            const id = pendingUse.current;
            pendingUse.current = null;
            setTimeout(() => onUseRef.current?.(id), 60);
          }
        }
        if (moving) place();
        const m = moduleAt(pos.current)?.id ?? null;
        if (m !== hereRef.current) {
          hereRef.current = m;
          setHere(m);
        }
      }
      if (moving !== wasWalking) {
        wasWalking = moving;
        setWalking(moving);
      }
      raf = requestAnimationFrame(tick);
    };
    place();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [place]);

  // Keyboard.
  useEffect(() => {
    const isTyping = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;
    const down = (e) => {
      if (pausedRef.current || isTyping(e) || e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (KEYMAP[k]) {
        e.preventDefault();
        keys.current.add(k);
        return;
      }
      // E always uses the module; Space/Enter only when the focus is not on a control (button, link, switch...),
      // because there those keys press the control.
      const onControl = !!e.target?.closest?.('a, button, input, select, textarea, summary, [role="switch"], [tabindex]:not([tabindex="-1"])');
      const useKey = k === 'e' || ((k === ' ' || k === 'enter') && !onControl);
      if (useKey && hereRef.current) {
        e.preventDefault();
        sfx.play('click');
        onUseRef.current?.(hereRef.current);
      }
    };
    const up = (e) => keys.current.delete(e.key.toLowerCase());
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  useEffect(() => {
    if (paused) keys.current.clear();
  }, [paused]);

  const goTo = useCallback((target, useId = null) => {
    path.current = findPath(pos.current, target);
    pendingUse.current = useId;
  }, []);

  // External request to walk to a module (for example from Mission Control).
  useEffect(() => {
    if (!walkTo) return;
    const m = MODULE_BY_ID[walkTo.id];
    if (m) goTo(m.node, walkTo.use ? m.id : null);
  }, [walkTo, goTo]);

  const onFloor = (e) => {
    if (paused) return;
    const r = wrapRef.current.getBoundingClientRect();
    const p = [((e.clientX - r.left) / r.width) * WORLD.w, ((e.clientY - r.top) / r.height) * WORLD.h];
    // Tapping a module: walk there and open it (comfortable on tablets and phones). Tapping the floor: just walk.
    const m = moduleAt(p);
    if (m) {
      if (hereRef.current === m.id) onUseRef.current?.(m.id);
      else goTo(m.node, m.id);
      return;
    }
    if (isWalkable(p)) goTo(p);
  };

  const status = useMemo(() => moduleStatus(state, t), [state, t]);

  return (
    <div className={`basemap${night ? ' is-night' : ''}${reducedMotion ? ' reduced' : ''}`}>
      <div ref={wrapRef} className="basemap-world" onPointerDown={onFloor} style={{ '--dark': dark }}>
        <BaseArt
          night={night}
          crops={state.plots.filter((p) => p.crop).length}
          farmPowered={state.energy.farm > 0}
          shieldCharge={state.energy.shield}
          shieldMax={BALANCE.shield.maxChargeByLevel[state.levels.shield]}
          cablesBroken={!!state.tasks.cables}
          panelsDirty={!!state.tasks.panels}
          antennaLinked={state.today.antennaLinked}
          antennaBroken={!!state.tasks.antenna}
          roverOut={false}
        />
        <div className="basemap-dim" aria-hidden="true" />

        {MODULES.map((m) => {
          const st = status[m.id];
          const isHere = here === m.id;
          return (
            <button
              key={m.id}
              type="button"
              className={`map-node${isHere ? ' is-here' : ''}${highlight === m.id ? ' is-highlight' : ''}${st.alert ? ' has-alert' : ''}${m.id === 'bed' && night ? ' is-bedtime' : ''}${m.label[1] < 60 ? ' is-top' : ''}`}
              style={{ '--x': `${(m.label[0] / WORLD.w) * 100}%`, '--y': `${(m.label[1] / WORLD.h) * 100}%`, '--accent': m.accent }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                sfx.play('click');
                if (here === m.id) onUse(m.id);
                else goTo(m.node, m.id);
              }}
              aria-label={`${t(MODULE_NAMES[m.id])}. ${st.aria}`}
            >
              <span className="map-node-icon" aria-hidden="true">
                <Icon name={MODULE_ICONS[m.id]} size="100%" />
              </span>
              <span className="map-node-text">
                <span className="map-node-name">{t(MODULE_NAMES[m.id])}</span>
                {st.level != null && (
                  <span className="map-node-level" aria-hidden="true">
                    {stars(st.level)}
                  </span>
                )}
              </span>
              {st.badges.map((b) => (
                <span key={b.k} className={`map-badge map-badge-${b.tone}`} aria-hidden="true">
                  <Icon name={b.icon} size="1.1em" />
                  {b.text}
                </span>
              ))}
              {isHere && (
                <span className="map-node-prompt" aria-hidden="true">
                  {t({ es: 'E · Usar', en: 'E · Use' })}
                </span>
              )}
            </button>
          );
        })}

        <div ref={astroRef} className="astro-holder" aria-hidden="true">
          <Astronaut walking={walking && !reducedMotion} facing={facing} color={suitColor} night={night} />
        </div>
      </div>
      <div className={`rotate-hint${hideRotate ? ' is-hidden' : ''}`} role="note">
        <Icon name="refresh" size={24} />
        {t({ es: 'Gira el móvil para ver la base más grande', en: 'Turn your phone to see the base bigger' })}
        <button type="button" onClick={() => setHideRotate(true)} aria-label={t({ es: 'Cerrar aviso', en: 'Close hint' })}>
          <Icon name="close" size={22} />
        </button>
      </div>
    </div>
  );
}

/** Badges and state of every module for the map. */
function moduleStatus(s, t) {
  const L = s.levels;
  const e = s.energy;
  const growing = s.plots.filter((p) => p.crop).length;
  const out = {};
  const mk = (level, badges = [], aria = '', alert = false) => ({ level, badges, aria, alert });
  const free = e.total - e.antenna - e.farm - e.shield;
  const warn = { k: 'x', tone: 'alert', icon: 'warning', text: '' };
  out.lifeSupport = mk(L.lifeSupport, free > 0 ? [{ k: 'e', tone: 'energy', icon: 'bolt', text: free }] : [], t({ es: `Energía libre: ${free}.`, en: `Free energy: ${free}.` }));
  out.antenna = mk(
    L.antenna,
    [...(s.tasks.antenna ? [warn] : []), ...(s.today.antennaLinked ? [{ k: 'l', tone: 'ok', icon: 'live', text: '' }] : e.antenna ? [{ k: 'p', tone: 'energy', icon: 'bolt', text: '' }] : [])],
    s.tasks.antenna ? t({ es: '¡Descalibrada!', en: 'Out of calibration!' }) : s.today.antennaLinked ? t({ es: 'Conectada con la Tierra.', en: 'Linked with Earth.' }) : '',
    !!s.tasks.antenna
  );
  out.farm = mk(
    L.farm,
    [...(growing ? [{ k: 'g', tone: 'ok', icon: 'farm', text: growing }] : []), ...(e.farm ? [{ k: 'p', tone: 'energy', icon: 'bolt', text: '' }] : [])],
    t({ es: `${growing} cultivos creciendo.`, en: `${growing} crops growing.` })
  );
  out.shield = mk(
    L.shield,
    [...(s.tasks.cables ? [warn] : []), ...(e.shield ? [{ k: 'c', tone: 'shield', icon: 'shield', text: e.shield }] : [])],
    s.tasks.cables ? t({ es: '¡Cables cortocircuitados!', en: 'Short-circuited cables!' }) : t({ es: `Carga ${e.shield}.`, en: `Charge ${e.shield}.` }),
    !!s.tasks.cables
  );
  out.rover = mk(L.rover, [], t({ es: `Zonas hasta la ${L.rover}.`, en: `Zones up to ${L.rover}.` }));
  out.bed = mk(null, s.phase === 'night' ? [{ k: 'n', tone: 'night', icon: 'moon', text: '' }] : [], s.phase === 'night' ? t({ es: '¡Hora de dormir!', en: 'Time to sleep!' }) : '');
  out.solar = mk(null, s.tasks.panels ? [warn] : [], s.tasks.panels ? t({ es: '¡Paneles sucios!', en: 'Dirty panels!' }) : '', !!s.tasks.panels);
  return out;
}
