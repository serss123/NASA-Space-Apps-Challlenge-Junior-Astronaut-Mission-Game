// Pruebas de server/src/timelineService.js: funciones puras y el servicio con un fetch falso (nunca la red real).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  HttpError,
  LIMITS,
  TIMELINE_DONKI_TYPES,
  checkRange,
  createCallBudget,
  createTimelineService,
  daysBetween,
  failureReason,
  fallbackMessage,
  isInside,
  labelForRange,
  liveRange,
  overlaps,
  parseDateParam,
  parseEnumParam,
  parseIntParam,
  singleParam,
  sliceTimeline,
  withDeadline
} from '../src/timelineService.js';
import * as serverTranslator from '../src/gameTranslator.js';
import * as sharedTranslator from '../../shared/gameTranslator.js';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARCHIVE = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'data', 'archive-may-2024.json'), 'utf8'));
const RAW = JSON.parse(fs.readFileSync(path.join(SERVER_DIR, 'data', 'raw-may-2024.json'), 'utf8'));
const TODAY = '2026-11-14';

/** fetch falso de DONKI: responde [] (o lo que diga `byType`) y apunta cada llamada. */
function fakeDonki(byType = {}, { delayMs = 0 } = {}) {
  const calls = [];
  const fetchImpl = async (url) => {
    const u = new URL(String(url));
    calls.push(u);
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    const type = u.pathname.split('/').pop();
    return new Response(JSON.stringify(byType[type] ?? []), { status: 200 });
  };
  return { fetchImpl, calls };
}

function makeService(opts = {}) {
  return createTimelineService({ archive: ARCHIVE, raw: RAW, now: () => new Date(`${TODAY}T12:00:00Z`), logger: null, donkiRetries: 0, ...opts });
}

const expectHttp = (fn, status, code) =>
  assert.throws(fn, (err) => err instanceof HttpError && err.status === status && err.code === code && Boolean(err.messages.es && err.messages.en));

describe('parámetros de la URL', () => {
  test('singleParam: falta, viene o se repite', () => {
    assert.equal(singleParam({}, 'a'), undefined);
    assert.equal(singleParam({ a: '' }, 'a'), undefined);
    assert.equal(singleParam({ a: ' 7 ' }, 'a'), '7');
    expectHttp(() => singleParam({ a: ['1', '2'] }, 'a'), 400, 'repeated-param');
  });

  test('parseDateParam solo admite fechas reales', () => {
    assert.equal(parseDateParam({ d: '2024-05-14' }, 'd'), '2024-05-14');
    assert.equal(parseDateParam({}, 'd'), undefined);
    expectHttp(() => parseDateParam({ d: '2024-02-30' }, 'd'), 400, 'bad-date');
    expectHttp(() => parseDateParam({ d: '14/05/2024' }, 'd'), 400, 'bad-date');
  });

  test('parseIntParam: enteros dentro del margen', () => {
    const range = { min: 7, max: 30, def: 21 };
    assert.equal(parseIntParam({}, 'days', range), 21);
    assert.equal(parseIntParam({ days: '7' }, 'days', range), 7);
    assert.equal(parseIntParam({ days: '30' }, 'days', range), 30);
    for (const bad of ['6', '31', '21.5', '-7', '1e1', 'abc', '0x10']) expectHttp(() => parseIntParam({ days: bad }, 'days', range), 400, 'bad-number');
  });

  test('parseEnumParam: valor permitido, por defecto, o error', () => {
    assert.equal(parseEnumParam({}, 'mode', ['daily', 'eventsOnly'], 'daily'), 'daily');
    assert.equal(parseEnumParam({ mode: 'eventsOnly' }, 'mode', ['daily', 'eventsOnly'], 'daily'), 'eventsOnly');
    assert.equal(parseEnumParam({ type: 'sep' }, 'type', ['all', 'SEP'], 'all', { ignoreCase: true }), 'SEP');
    expectHttp(() => parseEnumParam({ mode: 'hourly' }, 'mode', ['daily', 'eventsOnly'], 'daily'), 400, 'bad-option');
  });
});

