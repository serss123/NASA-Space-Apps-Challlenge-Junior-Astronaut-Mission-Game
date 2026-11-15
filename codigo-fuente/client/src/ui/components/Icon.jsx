// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Original SVG icon set for Sol a Sol (no emoji in the UI chrome, docs/DESIGN.md section 2).
// One consistent style: 24x24 viewBox, 2 px ink outline, flat token-coloured fills, rounded joins.
//
//   <Icon name="sun" />                    decorative (aria-hidden)
//   <Icon name="heart" size={32} />        size in px (number) or any CSS length ("1.5em")
//   <Icon name="rover" title="Rover" />    meaningful: role="img" + accessible name
//   <Icon name="astronaut" color="#3df5c5" />   recolours the main fill (--icon-color)
//
// CSS hooks: --icon-color (main fill), --icon-fill (neutral fill of control icons, paper by default),
// --icon-stroke (outline, ink by default). Unknown names draw a neutral placeholder and never crash.
import './icon.css';

const S = 'var(--icon-stroke, var(--ink))';
/** Main fill of an icon: callers can recolour it with --icon-color (or the color prop). */
const F = (fallback) => `var(--icon-color, ${fallback})`;
/** Neutral fill of control icons (play, close, arrows...): paper, so they read on any button. */
const N = 'var(--icon-fill, var(--paper))';

const r1 = (n) => Math.round(n * 100) / 100;
const polar = (cx, cy, r, deg) => [r1(cx + r * Math.cos((deg * Math.PI) / 180)), r1(cy + r * Math.sin((deg * Math.PI) / 180))];

/** Points of a star polygon. */
function starPoints(cx, cy, ro, ri, n = 5, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) pts.push(polar(cx, cy, i % 2 ? ri : ro, rot + (i * 180) / n).join(','));
  return pts.join(' ');
}

/** Short ray lines around a centre. */
function rays(cx, cy, from, to, n, offset = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = offset + (i * 360) / n;
    const [x1, y1] = polar(cx, cy, from, a);
    const [x2, y2] = polar(cx, cy, to, a);
    return <path key={i} d={`M${x1} ${y1}L${x2} ${y2}`} />;
  });
}

/** Path of an annular sector (used by the radiation trefoil). */
function sector(cx, cy, ri, ro, a0, a1) {
  const [x0, y0] = polar(cx, cy, ro, a0);
  const [x1, y1] = polar(cx, cy, ro, a1);
  const [x2, y2] = polar(cx, cy, ri, a1);
  const [x3, y3] = polar(cx, cy, ri, a0);
  return `M${x0} ${y0}A${ro} ${ro} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${ri} ${ri} 0 0 0 ${x3} ${y3}Z`;
}

/** Path of a gear with a hole (use fillRule="evenodd"). */
function gear(cx, cy, ro, ri, teeth, hole) {
  const step = 360 / teeth;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step - 90;
    const pts = [polar(cx, cy, ri, a - step * 0.5), polar(cx, cy, ri, a - step * 0.22), polar(cx, cy, ro, a - step * 0.16), polar(cx, cy, ro, a + step * 0.16), polar(cx, cy, ri, a + step * 0.22)];
    d += (i === 0 ? 'M' : 'L') + pts.map((p) => p.join(' ')).join('L');
  }
  d += 'Z';
  d += `M${cx + hole} ${cy}A${hole} ${hole} 0 1 0 ${cx - hole} ${cy}A${hole} ${hole} 0 1 0 ${cx + hole} ${cy}Z`;
  return d;
}

/** An "outlined line": a thick ink stroke under a coloured stroke, so lines look like stickers too. */
function Line({ d, color = N, w = 2.4 }) {
  return (
    <>
      <path d={d} stroke={S} strokeWidth={w + 3.6} fill="none" />
      <path d={d} stroke={color} strokeWidth={w} fill="none" />
    </>
  );
}

const PLUS = 'M9.8 3.6H14.2V9.8H20.4V14.2H14.2V20.4H9.8V14.2H3.6V9.8H9.8Z';
const ARROW_RIGHT = 'M3.6 9.6H12.4V5L20.6 12L12.4 19V14.4H3.6Z';
const HEART = 'M12 20.4C5.2 16 2.6 12.3 2.6 8.7C2.6 5.9 4.7 3.7 7.4 3.7C9.3 3.7 10.9 4.8 12 6.5C13.1 4.8 14.7 3.7 16.6 3.7C19.3 3.7 21.4 5.9 21.4 8.7C21.4 12.3 18.8 16 12 20.4Z';
const SHIELD = 'M12 2.6L19.8 5.6V11.6C19.8 16.4 16.6 19.8 12 21.4C7.4 19.8 4.2 16.4 4.2 11.6V5.6Z';

