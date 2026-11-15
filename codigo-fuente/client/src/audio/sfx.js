// Efectos de sonido sintetizados con Web Audio (sin archivos, sin derechos de autor). Botón de silencio global.
const KEY = 'solasol.muted';
let ctx = null;
let master = null;
let muted = false;
try {
  muted = window.localStorage.getItem(KEY) === '1';
} catch {
  /* ignorar */
}
const listeners = new Set();

function audio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone({ freq = 440, to, type = 'sine', dur = 0.14, vol = 0.18, delay = 0, attack = 0.008 }) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.2, vol = 0.2, delay = 0, freq = 1200, q = 0.8 }) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
}

const SOUNDS = {
  click: () => tone({ freq: 720, type: 'triangle', dur: 0.05, vol: 0.08 }),
  ok: () => {
    tone({ freq: 523, type: 'triangle', dur: 0.12 });
    tone({ freq: 659, type: 'triangle', dur: 0.12, delay: 0.08 });
    tone({ freq: 784, type: 'triangle', dur: 0.2, delay: 0.16 });
  },
  error: () => {
    tone({ freq: 220, type: 'square', dur: 0.12, vol: 0.08 });
    tone({ freq: 160, type: 'square', dur: 0.18, vol: 0.08, delay: 0.1 });
  },
  jump: () => tone({ freq: 300, to: 760, type: 'sine', dur: 0.22, vol: 0.14 }),
  collect: () => {
    tone({ freq: 880, type: 'sine', dur: 0.08, vol: 0.12 });
    tone({ freq: 1320, type: 'sine', dur: 0.12, vol: 0.1, delay: 0.06 });
  },
  hit: () => {
    noise({ dur: 0.22, vol: 0.35, freq: 300, q: 0.6 });
    tone({ freq: 120, to: 60, type: 'sawtooth', dur: 0.2, vol: 0.08 });
  },
  alarm: () => {
    for (let i = 0; i < 3; i++) {
      tone({ freq: 880, type: 'square', dur: 0.14, vol: 0.06, delay: i * 0.3 });
      tone({ freq: 660, type: 'square', dur: 0.14, vol: 0.06, delay: i * 0.3 + 0.15 });
    }
  },
  night: () => {
    tone({ freq: 392, type: 'sine', dur: 0.4, vol: 0.1 });
    tone({ freq: 294, type: 'sine', dur: 0.5, vol: 0.1, delay: 0.22 });
    tone({ freq: 196, type: 'sine', dur: 0.8, vol: 0.1, delay: 0.46 });
  },
  day: () => {
    tone({ freq: 262, type: 'sine', dur: 0.3, vol: 0.1 });
    tone({ freq: 392, type: 'sine', dur: 0.3, vol: 0.1, delay: 0.15 });
    tone({ freq: 523, type: 'sine', dur: 0.6, vol: 0.12, delay: 0.3 });
  },
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.14, delay: i * 0.11 })),
  spark: () => {
    noise({ dur: 0.08, vol: 0.4, freq: 3200, q: 2 });
    noise({ dur: 0.06, vol: 0.3, freq: 4200, q: 2, delay: 0.07 });
  },
  signal: () => [0, 0.12, 0.24].forEach((d) => tone({ freq: 1200, type: 'sine', dur: 0.06, vol: 0.08, delay: d })),
  build: () => {
    noise({ dur: 0.08, vol: 0.25, freq: 900, q: 1 });
    tone({ freq: 330, type: 'square', dur: 0.08, vol: 0.06, delay: 0.1 });
    tone({ freq: 494, type: 'triangle', dur: 0.2, vol: 0.12, delay: 0.2 });
  },
  hurt: () => tone({ freq: 330, to: 110, type: 'sawtooth', dur: 0.4, vol: 0.1 }),
  power: () => tone({ freq: 200, to: 600, type: 'triangle', dur: 0.18, vol: 0.1 })
};

export const sfx = {
  play(name) {
    if (muted) return;
    try {
      SOUNDS[name]?.();
    } catch {
      /* el audio nunca debe romper el juego */
    }
  },
  isMuted: () => muted,
  setMuted(v) {
    muted = !!v;
    try {
      window.localStorage.setItem(KEY, muted ? '1' : '0');
    } catch {
      /* ignorar */
    }
    listeners.forEach((fn) => fn(muted));
  },
  toggle() {
    this.setMuted(!muted);
    return muted;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};
