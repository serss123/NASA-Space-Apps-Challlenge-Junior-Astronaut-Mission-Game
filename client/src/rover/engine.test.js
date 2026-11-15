// Pruebas del motor del Rover (solo JS puro).  Ejecutar: node --test client/src/rover/
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CAPACITY,
  DRAIN_SHARE,
  HIT_SHARE,
  ITEM_KINDS,
  NO_INPUT,
  PHYS,
  ZONES,
  abortRun,
  buildTrack,
  checkFairness,
  createRun,
  fullJump,
  generateTrack,
  groundAt,
  halveItems,
  hashString,
  itemCounts,
  makeAutopilot,
  mulberry32,
  runResult,
  simulateRun,
  stepRun,
  trackLength,
  trackStats,
  zonePlan
} from './engine.js';

const SEEDS = Array.from({ length: 20 }, (_, i) => `LUNA-${String(1000 + i * 373).padStart(4, '0')}`);
const ZONE_IDS = [1, 2, 3];

/** Copia comparable de una pista (sin el Float64Array, que se compara aparte). */
const snapshot = (tr) => JSON.stringify({ o: tr.obstacles, i: tr.items, h: tr.hills, c: tr.clusters, L: tr.length });

/** Corre pasos sin pulsar nada hasta que se cumpla `until` (o se acabe la carrera). */
function runUntil(s, tr, until, input = NO_INPUT, maxSteps = 120 * 120) {
  for (let i = 0; i < maxSteps && s.status === 'running' && !until(s); i++) {
    stepRun(s, tr, input);
    s.events.length = 0;
  }
  return s;
}

describe('azar con semilla (copia local)', () => {
  it('hashString y mulberry32 son deterministas y coinciden con los de los minijuegos', () => {
    assert.equal(hashString('LUNA-0000'), 1388751425);
    assert.equal(hashString(''), 2872998923);
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 5; i++) assert.equal(a(), b());
    const r = mulberry32(7)();
    assert.ok(r >= 0 && r < 1);
  });
});

describe('generación de la pista', () => {
  it('misma (semilla, zona) → exactamente la misma pista', () => {
    for (const z of ZONE_IDS) {
      for (const seed of SEEDS.slice(0, 5)) {
        const a = generateTrack(seed, z);
        const b = generateTrack(seed, z);
        assert.equal(snapshot(a), snapshot(b));
        assert.deepEqual(Array.from(a.ground.h), Array.from(b.ground.h));
      }
    }
  });

  it('semillas distintas → pistas distintas (y cada zona tiene su pista)', () => {
    for (const z of ZONE_IDS) {
      const seen = new Set(SEEDS.map((s) => snapshot(generateTrack(s, z))));
      assert.equal(seen.size, SEEDS.length, `zona ${z}: hay pistas repetidas`);
    }
    assert.notEqual(snapshot(generateTrack('LUNA-4821', 1)), snapshot(generateTrack('LUNA-4821', 2)));
  });

  it('acepta semillas y zonas raras sin romperse', () => {
    for (const [seed, zone] of [[undefined, 1], [null, '2'], [1234, 3], ['ñandú ☀️', 9], ['', 0], ['x', 'abc']]) {
      const tr = generateTrack(seed, zone);
      assert.ok(tr.zone >= 1 && tr.zone <= 3);
      assert.ok(tr.obstacles.length > 0 && tr.items.length > 0);
    }
  });

  it('la longitud de cada zona sale de su duración a velocidad base (~35 / 45 / 55 s)', () => {
    assert.equal(trackLength(1), 35 * PHYS.baseSpeed);
    assert.equal(trackLength(2), 45 * PHYS.baseSpeed);
    assert.equal(trackLength(3), 55 * PHYS.baseSpeed);
    for (const z of ZONE_IDS) assert.equal(generateTrack('LUNA-1', z).length, trackLength(z));
  });

  it('cada pista tiene el número de objetos configurado (±2) con la mezcla de su zona', () => {
    for (const z of ZONE_IDS) {
      const cfg = ZONES[z];
      const want = itemCounts(cfg.mix, cfg.items);
      for (const seed of SEEDS) {
        const st = trackStats(generateTrack(seed, z));
        assert.ok(Math.abs(st.items - cfg.items) <= 2, `zona ${z} ${seed}: ${st.items} objetos`);
        if (st.items === cfg.items) assert.deepEqual(st.kinds, { ice: want.ice, metal: want.metal, samples: want.samples });
      }
    }
    // Igual que TRACK_ITEMS del simulador del motor (client/src/engine/simulate.js), calibrado con 1000 partidas:
    // zona 1: 11 objetos (4 metal, 4 muestras, 3 hielo) · zona 2: 13 (6, 5, 2) · zona 3: 15 (7 hielo, 6 muestras, 2 metal)
    assert.deepEqual(itemCounts(ZONES[1].mix, 11), { metal: 4, samples: 4, ice: 3 });
    assert.deepEqual(itemCounts(ZONES[2].mix, 13), { metal: 6, samples: 5, ice: 2 });
    assert.deepEqual(itemCounts(ZONES[3].mix, 15), { ice: 7, samples: 6, metal: 2 });
  });

  it('hay objetos en el suelo y objetos en arco (hace falta saltar)', () => {
    for (const z of ZONE_IDS) {
      const types = new Set();
      for (const seed of SEEDS) generateTrack(seed, z).items.forEach((it) => types.add(it.type));
      assert.ok(types.has('ground') && types.has('arc'), `zona ${z}: ${[...types]}`);
    }
  });

  it('la dificultad sube con la zona (más obstáculos por segundo)', () => {
    const density = (z) => {
      let n = 0;
      for (const seed of SEEDS) n += generateTrack(seed, z).obstacles.length;
      return n / SEEDS.length / ZONES[z].seconds;
    };
    const [d1, d2, d3] = ZONE_IDS.map(density);
    assert.ok(d1 < d2 && d2 < d3, `densidades ${d1.toFixed(3)} ${d2.toFixed(3)} ${d3.toFixed(3)}`);
  });

  it('el Rover sale de suelo llano y la meta queda libre de obstáculos', () => {
    for (const z of ZONE_IDS) {
      for (const seed of SEEDS) {
        const tr = generateTrack(seed, z);
        assert.equal(groundAt(tr, 0), 0);
        assert.ok(tr.obstacles.every((o) => o.x1 <= tr.length - PHYS.finishRunway + 1e-9));
      }
    }
  });
});

