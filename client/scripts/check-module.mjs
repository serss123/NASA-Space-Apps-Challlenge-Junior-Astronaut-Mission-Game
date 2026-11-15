#!/usr/bin/env node
// Compila un módulo del cliente de forma aislada (JSX + CSS + imports) para detectar errores
// sin tocar la app. Uso (desde la raíz o desde client/):
//   node client/scripts/check-module.mjs src/rover/RoverRun.jsx [carpetaDeSalida]
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { build } from 'vite';

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = process.argv[2];
if (!rel) {
  console.error('Uso: node client/scripts/check-module.mjs <ruta-del-módulo-dentro-de-client> [salida]');
  process.exit(2);
}
const entry = path.resolve(clientDir, rel);
const outDir = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(os.tmpdir(), `solasol-check-${path.basename(entry).replace(/\W+/g, '-')}`);

try {
  await build({
    configFile: false,
    root: clientDir,
    logLevel: 'warn',
    plugins: [react()],
    resolve: { alias: { '@shared': path.resolve(clientDir, '../shared') } },
    build: {
      outDir,
      emptyOutDir: true,
      minify: false,
      lib: { entry, formats: ['es'], fileName: 'check' },
      rollupOptions: { external: [/^react($|\/)/, /^react-dom($|\/)/] }
    }
  });
  console.log(`OK · ${rel} compila sin errores (salida en ${outDir})`);
} catch (err) {
  console.error(`ERROR · ${rel} no compila:\n${err?.message || err}`);
  process.exit(1);
}
