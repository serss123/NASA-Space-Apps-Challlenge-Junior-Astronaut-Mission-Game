// Motor de "Sol a Sol": estado inmutable + reducer puro (sin React, sin red, sin Math.random).
// La interfaz hace dispatch({ type, ... }) y recibe un estado nuevo; si la acción no es válida, recibe el mismo.
// Reglas: docs/GAME_DESIGN.md §2. Números: config.js.

import { BALANCE, MISSIONS, MISSION_BY_ID, SAMPLE_OF_ZONE, TASK_IDS } from './config.js';
import { hashString, nextRandom, normalizeSeed } from './rng.js';
import * as sel from './selectors.js';

export const GAME_VERSION = 1;

// ---------- utilidades internas ----------

/** Copia profunda para mutar sin tocar el estado original (la línea temporal es de solo lectura y se comparte). */
function draft(state) {
  const { timeline, ...rest } = state;
  const d = structuredClone(rest);
  d.timeline = timeline;
  return d;
}

/** Tirada aleatoria con clave fija: depende solo de la semilla y del momento (no de las decisiones previas),
 *  así se puede repetir la misma misión cambiando una sola decisión ("prueba justa"). */
function rollFor(d, key) {
  return nextRandom(hashString(`${d.seed}|${key}`))[0];
}

const freshToday = () => ({ antennaLinked: false, wentOutside: false, expeditions: 0 });

function log(d, kind, data = {}) {
  d.log.push({ day: d.dayIndex, kind, ...data });
}

/** Encola una tarjeta de descubrimiento la primera vez que pasa algo. */
function discover(d, id) {
  if (d.discovered.includes(id)) return;
  d.discovered.push(id);
  d.pending.push(id);
}

function goNight(d) {
  if (d.phase !== 'day') return;
  d.phase = 'night';
  discover(d, 'polar-day');
}

function spendStamina(d, n) {
  d.stamina -= n;
  discover(d, 'stamina');
  if (d.stamina <= 0) goNight(d);
}

function endGame(d, result, cause = null) {
  d.phase = 'ended';
  d.outcome = { result, day: d.dayIndex, date: sel.currentDay(d).date, cause };
  log(d, 'end', { result, cause });
}

/** Llegan por la antena las misiones desbloqueadas (máximo 3 activas). */
function receiveMissions(d) {
  for (const m of MISSIONS) {
    if (d.missions.active.length >= BALANCE.missions.maxActive) break;
    if (d.missions.active.includes(m.id) || d.missions.done.includes(m.id)) continue;
    if (!m.unlock(d)) continue;
    d.missions.active.push(m.id);
    log(d, 'missionReceived', { id: m.id });
  }
}

/** Descubrimientos que dependen de lo que pasó de verdad ese día (datos de DONKI y RadLab). */
function dataDiscoveries(d, day) {
  const r = day.radiation;
  if (day.flares.total > 0) discover(d, 'flare');
  if (day.flares.x.length) discover(d, 'x-class');
  if (day.cmes.fastest || day.predictions.length) discover(d, 'cme');
  if (day.shocks.length) discover(d, 'cme-arrival');
  if (day.sep.length) discover(d, 'sep');
  if (r.basis === 'measured' && r.multiplier >= 30) discover(d, 'crater-detector');
  if (r.level >= 2 && r.stations?.iss) discover(d, 'iss-vs-moon');
  if ((day.geomagnetic?.kpMax ?? 0) >= 7) discover(d, 'geomagnetic-storm');
  if ((r.stations?.mars?.x ?? 0) >= 5) discover(d, 'mars-storm');
}

const BREAKDOWN_DISCOVERY = { panels: 'dirty-panels', cables: 'short-circuit', antenna: 'antenna-calibration' };

function breakDown(d, task, cause) {
  d.tasks[task] = { since: d.dayIndex, cause };
  discover(d, BREAKDOWN_DISCOVERY[task]);
  log(d, 'breakdown', { task, cause });
}

