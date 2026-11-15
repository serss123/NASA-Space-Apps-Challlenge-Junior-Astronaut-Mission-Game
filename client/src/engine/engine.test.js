// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Engine tests (node:test, no dependencies):  node --test client/src/engine/
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import { BALANCE } from './config.js';
import { buildFinalReport } from './report.js';
import { createGame, gameReducer as R, isValidSave } from './reducer.js';
import { normalizeSeed, randomSeedCode } from './rng.js';
import * as sel from './selectors.js';
import { simulate } from './simulate.js';

const archive = JSON.parse(fs.readFileSync(new URL('../data/archive-may-2024.json', import.meta.url), 'utf8'));

/** Día sintético con el mismo formato que produce shared/gameTranslator.js */
function mkDay(i, { level = 0, x = [], sep = false, shock = false, kp = 0, triggers = {}, multiplier = null } = {}) {
  return {
    index: i,
    date: `2024-06-${String(i + 1).padStart(2, '0')}`,
    source: 'ARCHIVO',
    calm: !x.length && !sep && !shock && kp < 5 && level === 0,
    flares: { total: x.length, mCount: 0, x, max: x[0] ?? null, items: [] },
    cmes: { total: 0, fastest: null },
    sep: sep ? [{ id: 's', eventTime: '2024-06-01T00:00Z', instruments: [], link: '' }] : [],
    shocks: shock ? [{ id: 'i', eventTime: '2024-06-01T00:00Z', location: 'Earth', speed: 900, link: '' }] : [],
    geomagnetic: kp ? { kpMax: kp, id: 'g', link: '' } : null,
    predictions: [],
    notifications: [],
    radiation: { level, basis: 'measured', estimatedLevel: level, measuredLevel: level, multiplier, stations: { moonOrbit: null, iss: null, mars: null, deepSpace: null } },
    triggers: { panels: 0, cables: 0, antenna: 0, ...triggers },
    triggerCauses: { panels: null, cables: null, antenna: null },
    headline: { es: 'h', en: 'h' },
    summary: { es: 's', en: 's' }
  };
}
const calmTimeline = (n = 10, overrides = {}) => Array.from({ length: n }, (_, i) => mkDay(i, overrides[i] || {}));

const play = (s, ...actions) => actions.reduce((acc, a) => R(acc, a), s);
const sleepWake = (s) => play(s, { type: 'END_DAY' }, { type: 'SLEEP' }, { type: 'WAKE' });

describe('createGame', () => {
  it('empieza con los valores del markdown: 5 ❤️, 4 💪, 3 ⚡ y edificios a nivel 1', () => {
    const s = createGame({ timeline: archive.timeline, seed: 'LUNA-4821' });
    assert.equal(s.health, 5);
    assert.equal(s.stamina, 4);
    assert.equal(s.energy.total, 3);
    assert.deepEqual(s.levels, { lifeSupport: 1, farm: 1, antenna: 1, shield: 1, rover: 1 });
    assert.equal(s.phase, 'day');
    assert.equal(s.dayIndex, 0);
    assert.ok(s.pending.includes('welcome'));
    assert.ok(isValidSave(s));
  });
  it('normaliza los códigos de partida', () => {
    assert.equal(normalizeSeed('luna-7'), 'LUNA-0007');
    assert.equal(normalizeSeed('LUNA-4821'), 'LUNA-4821');
    assert.equal(normalizeSeed('hola'), null);
    // Seeds are internal (the player never sees a game code): a random one is always a valid seed.
    assert.equal(normalizeSeed(randomSeedCode(() => 0.48215)), 'LUNA-4821');
    assert.equal(randomSeedCode(() => 0), 'LUNA-0000');
  });
});

