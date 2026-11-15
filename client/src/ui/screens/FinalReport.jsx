// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Final report "Why did it happen?": three panels (the decision that mattered most, the strongest event and the result),
// the real Sun during the mission and an invitation to replay changing one decision (same seed). A paper Modal whose body
// scrolls if it is too tall; the three actions (replay, new game, menu) are always visible in the footer.
import { useEffect, useRef, useState } from 'react';
import { formatDate } from '@shared/gameTranslator.js';
import { DISCOVERIES } from '../../content/discoveries.js';
import { MISSION_TEXT } from '../../content/missions.js';
import { fmtNum, useI18n } from '../../i18n.jsx';
import DataTag from '../components/DataTag.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import RichText from '../components/RichText.jsx';
import './reports.css';

const BUILDING = {
  lifeSupport: { es: 'Soporte Vital', en: 'Life Support' },
  shield: { es: 'Escudo', en: 'Shield' },
  farm: { es: 'Granja', en: 'Farm' },
  antenna: { es: 'Antena', en: 'Antenna' },
  rover: { es: 'Rover', en: 'Rover' }
};

function keyDecisionText(r, lang) {
  const k = r.keyDecision || {};
  const dates = (k.hits || []).map((h) => formatDate(h.date, lang).replace(/ de \d{4}$|, \d{4}$/, '')).join(lang === 'es' ? ', ' : ', ');
  switch (k.kind) {
    case 'radiation':
      return {
        es: `Las noches de tormenta (${dates}) el [[shield|escudo]] no tenía carga suficiente. Cargarlo cuesta energía, y sin la [[antenna|antena]] no sabías cuándo hacía falta.`,
        en: `On the storm nights (${dates}) the [[shield]] did not have enough charge. Charging costs power, and without the [[antenna]] you could not know when it was needed.`
      };
    case 'hunger':
      return {
        es: `Te quedaste sin comida ${k.count} ${k.count === 1 ? 'noche' : 'noches'}. Plantaste ${k.plants} ${k.plants === 1 ? 'vez' : 'veces'}: la granja tarda 2 días y necesita energía cada día.`,
        en: `You ran out of food on ${k.count} ${k.count === 1 ? 'night' : 'nights'}. You planted ${k.plants} ${k.plants === 1 ? 'time' : 'times'}: the farm takes 2 days and needs power every day.`
      };
    case 'overexertion':
      return {
        es: `Te pasaste de esfuerzo ${k.count} ${k.count === 1 ? 'vez' : 'veces'}: hacer más de lo que te permiten tus Fuerzas cuesta salud.`,
        en: `You overexerted yourself ${k.count} ${k.count === 1 ? 'time' : 'times'}: doing more than your Stamina allows costs health.`
      };
    case 'outside':
      return {
        es: `Saliste con el [[rover]] en días de [[radiation|radiación]] alta (${dates}). El escudo protege la base, pero no el Rover.`,
        en: `You took the [[rover]] out on high-[[radiation]] days (${dates}). The shield protects the base, not the Rover.`
      };
    case 'shieldReady':
      return {
        es: `Cargaste el [[shield|escudo]] a tiempo en ${k.blocked} de ${k.stormNights} noches de tormenta${k.upgradedBeforeStorm ? ', y lo mejoraste **antes** de que llegara la primera' : ''}. En el espacio no se reacciona: se anticipa.`,
        en: `You charged the [[shield]] in time on ${k.blocked} of ${k.stormNights} storm nights${k.upgradedBeforeStorm ? ', and upgraded it **before** the first one arrived' : ''}. In space you don't react: you plan ahead.`
      };
    default:
      return {
        es: `Hiciste ${k.expeditions ?? 0} expediciones y plantaste ${k.plants ?? 0} veces: repartir bien las Fuerzas y la energía es la clave.`,
        en: `You made ${k.expeditions ?? 0} expeditions and planted ${k.plants ?? 0} times: sharing out Stamina and power wisely is the key.`
      };
  }
}

