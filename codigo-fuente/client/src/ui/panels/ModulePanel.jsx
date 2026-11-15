// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Panels of the base modules (they open when the astronaut reaches a module, or when its label is tapped).
// Layout (docs/DESIGN.md section 3): ONE page per panel. Every section (actions, upgrade, learn; the Antenna adds Earth,
// Missions and Today) sits under its own small heading, most important first, and a page lays its blocks out in columns
// when the window is wide. If the window is too small for all of it, the body of the Modal scrolls: nothing is hidden.
import { useEffect, useRef, useState } from 'react';
import { earthMarsLightTime, earthMoonLightTime, formatDelay } from '@shared/marsDelay.js';
import { formatDate } from '@shared/gameTranslator.js';
import { BALANCE, MISSION_BY_ID, hashString, sel } from '../../engine/index.js';
import { FACTS } from '../../content/facts.js';
import { MISSION_TEXT } from '../../content/missions.js';
import { fmtNum, useI18n } from '../../i18n.jsx';
import { sfx } from '../../audio/sfx.js';
import DataTag from '../components/DataTag.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import RichText from '../components/RichText.jsx';
import { MODULE_ICONS, MODULE_NAMES } from '../map/BaseMap.jsx';
import { MODULE_BY_ID } from '../map/layout.js';
import { ActionButton, CostChips, EnergyToggle, RES_NAME, RadiationLevel, Section, ShieldStepper, UpgradeBox, reasonText } from './common.jsx';

/** Standard page labels. */
const PAGE = {
  act: { id: 'act', icon: 'wrench', label: { es: 'Acciones', en: 'Actions' }, tone: 'var(--energy)' },
  upgrade: { id: 'upgrade', icon: 'arrow-up', label: { es: 'Mejorar', en: 'Upgrade' }, tone: 'var(--science)' },
  learn: { id: 'learn', icon: 'book', label: { es: 'Aprende', en: 'Learn' }, tone: 'var(--ice)' }
};

/**
 * A panel as ONE page: every section (actions, upgrade, learn...) is laid out in columns under its own small heading,
 * most important first. If the window is too small for all of it, the page scrolls: nothing is hidden behind tabs.
 * pages = [{ id, icon, label, badge?, content }]
 */
function PanelPages({ pages, label }) {
  const { t } = useI18n();
  return (
    <div className="panel-page" role="region" aria-label={t(label)}>
      {pages.map((page) => (
        <section key={page.id} className="panel-group" aria-labelledby={`pg-${page.id}`}>
          {pages.length > 1 && (
            <h3 id={`pg-${page.id}`} className="panel-group-title">
              <Icon name={page.icon} size="1.2em" />
              {t(page.label)}
              {page.badge != null && page.badge !== false && <span className="panel-group-badge">{page.badge}</span>}
            </h3>
          )}
          <div className="panel-cols">{page.content}</div>
        </section>
      ))}
    </div>
  );
}

/** A curious fact with its source, chosen in a stable way for that day and module. */
function FactCard({ state, tags, salt }) {
  const { t } = useI18n();
  const pool = FACTS.filter((f) => f.tags?.some((tg) => tags.includes(tg)));
  if (!pool.length) return null;
  const f = pool[hashString(`${state.seed}|${state.dayIndex}|${salt}`) % pool.length];
  return (
    <div className="fact-box panel-wide">
      <span aria-hidden="true">{f.emoji || '💡'} </span>
      <strong>{t({ es: '¿Sabías que…? ', en: 'Did you know…? ' })}</strong>
      <RichText text={f.text} />{' '}
      {f.source?.url && (
        <a href={f.source.url} target="_blank" rel="noreferrer noopener">
          ({f.source.label})
        </a>
      )}{' '}
      {f.tag && <DataTag kind={f.tag} size="sm" />}
    </div>
  );
}

function TaskCard({ task, state, onStartTask }) {
  const { t } = useI18n();
  const info = {
    panels: { icon: 'broom', title: { es: 'Paneles sucios de regolito', en: 'Regolith on the solar panels' }, effect: { es: 'Mientras estén sucios, cada mañana tendrás 1 de energía menos.', en: 'While they are dirty, you get 1 power less every morning.' } },
    cables: { icon: 'plug', title: { es: 'Cables cortocircuitados', en: 'Short-circuited cables' }, effect: { es: 'Mientras estén rotos, no podrás cargar el escudo.', en: 'While they are broken, you cannot charge the shield.' } },
    antenna: { icon: 'antenna', title: { es: 'Antena descalibrada', en: 'Antenna out of calibration' }, effect: { es: 'Sin previsión del clima espacial ni misiones de la NASA.', en: 'No space-weather forecast and no NASA missions.' } }
  }[task];
  const broken = state.tasks[task];
  if (!broken) return null;
  const chk = sel.canRepair(state, task);
  return (
    <Section tone="alert" icon="warning" title={t(info.title)}>
      <p>{t(info.effect)}</p>
      <CauseLine cause={broken.cause} state={state} />
      <ActionButton variant="warn" icon={info.icon} label={t({ es: 'Reparar ahora', en: 'Repair now' })} cost={{ stamina: BALANCE.maintenance.repairStamina }} check={chk} onClick={() => onStartTask(task)} />
    </Section>
  );
}

