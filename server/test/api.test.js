// Pruebas de la API HTTP: la app se arranca en un puerto libre (listen(0)) con un fetch FALSO.
// Nunca se llama a la red real: DONKI y RadLab se simulan con respuestas pequeñas.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { createApp } from '../src/app.js';
import { RADLAB_BASE } from '../src/radlab.js';

const TODAY = '2026-11-14';

// ---------- DONKI falso (formato crudo de la API; el servidor lo compacta) ----------
const CME_ID = '2026-11-10T11:00:00-CME-001';
const DONKI_FIXTURE = {
  FLR: [
    {
      flrID: '2026-11-10T09:50:00-FLR-001',
      beginTime: '2026-11-10T09:50Z',
      peakTime: '2026-11-10T10:00Z',
      endTime: '2026-11-10T10:20Z',
      classType: 'X2.1',
      sourceLocation: 'S10W20',
      activeRegionNum: 14000,
      link: 'test://FLR/1',
      linkedEvents: [{ activityID: CME_ID }]
    }
  ],
  CME: [
    {
      activityID: CME_ID,
      startTime: '2026-11-10T11:00Z',
      sourceLocation: 'S10W20',
      activeRegionNum: 14000,
      note: 'CME de prueba',
      cmeAnalyses: [{ isMostAccurate: true, speed: 1500, type: 'O', halfAngle: 45 }],
      link: 'test://CME/1',
      linkedEvents: null
    }
  ],
  SEP: [{ sepID: '2026-11-10T12:00:00-SEP-001', eventTime: '2026-11-10T12:00Z', instruments: [{ displayName: 'GOES-P: EPS 10 MeV' }], link: 'test://SEP/1', linkedEvents: null }],
  GST: [
    {
      gstID: '2026-11-12T03:00:00-GST-001',
      startTime: '2026-11-12T03:00Z',
      allKpIndex: [{ observedTime: '2026-11-12T03:00Z', kpIndex: 7, source: 'NOAA' }],
      link: 'test://GST/1',
      linkedEvents: null
    }
  ],
  IPS: [{ activityID: '2026-11-12T01:00:00-IPS-001', eventTime: '2026-11-12T01:00Z', location: 'Earth', link: 'test://IPS/1', linkedEvents: [{ activityID: CME_ID }] }],
  WSAEnlilSimulations: [
    {
      simulationID: 'WSA-ENLIL/1/1',
      modelCompletionTime: '2026-11-10T15:00Z',
      estimatedShockArrivalTime: '2026-11-12T00:00Z',
      impactList: [],
      cmeInputs: [{ cmeid: CME_ID, cmeStartTime: '2026-11-10T11:00Z', speed: 1500, isMostAccurate: true }],
      link: 'test://WSA/1'
    }
  ],
  notifications: [
    {
      messageType: 'SEP',
      messageID: '20261110-AL-002',
      messageURL: 'test://note/2',
      messageIssueTime: '2026-11-10T13:00Z',
      messageBody: '## Message Type: Space Weather Notification - SEP\n\n## Summary:\n\nSolar particles above threshold.\n\n## Notes:\n\nTest.'
    },
    {
      messageType: 'FLR',
      messageID: '20261110-AL-001',
      messageURL: 'test://note/1',
      messageIssueTime: '2026-11-10T10:30Z',
      messageBody: '## Message Type: Space Weather Notification - FLR\n\n## Summary:\n\nX2.1 flare detected.\n\n## Notes:\n\nTest.'
    }
  ]
};

/** fetch falso: DONKI responde DONKI_FIXTURE; RadLab, unas pocas lecturas. Apunta cada llamada. */
function fakeNasa({ fail = null, hang = false, delayMs = 0 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(String(url));
    calls.push(u);
    if (hang) {
      return new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(init.signal.reason ?? new Error('aborted'))));
    }
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    if (fail === 'throw') throw new TypeError('fetch failed');
    if (typeof fail === 'number') return new Response('fallo', { status: fail });
    if (String(url).startsWith(RADLAB_BASE)) return radlabResponse(u);
    const type = u.pathname.split('/').pop();
    return new Response(JSON.stringify(DONKI_FIXTURE[type] ?? []), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  return { fetchImpl, calls };
}