describe('rangos de fechas', () => {
  test('checkRange acepta un rango correcto y cuenta los días', () => {
    assert.deepEqual(checkRange('2024-05-01', '2024-05-21', { maxDays: 120, today: TODAY }), { startDate: '2024-05-01', endDate: '2024-05-21', days: 21 });
    assert.equal(checkRange(TODAY, TODAY, { maxDays: 1, today: TODAY }).days, 1);
  });

  test('checkRange rechaza: falta una fecha, orden al revés, futuro y demasiados días', () => {
    expectHttp(() => checkRange('2024-05-01', undefined, { maxDays: 120, today: TODAY }), 400, 'missing-date');
    expectHttp(() => checkRange('2024-05-10', '2024-05-01', { maxDays: 120, today: TODAY }), 400, 'range-order');
    expectHttp(() => checkRange('2026-11-10', '2026-11-15', { maxDays: 120, today: TODAY }), 400, 'future-date');
    expectHttp(() => checkRange('2024-01-01', '2024-04-30', { maxDays: 120, today: TODAY }), 400, 'range-too-long'); // 121 días
  });

  test('daysBetween, isInside y overlaps', () => {
    assert.equal(daysBetween('2024-05-01', '2024-05-21'), 20);
    const w = { from: '2024-05-01', to: '2024-05-21' };
    assert.equal(isInside('2024-05-10', '2024-05-12', w), true);
    assert.equal(isInside('2024-04-30', '2024-05-12', w), false);
    assert.equal(overlaps('2024-04-30', '2024-05-01', w), true);
    assert.equal(overlaps('2024-05-22', '2024-05-30', w), false);
    assert.equal(isInside('2024-05-10', '2024-05-12', null), false);
  });

  test('liveRange: los últimos N días terminando hoy', () => {
    assert.deepEqual(liveRange(TODAY, 21), { startDate: '2026-10-25', endDate: TODAY });
    assert.deepEqual(liveRange(TODAY, 7), { startDate: '2026-11-08', endDate: TODAY });
  });

  test('labelForRange: EN VIVO solo si llega a los 3 últimos días', () => {
    assert.equal(labelForRange(TODAY, TODAY), 'EN VIVO');
    assert.equal(labelForRange('2026-11-12', TODAY), 'EN VIVO');
    assert.equal(labelForRange('2026-11-11', TODAY), 'ARCHIVO');
    assert.equal(labelForRange('2024-05-21', TODAY), 'ARCHIVO');
  });

  test('sliceTimeline recorta la copia ARCHIVO, aplica el modo y renumera', () => {
    const slice = sliceTimeline(ARCHIVE.timeline, '2024-05-10', '2024-05-12');
    assert.deepEqual(slice.map((d) => [d.date, d.index, d.gameDay]), [['2024-05-10', 0, 1], ['2024-05-11', 1, 2], ['2024-05-12', 2, 3]]);
    const events = sliceTimeline(ARCHIVE.timeline, '2024-05-01', '2024-05-21', { mode: 'eventsOnly' });
    assert.ok(events.every((d) => !d.calm));
    assert.equal(events.length, ARCHIVE.timeline.filter((d) => !d.calm).length);
    assert.equal(sliceTimeline(ARCHIVE.timeline, '2024-05-01', '2024-05-21', { stepDays: 7 }).length, 3);
    assert.equal(ARCHIVE.timeline[9].index, 9, 'no modifica la copia original');
  });
});

describe('fallos y protección de la cuota', () => {
  test('failureReason da un motivo corto', () => {
    assert.equal(failureReason(Object.assign(new Error('x'), { code: 'timeout' })), 'timeout');
    assert.equal(failureReason(new DOMException('t', 'TimeoutError')), 'timeout');
    assert.equal(failureReason(Object.assign(new Error('x'), { code: 'quota', status: 429 })), 'quota');
    assert.equal(failureReason(Object.assign(new Error('x'), { status: 429 })), 'rate-limited');
    assert.equal(failureReason(Object.assign(new Error('x'), { status: 503 })), 'http-503');
    assert.equal(failureReason(new SyntaxError('Unexpected token')), 'bad-data');
    assert.equal(failureReason(new TypeError('fetch failed')), 'network');
  });

  test('fallbackMessage explica en los dos idiomas que se juega con la copia ARCHIVO', () => {
    for (const reason of ['timeout', 'quota', 'rate-limited', 'network']) {
      const m = fallbackMessage(reason);
      assert.match(m.es, /ARCHIVO/);
      assert.match(m.en, /ARCHIVE/);
      // Kid language: it names NASA, not the technical database, and gives no error codes.
      for (const text of [m.es, m.en]) assert.ok(!/DONKI|http-|timeout|quota|network|rate-limited/.test(text), text);
    }
  });

  test('createCallBudget: tope por hora con ventana deslizante', () => {
    let t = 0;
    const budget = createCallBudget({ max: 2, windowMs: 1000, now: () => t });
    budget.take();
    t = 500;
    budget.take();
    assert.throws(() => budget.take(), (err) => err.code === 'quota' && err.status === 429);
    t = 1000; // la primera llamada ya salió de la ventana
    budget.take();
    assert.equal(budget.used(), 2);
  });

  test('withDeadline corta una promesa lenta con un error "timeout"', async () => {
    let aborted = false;
    const slow = new Promise((r) => setTimeout(r, 1000).unref());
    await assert.rejects(withDeadline(slow, 20, () => (aborted = true)), (err) => err.code === 'timeout');
    assert.equal(aborted, true);
    assert.equal(await withDeadline(Promise.resolve('rápido'), 1000), 'rápido');
  });
});

