// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// The living sky behind every screen (docs/DESIGN.md section 2): deep violet space with parallax twinkling
// stars, the Sun glowing at the top-left edge, a slowly turning Earth low on the lunar horizon (from the Moon's
// south pole the Earth really hangs near the horizon) and a shooting star now and then.
// mood: 'calm' | 'storm' (warm tint + particle streaks from the Sun's side) | 'night' (darker, the Sun fades).
// Pure CSS/SVG, animating only transform and opacity; everything stops under reduced motion.
//
//   <BackdropProvider>...</BackdropProvider>   App mounts it once: it draws <SpaceBackdrop> behind the screens.
//   useBackdropMood('storm')                   a screen asks for a mood while it is mounted (the last one wins).
//   <SpaceBackdrop mood="night" />             the drawing alone (for previews).
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import './spacebackdrop.css';

const MOODS = ['calm', 'storm', 'night'];

// Hand-placed sparkle stars (percent of the viewport) and storm streaks (angle in degrees from the Sun corner).
const SPARKLES = [
  { x: 14, y: 22, s: 14, d: 0 },
  { x: 38, y: 9, s: 10, d: 1.2 },
  { x: 63, y: 18, s: 16, d: 2.1 },
  { x: 84, y: 11, s: 11, d: 0.6 },
  { x: 91, y: 38, s: 13, d: 2.8 },
  { x: 27, y: 46, s: 9, d: 1.7 },
  { x: 72, y: 52, s: 10, d: 3.3 }
];
const STREAKS = [
  { a: 18, y: 4, d: 0, t: 2.8 },
  { a: 26, y: 10, d: 0.9, t: 3.4 },
  { a: 33, y: 0, d: 1.7, t: 2.6 },
  { a: 40, y: 14, d: 0.4, t: 3.1 },
  { a: 48, y: 6, d: 2.3, t: 2.9 },
  { a: 22, y: 22, d: 1.3, t: 3.6 },
  { a: 36, y: 26, d: 2.8, t: 3.2 },
  { a: 55, y: 2, d: 0.7, t: 3.8 },
  { a: 29, y: 34, d: 2, t: 3 },
  { a: 44, y: 30, d: 3.1, t: 3.4 }
];

function Earth() {
  const clip = `ss-earth-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  // Continents drawn on a 352-unit strip and repeated, so sliding the strip looks like the Earth turning.
  const land = (dx) => (
    <g transform={`translate(${dx} 0)`}>
      <path d="M30 70C44 52 72 50 80 66C88 80 70 88 74 104C78 118 60 128 48 118C36 108 20 86 30 70Z" />
      <path d="M118 112C132 100 160 104 166 122C172 140 152 160 132 160C116 160 108 146 114 134C118 126 108 120 118 112Z" />
      <path d="M190 54C206 44 236 48 240 64C244 78 226 84 214 80C202 76 182 66 190 54Z" />
      <path d="M262 98C276 86 304 92 308 112C312 132 292 146 276 140C262 134 250 112 262 98Z" />
      <path d="M318 150C328 144 344 148 344 160C344 170 330 174 322 168C316 164 312 156 318 150Z" />
    </g>
  );
  return (
    <svg className="bd-earth" viewBox="0 0 200 200">
      <defs>
        <clipPath id={clip}>
          <circle cx="100" cy="100" r="86" />
        </clipPath>
      </defs>
      <circle cx="100" cy="100" r="97" fill="rgb(111 216 255 / 22%)" />
      <circle cx="100" cy="100" r="86" fill="#3fa7ff" />
      <g clipPath={`url(#${clip})`}>
        <g className="bd-earth-land" fill="#45cf63" stroke="#1b1036" strokeWidth="4" strokeLinejoin="round">
          {land(0)}
          {land(352)}
        </g>
        <path d="M60 46C84 40 116 40 140 46" stroke="rgb(255 255 255 / 70%)" strokeWidth="7" strokeLinecap="round" fill="none" />
        <path d="M44 150C70 158 120 160 150 150" stroke="rgb(255 255 255 / 55%)" strokeWidth="6" strokeLinecap="round" fill="none" />
        {/* night side (the Sun is at the top-left, so the shadow falls on the bottom-right) */}
        <path d="M150 18A96 96 0 0 1 120 196A120 120 0 0 0 150 18Z" fill="rgb(23 11 59 / 50%)" />
        <circle cx="100" cy="100" r="86" fill="none" stroke="rgb(23 11 59 / 35%)" strokeWidth="26" transform="translate(16 16)" />
      </g>
      <path d="M58 40A70 70 0 0 0 34 78" stroke="rgb(255 255 255 / 75%)" strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="#1b1036" strokeWidth="6" />
    </svg>
  );
}