function radlabResponse(u) {
  const day = (u.search.match(/timestamp%3E=(\d{4}-\d{2}-\d{2})/) || u.search.match(/timestamp>=(\d{4}-\d{2}-\d{2})/))?.[1] ?? 'x';
  const data = [
    [`${day}T01:00:00`, 'CRaTER-D1D2', 10],
    [`${day}T02:00:00`, 'CRaTER-D1D2', 14],
    [`${day}T01:00:00`, 'DosTel1', 5]
  ];
  return new Response(JSON.stringify({ columns: ['timestamp', 'instrument_id', 'absorbed_dose_rate'], data }), { status: 200 });
}

/** Reloj que se puede adelantar en las pruebas. */
function fakeClock(iso = `${TODAY}T12:00:00Z`) {
  let t = Date.parse(iso);
  return { now: () => new Date(t), advance: (ms) => (t += ms) };
}

/** Arranca la app en un puerto libre. Devuelve { get, close, calls, clock }. */
async function start(options = {}) {
  const nasa = options.nasa ?? fakeNasa();
  const clock = options.clock ?? fakeClock();
  const app = createApp({ fetchImpl: nasa.fetchImpl, now: clock.now, logger: null, donkiRetries: 0, clientDist: null, ...options.app });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    calls: nasa.calls,
    clock,
    get: (p, init) => fetch(base + p, init),
    json: async (p, init) => {
      const res = await fetch(base + p, init);
      return { res, body: await res.json() };
    },
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      })
  };
}

const dayOn = (body, date) => body.timeline.find((d) => d.date === date);

// ---------------------------------------------------------------------------

describe('GET /api/health', () => {
  test('responde ok, hora, tiempo encendido y versión', async (t) => {
    const s = await start();
    t.after(s.close);
    const { res, body } = await s.json('/api/health');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/json; charset=utf-8/);
    assert.equal(body.ok, true);
    assert.equal(body.time, `${TODAY}T12:00:00.000Z`);
    assert.equal(typeof body.uptime, 'number');
    assert.match(body.version, /^\d+\.\d+\.\d+/);
  });
});

describe('GET /api/game/timeline · ARCHIVO', () => {
  test('por defecto devuelve la copia ARCHIVO sin llamar a DONKI', async (t) => {
    const s = await start();
    t.after(s.close);
    for (const p of ['/api/game/timeline', '/api/game/timeline?preset=archive']) {
      const { res, body } = await s.json(p);
      assert.equal(res.status, 200);
      assert.equal(body.preset, 'archive');
      assert.equal(body.source, 'ARCHIVO');
      assert.equal(body.fallback, false);
      assert.equal(body.mode, 'daily');
      assert.equal(body.totalDays, 21);
      assert.equal(body.startDate, '2024-05-01');
      assert.equal(body.endDate, '2024-05-21');
      assert.ok(body.generatedAt);
      assert.equal(body.meta.id, 'moon-may-2024');
      assert.deepEqual(body.summary.maxFlare, { c: 'X8.7', date: '2024-05-14' });
      assert.equal(body.timeline.length, 21);
      assert.ok(body.timeline.every((d) => d.source === 'ARCHIVO'));
    }
    assert.equal(s.calls.length, 0);
  });

  test('admite mode=eventsOnly (sin días despejados)', async (t) => {
    const s = await start();
    t.after(s.close);
    const { body } = await s.json('/api/game/timeline?preset=archive&mode=eventsOnly');
    assert.ok(body.totalDays < 21);
    assert.ok(body.timeline.every((d) => !d.calm));
    assert.deepEqual(body.timeline.map((d) => d.gameDay), body.timeline.map((_, i) => i + 1));
  });
});

