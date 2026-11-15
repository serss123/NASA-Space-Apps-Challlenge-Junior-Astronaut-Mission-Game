// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Tests of shared/gameTranslator.js with small synthetic data and with the real ARCHIVE copy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { GLOSSARY } from '../client/src/content/glossary.js';
import {
  FAST_CME_KMS,
  KID_ICONS,
  KID_LIMITS,
  buildTimeline,
  kidRound,
  levelFromCmeSpeed,
  levelFromMultiplier,
  summarizeTimeline
} from './gameTranslator.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const LANGS = ['es', 'en'];

// ---------- compact DONKI record factories (the format of server/src/donkiCompact.js) ----------
let seq = 0;
const nextId = (kind) => `test-${kind}-${++seq}`;
const flare = (classType, peakTime) => ({ id: nextId('FLR'), classType, beginTime: peakTime, peakTime, link: 'test://flr' });
const cme = (id, startTime, speed) => ({ id, startTime, speed, link: 'test://cme' });
const sep = (eventTime, instruments = ['GOES-18: SEISS 10 MeV']) => ({ id: nextId('SEP'), eventTime, instruments, link: 'test://sep' });
const shock = (eventTime, linked = [], location = 'Earth') => ({ id: nextId('IPS'), eventTime, location, linked, link: 'test://ips' });
const storm = (time, kp) => ({ id: nextId('GST'), startTime: time, kpMax: kp, kp: [{ time, kp }], link: 'test://gst' });
const wsa = (modelCompletionTime, estimatedShockArrivalTime) => ({ id: nextId('WSA'), modelCompletionTime, estimatedShockArrivalTime, impacts: [], link: 'test://wsa' });

/** A 5-day timeline (1–5 May 2024) with the given records. */
const build = (donki = {}, extra = {}) => buildTimeline({ donki, startDate: '2024-05-01', endDate: '2024-05-05', ...extra });
const dayOn = (timeline, date) => timeline.find((d) => d.date === date);
const levelOn = (donki, date) => dayOn(build(donki), date).radiation.level;

/** RadLab daily means where 1–2 May is "a normal day" (10) and later days are multiples of it. */
function radlabWith(byDate) {
  const row = (date, crater, mars = 10) => ({
    date,
    instruments: { 'CRaTER-D1D2': { mean: crater, max: crater * 2, n: 24 }, 'MSL-RAD-Surface': { mean: mars, max: mars * 3, n: 24 } }
  });
  return { daily: [row('2024-05-01', 10), row('2024-05-02', 10), ...Object.entries(byDate).map(([d, [x, marsX = 1]]) => row(d, 10 * x, 10 * marsX))] };
}
const MEASURED = { baseline: { from: '2024-05-01', to: '2024-05-02' } };

// ---------- checks for the kid texts (docs/DESIGN.md §4 and §6) ----------
const PILL = /\[\[([a-z0-9-]+)(?:\|([^\]]*))?\]\]/g;
const visibleText = (s) => s.replace(PILL, (_, id, text) => text ?? id);
const wordCount = (s) => visibleText(s).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const ACRONYM = /\b(?:[A-Z]{2,}|Kp)\b/u; // CME, SEP, IPS, DONKI, UTC, WSA, Kp…
const UNIT = /km\/s|km por segundo|µGy|mSv|UTC|°/i;
const FLARE_CLASS = /\b[ABCMX]\d/; // X1.6, M2.0…
const DECIMAL = /\d[.,]\d{1,2}(?!\d)/; // 45,3 or 2.2 (but not 1,200)
const EMOJI = /\p{Extended_Pictographic}/u;

function assertKidText(text, where) {
  const shown = visibleText(text);
  assert.ok(!ACRONYM.test(shown), `${where}: acronym in «${text}»`);
  assert.ok(!UNIT.test(shown), `${where}: unit in «${text}»`);
  assert.ok(!FLARE_CLASS.test(shown), `${where}: flare class in «${text}»`);
  assert.ok(!DECIMAL.test(shown), `${where}: number not rounded in «${text}»`);
  assert.ok(!EMOJI.test(text), `${where}: emoji in «${text}»`);
}

