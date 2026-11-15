// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// The always-visible "Hecho con IA / Made with AI" watermark (organisers' rule: AI-generated art must say so).
// It sits in the bottom-left corner (icon only on phones). Tapping it explains, in one breath, what was made
// with AI and what is real. App mounts it once, above every screen and modal.
//
// It must never cover buttons. Screens reserve its corner with the CSS variables --ai-badge-w / --ai-badge-h
// (or the .ai-safe-left / .ai-safe-bottom helpers in base.css). For things that move or resize, use
// useAvoidAiBadge(ref): it sets --ai-avoid-left (px) on the element while it overlaps the badge
// (the Modal footer uses it: padding-left: max(var(--pad), var(--ai-avoid-left, 0px))).
import { useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n.jsx';
import Icon from './Icon.jsx';
import Popover from './Popover.jsx';
import './aibadge.css';

let badgeEl = null;
const watchers = new Set();
function setBadge(el) {
  badgeEl = el;
  watchers.forEach((fn) => fn());
}

/** The element's box without CSS transforms (so entrance animations do not fool the measurement). */
function layoutRect(el) {
  let x = 0;
  let y = 0;
  for (let n = el; n; n = n.offsetParent) {
    x += n.offsetLeft + (n.offsetParent ? n.offsetParent.clientLeft : 0);
    y += n.offsetTop + (n.offsetParent ? n.offsetParent.clientTop : 0);
  }
  return { left: x, top: y, right: x + el.offsetWidth, bottom: y + el.offsetHeight };
}

/** Starts watching one element; returns the function that stops it. */
function avoidBadge(el, gap) {
  const update = () => {
    if (!el.isConnected) return;
    const b = badgeEl;
    let need = 0;
    if (b && b.isConnected) {
      const br = layoutRect(b);
      const r = layoutRect(el);
      const overlap = r.left < br.right + gap && r.right > br.left - gap && r.top < br.bottom + gap && r.bottom > br.top - gap;
      if (overlap) need = Math.ceil(br.right + gap - r.left);
    }
    if (need > 0) el.style.setProperty('--ai-avoid-left', `${need}px`);
    else el.style.removeProperty('--ai-avoid-left');
  };
  update();
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
  ro?.observe(el);
  window.addEventListener('resize', update);
  watchers.add(update);
  return () => {
    ro?.disconnect();
    window.removeEventListener('resize', update);
    watchers.delete(update);
    el.style.removeProperty('--ai-avoid-left');
  };
}

/**
 * Keeps `ref`'s content clear of the AI badge: sets --ai-avoid-left on the element while they overlap.
 * It follows the ref after every render, so an element that appears later (a footer added afterwards) works too.
 */
export function useAvoidAiBadge(ref, gap = 8) {
  const watched = useRef(null); // { el, stop }
  useLayoutEffect(() => {
    const el = ref.current || null;
    if (watched.current?.el === el) return;
    watched.current?.stop();
    watched.current = el ? { el, stop: avoidBadge(el, gap) } : null;
  });
  useLayoutEffect(
    () => () => {
      watched.current?.stop();
      watched.current = null;
    },
    []
  );
}

const TEXT = {
  name: { es: 'Hecho con IA', en: 'Made with AI' },
  aria: { es: 'Hecho con IA. Toca para saber qué significa.', en: 'Made with AI. Tap to find out what it means.' },
  made: {
    es: 'Los dibujos, los sonidos y el código se hicieron con IA (Claude, de Anthropic). El equipo lo revisó todo.',
    en: 'The drawings, sounds and code were made with AI (Claude, by Anthropic). The team checked everything.'
  },
  photo: { es: 'La foto de la Luna es una foto real de la NASA.', en: 'The Moon photo is a real NASA photo.' },
  more: { es: 'Más detalles en la página de datos.', en: 'More details on the data page.' },
  button: { es: 'Ver los datos', en: 'See the data' }
};

export default function AiBadge({ onMore }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    setBadge(ref.current);
    return () => setBadge(null);
  }, []);

  return (
    <>
      <button ref={ref} type="button" className="ai-badge" data-ai-badge="" aria-expanded={open} aria-haspopup="dialog" aria-label={t(TEXT.aria)} title={t(TEXT.name)} onClick={() => setOpen((o) => !o)}>
        <Icon name="robot" size={26} />
        <span className="ai-badge-text hide-compact">{t(TEXT.name)}</span>
      </button>
      {open && (
        <Popover anchor={ref.current} onClose={() => setOpen(false)} placement="top" zIndex={141} label={t(TEXT.name)} className="ai-pop">
          <p className="ai-pop-title">
            <Icon name="robot" size={30} />
            <strong>{t(TEXT.name)}</strong>
          </p>
          <ul className="ai-pop-list">
            <li>
              <Icon name="sparkle" size={22} />
              <span>{t(TEXT.made)}</span>
            </li>
            <li>
              <Icon name="camera" size={22} />
              <span>{t(TEXT.photo)}</span>
            </li>
            <li>
              <Icon name="data" size={22} />
              <span>{t(TEXT.more)}</span>
            </li>
          </ul>
          {onMore && (
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-block"
              onClick={() => {
                setOpen(false);
                onMore();
              }}
            >
              <Icon name="data" />
              {t(TEXT.button)}
            </button>
          )}
        </Popover>
      )}
    </>
  );
}