describe('GET /api/game/timeline?preset=live', () => {
  test('últimos 21 días de DONKI, etiquetados EN VIVO y con la radiación estimada', async (t) => {
    const s = await start();
    t.after(s.close);
    const { res, body } = await s.json('/api/game/timeline?preset=live&days=21');
    assert.equal(res.status, 200);
    assert.equal(body.preset, 'live');
    assert.equal(body.source, 'EN VIVO');
    assert.equal(body.fallback, false);
    assert.equal(body.totalDays, 21);
    assert.equal(body.startDate, '2026-10-25');
    assert.equal(body.endDate, TODAY);
    assert.equal(body.meta.source, 'EN VIVO');
    assert.ok(body.meta.note.es && body.meta.note.en);
    assert.equal(body.meta.title.es, 'El Sol de hoy: los últimos 21 días'); // mission name of docs/DESIGN.md §4
    assert.equal(body.meta.title.en, 'Today’s Sun: the last 21 days');
    assert.ok(body.timeline.every((d) => d.source === 'EN VIVO' && d.radiation.basis === 'estimated'));
    assert.ok(body.timeline.every((d) => Array.isArray(d.kid) && d.kid.length <= 3), 'every LIVE day carries its kid facts');

    const flareDay = dayOn(body, '2026-11-10');
    assert.equal(flareDay.flares.max, 'X2.1');
    assert.equal(flareDay.radiation.level, 2); // SEP
    assert.equal(flareDay.triggers.cables, 0.8); // llamarada X
    assert.equal(flareDay.cmes.fastest.speed, 1500);
    assert.equal(dayOn(body, '2026-11-11').radiation.level, 1); // partículas que siguen
    const shockDay = dayOn(body, '2026-11-12');
    assert.equal(shockDay.radiation.level, 2); // choque de una CME de 1500 km/s
    assert.equal(shockDay.geomagnetic.kpMax, 7);
    assert.equal(shockDay.triggers.antenna, 0.6);
    assert.equal(shockDay.triggers.panels, 0.4);
    assert.equal(body.summary.maxFlare.c, 'X2.1');

    // 7 tipos de DONKI, una ventana de 30 días, sin MPC/RBE/HSS
    const types = s.calls.map((u) => u.pathname.split('/').pop()).sort();
    assert.deepEqual(types, ['CME', 'FLR', 'GST', 'IPS', 'SEP', 'WSAEnlilSimulations', 'notifications']);
    assert.ok(s.calls.every((u) => u.origin === 'https://ccmc.gsfc.nasa.gov' && u.searchParams.get('endDate') === TODAY));
    assert.equal(s.calls.find((u) => u.pathname.endsWith('/notifications')).searchParams.get('type'), 'all');
  });

  test('days cambia la ventana (7..30) y usa la misma descarga', async (t) => {
    const s = await start();
    t.after(s.close);
    const a = await s.json('/api/game/timeline?preset=live&days=7');
    const b = await s.json('/api/game/timeline?preset=live&days=30');
    assert.equal(a.body.totalDays, 7);
    assert.equal(a.body.startDate, '2026-11-08');
    assert.equal(b.body.totalDays, 30);
    assert.equal(s.calls.length, 7);
  });

  test('si DONKI falla: 200 con la copia ARCHIVO, fallback:true y nunca etiquetada EN VIVO', async (t) => {
    const s = await start({ nasa: fakeNasa({ fail: 'throw' }) });
    t.after(s.close);
    const { res, body } = await s.json('/api/game/timeline?preset=live');
    assert.equal(res.status, 200);
    assert.equal(body.fallback, true);
    assert.equal(body.source, 'ARCHIVO');
    assert.equal(body.preset, 'archive');
    assert.equal(body.requestedPreset, 'live');
    assert.equal(body.fallbackReason, 'network');
    assert.match(body.fallbackMessage.es, /ARCHIVO/);
    assert.match(body.fallbackMessage.en, /ARCHIVE/);
    assert.equal(body.totalDays, 21);
    assert.equal(body.startDate, '2024-05-01');
    assert.ok(body.timeline.every((d) => d.source === 'ARCHIVO'));
    assert.ok(!JSON.stringify(body).includes('EN VIVO'), 'ningún dato de la copia se presenta como EN VIVO');

    // Durante 2 minutos no se vuelve a molestar a DONKI
    const callsAfterFirst = s.calls.length;
    const again = await s.json('/api/game/timeline?preset=live');
    assert.equal(again.body.fallback, true);
    assert.equal(s.calls.length, callsAfterFirst);
    s.clock.advance(3 * 60 * 1000);
    await s.json('/api/game/timeline?preset=live');
    assert.ok(s.calls.length > callsAfterFirst, 'pasado ese rato, lo intenta de nuevo');
  });

  test('si DONKI responde con un error HTTP, el motivo lo dice', async (t) => {
    const s = await start({ nasa: fakeNasa({ fail: 503 }) });
    t.after(s.close);
    const { body } = await s.json('/api/game/timeline?preset=live');
    assert.equal(body.fallback, true);
    assert.equal(body.fallbackReason, 'http-503');
  });

  test('si DONKI no contesta a tiempo, se sirve la copia ARCHIVO sin esperar de más', async (t) => {
    const s = await start({ nasa: fakeNasa({ hang: true }), app: { liveBudgetMs: 150 } });
    t.after(s.close);
    const t0 = Date.now();
    const { res, body } = await s.json('/api/game/timeline?preset=live');
    assert.equal(res.status, 200);
    assert.equal(body.fallback, true);
    assert.equal(body.fallbackReason, 'timeout');
    assert.ok(Date.now() - t0 < 2000, `tardó ${Date.now() - t0} ms`);
  });

  test('caché: dos peticiones iguales = una sola descarga; caduca a la hora', async (t) => {
    const s = await start();
    t.after(s.close);
    const first = await s.json('/api/game/timeline?preset=live');
    const afterFirst = s.calls.length;
    assert.equal(afterFirst, 7);
    const second = await s.json('/api/game/timeline?preset=live');
    assert.equal(s.calls.length, afterFirst, 'la segunda viene de la caché');
    assert.deepEqual(second.body, first.body);
    s.clock.advance(61 * 60 * 1000);
    await s.json('/api/game/timeline?preset=live');
    assert.equal(s.calls.length, 2 * afterFirst, 'pasada una hora se descarga otra vez');
  });

  test('peticiones simultáneas comparten la misma descarga de DONKI', async (t) => {
    const s = await start({ nasa: fakeNasa({ delayMs: 40 }) });
    t.after(s.close);
    const results = await Promise.all([1, 2, 3].map(() => s.json('/api/game/timeline?preset=live')));
    assert.ok(results.every((r) => r.res.status === 200 && r.body.source === 'EN VIVO'));
    assert.equal(s.calls.length, 7);
  });
});

