// Versión de UN SOLO ARCHIVO: todo el juego (código, estilos, fuentes, la foto de la NASA y los datos reales de
// mayo de 2024) dentro de un HTML que se abre con doble clic, sin instalar nada y sin servidor.
// Uso: npm run build:portable   →   client/dist-portable/Sol a Sol.html
// La misión EN VIVO necesita internet (pide los datos a DONKI desde el navegador); sin conexión usa el archivo y lo dice.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { externalCssUrls, externalHtmlRefs, inlineIntoHtml, linkedAssets, stripWoffFallbacks } from './portable.js';

const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(clientDir, 'dist-portable');
const tmpDir = path.join(outDir, '.vite-build');
const OUTPUT = path.join(outDir, 'Sol a Sol.html');
const BANNER =
  'Sol a Sol · Junior Astronaut Mission Trainer · NASA Space Apps Challenge 2026 · código Apache-2.0 · ' +
  'foto PIA13523: NASA/GSFC/Arizona State University · datos: NASA CCMC DONKI y NASA OSDR RadLab';

const fail = (msg) => {
  throw new Error(`build:portable · ${msg}`);
};

await build({
  root: clientDir,
  configFile: path.join(clientDir, 'vite.config.js'),
  base: './',
  logLevel: 'warn',
  build: {
    outDir: tmpDir,
    emptyOutDir: true,
    copyPublicDir: false,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 4096,
    // Todo va dentro (fuentes woff2 y foto); las .woff antiguas se quedan fuera y luego se borran del CSS.
    assetsInlineLimit: (file) => !/\.woff$/i.test(file)
  }
});

const read = (rel) => fs.readFileSync(path.join(tmpDir, rel), 'utf8');
const html = read('index.html');
const linked = linkedAssets(html);
const jsName = path.basename(linked.js);
const cssName = path.basename(linked.css);

// Cada archivo que generó Vite tiene que acabar dentro del HTML o ser una .woff de respaldo que ya nadie usa.
const emitted = fs.readdirSync(path.join(tmpDir, 'assets'));
const others = emitted.filter((f) => f !== jsName && f !== cssName);
const notInlined = others.filter((f) => !/\.woff$/i.test(f));
if (notInlined.length) fail(`Vite dejó archivos sin incrustar: ${notInlined.join(', ')}`);
const rootFiles = fs.readdirSync(tmpDir).filter((f) => f !== 'index.html' && f !== 'assets');
if (rootFiles.length) fail(`archivos inesperados junto a index.html: ${rootFiles.join(', ')}`);

const js = read(path.join('assets', jsName));
const css = stripWoffFallbacks(read(path.join('assets', cssName)));
const stillUsed = others.filter((f) => js.includes(f) || css.includes(f));
if (stillUsed.length) fail(`el código aún apunta a: ${stillUsed.join(', ')}`);
const cssRefs = externalCssUrls(css);
if (cssRefs.length) fail(`el CSS aún apunta a archivos: ${cssRefs.slice(0, 5).join(', ')}`);

const icon = fs.readFileSync(path.join(clientDir, 'public', 'favicon.svg'));
const iconDataUrl = `data:image/svg+xml;base64,${icon.toString('base64')}`;

// La página sin el código: no debe quedar ningún src/href que apunte a otro archivo.
const skeleton = inlineIntoHtml(html, { js: '', css: '', iconDataUrl, banner: BANNER });
const htmlRefs = externalHtmlRefs(skeleton);
if (htmlRefs.length) fail(`la página aún apunta a archivos: ${htmlRefs.join(', ')}`);

const page = inlineIntoHtml(html, { js, css, iconDataUrl, banner: BANNER });
fs.writeFileSync(OUTPUT, page);
fs.rmSync(tmpDir, { recursive: true, force: true });

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
console.log(`✔ ${path.relative(process.cwd(), OUTPUT)} · ${mb(Buffer.byteLength(page))} (JS ${mb(js.length)}, CSS ${mb(css.length)})`);
console.log('  Ábrelo con doble clic: funciona sin instalar nada y sin servidor.');