function assertHeadline(day) {
  for (const lang of LANGS) {
    const h = day.headline[lang];
    const where = `${day.date} headline.${lang}`;
    assert.equal(typeof h, 'string', where);
    assert.ok(h.trim().length > 5, `${where}: empty`);
    assert.ok(wordCount(h) <= KID_LIMITS.headlineWords, `${where}: ${wordCount(h)} words in «${h}»`);
    assert.ok(!/\[\[|\]\]|\*\*/.test(h), `${where}: the headline is plain text (no markup): «${h}»`);
    assertKidText(h, where);
  }
  assert.notEqual(day.headline.es, day.headline.en, `${day.date} headline not translated`);
}

function assertKid(day) {
  assert.ok(Array.isArray(day.kid), `${day.date}: kid is not a list`);
  assert.ok(day.kid.length <= KID_LIMITS.facts, `${day.date}: ${day.kid.length} kid facts`);
  day.kid.forEach((k, i) => {
    const where = `${day.date} kid[${i}]`;
    assert.deepEqual(Object.keys(k).sort(), ['en', 'es', 'icon'], `${where}: fields`);
    assert.ok(KID_ICONS.includes(k.icon), `${where}: unknown icon «${k.icon}»`);
    for (const lang of LANGS) {
      const text = k[lang];
      assert.ok(typeof text === 'string' && text.trim().length > 0, `${where}.${lang}: empty`);
      assert.ok(wordCount(text) <= KID_LIMITS.factWords, `${where}.${lang}: ${wordCount(text)} words in «${text}»`);
      assertKidText(text, `${where}.${lang}`);
      for (const m of text.matchAll(PILL)) {
        assert.ok(GLOSSARY[m[1]], `${where}.${lang}: [[${m[1]}]] is not in the glossary`);
        assert.ok(m[2]?.trim(), `${where}.${lang}: pills must show their own text ([[${m[1]}|…]])`);
      }
    }
    assert.notEqual(k.es, k.en, `${where}: not translated`);
  });
  assert.equal(new Set(day.kid.map((k) => k.es)).size, day.kid.length, `${day.date}: repeated kid fact`);
}

const kidText = (day, lang = 'es') => day.kid.map((k) => k[lang]).join(' | ');

describe('unbroken timeline', () => {
  test('one day per date, calm days included, with the right index and gameDay', () => {
    const tl = buildTimeline({ donki: { FLR: [flare('M1.0', '2024-04-30T10:00Z')] }, startDate: '2024-04-28', endDate: '2024-05-03' });
    assert.deepEqual(
      tl.map((d) => d.date),
      ['2024-04-28', '2024-04-29', '2024-04-30', '2024-05-01', '2024-05-02', '2024-05-03']
    );
    assert.deepEqual(tl.map((d) => d.index), [0, 1, 2, 3, 4, 5]);
    assert.deepEqual(tl.map((d) => d.gameDay), [1, 2, 3, 4, 5, 6]);
    assert.ok(tl.every((d) => d.source === 'ARCHIVO'));
  });

  test('with no data at all, every day is calm', () => {
    const tl = build();
    assert.equal(tl.length, 5);
    assert.ok(tl.every((d) => d.calm && d.radiation.level === 0 && d.radiation.basis === 'estimated'));
  });

  test('labelled EN VIVO when asked', () => {
    assert.ok(build({}, { source: 'EN VIVO' }).every((d) => d.source === 'EN VIVO'));
  });
});

describe('texts of every day', () => {
  test('every day has a headline, kid facts and a summary in Spanish and English', () => {
    const tl = build({ FLR: [flare('X1.1', '2024-05-02T10:00Z')], SEP: [sep('2024-05-03T10:00Z')], GST: [storm('2024-05-04T03:00Z', 6)] });
    for (const d of tl) {
      for (const field of ['headline', 'summary']) {
        for (const lang of LANGS) {
          assert.equal(typeof d[field][lang], 'string', `${d.date} ${field}.${lang}`);
          assert.ok(d[field][lang].length > 5, `${d.date} ${field}.${lang} empty`);
        }
        assert.notEqual(d[field].es, d[field].en, `${d.date} ${field} not translated`);
      }
      assertHeadline(d);
      assertKid(d);
    }
  });

  test('the summary stays technical (flare classes, km/s, UTC, Kp) for the grown-ups part', () => {
    const tl = build({
      FLR: [flare('X1.1', '2024-05-02T10:00Z')],
      CME: [cme('CME-T', '2024-05-02T11:00Z', 1200)],
      IPS: [shock('2024-05-03T08:00Z', ['CME-T'])],
      GST: [storm('2024-05-03T09:00Z', 6.67)]
    });
    const d2 = dayOn(tl, '2024-05-02');
    assert.match(d2.summary.es, /X1\.1/);
    assert.match(d2.summary.en, /1200 km\/s/);
    const d3 = dayOn(tl, '2024-05-03');
    assert.match(d3.summary.es, /choque de CME \(IPS\) en la Tierra a las 08:00 UTC/);
    assert.match(d3.summary.es, /índice Kp 6,7/);
    assert.match(d3.summary.en, /Kp index 6\.7/);
  });

  test('kidRound: whole numbers below 100, tens below 1,000, hundreds above', () => {
    assert.equal(kidRound(2.2), 2);
    assert.equal(kidRound(45.3), 45);
    assert.equal(kidRound(101.6), 100);
    assert.equal(kidRound(213.6), 210);
    assert.equal(kidRound(301.6), 300);
    assert.equal(kidRound(1549), 1500);
    assert.equal(kidRound(null), null);
  });
});

