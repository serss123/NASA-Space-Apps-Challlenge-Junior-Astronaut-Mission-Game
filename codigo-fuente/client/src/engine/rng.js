// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Seeded random numbers (mulberry32): the same seed always produces the same game.
// The engine keeps the generator state inside the game (s.rng), so the reducer stays pure.
// Seeds are internal: the player never sees or types them. They only make "replay the same mission" fair.

/** Turns a text (e.g. "LUNA-4821") into a 32-bit integer. */
export function hashString(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

/** One mulberry32 step: returns [value in 0..1, new state]. */
export function nextRandom(state) {
  const t = (state + 0x6d2b79f5) >>> 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  return [((r ^ (r >>> 14)) >>> 0) / 4294967296, t];
}

/** Draws a random number from the game (mutates the draft `d`, which is a copy). */
export function roll(d) {
  const [v, next] = nextRandom(d.rng);
  d.rng = next;
  return v;
}

/** Independent generator (for the simulator or the minigames). */
export function makeRandom(seedText) {
  let st = hashString(String(seedText));
  return () => {
    const [v, next] = nextRandom(st);
    st = next;
    return v;
  };
}

/** Canonical seed: LUNA-0000 … LUNA-9999 (null when the text has no digits). */
export function normalizeSeed(code) {
  const m = String(code ?? '')
    .toUpperCase()
    .match(/(\d{1,4})/);
  return m ? `LUNA-${m[1].padStart(4, '0')}` : null;
}

/** A new random seed (UI only; the engine itself never calls Math.random). */
export function randomSeedCode(rand = Math.random) {
  return `LUNA-${String(Math.floor(rand() * 10000)).padStart(4, '0')}`;
}
