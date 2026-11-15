// Azar con semilla para los minijuegos: la misma semilla de texto ("LUNA-4821") da siempre el mismo
// tablero, así dos jugadores con la misma partida ven lo mismo. JS puro: sin React, sin navegador.
//
//   const rng = rngFor('LUNA-4821', ':cables');  // cada minijuego mezcla su propia "sal"
//   rng()                  → número en [0, 1)
//   randInt(rng, 1, 6)     → entero entre 1 y 6 (ambos incluidos)
//   shuffle(rng, [1,2,3])  → copia barajada
//
// IMPORTANTE: no cambiar estas fórmulas sin avisar: cambiarían todos los tableros ya compartidos.

/** Texto → entero sin signo de 32 bits (FNV-1a + mezcla final de MurmurHash3). */
export function hashString(str) {
  const s = String(str ?? '');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // "avalancha": cambiar una letra cambia todos los bits
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Generador Mulberry32: semilla uint32 → función que devuelve números en [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generador para una semilla de partida y una sal propia del minijuego (p. ej. ':panels'). */
export function rngFor(seed, salt = '') {
  return mulberry32(hashString(`${seed ?? ''}${salt}`));
}

/** Número real en [min, max). */
export function randFloat(rng, min, max) {
  return min + rng() * (max - min);
}

/** Entero en [min, max], ambos incluidos (si vienen al revés, se ordenan). */
export function randInt(rng, min, max) {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Un elemento al azar de una lista (undefined si está vacía). */
export function pickOne(rng, list) {
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(rng() * list.length)];
}

/** Copia barajada (Fisher–Yates). No modifica la lista original. */
export function shuffle(rng, list) {
  const out = Array.from(list ?? []);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Permutación de 0..n-1 sin ningún punto fijo (out[i] !== i): "nadie queda en su sitio".
 * Útil para que ningún cable quede justo enfrente de su enchufe. Determinista con el mismo rng.
 */
export function derangement(rng, n) {
  const base = Array.from({ length: n }, (_, i) => i);
  if (n < 2) return base; // con 0 o 1 elementos no existe; devolvemos la identidad
  for (let tries = 0; tries < 24; tries++) {
    const p = shuffle(rng, base);
    if (p.every((v, i) => v !== i)) return p;
  }
  // Plan B (casi nunca): desplazar todo una posición también es un desarreglo
  return base.map((i) => (i + 1) % n);
}

/**
 * Entero en [min, max] que esté al menos a `minDist` de `avoid` (si es posible).
 * Sirve para que el valor inicial de un dial no empiece ya cerca de su objetivo.
 */
export function randIntAway(rng, min, max, avoid, minDist) {
  const options = [];
  for (let v = Math.ceil(min); v <= Math.floor(max); v++) if (Math.abs(v - avoid) >= minDist) options.push(v);
  if (options.length === 0) return randInt(rng, min, max);
  return options[Math.floor(rng() * options.length)];
}
