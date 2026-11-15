// Pruebas de shared/marsDelay.js (retraso de la señal Tierra–Marte y Tierra–Luna, CALCULADO).
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { eachDay } from './dates.js';
import { earthMarsLightTime, earthMoonLightTime, formatDelay } from './marsDelay.js';

const near = (actual, expected, tolerance, label) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} no está a ±${tolerance} de ${expected}`);

describe('earthMarsLightTime', () => {
  test('el 14 de noviembre de 2026 la señal tarda unos 11 minutos', () => {
    const r = earthMarsLightTime('2026-11-14');
    near(r.minutes, 11.0, 0.3, 'minutos');
    near(r.seconds / 60, 11.0, 0.3, 'segundos / 60');
    assert.ok(Number.isInteger(r.km) && Number.isInteger(r.seconds));
  });

  test('el acercamiento récord del 27 de agosto de 2003: unos 55,8 millones de km', () => {
    const { km, au } = earthMarsLightTime('2003-08-27');
    near(km, 55.8e6, 55.8e6 * 0.01, 'km');
    near(au, 0.373, 0.005, 'UA');
  });

  test('acepta una fecha (Date) igual que una cadena (mediodía UTC)', () => {
    assert.deepEqual(earthMarsLightTime(new Date('2026-11-14T12:00:00Z')), earthMarsLightTime('2026-11-14'));
  });

  test('el retraso siempre está entre el mínimo y el máximo posibles (≈ 3 y 22 minutos)', () => {
    for (const d of ['2018-07-31', '2020-10-06', '2021-10-08', '2024-05-14', '2026-11-14', '2035-09-15']) {
      const { minutes } = earthMarsLightTime(d);
      assert.ok(minutes >= 3 && minutes <= 22.5, `${d}: ${minutes} min`);
    }
  });
});

describe('earthMoonLightTime', () => {
  test('la señal a la Luna tarda entre 1,2 y 1,36 s', () => {
    const r = earthMoonLightTime('2026-11-14');
    assert.ok(r.seconds >= 1.2 && r.seconds <= 1.36, `${r.seconds} s`);
    assert.ok(r.km > 356000 && r.km < 407000, `${r.km} km`);
  });

  test('todos los días de la misión de mayo de 2024 están en ese margen', () => {
    for (const d of eachDay('2024-05-01', '2024-05-21')) {
      const { seconds } = earthMoonLightTime(d);
      assert.ok(seconds >= 1.2 && seconds <= 1.36, `${d}: ${seconds} s`);
    }
  });
});

describe('formatDelay', () => {
  test('menos de un minuto: decimales según el idioma', () => {
    assert.equal(formatDelay(1.3, 'es'), '1,3 s');
    assert.equal(formatDelay(1.3, 'en'), '1.3 s');
  });

  test('minutos y segundos', () => {
    assert.equal(formatDelay(659, 'es'), '10 min 59 s');
    assert.equal(formatDelay(660, 'en'), '11 min 0 s');
    assert.equal(formatDelay(60, 'es'), '1 min 0 s');
  });

  test('nunca muestra "60 s" al redondear', () => {
    assert.equal(formatDelay(659.6, 'es'), '11 min 0 s');
    assert.equal(formatDelay(119.5, 'en'), '2 min 0 s');
  });
});