describe('headline in kid language', () => {
  test('measured radiation, rounded and compared with a normal day', () => {
    const tl = buildTimeline({
      donki: {},
      radlab: radlabWith({ '2024-05-03': [12.7], '2024-05-04': [45.3], '2024-05-05': [301.6] }),
      startDate: '2024-05-03',
      endDate: '2024-05-05',
      ...MEASURED
    });
    assert.deepEqual(tl.map((d) => d.headline.es), [
      'Más radiación cerca de la Luna: 13 veces lo normal',
      'Mucha radiación cerca de la Luna: 45 veces lo normal',
      '¡Muchísima radiación cerca de la Luna: 300 veces lo normal!'
    ]);
    assert.deepEqual(tl.map((d) => d.headline.en), [
      'More radiation near the Moon: 13 times normal',
      'Lots of radiation near the Moon: 45 times normal',
      'So much radiation near the Moon: 300 times normal!'
    ]);
    tl.forEach(assertHeadline);
  });

  test('flares, CMEs and magnetic storms without classes, speeds or "Kp"', () => {
    const tl = build({
      FLR: [flare('X1.1', '2024-05-01T10:00Z'), flare('X6.2', '2024-05-05T10:00Z')],
      CME: [cme('CME-F', '2024-05-01T12:00Z', 1500)],
      IPS: [shock('2024-05-03T08:00Z', ['CME-F'])],
      GST: [storm('2024-05-04T03:00Z', 6.67)]
    });
    assert.equal(dayOn(tl, '2024-05-01').headline.es, 'El Sol lanza una llamarada muy fuerte');
    assert.equal(dayOn(tl, '2024-05-03').headline.es, 'Una nube de plasma muy rápida alcanza la Tierra');
    assert.equal(dayOn(tl, '2024-05-04').headline.es, 'Auroras en la Tierra: tormenta magnética de 7 sobre 9');
    assert.equal(dayOn(tl, '2024-05-04').headline.en, 'Auroras on Earth: magnetic storm of 7 out of 9');
    assert.equal(dayOn(tl, '2024-05-05').headline.es, 'El Sol lanza una llamarada gigante');
    tl.forEach(assertHeadline);
  });

  test('a shock that DONKI does not link to a CME is a gust of solar wind, not a plasma cloud', () => {
    const d = dayOn(build({ IPS: [shock('2024-05-02T08:00Z', ['2024-05-02T07:00:00-HSS-001'])] }), '2024-05-02');
    assert.equal(d.headline.es, 'Una ráfaga de viento solar alcanza la Tierra');
    assert.equal(d.shocks[0].fromCme, false);
    assert.equal(d.triggerCauses.antenna.fromCme, false, 'the breakdown cause tells the UI too');
    assert.equal(d.triggers.antenna, 0.6, 'the game rule does not change');
    assert.match(d.summary.es, /choque interplanetario \(IPS\)/);
    assert.ok(!/CME/.test(d.summary.es));
  });

  test('a model run made after the arrival it describes is not reported as a forecast', () => {
    const tl = build({ WSAEnlilSimulations: [wsa('2024-05-02T20:00Z', '2024-05-02T12:00Z'), wsa('2024-05-03T10:00Z', '2024-05-05T06:00Z')] });
    const late = dayOn(tl, '2024-05-02');
    assert.equal(late.predictions.length, 1, 'the prediction itself is kept in the data');
    assert.equal(late.headline.es, 'Día tranquilo en la base lunar');
    assert.ok(!/WSA-Enlil/.test(late.summary.es));
    const real = dayOn(tl, '2024-05-03');
    assert.equal(real.headline.es, 'Una nube de plasma podría llegar el 5 de mayo');
    assert.equal(real.headline.en, 'A plasma cloud may arrive on May 5');
    assert.match(real.summary.en, /WSA-Enlil model predicts a shock at Earth on May 5 at 06:00 UTC/);
  });
});

