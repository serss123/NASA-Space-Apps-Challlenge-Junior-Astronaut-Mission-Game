// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Night report (when you wake up): what happened and WHY, with the real data of that day and its label.
// Layout: a paper Modal. The list of what happened is on the left and the real data of the day on the right (stacked on
// narrow screens); if it is all too tall the body scrolls, and the "Let's get to work!" button stays in the footer.
import { formatDate } from '@shared/gameTranslator.js';
import { DISCOVERIES } from '../../content/discoveries.js';
import { FACTS } from '../../content/facts.js';
import { hashString, sel } from '../../engine/index.js';
import { fmtNum, useI18n } from '../../i18n.jsx';
import DataTag from '../components/DataTag.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import RichText from '../components/RichText.jsx';
import { CauseLine } from '../panels/ModulePanel.jsx';
import { RadiationLevel } from '../panels/common.jsx';
import './reports.css';

const TASK_NAME = {
  panels: { icon: 'broom', es: 'Paneles sucios de regolito', en: 'Regolith on the solar panels' },
  cables: { icon: 'plug', es: 'Cables del escudo cortocircuitados', en: 'Shield cables short-circuited' },
  antenna: { icon: 'antenna', es: 'Antena descalibrada', en: 'Antenna out of calibration' }
};

/** Hearts before and after the night: full hearts for what you have, broken ones for what you lost. */
function HealthChange({ before, after, max = 5 }) {
  const { t } = useI18n();
  const row = (n) => Array.from({ length: max }, (_, i) => <Icon key={i} name={i < n ? 'heart' : 'heart-broken'} size={30} className={i < n ? 'heart is-full' : 'heart'} />);
  return (
    <div className="health-change" role="img" aria-label={t({ es: `Salud: de ${before} a ${after}`, en: `Health: from ${before} to ${after}` })}>
      <span>{row(before)}</span>
      <Icon name="arrow-right" size={28} />
      <span>{row(after)}</span>
    </div>
  );
}

