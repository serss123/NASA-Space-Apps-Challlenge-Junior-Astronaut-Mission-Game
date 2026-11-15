// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Top bar: the resources at a glance, with icons and numbers (never colour alone). Plus the news ticker with the real
// space weather of the day (only when the antenna is linked). Layout in hud.css: one row on wide screens, two on
// tablets and phones in portrait, one tight row on phones in landscape.
import { useEffect, useState } from 'react';
import { formatDate } from '@shared/gameTranslator.js';
import { BALANCE, sel } from '../../engine/index.js';
import { useI18n } from '../../i18n.jsx';
import { sfx } from '../../audio/sfx.js';
import DataTag from '../components/DataTag.jsx';
import Icon from '../components/Icon.jsx';
import RichText from '../components/RichText.jsx';
import './hud.css';

function useMuted() {
  const [muted, setMuted] = useState(sfx.isMuted());
  useEffect(() => sfx.subscribe(setMuted), []);
  return muted;
}

/** A small "jump" when a number changes. */
function Bump({ value, children, className = '' }) {
  const [key, setKey] = useState(0);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setKey((k) => k + 1);
  }
  return (
    <span key={key} className={`bump ${className}`}>
      {children}
    </span>
  );
}

export default function Hud({ state, onMenu, onNotebook }) {
  const { t, lang, setLang } = useI18n();
  const muted = useMuted();
  const day = sel.currentDay(state);
  const maxSt = sel.maxStamina(state);
  const e = state.energy;
  const free = sel.freeEnergy(state);
  const samples = sel.totalSamples(state);
  const live = state.source === 'EN VIVO';
  const items = [
    { k: 'food', icon: 'food', value: state.inv.food, low: state.inv.food <= 1, title: t({ es: 'Raciones de comida', en: 'Food rations' }) },
    { k: 'ice', icon: 'ice', value: state.inv.ice, title: t({ es: 'Hielo (agua)', en: 'Ice (water)' }) },
    { k: 'metal', icon: 'metal', value: state.inv.metal, title: t({ es: 'Metal', en: 'Metal' }) },
    {
      k: 'rock',
      icon: 'rock',
      value: samples,
      title: t({ es: `Muestras: zona 1 ${state.inv.samples.z1} · zona 2 ${state.inv.samples.z2} · zona 3 ${state.inv.samples.z3}`, en: `Samples: zone 1 ${state.inv.samples.z1} · zone 2 ${state.inv.samples.z2} · zone 3 ${state.inv.samples.z3}` })
    }
  ];

  return (
    <header className="hud" role="banner">
      <div className="hud-day">
        <div className="hud-day-num">
          <span>{t({ es: 'Día', en: 'Day' })}</span>
          <strong>
            {state.dayIndex + 1}
            <small>/{sel.totalDays(state)}</small>
          </strong>
        </div>
        <div className="hud-day-date">
          <span>{formatDate(day.date, lang)}</span>
          <DataTag kind={live ? 'EN VIVO' : 'ARCHIVO'} size="sm" />
        </div>
      </div>

      <div className="hud-res" role="group" aria-label={t({ es: 'Recursos', en: 'Resources' })}>
        <div className="hud-box hud-health" title={t({ es: 'Salud: si llega a 0, la misión se evacua', en: 'Health: at 0 the mission is evacuated' })}>
          <span className="sr-only">{t({ es: `Salud ${state.health} de ${BALANCE.health.max}`, en: `Health ${state.health} of ${BALANCE.health.max}` })}</span>
          {Array.from({ length: BALANCE.health.max }).map((_, i) => (
            <Icon key={i} name={i < state.health ? 'heart' : 'heart-broken'} size={24} className={`heart${i < state.health ? ' is-full' : ''}`} />
          ))}
        </div>

        <div className={`hud-box hud-stamina${state.stamina < 0 ? ' is-negative' : ''}`} title={t({ es: 'Fuerzas: lo que puedes hacer hoy', en: 'Stamina: what you can do today' })}>
          <Icon name="stamina" size={24} />
          <Bump value={state.stamina}>
            <strong>{state.stamina}</strong>
          </Bump>
          <span className="pips" aria-hidden="true">
            {Array.from({ length: maxSt }).map((_, i) => (
              <i key={i} className={i < state.stamina ? 'on' : ''} />
            ))}
          </span>
          <span className="sr-only">{t({ es: `Fuerzas ${state.stamina} de ${maxSt}`, en: `Stamina ${state.stamina} of ${maxSt}` })}</span>
        </div>

        <div className="hud-box hud-energy" title={t({ es: 'Energía de la base de hoy', en: "Today's base power" })}>
          <Icon name="bolt" size={24} />
          <span className="mini-tokens" aria-hidden="true">
            {Array.from({ length: e.total }).map((_, i) => {
              const kind = i < e.antenna ? 'antenna' : i < e.antenna + e.farm ? 'farm' : i < e.antenna + e.farm + e.shield ? 'shield' : 'free';
              return <i key={i} className={`mt mt-${kind}`} />;
            })}
          </span>
          <Bump value={free}>
            <strong>{free}</strong>
          </Bump>
          <small>{t({ es: 'libre', en: 'free' })}</small>
        </div>

        <div className="hud-box hud-items">
          {items.map((it) => (
            <span key={it.k} title={it.title} className="hud-item">
              <Icon name={it.icon} size={22} title={it.title} />
              <Bump value={it.value}>
                <strong className={it.low ? 'low' : ''}>{it.value}</strong>
              </Bump>
            </span>
          ))}
        </div>

        <div className="hud-box hud-research" title={t({ es: 'Ciencia: llega al 100 % para ganar', en: 'Science: reach 100 % to win' })}>
          <Icon name="science" size={24} />
          <div className="research-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.research} aria-label={t({ es: 'Ciencia', en: 'Science' })}>
            <i style={{ width: `${state.research}%` }} />
          </div>
          <strong>{state.research}%</strong>
        </div>
      </div>

      <div className="hud-actions">
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onNotebook} aria-label={t({ es: 'Diario de descubrimientos', en: 'Discovery Journal' })} title={t({ es: 'Diario', en: 'Journal' })}>
          <Icon name="book" />
        </button>
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => sfx.toggle()} aria-label={muted ? t({ es: 'Activar sonido', en: 'Sound on' }) : t({ es: 'Silenciar', en: 'Mute' })} aria-pressed={muted}>
          <Icon name={muted ? 'sound-off' : 'sound-on'} />
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLang(lang === 'es' ? 'en' : 'es')} aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}>
          <Icon name="globe" />
          {lang === 'es' ? 'EN' : 'ES'}
        </button>
        <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={onMenu} aria-label={t({ es: 'Menú (pausa)', en: 'Menu (pause)' })}>
          <Icon name="menu" />
        </button>
      </div>
    </header>
  );
}

