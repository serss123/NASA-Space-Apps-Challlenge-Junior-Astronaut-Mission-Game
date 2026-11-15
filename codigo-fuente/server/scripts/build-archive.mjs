#!/usr/bin/env node
// Sol a Sol · Construye la línea temporal ARCHIVO del juego a partir de la copia descargada.
// Entrada:  server/data/raw-may-2024.json   (creada por snapshot.mjs)
// Salida:   server/data/archive-may-2024.json  y  client/src/data/archive-may-2024.json (para jugar sin servidor)
// Uso:      node server/scripts/build-archive.mjs [--from 2024-05-01] [--to 2024-05-21]

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTimeline, summarizeTimeline, DEFAULT_BASELINE } from '../../shared/gameTranslator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, '..');
const ROOT = path.resolve(SERVER_DIR, '..');
const RAW = path.join(SERVER_DIR, 'data', 'raw-may-2024.json');
const OUTS = [path.join(SERVER_DIR, 'data', 'archive-may-2024.json'), path.join(ROOT, 'client', 'src', 'data', 'archive-may-2024.json')];

const argv = process.argv.slice(2);
const arg = (name, def) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : def);
const FROM = arg('from', '2024-05-01');
const TO = arg('to', '2024-05-21');

const raw = JSON.parse(await fs.readFile(RAW, 'utf8'));
const timeline = buildTimeline({
  donki: raw.donki,
  radlab: raw.radlab,
  startDate: FROM,
  endDate: TO,
  source: 'ARCHIVO',
  baseline: DEFAULT_BASELINE
});

// Recorta los textos largos de los boletines para que la copia del cliente pese poco.
for (const d of timeline) for (const n of d.notifications) if (n.summary?.length > 420) n.summary = `${n.summary.slice(0, 419)}…`;

const missingRadlab = timeline.filter((d) => d.radiation.basis !== 'measured').map((d) => d.date);
const archive = {
  meta: {
    id: 'moon-may-2024',
    title: { es: 'La gran tormenta solar de mayo de 2024', en: 'The great solar storm of May 2024' },
    site: 'moon-south-pole',
    source: 'ARCHIVO',
    from: FROM,
    to: TO,
    builtAt: new Date().toISOString(),
    downloadedAt: raw.meta.downloadedAt,
    baseline: DEFAULT_BASELINE,
    radlabUnit: raw.radlab?.unit || 'µGy/h',
    missingRadlabDays: missingRadlab,
    sources: raw.meta.sources,
    // JSON cannot hold the AI-assistance header, so the disclosure lives in the metadata (docs/DESIGN.md §9).
    aiDisclosure: 'Real NASA data, downloaded and translated into game days by AI-assisted scripts (see AI_USE.md).'
  },
  summary: summarizeTimeline(timeline),
  timeline
};

for (const out of OUTS) {
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(archive), 'utf8');
  console.log(`Guardado ${path.relative(ROOT, out)} (${Math.round((await fs.stat(out)).size / 1024)} KB)`);
}
console.log('Resumen:', JSON.stringify(archive.summary));
if (missingRadlab.length) console.log('Días sin RadLab (radiación estimada con DONKI):', missingRadlab.join(', '));
for (const d of timeline) {
  console.log(
    `${d.date}  nivel ${d.radiation.level} (${d.radiation.basis === 'measured' ? 'medido' : 'estimado'} · DONKI ${d.radiation.estimatedLevel})  ` +
      `x=${d.radiation.multiplier ?? '—'}  trig c${d.triggers.cables} a${d.triggers.antenna} p${d.triggers.panels}  ${d.calm ? 'DESPEJADO ' : ''}| ${d.headline.es}`
  );
}