function strongestText(r, lang) {
  const e = r.strongestEvent;
  if (!e) return { es: 'No hubo tormentas fuertes.', en: 'There were no strong storms.' };
  const date = formatDate(e.date, lang);
  const flareEs = e.maxFlare ? ` Ese día hubo una llamarada ${e.maxFlare}.` : '';
  const flareEn = e.maxFlare ? ` That day there was ${/^[MX]/.test(e.maxFlare) ? 'an' : 'a'} ${e.maxFlare} flare.` : '';
  const shieldEs = e.happened ? (e.protected === true ? ' **Tu escudo aguantó.**' : e.protected === false ? ' **Tu escudo no bastó.**' : '') : '';
  const shieldEn = e.happened ? (e.protected === true ? ' **Your shield held.**' : e.protected === false ? ' **Your shield was not enough.**' : '') : '';
  // No radiation storm in the days played: say so, without odd multipliers ("1 times").
  if (e.level === 0) {
    return {
      es: `Hasta el ${formatDate(e.date, 'es')} no llegó ninguna tormenta de [[radiation|radiación]] a la Luna: la radiación fue la de un día normal.${flareEs}`,
      en: `Up to ${formatDate(e.date, 'en')} no [[radiation]] storm reached the Moon: radiation stayed at a normal level.${flareEn}`,
      date
    };
  }
  // Storm estimated from DONKI alerts (LIVE mission or a day without a RadLab measurement): no measured multiplier.
  if (e.multiplier == null || e.basis !== 'measured') {
    return {
      es: `El ${formatDate(e.date, 'es')} llegó una tormenta de nivel ${e.level} (estimada con los avisos de [[donki|DONKI]]).${flareEs}${shieldEs}`,
      en: `On ${formatDate(e.date, 'en')} a level ${e.level} storm arrived (estimated from [[donki|DONKI]] alerts).${flareEn}${shieldEn}`,
      date
    };
  }
  const x = fmtNum(e.multiplier, lang, e.multiplier < 10 ? 1 : 0);
  const iss = e.issX != null ? fmtNum(e.issX, lang, 1) : null;
  const es = [
    `El ${formatDate(e.date, 'es')} llegó una tormenta de nivel ${e.level}`,
    `: cerca de la Luna hubo **${x} veces** la radiación normal ([[crater-detector|CRaTER]])`,
    iss ? ` y dentro de la [[iss|Estación]] solo ${iss} veces` : '',
    '.',
    flareEs,
    shieldEs
  ].join('');
  const en = [
    `On ${formatDate(e.date, 'en')} a level ${e.level} storm arrived`,
    `: near the Moon there was **${x} times** the normal radiation ([[crater-detector|CRaTER]])`,
    iss ? ` while inside the [[iss|Station]] only ${iss} times` : '',
    '.',
    flareEn,
    shieldEn
  ].join('');
  return { es, en, date };
}

const TIPS = {
  challenge: { es: '🏆 ¡Lo lograste! Juega una partida nueva o intenta terminar sin perder ningún corazón.', en: '🏆 You did it! Play a new game or try to finish without losing a single heart.' },
  shield: { es: '💡 Próxima vez: conecta la antena cada mañana, mejora el Soporte Vital y el escudo antes del 10 de mayo y cárgalo antes de dormir.', en: '💡 Next time: link the antenna every morning, upgrade Life Support and the shield before 10 May and charge it before sleeping.' },
  farm: { es: '💡 Próxima vez: planta pronto y deja la granja encendida; guarda comida antes de la semana de tormentas.', en: '💡 Next time: plant early and keep the farm powered; store food before the storm week.' },
  rest: { es: '💡 Próxima vez: no empieces tareas sin Fuerzas suficientes; descansar también es una decisión.', en: '💡 Next time: do not start tasks without enough Stamina; resting is also a decision.' },
  outside: { es: '💡 Próxima vez: mira la previsión antes de salir con el Rover y explora en los días tranquilos.', en: '💡 Next time: check the forecast before driving out and explore on calm days.' },
  rover: { es: '💡 Próxima vez: mejora antes el Rover para llegar a las zonas lejanas y entrega las misiones en cuanto puedas.', en: '💡 Next time: upgrade the Rover sooner to reach far zones and deliver missions as soon as you can.' }
};