describe('kid facts (day.kid)', () => {
  test('a calm day starts with a friendly calm fact', () => {
    for (const d of build()) {
      assert.equal(d.kid[0]?.icon, 'calm', d.date);
      assert.match(d.kid[0].es, /buen día para explorar/);
      assertKid(d);
    }
  });

  test('Kp becomes "tormenta magnética de N sobre 9" (rounded); strong storms mention auroras', () => {
    const tl = build({ GST: [storm('2024-05-02T03:00Z', 5.33), storm('2024-05-03T03:00Z', 8.67)], FLR: [flare('X1.0', '2024-05-02T10:00Z'), flare('X1.0', '2024-05-03T10:00Z')] });
    const mild = dayOn(tl, '2024-05-02').kid.find((k) => k.icon === 'magnet');
    assert.equal(visibleText(mild.es), 'En la Tierra hubo una tormenta magnética de 5 sobre 9.');
    assert.equal(visibleText(mild.en), 'Earth had a magnetic storm of 5 out of 9.');
    const strong = dayOn(tl, '2024-05-03').kid.find((k) => k.icon === 'magnet');
    assert.equal(visibleText(strong.es), 'En la Tierra hubo auroras: tormenta magnética de 9 sobre 9.');
    assert.match(strong.es, /\[\[geomagnetic-storm\|tormenta magnética\]\]/);
  });

  test(`a CME of ${FAST_CME_KMS} km/s or more is "muy rápida"; slower ones are not, and no speed is given`, () => {
    const tl = build({
      CME: [cme('CME-S', '2024-04-29T12:00Z', 900), cme('CME-F', '2024-04-30T12:00Z', FAST_CME_KMS), cme('CME-L', '2024-05-04T12:00Z', 2600)],
      IPS: [shock('2024-05-02T08:00Z', ['CME-S']), shock('2024-05-03T08:00Z', ['CME-F'])],
      SEP: [sep('2024-05-02T10:00Z'), sep('2024-05-03T10:00Z')] // the SEP headline leaves the arrival to the kid facts
    });
    const slow = dayOn(tl, '2024-05-02').kid.find((k) => k.icon === 'cme');
    assert.equal(visibleText(slow.es), 'Una nube de plasma llegó a la Tierra.');
    const fast = dayOn(tl, '2024-05-03').kid.find((k) => k.icon === 'cme');
    assert.equal(visibleText(fast.es), 'Una nube de plasma muy rápida llegó a la Tierra.');
    assert.equal(visibleText(fast.en), 'A very fast plasma cloud reached Earth.');
    assert.match(fast.es, /\[\[cme\|nube de plasma\]\]/);
    const launch = dayOn(tl, '2024-05-04').kid.find((k) => k.icon === 'cme');
    assert.equal(visibleText(launch.es), 'Una nube de plasma muy rápida salió del Sol.');
    for (const d of tl) assert.ok(!/\d{3,}/.test(kidText(d)) && !/\d{3,}/.test(d.headline.es), `${d.date}: no speeds for kids`);
  });

  test('the kid facts never repeat what the headline already says', () => {
    const d = dayOn(build({ FLR: [flare('X2.0', '2024-05-02T10:00Z'), flare('M1.0', '2024-05-02T11:00Z'), flare('M2.0', '2024-05-02T12:00Z')] }), '2024-05-02');
    assert.equal(d.headline.es, 'El Sol lanza una llamarada muy fuerte');
    assert.ok(!d.kid.some((k) => k.icon === 'flare'), kidText(d));
  });

  test('the radiation and its cause come first when the headline talks about something else', () => {
    const tl = buildTimeline({
      donki: { CME: [cme('CME-A', '2024-05-01T12:00Z', 744)], IPS: [shock('2024-05-04T12:40Z', ['CME-A'])], SEP: [sep('2024-05-03T10:00Z')] },
      radlab: radlabWith({ '2024-05-03': [2], '2024-05-04': [12.7] }),
      startDate: '2024-05-03',
      endDate: '2024-05-04',
      ...MEASURED
    });
    const d = dayOn(tl, '2024-05-04');
    assert.equal(d.headline.es, 'Una nube de plasma alcanza la Tierra');
    assert.deepEqual(d.kid.map((k) => k.icon), ['radiation', 'particles']);
    assert.equal(visibleText(d.kid[0].es), 'La radiación cerca de la Luna fue 13 veces la normal.');
    assert.equal(visibleText(d.kid[1].es), 'Siguieron llegando partículas del Sol.');
  });

  test('every combination of events stays within the limits (0–3 facts, ≤ 12 words, valid icons and pills)', () => {
    const flareSets = [[], ['M1.0', 'M2.0', 'M3.0'], ['X1.0'], ['X6.0', 'X1.2', 'M1.0', 'M2.0', 'C1.0', 'C2.0', 'C3.0', 'C4.0', 'C5.0', 'C6.0', 'C7.0', 'C8.0']];
    const cmeSets = [[], [900], [1200, 1300, 2500]];
    const shockSets = [[], [[]], [['CME-SLOW']], [['CME-FAST'], ['CME-SLOW']], [['CME-FAST'], ['CME-SLOW'], ['CME-FAST2']]];
    const kps = [null, 6.67, 9];
    const wsaSets = [[], [wsa('2024-05-02T06:00Z', '2024-05-12T06:00Z')]];
    const rad = [null, [1, 1], [12, 1], [45, 1], [301.6, 1], [1, 14.4]];
    let checked = 0;
    for (const fl of flareSets)
      for (const cm of cmeSets)
        for (const withSep of [false, true])
          for (const sh of shockSets)
            for (const kp of kps)
              for (const ws of wsaSets)
                for (const r of rad) {
                  const donki = {
                    FLR: fl.map((c, i) => flare(c, `2024-05-02T${String(i + 1).padStart(2, '0')}:00Z`)),
                    CME: [
                      cme('CME-SLOW', '2024-04-28T00:00Z', 700),
                      cme('CME-FAST', '2024-04-28T01:00Z', 1800),
                      cme('CME-FAST2', '2024-04-28T02:00Z', 1100),
                      ...cm.map((v, i) => cme(`CME-D${i}`, `2024-05-02T0${i}:30Z`, v))
                    ],
                    SEP: withSep ? [sep('2024-05-02T10:00Z')] : [],
                    IPS: sh.map((linked, i) => shock(`2024-05-02T1${i}:00Z`, linked)),
                    GST: kp == null ? [] : [storm('2024-05-02T03:00Z', kp)],
                    WSAEnlilSimulations: ws
                  };
                  const tl = buildTimeline({
                    donki,
                    radlab: r ? radlabWith({ '2024-05-02': r, '2024-05-03': [1] }) : undefined,
                    startDate: '2024-05-02',
                    endDate: '2024-05-03',
                    baseline: { from: '2024-05-01', to: '2024-05-01' }
                  });
                  for (const d of tl) {
                    assertHeadline(d);
                    assertKid(d);
                    if (d.calm) assert.equal(d.kid[0]?.icon, 'calm', `${d.date}: calm day without its calm fact`);
                    checked++;
                  }
                }
    assert.ok(checked > 1000, `only ${checked} days checked`);
  });
});

