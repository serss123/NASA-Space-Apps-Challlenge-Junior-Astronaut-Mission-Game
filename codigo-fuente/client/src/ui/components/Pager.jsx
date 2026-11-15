// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Paged list with big arrows and dots: long collections never get a scrollbar (docs/DESIGN.md section 3).
// Only the current page is rendered. Swipe, arrow keys and the dots also change page.
//
//   <Pager items={cards} perPage={6} render={(card, i) => <Card {...card} />} label="Descubrimientos" />
//   <Pager items={words} perPage={({ width, height }) => Math.floor(width / 220) * Math.floor(height / 120)} ... />
//
// perPage: a number, or a function of the page area ({ width, height, compact }) that returns how many fit.
// The page area is a CSS grid (.pager-page); tune it with pageClassName or the --pager-min / --pager-gap variables.
// Arrows sit at the sides when the pager is wide and below it when it is tall (controls="auto" | "sides" | "below").
import { Fragment, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n.jsx';
import { sfx } from '../../audio/sfx.js';
import { useCompact } from './hooks.js';
import Icon from './Icon.jsx';
import './pager.css';

const ARROW = 64; // arrow button box (.btn-icon.btn-lg) used to work out the page area
const GAP = 10;

/**
 * How many cells fit in a page area for a CSS grid with auto-fill columns:
 * --pager-min = minWidth, grid-auto-rows = rowHeight, --pager-gap = gap. Use it inside perPage.
 *   perPage={(area) => gridCapacity(area, { minWidth: 180, rowHeight: 120 })}
 */
export function gridCapacity({ width, height }, { minWidth = 180, rowHeight = 120, gap = 12 } = {}) {
  const cols = Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
  const rows = Math.max(1, Math.floor((height + gap) / (rowHeight + gap)));
  return cols * rows;
}

function useBox(ref) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const r = el.getBoundingClientRect();
      setBox((b) => (Math.abs(b.width - r.width) < 0.5 && Math.abs(b.height - r.height) < 0.5 ? b : { width: r.width, height: r.height }));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

export default function Pager({
  items = [],
  perPage = 6,
  render,
  label,
  page: controlledPage,
  onPageChange,
  initialPage = 0,
  controls = 'auto',
  hideSinglePage = true,
  keyOf,
  empty = null,
  className = '',
  pageClassName = '',
  style
}) {
  const { t } = useI18n();
  const compact = useCompact();
  const rootRef = useRef(null);
  const pageRef = useRef(null);
  const box = useBox(rootRef);
  const [own, setOwn] = useState(initialPage);
  const [dir, setDir] = useState(0);
  const swipe = useRef(null);

  const mode = controls === 'auto' ? (box.width > box.height * 1.3 && box.width > 480 ? 'sides' : 'below') : controls;
  const area = mode === 'sides' ? { width: Math.max(0, box.width - 2 * (ARROW + GAP)), height: Math.max(0, box.height - 30) } : { width: box.width, height: Math.max(0, box.height - ARROW - GAP) };
  const measured = box.width > 0;
  let per = typeof perPage === 'function' ? (measured ? perPage({ ...area, compact }) : 1) : perPage;
  per = Math.max(1, Math.floor(Number(per)) || 1);
  const pages = Math.max(1, Math.ceil(items.length / per));
  const page = Math.min(Math.max(0, controlledPage ?? own), pages - 1);
  const showControls = !(hideSinglePage && pages <= 1);

  const go = useCallback(
    (next, viaKeyboard = false) => {
      const p = Math.min(Math.max(0, next), pages - 1);
      if (p === page) return;
      setDir(p > page ? 1 : -1);
      sfx.play('click');
      if (onPageChange) onPageChange(p);
      if (controlledPage == null) setOwn(p);
      if (viaKeyboard) requestAnimationFrame(() => pageRef.current?.focus({ preventScroll: true }));
    },
    [page, pages, onPageChange, controlledPage]
  );

  const onKeyDown = (e) => {
    if (e.defaultPrevented || e.target.closest?.('input, textarea, select, [role="tablist"]')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(page + 1, true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(page - 1, true);
    }
  };
  const onPointerDown = (e) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 50) go(page + (dx < 0 ? 1 : -1));
  };

  const start = page * per;
  const slice = items.slice(start, start + per);
  const pageLabel = t({ es: `Página ${page + 1} de ${pages}`, en: `Page ${page + 1} of ${pages}` });

  const prev = (
    <button type="button" className="btn btn-icon btn-lg pager-arrow" onClick={() => go(page - 1)} disabled={page <= 0} aria-label={t({ es: 'Página anterior', en: 'Previous page' })} title={t({ es: 'Anterior', en: 'Previous' })}>
      <Icon name="arrow-left" />
    </button>
  );
  const next = (
    <button type="button" className="btn btn-icon btn-lg pager-arrow" onClick={() => go(page + 1)} disabled={page >= pages - 1} aria-label={t({ es: 'Página siguiente', en: 'Next page' })} title={t({ es: 'Siguiente', en: 'Next' })}>
      <Icon name="arrow-right" />
    </button>
  );
  const dots =
    pages > 8 ? (
      <span className="pager-count" aria-hidden="true">
        {page + 1} / {pages}
      </span>
    ) : (
      <span className="pager-dots">
        {Array.from({ length: pages }, (_, i) => (
          <button
            key={i}
            type="button"
            className="pager-dot"
            aria-label={t({ es: `Página ${i + 1} de ${pages}`, en: `Page ${i + 1} of ${pages}` })}
            aria-current={i === page ? 'page' : undefined}
            onClick={() => go(i)}
          />
        ))}
      </span>
    );

  const view = (
    <div className="pager-view" data-fit="" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
      {items.length === 0 ? (
        empty
      ) : (
        <div ref={pageRef} key={`${page}-${per}`} className={`pager-page${pageClassName ? ` ${pageClassName}` : ''}`} data-dir={dir} tabIndex={-1}>
          {slice.map((item, i) => (
            <Fragment key={keyOf ? keyOf(item, start + i) : start + i}>{render(item, start + i)}</Fragment>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className={`pager is-${mode}${className ? ` ${className}` : ''}`} style={style} role="group" aria-label={label ? `${label}. ${pageLabel}` : pageLabel} onKeyDown={onKeyDown}>
      {mode === 'sides' && showControls ? (
        <>
          {prev}
          <div className="pager-middle">
            {view}
            <div className="pager-controls">{dots}</div>
          </div>
          {next}
        </>
      ) : (
        <>
          {view}
          {showControls && (
            <div className="pager-controls">
              {prev}
              {dots}
              {next}
            </div>
          )}
        </>
      )}
      <span className="sr-only" aria-live="polite">
        {showControls ? pageLabel : ''}
      </span>
    </div>
  );
}