describe('ninguna decisión es gratis', () => {
  // Cada sonda hace una decisión y comprueba que algo se gasta o se arriesga.
  const totalCost = (a, b) =>
    sel.freeEnergy(a) - sel.freeEnergy(b) + (a.stamina - b.stamina) + (a.inv.ice - b.inv.ice) + (a.inv.metal - b.inv.metal) + (a.inv.food - b.inv.food);

  it('encender la antena, la granja o cargar el escudo cuesta energía', () => {
    const s0 = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    for (const [system, value] of [['antenna', 1], ['farm', 1], ['shield', 1]]) {
      const s1 = R(s0, { type: 'ALLOCATE', system, value });
      assert.notEqual(s1, s0, system);
      assert.equal(sel.freeEnergy(s0) - sel.freeEnergy(s1), value, system);
    }
  });
  it('plantar, reparar, mejorar y explorar cuestan Fuerzas y/o materiales', () => {
    let s0 = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    const plant = R(s0, { type: 'PLANT', plot: 0 });
    assert.ok(totalCost(s0, plant) >= 2); // 1 💪 + 1 🧊
    s0 = { ...s0, inv: { ...s0.inv, metal: 20, ice: 20 } };
    const up = R(s0, { type: 'UPGRADE', building: 'lifeSupport' });
    assert.ok(totalCost(s0, up) > 1);
    const exp = R(s0, { type: 'EXPEDITION_DONE', zone: 1, result: { collected: { ice: 0, metal: 0, samples: 0 } } });
    assert.equal(s0.stamina - exp.stamina, BALANCE.rover.zoneStamina[1]);
    const broken = { ...s0, tasks: { ...s0.tasks, cables: { since: 0, cause: null } } };
    const fixed = R(broken, { type: 'REPAIR', task: 'cables' });
    assert.equal(broken.stamina - fixed.stamina, 1);
  });
  it('esperar también cuesta: se pierden las Fuerzas que sobran y se come igual', () => {
    const s0 = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    const s1 = sleepWake(s0);
    assert.equal(s1.inv.food, s0.inv.food - 1);
    assert.equal(s1.stats.endedEarly, 1);
  });
  it('conectar la antena gasta su energía del día: luego no se puede apagar para recuperarla', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = play(s, { type: 'ALLOCATE', system: 'antenna', value: 1 }, { type: 'LINK_ANTENNA' });
    assert.equal(s.today.antennaLinked, true);
    assert.equal(R(s, { type: 'ALLOCATE', system: 'antenna', value: 0 }), s);
  });
});

describe('determinismo', () => {
  it('la misma semilla y las mismas decisiones dan la misma partida', () => {
    const run = (seed) => {
      let s = createGame({ timeline: archive.timeline, seed });
      for (let d = 0; d < 12; d++) {
        s = play(s, { type: 'ALLOCATE', system: 'antenna', value: 1 }, { type: 'LINK_ANTENNA' });
        s = R(s, { type: 'EXPEDITION_DONE', zone: 1, result: { collected: { ice: 1, metal: 2, samples: 1 } } });
        s = sleepWake(s);
      }
      const { timeline, ...rest } = s;
      return JSON.stringify(rest);
    };
    assert.equal(run('LUNA-1234'), run('LUNA-1234'));
    const variants = new Set(['LUNA-0001', 'LUNA-0002', 'LUNA-0003', 'LUNA-0004', 'LUNA-0005', 'LUNA-0006'].map(run));
    assert.ok(variants.size > 1, 'semillas distintas deberían dar averías distintas');
  });
  it('las averías del amanecer no dependen de las decisiones anteriores (prueba justa)', () => {
    const tl = calmTimeline(6, { 3: { triggers: { cables: 0.5, antenna: 0.5 }, x: ['X1.0'], shock: true } });
    const breakdownsOf = (withTrip) => {
      let s = createGame({ timeline: tl, seed: 'LUNA-0042' });
      for (let d = 0; d < 4; d++) {
        if (withTrip) s = R(s, { type: 'EXPEDITION_DONE', zone: 1, result: { collected: {} } });
        s = sleepWake(s);
      }
      return { cables: !!s.tasks.cables, antenna: !!s.tasks.antenna };
    };
    assert.deepEqual(breakdownsOf(true), breakdownsOf(false));
  });
});

describe('efectos diferidos', () => {
  it('la granja da comida dos noches después, solo si tuvo energía', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = play(s, { type: 'PLANT', plot: 0 }, { type: 'ALLOCATE', system: 'farm', value: 1 });
    const food0 = s.inv.food;
    s = sleepWake(s); // noche 1: crece (sin cosecha) y se cena
    assert.equal(s.inv.food, food0 - 1);
    s = play(s, { type: 'ALLOCATE', system: 'farm', value: 0 });
    s = sleepWake(s); // noche 2: sin energía, no crece
    assert.equal(s.inv.food, food0 - 2);
    s = play(s, { type: 'ALLOCATE', system: 'farm', value: 1 });
    s = sleepWake(s); // noche 3: crece hasta 2 → cosecha +3
    assert.equal(s.inv.food, food0 - 3 + BALANCE.farm.yield);
    assert.equal(s.plots[0].crop, null);
  });
  it('la energía que no se usa se guarda en la batería (hasta su capacidad)', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = sleepWake(s);
    assert.equal(s.energy.stored, sel.batteryCapacity(s));
    assert.equal(s.energy.total, sel.baseEnergy(s) + sel.batteryCapacity(s));
  });
  it('los paneles sucios dan 1 de energía menos al amanecer siguiente', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = { ...s, tasks: { ...s.tasks, panels: { since: 0, cause: { kind: 'rover' } } } };
    s = play(s, { type: 'ALLOCATE', system: 'antenna', value: 1 }, { type: 'ALLOCATE', system: 'farm', value: 1 }, { type: 'ALLOCATE', system: 'shield', value: 1 });
    s = sleepWake(s);
    assert.equal(s.energy.base, sel.baseEnergy(s) - 1);
  });
});