/** Amanecer: energía, Fuerzas, averías provocadas por los eventos reales del día (probabilidad SIMULADA). */
function startDay(d, index, { fed = true, stored = 0, first = false } = {}) {
  d.dayIndex = index;
  const day = sel.currentDay(d);
  const maxSt = sel.maxStamina(d);
  d.stamina = first || fed ? maxSt : Math.max(1, Math.min(d.stamina, maxSt));
  const penalty = d.tasks.panels ? BALANCE.energy.dirtyPanelsPenalty : 0;
  const base = Math.max(0, sel.baseEnergy(d) - penalty);
  d.energy = { total: base + stored, base, stored, penalty, antenna: 0, farm: 0, shield: 0 };
  d.today = freshToday();

  for (const task of TASK_IDS) {
    if (d.tasks[task]) continue; // una avería no se acumula: sigue hasta repararla
    const p = day.triggers?.[task] || 0;
    if (p > 0 && rollFor(d, `${index}:${task}`) < p) {
      breakDown(d, task, day.triggerCauses?.[task] || { kind: 'event' });
    } else if (task === 'panels' && !first && rollFor(d, `${index}:micrometeorite`) < BALANCE.maintenance.micrometeoriteChance) {
      breakDown(d, 'panels', { kind: 'micrometeorite' });
    }
  }
}

/** Noche: granja → cena → radiación → salida en tormenta → sobreesfuerzo → salud → amanecer. */
function resolveNight(d) {
  const day = sel.currentDay(d);
  const L = day.radiation.level;
  const rep = {
    dayIndex: d.dayIndex,
    date: day.date,
    level: L,
    basis: day.radiation.basis,
    multiplier: day.radiation.multiplier,
    shieldCharge: d.energy.shield,
    farmPowered: d.energy.farm > 0,
    antennaLinked: d.today.antennaLinked,
    wentOutside: d.today.wentOutside,
    staminaLeft: d.stamina,
    harvest: 0,
    grew: 0,
    unpoweredCrops: 0,
    ate: false,
    protected: null,
    damage: [],
    healed: false,
    stored: 0,
    watched: false,
    healthBefore: d.health
  };

  // 1. Granja: crece si tuvo energía hoy; a los 2 días encendida se cosecha sola.
  for (const p of d.plots) {
    if (!p.crop) continue;
    if (!rep.farmPowered) {
      rep.unpoweredCrops += 1;
      continue;
    }
    p.crop.growth += 1;
    rep.grew += 1;
    if (p.crop.growth >= BALANCE.farm.growDays) {
      d.inv.food += BALANCE.farm.yield;
      rep.harvest += BALANCE.farm.yield;
      p.crop = null;
      d.stats.harvests += 1;
    }
  }
  if (rep.harvest) {
    d.stats.foodGrown += rep.harvest;
    discover(d, 'harvest');
    log(d, 'harvest', { amount: rep.harvest });
  }

  // 2. Cena.
  if (d.inv.food >= BALANCE.food.perNight) {
    d.inv.food -= BALANCE.food.perNight;
    rep.ate = true;
    d.stats.meals += 1;
  } else {
    rep.damage.push('hunger');
    d.stats.hungryNights += 1;
    discover(d, 'hunger');
  }

  // 3. Radiación de la noche (dato real del día).
  if (L > 0) {
    d.stats.stormNights += 1;
    rep.protected = d.energy.shield >= L;
    if (rep.protected) {
      d.stats.stormsBlocked += 1;
      log(d, 'stormBlocked', { level: L, multiplier: day.radiation.multiplier });
    } else {
      rep.damage.push('radiation');
      d.stats.stormsHit += 1;
      log(d, 'stormHit', { level: L, charge: d.energy.shield, multiplier: day.radiation.multiplier });
    }
    discover(d, 'radiation-storm');
  }

  // 4. Salir con el Rover en un día de radiación alta: el escudo protege la base, no el Rover.
  if (d.today.wentOutside && L >= BALANCE.radiation.outsideDamageMinLevel) {
    rep.damage.push('outside');
    d.stats.outsideHits += 1;
    discover(d, 'outside-storm');
  }

  // 5. Sobreesfuerzo.
  if (d.stamina < 0) {
    rep.damage.push('overexertion');
    d.stats.overexertNights += 1;
    discover(d, 'overexertion');
  }

  dataDiscoveries(d, day);

  // Misión "vigía": antena conectada un día en el que DONKI registró actividad solar real.
  if (d.missions.active.includes('m-storm-watch') && sel.hasForecast(d) && sel.hasSolarActivity(day)) {
    d.missions.watch = Math.min(MISSION_BY_ID['m-storm-watch'].need.watch, d.missions.watch + 1);
    rep.watched = true;
  }

  // Energía: lo que no se usó se guarda en la batería (hasta su capacidad).
  d.stats.energyTo.antenna += d.energy.antenna;
  d.stats.energyTo.farm += d.energy.farm;
  d.stats.energyTo.shield += d.energy.shield;
  const stored = Math.min(Math.max(0, sel.freeEnergy(d)), sel.batteryCapacity(d));
  rep.stored = stored;
  if (stored > 0) {
    d.stats.energyTo.stored += stored;
    discover(d, 'base-battery');
  }

  // Salud.
  if (rep.damage.length) {
    d.health = Math.max(0, d.health - rep.damage.length);
    d.streak = 0;
    for (const cause of rep.damage) log(d, 'damage', { cause, level: L });
  } else {
    d.streak += 1;
    if (d.streak >= BALANCE.health.healAfterPerfectNights && d.health < BALANCE.health.max) {
      d.health += 1;
      d.streak = 0;
      rep.healed = true;
      d.stats.healed += 1;
      discover(d, 'recovery');
      log(d, 'healed', {});
    }
  }
  rep.healthAfter = d.health;
  d.night = rep;
  log(d, 'night', { level: L, protected: rep.protected, damage: rep.damage, ate: rep.ate });

  if (d.health <= 0) {
    discover(d, 'evacuation');
    endGame(d, 'evacuated', rep.damage[0] ?? null);
    return;
  }
  if (d.dayIndex >= d.timeline.length - 1) {
    endGame(d, d.research >= 100 ? 'win' : 'timeUp');
    return;
  }
  startDay(d, d.dayIndex + 1, { fed: rep.ate, stored });
  d.phase = 'report';
}

