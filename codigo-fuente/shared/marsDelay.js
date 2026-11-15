// Retraso de la señal (velocidad de la luz) entre la Tierra y Marte, y entre la Tierra y la Luna, para una fecha.
// Etiqueta en el juego: CALCULADO. Método: elementos orbitales medios de JPL ("Approximate Positions of the
// Planets", E. M. Standish, válido 1800–2050) y ecuación de Kepler. Error típico < 1 % en la distancia.

const AU_KM = 149597870.7;
const C_KM_S = 299792.458;
const DEG = Math.PI / 180;

// [a (UA), e, I (°), L (°), ϖ (°), Ω (°)] en J2000 y su variación por siglo.
const ELEMENTS = {
  earth: {
    base: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
    rate: [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]
  },
  mars: {
    base: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
    rate: [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]
  }
};

const julianDay = (date) => date.getTime() / 86400000 + 2440587.5;
const norm180 = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;

function heliocentric(planet, T) {
  const { base, rate } = ELEMENTS[planet];
  const [a, e, I, L, wbar, Om] = base.map((v, i) => v + rate[i] * T);
  const M = norm180(L - wbar) * DEG;
  const w = (wbar - Om) * DEG;
  const inc = I * DEG;
  const om = Om * DEG;
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 12; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(om), sO = Math.sin(om), cI = Math.cos(inc), sI = Math.sin(inc);
  return [
    (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
    (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
    sw * sI * xp + cw * sI * yp
  ];
}

/** Distancia Tierra–Marte (km) y retraso de la luz (s) para una fecha (Date o 'AAAA-MM-DD'). */
export function earthMarsLightTime(dateInput = new Date()) {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T12:00:00Z`) : dateInput;
  const T = (julianDay(date) - 2451545.0) / 36525;
  const e = heliocentric('earth', T);
  const m = heliocentric('mars', T);
  const au = Math.hypot(m[0] - e[0], m[1] - e[1], m[2] - e[2]);
  const km = au * AU_KM;
  const seconds = km / C_KM_S;
  return { km: Math.round(km), au: Math.round(au * 1000) / 1000, seconds: Math.round(seconds), minutes: Math.round((seconds / 60) * 10) / 10 };
}

/** Distancia Tierra–Luna aproximada (km) y retraso (s). Término principal de la teoría lunar (±1 %). */
export function earthMoonLightTime(dateInput = new Date()) {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T12:00:00Z`) : dateInput;
  const d = julianDay(date) - 2451545.0;
  const Mmoon = (134.963 + 13.064993 * d) * DEG; // anomalía media de la Luna
  const D = (297.85 + 12.190749 * d) * DEG; // elongación media
  const km = 385001 - 20905 * Math.cos(Mmoon) - 3699 * Math.cos(2 * D - Mmoon) - 2956 * Math.cos(2 * D);
  return { km: Math.round(km), seconds: Math.round((km / C_KM_S) * 100) / 100 };
}

/** "11 min 2 s" / "1,3 s" en el idioma pedido. */
export function formatDelay(seconds, lang = 'es') {
  if (seconds < 60) return `${seconds.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 1 })} s`;
  // Se redondea el total antes de separar minutos y segundos (si no, 659,6 s saldría "10 min 60 s").
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m} min ${s} s`; // igual en español e inglés
}
