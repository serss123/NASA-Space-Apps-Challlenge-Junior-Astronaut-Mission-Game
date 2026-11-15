// Dibujo de la base lunar vista desde arriba (SVG, diseño original). Solo recibe el estado visual que cambia.
import { memo } from 'react';
import { CORRIDORS, MODULES, WORLD } from './layout.js';

const SHADOW = { dx: -16, dy: 12 }; // el Sol del polo sur está muy bajo: sombras largas

// Cráteres y rocas fijos (el terreno no cambia entre partidas).
const CRATERS = [
  [70, 70, 34], [330, 60, 22], [660, 60, 28], [960, 250, 30], [940, 470, 22], [70, 520, 40], [150, 610, 18],
  [480, 600, 26], [860, 600, 34], [600, 190, 14], [380, 190, 12], [240, 120, 16], [960, 600, 16], [30, 300, 18]
];
const ROCKS = [
  [120, 160, 7], [290, 420, 5], [610, 410, 5], [930, 180, 8], [720, 170, 6], [40, 420, 7], [520, 520, 5], [880, 410, 6],
  [410, 610, 6], [170, 470, 5], [980, 340, 5], [650, 620, 7]
];

function ModuleBody({ m }) {
  const s = m.shape;
  if (s.kind === 'circle') return <circle cx={s.cx} cy={s.cy} r={s.r} />;
  return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} />;
}

