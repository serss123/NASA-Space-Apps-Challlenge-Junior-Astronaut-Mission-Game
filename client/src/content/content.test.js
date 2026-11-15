// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Tests for the teaching content: glossary, discoveries + journal chapters, facts, missions and sources.
// They turn the writing rules of docs/DESIGN.md (sections 4-6) into checks, so a text that is too long,
// too technical, or points to a missing glossary word fails here instead of confusing a 7-12-year-old.
// No dependencies. From the project root: node --test client/src/content/content.test.js
//
// How texts are measured:
//   · visible text: [[id|text]] counts as "text", [[id]] as the glossary term, **bold** as plain words;
//   · a word is a token with a letter or a digit ("⚡", "%" or "—" alone are not words);
//   · sentences end with . ! ? or …; a short exclamation such as "¡Gracias!" (3 words or fewer) is not a sentence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { MISSIONS } from '../engine/config.js';
import { DISCOVERIES, DISCOVERY_ORDER, TOPICS } from './discoveries.js';
import { FACTS } from './facts.js';
import { GLOSSARY } from './glossary.js';
import { MISSION_TEXT } from './missions.js';
import { CREDITS, LABELS, SIMPLIFICATIONS, SOURCES } from './sources.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = path.resolve(HERE, '..');
const ROOT = path.resolve(CLIENT_SRC, '..', '..');

const LANGS = ['es', 'en'];
const TOPIC_ICONS = { energy: 'bolt', radiation: 'shield', life: 'heart', comms: 'antenna', sun: 'sun', moon: 'moon' };
const TOPIC_IDS = Object.keys(TOPIC_ICONS);
const DATA_TAGS = ['EN VIVO', 'ARCHIVO', 'SIMULADO', 'CALCULADO', 'DISEÑO', 'NASA'];
const FACT_TAGS = ['ARCHIVO', 'NASA', 'CALCULADO'];
const FACT_TOPICS = ['storm', 'calm', 'radiation', 'iss', 'mars', 'moon', 'food', 'water', 'energy', 'rover', 'ice', 'health', 'forecast', 'sun', 'general'];
// Science sources may only link to official or scientific hosts already cited in the project.
const SOURCE_HOSTS = [/(^|\.)nasa\.gov$/, /(^|\.)noaa\.gov$/, /(^|\.)asc-csa\.gc\.ca$/, /(^|\.)csn\.es$/, /(^|\.)swri\.org$/, /(^|\.)nih\.gov$/];

// Every v1 glossary id stays (texts, saved progress and other screens refer to them), plus the v2 additions.
const REQUIRED_GLOSSARY = [
  'south-pole', 'regolith', 'static-electricity', 'crater', 'psr', 'water-ice', 'lunar-gravity', 'anorthosite', 'breccia',
  'micrometeorite', 'sample', 'isru', 'life-support', 'oxygen', 'greenhouse', 'solar-panel', 'battery', 'shield', 'antenna',
  'calibrate', 'short-circuit', 'rover', 'airlock', 'spacesuit', 'microgravity', 'evacuation', 'research', 'mission-control',
  'solar-storm', 'flare', 'x-class', 'cme', 'sep', 'solar-wind', 'plasma', 'active-region', 'sunspot', 'magnetosphere',
  'geomagnetic-storm', 'kp-index', 'aurora', 'forecast', 'wsa-enlil', 'donki', 'radiation', 'cosmic-ray', 'dose', 'dosimeter',
  'crater-detector', 'lro', 'orbit', 'iss', 'biosentinel', 'signal-delay', 'light-speed', 'mars', 'sol', 'curiosity', 'artemis',
  'osdr', 'radlab',
  // v2
  'storm-level', 'space-weather'
];
// docs/DESIGN.md section 4: the kid vocabulary that gets a glossary pill.
const KID_VOCABULARY = [
  'cme', 'sep', 'magnetosphere', 'flare', 'aurora', 'radiation', 'solar-panel', 'battery', 'life-support', 'rover', 'iss', 'lro',
  'donki', 'artemis', 'storm-level', 'space-weather'
];
// Instruments and models appear only in the grown-ups part of the data page (docs/DESIGN.md section 4).
const GROWN_UP_WORDS = ['crater-detector', 'wsa-enlil', 'kp-index'];
const GROWN_UP_TEXT = /\b(CRaTER|DOSTEL|RAD|WSA-Enlil|Kp)\b|µGy|mSv|milisievert|millisievert|km\/s|km por segundo|km per second/;