describe('la noche', () => {
  it('una tormenta de nivel 2 sin escudo suficiente quita 1 ❤️; con escudo 2 no', () => {
    const tl = calmTimeline(5, { 0: { level: 2, multiplier: 45 } });
    let s = createGame({ timeline: tl, seed: 'LUNA-0001' });
    s = { ...s, levels: { ...s.levels, lifeSupport: 2, shield: 2 }, energy: { ...s.energy, total: 4 } };
    const hit = play(s, { type: 'ALLOCATE', system: 'shield', value: 1 }, { type: 'END_DAY' }, { type: 'SLEEP' });
    assert.equal(hit.health, 4);
    assert.deepEqual(hit.night.damage, ['radiation']);
    const safe = play(s, { type: 'ALLOCATE', system: 'shield', value: 2 }, { type: 'END_DAY' }, { type: 'SLEEP' });
    assert.equal(safe.health, 5);
    assert.equal(safe.night.protected, true);
  });
  it('el escudo protege la base, no el Rover: salir con radiación alta quita 1 ❤️', () => {
    const tl = calmTimeline(5, { 0: { level: 2 } });
    let s = createGame({ timeline: tl, seed: 'LUNA-0001' });
    s = { ...s, levels: { ...s.levels, lifeSupport: 2, shield: 2 }, energy: { ...s.energy, total: 4 } };
    s = play(s, { type: 'ALLOCATE', system: 'shield', value: 2 }, { type: 'EXPEDITION_DONE', zone: 1, result: { collected: {} } }, { type: 'END_DAY' }, { type: 'SLEEP' });
    assert.ok(s.night.damage.includes('outside'));
  });
  it('sin comida: −1 ❤️ y no se recuperan las Fuerzas gastadas', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = { ...s, inv: { ...s.inv, food: 0, ice: 5 } };
    s = play(s, { type: 'PLANT', plot: 0 }, { type: 'END_DAY' }, { type: 'SLEEP' });
    assert.ok(s.night.damage.includes('hunger'));
    assert.equal(s.health, 4);
    assert.equal(s.stamina, sel.maxStamina(s) - 1);
  });
  it('acabar el día con Fuerzas negativas (sobreesfuerzo) quita 1 ❤️', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = { ...s, stamina: 1 };
    s = R(s, { type: 'EXPEDITION_DONE', zone: 1, result: { collected: {} } });
    assert.equal(s.stamina, -1);
    assert.equal(s.phase, 'night');
    s = R(s, { type: 'SLEEP' });
    assert.ok(s.night.damage.includes('overexertion'));
  });
  it('dos noches seguidas sin daño curan 1 ❤️', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = { ...s, health: 3 };
    s = sleepWake(sleepWake(s));
    assert.equal(s.health, 4);
  });
  it('con 0 ❤️ la misión se evacua (todos a salvo)', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = { ...s, health: 1, inv: { ...s.inv, food: 0 } };
    s = play(s, { type: 'END_DAY' }, { type: 'SLEEP' });
    assert.equal(s.phase, 'ended');
    assert.equal(s.outcome.result, 'evacuated');
    assert.equal(s.outcome.cause, 'hunger');
    assert.equal(R(s, { type: 'PLANT', plot: 0 }), s);
  });
  it('el último día termina la misión ("se acaba el tiempo") si no hay 100 % de investigación', () => {
    let s = createGame({ timeline: calmTimeline(2), seed: 'LUNA-0001' });
    s = sleepWake(s);
    s = play(s, { type: 'END_DAY' }, { type: 'SLEEP' });
    assert.equal(s.outcome.result, 'timeUp');
  });
});