describe('MEASURED radiation level (CRaTER compared with a normal day)', () => {
  test('thresholds: x < 3 → 0 · < 30 → 1 · < 150 → 2 · ≥ 150 → 3', () => {
    assert.equal(levelFromMultiplier(2.9), 0);
    assert.equal(levelFromMultiplier(3), 1);
    assert.equal(levelFromMultiplier(29.9), 1);
    assert.equal(levelFromMultiplier(30), 2);
    assert.equal(levelFromMultiplier(149.9), 2);
    assert.equal(levelFromMultiplier(150), 3);
    assert.equal(levelFromMultiplier(null), null);
    assert.equal(levelFromMultiplier(Number.NaN), null);
  });

  test('with RadLab the level comes from the measurement (and overrides the DONKI estimate)', () => {
    const crater = (date, mean) => ({ date, instruments: { 'CRaTER-D1D2': { mean, max: mean * 2, n: 24 } } });
    const radlab = {
      daily: [crater('2024-05-01', 10), crater('2024-05-02', 10), crater('2024-05-03', 29), crater('2024-05-04', 30), crater('2024-05-05', 299), crater('2024-05-06', 300), crater('2024-05-07', 1500)]
    };
    const tl = buildTimeline({
      donki: { SEP: [sep('2024-05-03T08:00Z')] }, // DONKI would estimate level 2 that day
      radlab,
      startDate: '2024-05-01',
      endDate: '2024-05-08',
      baseline: { from: '2024-05-01', to: '2024-05-02' } // a normal day = 10
    });
    const got = Object.fromEntries(tl.map((d) => [d.date, [d.radiation.multiplier, d.radiation.level, d.radiation.basis]]));
    assert.deepEqual(got['2024-05-01'], [1, 0, 'measured']);
    assert.deepEqual(got['2024-05-03'], [2.9, 0, 'measured']);
    assert.deepEqual(got['2024-05-04'], [3, 1, 'measured']);
    assert.deepEqual(got['2024-05-05'], [29.9, 1, 'measured']);
    assert.deepEqual(got['2024-05-06'], [30, 2, 'measured']);
    assert.deepEqual(got['2024-05-07'], [150, 3, 'measured']);
    assert.deepEqual(got['2024-05-08'], [null, 0, 'estimated']); // no measurement → DONKI rule
    assert.equal(dayOn(tl, '2024-05-03').radiation.estimatedLevel, 2);
  });
});