// Every v1 discovery id stays (saved journals store them).
const REQUIRED_DISCOVERIES = [
  'welcome', 'base-energy', 'stamina', 'golden-rule', 'signal-delay', 'forecast', 'flare', 'x-class', 'cme', 'cme-arrival', 'sep',
  'radiation-storm', 'shield', 'iss-vs-moon', 'crater-detector', 'geomagnetic-storm', 'mars-storm', 'greenhouse', 'harvest',
  'hunger', 'water-ice', 'metal', 'samples', 'breccia', 'psr-ice', 'lunar-gravity', 'rover-battery', 'dirty-panels',
  'short-circuit', 'antenna-calibration', 'overexertion', 'recovery', 'base-battery', 'outside-storm', 'research',
  'storm-science', 'evacuation', 'polar-day'
];

// ---------- helpers ----------

const isText = (v) => typeof v === 'string' && v.trim().length > 0;

function assertBilingual(obj, where) {
  assert.ok(obj && typeof obj === 'object', `${where}: missing { es, en } object`);
  for (const l of LANGS) assert.ok(isText(obj[l]), `${where}.${l}: empty or missing text`);
}

/** A string, or { es, en } with both languages. */
function assertTextOrBilingual(v, where) {
  if (typeof v === 'string') assert.ok(isText(v), `${where}: empty text`);
  else assertBilingual(v, where);
}

function assertUrl(url, where) {
  assert.ok(isText(url), `${where}: missing URL`);
  assert.match(url, /^https:\/\/[^\s]+$/, `${where}: the URL must start with https:// and have no spaces (${url})`);
}

/** A science source: https and an allowed host. */
function assertScienceUrl(url, where) {
  assertUrl(url, where);
  const host = new URL(url).hostname;
  assert.ok(SOURCE_HOSTS.some((re) => re.test(host)), `${where}: ${host} is not an allowed source host`);
}

function assertSource(source, where) {
  assert.ok(source && typeof source === 'object', `${where}: missing source`);
  assert.ok(isText(source.label), `${where}: empty source.label (it is plain text, not { es, en })`);
  assertScienceUrl(source.url, `${where}.source.url`);
}

/** RichText mark-up is well closed: [[...]] and **...**. */
function assertMarkup(text, where) {
  const open = (text.match(/\[\[/g) || []).length;
  const close = (text.match(/\]\]/g) || []).length;
  assert.equal(open, close, `${where}: unclosed [[ ]] in «${text}»`);
  assert.equal((text.match(/\*\*/g) || []).length % 2, 0, `${where}: unclosed ** bold in «${text}»`);
  for (const m of text.matchAll(/\[\[([^\]]*)\]\]/g)) {
    assert.match(m[1], /^[a-z0-9-]+(\|[^|\]]*\S[^|\]]*)?$/, `${where}: malformed mark-up [[${m[1]}]]`);
  }
}

/** Plain text: no glossary pills and no bold (titles, hints, glossary definitions...). */
function assertPlain(text, where) {
  assert.ok(!/\[\[|\]\]|\*\*/.test(text), `${where}: must be plain text, without [[ ]] or ** («${text}»)`);
}

/** Calls fn(text, path) for every string; checks that every { es } has an { en } and the other way round. */
function walkStrings(value, where, fn) {
  if (typeof value === 'string') return fn(value, where);
  if (Array.isArray(value)) return value.forEach((v, i) => walkStrings(v, `${where}[${i}]`, fn));
  if (value && typeof value === 'object') {
    if ('es' in value || 'en' in value) for (const l of LANGS) assert.ok(l in value, `${where}: has ${LANGS.find((x) => x !== l)} but no «${l}»`);
    for (const [k, v] of Object.entries(value)) walkStrings(v, `${where}.${k}`, fn);
  }
}

/** Glossary ids of the pills in a text. */
const pillIds = (text) => [...text.matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]*)?\]\]/g)].map((m) => m[1]);

/** What the player reads: [[id|text]] → text, [[id]] → the glossary term, **bold** → bold. */
function visible(text, lang) {
  return text
    .replace(/\[\[([a-z0-9-]+)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([a-z0-9-]+)\]\]/g, (_, id) => GLOSSARY[id]?.[lang]?.term ?? id)
    .replace(/\*\*/g, '');
}