describe('GET /api/game/timeline?startDate&endDate (rango a medida)', () => {
  test('la petición del prototipo del equipo sigue funcionando', async (t) => {
    const s = await start();
    t.after(s.close);
    const { res, body } = await s.json('/api/game/timeline?startDate=2026-08-06&endDate=2026-11-14&mode=daily&stepDays=1');
    assert.equal(res.status, 200);
    assert.equal(body.preset, 'custom');
    assert.equal(body.source, 'EN VIVO'); // llega a los últimos días
    assert.equal(body.totalDays, 101);
    assert.equal(body.startDate, '2026-08-06');
    assert.equal(body.endDate, TODAY);
    assert.equal(s.calls.length, 4 * 7, '101 días = 4 trozos de 30 días por tipo');
  });

  test('un rango histórico consultado ahora se etiqueta ARCHIVO (y lo explica)', async (t) => {
    const s = await start();
    t.after(s.close);
    const { body } = await s.json('/api/game/timeline?startDate=2025-01-01&endDate=2025-01-10');
    assert.equal(body.preset, 'custom');
    assert.equal(body.source, 'ARCHIVO');
    assert.ok(body.timeline.every((d) => d.source === 'ARCHIVO'));
    assert.match(body.meta.note.es, /ARCHIVO/);
    assert.match(body.meta.note.en, /ARCHIVE/);
  });

  test('eventsOnly y stepDays', async (t) => {
    const s = await start();
    t.after(s.close);
    const events = await s.json('/api/game/timeline?startDate=2026-11-01&endDate=2026-11-14&mode=eventsOnly');
    assert.equal(events.body.mode, 'eventsOnly');
    assert.deepEqual(events.body.timeline.map((d) => d.date), ['2026-11-10', '2026-11-11', '2026-11-12']);
    const stepped = await s.json('/api/game/timeline?startDate=2026-11-01&endDate=2026-11-14&stepDays=7');
    assert.deepEqual(stepped.body.timeline.map((d) => d.date), ['2026-11-01', '2026-11-08']);
    assert.deepEqual(stepped.body.timeline.map((d) => d.gameDay), [1, 2]);
  });

  test('si DONKI falla fuera de la ventana guardada → 502 con un mensaje claro', async (t) => {
    const s = await start({ nasa: fakeNasa({ fail: 'throw' }) });
    t.after(s.close);
    const { res, body } = await s.json('/api/game/timeline?startDate=2025-01-01&endDate=2025-01-10');
    assert.equal(res.status, 502);
    assert.equal(body.code, 'upstream-error');
    assert.equal(typeof body.error, 'string');
    assert.ok(body.message.es && body.message.en);
  });

  test('si DONKI falla dentro de la ventana guardada → el trozo de la copia ARCHIVO con fallback:true', async (t) => {
    const s = await start({ nasa: fakeNasa({ fail: 'throw' }) });
    t.after(s.close);
    const { res, body } = await s.json('/api/game/timeline?startDate=2024-05-10&endDate=2024-05-12');
    assert.equal(res.status, 200);
    assert.equal(body.fallback, true);
    assert.equal(body.source, 'ARCHIVO');
    assert.equal(body.requestedPreset, 'custom');
    assert.equal(body.totalDays, 3);
    assert.deepEqual(body.timeline.map((d) => [d.date, d.index, d.gameDay]), [['2024-05-10', 0, 1], ['2024-05-11', 1, 2], ['2024-05-12', 2, 3]]);
    assert.equal(body.summary.maxKp.kp, 9);
  });
});