// ---------- API pública ----------

/**
 * Crea una partida nueva.
 * @param {{ timeline: object[], seed?: string, mode?: 'archive'|'live', source?: string, meta?: object }} opts
 */
export function createGame({ timeline, seed = 'LUNA-0001', mode = 'archive', source = 'ARCHIVO', meta = null }) {
  if (!Array.isArray(timeline) || timeline.length === 0) throw new Error('createGame: la línea temporal está vacía');
  const code = normalizeSeed(seed) || 'LUNA-0001';
  const d = {
    v: GAME_VERSION,
    seed: code,
    mode,
    source,
    meta: meta ? { id: meta.id ?? null, title: meta.title ?? null, from: meta.from ?? timeline[0].date, to: meta.to ?? timeline[timeline.length - 1].date } : null,
    timeline,
    dayIndex: 0,
    phase: 'day',
    health: BALANCE.health.start,
    stamina: 0,
    energy: { total: 0, base: 0, stored: 0, penalty: 0, antenna: 0, farm: 0, shield: 0 },
    levels: { lifeSupport: 1, farm: 1, antenna: 1, shield: 1, rover: 1 },
    inv: { food: BALANCE.food.start, ice: BALANCE.start.ice, metal: BALANCE.start.metal, samples: { z1: 0, z2: 0, z3: 0 } },
    plots: Array.from({ length: BALANCE.farm.plotsByLevel[1] }, () => ({ crop: null })),
    research: 0,
    missions: { active: [], done: [], watch: 0 },
    tasks: { panels: null, cables: null, antenna: null },
    today: freshToday(),
    streak: 0,
    discovered: [],
    pending: [],
    log: [],
    stats: {
      stormNights: 0,
      stormsBlocked: 0,
      stormsHit: 0,
      outsideHits: 0,
      meals: 0,
      hungryNights: 0,
      overexertNights: 0,
      healed: 0,
      expeditions: 0,
      emergencies: 0,
      collisions: 0,
      collected: { ice: 0, metal: 0, samples: 0 },
      repairs: 0,
      upgrades: 0,
      plants: 0,
      harvests: 0,
      foodGrown: 0,
      endedEarly: 0,
      energyTo: { antenna: 0, farm: 0, shield: 0, stored: 0 }
    },
    night: null,
    outcome: null
  };
  discover(d, 'welcome');
  startDay(d, 0, { first: true });
  return d;
}