describe('pista justa (sin secuencias imposibles)', () => {
  it('toda pista generada cumple la regla de ventana y de hueco mínimo', () => {
    for (const z of ZONE_IDS) {
      for (let i = 0; i < 60; i++) {
        const seed = i < SEEDS.length ? SEEDS[i] : `X-${i}-${z}`;
        const tr = generateTrack(seed, z);
        const f = checkFairness(tr);
        assert.ok(f.ok, `zona ${z} ${seed}: ${f.problems.join('; ')}`);
      }
    }
  });

  it('checkFairness detecta una pista injusta (dos cráteres pegados)', () => {
    const tr = buildTrack({
      zone: 1,
      length: 200,
      obstacles: [
        { type: 'crater', x0: 40, w: 3.3, d: 1 },
        { type: 'crater', x0: 47, w: 3.3, d: 1 }
      ]
    });
    assert.equal(checkFairness(tr).ok, false);
  });

  it('saltando en cualquier punto de cada ventana (como un niño) no se choca nunca', () => {
    for (const z of ZONE_IDS) {
      for (const [k, seed] of SEEDS.entries()) {
        const tr = generateTrack(seed, z);
        const { result } = simulateRun(tr, z, makeAutopilot(tr, { rng: mulberry32(k + 100 * z) }));
        assert.equal(result.collisions, 0, `zona ${z} ${seed}`);
        assert.equal(result.completed, true);
      }
    }
  });

  it('saltar al principio o al final de la ventana también funciona', () => {
    for (const z of ZONE_IDS) {
      for (const where of [0.05, 0.95]) {
        const tr = generateTrack(SEEDS[3], z);
        assert.equal(simulateRun(tr, z, makeAutopilot(tr, { where })).result.collisions, 0, `zona ${z} where=${where}`);
      }
    }
  });
});