const ICONS = {
  /* ---------- Sky and space ---------- */
  sun: () => (
    <>
      {rays(12, 12, 8.4, 10.8, 8)}
      <circle cx="12" cy="12" r="5.4" fill={F('var(--energy)')} />
      <path d="M9.4 10.2a3 3 0 0 1 2-1.5" stroke="var(--paper)" strokeWidth="1.5" />
    </>
  ),
  calm: () => (
    <>
      {rays(12, 12, 8.6, 10.8, 8, 22.5)}
      <circle cx="12" cy="12" r="6.6" fill={F('var(--energy)')} />
      <path d="M9 11.2q.9-1.1 1.8 0M13.2 11.2q.9-1.1 1.8 0" strokeWidth="1.5" />
      <path d="M9.5 13.8q2.5 2.4 5 0" strokeWidth="1.6" />
    </>
  ),
  moon: () => (
    <>
      <path d="M15.8 3.6A9.2 9.2 0 1 0 20.6 15.4A7.2 7.2 0 0 1 15.8 3.6Z" fill={F('var(--moon)')} />
      <circle cx="8.2" cy="12.6" r="1.6" fill="var(--moon-lo)" stroke="none" />
      <circle cx="11.6" cy="17.4" r="1.1" fill="var(--moon-lo)" stroke="none" />
      <circle cx="7.4" cy="8" r="0.9" fill="var(--moon-lo)" stroke="none" />
    </>
  ),
  earth: () => (
    <>
      <circle cx="12" cy="12" r="9.2" fill={F('var(--info)')} />
      <path d="M6.3 7.2C7.9 5.8 10.4 6 11 7.8C11.4 9.4 9.6 10.1 9.8 11.7C10 13.3 8.2 14.1 7 12.9C5.8 11.7 5 8.6 6.3 7.2Z" fill="var(--farm)" strokeWidth="1.5" />
      <path d="M13.4 13.4C15 12.3 17.7 12.7 18.3 14.5C18.8 16.3 17 18.4 15 18.6C13.4 18.8 12.6 17.2 13.2 16C13.6 15.2 12.6 14.1 13.4 13.4Z" fill="var(--farm)" strokeWidth="1.5" />
      <circle cx="16.4" cy="7.6" r="1.3" fill="var(--farm)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="9.2" />
    </>
  ),
  mars: () => (
    <>
      <circle cx="12" cy="12" r="9.2" fill={F('#ef6a3b')} />
      <path d="M6 12.2C7.4 11 9.6 11.6 9.6 13.2C9.6 14.8 7.6 15.4 6.4 14.6C5.6 14 5.4 12.8 6 12.2Z" fill="#c4481f" stroke="none" />
      <path d="M13.4 15.6C14.8 14.6 17.6 15 17.4 16.8C17.2 18.4 14.6 18.6 13.6 17.6C13 17 12.9 16 13.4 15.6Z" fill="#c4481f" stroke="none" />
      <circle cx="15.8" cy="10" r="1.2" fill="#c4481f" stroke="none" />
      <path d="M7.6 4.9C10.2 3.2 13.8 3.2 16.4 4.9C14.6 6.5 9.4 6.5 7.6 4.9Z" fill="var(--paper)" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="9.2" />
    </>
  ),
  star: () => <polygon points={starPoints(12, 12.6, 9.6, 4.3)} fill={F('var(--energy)')} />,
  sparkle: () => (
    <>
      <path d="M10 4.6C10.7 10 12.6 11.9 18 12.6C12.6 13.3 10.7 15.2 10 20.6C9.3 15.2 7.4 13.3 2 12.6C7.4 11.9 9.3 10 10 4.6Z" fill={F('var(--energy)')} />
      <path d="M18.6 2.4C18.9 4.6 19.5 5.2 21.7 5.5C19.5 5.8 18.9 6.4 18.6 8.6C18.3 6.4 17.7 5.8 15.5 5.5C17.7 5.2 18.3 4.6 18.6 2.4Z" fill="var(--paper)" strokeWidth="1.6" />
    </>
  ),
  satellite: () => (
    <g transform="rotate(-35 12 12)">
      <path d="M7.8 12H9.2M14.8 12H16.2" />
      <rect x="1.8" y="9.4" width="6" height="5.2" rx="0.8" fill={F('var(--info)')} />
      <path d="M4.8 9.4V14.6" strokeWidth="1.4" />
      <rect x="16.2" y="9.4" width="6" height="5.2" rx="0.8" fill={F('var(--info)')} />
      <path d="M19.2 9.4V14.6" strokeWidth="1.4" />
      <rect x="9.2" y="8.6" width="5.6" height="7" rx="1.3" fill="var(--metal)" />
      <path d="M12 8.6V5.2" />
      <circle cx="12" cy="4.4" r="1.2" fill="var(--danger)" strokeWidth="1.6" />
    </g>
  ),
  rocket: () => (
    <g transform="rotate(45 12 12)">
      <path d="M9.8 16.8C9.8 19 10.9 20.6 12 21.6C13.1 20.6 14.2 19 14.2 16.8Z" fill="var(--horizon)" />
      <path d="M8 11.2L4.8 14.8V17.8L8.2 16.2Z" fill={F('var(--danger)')} />
      <path d="M16 11.2L19.2 14.8V17.8L15.8 16.2Z" fill={F('var(--danger)')} />
      <path d="M12 2.4C15.6 4.8 16.8 9.2 16.2 14.8H7.8C7.2 9.2 8.4 4.8 12 2.4Z" fill="var(--paper)" />
      <circle cx="12" cy="8.8" r="2" fill="var(--ice)" />
    </g>
  ),
  aurora: () => (
    <>
      <path d="M2.6 15.4C6 9.4 9.4 15.8 12.4 9.6C15 4.4 18.6 8.8 21.4 5.6V12.4C18.6 15.6 15.4 11.2 12.8 16.2C10 21.4 6 16 2.6 20.6Z" fill={F('var(--aurora-1)')} />
      <path d="M2.6 18C6 13 9.6 18.6 12.6 13.2" stroke="var(--aurora-2)" strokeWidth="1.6" />
    </>
  ),

  /* ---------- Space weather ---------- */
  flare: () => (
    <>
      <path d="M8.6 19C6.8 14.8 7.6 10.8 10.4 8.2C10.6 10.4 11.6 11.4 12.6 11.8C12.4 8.8 13.8 5.6 16.6 4C16 7.4 18.2 9.6 18.4 12.8C18.6 15.4 17.6 17.6 16.6 19Z" fill={F('var(--horizon)')} />
      <path d="M11.8 18.6C11 16.6 11.4 14.4 12.8 13.4C13 14.6 13.8 15 14.4 15.2C14.6 13.6 15.4 12.4 16.2 11.8C16.6 14 16.8 16.4 15.8 18.6Z" fill="var(--energy)" stroke="none" />
      <path d="M2 21.8C5.4 17.2 18.6 17.2 22 21.8Z" fill="var(--energy)" />
      <circle cx="5.4" cy="9.6" r="1" fill="var(--energy)" strokeWidth="1.5" />
      <circle cx="20.6" cy="6.6" r="0.9" fill="var(--energy)" strokeWidth="1.5" />
    </>
  ),
  cme: () => (
    <>
      <path d="M1.8 10.6H4.4M2.4 14.2H5M1.8 17.6H4.6" />
      <path d="M10.6 19H18.4A3.4 3.4 0 0 0 19 12.2A4.8 4.8 0 0 0 9.8 10.8A4.1 4.1 0 0 0 10.6 19Z" fill={F('#ff7a9c')} />
      <path d="M11.4 12.8a2.4 2.4 0 0 1 2.4-1.4" stroke="var(--paper)" strokeWidth="1.5" />
      <circle cx="13.6" cy="15.6" r="0.9" fill="var(--paper)" stroke="none" />
      <circle cx="16.8" cy="14.2" r="0.7" fill="var(--paper)" stroke="none" />
    </>
  ),
  magnet: () => (
    <>
      <path d="M4.6 3.8H9.8V12.2A2.2 2.2 0 0 0 14.2 12.2V3.8H19.4V12.2A7.4 7.4 0 0 1 4.6 12.2Z" fill={F('var(--danger)')} />
      <rect x="4.6" y="3.8" width="5.2" height="3.6" fill="var(--paper)" />
      <rect x="14.2" y="3.8" width="5.2" height="3.6" fill="var(--paper)" />
    </>
  ),
  particles: () => (
    <>
      {/* three comets flying away from the Sun (top-left): a yellow tail and a mint head */}
      <path d="M12.2 3.2L15.6 9.8L18.8 6.6Z" fill="var(--energy)" />
      <path d="M4.6 10.6L8 17.2L11.2 14Z" fill="var(--energy)" />
      <path d="M15.6 15L17.9 19.9L20.5 17.3Z" fill="var(--energy)" />
      <circle cx="17.2" cy="8.2" r="2.4" fill={F('var(--aurora-1)')} />
      <circle cx="9.6" cy="15.6" r="2.4" fill={F('var(--aurora-1)')} />
      <circle cx="19.2" cy="18.6" r="1.9" fill={F('var(--aurora-1)')} />
    </>
  ),
  radiation: () => (
    <>
      <circle cx="12" cy="12" r="9.4" fill={F('var(--energy)')} />
      <path d={sector(12, 12, 3, 7.9, -180, -120)} fill="var(--ink)" stroke="none" />
      <path d={sector(12, 12, 3, 7.9, -60, 0)} fill="var(--ink)" stroke="none" />
      <path d={sector(12, 12, 3, 7.9, 60, 120)} fill="var(--ink)" stroke="none" />
      <circle cx="12" cy="12" r="1.7" fill="var(--ink)" stroke="none" />
    </>
  ),
  live: () => (
    <>
      <path d="M7.4 7.4A6.6 6.6 0 0 0 7.4 16.6M16.6 7.4A6.6 6.6 0 0 1 16.6 16.6M4.6 4.6A10.4 10.4 0 0 0 4.6 19.4M19.4 4.6A10.4 10.4 0 0 1 19.4 19.4" />
      <circle cx="12" cy="12" r="3.2" fill={F('var(--tag-live)')} />
    </>
  ),

  /* ---------- Resources and health ---------- */
  heart: () => (
    <>
      <path d={HEART} fill={F('var(--heart)')} />
      <path d="M6 8.6a2.2 2.2 0 0 1 1.8-2.1" stroke="var(--paper)" strokeWidth="1.6" />
    </>
  ),
  'heart-broken': () => (
    <>
      <path d={HEART} fill={F('#ff9db4')} />
      <path d="M12 6.5L10.2 10.3L13.4 12.7L11.2 17" />
    </>
  ),
  bolt: () => <path d="M13.6 2.3L4.6 13.4H11.2L9.8 21.7L19.4 9.9H12.9Z" fill={F('var(--energy)')} />,
  battery: () => (
    <>
      <rect x="19.6" y="9.6" width="2.4" height="4.8" rx="1" fill="var(--ink)" stroke="none" />
      <rect x="2.4" y="6.8" width="17.2" height="10.4" rx="2.6" fill="var(--paper)" />
      <rect x="4.8" y="9.2" width="3.4" height="5.6" rx="0.8" fill={F('var(--stamina)')} stroke="none" />
      <rect x="9.3" y="9.2" width="3.4" height="5.6" rx="0.8" fill={F('var(--stamina)')} stroke="none" />
      <rect x="13.8" y="9.2" width="3.4" height="5.6" rx="0.8" fill={F('var(--stamina)')} stroke="none" />
    </>
  ),
  stamina: () => (
    <>
      <rect x="5" y="10.6" width="14" height="2.8" rx="1.2" fill="var(--metal)" />
      <rect x="1.6" y="8.8" width="2.8" height="6.4" rx="1.1" fill={F('var(--stamina)')} />
      <rect x="19.6" y="8.8" width="2.8" height="6.4" rx="1.1" fill={F('var(--stamina)')} />
      <rect x="4.2" y="6.2" width="3.6" height="11.6" rx="1.6" fill={F('var(--stamina)')} />
      <rect x="16.2" y="6.2" width="3.6" height="11.6" rx="1.6" fill={F('var(--stamina)')} />
    </>
  ),
  food: () => (
    <>
      <path d="M8 2.8C7 4.3 9 5.3 8 6.8M12 2.2C11 3.7 13 4.7 12 6.2M16 2.8C15 4.3 17 5.3 16 6.8" strokeWidth="1.6" />
      <path d="M5.6 11.6C6.6 9 9.8 8.6 12 9.6C14.2 8.6 17.4 9 18.4 11.6Z" fill="var(--farm)" />
      <path d="M3 11.6H21C21 16.5 17 20.6 12 20.6C7 20.6 3 16.5 3 11.6Z" fill={F('var(--food)')} />
      <path d="M5.8 13.8C6.4 15.6 7.8 17 9.6 17.8" stroke="var(--paper)" strokeWidth="1.5" />
    </>
  ),
  ice: () => (
    <>
      <path d="M12 2.8L20.2 7.3V16.7L12 21.2L3.8 16.7V7.3Z" fill={F('var(--ice)')} />
      <path d="M12 11.8L20.2 7.3V16.7L12 21.2Z" fill="#3fb3e2" stroke="none" />
      <path d="M12 2.8L20.2 7.3L12 11.8L3.8 7.3Z" fill="#d9f6ff" />
      <path d="M12 11.8V21.2M12 2.8L20.2 7.3V16.7L12 21.2L3.8 16.7V7.3Z" />
      <path d="M6.4 10.6V13.4" stroke="var(--paper)" strokeWidth="1.5" />
    </>
  ),
  drop: () => (
    <>
      <path d="M12 2.8C15.6 7.4 18.4 10.8 18.4 14.4A6.4 6.4 0 0 1 5.6 14.4C5.6 10.8 8.4 7.4 12 2.8Z" fill={F('var(--ice)')} />
      <path d="M8.6 14.4a3.4 3.4 0 0 0 1.9 3.1" stroke="var(--paper)" strokeWidth="1.6" />
    </>
  ),
  metal: () => (
    <>
      <path d="M7.2 3.7H16.8L21.6 12L16.8 20.3H7.2L2.4 12Z" fill={F('var(--metal)')} />
      <circle cx="12" cy="12" r="3.6" fill="var(--moon-shadow)" />
      <path d="M5.4 11.2L7.6 7" stroke="var(--paper)" strokeWidth="1.5" />
    </>
  ),
  rock: () => (
    <>
      <path d="M4.2 16.8L3 11.6L7.2 6.4L13.4 4.6L19.4 7.8L21.2 13.8L17.6 19.2L9 19.8Z" fill={F('var(--sample)')} />
      <path d="M3.4 11.4L7.2 6.6L13.2 4.9L10.2 11.4Z" fill="#ecc193" stroke="none" />
      <path d="M7.2 6.4L10.2 11.6L21.2 13.8M10.2 11.6L9 19.8" strokeWidth="1.5" />
      <path d="M4.2 16.8L3 11.6L7.2 6.4L13.4 4.6L19.4 7.8L21.2 13.8L17.6 19.2L9 19.8Z" />
    </>
  ),
  science: () => (
    <>
      <path d="M10.2 3V9.2L4.6 18.4C3.8 19.8 4.8 21.2 6.4 21.2H17.6C19.2 21.2 20.2 19.8 19.4 18.4L13.8 9.2V3Z" fill="var(--paper)" />
      <path d="M7.1 14.2H16.9L19.4 18.4C20.2 19.8 19.2 21.2 17.6 21.2H6.4C4.8 21.2 3.8 19.8 4.6 18.4Z" fill={F('var(--science)')} stroke="none" />
      <path d="M10.2 3V9.2L4.6 18.4C3.8 19.8 4.8 21.2 6.4 21.2H17.6C19.2 21.2 20.2 19.8 19.4 18.4L13.8 9.2V3M8.8 3H15.2M7.1 14.2H16.9" />
      <circle cx="10.4" cy="17.6" r="1" fill="var(--paper)" stroke="none" />
      <circle cx="13.6" cy="16.4" r="0.7" fill="var(--paper)" stroke="none" />
    </>
  ),

  /* ---------- Base modules ---------- */
  'life-support': () => (
    <>
      <circle cx="12" cy="12" r="9.2" fill={F('var(--life)')} />
      <Line d="M4.9 12.4H8.6L10.2 8.4L13 16.2L14.6 12.4H19.1" color="var(--paper)" w={1.9} />
    </>
  ),
  farm: () => (
    <>
      <path d="M4.5 21C6.4 17.6 17.6 17.6 19.5 21Z" fill="var(--sample)" />
      <path d="M12 19.6V11.4" />
      <path d="M12 13.8C6.6 14.2 3.8 10.8 3.8 6.8C8.4 6.6 11.6 9.2 12 13.8Z" fill={F('var(--farm)')} />
      <path d="M12 11.4C12.2 6.6 15.4 3.4 20.4 3.4C20.4 8.2 17 11.4 12 11.4Z" fill={F('var(--farm)')} />
    </>
  ),
  antenna: () => (
    <>
      <path d="M8.6 18.2L7.2 21.6M4.4 21.6H10.2" />
      <path d="M3.6 10.4C3.6 16.1 8 20.6 13.8 20.6Z" fill={F('var(--antenna)')} />
      <path d="M8.7 15.5L13 11.2" />
      <circle cx="13.7" cy="10.5" r="1.6" fill="var(--energy)" />
      <path d="M16.1 6.4A4.6 4.6 0 0 1 17.8 8.1M17.2 3A8 8 0 0 1 21 6.8" />
    </>
  ),
  shield: () => (
    <>
      <path d={SHIELD} fill={F('var(--shield)')} />
      <path d="M12 2.6V21.4C7.4 19.8 4.2 16.4 4.2 11.6V5.6Z" fill="#a8ecff" stroke="none" />
      <path d={SHIELD} />
      <polygon points={starPoints(12, 12, 3.6, 1.6)} fill="var(--paper)" strokeWidth="1.5" />
    </>
  ),
  bed: () => (
    <>
      <path d="M20.2 16.8V19.6" />
      <rect x="2.6" y="12.2" width="18.8" height="4.6" rx="1.4" fill="var(--paper)" />
      <rect x="10.2" y="10.8" width="11.2" height="6" rx="1.6" fill={F('var(--bed)')} />
      <ellipse cx="8" cy="11.2" rx="2.3" ry="1.5" fill="var(--paper)" />
      <rect x="2.6" y="6.6" width="3.2" height="13" rx="1.3" fill={F('var(--bed)')} />
    </>
  ),
  rover: () => (
    <>
      <path d="M15.4 8.4V5.2" />
      <rect x="13.2" y="2.8" width="4.6" height="2.6" rx="1.1" fill="var(--paper)" />
      <rect x="3.4" y="8.4" width="16.2" height="7.2" rx="2.4" fill={F('var(--rover)')} />
      <rect x="5.6" y="10.2" width="4.4" height="3" rx="0.9" fill="var(--ice)" strokeWidth="1.6" />
      <circle cx="6.6" cy="17.8" r="2.4" fill="var(--ink-2)" />
      <circle cx="11.6" cy="17.8" r="2.4" fill="var(--ink-2)" />
      <circle cx="16.6" cy="17.8" r="2.4" fill="var(--ink-2)" />
    </>
  ),
  'solar-panel': () => (
    <>
      <path d="M13.4 15.6V20.4M9.4 20.4H17.4" />
      <path d="M3.4 6.4H17.4L20.6 15.6H6.6Z" fill={F('var(--life)')} />
      <path d="M10.4 6.4L13.6 15.6M5 11H19" stroke="var(--paper)" strokeWidth="1.3" />
      <path d="M3.4 6.4H17.4L20.6 15.6H6.6Z" />
    </>
  ),
  plug: () => (
    <>
      <path d="M12 16C12 19.4 8.4 18.6 7 21.6" />
      <Line d="M9.6 8.2V4" color="var(--metal)" w={1.6} />
      <Line d="M14.4 8.2V4" color="var(--metal)" w={1.6} />
      <rect x="7" y="8" width="10" height="8" rx="2.4" fill={F('var(--shield)')} />
    </>
  ),
  broom: () => (
    <g transform="rotate(30 12 12)">
      <Line d="M12 2.2V10.6" color="var(--sample)" w={2} />
      <path d="M9.2 13H14.8L17.4 21.4H6.6Z" fill={F('var(--energy)')} />
      <path d="M10.6 15.6L9.8 21M12 15.6V21M13.4 15.6L14.2 21" strokeWidth="1.3" />
      <rect x="9.4" y="10.4" width="5.2" height="2.6" rx="0.8" fill="var(--danger)" />
    </g>
  ),
  wrench: () => (
    <g transform="rotate(45 12 12)">
      <path d="M9.6 9.6C6.8 8.6 5.6 5.2 7.2 2.4L9.6 4.8Q12 7.4 14.4 4.8L16.8 2.4C18.4 5.2 17.2 8.6 14.4 9.6V19.6A2.4 2.4 0 0 1 9.6 19.6Z" fill={F('var(--metal)')} />
      <circle cx="12" cy="18.6" r="1" fill="var(--ink-2)" stroke="none" />
    </g>
  ),
  astronaut: () => (
    <>
      <path d="M6.6 18C9.4 20.4 14.6 20.4 17.4 18L18.2 21.6H5.8Z" fill={F('var(--rover)')} />
      <circle cx="12" cy="11" r="8.2" fill="var(--paper)" />
      <rect x="6.4" y="7.4" width="11.2" height="7.4" rx="3.7" fill="var(--sky-mid)" />
      <path d="M8.6 9.8q.8-.8 2-.9" stroke="var(--paper)" strokeWidth="1.4" />
    </>
  ),
  robot: () => (
    <>
      <path d="M12 7.6V4.8" />
      <circle cx="12" cy="3.8" r="1.5" fill="var(--danger)" strokeWidth="1.6" />
      <rect x="2.4" y="11.4" width="2.4" height="4.4" rx="1" fill="var(--metal)" />
      <rect x="19.2" y="11.4" width="2.4" height="4.4" rx="1" fill="var(--metal)" />
      <rect x="4.4" y="7.6" width="15.2" height="12.2" rx="3.4" fill={F('var(--aurora-1)')} />
      <rect x="6.8" y="10" width="10.4" height="7" rx="2" fill="var(--sky-mid)" />
      <circle cx="9.8" cy="13.1" r="1.3" fill="var(--aurora-1)" stroke="none" />
      <circle cx="14.2" cy="13.1" r="1.3" fill="var(--aurora-1)" stroke="none" />
      <path d="M10.7 15.3q1.3.8 2.6 0" stroke="var(--aurora-1)" strokeWidth="1.3" />
    </>
  ),

  /* ---------- Learning and data ---------- */
  book: () => (
    <>
      <path d="M6.8 3H18.2A1.4 1.4 0 0 1 19.6 4.4V19.6A1.4 1.4 0 0 1 18.2 21H6.8A2.4 2.4 0 0 1 4.4 18.6V5.4A2.4 2.4 0 0 1 6.8 3Z" fill={F('var(--science)')} />
      <path d="M4.4 18.6A2.4 2.4 0 0 1 6.8 16.2H19.6V21H6.8A2.4 2.4 0 0 1 4.4 18.6Z" fill="var(--paper)" />
      <path d="M14.6 3V9.4L16.2 8.1L17.8 9.4V3" fill="var(--heart)" strokeWidth="1.6" />
      <polygon points={starPoints(10.2, 9.8, 3.4, 1.5)} fill="var(--energy)" strokeWidth="1.5" />
    </>
  ),
  info: () => (
    <>
      <circle cx="12" cy="12" r="9.2" fill={F('var(--info)')} />
      <Line d="M12 11.2V16.8" color="var(--paper)" w={2} />
      <circle cx="12" cy="7.4" r="1.6" fill="var(--paper)" strokeWidth="1.6" />
    </>
  ),
  help: () => (
    <>
      <circle cx="12" cy="12" r="9.2" fill={F('var(--science)')} />
      <Line d="M9.4 9.4A2.6 2.6 0 1 1 13.2 11.7C12.4 12.1 12 12.7 12 13.6" color="var(--paper)" w={2} />
      <circle cx="12" cy="17" r="1.4" fill="var(--paper)" strokeWidth="1.6" />
    </>
  ),
  data: () => (
    <>
      <path d="M2.4 20.6H21.6" />
      <rect x="3.6" y="12.4" width="4.2" height="8.2" rx="1" fill={F('var(--info)')} />
      <rect x="9.9" y="6.4" width="4.2" height="14.2" rx="1" fill="var(--energy)" />
      <rect x="16.2" y="9.6" width="4.2" height="11" rx="1" fill="var(--farm)" />
    </>
  ),
  calculator: () => (
    <>
      <rect x="5" y="2.8" width="14" height="18.4" rx="2.6" fill={F('var(--tag-calc)')} />
      <rect x="7.4" y="5.2" width="9.2" height="4" rx="1" fill="var(--paper)" strokeWidth="1.6" />
      {[8.6, 12, 15.4].map((x) => [12.4, 15.8].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill="var(--paper)" stroke="none" />))}
    </>
  ),
  dice: () => (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4" fill={F('var(--tag-sim)')} />
      {[
        [8, 8],
        [16, 8],
        [12, 12],
        [8, 16],
        [16, 16]
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" fill="var(--paper)" stroke="none" />
      ))}
    </>
  ),
  gamepad: () => (
    <>
      <path d="M7.2 7.4H16.8C19.6 7.4 21.4 10 21.6 13.4C21.8 16.4 20.6 18.6 18.6 18.6C17 18.6 16 17 15 15.6H9C8 17 7 18.6 5.4 18.6C3.4 18.6 2.2 16.4 2.4 13.4C2.6 10 4.4 7.4 7.2 7.4Z" fill={F('#b3a6d6')} />
      <path d="M7.4 10.6V14.2M5.6 12.4H9.2" strokeWidth="1.8" />
      <circle cx="15.6" cy="11.2" r="1.2" fill="var(--danger)" strokeWidth="1.4" />
      <circle cx="17.8" cy="13.4" r="1.2" fill="var(--energy)" strokeWidth="1.4" />
    </>
  ),
  archive: () => (
    <>
      <path d="M4.4 9.4H19.6V19.4A1.6 1.6 0 0 1 18 21H6A1.6 1.6 0 0 1 4.4 19.4Z" fill={F('var(--tag-archive)')} />
      <rect x="3" y="5" width="18" height="4.4" rx="1.2" fill="#ffd56b" />
      <rect x="9.4" y="12" width="5.2" height="2.4" rx="1.1" fill="var(--paper)" strokeWidth="1.6" />
    </>
  ),
  camera: () => (
    <>
      <path d="M8.4 7.2L9.8 4.6H14.2L15.6 7.2" fill={N} />
      <rect x="2.8" y="7" width="18.4" height="13" rx="2.8" fill={N} />
      <circle cx="12" cy="13.4" r="4" fill={F('var(--ice)')} />
      <circle cx="12" cy="13.4" r="1.8" fill="var(--sky-mid)" stroke="none" />
      <rect x="16.8" y="9" width="2.2" height="1.6" rx="0.5" fill="var(--energy)" stroke="none" />
    </>
  ),
  eye: () => (
    <>
      <path d="M2.4 12C5 7.4 8.4 5.4 12 5.4C15.6 5.4 19 7.4 21.6 12C19 16.6 15.6 18.6 12 18.6C8.4 18.6 5 16.6 2.4 12Z" fill="var(--paper)" />
      <circle cx="12" cy="12" r="3.8" fill={F('var(--info)')} />
      <circle cx="12" cy="12" r="1.6" fill="var(--ink)" stroke="none" />
      <circle cx="13.2" cy="10.8" r="0.8" fill="var(--paper)" stroke="none" />
    </>
  ),
  target: () => (
    <>
      <circle cx="12" cy="12" r="9.2" fill="var(--paper)" />
      <circle cx="12" cy="12" r="6" fill={F('var(--danger)')} />
      <circle cx="12" cy="12" r="2.6" fill="var(--paper)" />
    </>
  ),
  trophy: () => (
    <>
      <path d="M7 5.4H4.6V7.2A3.4 3.4 0 0 0 8 10.6M17 5.4H19.4V7.2A3.4 3.4 0 0 1 16 10.6" />
      <rect x="10.6" y="13.4" width="2.8" height="3.6" fill={F('var(--energy)')} />
      <path d="M7 3.4H17V8.8A5 5 0 0 1 7 8.8Z" fill={F('var(--energy)')} />
      <rect x="7" y="16.8" width="10" height="4" rx="1.4" fill="var(--sample)" />
      <polygon points={starPoints(12, 8.2, 2.6, 1.1)} fill="var(--paper)" stroke="none" />
    </>
  ),
  pin: () => (
    <>
      <path d="M12 21.6C7.4 16.6 5.2 13.4 5.2 9.6A6.8 6.8 0 0 1 18.8 9.6C18.8 13.4 16.6 16.6 12 21.6Z" fill={F('var(--danger)')} />
      <circle cx="12" cy="9.6" r="2.6" fill="var(--paper)" />
    </>
  ),
  calendar: () => (
    <>
      <rect x="3.4" y="4.8" width="17.2" height="16" rx="2.6" fill={N} />
      <path d="M3.4 7.4A2.6 2.6 0 0 1 6 4.8H18A2.6 2.6 0 0 1 20.6 7.4V9.8H3.4Z" fill={F('var(--danger)')} />
      <path d="M8 2.8V6.6M16 2.8V6.6" />
      {[
        [6.6, 12.4],
        [10.6, 12.4],
        [14.6, 12.4],
        [6.6, 16.2],
        [10.6, 16.2]
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="2.8" height="2.4" rx="0.6" fill="var(--ink-3)" stroke="none" />
      ))}
      <rect x="14.6" y="16.2" width="2.8" height="2.4" rx="0.6" fill="var(--energy)" stroke="var(--ink)" strokeWidth="1.2" />
    </>
  ),
  clock: () => (
    <>
      <circle cx="12" cy="12" r="9.2" fill={N} />
      {[
        [12, 5],
        [19, 12],
        [12, 19],
        [5, 12]
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="var(--ink)" stroke="none" />
      ))}
      <path d="M12 7.4V12L15.4 14.2" strokeWidth="2.2" />
    </>
  ),
  sunrise: () => (
    <>
      {[-150, -120, -90, -60, -30].map((a) => {
        const [x1, y1] = polar(12, 17.6, 7.4, a);
        const [x2, y2] = polar(12, 17.6, 9.8, a);
        return <path key={a} d={`M${x1} ${y1}L${x2} ${y2}`} />;
      })}
      <path d="M6.4 17.6A5.6 5.6 0 0 1 17.6 17.6Z" fill={F('var(--energy)')} />
      <path d="M2.4 17.6H21.6V20.6A0.8 0.8 0 0 1 20.8 21.4H3.2A0.8 0.8 0 0 1 2.4 20.6Z" fill="var(--moon)" />
    </>
  ),

  /* ---------- Controls ---------- */
  play: () => <path d="M8.2 4.8L19.4 12L8.2 19.2Z" fill={F(N)} />,
  pause: () => (
    <>
      <rect x="5.8" y="4.8" width="4.4" height="14.4" rx="1.6" fill={F(N)} />
      <rect x="13.8" y="4.8" width="4.4" height="14.4" rx="1.6" fill={F(N)} />
    </>
  ),
  home: () => (
    <>
      <path d="M5.4 10L12 4.4L18.6 10V19.8A1.2 1.2 0 0 1 17.4 21H6.6A1.2 1.2 0 0 1 5.4 19.8Z" fill={F(N)} />
      <rect x="10" y="14.4" width="4" height="6.6" rx="1" fill="var(--rover)" />
      <Line d="M3 11.6L12 3.6L21 11.6" color="var(--danger)" w={2} />
    </>
  ),
  settings: () => <path d={gear(12, 12, 10, 7.6, 8, 3.2)} fill={F(N)} fillRule="evenodd" />,
  'sound-on': () => (
    <>
      <path d="M3.8 9.4H7.4L12 5.4V18.6L7.4 14.6H3.8A0.8 0.8 0 0 1 3 13.8V10.2A0.8 0.8 0 0 1 3.8 9.4Z" fill={F(N)} />
      <path d="M15.4 9.2A4 4 0 0 1 15.4 14.8M17.8 6.6A7.6 7.6 0 0 1 17.8 17.4" />
    </>
  ),
  'sound-off': () => (
    <>
      <path d="M3.8 9.4H7.4L12 5.4V18.6L7.4 14.6H3.8A0.8 0.8 0 0 1 3 13.8V10.2A0.8 0.8 0 0 1 3.8 9.4Z" fill={F(N)} />
      <path d="M15.4 9.4L20.6 14.6M20.6 9.4L15.4 14.6" strokeWidth="2.2" />
    </>
  ),
  globe: () => (
    <>
      <circle cx="12" cy="12" r="9.2" fill={F('var(--ice)')} />
      <ellipse cx="12" cy="12" rx="4" ry="9.2" strokeWidth="1.6" />
      <path d="M2.8 12H21.2M4.4 7.4H19.6M4.4 16.6H19.6" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="9.2" />
    </>
  ),
  close: () => <path d={PLUS} transform="rotate(45 12 12)" fill={F(N)} />,
  plus: () => <path d={PLUS} fill={F(N)} />,
  minus: () => <rect x="3.6" y="9.8" width="16.8" height="4.4" rx="1.4" fill={F(N)} />,
  check: () => <Line d="M4.4 12.6L9.6 17.6L19.8 6.6" color={F('var(--ok)')} w={3} />,
  menu: () => (
    <>
      <Line d="M4.4 6.6H19.6" w={2.2} />
      <Line d="M4.4 12H19.6" w={2.2} />
      <Line d="M4.4 17.4H19.6" w={2.2} />
    </>
  ),
  lock: () => (
    <>
      <Line d="M8 10.4V7.6A4 4 0 0 1 16 7.6V10.4" color="var(--metal)" w={2.2} />
      <rect x="4.6" y="10.4" width="14.8" height="10.6" rx="2.6" fill={F('var(--energy)')} />
      <circle cx="12" cy="14.8" r="1.5" fill="var(--ink)" stroke="none" />
      <path d="M12 15.4V17.8" />
    </>
  ),
  'arrow-right': () => <path d={ARROW_RIGHT} fill={F(N)} />,
  'arrow-left': () => <path d={ARROW_RIGHT} transform="rotate(180 12 12)" fill={F(N)} />,
  'arrow-up': () => <path d={ARROW_RIGHT} transform="rotate(-90 12 12)" fill={F(N)} />,
  'arrow-down': () => <path d={ARROW_RIGHT} transform="rotate(90 12 12)" fill={F(N)} />,
  refresh: () => (
    <>
      <Line d="M19.2 13A7.3 7.3 0 1 1 16.4 6.2" w={2.4} />
      <path d="M18.7 3.9L19.9 8.9L14.9 9.1Z" fill={F(N)} />
    </>
  ),
  'link-out': () => (
    <>
      <rect x="3.4" y="6" width="14.6" height="14.6" rx="2.2" fill={N} />
      <Line d="M10.6 13.4L19.8 4.2M14 4H20V10" color={F('var(--info)')} w={2.2} />
    </>
  ),
  hand: () => (
    <>
      <path d="M5.2 4.4L6.6 5.6M16 5.6L17.4 4.4M10.8 1.8V3.2" strokeWidth="1.6" />
      <path d="M9.2 12.8V6.4A1.8 1.8 0 0 1 12.8 6.4V11A1.7 1.7 0 0 1 16.2 11.4A1.7 1.7 0 0 1 19.4 12.4V15.6C19.4 19 17 21.4 13.8 21.4H12.6C10.8 21.4 9.4 20.6 8.4 19.2L5.2 14.8A1.8 1.8 0 0 1 8 12.6Z" fill={F('#ffd7a8')} />
      <path d="M12.8 11V13.2M16.2 11.4V13.4" strokeWidth="1.5" />
    </>
  ),
  keyboard: () => (
    <>
      <rect x="2" y="6.4" width="20" height="11.6" rx="2.6" fill={F(N)} />
      {[4.4, 7.6, 10.8, 14, 17.2].map((x) => (
        <rect key={`a${x}`} x={x} y="8.8" width="2.4" height="2" rx="0.5" fill="var(--ink-3)" stroke="none" />
      ))}
      {[5.6, 8.8, 12, 15.2].map((x) => (
        <rect key={`b${x}`} x={x} y="11.8" width="2.4" height="2" rx="0.5" fill="var(--ink-3)" stroke="none" />
      ))}
      <rect x="7.4" y="14.8" width="9.2" height="1.8" rx="0.6" fill="var(--ink-3)" stroke="none" />
    </>
  ),
  trash: () => (
    <>
      <path d="M9.6 4.8V3.6A1 1 0 0 1 10.6 2.6H13.4A1 1 0 0 1 14.4 3.6V4.8" />
      <path d="M5.6 7.4H18.4L17.2 20A1.4 1.4 0 0 1 15.8 21.2H8.2A1.4 1.4 0 0 1 6.8 20Z" fill={F('var(--metal)')} />
      <rect x="3.8" y="4.8" width="16.4" height="2.6" rx="1.2" fill={F('var(--metal)')} />
      <path d="M9.8 10.4V17.6M14.2 10.4V17.6" strokeWidth="1.6" />
    </>
  ),
  warning: () => (
    <>
      <path d="M12 3.2L21.4 19.6A0.9 0.9 0 0 1 20.6 21H3.4A0.9 0.9 0 0 1 2.6 19.6Z" fill={F('var(--warn)')} />
      <path d="M12 9.2V14" strokeWidth="2.6" />
      <circle cx="12" cy="17.4" r="1.4" fill="var(--ink)" stroke="none" />
    </>
  )
};

