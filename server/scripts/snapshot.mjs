#!/usr/bin/env node
// Sol a Sol · Descarga de la copia ARCHIVO (datos reales de la NASA)
// -----------------------------------------------------------------
// Descarga datos PÚBLICOS y REALES para la misión histórica (1–21 de mayo de 2024) y guarda
// una copia compacta y trazable: cada registro conserva su identificador y su enlace original.
//
//   · DONKI (CCMC, NASA): FLR, CME, SEP, GST, IPS, MPC, RBE, HSS, WSAEnlilSimulations y notificaciones.
//     https://ccmc.gsfc.nasa.gov/DONKI-API/get/<TIPO>?startDate=AAAA-MM-DD&endDate=AAAA-MM-DD
//   · RadLab (OSDR, NASA): tasa de dosis absorbida (µGy/h) medida por CRaTER (nave LRO, órbita lunar),
//     DosTel (Estación Espacial), MSL-RAD (Curiosity, superficie de Marte) y BPD (BioSentinel).
//     https://visualization.osdr.nasa.gov/radlab/api/
//
// No necesita clave ni envía ningún dato personal.
// Uso:   node server/scripts/snapshot.mjs [--from 2024-04-24] [--to 2024-05-22]
// Después: node server/scripts/build-archive.mjs   (convierte la copia en la línea temporal del juego)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactDonki } from '../src/donkiCompact.js';
import { RADLAB_BASE, fetchRadlabDaily } from '../src/radlab.js';
import { DONKI_BASE, DONKI_TYPES, fetchDonkiType } from '../src/donkiFetcher.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = path.resolve(__dirname, '..');
const RAW_OUT = path.join(SERVER_DIR, 'data', 'raw-may-2024.json');

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), [])
);
const FROM = args.from || '2024-04-24';
const TO = args.to || '2024-05-22';

// --retry-missing: vuelve a pedir a RadLab solo los días que fallaron en la última descarga.
async function retryMissing() {
  const raw = JSON.parse(await fs.readFile(RAW_OUT, 'utf8'));
  for (const day of raw.radlab.daily) {
    if (!day.error && Object.keys(day.instruments).length) continue;
    const again = await fetchRadlabDaily(day.date, day.date, (d, n) => console.log(`  ${d}: ${n} lecturas`));
    Object.assign(day, again.daily[0]);
    if (!again.daily[0].error) delete day.error;
  }
  await fs.writeFile(RAW_OUT, JSON.stringify(raw, null, 1), 'utf8');
  console.log('Copia actualizada.');
}

async function main() {
  if ('retry-missing' in args || process.argv.includes('--retry-missing')) return retryMissing();
  console.log(`Descargando DONKI ${FROM} → ${TO} desde ${DONKI_BASE}`);
  const donki = {};
  for (const type of DONKI_TYPES) {
    const raw = await fetchDonkiType(type, FROM, TO);
    donki[type] = compactDonki(type, raw);
    console.log(`  ${type.padEnd(22)} ${String(raw.length).padStart(4)} registros`);
  }

  console.log(`Descargando RadLab ${FROM} → ${TO} desde ${RADLAB_BASE}`);
  const radlab = await fetchRadlabDaily(FROM, TO, (day, n) => process.stdout.write(`  ${day}: ${n} lecturas\n`));

  const out = {
    meta: {
      description: 'Copia ARCHIVO de datos reales de la NASA para "Sol a Sol" (misión histórica de mayo de 2024).',
      downloadedAt: new Date().toISOString(),
      window: { from: FROM, to: TO },
      sources: {
        DONKI: {
          name: 'NASA CCMC · Space Weather Database Of Notifications, Knowledge, Information (DONKI)',
          api: DONKI_BASE,
          web: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/'
        },
        RadLab: {
          name: 'NASA OSDR · RadLab (Radiation Dosimetry Database)',
          api: RADLAB_BASE,
          web: 'https://visualization.osdr.nasa.gov/radlab/gui/',
          unit: 'µGy/h (tasa de dosis absorbida)'
        }
      }
    },
    donki,
    radlab
  };

  await fs.mkdir(path.dirname(RAW_OUT), { recursive: true });
  await fs.writeFile(RAW_OUT, JSON.stringify(out, null, 1), 'utf8');
  const kb = Math.round((await fs.stat(RAW_OUT)).size / 1024);
  console.log(`Guardado ${path.relative(process.cwd(), RAW_OUT)} (${kb} KB)`);
}

main().catch((err) => {
  console.error('Error al descargar la copia ARCHIVO:', err);
  process.exit(1);
});