describe('GET /api/game/timeline · parámetros incorrectos → 400', () => {
  const BAD = [
    ['/api/game/timeline?startDate=2024-02-30&endDate=2024-03-02', 'bad-date'],
    ['/api/game/timeline?startDate=2024-5-1&endDate=2024-05-02', 'bad-date'],
    ['/api/game/timeline?startDate=2024-05-10&endDate=2024-05-01', 'range-order'],
    ['/api/game/timeline?startDate=2024-01-01&endDate=2024-06-01', 'range-too-long'],
    ['/api/game/timeline?startDate=2026-11-10&endDate=2026-11-20', 'future-date'],
    ['/api/game/timeline?startDate=2024-05-01', 'missing-date'],
    ['/api/game/timeline?preset=custom', 'missing-date'],
    ['/api/game/timeline?startDate=2024-05-01&startDate=2024-05-02&endDate=2024-05-03', 'repeated-param'],
    ['/api/game/timeline?preset=live&days=3', 'bad-number'],
    ['/api/game/timeline?preset=live&days=31', 'bad-number'],
    ['/api/game/timeline?preset=live&days=veinte', 'bad-number'],
    ['/api/game/timeline?preset=mars', 'bad-option'],
    ['/api/game/timeline?startDate=2024-05-01&endDate=2024-05-03&mode=hourly', 'bad-option'],
    ['/api/game/timeline?startDate=2024-05-01&endDate=2024-05-03&stepDays=0', 'bad-number']
  ];

  test('cada caso explica el problema en inglés y en español, sin llamar a DONKI', async (t) => {
    const s = await start();
    t.after(s.close);
    for (const [url, code] of BAD) {
      const { res, body } = await s.json(url);
      assert.equal(res.status, 400, url);
      assert.equal(body.code, code, url);
      assert.equal(typeof body.error, 'string', url);
      assert.ok(body.message.es && body.message.en, url);
    }
    assert.equal(s.calls.length, 0);
  });
});