describe('batería', () => {
  it('drainPerUnit = 0,8 · CAPACITY[zona] / trackLength(zona); choque = 5 % de la capacidad del Rover', () => {
    for (const z of ZONE_IDS) {
      for (const lv of [1, 2, 3]) {
        const s = createRun(generateTrack('LUNA-1', z), lv);
        assert.ok(Math.abs(s.drainPerUnit - (DRAIN_SHARE * CAPACITY[z]) / trackLength(z)) < 1e-12);
        assert.equal(s.capacity, CAPACITY[lv]);
        assert.ok(Math.abs(s.hitCost - HIT_SHARE * CAPACITY[lv]) < 1e-12);
        assert.equal(s.battery, CAPACITY[lv]);
      }
    }
  });

  it('carrera perfecta con roverLevel = zona: llega a la meta con 20 % ± 1 (20 semillas × 3 zonas)', () => {
    for (const z of ZONE_IDS) {
      for (const seed of SEEDS) {
        const tr = generateTrack(seed, z);
        const { result } = simulateRun(tr, z, makeAutopilot(tr));
        assert.equal(result.completed, true, `zona ${z} ${seed}`);
        assert.equal(result.emergency, false);
        assert.equal(result.collisions, 0, `zona ${z} ${seed}: choques`);
        assert.ok(Math.abs(result.batteryLeft - 20) <= 1, `zona ${z} ${seed}: ${result.batteryLeft} %`);
        assert.equal(result.progress, 1);
        assert.equal(result.zone, z);
      }
    }
  });

  it('cada choque cuesta exactamente el 5 % de la capacidad', () => {
    for (const lv of [1, 2, 3]) {
      const tr = buildTrack({ zone: 1, length: 245, obstacles: [{ type: 'boulder', x0: 40, w: 1.3, h: 0.95 }] });
      const s = createRun(tr, lv);
      runUntil(s, tr, (st) => st.x >= 30);
      const before = s.battery;
      const x0 = s.x;
      runUntil(s, tr, (st) => st.collisions === 1);
      assert.equal(s.collisions, 1);
      const drained = s.drainPerUnit * (s.x - x0);
      assert.ok(Math.abs(before - s.battery - drained - 0.05 * CAPACITY[lv]) < 1e-9, `nivel ${lv}`);
    }
  });

  it('al final, batería = capacidad − 80 % de la zona − 5 % por choque', () => {
    for (const z of ZONE_IDS) {
      const tr = generateTrack('LUNA-77', z);
      const { state, result } = simulateRun(tr, 3, null); // nunca salta: choca con todo
      assert.ok(state.collisions > 0);
      const expected = CAPACITY[3] - DRAIN_SHARE * CAPACITY[z] - HIT_SHARE * CAPACITY[3] * state.collisions;
      if (result.completed) assert.ok(Math.abs(state.battery - expected) < 1e-6, `zona ${z}`);
    }
  });

  it('con suficientes choques: regreso de emergencia y la mitad de cada objeto (hacia abajo)', () => {
    let checked = 0;
    for (const z of ZONE_IDS) {
      for (const seed of SEEDS.slice(0, 8)) {
        const tr = generateTrack(seed, z);
        const { state, result } = simulateRun(tr, z, null); // nunca salta
        assert.equal(result.emergency, true, `zona ${z} ${seed}`);
        assert.equal(result.completed, false);
        assert.equal(result.aborted, false);
        assert.ok(result.collisions >= 5);
        assert.ok(result.progress < 1);
        assert.equal(result.batteryLeft, 0);
        for (const k of ITEM_KINDS) assert.equal(result.collected[k], Math.floor(state.collected[k] / 2));
        checked += ITEM_KINDS.reduce((n, k) => n + state.collected[k], 0);
      }
    }
    assert.ok(checked > 0, 'el Rover debería recoger algo del suelo aunque no salte');
    assert.deepEqual(halveItems({ ice: 3, metal: 1, samples: 0 }), { ice: 1, metal: 0, samples: 0 });
  });

  it('4 choques con el nivel mínimo aún llegan (con 0 %); el 5.º agota la batería', () => {
    const tr = buildTrack({
      zone: 1,
      length: 245,
      obstacles: [40, 80, 120, 160, 200].map((x0) => ({ type: 'boulder', x0, w: 1.3, h: 0.95 }))
    });
    const fifth = tr.obstacles[4];
    // Salta solo la 5.ª roca: 4 choques
    const four = simulateRun(tr, 1, (s) => ({ pressed: s.grounded && s.x > fifth.x0 - 4.5 && s.x < fifth.x0 - 2, held: true }));
    assert.equal(four.result.collisions, 4);
    assert.equal(four.result.completed, true);
    assert.equal(four.result.batteryLeft, 0);
    const five = simulateRun(tr, 1, null);
    assert.equal(five.result.collisions, 5);
    assert.equal(five.result.emergency, true);
  });

  it('un Rover de nivel 3 en la zona 1 termina con más del 20 % (y el nivel 2 también tiene más margen)', () => {
    for (const seed of SEEDS) {
      const tr = generateTrack(seed, 1);
      const r3 = simulateRun(tr, 3, makeAutopilot(tr)).result;
      assert.equal(r3.completed, true);
      assert.ok(r3.batteryLeft > 20, `${seed}: ${r3.batteryLeft} %`);
      assert.equal(r3.batteryLeft, Math.round(((170 - 80) / 170) * 100));
      const r2 = simulateRun(tr, 2, makeAutopilot(tr)).result;
      assert.ok(r2.batteryLeft > 20 && r2.batteryLeft < r3.batteryLeft);
    }
  });

  it('zonePlan explica el margen: 80 % de gasto y 4 choques con el nivel justo', () => {
    for (const z of ZONE_IDS) {
      const p = zonePlan(z, z);
      assert.ok(Math.abs(p.usePct - 80) < 1e-9 && Math.abs(p.marginPct - 20) < 1e-9);
      assert.equal(p.maxHits, 4);
      assert.equal(p.unlocked, true);
    }
    assert.equal(zonePlan(1, 3).maxHits, 10);
    assert.equal(zonePlan(3, 1).unlocked, false);
  });

  it('avisa una sola vez al entrar en la reserva (20 %) y en la batería crítica', () => {
    const tr = generateTrack('LUNA-5', 1);
    const s = createRun(tr, 1);
    const events = [];
    for (let i = 0; i < 120 * 120 && s.status === 'running'; i++) {
      stepRun(s, tr, NO_INPUT);
      events.push(...s.events.map((e) => e.type));
      s.events.length = 0;
    }
    assert.equal(events.filter((e) => e === 'low').length, 1);
    assert.equal(events.filter((e) => e === 'critical').length, 1);
    assert.equal(events.filter((e) => e === 'empty').length, 1);
    // En una carrera perfecta con el nivel justo no salta el aviso de reserva
    const perfect = createRun(tr, 1);
    const pilot = makeAutopilot(tr);
    const types = [];
    for (let i = 0; i < 120 * 120 && perfect.status === 'running'; i++) {
      stepRun(perfect, tr, pilot(perfect));
      types.push(...perfect.events.map((e) => e.type));
      perfect.events.length = 0;
    }
    assert.ok(!types.includes('low') && types.includes('goal'));
  });
});