export default function FinalReport({ report: r, fresh, onLearn, onReplay, onNewGame, onMenu, onSources }) {
  const { t, lang } = useI18n();
  // The discoveries of the last night are shown and saved in the Journal only once.
  const [shownFresh] = useState(fresh);
  const learned = useRef(false);
  useEffect(() => {
    if (!learned.current && shownFresh.length) {
      learned.current = true;
      onLearn();
    }
  }, [shownFresh, onLearn]);

  const hero = {
    win: { emoji: '🎉', title: { es: '¡Misión cumplida!', en: 'Mission accomplished!' }, text: { es: `Llegaste al 100 % de investigación el día ${r.daysPlayed} y cuidaste de tu salud durante la gran tormenta solar.`, en: `You reached 100 % research on day ${r.daysPlayed} and stayed safe during the great solar storm.` } },
    evacuated: { emoji: '🚀', title: { es: 'Misión evacuada: ¡todos a salvo!', en: 'Mission evacuated: everyone is safe!' }, text: { es: 'Tu salud llegó a cero y Control de Misión te trajo de vuelta. Evacuar no es fracasar: la seguridad va primero.', en: 'Your health reached zero and Mission Control brought you home. Evacuating is not failing: safety comes first.' } },
    timeUp: { emoji: '🛬', title: { es: 'Llega la nave de relevo', en: 'The relief crew arrives' }, text: { es: `Terminaste los ${r.totalDays} días con un ${r.research} % de investigación. ¡Casi! El siguiente equipo seguirá tu trabajo.`, en: `You finished the ${r.totalDays} days with ${r.research} % research. So close! The next crew will continue your work.` } }
  }[r.result];

  const sun = r.sun;
  const stats = r.stats;
  const decision = keyDecisionText(r, lang);
  const strongest = strongestText(r, lang);

  const footer = (
    <>
      <button type="button" className="btn btn-ghost" onClick={onMenu}>
        <Icon name="home" />
        {t({ es: 'Menú', en: 'Menu' })}
      </button>
      <button type="button" className="btn btn-secondary" onClick={onNewGame}>
        <Icon name="dice" />
        {t({ es: 'Nueva partida', en: 'New game' })}
      </button>
      <button type="button" className="btn btn-primary btn-lg" onClick={onReplay} data-autofocus>
        <Icon name="refresh" />
        {t({ es: 'Repetir y cambiar una decisión', en: 'Replay and change one decision' })}
      </button>
    </>
  );

  return (
    <Modal title={t({ es: '¿Por qué pasó?', en: 'Why did it happen?' })} icon="trophy" accent={r.result === 'win' ? 'var(--ok)' : r.result === 'evacuated' ? 'var(--bed)' : 'var(--energy)'} size="xl" closable={false} className="report-modal" footer={footer}>
      <div className="final-hero">
        <span className="big-emoji" aria-hidden="true">
          {hero.emoji}
        </span>
        <h2>{t(hero.title)}</h2>
        <p className="muted">{t(hero.text)}</p>
      </div>

      <div className="comic">
        <article className="comic-panel">
          <span className="comic-n">1</span>
          <h3>{t({ es: 'La decisión que más pesó', en: 'The decision that mattered most' })}</h3>
          <span className="comic-emoji" aria-hidden="true">
            {r.keyDecision?.kind === 'shieldReady' ? '🛡️' : r.keyDecision?.kind === 'hunger' ? '🌱' : r.keyDecision?.kind === 'outside' ? '🚙' : r.keyDecision?.kind === 'overexertion' ? '💪' : r.keyDecision?.kind === 'radiation' ? '☢️' : '🧭'}
          </span>
          <RichText as="p" text={decision} />
        </article>
        <article className="comic-panel">
          <span className="comic-n">2</span>
          <h3>{t({ es: 'El evento más fuerte', en: 'The strongest event' })}</h3>
          <span className="comic-emoji" aria-hidden="true">
            ☀️
          </span>
          <RichText as="p" text={strongest} />
          <DataTag kind={r.source === 'EN VIVO' ? 'EN VIVO' : 'ARCHIVO'} />
        </article>
        <article className="comic-panel">
          <span className="comic-n">3</span>
          <h3>{t({ es: 'El resultado', en: 'The result' })}</h3>
          <span className="comic-emoji" aria-hidden="true">
            🔬
          </span>
          <p>
            {t({ es: `Investigación: ${r.research} % · Salud: ${r.health}/5 · Días: ${r.daysPlayed}/${r.totalDays}`, en: `Research: ${r.research} % · Health: ${r.health}/5 · Days: ${r.daysPlayed}/${r.totalDays}` })}
          </p>
          {r.missionsDone.length > 0 && (
            <p className="muted">
              <Icon name="check" size="1.1em" /> {r.missionsDone.map((id) => t(MISSION_TEXT[id]?.title) || id).join(' · ')}
            </p>
          )}
        </article>
      </div>

      <div className="fact-box">{t(TIPS[r.tip] || TIPS.rover)}</div>

      <section>
        <h3>{t({ es: 'Tus números', en: 'Your numbers' })}</h3>
        <div className="stats-grid">
          <div className="stat">
            <strong>
              {stats.stormsBlocked}/{stats.stormNights}
            </strong>
            <span>{t({ es: 'tormentas frenadas', en: 'storms blocked' })}</span>
          </div>
          <div className="stat">
            <strong>{stats.meals}</strong>
            <span>{t({ es: 'cenas', en: 'dinners' })}</span>
          </div>
          <div className="stat">
            <strong>{stats.foodGrown}</strong>
            <span>{t({ es: 'raciones cultivadas', en: 'rations grown' })}</span>
          </div>
          <div className="stat">
            <strong>{stats.expeditions}</strong>
            <span>{t({ es: 'expediciones', en: 'expeditions' })}</span>
          </div>
          <div className="stat">
            <strong>{stats.repairs}</strong>
            <span>{t({ es: 'reparaciones', en: 'repairs' })}</span>
          </div>
          <div className="stat">
            <strong>{stats.upgrades}</strong>
            <span>{t({ es: 'mejoras', en: 'upgrades' })}</span>
          </div>
          <div className="stat">
            <strong>
              {stats.energyTo.shield} · {stats.energyTo.antenna} · {stats.energyTo.farm}
            </strong>
            <span>{t({ es: 'energía: escudo · antena · granja', en: 'power: shield · antenna · farm' })}</span>
          </div>
        </div>
        <p className="muted">
          {t({ es: 'Niveles finales', en: 'Final levels' })}:{' '}
          {Object.entries(r.levels)
            .map(([b, l]) => `${t(BUILDING[b])} ${l}`)
            .join(' · ')}
        </p>
      </section>

      <section className="real-data">
        <div className="real-data-head">
          <strong>
            <Icon name="sun" size="1.1em" /> {t({ es: 'Mientras jugabas, el Sol real hizo esto', en: 'While you played, the real Sun did this' })}
          </strong>
          <DataTag kind={r.source === 'EN VIVO' ? 'EN VIVO' : 'ARCHIVO'} />
        </div>
        <ul className="report-list">
          <li className="info">
            <span className="ri" aria-hidden="true">
              <Icon name="bolt" size={26} />
            </span>
            <span>
              {t({ es: `${sun.xFlares} llamaradas de clase X`, en: `${sun.xFlares} X-class flares` })}
              {sun.maxFlare && t({ es: `; la mayor, ${sun.maxFlare.c} el ${formatDate(sun.maxFlare.date, 'es')}.`, en: `; the biggest, ${sun.maxFlare.c} on ${formatDate(sun.maxFlare.date, 'en')}.` })}
            </span>
          </li>
          {sun.maxKp && (
            <li className="info">
              <span className="ri" aria-hidden="true">
              <Icon name="aurora" size={26} />
            </span>
              <span>{t({ es: `Tormenta geomagnética en la Tierra de Kp ${fmtNum(sun.maxKp.kp, 'es', 1)} (${formatDate(sun.maxKp.date, 'es')}).`, en: `Geomagnetic storm on Earth of Kp ${fmtNum(sun.maxKp.kp, 'en', 1)} (${formatDate(sun.maxKp.date, 'en')}).` })}</span>
            </li>
          )}
          {sun.maxMoonRadiation && (
            <li className="info">
              <span className="ri" aria-hidden="true">
              <Icon name="moon" size={26} />
            </span>
              <span>
                {t({
                  es: `Radiación cerca de la Luna: hasta ${fmtNum(sun.maxMoonRadiation.x, 'es', 0)} veces lo normal (${formatDate(sun.maxMoonRadiation.date, 'es')}, CRaTER).`,
                  en: `Radiation near the Moon: up to ${fmtNum(sun.maxMoonRadiation.x, 'en', 0)} times normal (${formatDate(sun.maxMoonRadiation.date, 'en')}, CRaTER).`
                })}
                {sun.maxIssRadiation && t({ es: ` En la Estación Espacial, como mucho ${fmtNum(sun.maxIssRadiation.x, 'es', 1)} veces.`, en: ` On the Space Station, at most ${fmtNum(sun.maxIssRadiation.x, 'en', 1)} times.` })}
              </span>
            </li>
          )}
          {sun.maxMarsRadiation && sun.maxMarsRadiation.x >= 5 && (
            <li className="info">
              <span className="ri" aria-hidden="true">
              <Icon name="mars" size={26} />
            </span>
              <span>
                {t({
                  es: `En Marte (Curiosity), ${fmtNum(sun.maxMarsRadiation.x, 'es', 0)} veces lo normal el ${formatDate(sun.maxMarsRadiation.date, 'es')}, con un pico de ${fmtNum(sun.maxMarsRadiation.peakX, 'es', 0)}.`,
                  en: `On Mars (Curiosity), ${fmtNum(sun.maxMarsRadiation.x, 'en', 0)} times normal on ${formatDate(sun.maxMarsRadiation.date, 'en')}, with a peak of ${fmtNum(sun.maxMarsRadiation.peakX, 'en', 0)}.`
                })}
              </span>
            </li>
          )}
          {sun.fastestCme && (
            <li className="info">
              <span className="ri" aria-hidden="true">
              <Icon name="cme" size={26} />
            </span>
              <span>{t({ es: `La CME más rápida salió a ${fmtNum(sun.fastestCme.speed, 'es')} km/s.`, en: `The fastest CME left at ${fmtNum(sun.fastestCme.speed, 'en')} km/s.` })}</span>
            </li>
          )}
        </ul>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onSources}>
          <Icon name="data" />
          {t({ es: '¿De dónde salen estos datos?', en: 'Where does this data come from?' })}
        </button>
      </section>

      {shownFresh.length > 0 && (
        <p className="muted">
          <Icon name="book" size="1.1em" /> {t({ es: 'Nuevo en tu Diario', en: 'New in your Journal' })}: {shownFresh.map((id) => t(DISCOVERIES[id]?.title)).join(' · ')}
        </p>
      )}
    </Modal>
  );
}