/** Words: tokens with a letter or a digit. */
const countWords = (text, lang) => visible(text, lang).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Sentences of a marked-up text: { text, words, pills }. Short exclamations ("¡Gracias!") are left out. */
function sentences(text, lang) {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((s) => ({ text: s, words: countWords(s, lang), pills: pillIds(s).length }))
    .filter((s) => s.words > 3);
}

/** Checks a RichText field against the writing limits of docs/DESIGN.md section 4. */
function assertWriting(obj, where, { minSentences = 1, maxSentences, maxWordsPerSentence = 14, maxWords, maxPills = 3 }) {
  for (const l of LANGS) {
    const text = obj[l];
    const w = `${where}.${l}`;
    assertMarkup(text, w);
    const list = sentences(text, l);
    assert.ok(list.length >= minSentences && list.length <= maxSentences, `${w}: ${list.length} sentences, expected ${minSentences}-${maxSentences} («${text}»)`);
    for (const s of list) {
      assert.ok(s.words <= maxWordsPerSentence, `${w}: a sentence has ${s.words} words, max ${maxWordsPerSentence} («${s.text}»)`);
      assert.ok(s.pills <= 2, `${w}: more than 2 glossary pills in one sentence («${s.text}»)`);
    }
    if (maxWords !== undefined) assert.ok(countWords(text, l) <= maxWords, `${w}: ${countWords(text, l)} words, max ${maxWords} («${text}»)`);
    assert.ok(pillIds(text).length <= maxPills, `${w}: ${pillIds(text).length} glossary pills, max ${maxPills} («${text}»)`);
  }
}

/** Plain bilingual text of at most `max` words. */
function assertShortPlain(obj, where, max) {
  assertBilingual(obj, where);
  for (const l of LANGS) {
    assertPlain(obj[l], `${where}.${l}`);
    const n = countWords(obj[l], l);
    assert.ok(n <= max, `${where}.${l}: ${n} words, max ${max} («${obj[l]}»)`);
  }
}

/** No instrument or model names, no technical units and no pills to grown-up words (docs/DESIGN.md section 4). */
function assertKidText(text, where) {
  assert.ok(!GROWN_UP_TEXT.test(text), `${where}: instrument/model names and units belong to the grown-ups data page («${text}»)`);
  for (const id of pillIds(text)) assert.ok(!GROWN_UP_WORDS.includes(id), `${where}: [[${id}]] is a grown-ups word («${text}»)`);
}

function listSourceFiles(dir, exts = /\.(js|jsx|mjs)$/) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSourceFiles(full, exts));
    // Tests are left out: they talk about the "[[id]]" syntax without using it in the game.
    else if (exts.test(entry.name) && !/\.test\.(js|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Every [[id]] / [[id|text]] of the code and data the player can see (comment lines do not count). */
function glossaryIdsUsedInCode() {
  const files = [
    ...listSourceFiles(CLIENT_SRC, /\.(js|jsx|mjs|json)$/),
    ...listSourceFiles(path.join(ROOT, 'shared')),
    ...listSourceFiles(path.join(ROOT, 'server', 'src'))
  ];
  const used = new Map(); // id → ['file:line', ...]
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      for (const m of line.matchAll(/\[\[([a-z0-9-]+)(?:\|[^\]]*)?\]\]/gi)) {
        const id = m[1].toLowerCase();
        if (!used.has(id)) used.set(id, []);
        used.get(id).push(`${path.relative(ROOT, file)}:${i + 1}`);
      }
    });
  }
  return used;
}