describe('controles amables (coyote, buffer, salto variable)', () => {
  const craterTrack = () => buildTrack({ zone: 1, length: 245, obstacles: [{ type: 'crater', x0: 40, w: 3.3, d: 1.05 }] });

  it('coyote: aún se puede saltar justo después de meter las ruedas en el cráter', () => {
    const tr = craterTrack();
    const inner = tr.obstacles[0].x0 + PHYS.craterEdge;
    const s = createRun(tr, 1);
    runUntil(s, tr, (st) => st.x > inner && st.craterTime > 0.04);
    assert.ok(s.craterTime <= PHYS.coyote && s.collisions === 0);
    runUntil(s, tr, (st) => st.x > tr.obstacles[0].x1 + 12, { pressed: true, held: true }, 1);
    assert.equal(s.grounded, false, 'debería haber saltado');
    runUntil(s, tr, (st) => st.x > tr.obstacles[0].x1 + 12, { pressed: false, held: true });
    assert.equal(s.collisions, 0);
  });

  it('pasado el coyote, tocar el fondo del cráter es un choque (y el Rover rebota y sigue)', () => {
    const tr = craterTrack();
    const s = createRun(tr, 1);
    runUntil(s, tr, (st) => st.collisions > 0);
    assert.equal(s.collisions, 1);
    assert.ok(s.invuln > 0 && s.vy > 0, 'rebote e invulnerabilidad');
    runUntil(s, tr, (st) => st.x > tr.obstacles[0].x1 + 15);
    assert.equal(s.collisions, 1, 'el mismo cráter no cuenta dos veces');
    assert.equal(s.status, 'running');
  });

  it('jump buffer: pulsar un poco antes de aterrizar salta al tocar el suelo', () => {
    const tr = buildTrack({ zone: 1, length: 245 });
    const test = (earlySeconds) => {
      const s = createRun(tr, 1);
      runUntil(s, tr, (st) => st.x > 10);
      stepRun(s, tr, { pressed: true, held: true });
      s.events.length = 0;
      assert.equal(s.grounded, false);
      // Cae: espera hasta que falte `earlySeconds` para aterrizar (salto completo ≈ 1,47 s)
      const jumpT = s.t - PHYS.dt;
      const airtime = fullJump(PHYS.baseSpeed).time;
      runUntil(s, tr, (st) => st.t >= jumpT + airtime - earlySeconds, { pressed: false, held: true });
      assert.equal(s.grounded, false, 'aún en el aire');
      const jumpsBefore = s.jumps;
      stepRun(s, tr, { pressed: true, held: false });
      runUntil(s, tr, (st) => st.grounded, { pressed: false, held: false });
      for (let i = 0; i < 3; i++) stepRun(s, tr, NO_INPUT);
      return s.jumps - jumpsBefore;
    };
    assert.equal(test(0.06), 1, 'pulsando 0,06 s antes de aterrizar vuelve a saltar');
    assert.equal(test(0.3), 0, 'pulsando 0,3 s antes no (no hay doble salto en el aire)');
  });

  it('salto variable: mantener pulsado salta más alto que un toque', () => {
    const tr = buildTrack({ zone: 1, length: 245 });
    const apex = (holdSteps) => {
      const s = createRun(tr, 1);
      runUntil(s, tr, (st) => st.x > 10);
      let top = 0;
      for (let i = 0; i < 400; i++) {
        stepRun(s, tr, { pressed: i === 0, held: i < holdSteps });
        top = Math.max(top, s.y);
        if (i > 2 && s.grounded) break;
      }
      return top;
    };
    const tap = apex(1);
    const full = apex(1000);
    assert.ok(full > tap * 1.4, `alto ${full.toFixed(2)} vs toque ${tap.toFixed(2)}`);
    assert.ok(Math.abs(full - fullJump(7).apex) < 0.05, 'el salto completo coincide con la fórmula');
  });

  it('mantener pulsado no hace saltar sin parar (cada salto es un toque nuevo)', () => {
    const tr = buildTrack({ zone: 1, length: 245 });
    const s = createRun(tr, 1);
    stepRun(s, tr, { pressed: true, held: true });
    runUntil(s, tr, (st) => st.t > 6, { pressed: false, held: true });
    assert.equal(s.jumps, 1);
  });
});

