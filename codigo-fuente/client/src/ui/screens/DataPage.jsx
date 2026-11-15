// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// "Data and sources": what is real, where it comes from, how it becomes gameplay, what we simplified and what is
// simulated. This page is the evidence for the judges and the teachers.
// Layout (docs/DESIGN.md section 3): everything on one page. Seven tabs (labels · NASA data · from data to game · mission days ·
// simplified · credits · AI and privacy); inside a tab ALL the cards or rows are laid out in columns inside one scroll area
// (.scroll-y): what fits is visible at once and the rest is one scroll away.
import { Fragment, useState } from 'react';
import { formatDate } from '@shared/gameTranslator.js';
import { CREDITS, DISCLAIMER, LABELS, SIMPLIFICATIONS, SOURCES } from '../../content/sources.js';
import { fmtNum, useI18n } from '../../i18n.jsx';
import DataTag from '../components/DataTag.jsx';
import Icon from '../components/Icon.jsx';
import RichText from '../components/RichText.jsx';
import Tabs from '../components/Tabs.jsx';
import { PHOTO } from './Menu.jsx';
import './datapage.css';

/** A list of items inside a scroll area. pageClassName picks the layout (cards, rows, labels...) in datapage.css. */
function Scroll({ items, render, keyOf, pageClassName = '', label }) {
  return (
    <div className={`scroll-y data-list ${pageClassName}`} role="list" aria-label={label}>
      {items.map((item, i) => (
        <Fragment key={keyOf ? keyOf(item, i) : i}>{render(item, i)}</Fragment>
      ))}
    </div>
  );
}

/** Names of the four storm levels (docs/DESIGN.md section 4). Level 0 is "Calm". */
const LEVEL_NAMES = [
  { es: 'Calma', en: 'Calm' },
  { es: 'Tormenta pequeña', en: 'Small storm' },
  { es: 'Tormenta fuerte', en: 'Strong storm' },
  { es: 'Supertormenta', en: 'Super storm' }
];