describe('reglas de los edificios y averías', () => {
  it('regla de oro: ningún edificio supera el nivel del Soporte Vital', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = { ...s, inv: { ...s.inv, metal: 30, ice: 30 } };
    assert.equal(sel.canUpgrade(s, 'shield').reason, 'goldenRule');
    s = R(s, { type: 'UPGRADE', building: 'lifeSupport' });
    assert.equal(s.levels.lifeSupport, 2);
    assert.ok(sel.canUpgrade(s, 'shield').ok);
  });
  it('mejorar la granja añade bancales', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = { ...s, levels: { ...s.levels, lifeSupport: 3 }, inv: { ...s.inv, metal: 30, ice: 30 } };
    s = R(s, { type: 'UPGRADE', building: 'farm' });
    assert.equal(s.plots.length, 2);
  });
  it('con los cables cortocircuitados no se puede cargar el escudo', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = { ...s, tasks: { ...s.tasks, cables: { since: 0, cause: null } } };
    assert.equal(R(s, { type: 'ALLOCATE', system: 'shield', value: 1 }), s);
  });
  it('con la antena descalibrada no hay previsión ni misiones', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = { ...s, tasks: { ...s.tasks, antenna: { since: 0, cause: null } } };
    s = play(s, { type: 'ALLOCATE', system: 'antenna', value: 1 }, { type: 'LINK_ANTENNA' });
    assert.equal(s.today.antennaLinked, false);
    assert.equal(sel.forecast(s), null);
  });
  it('una llamarada X provoca el cortocircuito con probabilidad 0,8 (≈80 % de las semillas)', () => {
    const tl = calmTimeline(3, { 1: { x: ['X5.8'], triggers: { cables: 0.8 } } });
    let hits = 0;
    for (let i = 0; i < 400; i++) {
      const s = sleepWake(createGame({ timeline: tl, seed: `LUNA-${i}` }));
      if (s.tasks.cables) hits += 1;
    }
    assert.ok(hits / 400 > 0.72 && hits / 400 < 0.88, `tasa ${hits / 400}`);
  });
});

describe('misiones y final', () => {
  it('las misiones llegan por la antena y se entregan con la antena conectada', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = play(s, { type: 'ALLOCATE', system: 'antenna', value: 1 }, { type: 'LINK_ANTENNA' });
    assert.ok(s.missions.active.includes('m-anorthosite'));
    s = { ...s, inv: { ...s.inv, samples: { z1: 4, z2: 0, z3: 0 } } };
    s = R(s, { type: 'DELIVER', missionId: 'm-anorthosite' });
    assert.equal(s.research, 15);
    assert.equal(s.inv.samples.z1, 0);
  });
  it('llegar al 100 % de investigación gana la partida', () => {
    let s = createGame({ timeline: calmTimeline(), seed: 'LUNA-0001' });
    s = play(s, { type: 'ALLOCATE', system: 'antenna', value: 1 }, { type: 'LINK_ANTENNA' });
    s = { ...s, research: 90, inv: { ...s.inv, samples: { z1: 4, z2: 0, z3: 0 } } };
    s = R(s, { type: 'DELIVER', missionId: 'm-anorthosite' });
    assert.equal(s.outcome.result, 'win');
  });
  it('el informe final explica la causa con datos reales', () => {
    let s = createGame({ timeline: archive.timeline, seed: 'LUNA-0001' });
    for (let d = 0; d < 21 && s.phase !== 'ended'; d++) s = sleepWake(s);
    const rep = buildFinalReport(s);
    assert.ok(['evacuated', 'timeUp'].includes(rep.result));
    assert.ok(rep.mainCause);
    assert.ok(rep.strongestEvent?.date);
    assert.equal(rep.sun.maxFlare.c.startsWith('X'), true);
  });
});

describe('equilibrio (simulador, versión corta)', () => {
  it('equilibrada gana mucho más que las estrategias de una sola cosa o al azar', () => {
    const res = simulate(archive.timeline, { games: 60, strategies: ['balanced', 'alwaysShield', 'alwaysScience', 'waitAlways', 'random'] });
    assert.ok(res.balanced.winRate >= 0.6, `equilibrada ${res.balanced.winRate}`);
    for (const name of ['alwaysShield', 'alwaysScience', 'waitAlways']) assert.ok(res[name].winRate < 0.35, `${name} ${res[name].winRate}`);
    assert.ok(res.random.winRate < 0.2, `azar ${res.random.winRate}`);
  });
});