describe('radiation level ESTIMATED from DONKI', () => {
  test('SEP particles alone → 2', () => {
    const d = dayOn(build({ SEP: [sep('2024-05-02T10:00Z')] }), '2024-05-02');
    assert.equal(d.radiation.level, 2);
    assert.equal(d.radiation.estimatedLevel, 2);
    assert.equal(d.radiation.basis, 'estimated');
  });

  test('SEP measured by a ">100 MeV" instrument → 3', () => {
    assert.equal(levelOn({ SEP: [sep('2024-05-02T10:00Z', ['GOES-18: SEISS >100 MeV'])] }, '2024-05-02'), 3);
  });

  test('SEP on the same day as a flare ≥ X5 → 3', () => {
    assert.equal(levelOn({ SEP: [sep('2024-05-02T10:00Z')], FLR: [flare('X5.8', '2024-05-02T01:00Z')] }, '2024-05-02'), 3);
  });

  test('CME shock by the speed of its CME: 900 → 1 · 1500 → 2 · 2100 → 3', () => {
    for (const [speed, level] of [[900, 1], [1500, 2], [2100, 3]]) {
      const donki = { CME: [cme('CME-A', '2024-04-30T12:00Z', speed)], IPS: [shock('2024-05-02T08:00Z', ['CME-A'])] };
      assert.equal(levelOn(donki, '2024-05-02'), level, `speed ${speed}`);
    }
    assert.equal(levelFromCmeSpeed(999), 1);
    assert.equal(levelFromCmeSpeed(1000), 2);
    assert.equal(levelFromCmeSpeed(2000), 3);
  });

  test('shock without a known CME → 1; a shock that is not at Earth does not count', () => {
    assert.equal(levelOn({ IPS: [shock('2024-05-02T08:00Z')] }, '2024-05-02'), 1);
    assert.equal(levelOn({ IPS: [shock('2024-05-02T08:00Z', [], 'STEREO A')] }, '2024-05-02'), 0);
  });

  test('SEP + shock on the same day → +1, up to 3', () => {
    const slow = { CME: [cme('CME-S', '2024-04-30T12:00Z', 900)], IPS: [shock('2024-05-02T08:00Z', ['CME-S'])], SEP: [sep('2024-05-02T10:00Z')] };
    assert.equal(levelOn(slow, '2024-05-02'), 3); // max(2, 1) + 1
    const fast = {
      CME: [cme('CME-F', '2024-04-30T12:00Z', 2100)],
      IPS: [shock('2024-05-02T08:00Z', ['CME-F'])],
      SEP: [sep('2024-05-02T10:00Z', ['GOES-18: SEISS >100 MeV'])]
    };
    assert.equal(levelOn(fast, '2024-05-02'), 3); // 3 + 1 → capped at 3
  });

  test('the particles of an SEP keep arriving the next day, one level lower', () => {
    const tl = build({ SEP: [sep('2024-05-02T10:00Z')] });
    assert.deepEqual(tl.map((d) => d.radiation.level), [0, 2, 1, 0, 0]);
    assert.equal(dayOn(tl, '2024-05-03').headline.es, 'Siguen llegando partículas del Sol');
    const strong = build({ SEP: [sep('2024-05-02T10:00Z', ['GOES-18: SEISS >100 MeV'])] });
    assert.deepEqual(strong.map((d) => d.radiation.level), [0, 3, 2, 1, 0]);
  });
});