describe('GET /api/game/events', () => {
  test('boletines compactos y ordenados por hora (compatible con el prototipo)', async (t) => {
    const s = await start();
    t.after(s.close);
    const { res, body } = await s.json('/api/game/events?startDate=2026-11-01&endDate=2026-11-14&type=all');
    assert.equal(res.status, 200);
    assert.equal(body.total, 2);
    assert.equal(body.source, 'EN VIVO');
    assert.deepEqual(Object.keys(body.events[0]).sort(), ['id', 'issueTime', 'link', 'summary', 'type']);
    assert.deepEqual(body.events.map((e) => e.id), ['20261110-AL-001', '20261110-AL-002']);
    assert.equal(body.events[0].summary, 'X2.1 flare detected.');
  });

  test('filtra por tipo (sin distinguir mayúsculas) y guarda en caché', async (t) => {
    const s = await start();
    t.after(s.close);
    const { body } = await s.json('/api/game/events?startDate=2026-11-01&endDate=2026-11-14&type=sep');
    assert.equal(body.type, 'SEP');
    assert.deepEqual(body.events.map((e) => e.type), ['SEP']);
    await s.json('/api/game/events?startDate=2026-11-01&endDate=2026-11-14&type=all');
    assert.equal(s.calls.length, 1, 'una sola llamada para las dos peticiones');
  });

  test('parámetros incorrectos → 400; máximo 60 días', async (t) => {
    const s = await start();
    t.after(s.close);
    assert.equal((await s.get('/api/game/events?startDate=2026-01-01&endDate=2026-11-14')).status, 400);
    assert.equal((await s.get('/api/game/events?type=comet')).status, 400);
  });

  test('si DONKI falla: dentro de la copia guardada responde con ella; fuera, 502', async (t) => {
    const s = await start({ nasa: fakeNasa({ fail: 'throw' }) });
    t.after(s.close);
    const inside = await s.json('/api/game/events?startDate=2024-05-10&endDate=2024-05-11');
    assert.equal(inside.res.status, 200);
    assert.equal(inside.body.fallback, true);
    assert.equal(inside.body.source, 'ARCHIVO');
    assert.ok(inside.body.total > 0);
    assert.ok(inside.body.events.every((e) => e.issueTime >= '2024-05-10' && e.issueTime < '2024-05-12'));
    const outside = await s.get('/api/game/events?startDate=2026-11-01&endDate=2026-11-14');
    assert.equal(outside.status, 502);
  });
});

describe('GET /api/radlab/daily', () => {
  test('dentro de la copia guardada responde sin llamar a RadLab', async (t) => {
    const s = await start();
    t.after(s.close);
    const { res, body } = await s.json('/api/radlab/daily?from=2024-05-10&to=2024-05-12');
    assert.equal(res.status, 200);
    assert.equal(body.fromArchive, true);
    assert.equal(body.source, 'ARCHIVO');
    assert.equal(body.unit, 'µGy/h');
    assert.deepEqual(body.daily.map((d) => d.date), ['2024-05-10', '2024-05-11', '2024-05-12']);
    assert.ok(body.daily[0].instruments['CRaTER-D1D2'].mean > 0);
    assert.equal(s.calls.length, 0);
  });

  test('fuera de la copia pregunta a RadLab (proxy) y guarda el resultado', async (t) => {
    const s = await start();
    t.after(s.close);
    const { res, body } = await s.json('/api/radlab/daily?from=2026-11-01&to=2026-11-02');
    assert.equal(res.status, 200);
    assert.equal(body.fromArchive, false);
    assert.equal(body.source, 'ARCHIVO');
    assert.deepEqual(body.daily.map((d) => d.date), ['2026-11-01', '2026-11-02']);
    assert.deepEqual(body.daily[0].instruments['CRaTER-D1D2'], { mean: 12, max: 14, n: 2 });
    assert.equal(s.calls.length, 2);
    assert.ok(s.calls.every((u) => String(u).startsWith(RADLAB_BASE)));
    await s.json('/api/radlab/daily?from=2026-11-01&to=2026-11-02');
    assert.equal(s.calls.length, 2, 'la segunda vez sale de la caché');
  });

  test('máximo 31 días y fechas obligatorias → 400; RadLab caído → 502', async (t) => {
    const s = await start({ nasa: fakeNasa({ fail: 500 }) });
    t.after(s.close);
    assert.equal((await s.get('/api/radlab/daily?from=2026-01-01&to=2026-03-01')).status, 400);
    assert.equal((await s.get('/api/radlab/daily?from=2026-01-01')).status, 400);
    assert.equal((await s.get('/api/radlab/daily?from=2026-11-01&to=2026-11-01')).status, 502);
  });
});

