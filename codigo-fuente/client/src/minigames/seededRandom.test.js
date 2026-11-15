// Pruebas del azar con semilla de los minijuegos.  Ejecutar: node --test client/src/minigames/
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { derangement, hashString, mulberry32, pickOne, randFloat, randInt, randIntAway, rngFor, shuffle } from './seededRandom.js';

const take = (rng, n) => Array.from({ length: n }, () => rng());

describe('hashString', () => {
  it('es determinista y devuelve un uint32', () => {
    for (const s of ['', 'LUNA-0000', 'LUNA-4821:cables', 'ñandú ☀️🌑', 'x'.repeat(5000)]) {
      const h = hashString(s);
      assert.equal(h, hashString(s));
      assert.ok(Number.isInteger(h) && h >= 0 && h <= 0xffffffff, `${s.slice(0, 12)} → ${h}`);
    }
  });

  it('mantiene valores fijos (cambiarlos cambiaría los tableros compartidos)', () => {
    assert.equal(hashString(''), 2872998923);
    assert.equal(hashString('LUNA-0000'), 1388751425);
    assert.equal(hashString('LUNA-0001'), 2674481874);
    assert.equal(hashString('LUNA-4821:cables'), 263135006);
  });

  it('cambia mucho con una sola letra distinta', () => {
    const a = hashString('LUNA-0000');
    const b = hashString('LUNA-0001');
    const diffBits = (a ^ b).toString(2).replace(/0/g, '').length;
    assert.ok(diffBits >= 8, `solo cambian ${diffBits} bits`);
  });

  it('acepta valores que no son texto sin romperse', () => {
    assert.equal(hashString(undefined), hashString(''));
    assert.equal(hashString(null), hashString(''));
    assert.equal(hashString(1234), hashString('1234'));
  });
});

describe('mulberry32', () => {
  it('misma semilla → misma secuencia; valores fijos conocidos', () => {
    assert.deepEqual(take(mulberry32(42), 5), take(mulberry32(42), 5));
    assert.deepEqual(take(mulberry32(42), 3), [0.6011037519201636, 0.44829055899754167, 0.8524657934904099]);
    assert.deepEqual(take(mulberry32(0), 2), [0.26642920868471265, 0.0003297457005828619]);
  });

  it('semillas distintas → secuencias distintas', () => {
    assert.notDeepEqual(take(mulberry32(1), 4), take(mulberry32(2), 4));
  });

  it('siempre da números en [0, 1) y bien repartidos', () => {
    const rng = mulberry32(hashString('reparto'));
    const buckets = new Array(10).fill(0);
    let sum = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const v = rng();
      assert.ok(v >= 0 && v < 1, `fuera de rango: ${v}`);
      sum += v;
      buckets[Math.floor(v * 10)]++;
    }
    assert.ok(Math.abs(sum / N - 0.5) < 0.02, `media ${sum / N}`);
    for (const b of buckets) assert.ok(b > N / 10 - 300 && b < N / 10 + 300, `cubo con ${b}`);
  });

  it('acepta semillas fuera de uint32 (se recortan a 32 bits)', () => {
    assert.deepEqual(take(mulberry32(2 ** 32 + 7), 3), take(mulberry32(7), 3));
    assert.deepEqual(take(mulberry32(-1), 3), take(mulberry32(0xffffffff), 3));
  });
});

describe('rngFor (semilla + sal)', () => {
  it('es determinista y cada minijuego tiene su propia secuencia', () => {
    assert.deepEqual(take(rngFor('LUNA-4821', ':cables'), 2), [0.04107707692310214, 0.8602075271774083]);
    const panels = take(rngFor('LUNA-4821', ':panels'), 6);
    const cables = take(rngFor('LUNA-4821', ':cables'), 6);
    const antenna = take(rngFor('LUNA-4821', ':antenna'), 6);
    assert.notDeepEqual(panels, cables);
    assert.notDeepEqual(cables, antenna);
    assert.deepEqual(take(rngFor('LUNA-4821', ':panels'), 6), panels);
  });

  it('funciona sin semilla', () => {
    assert.equal(typeof rngFor(undefined)(), 'number');
  });
});

describe('ayudantes', () => {
  it('randInt incluye los dos extremos y nada más', () => {
    const rng = rngFor('dados');
    const seen = new Set();
    for (let i = 0; i < 2000; i++) {
      const v = randInt(rng, 1, 6);
      assert.ok(Number.isInteger(v) && v >= 1 && v <= 6);
      seen.add(v);
    }
    assert.equal(seen.size, 6);
    assert.equal(randInt(rng, 5, 5), 5);
    const swapped = randInt(rng, 9, 3);
    assert.ok(swapped >= 3 && swapped <= 9);
  });

  it('randFloat respeta el intervalo', () => {
    const rng = rngFor('reales');
    for (let i = 0; i < 500; i++) {
      const v = randFloat(rng, -2, 3);
      assert.ok(v >= -2 && v < 3);
    }
  });

  it('pickOne elige de la lista y no rompe con listas vacías', () => {
    const rng = rngFor('elige');
    const list = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) assert.ok(list.includes(pickOne(rng, list)));
    assert.equal(pickOne(rng, []), undefined);
  });

  it('shuffle devuelve una permutación sin tocar el original', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...original];
    const out = shuffle(rngFor('baraja'), original);
    assert.deepEqual(original, copy);
    assert.notEqual(out, original);
    assert.deepEqual([...out].sort((a, b) => a - b), copy);
    assert.deepEqual(shuffle(rngFor('baraja'), original), out);
    assert.deepEqual(shuffle(rngFor('x'), []), []);
  });

  it('derangement: nadie queda en su sitio y es una permutación', () => {
    for (let s = 0; s < 300; s++) {
      for (const n of [2, 3, 4, 5]) {
        const p = derangement(rngFor(`LUNA-${s}`, ':d'), n);
        assert.deepEqual([...p].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i));
        p.forEach((v, i) => assert.notEqual(v, i, `semilla ${s}, n=${n}: ${p}`));
      }
    }
    assert.deepEqual(derangement(rngFor('a'), 1), [0]);
    assert.deepEqual(derangement(rngFor('a'), 0), []);
  });

  it('randIntAway se aleja del valor a evitar', () => {
    const rng = rngFor('lejos');
    for (let i = 0; i < 500; i++) {
      const target = randInt(rng, 12, 88);
      const v = randIntAway(rng, 0, 100, target, 25);
      assert.ok(v >= 0 && v <= 100 && Math.abs(v - target) >= 25, `${v} vs ${target}`);
    }
    // si es imposible, devuelve igualmente un valor del intervalo
    const v = randIntAway(rng, 0, 10, 5, 50);
    assert.ok(v >= 0 && v <= 10);
  });
});