describe('breakdowns each day can cause (triggers)', () => {
  const triggersOn = (donki, date = '2024-05-02') => dayOn(build(donki), date).triggers;

  test('X flare → cables 0.8 (with the real cause)', () => {
    const d = dayOn(build({ FLR: [flare('X1.1', '2024-05-02T10:00Z'), flare('M3.0', '2024-05-02T12:00Z')] }), '2024-05-02');
    assert.equal(d.triggers.cables, 0.8);
    assert.equal(d.triggerCauses.cables.kind, 'flareX');
    assert.equal(d.triggerCauses.cables.ref, 'X1.1');
  });

  test('SEP without an X flare → cables 0.3', () => {
    assert.equal(triggersOn({ SEP: [sep('2024-05-02T10:00Z')] }).cables, 0.3);
  });

  test('only M flares → cables 0', () => {
    assert.equal(triggersOn({ FLR: [flare('M9.9', '2024-05-02T10:00Z')] }).cables, 0);
  });

  test('CME shock → antenna 0.6 and panels 0.4', () => {
    const t = triggersOn({ IPS: [shock('2024-05-02T08:00Z')] });
    assert.equal(t.antenna, 0.6);
    assert.equal(t.panels, 0.4);
  });

  test('geomagnetic storm: Kp 7 → antenna 0.6 · Kp 5 → 0.3 · Kp 4 → 0', () => {
    assert.equal(triggersOn({ GST: [storm('2024-05-02T03:00Z', 7)] }).antenna, 0.6);
    assert.equal(triggersOn({ GST: [storm('2024-05-02T03:00Z', 5)] }).antenna, 0.3);
    assert.equal(triggersOn({ GST: [storm('2024-05-02T03:00Z', 4)] }).antenna, 0);
    assert.equal(triggersOn({ GST: [storm('2024-05-02T03:00Z', 7)] }).panels, 0);
  });

  test('a day with nothing → no breakdown', () => {
    assert.deepEqual(triggersOn({}), { cables: 0, antenna: 0, panels: 0 });
  });
});

describe('calm day', () => {
  const calmOn = (donki) => dayOn(build(donki), '2024-05-02').calm;

  test('no X, no SEP, no shock, Kp < 5 and level 0 → calm', () => {
    assert.equal(calmOn({}), true);
    assert.equal(calmOn({ FLR: [flare('M2.0', '2024-05-02T10:00Z')] }), true);
    assert.equal(calmOn({ GST: [storm('2024-05-02T03:00Z', 4)] }), true);
  });

  test('any of those events breaks it', () => {
    assert.equal(calmOn({ FLR: [flare('X1.0', '2024-05-02T10:00Z')] }), false);
    assert.equal(calmOn({ SEP: [sep('2024-05-02T10:00Z')] }), false);
    assert.equal(calmOn({ IPS: [shock('2024-05-02T08:00Z')] }), false);
    assert.equal(calmOn({ GST: [storm('2024-05-02T03:00Z', 5)] }), false);
    assert.equal(calmOn({ SEP: [sep('2024-05-01T10:00Z')] }), false); // leftover radiation from the day before
  });
});

describe('compatibility modes of the prototype', () => {
  const donki = { FLR: [flare('X1.0', '2024-05-02T10:00Z')], GST: [storm('2024-05-04T03:00Z', 6)] };

  test('eventsOnly drops calm days and renumbers', () => {
    const tl = build(donki, { mode: 'eventsOnly' });
    assert.deepEqual(tl.map((d) => d.date), ['2024-05-02', '2024-05-04']);
    assert.deepEqual(tl.map((d) => d.index), [0, 1]);
    assert.deepEqual(tl.map((d) => d.gameDay), [1, 2]);
  });

  test('stepDays keeps one day every N and renumbers', () => {
    const tl = build(donki, { stepDays: 2 });
    assert.deepEqual(tl.map((d) => d.date), ['2024-05-01', '2024-05-03', '2024-05-05']);
    assert.deepEqual(tl.map((d) => d.index), [0, 1, 2]);
    assert.deepEqual(tl.map((d) => d.gameDay), [1, 2, 3]);
  });
});