/** Discovery ids fired by the engine or the UI (content files are left out). */
function discoveryIdsFiredInCode() {
  const ids = new Set();
  for (const file of listSourceFiles(CLIENT_SRC)) {
    if (file.startsWith(HERE)) continue;
    const code = fs.readFileSync(file, 'utf8');
    // engine: discover(d, 'id') and discover(d, { 1: 'a', 2: 'b' }[z])
    for (const m of code.matchAll(/\bdiscover\(\s*\w+\s*,\s*'([a-z0-9-]+)'\s*\)/g)) ids.add(m[1]);
    for (const m of code.matchAll(/\bdiscover\(\s*\w+\s*,\s*\{([^}]*)\}\[\w+\]\s*\)/g)) for (const v of m[1].matchAll(/'([a-z0-9-]+)'/g)) ids.add(v[1]);
    // engine: lookup tables such as BREAKDOWN_DISCOVERY = { panels: 'dirty-panels', ... }
    for (const m of code.matchAll(/\b[A-Z_]*DISCOVERY\s*=\s*\{([^}]*)\}/g)) for (const v of m[1].matchAll(/:\s*'([a-z0-9-]+)'/g)) ids.add(v[1]);
    // UI: dispatch({ type: 'DISCOVER', id: 'id' }), keys in any order
    for (const m of code.matchAll(/\{[^{}]*type:\s*'DISCOVER'[^{}]*\}/g)) {
      const id = m[0].match(/\bid:\s*'([a-z0-9-]+)'/);
      if (id) ids.add(id[1]);
    }
  }
  return ids;
}

const TOPIC_INDEX = Object.fromEntries(TOPICS.map((t, i) => [t.id, i]));

// ---------- journal chapters (TOPICS) ----------

test('topics: the six journal chapters, in order, with their icons and kid titles', () => {
  assert.deepEqual(TOPICS.map((t) => t.id), TOPIC_IDS);
  for (const t of TOPICS) {
    assert.equal(t.icon, TOPIC_ICONS[t.id], `${t.id}: icon should be ${TOPIC_ICONS[t.id]}`);
    assertShortPlain(t.title, `TOPICS.${t.id}.title`, 6);
    if (t.about !== undefined) assertShortPlain(t.about, `TOPICS.${t.id}.about`, 10);
  }
});

test('topics: every chapter has at least 3 cards and 3 words (three-star meter)', () => {
  for (const t of TOPICS) {
    const cards = Object.values(DISCOVERIES).filter((d) => d.topic === t.id).length;
    const words = Object.values(GLOSSARY).filter((g) => g.topic === t.id).length;
    assert.ok(cards >= 3, `chapter ${t.id} has ${cards} cards`);
    assert.ok(words >= 3, `chapter ${t.id} has ${words} glossary words`);
  }
});

// ---------- glossary ----------

test('glossary: every entry has emoji, topic, and term + definition + example in both languages', () => {
  for (const [id, g] of Object.entries(GLOSSARY)) {
    assert.match(id, /^[a-z0-9-]+$/, `invalid glossary id: ${id}`);
    assert.ok(isText(g.emoji), `${id}: missing emoji`);
    assert.ok(TOPIC_IDS.includes(g.topic), `${id}: unknown topic «${g.topic}»`);
    for (const l of LANGS) {
      assert.ok(g[l] && isText(g[l].term), `${id}.${l}.term is empty`);
      for (const k of ['term', 'def', 'example']) {
        assert.ok(isText(g[l][k]), `${id}.${l}.${k} is empty`);
        assertPlain(g[l][k], `${id}.${l}.${k}`);
      }
    }
    if (g.source) assertSource(g.source, `GLOSSARY.${id}`);
  }
});

test('glossary: definitions have at most 20 words, examples at most 15 and start with "Es como" / "It is like"', () => {
  for (const [id, g] of Object.entries(GLOSSARY)) {
    for (const l of LANGS) {
      const def = countWords(g[l].def, l);
      const ex = countWords(g[l].example, l);
      assert.ok(def <= 20, `${id}.${l}.def: ${def} words, max 20 («${g[l].def}»)`);
      assert.ok(ex <= 15, `${id}.${l}.example: ${ex} words, max 15 («${g[l].example}»)`);
    }
    assert.match(g.es.example, /^(Es|Son) como\b/, `${id}.es.example should start with "Es como…" («${g.es.example}»)`);
    assert.match(g.en.example, /^(It is|They are) like\b/, `${id}.en.example should start with "It is like…" («${g.en.example}»)`);
  }
});

test('glossary: every required id is still there (v1 ids + v2 kid vocabulary)', () => {
  const missing = REQUIRED_GLOSSARY.filter((id) => !GLOSSARY[id]);
  assert.deepEqual(missing, [], `missing glossary words: ${missing.join(', ')}`);
  const kid = KID_VOCABULARY.filter((id) => !GLOSSARY[id]);
  assert.deepEqual(kid, [], `missing words of the kid vocabulary: ${kid.join(', ')}`);
});