function BaseArt({ night, crops = 0, farmPowered, shieldCharge = 0, shieldMax = 1, cablesBroken, panelsDirty, antennaLinked, antennaBroken, roverOut }) {
  const m = Object.fromEntries(MODULES.map((x) => [x.id, x]));
  return (
    <svg className="base-art" viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id="crater-g" cx="60%" cy="40%" r="65%">
          <stop offset="0" stopColor="#2a2e3a" />
          <stop offset="0.7" stopColor="#4a4f5f" />
          <stop offset="1" stopColor="#6b7184" />
        </radialGradient>
        <radialGradient id="dome-g" cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor="#3a4880" />
          <stop offset="1" stopColor="#1a2246" />
        </radialGradient>
        <pattern id="floor-p" width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill="#222c56" />
          <path d="M0 0H22V22" fill="none" stroke="#2f3b70" strokeWidth="1.4" />
          <circle cx="3" cy="3" r="1" fill="#3c4a86" />
        </pattern>
        <pattern id="hex-p" width="24" height="21" patternUnits="userSpaceOnUse">
          <path d="M6 0h12l6 10.5-6 10.5H6L0 10.5z" fill="none" stroke="rgba(177,140,255,.35)" strokeWidth="1.3" />
        </pattern>
        <pattern id="panel-p" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#1d4fa8" />
          <path d="M0 0H14V14" fill="none" stroke="#7fb4ff" strokeWidth="0.9" />
        </pattern>
        <radialGradient id="core-g" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#e6f6ff" />
          <stop offset="0.4" stopColor="#5ab0ff" />
          <stop offset="1" stopColor="rgba(90,176,255,0)" />
        </radialGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Terreno: cráteres y rocas con sombra alargada */}
      <g className="terrain">
        {CRATERS.map(([x, y, r], i) => (
          <g key={`c${i}`}>
            <ellipse cx={x} cy={y} rx={r} ry={r * 0.82} fill="url(#crater-g)" opacity="0.85" />
            <ellipse cx={x + r * 0.22} cy={y - r * 0.2} rx={r * 0.9} ry={r * 0.68} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="2" />
          </g>
        ))}
        {ROCKS.map(([x, y, r], i) => (
          <g key={`r${i}`}>
            <ellipse cx={x + SHADOW.dx * 0.6} cy={y + SHADOW.dy * 0.6} rx={r * 2.4} ry={r * 0.8} fill="rgba(0,0,0,.35)" />
            <circle cx={x} cy={y} r={r} fill="#8a8f9e" />
            <circle cx={x + r * 0.3} cy={y - r * 0.3} r={r * 0.45} fill="#b5bac6" />
          </g>
        ))}
        {/* Huellas del Rover hacia el exterior */}
        <path d="M790 540 C 860 540, 900 500, 1000 470" stroke="rgba(30,32,40,.55)" strokeWidth="9" fill="none" strokeDasharray="3 7" />
        <path d="M790 556 C 870 556, 910 520, 1000 488" stroke="rgba(30,32,40,.55)" strokeWidth="9" fill="none" strokeDasharray="3 7" />
        {/* Plataforma de aterrizaje */}
        <g transform="translate(120 560)">
          <circle r="44" fill="#565c6e" stroke="#7a8094" strokeWidth="4" />
          <circle r="30" fill="none" stroke="#ffc83d" strokeWidth="3" strokeDasharray="10 8" />
          <path d="M-12 -12 L12 12 M12 -12 L-12 12" stroke="#ffc83d" strokeWidth="5" strokeLinecap="round" />
        </g>
      </g>

      {/* Sombras de la base */}
      <g className="base-shadow" transform={`translate(${SHADOW.dx} ${SHADOW.dy})`} fill="rgba(0,0,0,.42)" filter="url(#soft)">
        {MODULES.filter((x) => !x.outdoor).map((x) => (
          <ModuleBody key={x.id} m={x} />
        ))}
        {CORRIDORS.filter((c) => !c.outdoor).map((c) => (
          <line key={c.id} x1={c.a[0]} y1={c.a[1]} x2={c.b[0]} y2={c.b[1]} stroke="rgba(0,0,0,.42)" strokeWidth={c.r * 2} strokeLinecap="round" />
        ))}
      </g>

      {/* Camino exterior a los paneles solares (huellas en el regolito) */}
      {CORRIDORS.filter((c) => c.outdoor).map((c) => (
        <g key={c.id}>
          <line x1={c.a[0]} y1={c.a[1]} x2={c.b[0]} y2={c.b[1]} stroke="rgba(255,255,255,.07)" strokeWidth={c.r * 2} strokeLinecap="round" />
          <line x1={c.a[0]} y1={c.a[1]} x2={c.b[0]} y2={c.b[1]} stroke="rgba(25,27,35,.6)" strokeWidth="6" strokeDasharray="6 9" strokeLinecap="round" />
        </g>
      ))}

      {/* Campo de paneles solares */}
      <g className={`solar-field${panelsDirty ? ' is-dirty' : ''}`}>
        <rect x={m.solar.shape.x} y={m.solar.shape.y} width={m.solar.shape.w} height={m.solar.shape.h} rx="18" fill="rgba(255,200,61,.06)" stroke="rgba(255,200,61,.35)" strokeWidth="2" strokeDasharray="8 6" />
        {[0, 1, 2].map((col) =>
          [0, 1].map((row) => {
            const x = 786 + col * 62;
            const y = 50 + row * 50;
            return (
              <g key={`${col}-${row}`}>
                <rect x={x + SHADOW.dx * 0.5} y={y + SHADOW.dy * 0.5 + 6} width="50" height="36" fill="rgba(0,0,0,.35)" />
                <rect x={x} y={y} width="50" height="36" rx="3" fill="url(#panel-p)" stroke="#bcd6ff" strokeWidth="1.5" />
                <path d={`M${x + 4} ${y + 4} l14 0`} stroke="rgba(255,255,255,.7)" strokeWidth="2" strokeLinecap="round" />
                {panelsDirty && (
                  <g className="dust" fill="rgba(150,120,90,.85)">
                    <ellipse cx={x + 16} cy={y + 14} rx="12" ry="8" />
                    <ellipse cx={x + 34} cy={y + 24} rx="10" ry="7" />
                  </g>
                )}
              </g>
            );
          })
        )}
      </g>

      {/* Pasillos */}
      {CORRIDORS.filter((c) => !c.outdoor).map((c) => (
        <g key={c.id}>
          <line x1={c.a[0]} y1={c.a[1]} x2={c.b[0]} y2={c.b[1]} stroke="#6b78a6" strokeWidth={c.r * 2} strokeLinecap="round" />
          <line x1={c.a[0]} y1={c.a[1]} x2={c.b[0]} y2={c.b[1]} stroke="#26305c" strokeWidth={c.r * 2 - 9} strokeLinecap="round" />
          <line x1={c.a[0]} y1={c.a[1]} x2={c.b[0]} y2={c.b[1]} stroke="rgba(140,170,255,.35)" strokeWidth="2" strokeDasharray="6 8" />
        </g>
      ))}

      {/* Módulos (cúpulas) */}
      {MODULES.filter((x) => !x.outdoor).map((x) => (
        <g key={x.id} className={`module-art module-${x.id}`} style={{ '--mcolor': x.color }}>
          <g fill="#7c89b8">
            <ModuleBody m={x} />
          </g>
          <g transform={x.shape.kind === 'circle' ? `translate(${x.shape.cx} ${x.shape.cy}) scale(.9) translate(${-x.shape.cx} ${-x.shape.cy})` : undefined}>
            {x.shape.kind === 'circle' ? (
              <circle cx={x.shape.cx} cy={x.shape.cy} r={x.shape.r} fill="url(#floor-p)" stroke={x.color} strokeWidth="4" />
            ) : (
              <rect x={x.shape.x + 7} y={x.shape.y + 7} width={x.shape.w - 14} height={x.shape.h - 14} rx={x.shape.rx - 6} fill="url(#floor-p)" stroke={x.color} strokeWidth="4" />
            )}
          </g>
        </g>
      ))}

      {/* Interior: Soporte Vital (núcleo de energía y depósitos) */}
      <g className="core">
        <circle cx="500" cy="320" r="40" fill="url(#core-g)" className="core-glow" />
        <circle cx="500" cy="320" r="22" fill="#0e1838" stroke="#9fd4ff" strokeWidth="4" />
        <circle cx="500" cy="320" r="10" fill="#bfe6ff" className="core-heart" />
        {[[445, 280, '#6fd3ff', 'H₂O'], [555, 280, '#3ee6a0', 'O₂'], [500, 375, '#ffa94d', '🍽']].map(([x, y, c, label]) => (
          <g key={label}>
            <rect x={x - 15} y={y - 12} width="30" height="24" rx="7" fill="#1a2550" stroke={c} strokeWidth="2.5" />
            <text x={x} y={y + 5} textAnchor="middle" fontSize="12" fill={c} fontWeight="800">
              {label}
            </text>
          </g>
        ))}
      </g>

      {/* Interior: invernadero */}
      <g className={`farm-art${farmPowered ? ' is-powered' : ''}`}>
        <rect x="118" y="241" width="174" height="124" rx="24" fill={farmPowered ? 'rgba(200,120,255,.18)' : 'rgba(0,0,0,.15)'} />
        {[0, 1, 2].map((row) => (
          <g key={row}>
            <rect x="134" y={258 + row * 36} width="142" height="18" rx="9" fill="#5a3d24" />
            {Array.from({ length: 6 }).map((_, i) => {
              const grown = i < Math.min(6, crops * 2 + (row === 0 ? 1 : 0));
              return <circle key={i} cx={146 + i * 24} cy={267 + row * 36} r={grown ? 8 : 4} fill={grown ? '#5fd068' : '#3c7a3f'} />;
            })}
          </g>
        ))}
      </g>

      {/* Interior: refugio y generador del escudo */}
      <g className={`shield-art${cablesBroken ? ' is-broken' : ''}`}>
        <circle cx="800" cy="312" r="58" fill="url(#hex-p)" />
        {Array.from({ length: shieldMax }).map((_, i) => (
          <circle
            key={i}
            cx="800"
            cy="312"
            r={30 + i * 11}
            fill="none"
            stroke={i < shieldCharge ? '#c4a8ff' : 'rgba(155,123,255,.25)'}
            strokeWidth={i < shieldCharge ? 5 : 3}
            className={i < shieldCharge ? 'shield-ring is-on' : 'shield-ring'}
          />
        ))}
        <rect x="770" y="362" width="60" height="16" rx="5" fill="#1a1f3a" stroke={cablesBroken ? '#ff4d5e' : '#9b7bff'} strokeWidth="2.5" />
        {cablesBroken && (
          <g className="sparks" stroke="#ffd25e" strokeWidth="3" strokeLinecap="round">
            <path d="M785 360 l-6 -10 M800 358 l0 -12 M815 360 l6 -10" />
          </g>
        )}
      </g>

      {/* Interior: dormitorio */}
      <g className="bed-art">
        <rect x="262" y="494" width="92" height="56" rx="12" fill="#3a2f6b" stroke="#ff7eb6" strokeWidth="3" />
        <rect x="270" y="502" width="26" height="40" rx="8" fill="#f2f4ff" />
        <rect x="300" y="500" width="48" height="44" rx="8" fill="#ff7eb6" opacity=".8" />
        <rect x="370" y="490" width="30" height="22" rx="6" fill="#0b1230" stroke="#9fb4ff" strokeWidth="2" className="win" />
        <circle cx="384" cy="540" r="7" fill="#ffd25e" className="lamp" />
      </g>

      {/* Interior: garaje del Rover */}
      <g className="garage-art">
        <rect x="770" y="478" width="12" height="96" rx="4" fill="#ffc83d" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x="770" y={486 + i * 18} width="12" height="8" fill="#1b1b1b" />
        ))}
        {!roverOut && (
          <g transform="translate(640 500)">
            <rect x="0" y="6" width="96" height="42" rx="10" fill="#e9edf7" stroke="#3b4566" strokeWidth="3" />
            <rect x="18" y="14" width="56" height="26" rx="4" fill="url(#panel-p)" />
            {[[-6, 2], [-6, 40], [42, -2], [42, 44], [90, 2], [90, 40]].map(([x, y], i) => (
              <rect key={i} x={x} y={y} width="14" height="10" rx="4" fill="#2b3150" />
            ))}
            <circle cx="88" cy="27" r="6" fill="#ff8a3d" />
          </g>
        )}
      </g>

      {/* Antena: módulo + gran plato orientado hacia la Tierra */}
      <g className={`antenna-art${antennaLinked ? ' is-linked' : ''}${antennaBroken ? ' is-broken' : ''}`}>
        <line x1="545" y1="80" x2="600" y2="44" stroke="#9aa6c8" strokeWidth="6" />
        <g transform="translate(612 36) rotate(-30)">
          <ellipse rx="34" ry="20" fill="#dfe6f7" stroke="#3b4566" strokeWidth="3" />
          <ellipse rx="22" ry="12" fill="none" stroke="#9aa6c8" strokeWidth="2" />
          <line x1="0" y1="0" x2="0" y2="-26" stroke="#3b4566" strokeWidth="3" />
          <circle cx="0" cy="-28" r="4" fill={antennaBroken ? '#ff4d5e' : '#36c5f0'} />
        </g>
        {antennaLinked && (
          <g className="signal" fill="none" stroke="#36c5f0" strokeWidth="3" strokeLinecap="round">
            <path d="M640 10 q12 10 0 22" />
            <path d="M652 2 q18 18 0 38" />
            <path d="M664 -6 q24 26 0 54" />
          </g>
        )}
        <rect x="478" y="96" width="44" height="26" rx="6" fill="#0b1230" stroke="#36c5f0" strokeWidth="2.5" />
        <path d="M484 112 l6 -6 l6 6 l6 -9 l6 9 l6 -6" stroke="#36c5f0" strokeWidth="2" fill="none" />
      </g>

      {/* Ventanas que se encienden de noche */}
      <g className={`windows${night ? ' is-night' : ''}`}>
        {[[455, 245], [545, 245], [455, 395], [545, 395], [160, 236], [250, 236], [748, 270], [852, 270], [610, 474], [700, 474]].map(([x, y], i) => (
          <rect key={i} x={x - 7} y={y - 4} width="14" height="8" rx="3" className="win" />
        ))}
      </g>
    </svg>
  );
}

export default memo(BaseArt);