export default function NightReport({ state, fresh, onWake }) {
  const { t, lang } = useI18n();
  const rep = state.night;
  if (!rep) return null;
  const nightDay = state.timeline[rep.dayIndex];
  const today = sel.currentDay(state);
  const st = nightDay.radiation.stations || {};
  const live = state.source === 'EN VIVO';
  const items = [];

  if (rep.harvest) items.push({ k: 'h', tone: 'good', icon: 'food', text: { es: `Cosecha: +${rep.harvest} raciones. ¡Invertir ayer dio comida hoy!`, en: `Harvest: +${rep.harvest} rations. Yesterday's investment gave food today!` } });
  if (rep.unpoweredCrops) items.push({ k: 'u', tone: 'bad', icon: 'farm', text: { es: 'La granja no tuvo energía: tus plantas no crecieron.', en: 'The farm had no power: your plants did not grow.' } });
  items.push(
    rep.ate
      ? { k: 'f', tone: 'good', icon: 'food', text: { es: 'Cenaste bien.', en: 'You had dinner.' } }
      : { k: 'f', tone: 'bad', icon: 'food', text: { es: 'No había comida: pierdes 1 corazón y no recuperaste las Fuerzas.', en: 'There was no food: you lose 1 heart and did not recover Stamina.' } }
  );
  if (rep.level > 0) {
    items.push(
      rep.protected
        ? { k: 'r', tone: 'good', icon: 'shield', text: { es: `Tormenta de radiación de nivel ${rep.level}: tu escudo (carga ${rep.shieldCharge}) te protegió.`, en: `Level ${rep.level} radiation storm: your shield (charge ${rep.shieldCharge}) protected you.` } }
        : { k: 'r', tone: 'bad', icon: 'radiation', text: { es: `Tormenta de radiación de nivel ${rep.level} y tu escudo tenía carga ${rep.shieldCharge}: pierdes 1 corazón.`, en: `Level ${rep.level} radiation storm and your shield had charge ${rep.shieldCharge}: you lose 1 heart.` } }
    );
  } else {
    items.push({ k: 'r', tone: 'info', icon: 'calm', text: { es: 'Noche tranquila: sin tormenta de radiación.', en: 'Calm night: no radiation storm.' } });
  }
  if (rep.damage.includes('outside')) items.push({ k: 'o', tone: 'bad', icon: 'rover', text: { es: 'Saliste con el Rover con radiación alta: el escudo no te protegía fuera. Pierdes 1 corazón.', en: 'You took the Rover out in high radiation: the shield could not protect you outside. You lose 1 heart.' } });
  if (rep.damage.includes('overexertion')) items.push({ k: 'x', tone: 'bad', icon: 'stamina', text: { es: 'Te pasaste de esfuerzo: pierdes 1 corazón.', en: 'You overexerted yourself: you lose 1 heart.' } });
  if (rep.healed) items.push({ k: 'he', tone: 'good', icon: 'heart', text: { es: 'Dos noches seguidas sin problemas: recuperas 1 corazón.', en: 'Two nights in a row without trouble: you recover 1 heart.' } });
  if (rep.watched) items.push({ k: 'w', tone: 'good', icon: 'antenna', text: { es: `Registraste el clima espacial para la NASA (vigía ${state.missions.watch}/3).`, en: `You recorded the space weather for NASA (watch ${state.missions.watch}/3).` } });
  if (rep.stored) items.push({ k: 'b', tone: 'info', icon: 'battery', text: { es: `Guardaste ${rep.stored} de energía en la batería para hoy.`, en: `You stored ${rep.stored} power in the battery for today.` } });

  const breakdowns = state.log.filter((e) => e.kind === 'breakdown' && e.day === state.dayIndex);
  const factTags = rep.level > 0 ? ['storm', 'radiation', 'iss'] : ['calm', 'sun', 'moon', 'general'];
  const pool = FACTS.filter((f) => f.tags?.some((tg) => factTags.includes(tg)));
  const fact = pool.length ? pool[hashString(`${state.seed}|night|${rep.dayIndex}`) % pool.length] : null;
  const link = nightDay.sep[0]?.link || nightDay.shocks[0]?.link || nightDay.flares.items[0]?.link;

  return (
    <Modal
      title={t({ es: `Amanece: ${formatDate(today.date, lang)}`, en: `Morning: ${formatDate(today.date, lang)}` })}
      icon="sunrise"
      accent="var(--bed)"
      size="xl"
      closable={false}
      className="report-modal"
      footer={
        <button type="button" className="btn btn-primary btn-lg" onClick={onWake} data-autofocus>
          <Icon name="sun" />
          {t({ es: '¡A trabajar!', en: "Let's get to work!" })}
        </button>
      }
    >
      <HealthChange before={rep.healthBefore} after={rep.healthAfter} />

      <div className="report-cols">
        <section className="report-block">
          <h3>{t({ es: `Lo que pasó la noche del ${formatDate(nightDay.date, lang)}`, en: `What happened on the night of ${formatDate(nightDay.date, lang)}` })}</h3>
          <ul className="report-list">
            {items.map((it) => (
              <li key={it.k} className={it.tone}>
                <span className="ri" aria-hidden="true">
                  <Icon name={it.icon} size={26} />
                </span>
                <span>{t(it.text)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="report-block real-data">
          <div className="real-data-head">
            <h3>
              <Icon name="satellite" size="1.1em" /> {t({ es: 'Lo que pasó de verdad ese día', en: 'What really happened that day' })}
            </h3>
            <DataTag kind={live ? 'EN VIVO' : 'ARCHIVO'} size="sm" />
          </div>
          <p>
            <strong>{t(nightDay.headline)}</strong>
          </p>
          <p>{t(nightDay.summary)}</p>
          <p className="report-level">
            <RadiationLevel level={rep.level} />
            <small>
              {nightDay.radiation.basis === 'measured'
                ? t({ es: 'Nivel medido por el detector CRaTER (nave LRO, en órbita lunar).', en: 'Level measured by the CRaTER detector (LRO spacecraft, in lunar orbit).' })
                : t({ es: 'Nivel estimado con los avisos de DONKI.', en: 'Level estimated from DONKI alerts.' })}
            </small>
          </p>
          {st.moonOrbit && st.iss && st.moonOrbit.x < 1.5 && (
            <RichText
              as="p"
              text={{
                es: 'Cerca de la Luna, la radiación fue la de un día normal ([[crater-detector|CRaTER]]).',
                en: 'Near the Moon, radiation was at a normal level ([[crater-detector|CRaTER]]).'
              }}
            />
          )}
          {st.moonOrbit && st.iss && st.moonOrbit.x >= 1.5 && (
            <RichText
              as="p"
              text={{
                es: `Cerca de la Luna hubo **${fmtNum(st.moonOrbit.x, 'es', 1)} veces** la radiación de un día normal; dentro de la [[iss|Estación Espacial]], **${fmtNum(st.iss.x, 'es', 1)} veces**. ${st.moonOrbit.x >= 10 && st.iss.x < 2 ? 'La Estación está protegida por la [[magnetosphere|magnetosfera]] de la Tierra; la Luna no.' : ''}`,
                en: `Near the Moon there was **${fmtNum(st.moonOrbit.x, 'en', 1)} times** the radiation of a normal day; inside the [[iss|Space Station]], **${fmtNum(st.iss.x, 'en', 1)} times**. ${st.moonOrbit.x >= 10 && st.iss.x < 2 ? 'The Station is protected by Earth’s [[magnetosphere]]; the Moon is not.' : ''}`
              }}
            />
          )}
          {st.mars && st.mars.x >= 5 && (
            <RichText
              as="p"
              text={{
                es: `En [[mars|Marte]], el rover Curiosity midió **${fmtNum(st.mars.x, 'es', 0)} veces** lo normal (con un pico de ${fmtNum(st.mars.peakX, 'es', 0)}).`,
                en: `On [[mars|Mars]], the Curiosity rover measured **${fmtNum(st.mars.x, 'en', 0)} times** normal (with a peak of ${fmtNum(st.mars.peakX, 'en', 0)}).`
              }}
            />
          )}
          {link && (
            <a href={link} target="_blank" rel="noreferrer noopener">
              {t({ es: 'Ver el dato original en DONKI', en: 'See the original data in DONKI' })}
            </a>
          )}
        </section>

        {breakdowns.length > 0 && (
          <section className="report-block tone-alert">
            <h3>
              <Icon name="warning" size="1.1em" /> {t({ es: 'Esta mañana hay averías', en: 'Breakdowns this morning' })}
            </h3>
            {breakdowns.map((b, i) => (
              <div key={i} className="report-breakdown">
                <strong>
                  <Icon name={TASK_NAME[b.task].icon} size="1.1em" /> {t(TASK_NAME[b.task])}
                </strong>
                <CauseLine cause={b.cause} state={state} />
              </div>
            ))}
          </section>
        )}

        {fresh.length > 0 && (
          <section className="report-block">
            <h3>
              <Icon name="book" size="1.1em" /> {t({ es: 'Nuevos descubrimientos para tu Diario', en: 'New discoveries for your Journal' })}
            </h3>
            <div className="mini-discoveries">
              {fresh.map((id) => (
                <div key={id} className="mini-discovery">
                  <strong>
                    {DISCOVERIES[id].emoji} {t(DISCOVERIES[id].title)}
                  </strong>
                  <RichText as="p" text={DISCOVERIES[id].happened} />
                  {DISCOVERIES[id].tag && <DataTag kind={DISCOVERIES[id].tag} size="sm" />}
                </div>
              ))}
            </div>
          </section>
        )}

        {fact && (
          <div className="fact-box report-wide">
            <span aria-hidden="true">{fact.emoji || '💡'} </span>
            <strong>{t({ es: '¿Sabías que…? ', en: 'Did you know…? ' })}</strong>
            <RichText text={fact.text} />{' '}
            {fact.source?.url && (
              <a href={fact.source.url} target="_blank" rel="noreferrer noopener">
                ({fact.source.label})
              </a>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
