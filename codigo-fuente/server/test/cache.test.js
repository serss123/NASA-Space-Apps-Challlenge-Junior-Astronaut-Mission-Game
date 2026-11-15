// Pruebas de server/src/cache.js con un reloj falso (sin esperar de verdad).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createCache } from '../src/cache.js';

function fakeClock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

describe('createCache · get/set/has', () => {
  test('guarda y devuelve valores hasta que caducan', () => {
    const clock = fakeClock();
    const cache = createCache({ now: clock.now });
    cache.set('a', { x: 1 }, 1000);
    assert.deepEqual(cache.get('a'), { x: 1 });
    assert.equal(cache.has('a'), true);
    clock.advance(999);
    assert.equal(cache.has('a'), true);
    clock.advance(1);
    assert.equal(cache.get('a'), undefined);
    assert.equal(cache.has('a'), false);
    assert.equal(cache.size, 0);
  });

  test('guarda valores "falsos" (0, false, cadena vacía) pero no undefined', () => {
    const cache = createCache({ now: fakeClock().now });
    cache.set('zero', 0, 1000);
    cache.set('no', false, 1000);
    cache.set('empty', '', 1000);
    cache.set('nothing', undefined, 1000);
    assert.equal(cache.get('zero'), 0);
    assert.equal(cache.get('no'), false);
    assert.equal(cache.get('empty'), '');
    assert.equal(cache.has('nothing'), false);
  });

  test('delete y clear', () => {
    const cache = createCache({ now: fakeClock().now });
    cache.set('a', 1, 1000);
    cache.set('b', 2, 1000);
    cache.delete('a');
    assert.equal(cache.has('a'), false);
    cache.clear();
    assert.equal(cache.size, 0);
  });

  test('si se llena, borra primero las caducadas y después la más antigua', () => {
    const clock = fakeClock();
    const cache = createCache({ now: clock.now, maxEntries: 3 });
    cache.set('viejo', 1, 10);
    cache.set('a', 2, 1000);
    cache.set('b', 3, 1000);
    clock.advance(20); // 'viejo' caduca
    cache.set('c', 4, 1000);
    assert.deepEqual(['viejo', 'a', 'b', 'c'].map((k) => cache.has(k)), [false, true, true, true]);
    cache.set('d', 5, 1000); // llena: sale 'a', la más antigua
    assert.deepEqual(['a', 'b', 'c', 'd'].map((k) => cache.has(k)), [false, true, true, true]);
    assert.equal(cache.size, 3);
  });
});

describe('createCache · wrap', () => {
  test('llama a fn una vez y después responde desde la caché', async () => {
    const cache = createCache({ now: fakeClock().now });
    let calls = 0;
    const fn = async () => ++calls;
    assert.equal(await cache.wrap('k', 1000, fn), 1);
    assert.equal(await cache.wrap('k', 1000, fn), 1);
    assert.equal(calls, 1);
  });

  test('cuando caduca, vuelve a llamar a fn', async () => {
    const clock = fakeClock();
    const cache = createCache({ now: clock.now });
    let calls = 0;
    const fn = async () => ++calls;
    await cache.wrap('k', 1000, fn);
    clock.advance(1000);
    assert.equal(await cache.wrap('k', 1000, fn), 2);
  });

  test('peticiones iguales a la vez comparten UNA sola llamada', async () => {
    const cache = createCache({ now: fakeClock().now });
    let calls = 0;
    let release;
    const gate = new Promise((r) => (release = r));
    const fn = async () => {
      calls += 1;
      await gate;
      return 'datos';
    };
    const pending = [cache.wrap('k', 1000, fn), cache.wrap('k', 1000, fn), cache.wrap('k', 1000, fn)];
    assert.equal(cache.isPending('k'), true);
    release();
    assert.deepEqual(await Promise.all(pending), ['datos', 'datos', 'datos']);
    assert.equal(calls, 1);
    assert.equal(cache.isPending('k'), false);
  });

  test('si fn falla no se guarda nada: la siguiente vez lo vuelve a intentar', async () => {
    const cache = createCache({ now: fakeClock().now });
    let calls = 0;
    const flaky = async () => {
      calls += 1;
      if (calls === 1) throw new Error('DONKI caído');
      return 'ok';
    };
    await assert.rejects(cache.wrap('k', 1000, flaky), /DONKI caído/);
    assert.equal(cache.has('k'), false);
    assert.equal(cache.isPending('k'), false);
    assert.equal(await cache.wrap('k', 1000, flaky), 'ok');
    assert.equal(calls, 2);
  });

  test('un error síncrono en fn también llega como promesa rechazada', async () => {
    const cache = createCache({ now: fakeClock().now });
    await assert.rejects(
      cache.wrap('k', 1000, () => {
        throw new Error('roto');
      }),
      /roto/
    );
  });

  test('el TTL puede depender del valor', async () => {
    const clock = fakeClock();
    const cache = createCache({ now: clock.now });
    const ttl = (v) => (v.partial ? 100 : 10_000);
    await cache.wrap('parcial', ttl, async () => ({ partial: true }));
    await cache.wrap('completo', ttl, async () => ({ partial: false }));
    clock.advance(100);
    assert.equal(cache.has('parcial'), false);
    assert.equal(cache.has('completo'), true);
  });
});