describe('GET /api/space/delay', () => {
  test('retraso a la Luna y a Marte, etiquetado CALCULADO', async (t) => {
    const s = await start();
    t.after(s.close);
    const { res, body } = await s.json('/api/space/delay?date=2026-11-14');
    assert.equal(res.status, 200);
    assert.equal(body.date, '2026-11-14');
    assert.equal(body.label, 'CALCULADO');
    assert.ok(body.moon.seconds >= 1.2 && body.moon.seconds <= 1.36);
    assert.ok(Number.isInteger(body.moon.km));
    assert.ok(Math.abs(body.mars.minutes - 11) <= 0.3);
    for (const k of ['km', 'au', 'seconds', 'minutes']) assert.equal(typeof body.mars[k], 'number');
    assert.ok(body.method.es && body.method.en);
    assert.match(body.reference.url, /^https:\/\/ssd\.jpl\.nasa\.gov\//);
  });

  test('sin fecha usa hoy (UTC); fechas fuera del modelo o mal escritas → 400', async (t) => {
    const s = await start();
    t.after(s.close);
    assert.equal((await s.json('/api/space/delay')).body.date, TODAY);
    assert.equal((await s.get('/api/space/delay?date=2100-01-01')).status, 400);
    assert.equal((await s.get('/api/space/delay?date=hoy')).status, 400);
  });
});

describe('GET /api/sources', () => {
  test('lista las fuentes con su uso en los dos idiomas y su etiqueta', async (t) => {
    const s = await start();
    t.after(s.close);
    const { res, body } = await s.json('/api/sources');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body));
    assert.deepEqual(body.map((x) => x.id), ['donki', 'radlab', 'osd-476', 'lro-south-pole', 'csa-food-toolkit', 'jpl-approx-positions']);
    for (const src of body) {
      for (const k of ['id', 'name', 'provider', 'url', 'label']) assert.equal(typeof src[k], 'string', `${src.id}.${k}`);
      assert.match(src.url, /^https:\/\//);
      assert.ok(src.usedFor.es && src.usedFor.en, src.id);
      assert.ok(['EN VIVO', 'ARCHIVO', 'SIMULADO', 'CALCULADO'].includes(src.label), src.id);
    }
  });
});