test('glossary: kid definitions avoid instrument names and technical units', () => {
  for (const [id, g] of Object.entries(GLOSSARY)) {
    if (GROWN_UP_WORDS.includes(id)) continue;
    for (const l of LANGS) for (const k of ['def', 'example']) assertKidText(g[l][k], `GLOSSARY.${id}.${l}.${k}`);
  }
});

test('glossary: every [[id]] in client/src, shared and server/src (code and data) exists in the glossary', () => {
  const used = glossaryIdsUsedInCode();
  assert.ok(used.size > 10, 'no [[id]] mark-up found: has the folder moved?');
  const missing = [...used.entries()].filter(([id]) => !GLOSSARY[id]).map(([id, where]) => `${id} (${where.slice(0, 3).join(', ')})`);
  assert.deepEqual(missing, [], `pills without a glossary entry: ${missing.join(' · ')}`);
});

// ---------- discoveries ----------

test('discoveries: every required id exists, every id fired by the code has a card and every card can be unlocked', () => {
  const missing = REQUIRED_DISCOVERIES.filter((id) => !DISCOVERIES[id]);
  assert.deepEqual(missing, [], `missing discoveries: ${missing.join(', ')}`);
  const fired = discoveryIdsFiredInCode();
  assert.ok(fired.size >= 30, `expected more ids fired by the engine (found ${fired.size})`);
  const noCard = [...fired].filter((id) => !DISCOVERIES[id]);
  assert.deepEqual(noCard, [], `the code fires discoveries without a card: ${noCard.join(', ')}`);
  const unreachable = Object.keys(DISCOVERIES).filter((id) => !fired.has(id));
  assert.deepEqual(unreachable, [], `cards that nothing can unlock: ${unreachable.join(', ')}`);
});

test('discoveries: v2 shape (emoji, topic, tag, texts in both languages, words, source)', () => {
  for (const [id, d] of Object.entries(DISCOVERIES)) {
    assert.ok(isText(d.emoji), `${id}: missing emoji`);
    assert.ok(TOPIC_IDS.includes(d.topic), `${id}: unknown topic «${d.topic}»`);
    assert.ok(DATA_TAGS.includes(d.tag), `${id}: invalid tag (${d.tag})`);
    for (const k of ['title', 'happened', 'learn', 'remember', 'hint']) assertBilingual(d[k], `${id}.${k}`);
    assert.ok(Array.isArray(d.words), `${id}: words must be an array of glossary ids`);
    if (d.source) assertSource(d.source, `DISCOVERIES.${id}`);
  }
});

test('discoveries: writing limits (title 5 words, happened 1 sentence of 14, learn 1-2 short sentences, remember and hint 10)', () => {
  for (const [id, d] of Object.entries(DISCOVERIES)) {
    assertShortPlain(d.title, `${id}.title`, 5);
    assertWriting(d.happened, `${id}.happened`, { maxSentences: 1, maxWords: 14, maxPills: 2 });
    assertWriting(d.learn, `${id}.learn`, { maxSentences: 2, maxPills: 3 });
    assertShortPlain(d.remember, `${id}.remember`, 10);
    assertShortPlain(d.hint, `${id}.hint`, 10);
    for (const l of LANGS) assert.ok(!/^(Pista|Hint)\b/i.test(d.hint[l]), `${id}.hint.${l}: the screen adds the "Pista:" label`);
  }
});

test('discoveries: words are 0-3 existing glossary ids that the card itself shows as pills', () => {
  for (const [id, d] of Object.entries(DISCOVERIES)) {
    assert.ok(d.words.length <= 3, `${id}: ${d.words.length} words, max 3`);
    assert.equal(new Set(d.words).size, d.words.length, `${id}: repeated words`);
    for (const w of d.words) {
      assert.ok(GLOSSARY[w], `${id}: «${w}» is not in the glossary`);
      for (const l of LANGS) {
        const shown = pillIds(`${d.happened[l]} ${d.learn[l]}`);
        assert.ok(shown.includes(w), `${id}.${l}: teaches «${w}» but happened/learn never show it as a pill`);
      }
    }
  }
});

test('discoveries: kid texts avoid instrument names and technical units', () => {
  for (const [id, d] of Object.entries(DISCOVERIES)) {
    for (const k of ['title', 'happened', 'learn', 'remember', 'hint']) for (const l of LANGS) assertKidText(d[k][l], `${id}.${k}.${l}`);
  }
});

