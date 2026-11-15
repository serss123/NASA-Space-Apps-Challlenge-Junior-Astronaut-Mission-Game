// Simulador de equilibrio: juega muchas partidas automáticas con estrategias fijas sobre la línea temporal real.
// Objetivo (Plan Maestro): la estrategia equilibrada gana el 60–85 %; las de "una sola cosa" < 35 %; al azar < 20 %.
// Uso:  node client/src/engine/simulate.js [partidas=1000]
import { BALANCE } from './config.js';
import { createGame, gameReducer } from './reducer.js';
import { makeRandom } from './rng.js';
import * as sel from './selectors.js';

const R = gameReducer;

// ---------- modelo del minijuego del Rover (habilidad del niño) ----------
// Debe coincidir con los objetos de las pistas del Rover (client/src/rover/engine.js · ZONES).
export const TRACK_ITEMS = {
  1: { n: 11, w: { metal: 0.36, samples: 0.37, ice: 0.27 } },
  2: { n: 13, w: { metal: 0.46, samples: 0.38, ice: 0.16 } },
  3: { n: 15, w: { ice: 0.47, samples: 0.4, metal: 0.13 } }
};
export const SKILLS = {
  good: { collect: 0.8, hitChance: 0.2 },
  average: { collect: 0.62, hitChance: 0.33 }
};

export function roverOutcome(rand, zone, roverLevel, skill = SKILLS.good) {
  const { n, w } = TRACK_ITEMS[zone];
  const got = { ice: 0, metal: 0, samples: 0 };
  for (const [k, frac] of Object.entries(w)) {
    const count = Math.round(n * frac);
    for (let i = 0; i < count; i++) if (rand() < skill.collect) got[k] += 1;
  }
  let collisions = 0;
  for (let i = 0; i < 6; i++) if (rand() < skill.hitChance) collisions += 1;
  const cap = BALANCE.rover.capacityByLevel;
  const left = cap[roverLevel] - 0.8 * cap[zone] - 0.05 * cap[roverLevel] * collisions;
  const emergency = left <= 0;
  if (emergency) for (const k of Object.keys(got)) got[k] = Math.floor(got[k] / 2);
  return { collected: got, collisions, emergency, completed: !emergency };
}

// ---------- utilidades ----------
function allocate(s, system, value) {
  return R(s, { type: 'ALLOCATE', system, value });
}
function maxAffordableShield(s, want) {
  let v = Math.min(want, sel.shieldMaxCharge(s));
  while (v > 0 && !sel.canAllocate(s, 'shield', v).ok) v -= 1;
  return v;
}
function explore(s, zone, rand, skill) {
  if (!sel.canExplore(s, zone).ok) return s;
  return R(s, { type: 'EXPEDITION_DONE', zone, result: roverOutcome(rand, zone, s.levels.rover, skill) });
}
function deliverAll(s) {
  for (const id of [...s.missions.active]) if (sel.canDeliver(s, id).ok) s = R(s, { type: 'DELIVER', missionId: id });
  return s;
}

/** ¿Qué zona ayuda más ahora? (muestras que piden las misiones activas o materiales para mejorar) */
function bestZone(s) {
  const needZ = { z1: 0, z2: 0, z3: 0 };
  for (const id of s.missions.active) {
    for (const r of sel.missionNeeds(s, id).rows) if (needZ[r.key] != null) needZ[r.key] += Math.max(0, r.need - r.have);
  }
  const unlocked = [1, 2, 3].filter((z) => s.levels.rover >= BALANCE.rover.zoneLevel[z]);
  const wantsIce = s.inv.ice < 4 || s.missions.active.includes('m-water');
  let best = unlocked[unlocked.length - 1];
  let bestScore = -1;
  for (const z of unlocked) {
    const iceScore = wantsIce ? (z === 3 ? 4 : z === 1 ? 2 : 1) : 0;
    const score = needZ[`z${z}`] * 3 + iceScore + (s.inv.metal < 6 && z === 2 ? 2 : 0) + z * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = z;
    }
  }
  return best;
}

// Antes de la tormenta: Soporte Vital y escudo primero; después, Rover para llegar lejos.
const UPGRADE_PLAN_EARLY = ['lifeSupport', 'shield', 'lifeSupport', 'shield', 'rover', 'rover', 'farm', 'antenna'];
const UPGRADE_PLAN_LATE = ['rover', 'lifeSupport', 'rover', 'shield', 'farm', 'antenna', 'farm', 'antenna'];
const WHIM_PLAN = ['rover', 'farm', 'antenna', 'rover', 'lifeSupport', 'shield', 'lifeSupport', 'shield'];

// Despistes de un niño sensato (estrategia "balanced"): a veces no mira la antena, a veces olvida el escudo,
// mejora lo que más le gusta en vez de lo que hace falta o sale con el Rover sin mirar la previsión.
export const KID = { skipAntenna: 0.3, forgetShield: 0.2, whimUpgrade: 0.4, riskyTrip: 0.5, skipRepair: 0.3 };