describe('the real ARCHIVE copy (1–21 May 2024)', () => {
  const archive = readJson('client/src/data/archive-may-2024.json');
  const day = (date) => dayOn(archive.timeline, date);

  test('summarizeTimeline finds the records of the storm', () => {
    const s = summarizeTimeline(archive.timeline);
    assert.equal(s.days, 21);
    assert.equal(s.from, '2024-05-01');
    assert.equal(s.to, '2024-05-21');
    assert.deepEqual(s.maxFlare, { c: 'X8.7', date: '2024-05-14' });
    assert.deepEqual(s.maxKp, { kp: 9, date: '2024-05-11' });
    near(s.maxMoonRadiation.x, 301.6, 0.5);
    assert.equal(s.maxMoonRadiation.date, '2024-05-14');
    assert.ok(s.xFlares > 0 && s.calmDays > 0 && s.stormNights > 0);
  });

  test('the stored summary matches the computed one', () => {
    assert.deepEqual(archive.summary, summarizeTimeline(archive.timeline));
  });

  test('the timeline is continuous and all labelled ARCHIVO', () => {
    assert.equal(archive.timeline.length, 21);
    archive.timeline.forEach((d, i) => {
      assert.equal(d.index, i);
      assert.equal(d.gameDay, i + 1);
      assert.equal(d.source, 'ARCHIVO');
    });
  });

  test('every real day passes the kid-language rules', () => {
    for (const d of archive.timeline) {
      assertHeadline(d);
      assertKid(d);
    }
    assert.ok(archive.timeline.every((d) => d.kid.length > 0), 'every real day has at least one kid fact');
  });

  test('key days read as the design asks (docs/DESIGN.md §4)', () => {
    const may10 = day('2024-05-10');
    assert.equal(may10.headline.es, 'Mucha radiación cerca de la Luna: 45 veces lo normal');
    assert.deepEqual(may10.kid.map((k) => k.icon), ['particles', 'cme', 'magnet']);
    assert.equal(visibleText(may10.kid[2].es), 'En la Tierra hubo auroras: tormenta magnética de 9 sobre 9.');
    assert.equal(day('2024-05-14').headline.es, '¡Muchísima radiación cerca de la Luna: 300 veces lo normal!');
    assert.equal(day('2024-05-03').headline.es, 'El Sol lanza una llamarada muy fuerte');
    assert.deepEqual(day('2024-05-03').kid.map((k) => k.icon), ['calm', 'cme']);
    assert.match(day('2024-05-03').summary.es, /X1\.6/);
    assert.equal(day('2024-05-02').headline.es, 'Una ráfaga de viento solar alcanza la Tierra'); // the 2 May shock came from a fast solar-wind stream
    assert.ok(!/WSA-Enlil/.test(day('2024-05-15').summary.es), 'the late model run of 15 May is not a forecast');
  });

  test('the stored copy follows the current translator rules (if it fails: npm run data:build)', () => {
    const raw = readJson('server/data/raw-may-2024.json');
    const rebuilt = buildTimeline({ donki: raw.donki, radlab: raw.radlab, startDate: archive.meta.from, endDate: archive.meta.to, source: 'ARCHIVO', baseline: archive.meta.baseline });
    const essentials = (d) => ({ date: d.date, level: d.radiation.level, basis: d.radiation.basis, triggers: d.triggers, calm: d.calm, headline: d.headline, kid: d.kid, summary: d.summary });
    assert.deepEqual(rebuilt.map(essentials), archive.timeline.map(essentials));
  });

  test('the archive declares the use of AI in its metadata (docs/DESIGN.md §9)', () => {
    assert.equal(archive.meta.aiDisclosure, 'Real NASA data, downloaded and translated into game days by AI-assisted scripts (see AI_USE.md).');
  });

  test('the client and server copies are identical', () => {
    assert.equal(
      fs.readFileSync(path.join(ROOT, 'client/src/data/archive-may-2024.json'), 'utf8'),
      fs.readFileSync(path.join(ROOT, 'server/data/archive-may-2024.json'), 'utf8')
    );
  });
});

function near(actual, expected, tolerance) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ±${tolerance} of ${expected}`);
}
