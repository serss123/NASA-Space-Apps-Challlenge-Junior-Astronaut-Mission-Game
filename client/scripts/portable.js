// Utilidades puras para la versión de UN SOLO ARCHIVO (build-portable.mjs): sin Vite ni disco, para poder probarlas.
// Idea: el index.html de Vite enlaza un JS y un CSS; aquí se meten dentro del HTML para que el juego se abra
// con doble clic (file://), donde el navegador no deja cargar módulos ni fuentes desde otros archivos.

const SCRIPT_TAG = /<script\b[^>]*\bsrc="([^"]+\.js)"[^>]*><\/script>/gi;
const STYLE_TAG = /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+\.css)"[^>]*>/gi;
const ICON_TAG = /<link\b[^>]*\brel="icon"[^>]*>/gi;

/** El único JS y el único CSS que Vite enlaza en index.html (si hubiera más, el código se partió en trozos). */
export function linkedAssets(html) {
  const js = [...html.matchAll(SCRIPT_TAG)].map((m) => m[1]);
  const css = [...html.matchAll(STYLE_TAG)].map((m) => m[1]);
  if (js.length !== 1 || css.length !== 1) {
    throw new Error(`Se esperaba 1 JS y 1 CSS enlazados en index.html (hay ${js.length} JS y ${css.length} CSS)`);
  }
  return { js: js[0], css: css[0] };
}

/** JS listo para ir dentro de <script>: un "</script" o un "<!--" literales cerrarían o confundirían la etiqueta. */
export function escapeInlineScript(js) {
  return js.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '\\x3C!--');
}

/** CSS listo para ir dentro de <style>. */
export function escapeInlineStyle(css) {
  return css.replace(/<\/(style)/gi, '<\\/$1');
}

/** Quita las fuentes .woff de respaldo: todos los navegadores actuales usan la woff2, que va incrustada. */
export function stripWoffFallbacks(css) {
  return css.replace(/,\s*url\(\s*(['"]?)[^'")]+?\.woff\1\s*\)\s*format\(\s*(['"])woff\2\s*\)/gi, '');
}

/** URLs de un CSS que NO van incrustadas (todo lo que no sea data: ni un #fragmento). */
export function externalCssUrls(css) {
  const out = [];
  for (const m of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    const url = m[2].trim();
    if (!/^(data:|#)/i.test(url)) out.push(url);
  }
  return out;
}

/** src/href de la página que apuntan a archivos (los enlaces web, mailto: y data: sí valen). */
export function externalHtmlRefs(html) {
  const out = [];
  for (const m of html.matchAll(/\b(?:src|href)\s*=\s*(['"])(.*?)\1/gi)) {
    const url = m[2].trim();
    if (!/^(data:|https?:|mailto:|#)/i.test(url)) out.push(url);
  }
  return out;
}

/**
 * Mete el JS, el CSS y el icono dentro del HTML. Los reemplazos usan funciones para que un "$&" o "$1"
 * del código no se interprete como patrón de String.replace.
 */
export function inlineIntoHtml(html, { js, css, iconDataUrl = null, banner = '' }) {
  linkedAssets(html); // valida que hay exactamente un JS y un CSS
  let out = html
    .replace(SCRIPT_TAG, () => `<script type="module">\n${escapeInlineScript(js)}\n</script>`)
    .replace(STYLE_TAG, () => `<style>\n${escapeInlineStyle(css)}\n</style>`);
  if (iconDataUrl) out = out.replace(ICON_TAG, () => `<link rel="icon" type="image/svg+xml" href="${iconDataUrl}" />`);
  if (banner) {
    if (banner.includes('--')) throw new Error('El comentario de cabecera no puede contener "--"');
    out = out.replace(/<head>/i, () => `<head>\n    <!-- ${banner} -->`);
  }
  return out;
}
