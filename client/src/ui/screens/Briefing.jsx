// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Mission briefing: where you are, what day it is, where the data comes from and how a day is played.
// Layout (docs/DESIGN.md section 3): ONE page: the story and the photo, then the five rules and the controls. The card has a
// header, a body that scrolls if it must and a footer that is always visible with the "Land at the base!" button.
import { useRef } from 'react';
import { formatDate, summarizeTimeline } from '@shared/gameTranslator.js';
import { useI18n } from '../../i18n.jsx';
import { useAvoidAiBadge } from '../components/AiBadge.jsx';
import DataTag from '../components/DataTag.jsx';
import Icon from '../components/Icon.jsx';
import RichText from '../components/RichText.jsx';
import { PHOTO } from './Menu.jsx';
import './briefing.css';

/** An honest summary of how the real Sun behaved in the LIVE window (it can be very calm). */
function LiveSummary({ timeline }) {
  const { t } = useI18n();
  const s = summarizeTimeline(timeline);
  const flaresM = timeline.reduce((n, d) => n + d.flares.mCount, 0);
  const cmes = timeline.reduce((n, d) => n + d.cmes.total, 0);
  const calmSun = s.stormNights <= 2 && s.xFlares === 0;
  return (
    <div className="briefing-note is-live">
      <p>
        <Icon name="satellite" size={22} />{' '}
        {t({
          es: `En estos ${s.days} días hubo ${s.xFlares} llamaradas X, ${flaresM} M, ${cmes} nubes de plasma y ${s.stormNights} ${s.stormNights === 1 ? 'noche' : 'noches'} con radiación.`,
          en: `In these ${s.days} days there were ${s.xFlares} X flares, ${flaresM} M flares, ${cmes} plasma clouds and ${s.stormNights} ${s.stormNights === 1 ? 'night' : 'nights'} with radiation.`
        })}
      </p>
      {calmSun && (
        <p className="briefing-calm">
          {t({
            es: 'Hoy el Sol está más tranquilo que en mayo de 2024. Para una gran tormenta, juega la misión de 2024.',
            en: 'The Sun is calmer now than in May 2024. For a big storm, play the 2024 mission.'
          })}
        </p>
      )}
    </div>
  );
}

/** The five rules of the game, in kid language, with the Icon.jsx name that illustrates each one. */
const RULES = [
  {
    icon: 'bolt',
    text: {
      es: 'Cada mañana tus [[solar-panel|paneles solares]] te dan **energía**. Repártela entre la antena, la granja y el escudo.',
      en: 'Every morning your [[solar-panel|solar panels]] give you **energy**. Share it between the antenna, the farm and the shield.'
    }
  },
  {
    icon: 'stamina',
    text: {
      es: 'Tus **Fuerzas** son lo que puedes hacer hoy: plantar, reparar o salir con el [[rover]]. Al gastarlas, anochece.',
      en: 'Your **Stamina** is what you can do today: plant, repair or drive the [[rover]]. When it runs out, night falls.'
    }
  },
  {
    icon: 'radiation',
    text: {
      es: 'Si llega una [[solar-storm|tormenta solar]], carga el **escudo** antes de dormir. La [[antenna|antena]] te avisa.',
      en: 'If a [[solar-storm]] arrives, charge the **shield** before you sleep. The [[antenna]] warns you.'
    }
  },
  {
    icon: 'heart',
    text: {
      es: 'Cada noche pierdes 1 corazón por problema: sin cena, sin escudo en una tormenta o por cansarte de más.',
      en: 'Each night you lose 1 heart per problem: no dinner, no shield in a storm, or too much effort.'
    }
  },
  {
    icon: 'science',
    text: {
      es: 'Ganas al llegar al **100 % de ciencia** con las misiones de la NASA. ¡Ninguna decisión es gratis!',
      en: 'You win by reaching **100 % science** with NASA missions. No choice is free!'
    }
  }
];

