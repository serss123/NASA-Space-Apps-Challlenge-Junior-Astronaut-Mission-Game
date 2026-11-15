// Valores derivados de la partida (no se guardan: se calculan). La interfaz y el reducer usan los mismos.
import { BALANCE, MISSION_BY_ID } from './config.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const no = (reason, extra = {}) => ({ ok: false, reason, ...extra });

export const currentDay = (s) => s.timeline[s.dayIndex];
export const nextDay = (s) => s.timeline[s.dayIndex + 1] || null;
export const totalDays = (s) => s.timeline.length;
export const maxStamina = (s) => BALANCE.stamina.base + s.levels.lifeSupport;
export const baseEnergy = (s) => BALANCE.energy.base + s.levels.lifeSupport;
export const batteryCapacity = (s) => BALANCE.battery.capacityPerLifeSupport * s.levels.lifeSupport;
export const shieldMaxCharge = (s) => BALANCE.shield.maxChargeByLevel[s.levels.shield];
export const plotCount = (s) => BALANCE.farm.plotsByLevel[s.levels.farm];
export const forecastDays = (s) => BALANCE.antenna.forecastDaysByLevel[s.levels.antenna];
export const usedEnergy = (s) => s.energy.antenna + s.energy.farm + s.energy.shield;
export const freeEnergy = (s) => s.energy.total - usedEnergy(s);
export const isDay = (s) => s.phase === 'day';
export const isNight = (s) => s.phase === 'night';
export const isEnded = (s) => s.phase === 'ended';
/** ¿Se pueden hacer tareas que cuestan Fuerzas? (de día y con al menos 1 punto) */
export const canAct = (s) => s.phase === 'day' && s.stamina > 0;
/** 0 = amanecer, 1 = noche (para oscurecer el hábitat). */
export const dayProgress = (s) => (s.phase === 'day' ? clamp(1 - s.stamina / maxStamina(s), 0, 1) : 1);
export const antennaWorking = (s) => !s.tasks.antenna;
export const hasForecast = (s) => s.today.antennaLinked && antennaWorking(s);
export const totalSamples = (s) => s.inv.samples.z1 + s.inv.samples.z2 + s.inv.samples.z3;

/** ¿Hubo clima espacial notable ese día? (tormentas, llamaradas X, choques…) */
export const isNotableDay = (day) => !!day && (!day.calm || day.radiation.level > 0);

/** ¿Registró DONKI alguna actividad solar ese día? (llamarada, CME, partículas, choque o tormenta geomagnética).
 *  Cuenta para la misión "vigía": así también se puede completar cuando el Sol está tranquilo (misión EN VIVO). */
export const hasSolarActivity = (day) =>
  !!day &&
  (day.flares.total > 0 || day.cmes.total > 0 || day.sep.length > 0 || day.shocks.length > 0 || (day.geomagnetic?.kpMax ?? 0) >= 5 || day.radiation.level > 0);

/** Previsión visible con la antena encendida y conectada: días según el nivel + predicciones reales WSA-Enlil. */
export function forecast(s) {
  if (!hasForecast(s)) return null;
  const n = forecastDays(s);
  const days = [];
  for (let k = 0; k < n; k++) {
    const d = s.timeline[s.dayIndex + k];
    if (!d) break;
    days.push({
      offset: k,
      date: d.date,
      level: d.radiation.level,
      basis: d.radiation.basis,
      multiplier: d.radiation.multiplier,
      notable: isNotableDay(d),
      headline: d.headline
    });
  }
  const today = currentDay(s).date;
  const seen = new Set();
  const predictions = [];
  for (let i = Math.max(0, s.dayIndex - 3); i <= s.dayIndex; i++) {
    for (const p of s.timeline[i].predictions || []) {
      if (p.location !== 'Earth' || p.arrivalTime.slice(0, 10) < today) continue;
      const key = p.arrivalTime.slice(0, 13);
      if (seen.has(key)) continue;
      seen.add(key);
      predictions.push(p);
    }
  }
  predictions.sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
  return { days, predictions: predictions.slice(0, 3) };
}

/** Nivel de radiación de esta noche si se conoce (antena conectada), si no null. */
export const knownLevelTonight = (s) => (hasForecast(s) ? currentDay(s).radiation.level : null);

// ---------- comprobaciones de acciones (devuelven { ok, reason, ... }) ----------

export function upgradeCost(s, building) {
  return BALANCE.upgrades[building]?.[s.levels[building] + 1] ?? null;
}

export function canUpgrade(s, building) {
  const level = s.levels[building];
  if (level == null) return no('unknown');
  if (level >= BALANCE.maxLevel) return no('maxLevel');
  const cost = upgradeCost(s, building);
  if (building !== 'lifeSupport' && level + 1 > s.levels.lifeSupport) return no('goldenRule', { cost });
  if (s.phase !== 'day') return no('night', { cost });
  if (s.stamina < 1) return no('stamina', { cost });
  if (s.inv.metal < (cost.metal || 0)) return no('metal', { cost });
  if (s.inv.ice < (cost.ice || 0)) return no('ice', { cost });
  return { ok: true, cost, staminaCost: BALANCE.upgradeStamina, overexert: BALANCE.upgradeStamina > s.stamina };
}