const toInt = (v, max = 99) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

const HANDLERS = {
  /** Repartir energía: { system: 'antenna'|'farm'|'shield', value } */
  ALLOCATE(d, { system, value }) {
    const v = Math.floor(Number(value) || 0);
    if (!sel.canAllocate(d, system, v).ok) return false;
    const before = d.energy[system];
    if (before === v) return false;
    d.energy[system] = v;
    discover(d, 'base-energy');
    if (system === 'shield' && v > before) discover(d, 'shield');
    return true;
  },

  /** La señal de la Tierra ha llegado (la interfaz espera ~1,3 s antes de enviarla). */
  LINK_ANTENNA(d) {
    if (!sel.canLink(d).ok) return false;
    d.today.antennaLinked = true;
    discover(d, 'signal-delay');
    discover(d, 'forecast');
    receiveMissions(d);
    log(d, 'link', {});
    return true;
  },

  PLANT(d, { plot = 0 }) {
    if (!sel.canPlant(d, plot).ok) return false;
    d.inv.ice -= BALANCE.farm.plantIce;
    d.plots[plot].crop = { plantedDay: d.dayIndex, growth: 0 };
    d.stats.plants += 1;
    discover(d, 'greenhouse');
    log(d, 'plant', { plot });
    spendStamina(d, BALANCE.farm.plantStamina);
    return true;
  },

  /** Resultado del minijuego del Rover: { zone, result: { collected:{ice,metal,samples}, emergency, collisions, completed } } */
  EXPEDITION_DONE(d, { zone, result = {} }) {
    const z = Number(zone);
    if (!sel.canExplore(d, z).ok) return false;
    const c = result.collected || {};
    const got = { ice: toInt(c.ice, 40), metal: toInt(c.metal, 40), samples: toInt(c.samples, 40) };
    const sampleKey = SAMPLE_OF_ZONE[z];
    d.inv.ice += got.ice;
    d.inv.metal += got.metal;
    d.inv.samples[sampleKey] += got.samples;
    d.today.wentOutside = true;
    d.today.expeditions += 1;
    d.stats.expeditions += 1;
    d.stats.collisions += toInt(result.collisions);
    d.stats.collected.ice += got.ice;
    d.stats.collected.metal += got.metal;
    d.stats.collected.samples += got.samples;
    if (result.emergency) d.stats.emergencies += 1;
    log(d, 'expedition', { zone: z, ...got, emergency: !!result.emergency, completed: !!result.completed, collisions: toInt(result.collisions) });

    discover(d, 'lunar-gravity');
    if (got.ice) discover(d, 'water-ice');
    if (got.metal) discover(d, 'metal');
    if (got.samples) discover(d, { 1: 'samples', 2: 'breccia', 3: 'psr-ice' }[z]);
    if (result.emergency || d.stats.expeditions >= 2) discover(d, 'rover-battery');

    // El Rover levanta polvo que se pega a los paneles (SIMULADO).
    if (!d.tasks.panels && rollFor(d, `${d.dayIndex}:dust:${d.today.expeditions}`) < BALANCE.rover.dustChance) {
      breakDown(d, 'panels', { kind: 'rover' });
    }
    spendStamina(d, BALANCE.rover.zoneStamina[z]);
    return true;
  },

  /** Reparación terminada (minijuego superado): { task: 'panels'|'cables'|'antenna' } */
  REPAIR(d, { task }) {
    if (!sel.canRepair(d, task).ok) return false;
    const prev = d.tasks[task];
    d.tasks[task] = null;
    d.stats.repairs += 1;
    log(d, 'repair', { task, since: prev.since });
    spendStamina(d, BALANCE.maintenance.repairStamina);
    return true;
  },

  UPGRADE(d, { building }) {
    const chk = sel.canUpgrade(d, building);
    if (!chk.ok) return false;
    d.inv.metal -= chk.cost.metal || 0;
    d.inv.ice -= chk.cost.ice || 0;
    d.levels[building] += 1;
    if (building === 'farm') while (d.plots.length < sel.plotCount(d)) d.plots.push({ crop: null });
    d.stats.upgrades += 1;
    log(d, 'upgrade', { building, level: d.levels[building] });
    discover(d, 'golden-rule');
    spendStamina(d, BALANCE.upgradeStamina);
    return true;
  },

  /** Enviar a la Tierra los resultados de una misión (necesita la antena conectada hoy). */
  DELIVER(d, { missionId }) {
    const chk = sel.canDeliver(d, missionId);
    if (!chk.ok) return false;
    const m = MISSION_BY_ID[missionId];
    if (m.need.ice) d.inv.ice -= m.need.ice;
    if (m.need.metal) d.inv.metal -= m.need.metal;
    if (m.need.samples) for (const [z, n] of Object.entries(m.need.samples)) d.inv.samples[z] -= n;
    d.missions.active = d.missions.active.filter((id) => id !== missionId);
    d.missions.done.push(missionId);
    d.research = Math.min(100, d.research + m.reward);
    log(d, 'mission', { id: missionId, reward: m.reward });
    discover(d, 'research');
    if (missionId === 'm-storm-watch') discover(d, 'storm-science');
    receiveMissions(d);
    if (d.research >= 100) endGame(d, 'win');
    return true;
  },

  /** Terminar la jornada antes de agotar las Fuerzas (las que sobran se pierden). */
  END_DAY(d) {
    if (d.phase !== 'day') return false;
    if (d.stamina > 0) {
      d.stats.endedEarly += 1;
      log(d, 'endDay', { staminaLeft: d.stamina });
    }
    goNight(d);
    return true;
  },

  /** Dormir en la cama (solo de noche): se resuelve la noche y amanece. */
  SLEEP(d) {
    if (d.phase !== 'night') return false;
    resolveNight(d);
    return true;
  },

  /** Cerrar el informe de la noche y empezar el día. */
  WAKE(d) {
    if (d.phase !== 'report') return false;
    d.phase = 'day';
    return true;
  },

  DISCOVER(d, { id }) {
    if (!id || d.discovered.includes(id)) return false;
    discover(d, id);
    return true;
  },

  ACK_DISCOVERY(d, { id }) {
    if (!d.pending.includes(id)) return false;
    d.pending = d.pending.filter((x) => x !== id);
    return true;
  }
};

export const ACTION_TYPES = Object.keys(HANDLERS);

/** Reducer puro: (estado, acción) → estado nuevo (o el mismo si la acción no es válida). */
export function gameReducer(state, action) {
  if (!state || !action) return state;
  if (action.type === 'LOAD') return action.state ?? state;
  const handler = HANDLERS[action.type];
  if (!handler) return state;
  if (state.phase === 'ended' && action.type !== 'ACK_DISCOVERY' && action.type !== 'DISCOVER') return state;
  const d = draft(state);
  return handler(d, action) ? d : state;
}

/** ¿Es un estado guardado compatible? (para "Continuar partida") */
export function isValidSave(s) {
  return !!s && s.v === GAME_VERSION && Array.isArray(s.timeline) && s.timeline.length > 0 && typeof s.dayIndex === 'number' && s.levels && s.inv;
}
