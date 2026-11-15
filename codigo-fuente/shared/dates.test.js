// Pruebas de shared/dates.js (fechas UTC 'AAAA-MM-DD').
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { DAY_MS, addDays, dayOf, eachDay, isISODate, parseDay, timeOf, toDay, todayUTC } from './dates.js';

describe('eachDay', () => {
  test('incluye el primer y el último día', () => {
    assert.deepEqual(eachDay('2024-05-01', '2024-05-03'), ['2024-05-01', '2024-05-02', '2024-05-03']);
  });

  test('cruza meses y años sin saltarse días', () => {
    assert.deepEqual(eachDay('2024-04-29', '2024-05-02'), ['2024-04-29', '2024-04-30', '2024-05-01', '2024-05-02']);
    assert.deepEqual(eachDay('2024-12-31', '2025-01-01'), ['2024-12-31', '2025-01-01']);
  });

  test('un solo día y rangos al revés', () => {
    assert.deepEqual(eachDay('2024-05-14', '2024-05-14'), ['2024-05-14']);
    assert.deepEqual(eachDay('2024-05-14', '2024-05-01'), []);
  });

  test('la misión de mayo de 2024 tiene 21 días', () => {
    assert.equal(eachDay('2024-05-01', '2024-05-21').length, 21);
  });
});

describe('addDays', () => {
  test('cruza el final de mes y de año', () => {
    assert.equal(addDays('2024-01-31', 1), '2024-02-01');
    assert.equal(addDays('2024-04-30', 1), '2024-05-01');
    assert.equal(addDays('2024-12-31', 1), '2025-01-01');
  });

  test('respeta los años bisiestos', () => {
    assert.equal(addDays('2024-02-28', 1), '2024-02-29');
    assert.equal(addDays('2023-02-28', 1), '2023-03-01');
    assert.equal(addDays('2024-03-01', -1), '2024-02-29');
  });

  test('admite días negativos y cero', () => {
    assert.equal(addDays('2026-11-14', -20), '2026-10-25');
    assert.equal(addDays('2026-11-14', 0), '2026-11-14');
  });
});

describe('isISODate', () => {
  test('acepta fechas reales AAAA-MM-DD', () => {
    for (const s of ['2024-05-01', '2024-02-29', '2026-11-14', '1999-12-31']) assert.equal(isISODate(s), true, s);
  });

  test('rechaza fechas que no existen (aunque Date.parse las acepte)', () => {
    for (const s of ['2024-02-30', '2023-02-29', '2024-04-31', '2024-13-01', '2024-00-10', '2024-01-32']) assert.equal(isISODate(s), false, s);
  });

  test('rechaza otros formatos y tipos', () => {
    for (const s of ['2024-5-1', '20240501', '2024/05/01', '2024-05-01T00:00Z', ' 2024-05-01', '', 'mañana', null, undefined, 20240501, {}]) {
      assert.equal(isISODate(s), false, String(s));
    }
  });
});

describe('otras utilidades', () => {
  test('parseDay y toDay son inversas', () => {
    assert.equal(parseDay('2024-05-14'), Date.UTC(2024, 4, 14));
    assert.equal(toDay(parseDay('2024-05-14')), '2024-05-14');
    assert.equal(parseDay('2024-05-15') - parseDay('2024-05-14'), DAY_MS);
  });

  test('dayOf y timeOf leen marcas ISO de DONKI', () => {
    assert.equal(dayOf('2024-05-11T01:23Z'), '2024-05-11');
    assert.equal(timeOf('2024-05-11T01:23Z'), '01:23');
    assert.equal(dayOf(null), null);
    assert.equal(dayOf('2024'), null);
    assert.equal(timeOf('2024-05-11'), '');
  });

  test('todayUTC usa la fecha UTC, no la local', () => {
    assert.equal(todayUTC(new Date('2026-11-14T23:59:59Z')), '2026-11-14');
    assert.equal(todayUTC(new Date('2026-11-15T00:00:00Z')), '2026-11-15');
  });
});