/** News ticker with the real space weather of the day (only if the antenna is linked). */
export function NewsTicker({ state }) {
  const { t } = useI18n();
  const day = sel.currentDay(state);
  const linked = sel.hasForecast(state);
  return (
    <div className={`ticker${linked ? ' is-linked' : ''}`} role="status" aria-live="polite">
      <span className="ticker-badge">
        <Icon name="antenna" size={20} /> {linked ? t({ es: 'Desde la Tierra', en: 'From Earth' }) : t({ es: 'Sin conexión', en: 'No link' })}
      </span>
      {linked ? (
        <span className="ticker-text">
          {t(day.headline)} <DataTag kind={state.source === 'EN VIVO' ? 'EN VIVO' : 'ARCHIVO'} size="sm" />
        </span>
      ) : (
        <RichText
          className="ticker-text"
          text={
            state.tasks.antenna
              ? { es: 'La antena está descalibrada: no sabes qué hace hoy el Sol. Ve a repararla.', en: 'The antenna is out of calibration: you do not know what the Sun is doing today. Go and fix it.' }
              : { es: 'No sabes qué trae hoy el Sol: enciende la [[antenna|antena]] y conéctala con la Tierra.', en: 'You do not know what the Sun brings today: switch on the [[antenna]] and link it with Earth.' }
          }
        />
      )}
    </div>
  );
}