const chance = (rand, kid, key) => !!kid && rand() < kid[key];

/** Un día de juego "con cabeza". `kid` = probabilidades de despiste (null = experto sin despistes). */
function playDay(s, rand, skill, kid) {
  // 1. Antena: reparar si hace falta, encender y conectar.
  if (!chance(rand, kid, 'skipAntenna')) {
    if (s.tasks.antenna && sel.canRepair(s, 'antenna').ok) s = R(s, { type: 'REPAIR', task: 'antenna' });
    s = allocate(s, 'antenna', 1);
    s = R(s, { type: 'LINK_ANTENNA' });
  }
  const fc = sel.forecast(s);
  const tonight = sel.knownLevelTonight(s);
  const stormSoon = fc ? fc.days.some((d) => d.level > 0) || fc.predictions.length > 0 : s.dayIndex >= 6;

  // 2. Averías importantes.
  if (!chance(rand, kid, 'skipRepair')) {
    if (s.tasks.cables && (stormSoon || (tonight ?? 0) > 0) && sel.canRepair(s, 'cables').ok) s = R(s, { type: 'REPAIR', task: 'cables' });
    if (s.tasks.panels && s.stamina >= 3 && sel.canRepair(s, 'panels').ok) s = R(s, { type: 'REPAIR', task: 'panels' });
  }

  // 3. Escudo según la previsión de esta noche.
  if (tonight > 0) s = allocate(s, 'shield', maxAffordableShield(s, tonight));

  // 4. Granja: plantar si queda hielo y no sobra comida; encenderla si hay cultivos.
  for (let i = 0; i < s.plots.length; i++) {
    if (s.inv.food < 10 && sel.canPlant(s, i).ok && s.inv.ice >= 1 && s.stamina >= 2) s = R(s, { type: 'PLANT', plot: i });
  }
  if (s.plots.some((p) => p.crop)) s = allocate(s, 'farm', 1);

  // 5. Entregar misiones listas.
  s = deliverAll(s);
  if (s.phase === 'ended') return s;

  // 6. Mejoras mientras haya Fuerzas de sobra. El niño no se anticipa: hasta sufrir la primera noche de
  //    tormenta mejora lo que le apetece (justo lo que el juego quiere enseñar a cambiar).
  const reactive = !!kid && s.stats.stormNights === 0;
  const plan = reactive || chance(rand, kid, 'whimUpgrade') ? WHIM_PLAN : s.levels.shield >= 3 || s.dayIndex >= 12 ? UPGRADE_PLAN_LATE : UPGRADE_PLAN_EARLY;
  for (const b of plan) {
    if (s.stamina < 2) break;
    const cost = sel.upgradeCost(s, b);
    if (sel.canUpgrade(s, b).ok && s.inv.ice - (cost?.ice || 0) >= (s.plots.some((p) => !p.crop) ? 1 : 0)) s = R(s, { type: 'UPGRADE', building: b });
  }

  // 7. Explorar si es seguro (sin radiación alta conocida) y sin sobreesfuerzo.
  const risky = chance(rand, kid, 'riskyTrip');
  let guard = 0;
  while (s.phase === 'day' && guard++ < 3) {
    const z = bestZone(s);
    const chk = sel.canExplore(s, z);
    if (!chk.ok || chk.overexert || (chk.stormRisk === 'high' && !risky)) break;
    s = explore(s, z, rand, skill);
  }
  return deliverAll(s);
}