describe('paso fijo, abortar y resultado', () => {
  it('la misma carrera da exactamente el mismo resultado (paso fijo)', () => {
    const tr = generateTrack('LUNA-4821', 3);
    const a = simulateRun(tr, 3, makeAutopilot(tr, { rng: mulberry32(9) }));
    const b = simulateRun(tr, 3, makeAutopilot(tr, { rng: mulberry32(9) }));
    assert.deepEqual(a.result, b.result);
    assert.equal(a.state.t, b.state.t);
  });

  it('abortar = regreso de emergencia: aborted y emergency, la mitad de lo recogido', () => {
    const tr = generateTrack('LUNA-4821', 1);
    const s = createRun(tr, 1);
    const pilot = makeAutopilot(tr);
    runUntil(s, tr, (st) => st.collected.metal + st.collected.samples + st.collected.ice >= 3, undefined);
    for (let i = 0; i < 120 * 30 && s.collected.metal + s.collected.samples + s.collected.ice < 5 && s.status === 'running'; i++) {
      stepRun(s, tr, pilot(s));
      s.events.length = 0;
    }
    const found = { ...s.collected };
    abortRun(s);
    assert.equal(s.status, 'aborted');
    const r = runResult(s, tr);
    assert.equal(r.aborted, true);
    assert.equal(r.emergency, true);
    assert.equal(r.completed, false);
    assert.deepEqual(r.collected, halveItems(found));
    assert.ok(r.progress > 0 && r.progress < 1);
    // Abortar otra vez no cambia nada; la carrera ya no avanza
    const x = s.x;
    abortRun(s);
    stepRun(s, tr, { pressed: true, held: true });
    assert.equal(s.x, x);
  });

  it('el resultado tiene la forma del contrato', () => {
    const tr = generateTrack('LUNA-0000', 2);
    const { result } = simulateRun(tr, 2, makeAutopilot(tr));
    assert.deepEqual(Object.keys(result).sort(), ['aborted', 'batteryLeft', 'collected', 'collisions', 'completed', 'emergency', 'progress', 'zone']);
    assert.deepEqual(Object.keys(result.collected).sort(), ['ice', 'metal', 'samples']);
    assert.ok(result.batteryLeft >= 0 && result.batteryLeft <= 100);
    assert.ok(result.progress >= 0 && result.progress <= 1);
  });

  it('el Rover nunca se cae: tras chocar con todo sigue sobre el suelo hasta el final', () => {
    const tr = generateTrack('LUNA-31', 3);
    const s = createRun(tr, 3);
    let lowest = Infinity;
    for (let i = 0; i < 120 * 120 && s.status === 'running'; i++) {
      stepRun(s, tr, NO_INPUT);
      s.events.length = 0;
      lowest = Math.min(lowest, s.y - groundAt(tr, s.x));
    }
    assert.ok(lowest > -1e-6, `por debajo del suelo: ${lowest}`);
  });
});
