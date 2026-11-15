// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Sol, the Sun character: its face shows the space weather (docs/DESIGN.md sections 2 and 4).
//   level 0  calm and smiling          "Calma" / "Calm"
//   level 1  restless                  "Tormenta pequeña" / "Small storm"
//   level 2  angry                     "Tormenta fuerte" / "Strong storm"
//   level 3  furious, with flare hair  "Supertormenta" / "Super storm"
// It replaces most storm numbers in the main UI. Its accessible name is the storm name.
//
//   <SunMood level={2} />                     96 px, animated
//   <SunMood level={0} size={48} label />     shows the storm name under the face
//   <SunMood level={3} label={{ es: 'Esta noche', en: 'Tonight' }} />   a custom caption
import { useI18n } from '../../i18n.jsx';
import './sunmood.css';

export const STORM_NAMES = [
  { es: 'Calma', en: 'Calm' },
  { es: 'Tormenta pequeña', en: 'Small storm' },
  { es: 'Tormenta fuerte', en: 'Strong storm' },
  { es: 'Supertormenta', en: 'Super storm' }
];

/** Clamps anything to a storm level 0..3. */
export function stormLevel(level) {
  const n = Math.round(Number(level));
  return Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : 0;
}

/** Bilingual storm name for a level ({ es, en }). */
export function stormName(level) {
  return STORM_NAMES[stormLevel(level)];
}

const COLORS = [
  { body: '#ffc93c', shade: '#f5a623', ray: '#ffdc66' },
  { body: '#ffb43a', shade: '#f08f24', ray: '#ffcd4f' },
  { body: '#ff8d3b', shade: '#e66a25', ray: '#ffb547' },
  { body: '#ff603d', shade: '#d93f2b', ray: '#ff9a3c' }
];

const pt = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return `${(60 + r * Math.cos(a)).toFixed(2)} ${(60 + r * Math.sin(a)).toFixed(2)}`;
};

function Rays({ level, color }) {
  const n = 12;
  return Array.from({ length: n }, (_, i) => {
    const a = i * (360 / n) - 90;
    const long = level >= 2 && i % 2 === 0 ? 60 : 55;
    return <path key={i} d={`M${pt(36, a - 9)}L${pt(long, a)}L${pt(36, a + 9)}Z`} fill={color} />;
  });
}

// Flame "hair" for the super storm: one flame drawn pointing up from its base at (0, 0).
const FLAME = 'M-9 2C-12-9-5-16-3-27C1-20 0-14 4-10C6-14 7-18 7-23C12-14 13-5 9 2Z';
const FLAME_INNER = 'M-4 2C-6-5-2-9-1-15C1-11 1-8 3-6C4-8 5-10 5-12C7-7 7-2 5 2Z';

function Flares() {
  return [-158, -124, -90, -56, -22].map((a, i) => {
    const rad = (a * Math.PI) / 180;
    const x = 60 + 33 * Math.cos(rad);
    const y = 60 + 33 * Math.sin(rad);
    return (
      <g key={a} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${a + 90})`}>
        <g className="sun-flare" style={{ animationDelay: `${i * -0.13}s` }}>
          <path d={FLAME} fill="#ff7a33" />
          <path d={FLAME_INNER} fill="#ffc93c" stroke="none" />
        </g>
      </g>
    );
  });
}

function Face({ level }) {
  const glints = (y) => (
    <>
      <circle cx="50.6" cy={y - 1.8} r="1.6" fill="#fff7e8" stroke="none" />
      <circle cx="72.6" cy={y - 1.8} r="1.6" fill="#fff7e8" stroke="none" />
    </>
  );
  if (level === 0) {
    return (
      <>
        <ellipse cx="42" cy="67" rx="6" ry="3.8" fill="#ff8aa0" stroke="none" opacity="0.85" />
        <ellipse cx="78" cy="67" rx="6" ry="3.8" fill="#ff8aa0" stroke="none" opacity="0.85" />
        <path d="M44 59Q49 51.5 54 59M66 59Q71 51.5 76 59" strokeWidth="4.5" />
        <path d="M49 67.5Q60 80 71 67.5Q60 72 49 67.5Z" fill="#8c2b3f" strokeWidth="3.5" />
      </>
    );
  }
  if (level === 1) {
    return (
      <>
        <path d="M42 47.5L54 44M66 44L78 47.5" strokeWidth="4" />
        <circle cx="50" cy="57.5" r="5" fill="var(--ink)" stroke="none" />
        <circle cx="72" cy="57.5" r="5" fill="var(--ink)" stroke="none" />
        {glints(57.5)}
        <path d="M49 73Q54.5 68.5 60 73Q65.5 77.5 71 73" strokeWidth="4" />
        <path d="M86 37C89 42 91 45 91 47.5A5 5 0 0 1 81 47.5C81 45 83 42 86 37Z" fill="#8fe3ff" strokeWidth="3" />
      </>
    );
  }
  if (level === 2) {
    return (
      <>
        <path d="M41 46L55 52.5M79 46L65 52.5" strokeWidth="5" />
        <circle cx="50" cy="59" r="5" fill="var(--ink)" stroke="none" />
        <circle cx="70" cy="59" r="5" fill="var(--ink)" stroke="none" />
        <circle cx="51.4" cy="57.2" r="1.5" fill="#fff7e8" stroke="none" />
        <circle cx="71.4" cy="57.2" r="1.5" fill="#fff7e8" stroke="none" />
        <path d="M50 77Q60 67.5 70 77" strokeWidth="4.5" />
      </>
    );
  }
  return (
    <>
      <path d="M38.5 43.5L56 53.5M81.5 43.5L64 53.5" strokeWidth="6" />
      <circle cx="50" cy="60" r="4.2" fill="var(--ink)" stroke="none" />
      <circle cx="70" cy="60" r="4.2" fill="var(--ink)" stroke="none" />
      <path d="M46.5 80Q60 62 73.5 80Z" fill="#5a1630" strokeWidth="4" />
      <ellipse cx="60" cy="77.6" rx="5.6" ry="2.2" fill="#ff6f8f" stroke="none" />
    </>
  );
}

export default function SunMood({ level = 0, size = 96, label, title, animated = true, className = '' }) {
  const { t } = useI18n();
  const lv = stormLevel(level);
  const c = COLORS[lv];
  const name = t(STORM_NAMES[lv]);
  const caption = label === true ? name : label ? t(label) : null;
  const px = typeof size === 'number' ? `${size}px` : size;
  return (
    <span className={`sun-mood sun-l${lv}${animated ? ' is-animated' : ''}${className ? ` ${className}` : ''}`} style={{ '--sun-size': px }}>
      <svg className="sun-mood-svg" viewBox="0 0 120 120" role="img" aria-label={title || name} stroke="var(--ink)" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" fill="none">
        <g className="sun-rays">
          <g className="sun-rays-pulse">
            <Rays level={lv} color={c.ray} />
          </g>
        </g>
        {lv === 3 && <Flares />}
        <g className="sun-body">
          <circle cx="60" cy="60" r="36" fill={c.shade} stroke="none" />
          <circle cx="57.5" cy="57.5" r="34" fill={c.body} stroke="none" />
          <path d="M35 47A27 27 0 0 1 48 33.5" stroke="#fff7e8" strokeWidth="4.5" opacity="0.85" />
          <circle cx="60" cy="60" r="36" strokeWidth="4" />
          <g className="sun-face">
            <Face level={lv} />
          </g>
        </g>
      </svg>
      {caption && (
        <span className="sun-mood-label" aria-hidden={label === true ? 'true' : undefined}>
          {caption}
        </span>
      )}
    </span>
  );
}
