// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// A small paper popover next to an anchor element (glossary words, data tags, the AI badge).
// It always stays inside the viewport: it flips above/below and slides sideways, with an arrow
// that keeps pointing at the anchor. It never scrolls: keep its content short.
// Closes with Escape, a tap outside or the anchor's own toggle; focus goes in and comes back to the anchor.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './popover.css';

const MARGIN = 10;
const GAP = 12;

export default function Popover({ anchor, onClose, placement = 'bottom', label, className = '', children, zIndex, width }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null); // { left, top, side, arrow }
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const place = useCallback(() => {
    const el = ref.current;
    if (!el || !anchor || !anchor.isConnected) return;
    const a = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const roomBelow = vh - a.bottom - GAP - MARGIN;
    const roomAbove = a.top - GAP - MARGIN;
    let side = placement === 'top' ? 'top' : 'bottom';
    if (side === 'bottom' && h > roomBelow && roomAbove > roomBelow) side = 'top';
    if (side === 'top' && h > roomAbove && roomBelow > roomAbove) side = 'bottom';
    let top = side === 'bottom' ? a.bottom + GAP : a.top - GAP - h;
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));
    let left = a.left + a.width / 2 - w / 2;
    left = Math.max(MARGIN, Math.min(left, vw - w - MARGIN));
    const arrow = Math.max(22, Math.min(a.left + a.width / 2 - left, w - 22));
    setPos((p) => (p && p.left === left && p.top === top && p.side === side && p.arrow === arrow ? p : { left, top, side, arrow }));
  }, [anchor, placement]);

  useLayoutEffect(() => {
    place();
  }, [place, children]);

  // Focus moves into the popover; on close it returns to the anchor (if it was inside).
  useEffect(() => {
    const el = ref.current;
    el?.focus({ preventScroll: true });
    return () => {
      if (el && el.contains(document.activeElement) && anchor?.isConnected) anchor.focus({ preventScroll: true });
    };
  }, [anchor]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation(); // the modal underneath must stay open
        onCloseRef.current?.();
      }
    };
    const onDown = (e) => {
      const el = ref.current;
      if (!el || el.contains(e.target)) return;
      if (anchor && anchor.contains(e.target)) return; // the anchor toggles by itself
      onCloseRef.current?.();
    };
    const onFocusOut = (e) => {
      const el = ref.current;
      const next = e.relatedTarget;
      if (el && next && !el.contains(next) && !(anchor && anchor.contains(next))) onCloseRef.current?.();
    };
    const el = ref.current;
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('resize', place);
    el?.addEventListener('focusout', onFocusOut);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('resize', place);
      el?.removeEventListener('focusout', onFocusOut);
    };
  }, [anchor, place]);

  return createPortal(
    <div
      ref={ref}
      className={`popover is-${pos?.side || placement}${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      data-popover=""
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
        '--arrow-x': `${pos?.arrow ?? 24}px`,
        ...(zIndex != null ? { zIndex } : null),
        ...(width ? { width } : null)
      }}
    >
      {children}
    </div>,
    document.body
  );
}