describe('createTimelineService', () => {
  test('exige una copia ARCHIVO válida', () => {
    assert.throws(() => createTimelineService({ archive: { meta: {}, timeline: [] } }), /ARCHIVE copy/);
  });

  test('getArchive devuelve la copia guardada tal cual, etiquetada ARCHIVO', () => {
    const service = makeService();
    const a = service.getArchive();
    assert.equal(a.preset, 'archive');
    assert.equal(a.source, 'ARCHIVO');
    assert.equal(a.fallback, false);
    assert.equal(a.totalDays, 21);
    assert.equal(a.timeline, ARCHIVE.timeline);
    assert.equal(a.summary, ARCHIVE.summary);
    assert.equal(service.getArchive(), a, 'se prepara una sola vez');
    const calm = service.getArchive({ mode: 'eventsOnly' });
    assert.equal(calm.totalDays, ARCHIVE.timeline.filter((d) => !d.calm).length);
  });

  test('getLive descarga una ventana de 30 días con 7 llamadas y la reutiliza para cualquier `days`', async () => {
    const { fetchImpl, calls } = fakeDonki();
    const service = makeService({ fetchImpl });
    const a = await service.getLive({ days: 21 });
    assert.equal(calls.length, TIMELINE_DONKI_TYPES.length);
    assert.deepEqual(new Set(calls.map((u) => u.pathname.split('/').pop())), new Set(TIMELINE_DONKI_TYPES));
    assert.ok(calls.every((u) => u.searchParams.get('startDate') === '2026-10-16' && u.searchParams.get('endDate') === TODAY));
    assert.equal(a.startDate, '2026-10-25');
    assert.equal(a.totalDays, 21);
    const b = await service.getLive({ days: LIMITS.liveMinDays });
    assert.equal(b.totalDays, 7);
    assert.equal(calls.length, TIMELINE_DONKI_TYPES.length, 'sin llamadas nuevas');
    assert.deepEqual(service.usage(), { donkiCallsLastHour: 7, radlabCallsLastHour: 0 });
  });

  test('dos misiones EN VIVO a la vez comparten la misma descarga', async () => {
    const { fetchImpl, calls } = fakeDonki({}, { delayMs: 30 });
    const service = makeService({ fetchImpl });
    const [a, b] = await Promise.all([service.getLive(), service.getLive()]);
    assert.equal(calls.length, 7);
    assert.equal(a, b);
  });

  test('si se agota el tope de llamadas por hora, la misión EN VIVO pasa a ARCHIVO sin tocar la red', async () => {
    const { fetchImpl, calls } = fakeDonki();
    const service = makeService({ fetchImpl, donkiHourlyLimit: 3 });
    const r = await service.getLive();
    assert.equal(r.fallback, true);
    assert.equal(r.fallbackReason, 'quota');
    assert.equal(r.source, 'ARCHIVO');
    assert.ok(calls.length <= 3);
  });

  test('getCustom marca ARCHIVO los datos históricos y usa la radiación MEDIDA guardada de mayo de 2024', async () => {
    const { fetchImpl } = fakeDonki();
    const service = makeService({ fetchImpl });
    const r = await service.getCustom({ startDate: '2024-05-10', endDate: '2024-05-12' });
    assert.equal(r.preset, 'custom');
    assert.equal(r.source, 'ARCHIVO');
    assert.equal(r.meta.radlab, 'ARCHIVO');
    assert.match(r.meta.note.es, /ARCHIVO/);
    assert.match(r.meta.note.en, /ARCHIVE/);
    assert.ok(r.timeline.every((d) => d.source === 'ARCHIVO' && d.radiation.basis === 'measured'));
    // Mismas medidas que la misión ARCHIVO para esos días
    const archived = ARCHIVE.timeline.filter((d) => d.date >= '2024-05-10' && d.date <= '2024-05-12');
    assert.deepEqual(r.timeline.map((d) => d.radiation.multiplier), archived.map((d) => d.radiation.multiplier));
  });
});

describe('server/src/gameTranslator.js', () => {
  test('re-exporta el traductor compartido', () => {
    assert.deepEqual(Object.keys(serverTranslator).sort(), Object.keys(sharedTranslator).sort());
    assert.equal(serverTranslator.buildTimeline, sharedTranslator.buildTimeline);
  });
});
