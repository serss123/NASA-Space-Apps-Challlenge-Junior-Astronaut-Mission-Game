// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Accessible modal window in three parts: header, body and footer (docs/DESIGN.md section 3).
//   · The footer holds the main actions and is ALWAYS visible (it never scrolls away).
//   · The body should fit one view; if it does not, it scrolls (overflow-y: auto) so nothing is cut off. Keep texts
//     short and the layout compact first, scroll is the safety net.
//   · The window is never taller than the viewport minus its margins.
// Behaviour kept from v1: a stack of open modals (only the top one reacts to keys), Escape closes the
// top-most one (if closable), focus trap, focus restore on close, [data-autofocus], backdrop click to close.
// If an action removes the focused button, focus goes back inside the window so the keyboard keeps working.
//
// fill: the window takes all the height it can (give paged content such as <Pager> or <Tabs> a definite height).
//
//   <Modal title="Ajustes" icon="settings" size="sm" tone="var(--life)" onClose={close}
//          footer={<button className="btn btn-primary">Listo</button>}>...</Modal>
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n.jsx';
import { useAvoidAiBadge } from './AiBadge.jsx';
import Icon, { hasIcon } from './Icon.jsx';
import './modal.css';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
const stack = []; // open modals (the last one is on top)

function focusInside(el) {
  const first = el.querySelector('[data-autofocus]') || el.querySelector(FOCUSABLE);
  (first || el).focus({ preventScroll: true });
}

function ModalIcon({ icon }) {
  if (!icon) return null;
  if (typeof icon === 'string' && hasIcon(icon)) return <Icon name={icon} size="100%" />;
  if (typeof icon === 'string') return <span className="modal-emoji">{icon}</span>; // v1: an emoji
  return icon; // any React node
}

export default function Modal({ title, icon, tone, accent, onClose, children, footer, size = 'md', fill = false, closable = true, className = '', labelledBy }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const footRef = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closableRef = useRef(closable);
  closableRef.current = closable;
  useAvoidAiBadge(footRef);

  useEffect(() => {
    const token = {};
    stack.push(token);
    const prev = document.activeElement;
    const el = ref.current;
    if (el) focusInside(el);
    const onKey = (e) => {
      if (stack[stack.length - 1] !== token || !el) return; // only the top-most window
      if (e.key === 'Escape') {
        if (closableRef.current && onCloseRef.current) {
          e.stopPropagation();
          onCloseRef.current();
        }
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (!items.length) {
        e.preventDefault();
        el.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const inside = el.contains(document.activeElement);
      if (!inside) {
        e.preventDefault();
        (e.shiftKey ? lastEl : firstEl).focus();
      } else if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(token);
      if (i >= 0) stack.splice(i, 1);
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) prev.focus({ preventScroll: true });
    };
  }, []);

  // After every content change: if focus was left outside (its button disappeared), bring it back in.
  useEffect(() => {
    const el = ref.current;
    if (!el || stack[stack.length - 1] === undefined) return;
    const active = document.activeElement;
    if (active?.closest?.('[data-popover], .ai-badge')) return; // popovers and the AI badge manage their own focus
    if (!active || active === document.body || !el.contains(active)) {
      // Only when this window is the top one (never steal focus from another window above it).
      const topIsThis = el.closest('.modal-backdrop') === [...document.querySelectorAll('.modal-backdrop')].pop();
      if (topIsThis) focusInside(el);
    }
  });

  const toneColor = tone || accent || 'var(--energy)';
  return createPortal(
    <div className="modal-backdrop rm-fade" onPointerDown={(e) => e.target === e.currentTarget && closable && onClose?.()}>
      <section
        ref={ref}
        className={`modal modal-${size}${fill ? ' modal-fill' : ''} rm-fade${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        tabIndex={-1}
        style={{ '--tone': toneColor, '--accent': toneColor }}
      >
        {title && (
          <header className="modal-head">
            {icon && (
              <span className="modal-icon" aria-hidden="true">
                <ModalIcon icon={icon} />
              </span>
            )}
            <h2 id={titleId}>{title}</h2>
            {closable && onClose && (
              <button type="button" className="btn btn-icon btn-sm modal-close" onClick={onClose} aria-label={t({ es: 'Cerrar (Esc)', en: 'Close (Esc)' })} title={t({ es: 'Cerrar', en: 'Close' })}>
                <Icon name="close" />
              </button>
            )}
          </header>
        )}
        <div className="modal-body" data-fit="">
          {children}
        </div>
        {footer && (
          <footer ref={footRef} className="modal-foot">
            {footer}
          </footer>
        )}
      </section>
    </div>,
    document.body
  );
}
