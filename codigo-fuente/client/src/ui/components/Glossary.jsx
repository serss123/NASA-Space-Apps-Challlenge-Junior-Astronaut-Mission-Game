// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Clickable glossary: technical words are underlined and coloured; tapping one opens a small Modal
// with its emoji, the word, a simple definition and an optional example ("Es como...").
// One provider draws the Modal, so it works the same on every screen (modals stack: Escape closes the top one).
//
//   <GlossaryProvider>          once, around the app (main.jsx)
//   <Term id="regolith" />      a word (without children it shows the term in the active language)
//   useGlossary()               { show(id, anchorEl), close(), openId, seen, resetSeen(), markSeen(ids) }
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { GLOSSARY } from '../../content/glossary.js';
import { useI18n } from '../../i18n.jsx';
import { sfx } from '../../audio/sfx.js';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';
import './glossary.css';

const SEEN_KEY = 'solasol.glossary.seen';
const GlossaryContext = createContext(null);

function loadSeen() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function storeSeen(set) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
  } catch {
    /* storage unavailable: the words are still marked for this session */
  }
}

export function GlossaryProvider({ children }) {
  const [open, setOpen] = useState(null); // { id, anchor }
  const [seen, setSeen] = useState(loadSeen);

  const markSeen = useCallback((ids) => {
    setSeen((prev) => {
      const fresh = ids.filter((id) => GLOSSARY[id] && !prev.has(id));
      if (!fresh.length) return prev;
      const next = new Set(prev);
      fresh.forEach((id) => next.add(id));
      storeSeen(next);
      return next;
    });
  }, []);

  const show = useCallback(
    (id, anchorEl) => {
      if (!GLOSSARY[id] || !anchorEl) return;
      sfx.play('click');
      setOpen((o) => (o && o.id === id && o.anchor === anchorEl ? null : { id, anchor: anchorEl }));
      markSeen([id]);
    },
    [markSeen]
  );
  const close = useCallback(() => setOpen(null), []);
  const resetSeen = useCallback(() => {
    setSeen(new Set());
    try {
      window.localStorage.removeItem(SEEN_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ show, close, openId: open?.id ?? null, seen, resetSeen, markSeen }), [show, close, open, seen, resetSeen, markSeen]);
  return (
    <GlossaryContext.Provider value={value}>
      {children}
      {open && <GlossaryPill id={open.id} anchor={open.anchor} onClose={close} />}
    </GlossaryContext.Provider>
  );
}

export function useGlossary() {
  const ctx = useContext(GlossaryContext);
  if (!ctx) throw new Error('useGlossary() must be used inside <GlossaryProvider>');
  return ctx;
}

/** A glossary word: <Term id="regolith">regolito</Term> (without children it uses the term in the active language). */
export function Term({ id, children }) {
  const { show, openId } = useGlossary();
  const { t } = useI18n();
  const entry = GLOSSARY[id];
  if (!entry) return <>{children}</>;
  const label = children ?? t({ es: entry.es.term, en: entry.en.term });
  return (
    <button
      type="button"
      className={`term${openId === id ? ' is-open' : ''}`}
      aria-haspopup="dialog"
      aria-expanded={openId === id}
      onClick={(e) => {
        e.stopPropagation();
        show(id, e.currentTarget);
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {label}
    </button>
  );
}

/**
 * The explanation of one word, shown as a small Modal (not a popover): a definition of at most 20 words plus
 * an example never needs scrolling, and a centred window is easier to read and to tap on phones.
 * `anchor` is kept only for API compatibility with the provider; the Modal restores focus by itself.
 */
export function GlossaryPill({ id, onClose }) {
  const { t, lang } = useI18n();
  const entry = GLOSSARY[id];
  if (!entry) return null;
  const e = entry[lang] || entry.es;
  return (
    <Modal
      title={e.term}
      icon={entry.emoji}
      tone="var(--science)"
      size="sm"
      onClose={onClose}
      className="glossary-modal"
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose} data-autofocus>
          {t({ es: '¡Entendido!', en: 'Got it!' })}
        </button>
      }
    >
      <div className="glossary-pill">
        <p className="glossary-pill-def">{e.def}</p>
        {e.example && (
          <p className="glossary-pill-example">
            <Icon name="sparkle" size={20} />
            <span>{e.example}</span>
          </p>
        )}
        {entry.source && (
          <p className="glossary-pill-src">
            {t({ es: 'Para mayores', en: 'For grown-ups' })}:{' '}
            {entry.source.url ? (
              <a href={entry.source.url} target="_blank" rel="noreferrer noopener">
                {entry.source.label}
              </a>
            ) : (
              entry.source.label
            )}
          </p>
        )}
      </div>
    </Modal>
  );
}
