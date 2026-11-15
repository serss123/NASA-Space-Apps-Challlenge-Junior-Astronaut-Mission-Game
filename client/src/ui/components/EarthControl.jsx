// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Mission Control: a small Earth with a headset that talks in one-sentence speech bubbles
// (tips and mission messages). It replaces the v1 checklist panel (docs/DESIGN.md section 2).
//
//   <EarthControl size={64} mood="happy" talking />          the avatar alone (decorative unless title is set)
//   <ControlSays text={{ es: 'Enciende la [[antenna|antena]].', en: 'Switch on the [[antenna]].' }}
//                tone="info" action={{ label: { es: 'Ir allí', en: 'Go there' }, onClick: go, icon: 'arrow-right' }} />
import { useId } from 'react';
import { useI18n } from '../../i18n.jsx';
import { useCompact } from './hooks.js';
import Icon from './Icon.jsx';
import RichText from './RichText.jsx';
import './earthcontrol.css';

export default function EarthControl({ size = 64, mood = 'happy', talking = false, title, className = '' }) {
  const clip = `ss-ec-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const worried = mood === 'worried';
  const px = typeof size === 'number' ? `${size}px` : size;
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': 'true' };
  return (
    <svg
      className={`earth-control${talking ? ' is-talking' : ''}${className ? ` ${className}` : ''}`}
      viewBox="0 0 100 100"
      style={{ width: px, height: px }}
      stroke="var(--ink)"
      strokeLinejoin="round"
      strokeLinecap="round"
      fill="none"
      {...a11y}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="50" cy="54" r="32" />
        </clipPath>
      </defs>
      {/* headset band */}
      <path d="M16 54A34 34 0 0 1 84 54" strokeWidth="10" />
      <path d="M16 54A34 34 0 0 1 84 54" stroke="var(--metal)" strokeWidth="4" />
      <g className="ec-head">
        <circle cx="50" cy="54" r="32" fill="#2f86d6" stroke="none" />
        <circle cx="47.6" cy="51.6" r="30" fill="#3fa7ff" stroke="none" />
        <g clipPath={`url(#${clip})`} fill="#45cf63" strokeWidth="3">
          <path d="M22 40C30 30 44 32 44 40C44 46 36 46 34 52C32 58 24 58 20 52Z" />
          <path d="M62 70C70 64 84 68 82 78C80 86 68 88 62 82C58 78 58 73 62 70Z" />
          <path d="M66 30C72 26 80 30 78 36C76 40 70 38 66 36Z" />
        </g>
        <path d="M27 42A26 26 0 0 1 38 30" stroke="#fff7e8" strokeWidth="4" opacity="0.8" />
        <circle cx="50" cy="54" r="32" strokeWidth="4" />
        {/* face */}
        <ellipse cx="33" cy="63" rx="5" ry="3" fill="#ff8aa0" stroke="none" opacity="0.85" />
        <ellipse cx="67" cy="63" rx="5" ry="3" fill="#ff8aa0" stroke="none" opacity="0.85" />
        <ellipse className="ec-eye" cx="40" cy="55" rx="3.6" ry="4.4" fill="var(--ink)" stroke="none" />
        <ellipse className="ec-eye" cx="60" cy="55" rx="3.6" ry="4.4" fill="var(--ink)" stroke="none" />
        <circle cx="41.2" cy="53.4" r="1.3" fill="#fff7e8" stroke="none" />
        <circle cx="61.2" cy="53.4" r="1.3" fill="#fff7e8" stroke="none" />
        {worried && <path d="M33 47L43 44.5M57 44.5L67 47" strokeWidth="3.2" />}
        <g className="ec-mouth">
          {worried ? <path className="ec-mouth-closed" d="M44 67Q50 64 56 67" strokeWidth="3.4" /> : <path className="ec-mouth-closed" d="M43 64Q50 71 57 64" strokeWidth="3.4" />}
          <path className="ec-mouth-open" d="M43.5 63.5Q50 75 56.5 63.5Z" fill="#8c2b3f" strokeWidth="3" />
        </g>
      </g>
      {/* ear cups and microphone */}
      <rect x="9" y="44" width="13" height="20" rx="5.5" fill="var(--danger)" strokeWidth="3.5" />
      <rect x="78" y="44" width="13" height="20" rx="5.5" fill="var(--danger)" strokeWidth="3.5" />
      <path d="M15.5 63Q17 77 33 76" strokeWidth="6.5" />
      <path d="M15.5 63Q17 77 33 76" stroke="var(--metal)" strokeWidth="2.6" />
      <circle cx="35.5" cy="75.8" r="4.4" fill="var(--ink-2)" strokeWidth="3" />
    </svg>
  );
}

const TONES = ['info', 'ok', 'warn', 'alert', 'night'];

/** A one-sentence speech bubble from Mission Control, with an optional action button. */
export function ControlSays({ text, children, action, tone = 'info', avatar = true, title, live = true, talking, className = '' }) {
  const { t } = useI18n();
  const compact = useCompact();
  const tn = TONES.includes(tone) ? tone : 'info';
  const heading = title === false ? null : t(title || { es: 'Control de Misión', en: 'Mission Control' });
  const content = children ?? (text != null ? <RichText text={text} /> : null);
  return (
    <div className={`control-says tone-${tn}${className ? ` ${className}` : ''}`}>
      {avatar && <EarthControl size={compact ? 46 : 62} mood={tn === 'alert' || tn === 'warn' ? 'worried' : 'happy'} talking={talking} />}
      <div className="control-says-bubble">
        <div className="control-says-copy">
          {heading && <span className="control-says-kicker">{heading}</span>}
          <div className="control-says-text" aria-live={live ? 'polite' : undefined}>
            {content}
          </div>
        </div>
        {action && (
          <button type="button" className={`btn ${action.primary ? 'btn-primary' : 'btn-secondary'} btn-sm control-says-action`} onClick={action.onClick} disabled={action.disabled}>
            {action.icon && <Icon name={action.icon} />}
            {t(action.label)}
          </button>
        )}
      </div>
    </div>
  );
}
