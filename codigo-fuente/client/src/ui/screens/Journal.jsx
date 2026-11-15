// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Discovery Journal: the study guide of the mission. It persists between games (App owns the saved set).
// Layout (docs/DESIGN.md section 3): everything on one page. One tab per chapter (TOPICS) plus a "Words" tab; inside a tab
// ALL the cards (or all the word chips) are laid out in columns and the list scrolls if there are more than fit.
// Tapping a word opens the glossary Modal (ui/components/Glossary.jsx).
// Locked cards are listed too, so a child can see how many are still missing and read the hint.
import { Fragment, useState } from 'react';
import { DISCOVERIES, DISCOVERY_ORDER, TOPICS } from '../../content/discoveries.js';
import { GLOSSARY } from '../../content/glossary.js';
import { useI18n } from '../../i18n.jsx';
import DataTag from '../components/DataTag.jsx';
import { useGlossary } from '../components/Glossary.jsx';
import Icon from '../components/Icon.jsx';
import RichText from '../components/RichText.jsx';
import Tabs from '../components/Tabs.jsx';
import './journal.css';

const WORDS_TAB = 'words';
/** Tab colour of each chapter (design tokens, see styles/tokens.css). */
const TOPIC_TONE = {
  energy: 'var(--energy)',
  radiation: 'var(--shield)',
  life: 'var(--heart)',
  comms: 'var(--antenna)',
  sun: 'var(--horizon)',
  moon: 'var(--moon)'
};

/** Three-star meter of a chapter: all stars at 100 %, none at 0 %. */
function Stars({ found, total }) {
  const { t } = useI18n();
  const lit = total && found >= total ? 3 : total ? Math.floor((3 * found) / total) : 0;
  return (
    <span className="disc-stars" role="img" aria-label={t({ es: `${lit} de 3 estrellas`, en: `${lit} of 3 stars` })}>
      {[0, 1, 2].map((i) => (
        <Icon key={i} name="star" size={26} className={i < lit ? 'is-lit' : 'is-dim'} />
      ))}
    </span>
  );
}

/** One unlocked discovery, as a card: what happened, what you learned and what to remember (also used by the "New discovery!" Modal). */
export function DiscoveryCard({ d }) {
  const { t } = useI18n();
  return (
    <article className="disc-card">
      <header className="disc-head">
        <span className="disc-emoji" aria-hidden="true">
          {d.emoji}
        </span>
        <h3>{t(d.title)}</h3>
        {d.tag && <DataTag kind={d.tag} size="sm" />}
        {d.source?.url && (
          <a className="disc-source" href={d.source.url} target="_blank" rel="noreferrer noopener" title={d.source.label}>
            <Icon name="link-out" size={20} />
            <span>{t({ es: 'Para mayores', en: 'For grown-ups' })}</span>
          </a>
        )}
      </header>
      <div className="disc-sections">
        <section className="disc-sec">
          <h4>{t({ es: 'Lo que pasó', en: 'What happened' })}</h4>
          <RichText as="p" text={d.happened} />
        </section>
        <section className="disc-sec">
          <h4>{t({ es: 'Lo que aprendiste', en: 'What you learned' })}</h4>
          <RichText as="p" text={d.learn} />
        </section>
        <section className="disc-sec is-remember">
          <h4>{t({ es: 'Recuerda', en: 'Remember' })}</h4>
          <p>{t(d.remember)}</p>
        </section>
      </div>
    </article>
  );
}

/** A discovery that has not happened yet: a question mark and a hint. */
function LockedCard({ d }) {
  const { t } = useI18n();
  return (
    <article className="disc-card is-locked">
      <span className="disc-lock" aria-hidden="true">
        <Icon name="lock" size="100%" />
      </span>
      <h3>{t({ es: 'Por descubrir', en: 'Not discovered yet' })}</h3>
      {d.hint && (
        <p>
          <strong>{t({ es: 'Pista:', en: 'Hint:' })}</strong> {t(d.hint)}
        </p>
      )}
    </article>
  );
}

export default function Journal({ discovered }) {
  const { t } = useI18n();
  const { seen, show } = useGlossary();
  const [tab, setTab] = useState(TOPICS[0].id);

  const order = (DISCOVERY_ORDER?.length ? DISCOVERY_ORDER : Object.keys(DISCOVERIES)).filter((id) => DISCOVERIES[id]);
  const byTopic = Object.fromEntries(TOPICS.map((tp) => [tp.id, order.filter((id) => DISCOVERIES[id].topic === tp.id)]));
  const foundIn = (ids) => ids.filter((id) => discovered.has(id)).length;
  const found = foundIn(order);
  const pct = order.length ? Math.round((found / order.length) * 100) : 0;
  const words = Object.keys(GLOSSARY);
  const wordsSeen = words.filter((w) => seen.has(w)).length;

  const tabs = [
    ...TOPICS.map((tp) => ({ id: tp.id, icon: tp.icon, label: tp.title, badge: `${foundIn(byTopic[tp.id])}/${byTopic[tp.id].length}`, tone: TOPIC_TONE[tp.id] })),
    { id: WORDS_TAB, icon: 'help', label: { es: 'Palabras', en: 'Words' }, badge: `${wordsSeen}/${words.length}`, tone: 'var(--science)' }
  ];

  const renderPanel = (active) => {
    if (active === WORDS_TAB) {
      return (
        <div className="journal-panel-inner" key={active}>
          <div className="journal-heading">
            <h3>{t({ es: 'Palabras de astronauta', en: 'Astronaut words' })}</h3>
            <p className="muted journal-about">{t({ es: 'Toca una palabra para ver qué significa.', en: 'Tap a word to see what it means.' })}</p>
          </div>
          <div className="scroll-y word-list" role="list" aria-label={t({ es: 'Palabras de astronauta', en: 'Astronaut words' })}>
            {words.map((w) => {
              const entry = GLOSSARY[w];
              const isSeen = seen.has(w);
              return (
                <button key={w} type="button" role="listitem" className={`word-chip${isSeen ? ' is-seen' : ''}`} aria-haspopup="dialog" onClick={(e) => show(w, e.currentTarget)}>
                  <span className="word-emoji" aria-hidden="true">
                    {entry.emoji}
                  </span>
                  <span className="word-term">{t({ es: entry.es.term, en: entry.en.term })}</span>
                  {isSeen && <Icon name="check" size={20} />}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    const topic = TOPICS.find((tp) => tp.id === active);
    const ids = byTopic[active] || [];
    return (
      <div className="journal-panel-inner" key={active}>
        <div className="journal-heading">
          <h3>{t(topic.title)}</h3>
          <Stars found={foundIn(ids)} total={ids.length} />
          {topic.about && <p className="muted journal-about">{t(topic.about)}</p>}
        </div>
        <div className="scroll-y disc-list" role="list" aria-label={t(topic.title)}>
          {ids.map((id) => (
            <Fragment key={id}>{discovered.has(id) ? <DiscoveryCard d={DISCOVERIES[id]} /> : <LockedCard d={DISCOVERIES[id]} />}</Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="journal">
      <div className="journal-progress">
        <strong>{t({ es: `Descubrimientos: ${found} de ${order.length}`, en: `Discoveries: ${found} of ${order.length}` })}</strong>
        <div className="journal-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t({ es: 'Descubrimientos', en: 'Discoveries' })}>
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>
      <Tabs className="journal-tabs" panelClassName="journal-panel" label={{ es: 'Capítulos del diario', en: 'Journal chapters' }} tabs={tabs} value={tab} onChange={setTab}>
        {renderPanel}
      </Tabs>
    </div>
  );
}
