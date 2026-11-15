// Astronauta original de "Sol a Sol" (SVG): casco redondo con visor dorado, traje blanco con detalles de color,
// panel de control en el pecho, mochila de soporte vital y antena. Anima piernas y brazos al caminar.
export default function Astronaut({ walking = false, facing = 1, color = '#ff8a3d', night = false, size = 54 }) {
  return (
    <svg
      className={`astro${walking ? ' is-walking' : ''}${night ? ' is-night' : ''}`}
      viewBox="0 0 60 72"
      width={size}
      height={size * 1.2}
      aria-hidden="true"
      style={{ transform: `scaleX(${facing < 0 ? -1 : 1})` }}
    >
      <defs>
        <radialGradient id="astro-visor" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff6c9" />
          <stop offset="0.25" stopColor="#ffd25e" />
          <stop offset="0.7" stopColor="#e08a1e" />
          <stop offset="1" stopColor="#7a3f08" />
        </radialGradient>
        <linearGradient id="astro-suit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9d3ea" />
        </linearGradient>
      </defs>
      {/* sombra en el suelo */}
      <ellipse cx="30" cy="69" rx="15" ry="3.2" fill="rgba(0,0,0,.45)" />
      {/* mochila de soporte vital (asoma por los lados) */}
      <rect x="11" y="30" width="38" height="24" rx="6" fill="#8e9ab8" stroke="#3b4566" strokeWidth="1.6" />
      {/* piernas */}
      <g className="astro-leg astro-leg-l">
        <rect x="19" y="50" width="9" height="15" rx="4" fill="url(#astro-suit)" stroke="#3b4566" strokeWidth="1.6" />
        <rect x="17.5" y="61" width="11.5" height="6" rx="3" fill="#525d80" />
      </g>
      <g className="astro-leg astro-leg-r">
        <rect x="32" y="50" width="9" height="15" rx="4" fill="url(#astro-suit)" stroke="#3b4566" strokeWidth="1.6" />
        <rect x="31" y="61" width="11.5" height="6" rx="3" fill="#525d80" />
      </g>
      {/* cuerpo */}
      <rect x="15" y="31" width="30" height="24" rx="9" fill="url(#astro-suit)" stroke="#3b4566" strokeWidth="1.8" />
      {/* brazos */}
      <g className="astro-arm astro-arm-l">
        <rect x="8" y="33" width="9" height="17" rx="4.5" fill="url(#astro-suit)" stroke="#3b4566" strokeWidth="1.6" />
        <circle cx="12.5" cy="50" r="3.6" fill={color} stroke="#3b4566" strokeWidth="1.2" />
      </g>
      <g className="astro-arm astro-arm-r">
        <rect x="43" y="33" width="9" height="17" rx="4.5" fill="url(#astro-suit)" stroke="#3b4566" strokeWidth="1.6" />
        <circle cx="47.5" cy="50" r="3.6" fill={color} stroke="#3b4566" strokeWidth="1.2" />
      </g>
      {/* panel del pecho y franja de color */}
      <rect x="22" y="38" width="16" height="10" rx="2.5" fill="#2c3554" />
      <circle cx="26" cy="43" r="1.8" fill="#3ee6a0" />
      <circle cx="30.5" cy="43" r="1.8" fill="#ffc83d" />
      <circle cx="35" cy="43" r="1.8" fill="#ff5d73" />
      <rect x="15.5" y="32.5" width="29" height="3.4" rx="1.7" fill={color} />
      {/* casco */}
      <line x1="41" y1="10" x2="45" y2="2" stroke="#3b4566" strokeWidth="1.6" />
      <circle cx="45.5" cy="2.5" r="2.2" fill={color} />
      <circle cx="30" cy="19" r="15.5" fill="url(#astro-suit)" stroke="#3b4566" strokeWidth="1.8" />
      <rect x="18" y="12" width="24" height="15" rx="7.5" fill="url(#astro-visor)" stroke="#3b4566" strokeWidth="1.4" />
      <path d="M21 16 Q25 13 30 13.5" stroke="rgba(255,255,255,.85)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="37" cy="23" r="1.4" fill="rgba(255,255,255,.6)" />
      {/* luz del casco (de noche) */}
      <circle className="astro-lamp" cx="16.5" cy="17" r="2.4" fill="#fff7c2" />
    </svg>
  );
}