function Horizon() {
  return (
    <svg className="bd-horizon" viewBox="0 0 1200 140" preserveAspectRatio="none">
      <path d="M0 58C120 30 210 44 320 52C430 60 520 22 650 30C780 38 860 64 980 50C1080 38 1150 30 1200 36V140H0Z" fill="#3a2766" />
      <path
        d="M0 84C140 70 240 92 380 86C520 80 600 60 760 70C900 79 1010 98 1200 80V140H0Z"
        fill="var(--moon-shadow)"
        stroke="#1b1036"
        strokeWidth="5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path d="M90 100C130 96 170 98 200 104M560 92C610 86 660 88 700 94M930 104C980 100 1030 102 1060 108" stroke="#7a6aa6" strokeWidth="4" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** The drawing alone. */
export default function SpaceBackdrop({ mood = 'calm', className = '' }) {
  const m = MOODS.includes(mood) ? mood : 'calm';
  return (
    <div className={`backdrop mood-${m}${className ? ` ${className}` : ''}`} aria-hidden="true">
      <div className="bd-sky" />
      <div className="bd-tint bd-tint-storm" />
      <div className="bd-tint bd-tint-night" />
      <div className="bd-sun">
        <div className="bd-sun-glow" />
        <div className="bd-sun-glow is-storm" />
        <div className="bd-sun-core" />
      </div>
      <div className="bd-stars is-far" />
      <div className="bd-stars is-mid" />
      <div className="bd-stars is-near" />
      <div className="bd-sparkles">
        {SPARKLES.map((s, i) => (
          <svg key={i} className="bd-sparkle" viewBox="0 0 24 24" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }}>
            <path d="M12 1C12.8 8.6 15.4 11.2 23 12C15.4 12.8 12.8 15.4 12 23C11.2 15.4 8.6 12.8 1 12C8.6 11.2 11.2 8.6 12 1Z" fill="#fff7e8" />
          </svg>
        ))}
      </div>
      <div className="bd-shooting is-1" />
      <div className="bd-shooting is-2" />
      <div className="bd-streaks">
        {STREAKS.map((s, i) => {
          const rad = (s.a * Math.PI) / 180;
          const dist = 150; // vmax
          return (
            <i
              key={i}
              className="bd-streak"
              style={{
                top: `${s.y}%`,
                '--a': `${s.a}deg`,
                '--tx': `${(Math.cos(rad) * dist).toFixed(1)}vmax`,
                '--ty': `${(Math.sin(rad) * dist).toFixed(1)}vmax`,
                animationDelay: `${s.d}s`,
                animationDuration: `${s.t}s`
              }}
            />
          );
        })}
      </div>
      <Earth />
      <Horizon />
    </div>
  );
}

const MoodContext = createContext(null);

/** Draws the backdrop once and lets screens choose its mood with useBackdropMood(). */
export function BackdropProvider({ defaultMood = 'calm', children }) {
  const requests = useRef([]); // [{ token, mood }] in mount order
  const [, bump] = useState(0);
  const set = useCallback((token, mood) => {
    const list = requests.current.filter((r) => r.token !== token);
    if (mood) list.push({ token, mood });
    requests.current = list;
    bump((n) => n + 1);
  }, []);
  const api = useMemo(() => ({ set }), [set]);
  const current = requests.current.length ? requests.current[requests.current.length - 1].mood : defaultMood;
  return (
    <MoodContext.Provider value={api}>
      <SpaceBackdrop mood={current} />
      {children}
    </MoodContext.Provider>
  );
}

/** Asks the backdrop for a mood while the calling component is mounted ('calm' | 'storm' | 'night' | null). */
export function useBackdropMood(mood) {
  const ctx = useContext(MoodContext);
  const token = useRef({});
  useEffect(() => {
    if (!ctx) return undefined;
    ctx.set(token.current, mood || null);
    return () => ctx.set(token.current, null);
  }, [ctx, mood]);
}