test('discoveries: DISCOVERY_ORDER has every card exactly once, chapter by chapter', () => {
  assert.ok(Array.isArray(DISCOVERY_ORDER));
  assert.equal(new Set(DISCOVERY_ORDER).size, DISCOVERY_ORDER.length, 'DISCOVERY_ORDER has repeated ids');
  assert.deepEqual([...DISCOVERY_ORDER].sort(), Object.keys(DISCOVERIES).sort());
  DISCOVERY_ORDER.forEach((id, i) => {
    if (i === 0) return;
    const prev = DISCOVERY_ORDER[i - 1];
    assert.ok(TOPIC_INDEX[DISCOVERIES[id].topic] >= TOPIC_INDEX[DISCOVERIES[prev].topic], `${id} (${DISCOVERIES[id].topic}) comes after ${prev} (${DISCOVERIES[prev].topic}): keep chapters together, in TOPICS order`);
  });
});

test('discoveries: compatibility body (happened + learn) is there for v1 screens', () => {
  for (const [id, d] of Object.entries(DISCOVERIES)) {
    assertBilingual(d.body, `${id}.body`);
    for (const l of LANGS) assertMarkup(d.body[l], `${id}.body.${l}`);
  }
});

// ---------- facts ----------

test('facts: at least 45, unique ids, linked source and texts in both languages', () => {
  assert.ok(FACTS.length >= 45, `there are ${FACTS.length} facts (minimum 45)`);
  const ids = FACTS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, 'repeated fact ids');
  for (const f of FACTS) {
    assert.ok(isText(f.id), 'fact without id');
    assert.ok(isText(f.emoji), `${f.id}: missing emoji`);
    assertBilingual(f.text, `${f.id}.text`);
    for (const l of LANGS) assertMarkup(f.text[l], `${f.id}.text.${l}`);
    assertSource(f.source, `FACTS.${f.id}`);
    assert.ok(Array.isArray(f.tags) && f.tags.length > 0, `${f.id}: no tags`);
    for (const tg of f.tags) assert.ok(FACT_TOPICS.includes(tg), `${f.id}: unknown tag «${tg}»`);
    if (f.tag !== undefined) assert.ok(FACT_TAGS.includes(f.tag), `${f.id}: invalid label (${f.tag})`);
    if (f.topic !== undefined) assert.ok(TOPIC_IDS.includes(f.topic), `${f.id}: unknown journal topic «${f.topic}»`);
  }
});

test('facts: every fact tag has at least 3 facts (the UI filters by them)', () => {
  for (const topic of FACT_TOPICS) {
    const n = FACTS.filter((f) => f.tags.includes(topic)).length;
    assert.ok(n >= 3, `the tag «${topic}» only has ${n} facts`);
  }
});

test('facts: the NASA label only goes with a source from NASA or one of its instrument teams', () => {
  const nasaHosts = /(^|\.)nasa\.gov$|(^|\.)swri\.org$/;
  for (const f of FACTS.filter((x) => x.tag === 'NASA')) {
    const host = new URL(f.source.url).hostname;
    assert.match(host, nasaHosts, `${f.id}: NASA label with a source from ${host}`);
  }
});

// ---------- missions ----------

test('missions: MISSION_TEXT has exactly the engine missions, in both languages', () => {
  assert.deepEqual(Object.keys(MISSION_TEXT).sort(), MISSIONS.map((m) => m.id).sort());
  for (const [id, m] of Object.entries(MISSION_TEXT)) {
    assert.ok(isText(m.emoji), `${id}: missing emoji`);
    if (m.icon !== undefined) assert.ok(isText(m.icon), `${id}: empty icon name`);
    for (const k of ['title', 'brief', 'done']) {
      assertBilingual(m[k], `${id}.${k}`);
      for (const l of LANGS) assertMarkup(m[k][l], `${id}.${k}.${l}`);
    }
  }
});

test('missions: title 4 words, brief 2 short sentences with what to bring in bold, done 1 sentence', () => {
  for (const [id, m] of Object.entries(MISSION_TEXT)) {
    assertShortPlain(m.title, `${id}.title`, 4);
    assertWriting(m.brief, `${id}.brief`, { maxSentences: 2, maxPills: 3 });
    assertWriting(m.done, `${id}.done`, { maxSentences: 1, maxPills: 2 });
    for (const l of LANGS) {
      assert.match(m.brief[l], /\*\*[^*]+\*\*/, `${id}.brief.${l}: say what to bring in **bold**`);
      for (const k of ['title', 'brief', 'done']) assertKidText(m[k][l], `${id}.${k}.${l}`);
    }
  }
});