/** Radiation level as an icon plus a word (colour is never the only signal). */
function RadiationBadge({ level, compact = false }) {
  const { t } = useI18n();
  if (level == null) return <span className="rad-badge">{t({ es: 'Sin datos', en: 'No data' })}</span>;
  return (
    <span className={`rad-badge is-level-${level}`}>
      <Icon name={level === 0 ? 'calm' : 'radiation'} size={22} />
      <span className={compact ? 'sr-only' : undefined}>{t(LEVEL_NAMES[level])}</span>
      {compact && <span aria-hidden="true">{level}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ panels */

function LabelsPanel() {
  const { t } = useI18n();
  const items = Object.entries(LABELS || {});
  return (
    <div className="data-panel">
      <RichText
        as="p"
        className="sources-lead"
        text={{
          es: 'En este juego **el Sol es el Sol real**. Cada dato lleva una etiqueta que dice de dónde sale.',
          en: 'In this game **the Sun is the real Sun**. Every piece of data carries a label saying where it comes from.'
        }}
      />
      <Scroll
        pageClassName="label-page"
        label={t({ es: 'Etiquetas de datos', en: 'Data labels' })}
        items={items}
        keyOf={([k]) => k}
        render={([k, v]) => (
          <div className="label-card">
            <DataTag kind={k} />
            <p>{t(v)}</p>
          </div>
        )}
      />
    </div>
  );
}

function SourceCard({ s }) {
  const { t } = useI18n();
  if (s.photo) {
    return (
      <article className="source-card is-photo">
        <header>
          <strong>{t({ es: 'Foto real del polo sur de la Luna', en: 'Real photo of the Moon’s south pole' })}</strong>
          <DataTag kind="NASA" size="sm" />
        </header>
        <img className="source-photo" src={PHOTO.src} alt={t({ es: 'Mosaico del polo sur lunar de la cámara LROC', en: 'LROC mosaic of the lunar south pole' })} />
        <p className="source-links">
          <a href={PHOTO.url} target="_blank" rel="noreferrer noopener">
            <Icon name="camera" size={18} /> {PHOTO.credit}
          </a>
        </p>
      </article>
    );
  }
  return (
    <article className="source-card">
      <header>
        <strong>{s.name}</strong>
        {s.label && <DataTag kind={s.label} size="sm" />}
      </header>
      {s.provider && <small className="source-provider">{s.provider}</small>}
      {s.what && <RichText as="p" className="source-what" text={s.what} />}
      {s.how && (
        <p className="source-how">
          <Icon name="gamepad" size={20} /> <RichText text={s.how} />
        </p>
      )}
      <p className="source-links">
        {s.url && (
          <a href={s.url} target="_blank" rel="noreferrer noopener">
            <Icon name="link-out" size={18} /> {t({ es: 'Ver la fuente', en: 'See the source' })}
          </a>
        )}
        {s.credit && <small> · {t(s.credit)}</small>}
      </p>
    </article>
  );
}

function SourcesPanel() {
  const { t } = useI18n();
  const items = [...(SOURCES || []), { id: 'photo', photo: true }];
  return (
    <div className="data-panel">
      <Scroll pageClassName="card-page" label={t({ es: 'Datos de la NASA que usamos', en: 'NASA data we use' })} items={items} keyOf={(s) => s.id} render={(s) => <SourceCard s={s} />} />
    </div>
  );
}

/** "How we turn the data into gameplay": three cards (night radiation of both missions, and breakdown chances). */
function ConvertPanel() {
  const { t } = useI18n();
  const cards = [
    {
      id: 'archive',
      title: { es: 'Radiación de la noche (misión de 2024)', en: 'Night radiation (2024 mission)' },
      body: (
        <>
          <RichText
            as="p"
            text={{
              es: 'Usamos la dosis que midió [[crater-detector|CRaTER]] cerca de la Luna, comparada con un día normal (media del 1 al 7 de mayo de 2024):',
              en: 'We use the dose [[crater-detector|CRaTER]] measured near the Moon, compared with a normal day (average of 1–7 May 2024):'
            }}
          />
          <ul className="level-list">
            <li>
              <RadiationBadge level={0} /> {t({ es: 'menos de 3 veces', en: 'under 3 times' })}
            </li>
            <li>
              <RadiationBadge level={1} /> {t({ es: 'de 3 a 30 veces', en: '3 to 30 times' })}
            </li>
            <li>
              <RadiationBadge level={2} /> {t({ es: 'de 30 a 150 veces', en: '30 to 150 times' })}
            </li>
            <li>
              <RadiationBadge level={3} /> {t({ es: 'más de 150 veces', en: 'over 150 times' })}
            </li>
          </ul>
        </>
      )
    },
    {
      id: 'live',
      title: { es: 'Radiación de la noche (El Sol de hoy)', en: 'Night radiation (Today’s Sun)' },
      body: (
        <RichText
          as="p"
          text={{
            es: 'Sin medidas recientes, la estimamos con [[donki|DONKI]]: una [[cme]] que llega a menos de 1.000 km/s es nivel 1; de 1.000 a 2.000, nivel 2; más rápida, nivel 3. Las [[sep|partículas SEP]] dan nivel 2 (3 si son muy energéticas) y suman uno si coinciden con una CME.',
            en: 'Without recent measurements we estimate it from [[donki|DONKI]]: a [[cme]] arriving under 1,000 km/s is level 1; 1,000–2,000 is level 2; faster, level 3. [[sep|SEP particles]] give level 2 (3 if very energetic) and add one if they coincide with a CME.'
          }}
        />
      )
    },
    {
      id: 'breakdowns',
      title: { es: 'Averías: azar con causa real', en: 'Breakdowns: chance with a real cause' },
      body: (
        <ul className="plain-list">
          <li>{t({ es: 'Llamarada de clase X → 80 % cables cortocircuitados (partículas SEP: 30 %).', en: 'X-class flare → 80 % short-circuited cables (SEP particles: 30 %).' })}</li>
          <li>{t({ es: 'Llega una CME o hay tormenta magnética Kp ≥ 7 → 60 % antena descalibrada (Kp 5–6: 30 %).', en: 'A CME arrives or a Kp ≥ 7 magnetic storm → 60 % antenna out of calibration (Kp 5–6: 30 %).' })}</li>
          <li>{t({ es: 'Llega una CME → 40 % paneles sucios; salir con el Rover → 25 %; micrometeorito → 5 %.', en: 'A CME arrives → 40 % dirty panels; driving the Rover → 25 %; micrometeorite → 5 %.' })}</li>
        </ul>
      ),
      tag: 'SIMULADO'
    }
  ];
  return (
    <div className="data-panel">
      <Scroll
        pageClassName="card-page"
        label={t({ es: 'Cómo convertimos los datos en juego', en: 'How we turn the data into gameplay' })}
        items={cards}
        keyOf={(c) => c.id}
        render={(c) => (
          <article className="source-card is-convert">
            <header>
              <strong>{t(c.title)}</strong>
              {c.tag && <DataTag kind={c.tag} size="sm" />}
            </header>
            {c.body}
          </article>
        )}
      />
    </div>
  );
}

/** One real day: name and date, what happened on the Sun, the radiation level, the two detectors and the source. */
function DayRow({ d, i }) {
  const { t, lang } = useI18n();
  const link = d.sep[0]?.link || d.shocks[0]?.link || d.flares.items[0]?.link || d.predictions[0]?.link;
  const moon = d.radiation.stations?.moonOrbit;
  const iss = d.radiation.stations?.iss;
  return (
    <div className="day-row" role="row">
      <span className="day-name" role="cell">
        <strong>{i + 1}</strong> · {formatDate(d.date, lang).replace(/ de \d{4}$|, \d{4}$/, '')}
      </span>
      <span className="day-what" role="cell">
        {t(d.headline)}
      </span>
      <span className="day-rad" role="cell">
        <RadiationBadge level={d.radiation.level} />
        {d.radiation.basis !== 'measured' && <small>{t({ es: '(estimada)', en: '(estimated)' })}</small>}
      </span>
      <span className="day-num" role="cell">
        <small className="day-num-label">{t({ es: 'Luna', en: 'Moon' })}</small>
        {moon ? `${fmtNum(moon.x, lang, 1)}×` : '—'}
      </span>
      <span className="day-num" role="cell">
        <small className="day-num-label">{t({ es: 'Estación', en: 'Station' })}</small>
        {iss ? `${fmtNum(iss.x, lang, 1)}×` : '—'}
      </span>
      <span className="day-link" role="cell">
        {link ? (
          <a href={link} target="_blank" rel="noreferrer noopener" aria-label={t({ es: `Fuente del día ${i + 1} (DONKI)`, en: `Source of day ${i + 1} (DONKI)` })}>
            DONKI
          </a>
        ) : (
          '—'
        )}
      </span>
    </div>
  );
}

/**
 * The real days of the mission, one row each. From the menu the whole list is a spoiler (it reveals when the
 * storms arrive), so it sits behind a button that swaps the content in place.
 */
function DaysPanel({ timeline, source, totalDays, spoilerGuard }) {
  const { t } = useI18n();
  const [revealed, setRevealed] = useState(!spoilerGuard);
  const days = timeline?.length ?? 0;
  if (!days) {
    return (
      <div className="data-panel is-centered">
        <p className="data-empty">{t({ es: 'Todavía no has vivido ningún día. Se irán apuntando aquí.', en: 'You have not lived any day yet. They will be listed here.' })}</p>
      </div>
    );
  }
  if (!revealed) {
    return (
      <div className="data-panel is-centered">
        <div className="spoiler-gate">
          <Icon name="calendar" size={56} />
          <p>
            {t({
              es: `Aquí están los ${days} días reales de la misión. ¡Ojo: desvelan cuándo llegan las tormentas!`,
              en: `Here are the ${days} real days of the mission. Careful: they reveal when the storms arrive!`
            })}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)}>
            <Icon name="eye" />
            {t({ es: 'Ver los días', en: 'Show the days' })}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="data-panel days-panel">
      <div className="days-intro">
        <DataTag kind={source === 'EN VIVO' ? 'EN VIVO' : 'ARCHIVO'} size="sm" />
        {totalDays > days && (
          <RichText
            as="p"
            className="muted"
            text={{
              es: `Ves ${days} de ${totalDays} días: el resto se desvela al jugarlo. Para saber lo que viene, usa la [[antenna|antena]].`,
              en: `You see ${days} of ${totalDays} days: the rest is revealed as you play. To know what is coming, use the [[antenna]].`
            }}
          />
        )}
      </div>
      <div className="days-head" role="row" aria-hidden="true">
        <span>{t({ es: 'Día', en: 'Day' })}</span>
        <span>{t({ es: 'Qué pasó en el Sol', en: 'What happened on the Sun' })}</span>
        <span>{t({ es: 'Radiación', en: 'Radiation' })}</span>
        <span title={t({ es: 'Dosis cerca de la Luna (detector CRaTER), comparada con un día normal', en: 'Dose near the Moon (CRaTER detector), compared with a normal day' })}>{t({ es: 'Luna', en: 'Moon' })}</span>
        <span title={t({ es: 'Dosis en la Estación Espacial, comparada con un día normal', en: 'Dose on the Space Station, compared with a normal day' })}>{t({ es: 'Estación', en: 'Station' })}</span>
        <span>{t({ es: 'Fuente', en: 'Source' })}</span>
      </div>
      <Scroll
        pageClassName="days-page"
        label={t({ es: 'Los días de tu misión', en: 'Your mission days' })}
        items={timeline}
        keyOf={(d) => d.date}
        render={(d, i) => <DayRow d={d} i={i} />}
      />
    </div>
  );
}

function SimplifiedPanel() {
  const { t } = useI18n();
  return (
    <div className="data-panel">
      <Scroll
        pageClassName="list-page"
        label={t({ es: 'Cómo lo hemos simplificado', en: 'How we simplified it' })}
        items={SIMPLIFICATIONS || []}
        keyOf={(_, i) => i}
        render={(s) => (
          <div className="list-row">
            <Icon name="check" size={22} />
            <RichText as="p" text={s} />
          </div>
        )}
      />
    </div>
  );
}

function CreditsPanel() {
  const { t } = useI18n();
  return (
    <div className="data-panel">
      <Scroll
        pageClassName="list-page"
        label={t({ es: 'Créditos y licencias', en: 'Credits and licences' })}
        items={CREDITS || []}
        keyOf={(_, i) => i}
        render={(c) => (
          <div className="list-row">
            <Icon name="hand" size={22} />
            <p>
              <strong>{t(c.what)}</strong> — {t(c.license)}
              {c.url && (
                <>
                  {' '}
                  <a href={c.url} target="_blank" rel="noreferrer noopener" aria-label={t({ es: 'Abrir enlace', en: 'Open link' })}>
                    <Icon name="link-out" size={18} />
                  </a>
                </>
              )}
            </p>
          </div>
        )}
      />
    </div>
  );
}

/** The statements the organisers require, in plain words: not a NASA product, how AI was used, privacy. */
function AboutPanel() {
  const { t } = useI18n();
  const notes = [
    { id: 'nasa', icon: 'science', title: { es: 'No es un producto de la NASA', en: 'Not a NASA product' }, text: DISCLAIMER },
    {
      id: 'ai',
      icon: 'robot',
      title: { es: 'Hecho con ayuda de IA', en: 'Made with AI help' },
      text: {
        es: 'El código, los textos y el análisis de datos se hicieron con un asistente de IA (Claude) y los revisa el equipo. Está declarado en AI_USE.md. No hay imágenes creadas con IA ni logotipos de la NASA.',
        en: 'The code, the texts and the data analysis were made with an AI assistant (Claude) and the team reviews them. It is declared in AI_USE.md. There are no AI-made images and no NASA logos.'
      }
    },
    {
      id: 'privacy',
      icon: 'lock',
      title: { es: 'Tu privacidad', en: 'Your privacy' },
      text: {
        es: 'Sin cuentas, sin cookies y sin analítica. La partida solo se guarda en este dispositivo.',
        en: 'No accounts, no cookies and no analytics. The game is saved only on this device.'
      }
    }
  ];
  return (
    <div className="data-panel">
      <div className="about-grid">
        {notes.map((n) => (
          <article key={n.id} className="about-card">
            <span className="about-icon" aria-hidden="true">
              <Icon name={n.icon} size="100%" />
            </span>
            <h3>{t(n.title)}</h3>
            <p>{t(n.text)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- page */

/**
 * @param timeline     the days to list (may be only the days already lived, so the game does not spoil itself)
 * @param source       'ARCHIVO' | 'EN VIVO': the label of the days tab
 * @param totalDays    how many days the mission has in total (shows "you see X of Y")
 * @param spoilerGuard hide the days behind a button (used from the menu, where nothing has been played yet)
 */
export default function DataPage({ timeline, source = 'ARCHIVO', totalDays = 0, spoilerGuard = false }) {
  const { t } = useI18n();
  const [tab, setTab] = useState('labels');
  const hasDays = (timeline?.length ?? 0) > 0 || totalDays > 0;
  const tabs = [
    { id: 'labels', icon: 'info', label: { es: 'Etiquetas', en: 'Labels' }, tone: 'var(--info)' },
    { id: 'sources', icon: 'satellite', label: { es: 'Datos NASA', en: 'NASA data' }, tone: 'var(--tag-nasa)' },
    { id: 'convert', icon: 'calculator', label: { es: 'Del dato al juego', en: 'Data to game' }, tone: 'var(--tag-calc)' },
    ...(hasDays ? [{ id: 'days', icon: 'calendar', label: { es: 'Días', en: 'Days' }, tone: 'var(--energy)' }] : []),
    { id: 'simplified', icon: 'wrench', label: { es: 'Simplificado', en: 'Simplified' }, tone: 'var(--food)' },
    { id: 'credits', icon: 'hand', label: { es: 'Créditos', en: 'Credits' }, tone: 'var(--bed)' },
    { id: 'about', icon: 'robot', label: { es: 'IA y privacidad', en: 'AI and privacy' }, tone: 'var(--science)' }
  ];
  const panels = {
    labels: <LabelsPanel />,
    sources: <SourcesPanel />,
    convert: <ConvertPanel />,
    days: <DaysPanel timeline={timeline} source={source} totalDays={totalDays} spoilerGuard={spoilerGuard} />,
    simplified: <SimplifiedPanel />,
    credits: <CreditsPanel />,
    about: <AboutPanel />
  };
  return (
    <div className="sources">
      <Tabs className="sources-tabs" panelClassName="sources-panel" label={t({ es: 'Secciones de datos y fuentes', en: 'Data and sources sections' })} tabs={tabs} value={tab} onChange={setTab}>
        {(active) => <div className="sources-panel-inner" key={active}>{panels[active]}</div>}
      </Tabs>
    </div>
  );
}
