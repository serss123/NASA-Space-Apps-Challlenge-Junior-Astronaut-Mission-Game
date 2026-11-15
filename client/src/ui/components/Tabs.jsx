// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Accessible tabs (WAI-ARIA tablist): arrow keys, Home and End move between tabs; the panel follows.
// Each tab shows an icon and a label; in compact mode only the icon (the label stays as its accessible name).
//
//   <Tabs label="Capítulos" value={tab} onChange={setTab}
//         tabs={[{ id: 'sun', icon: 'sun', label: { es: 'El Sol', en: 'The Sun' }, badge: '2/5', tone: 'var(--energy)' }, ...]}>
//     {(active) => <Chapter id={active} />}        // optional panel: a node or a function of the active id
//   </Tabs>
//
// compact: 'auto' (icon-only on phones or when the labels do not fit in one row) | true | false.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n.jsx';
import { sfx } from '../../audio/sfx.js';
import { useCompact } from './hooks.js';
import Icon from './Icon.jsx';
import './tabs.css';

export default function Tabs({ tabs = [], value, onChange, label, compact = 'auto', orientation = 'horizontal', className = '', panelClassName = '', idBase, children }) {
  const { t, lang } = useI18n();
  const phone = useCompact();
  const autoId = useId();
  const base = idBase || `tabs${autoId.replace(/[^a-zA-Z0-9-]/g, '')}`;
  const listRef = useRef(null);
  const [fits, setFits] = useState(true);
  const iconOnly = compact === 'auto' ? phone || !fits : !!compact;

  const enabled = tabs.filter((tb) => !tb.disabled);
  const active = enabled.some((tb) => tb.id === value) ? value : enabled[0]?.id;

  // 'auto': if the labelled tabs do not fit in one row, show icons only.
  const overflowing = () => {
    const el = listRef.current;
    return !!el && el.scrollWidth > el.clientWidth + 1;
  };
  useLayoutEffect(() => {
    if (compact === 'auto' && !phone && fits && overflowing()) setFits(false);
  });
  useEffect(() => {
    const el = listRef.current;
    if (compact !== 'auto' || !el) return undefined;
    let width = el.clientWidth;
    // A new container width: try the labels again. Same width but new tab sizes (web fonts loaded): re-check.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      if (el.clientWidth !== width) {
        width = el.clientWidth;
        setFits(true);
      } else if (overflowing()) setFits(false);
    }) : null;
    if (ro) {
      ro.observe(el);
      for (const tab of el.children) ro.observe(tab);
    }
    document.fonts?.ready.then(() => overflowing() && setFits(false));
    return () => ro?.disconnect();
  }, [compact, tabs.length]);
  useEffect(() => setFits(true), [lang, tabs.length]);

  const select = (id, focus) => {
    if (id !== active) sfx.play('click');
    onChange?.(id);
    if (focus) requestAnimationFrame(() => document.getElementById(`${base}-tab-${id}`)?.focus());
  };
  const onKeyDown = (e) => {
    const i = enabled.findIndex((tb) => tb.id === active);
    if (i < 0) return;
    const keysNext = orientation === 'vertical' ? ['ArrowDown'] : ['ArrowRight'];
    const keysPrev = orientation === 'vertical' ? ['ArrowUp'] : ['ArrowLeft'];
    let next = null;
    if (keysNext.includes(e.key)) next = enabled[(i + 1) % enabled.length];
    else if (keysPrev.includes(e.key)) next = enabled[(i - 1 + enabled.length) % enabled.length];
    else if (e.key === 'Home') next = enabled[0];
    else if (e.key === 'End') next = enabled[enabled.length - 1];
    if (!next) return;
    e.preventDefault();
    e.stopPropagation();
    select(next.id, true);
  };

  return (
    <div className={`tabs is-${orientation}${iconOnly ? ' is-icon-only' : ''}${className ? ` ${className}` : ''}`}>
      <div ref={listRef} role="tablist" aria-label={label ? t(label) : undefined} aria-orientation={orientation} className="tabs-list" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const selected = tab.id === active;
          const name = t(tab.label);
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={children != null ? `${base}-panel` : undefined}
              aria-label={iconOnly ? name : undefined}
              title={iconOnly ? name : undefined}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              className={`tab${selected ? ' is-active' : ''}`}
              style={tab.tone ? { '--tab-tone': tab.tone } : undefined}
              onClick={() => select(tab.id, false)}
            >
              {tab.icon && <Icon name={tab.icon} />}
              {!iconOnly && <span className="tab-label">{name}</span>}
              {tab.badge != null && tab.badge !== false && <span className="tab-badge">{tab.badge}</span>}
            </button>
          );
        })}
      </div>
      {children != null && (
        <div role="tabpanel" id={`${base}-panel`} aria-labelledby={active ? `${base}-tab-${active}` : undefined} className={`tabs-panel${panelClassName ? ` ${panelClassName}` : ''}`}>
          {typeof children === 'function' ? children(active) : children}
        </div>
      )}
    </div>
  );
}