// ---------- sources, simplifications, credits and labels ----------

test('sources: well formed, on allowed hosts and with every data source of the game', () => {
  assert.ok(Array.isArray(SOURCES) && SOURCES.length > 0);
  const ids = SOURCES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'repeated source ids');
  for (const s of SOURCES) {
    assert.ok(isText(s.id), 'source without id');
    assert.ok(isText(s.name), `${s.id}: missing name`);
    assert.ok(isText(s.provider), `${s.id}: missing provider`);
    assertBilingual(s.what, `${s.id}.what`);
    assertBilingual(s.how, `${s.id}.how`);
    for (const l of LANGS) {
      assertMarkup(s.what[l], `${s.id}.what.${l}`);
      assertMarkup(s.how[l], `${s.id}.how.${l}`);
    }
    assert.ok(DATA_TAGS.includes(s.label), `${s.id}: invalid label (${s.label})`);
    assertScienceUrl(s.url, `${s.id}.url`);
    assertTextOrBilingual(s.credit, `${s.id}.credit`);
  }
  const urls = SOURCES.map((s) => s.url);
  for (const needed of [
    'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
    'https://ccmc.gsfc.nasa.gov/DONKI-API/',
    'https://visualization.osdr.nasa.gov/radlab/gui/',
    'https://osdr.nasa.gov/bio/repo/data/studies/OSD-476',
    'https://images.nasa.gov/details/PIA13523',
    'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/',
    'https://ssd.jpl.nasa.gov/planets/approx_pos.html'
  ]) {
    assert.ok(urls.includes(needed), `missing source ${needed}`);
  }
  const labels = new Set(SOURCES.map((s) => s.label));
  for (const l of ['ARCHIVO', 'EN VIVO', 'CALCULADO', 'NASA']) assert.ok(labels.has(l), `no source with the ${l} label`);
});

test('simplifications: a non-empty list of sentences in both languages', () => {
  assert.ok(Array.isArray(SIMPLIFICATIONS) && SIMPLIFICATIONS.length >= 5);
  SIMPLIFICATIONS.forEach((s, i) => {
    assertBilingual(s, `SIMPLIFICATIONS[${i}]`);
    for (const l of LANGS) assertMarkup(s[l], `SIMPLIFICATIONS[${i}].${l}`);
  });
});

test('credits: each one says what it is and its licence', () => {
  assert.ok(Array.isArray(CREDITS) && CREDITS.length > 0);
  CREDITS.forEach((c, i) => {
    assertTextOrBilingual(c.what, `CREDITS[${i}].what`);
    assertTextOrBilingual(c.license, `CREDITS[${i}].license`);
    if (c.url !== undefined) assertUrl(c.url, `CREDITS[${i}].url`);
  });
});

test('labels: the six data labels explained in both languages', () => {
  assert.deepEqual(Object.keys(LABELS).sort(), [...DATA_TAGS].sort());
  for (const [k, v] of Object.entries(LABELS)) assertBilingual(v, `LABELS.${k}`);
});

// ---------- all content ----------

test('no empty text, and every { es } has its { en }', () => {
  const all = { TOPICS, GLOSSARY, DISCOVERIES, DISCOVERY_ORDER, FACTS, MISSION_TEXT, SOURCES, SIMPLIFICATIONS, CREDITS, LABELS };
  walkStrings(all, 'content', (s, where) => assert.ok(isText(s), `${where}: empty string`));
});

test('the [[id|text]] pills of the content point to the glossary and have a visible text', () => {
  const texts = [];
  walkStrings({ DISCOVERIES, FACTS, MISSION_TEXT, SOURCES, SIMPLIFICATIONS }, 'content', (s, where) => texts.push([s, where]));
  for (const [s, where] of texts) {
    for (const m of s.matchAll(/\[\[([a-z0-9-]+)(?:\|([^\]]*))?\]\]/g)) {
      assert.ok(GLOSSARY[m[1]], `${where}: [[${m[1]}]] is not in the glossary`);
      if (m[2] !== undefined) assert.ok(m[2].trim().length > 0, `${where}: [[${m[1]}|]] without text`);
    }
  }
});