/** Why it broke (the real event that caused it). The chance itself is SIMULATED. */
export function CauseLine({ cause, state }) {
  const { t, lang } = useI18n();
  if (!cause) return null;
  const when = cause.time ? ` · ${formatDate(cause.time, lang)} ${cause.time.slice(11, 16)} UTC` : '';
  const text = {
    flareX: { es: `Causa: llamarada ${cause.ref} real${when}.`, en: `Cause: real ${cause.ref} flare${when}.` },
    sep: { es: `Causa: partículas solares (SEP) reales${when}.`, en: `Cause: real solar particles (SEP)${when}.` },
    shock: { es: `Causa: llegada real del choque de una CME${when}.`, en: `Cause: real arrival of a CME shock${when}.` },
    kp: {
      es: `Causa: tormenta geomagnética real (Kp ${fmtNum(cause.kp ?? parseFloat(String(cause.ref).replace(/[^\d.]/g, '')), 'es', 1)}).`,
      en: `Cause: real geomagnetic storm (Kp ${fmtNum(cause.kp ?? parseFloat(String(cause.ref).replace(/[^\d.]/g, '')), 'en', 1)}).`
    },
    rover: { es: 'Causa: el Rover levantó polvo al salir.', en: 'Cause: the Rover kicked up dust.' },
    micrometeorite: { es: 'Causa: el impacto de un micrometeorito levantó polvo.', en: 'Cause: a micrometeorite impact kicked up dust.' },
    event: { es: 'Causa: un evento solar real.', en: 'Cause: a real solar event.' }
  }[cause.kind] || { es: '', en: '' };
  const real = ['flareX', 'sep', 'shock', 'kp', 'event'].includes(cause.kind);
  return (
    <p className="cause-line">
      {t(text)} {real ? <DataTag kind={state.source === 'EN VIVO' ? 'EN VIVO' : 'ARCHIVO'} size="sm" /> : null} <DataTag kind="SIMULADO" size="sm" />{' '}
      {cause.link && (
        <a href={cause.link} target="_blank" rel="noreferrer noopener">
          {t({ es: 'Ver dato original', en: 'See original data' })}
        </a>
      )}
    </p>
  );
}

/** Intro paragraph of a panel (always on the "Learn" page, with its glossary words). */
function Intro({ text }) {
  return <RichText as="p" className="panel-intro panel-wide" text={text} />;
}

// ---------------- Life Support ----------------
function LifeSupportPanel({ state, dispatch }) {
  const { t } = useI18n();
  const e = state.energy;
  const free = sel.freeEnergy(state);
  useEffect(() => {
    dispatch({ type: 'DISCOVER', id: 'base-energy' });
  }, [dispatch]);
  const tokenIcon = { antenna: 'antenna', farm: 'farm', shield: 'shield', free: 'bolt' };
  return (
    <PanelPages
      label={{ es: 'Soporte Vital', en: 'Life Support' }}
      pages={[
        {
          ...PAGE.act,
          content: (
            <>
              <Section icon="bolt" title={t({ es: 'Energía de hoy', en: "Today's power" })}>
                <div className="energy-tokens" role="img" aria-label={t({ es: `Energía: ${e.total} en total, ${free} libre`, en: `Power: ${e.total} in total, ${free} free` })}>
                  {Array.from({ length: e.total }).map((_, i) => {
                    const kind = i < e.antenna ? 'antenna' : i < e.antenna + e.farm ? 'farm' : i < e.antenna + e.farm + e.shield ? 'shield' : 'free';
                    return (
                      <span key={i} className={`token token-${kind}`}>
                        <Icon name={tokenIcon[kind]} size={26} />
                      </span>
                    );
                  })}
                </div>
                <p className="muted">
                  {t({ es: `Paneles: ${e.base}`, en: `Panels: ${e.base}` })}
                  {e.stored ? t({ es: ` · batería: +${e.stored}`, en: ` · battery: +${e.stored}` }) : ''}
                  {e.penalty ? t({ es: ` · polvo en los paneles: −${e.penalty}`, en: ` · dust on the panels: −${e.penalty}` }) : ''}
                  {' · '}
                  <strong>{t({ es: `${free} libre`, en: `${free} free` })}</strong>
                </p>
                <EnergyToggle state={state} system="antenna" dispatch={dispatch} label={t({ es: 'Antena', en: 'Antenna' })} />
                <EnergyToggle state={state} system="farm" dispatch={dispatch} label={t({ es: 'Granja', en: 'Farm' })} />
              </Section>
              <Section icon="shield" title={t({ es: 'Escudo', en: 'Shield' })}>
                <ShieldStepper state={state} dispatch={dispatch} />
                {state.tasks.cables && (
                  <p className="action-reason">
                    <Icon name="lock" size="1.1em" /> {reasonText('cables', t)}
                  </p>
                )}
                <RichText
                  as="p"
                  className="muted"
                  text={{
                    es: `Lo que no uses hoy se guarda en la [[battery|batería]] para mañana (capacidad ${sel.batteryCapacity(state)}).`,
                    en: `Whatever you don't use today is stored in the [[battery]] for tomorrow (capacity ${sel.batteryCapacity(state)}).`
                  }}
                />
              </Section>
            </>
          )
        },
        { ...PAGE.upgrade, content: <UpgradeBox state={state} building="lifeSupport" dispatch={dispatch} /> },
        {
          ...PAGE.learn,
          content: (
            <>
              <Intro
                text={{
                  es: 'El [[life-support]] da aire, agua y temperatura a la base y reparte la energía de los [[solar-panel|paneles solares]]. Es el corazón de la base: marca el nivel máximo del resto de edificios.',
                  en: '[[life-support]] keeps air, water and temperature in the base and shares out the power from the [[solar-panel|solar panels]]. It is the heart of the base: it sets the top level of every other building.'
                }}
              />
              <FactCard state={state} tags={['energy', 'health', 'water']} salt="life" />
            </>
          )
        }
      ]}
    />
  );
}