export default function Briefing({ data, onStart, onBack }) {
  const { t } = useI18n();
  const footRef = useRef(null);
  useAvoidAiBadge(footRef);

  const tl = data.timeline;
  const from = tl[0].date;
  const to = tl[tl.length - 1].date;
  const live = data.source === 'EN VIVO';
  const title = live ? t({ es: 'El Sol de hoy', en: 'Today’s Sun' }) : t({ es: 'La gran tormenta de 2024', en: 'The great storm of 2024' });

  const story = live
    ? {
        es: `Eres el único astronauta de una base en el [[south-pole|polo sur]] de la Luna. Cada día del juego es un día real del Sol, del ${formatDate(from, 'es')} al ${formatDate(to, 'es')}, con datos de [[donki|DONKI]].`,
        en: `You are the only astronaut at a base on the Moon’s [[south-pole]]. Every game day is a real day of the Sun, from ${formatDate(from, 'en')} to ${formatDate(to, 'en')}, using data from [[donki|DONKI]].`
      }
    : {
        es: `Es el ${formatDate(from, 'es')}. Eres el único astronauta de una base en el [[south-pole|polo sur]] de la Luna. Vivirás 21 días de la tormenta solar más fuerte en dos décadas, con datos reales de la NASA.`,
        en: `It is ${formatDate(from, 'en')}. You are the only astronaut at a base on the Moon’s [[south-pole]]. You will live 21 days of the strongest solar storm in two decades, with real NASA data.`
      };

  return (
    <main className="screen briefing-screen">
      <section className="briefing paper" aria-labelledby="brief-title">
        <header className="briefing-head">
          <DataTag kind={live ? 'EN VIVO' : 'ARCHIVO'} size="sm" />
          <h1 id="brief-title">{title}</h1>
        </header>

        <div className="briefing-body">
          <div className="briefing-where">
            <div className="briefing-story">
              {live && !data.fallback && <LiveSummary timeline={tl} />}
              {data.fallback && (
                <p className="briefing-note is-warn" role="alert">
                  <Icon name="warning" size={22} />{' '}
                  {t({
                    es: 'No hemos podido conectar con DONKI. Jugarás con datos REALES guardados de mayo de 2024 (no son de hoy).',
                    en: 'We could not reach DONKI. You will play with REAL data saved from May 2024 (not from today).'
                  })}
                </p>
              )}
              <RichText as="p" className="briefing-lead" text={story} />
            </div>
            <figure className="briefing-photo">
              <div className="briefing-photo-frame">
                <img
                  src={PHOTO.src}
                  alt={t({ es: 'Mosaico real del polo sur de la Luna (cámara LROC de la nave LRO). En el centro, el cráter Shackleton.', en: 'Real mosaic of the Moon’s south pole (LROC camera on the LRO spacecraft). At the centre, Shackleton crater.' })}
                />
                <span className="pin" aria-hidden="true">
                  <Icon name="pin" size={36} />
                </span>
              </div>
              <figcaption>
                <span className="briefing-caption">{t({ es: 'Tu base: junto al cráter Shackleton. Las zonas negras nunca ven el Sol.', en: 'Your base: next to Shackleton crater. The black areas never see the Sun.' })}</span>
                <a href={PHOTO.url} target="_blank" rel="noreferrer noopener">
                  {PHOTO.credit}
                </a>
              </figcaption>
            </figure>
          </div>

          <h2 className="briefing-subtitle">{t({ es: 'Cómo se juega', en: 'How to play' })}</h2>
          <ul className="briefing-rules">
            {RULES.map((r) => (
              <li key={r.icon} className="briefing-rule">
                <span className="rule-icon" aria-hidden="true">
                  <Icon name={r.icon} size="100%" />
                </span>
                <RichText as="p" text={r.text} />
              </li>
            ))}
          </ul>
          <p className="briefing-controls">
            <Icon name="keyboard" size={28} />
            <span>{t({ es: 'Muévete con WASD o las flechas, o toca el suelo. Pulsa E o toca un módulo para usarlo.', en: 'Move with WASD or the arrow keys, or tap the floor. Press E or tap a module to use it.' })}</span>
          </p>
        </div>

        <footer ref={footRef} className="briefing-foot">
          <button type="button" className="btn btn-ghost" onClick={onBack} aria-label={t({ es: 'Volver al menú', en: 'Back to the menu' })}>
            <Icon name="arrow-left" />
            <span className="hide-compact">{t({ es: 'Menú', en: 'Menu' })}</span>
          </button>
          <button type="button" className="btn btn-primary btn-lg" onClick={onStart} autoFocus>
            <Icon name="rocket" />
            {t({ es: '¡Aterrizar en la base!', en: 'Land at the base!' })}
          </button>
        </footer>
      </section>
    </main>
  );
}