describe('rutas desconocidas, seguridad y CORS', () => {
  let s;
  before(async () => {
    s = await start();
  });
  after(() => s.close());

  test('una ruta /api desconocida → 404 en JSON', async () => {
    for (const [method, p] of [['GET', '/api/nope'], ['GET', '/api'], ['POST', '/api/health']]) {
      const res = await s.get(p, { method });
      assert.equal(res.status, 404, `${method} ${p}`);
      assert.match(res.headers.get('content-type'), /application\/json/);
      assert.equal((await res.json()).code, 'not-found');
    }
  });

  test('cabeceras de seguridad, sin X-Powered-By y sin cookies', async () => {
    const res = await s.get('/api/health');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.match(res.headers.get('permissions-policy'), /camera=\(\).*microphone=\(\).*geolocation=\(\)/);
    const csp = res.headers.get('content-security-policy');
    for (const part of ["default-src 'self'", "img-src 'self' data:", "style-src 'self' 'unsafe-inline'", "script-src 'self'", "connect-src 'self' https://ccmc.gsfc.nasa.gov", "font-src 'self' data:"]) {
      assert.ok(csp.includes(part), `CSP sin ${part}`);
    }
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('set-cookie'), null);
  });

  test('CORS: el servidor de Vite (localhost:5173) sí; otros orígenes no', async () => {
    const ok = await s.get('/api/health', { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const other = await s.get('/api/health', { headers: { Origin: 'https://otra-web.example' } });
    assert.equal(other.headers.get('access-control-allow-origin'), null);
    const preflight = await s.get('/api/game/timeline', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });

  test('un cuerpo JSON de más de 50 kB → 413', async () => {
    const res = await s.get('/api/health', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: 'a'.repeat(60 * 1024) }) });
    assert.equal(res.status, 413);
    assert.equal((await res.json()).code, 'too-large');
  });
});

describe('limitador de peticiones', () => {
  test('pasado el límite por minuto → 429 en JSON; la misión ARCHIVO no cuenta', async (t) => {
    const s = await start({ app: { rateLimit: { windowMs: 60 * 1000, max: 2 } } });
    t.after(s.close);
    assert.equal((await s.get('/api/game/timeline?preset=live')).status, 200);
    assert.equal((await s.get('/api/game/events')).status, 200);
    const blocked = await s.get('/api/game/timeline?preset=live');
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    const body = await blocked.json();
    assert.equal(body.code, 'rate-limited');
    assert.ok(body.message.es && body.message.en);
    assert.match(body.message.es, /Espera \d+ segundos/); // kid language: no "s" unit
    assert.match(body.message.en, /Wait \d+ seconds/);
    assert.equal((await s.get('/api/game/timeline')).status, 200, 'ARCHIVO no gasta cuota de DONKI');
    s.clock.advance(61 * 1000);
    assert.equal((await s.get('/api/game/timeline?preset=live')).status, 200, 'al minuto siguiente vuelve a dejar');
  });
});

describe('cliente compilado (producción)', () => {
  let dir;
  before(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'solasol-dist-'));
    await fs.mkdir(path.join(dir, 'assets'));
    await fs.writeFile(path.join(dir, 'index.html'), '<!doctype html><title>Sol a Sol</title><div id="root"></div>');
    await fs.writeFile(path.join(dir, 'assets', 'index-abc123.js'), 'console.log("hola")');
    await fs.writeFile(path.join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  });
  after(() => fs.rm(dir, { recursive: true, force: true }));

  test('sirve index.html en cualquier ruta del juego y los assets con caché inmutable', async (t) => {
    const s = await start({ app: { clientDist: dir } });
    t.after(s.close);
    for (const p of ['/', '/mision/luna', '/informe?dia=3']) {
      const res = await s.get(p);
      assert.equal(res.status, 200, p);
      assert.match(res.headers.get('content-type'), /text\/html/);
      assert.equal(res.headers.get('cache-control'), 'no-cache');
      assert.ok(res.headers.get('content-security-policy'));
      assert.match(await res.text(), /Sol a Sol/);
    }
    const asset = await s.get('/assets/index-abc123.js');
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('cache-control'), /max-age=31536000.*immutable/);
    assert.equal((await s.get('/favicon.svg')).status, 200);
    assert.equal((await s.get('/assets/no-existe.js')).status, 404);
    assert.equal((await s.get('/no-existe.png')).status, 404);
    const api404 = await s.get('/api/no-existe');
    assert.equal(api404.status, 404);
    assert.match(api404.headers.get('content-type'), /application\/json/);
  });

  test('sin client/dist solo hay API: la raíz da un 404 en JSON con una pista', async (t) => {
    const s = await start({ app: { clientDist: path.join(dir, 'no-hay') } });
    t.after(s.close);
    const { res, body } = await s.json('/');
    assert.equal(res.status, 404);
    assert.match(body.hint, /npm run build/);
  });
});