// ---------------- Farm ----------------
function FarmPanel({ state, dispatch }) {
  const { t } = useI18n();
  return (
    <PanelPages
      label={{ es: 'Granja', en: 'Farm' }}
      pages={[
        {
          ...PAGE.act,
          content: (
            <>
              <div className="panel-wide">
                <EnergyToggle
                  state={state}
                  system="farm"
                  dispatch={dispatch}
                  label={t({ es: 'Luces y riego de la granja', en: 'Farm lights and watering' })}
                  help={{ es: 'Sin energía, hoy las plantas no crecen.', en: 'Without power, plants do not grow today.' }}
                />
              </div>
              <div className="plots panel-wide">
                {state.plots.map((p, i) => {
                  const chk = sel.canPlant(state, i);
                  if (p.crop) {
                    const left = BALANCE.farm.growDays - p.crop.growth;
                    return (
                      <div key={i} className="plot">
                        <span className="plot-emoji" aria-hidden="true">
                          {p.crop.growth === 0 ? '🌱' : '🌿'}
                        </span>
                        <strong>{t({ es: `Bancal ${i + 1}`, en: `Planter ${i + 1}` })}</strong>
                        <div className="plot-progress" aria-hidden="true">
                          <i style={{ width: `${(p.crop.growth / BALANCE.farm.growDays) * 100}%` }} />
                        </div>
                        <small>
                          {t({
                            es: `Faltan ${left} ${left === 1 ? 'día' : 'días'} con energía → +${BALANCE.farm.yield} raciones`,
                            en: `${left} more powered ${left === 1 ? 'day' : 'days'} → +${BALANCE.farm.yield} rations`
                          })}
                        </small>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="plot">
                      <span className="plot-emoji" aria-hidden="true">
                        🟫
                      </span>
                      <strong>{t({ es: `Bancal ${i + 1} vacío`, en: `Planter ${i + 1} empty` })}</strong>
                      <ActionButton
                        icon="farm"
                        label={t({ es: 'Plantar', en: 'Plant' })}
                        cost={{ stamina: BALANCE.farm.plantStamina, ice: BALANCE.farm.plantIce }}
                        check={chk}
                        onClick={() => {
                          sfx.play('ok');
                          dispatch({ type: 'PLANT', plot: i });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="muted panel-wide">
                <Icon name="food" size="1.1em" /> {t({ es: `Raciones: ${state.inv.food}. Comes 1 cada noche.`, en: `Rations: ${state.inv.food}. You eat 1 every night.` })}
              </p>
            </>
          )
        },
        { ...PAGE.upgrade, content: <UpgradeBox state={state} building="farm" dispatch={dispatch} /> },
        {
          ...PAGE.learn,
          content: (
            <>
              <Intro
                text={{
                  es: 'En el [[greenhouse|invernadero]] crecen plantas con luz y agua. Plantar cuesta hoy; la comida llega **2 días después**, si la granja tiene energía esos días.',
                  en: 'In the [[greenhouse]] plants grow with light and water. Planting costs today; the food arrives **2 days later**, if the farm has power on those days.'
                }}
              />
              <FactCard state={state} tags={['food', 'water']} salt="farm" />
            </>
          )
        }
      ]}
    />
  );
}

// ---------------- Antenna ----------------
function SignalLink({ seconds, onArrive, reducedMotion }) {
  const [elapsed, setElapsed] = useState(0);
  const done = useRef(false);
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;
  useEffect(() => {
    const start = performance.now();
    let raf;
    // The visual counter runs on requestAnimationFrame; the arrival on a timer, so it never hangs
    // when the tab goes to the background.
    const tick = (now) => {
      setElapsed(Math.min(seconds, (now - start) / 1000));
      if (now - start < seconds * 1000) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timer = setTimeout(() => {
      setElapsed(seconds);
      if (!done.current) {
        done.current = true;
        onArriveRef.current();
      }
    }, seconds * 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [seconds]);
  return (
    <div className="signal-link" style={{ '--travel': `${seconds}s` }} aria-hidden="true">
      <span className="earth" />
      {!reducedMotion && <span className="pulse" />}
      <span className="moon" />
      <span className="timer">{elapsed.toFixed(1)} s</span>
    </div>
  );
}

function AntennaPanel({ state, dispatch, onStartTask, reducedMotion }) {
  const { t, lang } = useI18n();
  const [linking, setLinking] = useState(false);
  const day = sel.currentDay(state);
  const moon = earthMoonLightTime(day.date);
  const mars = earthMarsLightTime(day.date);
  const fc = sel.forecast(state);
  const linked = state.today.antennaLinked;
  const rawLink = sel.canLink(state);
  // A clear reason for a child: if the antenna is off, the problem is its switch (not power in general).
  const linkChk = rawLink.reason === 'energy' ? { ...rawLink, reason: sel.freeEnergy(state) > 0 ? 'antennaOff' : 'antennaNoPower' } : rawLink;
  const onArrive = () => {
    setLinking(false);
    sfx.play('signal');
    dispatch({ type: 'LINK_ANTENNA' });
  };
  const source = state.source === 'EN VIVO' ? 'EN VIVO' : 'ARCHIVO';

  const broken = !!state.tasks.antenna;
  const predictions = fc?.predictions ?? [];

  // Earth page: broken -> only the repair card; not linked -> the switch and the link button; linked -> the forecast.
  const earthPage = (
    <>
      <TaskCard task="antenna" state={state} onStartTask={onStartTask} />
      {!broken && !linked && (
        <>
          <Section icon="antenna" title={t({ es: 'La antena', en: 'The antenna' })}>
            <EnergyToggle state={state} system="antenna" dispatch={dispatch} label={t({ es: 'Encender la antena', en: 'Switch on the antenna' })} />
          </Section>
          <Section icon="satellite" title={t({ es: 'Conectar con la Tierra', en: 'Link with Earth' })}>
            {linking ? (
              <SignalLink seconds={BALANCE.antenna.linkSeconds} onArrive={onArrive} reducedMotion={reducedMotion} />
            ) : (
              <ActionButton variant="secondary" icon="satellite" label={t({ es: 'Recibir la previsión y las misiones', en: 'Get the forecast and missions' })} check={linkChk} onClick={() => setLinking(true)} />
            )}
            <RichText
              as="p"
              className="muted"
              text={{
                es: `La señal viaja a la [[light-speed|velocidad de la luz]]: la Tierra está a ${fmtNum(moon.km, lang)} km, así que tarda **${formatDelay(moon.seconds, lang)}** ([[signal-delay]]).`,
                en: `The signal travels at the [[light-speed|speed of light]]: Earth is ${fmtNum(moon.km, lang)} km away, so it takes **${formatDelay(moon.seconds, lang)}** ([[signal-delay]]).`
              }}
            />
          </Section>
        </>
      )}
      {!broken && linked && (
        <>
          <Section icon="eye" title={t({ es: 'Previsión de tormentas', en: 'Storm forecast' })}>
            <div className="forecast">
              {fc?.days.map((d) => (
                <div key={d.date} className="forecast-day">
                  <small>
                    {d.offset === 0 ? t({ es: 'Esta noche', en: 'Tonight' }) : d.offset === 1 ? t({ es: 'Mañana', en: 'Tomorrow' }) : t({ es: 'Pasado mañana', en: 'In 2 days' })} · {formatDate(d.date, lang).replace(/ de d{4}$|, d{4}$/, '')}
                  </small>
                  <RadiationLevel level={d.level} />
                  {d.offset > 0 && <DataTag kind="SIMULADO" size="sm" />}
                </div>
              ))}
            </div>
          </Section>
          {predictions.length > 0 && (
            <Section icon="cme" title={t({ es: 'Se acerca algo', en: 'Something is coming' })}>
              {predictions.map((p) => (
                <p key={p.arrivalTime} className="prediction">
                  <span>
                    <RichText
                      text={{
                        es: `El modelo [[wsa-enlil|WSA-Enlil]] predice que una [[cme]] llegará el **${formatDate(p.arrivalTime, 'es')} a las ${p.arrivalTime.slice(11, 16)} UTC**.`,
                        en: `The [[wsa-enlil|WSA-Enlil]] model predicts a [[cme]] will arrive on **${formatDate(p.arrivalTime, 'en')} at ${p.arrivalTime.slice(11, 16)} UTC**.`
                      }}
                    />{' '}
                    <DataTag kind={source} size="sm" />{' '}
                    <a href={p.link} target="_blank" rel="noreferrer noopener">
                      {t({ es: 'Ver en DONKI', en: 'See in DONKI' })}
                    </a>
                  </span>
                </p>
              ))}
            </Section>
          )}
        </>
      )}
    </>
  );

  const todayPage = linked ? (
    <TodayRealData state={state} />
  ) : (
    <Section icon="lock" title={t({ es: 'Sin conexión', en: 'No link' })}>
      <p>{t({ es: 'Conecta la antena con la Tierra para ver qué hace hoy el Sol.', en: 'Link the antenna with Earth to see what the Sun is doing today.' })}</p>
    </Section>
  );

  return (
    <PanelPages
      label={{ es: 'Antena', en: 'Antenna' }}
      pages={[
        { id: 'earth', icon: 'earth', label: { es: 'Tierra', en: 'Earth' }, tone: 'var(--antenna)', badge: state.tasks.antenna ? '!' : null, content: earthPage },
        { id: 'missions', icon: 'science', label: { es: 'Misiones', en: 'Missions' }, tone: 'var(--science)', badge: state.missions.active.length || null, content: <Missions state={state} dispatch={dispatch} /> },
        { id: 'today', icon: 'sun', label: { es: 'Hoy', en: 'Today' }, tone: 'var(--energy)', content: todayPage },
        { ...PAGE.upgrade, content: <UpgradeBox state={state} building="antenna" dispatch={dispatch} /> },
        {
          ...PAGE.learn,
          content: (
            <>
              <Intro
                text={{
                  es: 'La [[antenna|antena]] habla con [[mission-control|Control de Misión]] en la Tierra: trae la [[forecast|previsión]] del clima espacial de [[donki|DONKI]] y las misiones de la NASA.',
                  en: 'The [[antenna]] talks to [[mission-control]] on Earth: it brings the space-weather [[forecast]] from [[donki|DONKI]] and NASA’s missions.'
                }}
              />
              <Section icon="eye" title={t({ es: '¿Y si el pronóstico falla?', en: 'What if the forecast is wrong?' })}>
                <p>
                  {t({
                    es: 'Las previsiones de días futuros son una ayuda del juego: en la vida real a veces fallan (el 13 de mayo de 2024 un modelo predijo un choque que no llegó).',
                    en: 'Forecasts for future days are a game helper: in real life they sometimes fail (on 13 May 2024 a model predicted a shock that never came).'
                  })}
                </p>
              </Section>
              <Section icon="mars" title={t({ es: '¿Y si tu base estuviera en Marte?', en: 'What if your base were on Mars?' })}>
                <RichText
                  as="p"
                  text={{
                    es: `El ${formatDate(day.date, 'es')}, un mensaje a [[mars|Marte]] tardaba **${formatDelay(mars.seconds, 'es')}** (${fmtNum(Math.round(mars.km / 1e6), 'es')} millones de km). Allí no puedes esperar a que la Tierra te avise: hay que [[forecast|anticiparse]].`,
                    en: `On ${formatDate(day.date, 'en')}, a message to [[mars|Mars]] took **${formatDelay(mars.seconds, 'en')}** (${fmtNum(Math.round(mars.km / 1e6), 'en')} million km). There you cannot wait for Earth to warn you: you must [[forecast|plan ahead]].`
                  }}
                />
                <DataTag kind="CALCULADO" size="sm" />
              </Section>
            </>
          )
        }
      ]}
    />
  );
}

/** The real data of the day (what DONKI and RadLab bring), with its label and link. */
export function TodayRealData({ state }) {
  const { t, lang } = useI18n();
  const day = sel.currentDay(state);
  const st = day.radiation.stations || {};
  const note = day.notifications?.[0];
  return (
    <div className="real-data">
      <div className="real-data-head">
        <strong>
          <Icon name="calendar" size="1.1em" /> {formatDate(day.date, lang)}
        </strong>
        <DataTag kind={state.source === 'EN VIVO' ? 'EN VIVO' : 'ARCHIVO'} size="sm" />
      </div>
      <p>
        <strong>{t(day.headline)}</strong>
      </p>
      <p className="muted">{t(day.summary)}</p>
      {st.moonOrbit && st.iss && (
        <RichText
          as="p"
          className="muted"
          text={{
            es: `Cerca de la Luna ([[crater-detector|CRaTER]]): **${fmtNum(st.moonOrbit.x, 'es', 1)}×** lo normal · Dentro de la [[iss|Estación Espacial]]: **${fmtNum(st.iss.x, 'es', 1)}×**.`,
            en: `Near the Moon ([[crater-detector|CRaTER]]): **${fmtNum(st.moonOrbit.x, 'en', 1)}×** normal · Inside the [[iss|Space Station]]: **${fmtNum(st.iss.x, 'en', 1)}×**.`
          }}
        />
      )}
      {note?.summary && (
        <p className="donki-quote" lang="en">
          “{note.summary.length > 140 ? `${note.summary.slice(0, 139)}…` : note.summary}” — DONKI ({note.type})
        </p>
      )}
      {day.flares.items[0]?.link && (
        <a href={day.flares.items[0].link} target="_blank" rel="noreferrer noopener">
          {t({ es: 'Ver dato original en DONKI', en: 'See original data in DONKI' })}
        </a>
      )}
    </div>
  );
}

function Missions({ state, dispatch }) {
  const { t } = useI18n();
  const active = state.missions.active;
  return (
    <>
      <p className="panel-intro panel-wide">
        <Icon name="science" size="1.1em" /> {t({ es: 'Misiones de la NASA', en: 'NASA missions' })} · {t({ es: `ciencia ${state.research} %`, en: `science ${state.research} %` })}
      </p>
      {active.length === 0 && (
        <p className="muted panel-wide">
          {state.today.antennaLinked ? t({ es: 'No hay misiones nuevas ahora mismo.', en: 'No new missions right now.' }) : t({ es: 'Conecta la antena para recibir misiones.', en: 'Link the antenna to receive missions.' })}
        </p>
      )}
      {active.map((id) => {
        const m = MISSION_BY_ID[id];
        const txt = MISSION_TEXT[id] || {};
        const need = sel.missionNeeds(state, id);
        const chk = sel.canDeliver(state, id);
        return (
          <div key={id} className="mission">
            <div className="mission-head">
              <span aria-hidden="true">{txt.emoji || '🛰️'}</span>
              <strong>{t(txt.title) || id}</strong>
              <span className="mission-reward">
                +{m.reward} % <Icon name="science" size="1.1em" />
              </span>
            </div>
            {txt.brief && <RichText as="p" className="muted" text={txt.brief} />}
            <div className="mission-needs">
              {need.rows.map((r) => (
                <span key={r.key} className={`need-chip${r.have >= r.need ? ' is-ok' : ''}`}>
                  <Icon name={r.have >= r.need ? 'check' : 'plus'} size="1em" /> {Math.min(r.have, r.need)}/{r.need} {t(RES_NAME[r.key])}
                </span>
              ))}
            </div>
            <ActionButton
              variant="science"
              icon="rocket"
              label={t({ es: 'Enviar a la Tierra', en: 'Send to Earth' })}
              check={chk}
              onClick={() => {
                sfx.play('win');
                dispatch({ type: 'DELIVER', missionId: id });
              }}
            />
          </div>
        );
      })}
      {state.missions.done.length > 0 && (
        <p className="muted panel-wide">
          <Icon name="check" size="1.1em" /> {t({ es: 'Completadas', en: 'Completed' })}: {state.missions.done.map((id) => t(MISSION_TEXT[id]?.title) || id).join(' · ')}
        </p>
      )}
    </>
  );
}

// ---------------- Shield ----------------
function ShieldPanel({ state, dispatch, onStartTask }) {
  const { t } = useI18n();
  const known = sel.knownLevelTonight(state);
  return (
    <PanelPages
      label={{ es: 'Escudo', en: 'Shield' }}
      pages={[
        {
          ...PAGE.act,
          badge: state.tasks.cables ? '!' : null,
          content: (
            <>
              <TaskCard task="cables" state={state} onStartTask={onStartTask} />
              <Section icon="moon" title={t({ es: 'Esta noche', en: 'Tonight' })}>
                <p>
                  <RadiationLevel level={known} /> {known == null && t({ es: 'Enciende y conecta la antena para saberlo.', en: 'Switch on and link the antenna to know.' })}
                </p>
                <ShieldStepper state={state} dispatch={dispatch} />
                {known != null && known > 0 && state.energy.shield < known && (
                  <p className="action-warn">
                    <Icon name="warning" size="1.1em" /> {t({ es: `Te falta carga: necesitas ${known} y tienes ${state.energy.shield}.`, en: `Not enough charge: you need ${known} and have ${state.energy.shield}.` })}
                    {known > sel.shieldMaxCharge(state) && t({ es: ' Tu escudo no llega a ese nivel: mejóralo.', en: ' Your shield cannot reach that level: upgrade it.' })}
                  </p>
                )}
                {known != null && known > 0 && state.energy.shield >= known && (
                  <p className="ok-text">
                    <Icon name="check" size="1.1em" /> {t({ es: 'Escudo listo para la tormenta.', en: 'Shield ready for the storm.' })}
                  </p>
                )}
              </Section>
            </>
          )
        },
        { ...PAGE.upgrade, content: <UpgradeBox state={state} building="shield" dispatch={dispatch} /> },
        {
          ...PAGE.learn,
          content: (
            <>
              <Intro
                text={{
                  es: 'El [[shield|escudo]] frena la [[radiation|radiación]] de las tormentas solares. Cárgalo **antes de dormir**: cada nivel de tormenta necesita un nivel de carga, y cada carga gasta 1 de energía.',
                  en: 'The [[shield]] stops [[radiation]] from solar storms. Charge it **before you sleep**: each storm level needs one level of charge, and each charge uses 1 power.'
                }}
              />
              <FactCard state={state} tags={['radiation', 'storm']} salt="shield" />
            </>
          )
        }
      ]}
    />
  );
}

// ---------------- Rover ----------------
const ZONE_INFO = {
  1: { name: { es: 'Borde del cráter Shackleton', en: 'Shackleton crater rim' }, loot: { es: 'metal · anortosita · algo de hielo', en: 'metal · anorthosite · a little ice' } },
  2: { name: { es: 'Cresta de conexión', en: 'Connecting Ridge' }, loot: { es: 'mucho metal · brecha de impacto', en: 'lots of metal · impact breccia' } },
  3: { name: { es: 'Cráter en sombra permanente', en: 'Permanently shadowed crater' }, loot: { es: 'mucho hielo · regolito helado', en: 'lots of ice · icy regolith' } }
};

function RoverPanel({ state, dispatch, onStartRover }) {
  const { t } = useI18n();
  const known = sel.knownLevelTonight(state);
  return (
    <PanelPages
      label={{ es: 'Rover', en: 'Rover' }}
      pages={[
        {
          ...PAGE.act,
          content: (
            <>
              {known == null && (
                <Section tone="warn" icon="help">
                  <p>{t({ es: 'No sabes si hoy hay radiación fuera: conecta la antena antes de salir.', en: 'You do not know if there is radiation outside today: link the antenna before going out.' })}</p>
                </Section>
              )}
              {known != null && known >= BALANCE.radiation.outsideDamageMinLevel && (
                <Section tone="alert" icon="radiation">
                  <RichText
                    as="p"
                    text={{
                      es: '**Hoy hay radiación alta.** El [[shield|escudo]] protege la base, no el Rover: si sales, esta noche perderás 1 corazón.',
                      en: '**High radiation today.** The [[shield]] protects the base, not the Rover: if you go out, you will lose 1 heart tonight.'
                    }}
                  />
                </Section>
              )}
              <div className="zones panel-wide">
                {[1, 2, 3].map((z) => {
                  const chk = sel.canExplore(state, z);
                  const locked = chk.reason === 'locked';
                  return (
                    <div key={z} className={`zone-card${locked ? ' is-locked' : ''}`}>
                      <span className="zone-num" aria-hidden="true">
                        {locked ? <Icon name="lock" size={26} /> : z}
                      </span>
                      <span className="zone-name">
                        {t({ es: `Zona ${z}: `, en: `Zone ${z}: ` })}
                        {t(ZONE_INFO[z].name)}
                      </span>
                      <span className="zone-loot">{t(ZONE_INFO[z].loot)}</span>
                      {locked ? (
                        <p className="action-reason zone-locked" role="note">
                          <Icon name="lock" size="1.1em" /> {reasonText('locked', t, chk)}
                        </p>
                      ) : (
                        <ActionButton variant="warn" icon="rover" label={t({ es: 'Explorar', en: 'Explore' })} cost={{ stamina: BALANCE.rover.zoneStamina[z] }} check={chk} onClick={() => onStartRover(z)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )
        },
        {
          ...PAGE.upgrade,
          content: (
            <>
              <UpgradeBox state={state} building="rover" dispatch={dispatch} />
              <p className="muted">
                <Icon name="battery" size="1.1em" /> {t({ es: `Batería del Rover: ${BALANCE.rover.capacityByLevel[state.levels.rover]}`, en: `Rover battery: ${BALANCE.rover.capacityByLevel[state.levels.rover]}` })}
              </p>
            </>
          )
        },
        {
          ...PAGE.learn,
          content: (
            <>
              <Intro
                text={{
                  es: 'Sal con el [[rover]] a explorar: solo controlas el **salto**. La [[battery|batería]] se gasta con la distancia y con cada choque. Cada zona lejana necesita un Rover mejor.',
                  en: 'Drive out with the [[rover]]: you only control the **jump**. The [[battery]] drains with distance and with every crash. Farther zones need a better Rover.'
                }}
              />
              <FactCard state={state} tags={['rover', 'ice', 'moon']} salt="rover" />
            </>
          )
        }
      ]}
    />
  );
}

// ---------------- Bed ----------------
/** Returns { body, footer } for the bed: before sleeping the base is checked; the primary action ("Sleep") is the footer. */
function useBed({ state, dispatch, onSleep }) {
  const { t } = useI18n();
  const prev = sel.nightPreview(state);
  if (state.phase === 'day') {
    return {
      body: (
        <>
          <Intro
            text={{
              es: 'Solo puedes dormir cuando el hábitat se oscurece: al gastar todas tus Fuerzas o si terminas la jornada antes. En el [[south-pole|polo sur]] el Sol casi no se pone: tu "noche" es tu horario de sueño.',
              en: 'You can only sleep when the habitat gets dark: when you run out of Stamina or if you end the day early. At the [[south-pole]] the Sun barely sets: your "night" is your sleep schedule.'
            }}
          />
          <div className="panel-wide">
            <ActionButton
              variant="ghost"
              icon="moon"
              label={t({ es: 'Terminar la jornada', en: 'End the day' })}
              check={{ ok: true }}
              onClick={() => dispatch({ type: 'END_DAY' })}
              extra={
                <p className="action-warn">
                  <Icon name="warning" size="1.1em" /> {t({ es: `Te quedan ${state.stamina} Fuerzas: si terminas ahora, se pierden.`, en: `You have ${state.stamina} Stamina left: if you end now, it is lost.` })}
                </p>
              }
            />
          </div>
        </>
      ),
      footer: null
    };
  }
  const rows = [
    { k: 'food', ok: prev.foodOk, icon: 'food', text: prev.foodOk ? t({ es: 'Hay cena.', en: 'There is dinner.' }) : t({ es: 'No hay comida: perderás 1 corazón y no recuperarás las Fuerzas.', en: 'No food: you will lose 1 heart and not recover Stamina.' }) },
    {
      k: 'rad',
      ok: prev.radiationLevel == null ? null : prev.shieldOk,
      icon: 'shield',
      text:
        prev.radiationLevel == null
          ? t({ es: 'No sabes si habrá tormenta (la antena no está conectada).', en: 'You do not know if there will be a storm (the antenna is not linked).' })
          : prev.radiationLevel === 0
            ? t({ es: 'Noche tranquila: no hace falta escudo.', en: 'Calm night: no shield needed.' })
            : prev.shieldOk
              ? t({ es: `Tormenta de nivel ${prev.radiationLevel}: el escudo está listo.`, en: `Level ${prev.radiationLevel} storm: the shield is ready.` })
              : t({ es: `Tormenta de nivel ${prev.radiationLevel} y el escudo no basta: perderás 1 corazón.`, en: `Level ${prev.radiationLevel} storm and the shield is not enough: you will lose 1 heart.` })
    },
    ...(prev.outsideRisk !== 'none'
      ? [
          {
            k: 'out',
            ok: prev.outsideRisk === 'low' ? true : prev.outsideRisk === 'high' ? false : null,
            icon: 'rover',
            text:
              prev.outsideRisk === 'high'
                ? t({ es: 'Saliste con radiación alta: perderás 1 corazón.', en: 'You went out in high radiation: you will lose 1 heart.' })
                : prev.outsideRisk === 'low'
                  ? t({ es: 'Saliste hoy, pero la radiación era baja.', en: 'You went out today, but radiation was low.' })
                  : t({ es: 'Saliste hoy sin saber si había radiación…', en: 'You went out today without knowing the radiation…' })
          }
        ]
      : []),
    { k: 'tired', ok: !prev.overexert, icon: 'stamina', text: prev.overexert ? t({ es: 'Sobreesfuerzo: perderás 1 corazón.', en: 'Overexertion: you will lose 1 heart.' }) : t({ es: 'Sin sobreesfuerzo.', en: 'No overexertion.' }) },
    ...(prev.cropsWithoutPower ? [{ k: 'crops', ok: false, icon: 'farm', text: t({ es: 'La granja está apagada: hoy tus plantas no crecen.', en: 'The farm is off: your plants do not grow today.' }) }] : []),
    ...(prev.harvest ? [{ k: 'harvest', ok: true, icon: 'food', text: t({ es: `Esta noche cosechas +${prev.harvest} raciones.`, en: `Tonight you harvest +${prev.harvest} rations.` }) }] : []),
    {
      k: 'battery',
      ok: true,
      icon: 'battery',
      text:
        prev.willStore === 0
          ? t({ es: 'No sobra energía para guardar en la batería.', en: 'No spare power to store in the battery.' })
          : t({ es: `Se ${prev.willStore === 1 ? 'guardará' : 'guardarán'} ${prev.willStore} de energía en la batería.`, en: `${prev.willStore} power will be stored in the battery.` })
    }
  ];
  return {
    body: (
      <>
        <p className="panel-intro panel-wide">{t({ es: 'Antes de dormir, revisa la base:', en: 'Before sleeping, check the base:' })}</p>
        <ul className="checklist panel-wide">
          {rows.map((r) => (
            <li key={r.k} className={r.ok == null ? 'unknown' : r.ok ? 'ok' : 'bad'}>
              <span className="ck-icon" aria-hidden="true">
                <Icon name={r.icon} size={26} />
              </span>
              <span>
                <strong>{r.ok == null ? t({ es: 'Quizá: ', en: 'Maybe: ' }) : r.ok ? t({ es: 'Bien: ', en: 'Good: ' }) : t({ es: 'Ojo: ', en: 'Careful: ' })}</strong>
                {r.text}
              </span>
            </li>
          ))}
        </ul>
      </>
    ),
    footer: (
      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={() => {
          sfx.play('click');
          onSleep();
        }}
        data-autofocus
      >
        <Icon name="bed" />
        {t({ es: 'Dormir', en: 'Sleep' })}
      </button>
    )
  };
}

// ---------------- Solar panels ----------------
function SolarPanel({ state, onStartTask }) {
  const { t } = useI18n();
  return (
    <PanelPages
      label={{ es: 'Paneles solares', en: 'Solar panels' }}
      pages={[
        {
          ...PAGE.act,
          badge: state.tasks.panels ? '!' : null,
          content: state.tasks.panels ? (
            <TaskCard task="panels" state={state} onStartTask={onStartTask} />
          ) : (
            <Section tone="ok" icon="check">
              <p>{t({ es: 'Los paneles están limpios: energía completa.', en: 'The panels are clean: full power.' })}</p>
            </Section>
          )
        },
        {
          ...PAGE.learn,
          content: (
            <>
              <Intro
                text={{
                  es: 'Los [[solar-panel|paneles solares]] dan la energía de la base. En el [[south-pole|polo sur]] el Sol está siempre muy bajo, rozando el horizonte, y el [[regolith|regolito]] se pega a ellos.',
                  en: 'The [[solar-panel|solar panels]] power the base. At the [[south-pole]] the Sun is always very low, grazing the horizon, and [[regolith]] sticks to them.'
                }}
              />
              <FactCard state={state} tags={['energy', 'moon']} salt="solar" />
            </>
          )
        }
      ]}
    />
  );
}

const TITLES = {
  lifeSupport: MODULE_NAMES.lifeSupport,
  antenna: MODULE_NAMES.antenna,
  farm: { es: 'Granja (invernadero)', en: 'Farm (greenhouse)' },
  shield: { es: 'Escudo y refugio', en: 'Shield and shelter' },
  bed: MODULE_NAMES.bed,
  rover: { es: 'Garaje del Rover', en: 'Rover garage' },
  solar: MODULE_NAMES.solar
};

/** The bed needs its own component: its footer (the "Sleep" button) belongs to the Modal, not to a page. */
function BedModal({ title, onClose, ...props }) {
  const { t } = useI18n();
  const { body, footer } = useBed(props);
  return (
    <Modal title={title} icon={MODULE_ICONS.bed} accent={MODULE_BY_ID.bed.accent} onClose={onClose} size="lg" className="panel-modal" footer={footer}>
      <div className="panel-cols panel-page">{body}</div>
      {props.state.phase === 'night' && <span className="sr-only">{t({ es: 'Es de noche.', en: 'It is night.' })}</span>}
    </Modal>
  );
}

export default function ModulePanel({ moduleId, state, dispatch, onClose, onStartTask, onStartRover, onSleep, reducedMotion }) {
  const { t } = useI18n();
  const m = MODULE_BY_ID[moduleId];
  if (!m) return null;
  const level = state.levels[moduleId];
  const title = `${t(TITLES[moduleId])}${level ? ` · ${t({ es: 'Nv.', en: 'Lv.' })} ${level}` : ''}`;
  if (moduleId === 'bed') return <BedModal title={title} onClose={onClose} state={state} dispatch={dispatch} onSleep={onSleep} />;
  const props = { state, dispatch, onStartTask, onStartRover, onSleep, reducedMotion };
  return (
    <Modal title={title} icon={MODULE_ICONS[moduleId]} accent={m.accent} onClose={onClose} size="lg" className="panel-modal">
      {moduleId === 'lifeSupport' && <LifeSupportPanel {...props} />}
      {moduleId === 'farm' && <FarmPanel {...props} />}
      {moduleId === 'antenna' && <AntennaPanel {...props} />}
      {moduleId === 'shield' && <ShieldPanel {...props} />}
      {moduleId === 'rover' && <RoverPanel {...props} />}
      {moduleId === 'solar' && <SolarPanel {...props} />}
      {state.phase === 'night' && (
        <p className="night-note">
          <Icon name="moon" size="1.2em" /> {t({ es: 'Es de noche: aún puedes repartir energía, pero ya no hacer tareas.', en: 'It is night: you can still share out power, but no more tasks.' })}
        </p>
      )}
    </Modal>
  );
}

export { CostChips };
