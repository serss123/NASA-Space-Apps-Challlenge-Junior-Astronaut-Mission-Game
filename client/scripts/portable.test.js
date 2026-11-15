import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeInlineScript,
  escapeInlineStyle,
  externalCssUrls,
  externalHtmlRefs,
  inlineIntoHtml,
  linkedAssets,
  stripWoffFallbacks
} from './portable.js';

const VITE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <title>Sol a Sol</title>
    <script type="module" crossorigin src="./assets/index-AbC123.js"></script>
    <link rel="stylesheet" crossorigin href="./assets/index-XyZ789.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

describe('linkedAssets', () => {
  it('encuentra el único JS y el único CSS de Vite', () => {
    assert.deepEqual(linkedAssets(VITE_HTML), { js: './assets/index-AbC123.js', css: './assets/index-XyZ789.css' });
  });
  it('falla si el código viene partido en varios trozos', () => {
    const twoScripts = VITE_HTML.replace('</head>', '<script type="module" src="./assets/otro.js"></script></head>');
    assert.throws(() => linkedAssets(twoScripts), /1 JS y 1 CSS/);
  });
});

describe('escapeInlineScript', () => {
  it('no deja "</script" ni "<!--" que rompan la etiqueta, y el código sigue valiendo lo mismo', () => {
    const original = 'const a = "<script></script><!-- x </SCRIPT>"; const r = /<!--/.test("<!--");';
    const escaped = escapeInlineScript(original);
    assert.doesNotMatch(escaped, /<\/script/i);
    assert.doesNotMatch(escaped, /<!--/);
    const run = (code) => new Function(`${code}; return [a, r];`)();
    assert.deepEqual(run(escaped), run(original));
  });
});

describe('escapeInlineStyle', () => {
  it('no deja "</style" dentro de <style>', () => {
    assert.equal(escapeInlineStyle('a::after{content:"</style>"}'), 'a::after{content:"<\\/style>"}');
  });
});

describe('stripWoffFallbacks', () => {
  it('quita las .woff y deja las woff2 incrustadas', () => {
    const css =
      '@font-face{font-family:Nunito;src:url(data:font/woff2;base64,AAA) format("woff2"),url(./nunito-latin-600-normal-x1.woff) format("woff")}' +
      "@font-face{font-family:Fredoka;src:url('data:font/woff2;base64,BBB') format('woff2'), url('./fredoka-latin-500-normal.woff') format('woff')}";
    const out = stripWoffFallbacks(css);
    assert.doesNotMatch(out, /\.woff\b(?!2)/);
    assert.match(out, /base64,AAA\) format\("woff2"\)\}/);
    assert.match(out, /base64,BBB'\) format\('woff2'\)\}/);
  });
});

describe('externalCssUrls', () => {
  it('solo señala las URL que no van incrustadas', () => {
    const css = 'a{background:url(data:image/png;base64,QQ==)} b{filter:url(#glow)} c{background:url("./assets/x.jpg")} d{background:url(/img/y.png)}';
    assert.deepEqual(externalCssUrls(css), ['./assets/x.jpg', '/img/y.png']);
  });
});

describe('externalHtmlRefs', () => {
  it('ignora data:, enlaces web, mailto: y anclas', () => {
    const html = '<a href="https://nasa.gov">x</a><a href="mailto:a@b.c">m</a><a href="#top">t</a><img src="data:image/png;base64,QQ=="><img src="./foto.jpg"><link href="/favicon.svg">';
    assert.deepEqual(externalHtmlRefs(html), ['./foto.jpg', '/favicon.svg']);
  });
});

describe('inlineIntoHtml', () => {
  const js = 'document.getElementById("root").textContent = "precio: $& y $1 </script>";';
  const css = 'body{color:red}';
  const page = inlineIntoHtml(VITE_HTML, { js, css, iconDataUrl: 'data:image/svg+xml;base64,PHN2Zy8+', banner: 'Sol a Sol' });

  it('mete el código y el estilo dentro de la página', () => {
    assert.match(page, /<script type="module">\n/);
    assert.ok(page.includes('precio: $& y $1 <\\/script>'), 'los "$&" y "$1" del código se copian tal cual');
    assert.ok(page.includes('<style>\nbody{color:red}\n</style>'));
    assert.ok(page.includes('<!-- Sol a Sol -->'));
  });
  it('no deja ningún src/href que apunte a otro archivo', () => {
    const skeleton = inlineIntoHtml(VITE_HTML, { js: '', css: '', iconDataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' });
    assert.deepEqual(externalHtmlRefs(skeleton), []);
    assert.doesNotMatch(page, /crossorigin|\.\/assets\//);
  });
  it('no acepta un comentario de cabecera con "--"', () => {
    assert.throws(() => inlineIntoHtml(VITE_HTML, { js, css, banner: 'a -- b' }), /--/);
  });
});