// ---------- estrategias ----------
export const STRATEGIES = {
  /** Equilibrada: niño sensato pero imperfecto (la que debe ganar el 60–85 %). */
  balanced: (s, rand, skill) => playDay(s, rand, skill, KID),

  /** Experta (referencia): mira siempre la previsión y nunca se despista. */
  expert: (s, rand, skill) => playDay(s, rand, skill, null),

  /** Solo escudo: cada noche todo al escudo; nunca explora. */
  alwaysShield(s) {
    if (s.tasks.cables && sel.canRepair(s, 'cables').ok) s = R(s, { type: 'REPAIR', task: 'cables' });
    s = allocate(s, 'shield', maxAffordableShield(s, 3));
    for (let i = 0; i < s.plots.length; i++) if (sel.canPlant(s, i).ok) s = R(s, { type: 'PLANT', plot: i });
    if (sel.freeEnergy(s) > 0 && s.plots.some((p) => p.crop)) s = allocate(s, 'farm', 1);
    return s;
  },

  /** Solo ciencia: explora todos los días, ignora la radiación y la granja. */
  alwaysScience(s, rand, skill) {
    s = allocate(s, 'antenna', 1);
    s = R(s, { type: 'LINK_ANTENNA' });
    s = deliverAll(s);
    for (const b of ['rover', 'lifeSupport']) if (sel.canUpgrade(s, b).ok) s = R(s, { type: 'UPGRADE', building: b });
    let guard = 0;
    while (s.phase === 'day' && guard++ < 4) s = explore(s, bestZone(s), rand, skill);
    return deliverAll(s);
  },

  /** Esperar siempre: termina el día sin hacer nada. */
  waitAlways: (s) => s,

  /** Al azar: acciones válidas cualquiera. */
  random(s, rand, skill) {
    for (let k = 0; k < 8 && s.phase === 'day'; k++) {
      const r = rand();
      if (r < 0.15) s = allocate(s, 'antenna', rand() < 0.5 ? 1 : 0);
      else if (r < 0.25) s = R(s, { type: 'LINK_ANTENNA' });
      else if (r < 0.35) s = allocate(s, 'shield', Math.floor(rand() * 4));
      else if (r < 0.45) s = allocate(s, 'farm', rand() < 0.5 ? 1 : 0);
      else if (r < 0.55) s = R(s, { type: 'PLANT', plot: Math.floor(rand() * s.plots.length) });
      else if (r < 0.7) s = explore(s, 1 + Math.floor(rand() * 3), rand, skill);
      else if (r < 0.8) s = R(s, { type: 'UPGRADE', building: ['lifeSupport', 'farm', 'antenna', 'shield', 'rover'][Math.floor(rand() * 5)] });
      else if (r < 0.88) s = R(s, { type: 'REPAIR', task: ['panels', 'cables', 'antenna'][Math.floor(rand() * 3)] });
      else if (r < 0.95) s = deliverAll(s);
      else s = R(s, { type: 'END_DAY' });
    }
    return s;
  }
};

/** Juega una partida completa con una estrategia. */
export function playGame(timeline, strategyName, seed, skill = SKILLS.good) {
  const rand = makeRandom(`${seed}|${strategyName}|skill`);
  const strategy = STRATEGIES[strategyName];
  const kid = strategyName === 'balanced' ? KID : null;
  let s = createGame({ timeline, seed });
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 400) {
    if (s.phase === 'report') s = R(s, { type: 'WAKE' });
    if (s.phase === 'day') s = strategy(s, rand, skill);
    if (s.phase === 'ended') break;
    if (s.phase === 'day') s = R(s, { type: 'END_DAY' });
    if (s.phase === 'night') {
      // Antes de dormir, los jugadores con cabeza revisan el escudo con la previsión (el niño a veces lo olvida).
      if ((strategyName === 'balanced' || strategyName === 'expert') && !chance(rand, kid, 'forgetShield')) {
        const tonight = sel.knownLevelTonight(s);
        if (tonight > 0 && s.energy.shield < tonight) s = allocate(s, 'shield', maxAffordableShield(s, tonight));
      }
      s = R(s, { type: 'SLEEP' });
    }
  }
  return s;
}

/** Ejecuta N partidas por estrategia y devuelve los porcentajes. */
export function simulate(timeline, { games = 1000, strategies = Object.keys(STRATEGIES), skill = SKILLS.good } = {}) {
  const out = {};
  for (const name of strategies) {
    const res = { win: 0, evacuated: 0, timeUp: 0, research: 0, health: 0, causes: {} };
    for (let g = 0; g < games; g++) {
      const s = playGame(timeline, name, `LUNA-${String(g).padStart(4, '0')}`, skill);
      res[s.outcome.result] += 1;
      res.research += s.research;
      res.health += s.health;
      for (const e of s.log) if (e.kind === 'damage') res.causes[e.cause] = (res.causes[e.cause] || 0) + 1;
    }
    out[name] = {
      winRate: res.win / games,
      evacuatedRate: res.evacuated / games,
      timeUpRate: res.timeUp / games,
      avgResearch: Math.round(res.research / games),
      avgHealth: Math.round((res.health / games) * 10) / 10,
      damagePerGame: Object.fromEntries(Object.entries(res.causes).map(([k, v]) => [k, Math.round((v / games) * 100) / 100]))
    };
  }
  return out;
}

// ---------- CLI ----------
const isMain = typeof process !== 'undefined' && process.argv?.[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const archive = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'archive-may-2024.json'), 'utf8'));
  const games = Number(process.argv[2]) || 1000;
  for (const skillName of ['good', 'average']) {
    console.log(`\n=== ${games} partidas por estrategia · habilidad "${skillName}" · ${archive.meta.from} → ${archive.meta.to} ===`);
    const res = simulate(archive.timeline, { games, skill: SKILLS[skillName] });
    for (const [name, r] of Object.entries(res)) {
      console.log(
        `${name.padEnd(14)} gana ${(r.winRate * 100).toFixed(1).padStart(5)} %  evacuada ${(r.evacuatedRate * 100).toFixed(1).padStart(5)} %  ` +
          `tiempo ${(r.timeUpRate * 100).toFixed(1).padStart(5)} %  investigación media ${String(r.avgResearch).padStart(3)} %  salud ${r.avgHealth}  daños/partida ${JSON.stringify(r.damagePerGame)}`
      );
    }
  }
}