/** Other names that point to the same drawing (module ids, old names, synonyms). */
const ALIASES = {
  lifeSupport: 'life-support',
  life: 'life-support',
  solar: 'solar-panel',
  panels: 'solar-panel',
  cables: 'plug',
  ok: 'check',
  x: 'close',
  gear: 'settings',
  volume: 'sound-on',
  mute: 'sound-off',
  journal: 'book',
  notebook: 'book',
  water: 'drop',
  sample: 'rock',
  samples: 'rock',
  research: 'science',
  health: 'heart',
  energy: 'bolt',
  power: 'bolt',
  night: 'moon',
  question: 'help',
  location: 'pin',
  back: 'arrow-left',
  next: 'arrow-right',
  prev: 'arrow-left',
  ai: 'robot',
  photo: 'camera',
  mission: 'target',
  storm: 'flare',
  sep: 'particles',
  kp: 'magnet'
};

/** Every drawable icon name (aliases not included). */
export const ICON_NAMES = Object.keys(ICONS);

/** true if `name` is an icon (or an alias of one). */
export function hasIcon(name) {
  return typeof name === 'string' && (name in ICONS || name in ALIASES);
}

const warned = new Set();
function Fallback() {
  return (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4.4" fill="var(--paper-3)" strokeDasharray="3 3" />
      <circle cx="12" cy="12" r="1.8" fill="var(--ink-3)" stroke="none" />
    </>
  );
}

export default function Icon({ name, size = '1.25em', title, color, className = '', style, ...rest }) {
  const key = typeof name === 'string' ? ALIASES[name] || name : '';
  const draw = Object.prototype.hasOwnProperty.call(ICONS, key) ? ICONS[key] : Fallback;
  if (draw === Fallback && import.meta.env?.DEV && !warned.has(String(name))) {
    warned.add(String(name));
    console.warn(`[Icon] unknown icon name: ${String(name)}`);
  }
  const css = color ? { '--icon-color': color, ...style } : style;
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': 'true', focusable: 'false' };
  return (
    <svg
      className={`icon${key ? ` icon-${key}` : ''}${className ? ` ${className}` : ''}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={S}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={css}
      {...a11y}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {draw()}
    </svg>
  );
}