export function canPlant(s, plot) {
  const p = s.plots[plot];
  if (!p) return no('unknown');
  if (p.crop) return no('occupied');
  if (s.phase !== 'day') return no('night');
  if (s.stamina < 1) return no('stamina');
  if (s.inv.ice < BALANCE.farm.plantIce) return no('ice');
  return { ok: true, staminaCost: BALANCE.farm.plantStamina };
}

export function canExplore(s, zone) {
  const need = BALANCE.rover.zoneLevel[zone];
  if (!need) return no('unknown');
  const cost = BALANCE.rover.zoneStamina[zone];
  if (s.levels.rover < need) return no('locked', { need, cost });
  if (s.phase !== 'day') return no('night', { cost });
  if (s.stamina < 1) return no('stamina', { cost });
  const known = knownLevelTonight(s);
  return {
    ok: true,
    cost,
    overexert: cost > s.stamina,
    stormRisk: known == null ? 'unknown' : known >= BALANCE.radiation.outsideDamageMinLevel ? 'high' : 'low'
  };
}

export function canRepair(s, task) {
  if (!s.tasks[task]) return no('notBroken');
  if (s.phase !== 'day') return no('night');
  if (s.stamina < 1) return no('stamina');
  return { ok: true, staminaCost: BALANCE.maintenance.repairStamina, overexert: BALANCE.maintenance.repairStamina > s.stamina };
}

export function canAllocate(s, system, value) {
  if (!['antenna', 'farm', 'shield'].includes(system)) return no('unknown');
  if (s.phase !== 'day' && s.phase !== 'night') return no('phase');
  const v = Math.floor(value);
  if (v < 0) return no('negative');
  const max = system === 'shield' ? shieldMaxCharge(s) : 1;
  if (v > max) return no('max', { max });
  if (system === 'shield' && v > 0 && s.tasks.cables) return no('cables');
  if (system === 'antenna' && s.today.antennaLinked && v < 1) return no('linked');
  if (usedEnergy(s) - s.energy[system] + v > s.energy.total) return no('energy');
  return { ok: true, max };
}

export function canLink(s) {
  if (s.phase === 'ended' || s.phase === 'report') return no('phase');
  if (s.today.antennaLinked) return no('linked');
  if (s.tasks.antenna) return no('broken');
  if (s.energy.antenna < 1) return no('energy');
  return { ok: true };
}

export function missionNeeds(s, id) {
  const m = MISSION_BY_ID[id];
  if (!m) return { rows: [], ready: false };
  const rows = [];
  if (m.need.ice) rows.push({ key: 'ice', have: s.inv.ice, need: m.need.ice });
  if (m.need.metal) rows.push({ key: 'metal', have: s.inv.metal, need: m.need.metal });
  if (m.need.samples) for (const [z, n] of Object.entries(m.need.samples)) rows.push({ key: z, have: s.inv.samples[z], need: n });
  if (m.need.watch) rows.push({ key: 'watch', have: s.missions.watch, need: m.need.watch });
  return { rows, ready: rows.every((r) => r.have >= r.need), reward: m.reward };
}

export function canDeliver(s, id) {
  if (!s.missions.active.includes(id)) return no('notActive');
  if (s.phase === 'ended' || s.phase === 'report') return no('phase');
  if (!hasForecast(s)) return no(s.tasks.antenna ? 'broken' : 'notLinked');
  const need = missionNeeds(s, id);
  if (!need.ready) return no('missing', { need });
  return { ok: true, need };
}

/** Lo que pasará esta noche si duermes ahora (lo desconocido sale como null). */
export function nightPreview(s) {
  const day = currentDay(s);
  const known = knownLevelTonight(s);
  const harvest = s.energy.farm > 0 ? s.plots.filter((p) => p.crop && p.crop.growth + 1 >= BALANCE.farm.growDays).length * BALANCE.farm.yield : 0;
  return {
    foodOk: s.inv.food + harvest >= 1,
    harvest,
    radiationLevel: known,
    shieldOk: known == null ? null : s.energy.shield >= known,
    outsideRisk: s.today.wentOutside ? (known == null ? 'unknown' : known >= BALANCE.radiation.outsideDamageMinLevel ? 'high' : 'low') : 'none',
    overexert: s.stamina < 0,
    willStore: Math.min(Math.max(0, freeEnergy(s)), batteryCapacity(s)),
    cropsWithoutPower: s.energy.farm > 0 ? 0 : s.plots.filter((p) => p.crop).length,
    date: day.date
  };
}
