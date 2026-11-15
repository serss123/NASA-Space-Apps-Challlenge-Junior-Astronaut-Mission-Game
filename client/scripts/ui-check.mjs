// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// UI layout checker (docs/DESIGN.md section 8): "one screen, no scroll" at every target viewport.
// It drives a headless Edge or Chrome over the Chrome DevTools Protocol (Node's global WebSocket, no
// dependencies). For every scene x viewport it loads the dev server with a clean localStorage, prepares the
// scene through the dev hooks (window.__solasolApp / window.__solasol), takes a screenshot and checks:
//
//   FAIL  page-scroll        the page itself scrolls
//   FAIL  scroll             an element scrolls sideways (vertical scroll areas are allowed: see WARN scrolls)
//   FAIL  offscreen          a button/link (or text) of the top layer lies outside the viewport
//   FAIL  clipped            a button/link (or text) is cut off by an ancestor with overflow hidden
//   FAIL  does-not-fit       same, inside an area marked [data-fit] (modal bodies, pager pages...)
//   FAIL  text-cut           text does not fit inside its button, heading, label or tab
//   FAIL  primary-covered    something covers the centre of a primary button (.btn-primary)
//   FAIL  console-error      the page logged an error (console.error, exception, failed request)
//   FAIL  setup-error        the scene setup threw / the app or the dev hooks did not load
//   WARN  scrolls            a vertical scroll area has more content than fits (allowed, but try to fit one view)
//   WARN  small-text         text under 13 px
//   WARN  control-covered    something covers the centre of another button
//   WARN  small-target       a control smaller than 44 x 44 px
//
// "Top layer" = the top-most open modal (role=dialog, aria-modal) plus popovers and the AI badge;
// without a modal, the whole page. Skip decorations with aria-hidden="true" or data-ui-check="ignore".
//
// Usage:
//   node client/scripts/ui-check.mjs --url http://localhost:5173 --scenes menu,briefing --viewports all --lang es --out <folder>
// Options:
//   --url <url>            dev server (default http://localhost:5173)
//   --scenes <list|all>    comma list; a trailing * matches a prefix (styleguide*)          (default all)
//   --viewports <list|all> all = the 8 target viewports, or a list such as 1280x720,412x915  (default all)
//   --lang es|en           language of the game (?lang=)                                     (default es)
//   --out <folder>         screenshots + report.json (default: a new folder in the system temp dir)
//   --reduced-motion       emulate prefers-reduced-motion: reduce (stable screenshots)
//   --browser <path>       browser executable (default: auto-detect Edge, then Chrome; or env UI_CHECK_BROWSER)
//   --jobs <n>             runs in parallel, each in its own headless window (default 1; try 2-4 on a fast machine)
//   --list                 list the scenes and exit
// Scenes live in client/scripts/ui-scenes/*.mjs: each file exports default [{ name, description, setup }],
// where `setup` is the body of an async function run in the page (helpers: see wrapSetup below).
// Exit code: 0 when everything passes, 1 when anything fails, 2 for usage or browser errors.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = path.join(HERE, 'ui-scenes');
const TARGET_VIEWPORTS = ['1920x1080', '1366x768', '1280x720', '1024x768', '1024x600', '768x1024', '915x412', '412x915'];
const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/microsoft-edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
];
const SETTLE_MS = 700;
const MAX_PER_TYPE = 12;

// ---------------------------------------------------------------- options
function usage() {
  const head = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
  const start = head.findIndex((l) => l.startsWith('// Usage:'));
  const end = head.findIndex((l) => l.startsWith('import '));
  console.log(
    head
      .slice(start, end)
      .map((l) => l.replace(/^\/\/ ?/, ''))
      .join('\n')
  );
}

function parseArgs(argv) {
  const opts = { url: 'http://localhost:5173', scenes: 'all', viewports: 'all', lang: 'es', out: null, reducedMotion: false, browser: process.env.UI_CHECK_BROWSER || null, list: false, jobs: 1 };
  const flags = { '--reduced-motion': 'reducedMotion', '--list': 'list' };
  const values = { '--url': 'url', '--scenes': 'scenes', '--viewports': 'viewports', '--lang': 'lang', '--out': 'out', '--browser': 'browser', '--jobs': 'jobs' };
  for (let i = 0; i < argv.length; i++) {
    let arg = argv[i];
    let inline = null;
    if (arg.includes('=') && arg.startsWith('--')) [arg, inline] = [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)];
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    } else if (flags[arg]) opts[flags[arg]] = true;
    else if (values[arg]) {
      const v = inline ?? argv[++i];
      if (v == null) throw new Error(`${arg} needs a value`);
      opts[values[arg]] = v;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (!['es', 'en'].includes(opts.lang)) throw new Error('--lang must be es or en');
  opts.jobs = Math.max(1, Math.min(8, Math.floor(Number(opts.jobs)) || 1));
  return opts;
}

function parseViewports(spec) {
  const list = spec === 'all' ? TARGET_VIEWPORTS : spec.split(',').map((s) => s.trim()).filter(Boolean);
  return list.map((v) => {
    const m = /^(\d{3,5})x(\d{3,5})$/.exec(v);
    if (!m) throw new Error(`Bad viewport "${v}" (use WIDTHxHEIGHT, e.g. 1280x720)`);
    return { name: v, width: Number(m[1]), height: Number(m[2]) };
  });
}

async function loadScenes() {
  const files = fs.existsSync(SCENES_DIR) ? fs.readdirSync(SCENES_DIR).filter((f) => f.endsWith('.mjs')).sort() : [];
  const scenes = [];
  const seen = new Map();
  for (const f of files) {
    const mod = await import(pathToFileURL(path.join(SCENES_DIR, f)).href);
    const list = Array.isArray(mod.default) ? mod.default : [];
    for (const s of list) {
      if (!s || typeof s.name !== 'string' || typeof s.setup !== 'string') {
        console.warn(`! ${f}: skipped a scene without a string name and setup`);
        continue;
      }
      if (seen.has(s.name)) {
        console.warn(`! scene "${s.name}" in ${f} is already defined in ${seen.get(s.name)}: kept the first one`);
        continue;
      }
      seen.set(s.name, f);
      scenes.push({ ...s, file: f });
    }
  }
  return scenes;
}

function pickScenes(all, spec) {
  if (spec === 'all') return all;
  const wanted = spec.split(',').map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const w of wanted) {
    const match = w.endsWith('*') ? all.filter((s) => s.name.startsWith(w.slice(0, -1))) : all.filter((s) => s.name === w);
    if (!match.length) throw new Error(`No scene called "${w}". Use --list to see them.`);
    for (const m of match) if (!out.includes(m)) out.push(m);
  }
  return out;
}

// ---------------------------------------------------------------- browser
function findBrowser(explicit) {
  const list = explicit ? [explicit] : BROWSERS;
  const exe = list.find((p) => p && fs.existsSync(p));
  if (!exe) throw new Error(`No Edge or Chrome found. Tried:\n  ${list.join('\n  ')}\nUse --browser <path>.`);
  return exe;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchBrowser(exe) {
  const port = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'solasol-ui-check-profile-'));
  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-sync',
    '--disable-background-networking',
    '--disable-component-update',
    '--mute-audio',
    // several windows render at once: none of them may be throttled as a background tab
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    'about:blank'
  ];
  const proc = spawn(exe, args, { stdio: 'ignore', windowsHide: true });
  let exited = false;
  proc.on('exit', () => (exited = true));
  const deadline = Date.now() + 20000;
  let wsUrl = null;
  while (!wsUrl && Date.now() < deadline) {
    if (exited) break;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      wsUrl = (await res.json()).webSocketDebuggerUrl;
    } catch {
      await sleep(150);
    }
  }
  const browser = { proc, profile, port, isExited: () => exited };
  if (!wsUrl) {
    await killBrowser(browser);
    throw new Error('The browser did not open its DevTools port in time.');
  }
  browser.wsUrl = wsUrl;
  return browser;
}

/** Always kills the browser this script started (its whole process tree) and removes its temp profile. */
async function killBrowser(browser, cdp) {
  if (!browser) return;
  try {
    if (cdp) await Promise.race([cdp.send('Browser.close'), sleep(3000)]);
  } catch {
    /* already closing */
  }
  for (let i = 0; i < 30 && !browser.isExited(); i++) await sleep(100);
  if (!browser.isExited() && browser.proc.pid) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(browser.proc.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    else {
      try {
        browser.proc.kill('SIGKILL');
      } catch {
        /* gone */
      }
    }
  }
  for (let i = 0; i < 10; i++) {
    try {
      fs.rmSync(browser.profile, { recursive: true, force: true });
      break;
    } catch {
      await sleep(300);
    }
  }
}

// ---------------------------------------------------------------- CDP over WebSocket
class CDP {
  constructor(url) {
    if (typeof WebSocket !== 'function') throw new Error('This Node has no global WebSocket (needs Node 22 or newer).');
    this.ws = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Set();
    this.ws.addEventListener('message', (ev) => this.onMessage(ev));
    this.ws.addEventListener('close', () => {
      for (const { reject } of this.pending.values()) reject(new Error('DevTools connection closed'));
      this.pending.clear();
    });
  }
  open() {
    return new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve(), { once: true });
      this.ws.addEventListener('error', () => reject(new Error('Could not connect to the DevTools WebSocket')), { once: true });
    });
  }
  onMessage(ev) {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString('utf8'));
    if (msg.id != null) {
      const p = this.pending.get(msg.id);
      if (!p) return;
      this.pending.delete(msg.id);
      clearTimeout(p.timer);
      if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`));
      else p.resolve(msg.result || {});
      return;
    }
    for (const fn of this.listeners) fn(msg);
  }
  send(method, params = {}, sessionId, timeoutMs = 30000) {
    const id = ++this.nextId;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method}: timed out`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
      this.ws.send(JSON.stringify(payload));
    });
  }
  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  waitFor(sessionId, method, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const off = this.on((msg) => {
        if (msg.sessionId === sessionId && msg.method === method) {
          off();
          clearTimeout(timer);
          resolve(msg.params);
        }
      });
      const timer = setTimeout(() => {
        off();
        reject(new Error(`timed out waiting for ${method}`));
      }, timeoutMs);
    });
  }
  close() {
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

// ---------------------------------------------------------------- in-page code
/** Wraps a scene's setup with small helpers that every scene can use. */
function wrapSetup(setup) {
  return `(async () => {
  const app = window.__solasolApp;            // App-level dev hooks
  const game = () => window.__solasol;          // game-level dev hooks (only on the game screen)
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const waitFor = async (test, ms = 6000) => {
    const t0 = performance.now();
    for (;;) {
      let v = null;
      try { v = typeof test === 'string' ? document.querySelector(test) : await test(); } catch { v = null; }
      if (v) return v;
      if (performance.now() - t0 > ms) throw new Error('waitFor timed out: ' + String(test));
      await sleep(50);
    }
  };
  const click = async (target) => {
    const el = typeof target === 'string' ? await waitFor(target) : target;
    el.click();
    await frame();
    return el;
  };
  const clickText = async (text, sel = 'button, [role="tab"], a') => {
    const el = await waitFor(() => $$(sel).find((n) => (n.innerText || n.getAttribute('aria-label') || '').toLowerCase().includes(String(text).toLowerCase())));
    return click(el);
  };
  ${setup}
})()`;
}

/** Runs inside the page: returns { fails, warns } for the current layout. Must not use outer variables. */
function pageChecks(maxPerType) {
  const TOL = 2;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const out = { fails: [], warns: [] };
  const counts = {};
  const describe = (el) => {
    const parts = [];
    for (let n = el, depth = 0; n && n.nodeType === 1 && depth < 4; n = n.parentElement, depth++) {
      let s = n.tagName.toLowerCase();
      if (n.id && !/^(:|«|r\d)/.test(n.id)) {
        parts.unshift(`${s}#${n.id}`);
        break;
      }
      const cls = [...n.classList].filter((c) => !/^(is-|rm-|anim-)/.test(c)).slice(0, 2);
      if (cls.length) s += `.${cls.join('.')}`;
      parts.unshift(s);
    }
    return parts.join(' > ');
  };
  const textOf = (el) => (el.innerText || el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const add = (level, type, el, message) => {
    const key = `${level}:${type}`;
    counts[key] = (counts[key] || 0) + 1;
    if (counts[key] > maxPerType) return;
    out[level].push({ type, target: el ? describe(el) : null, text: el ? textOf(el) : undefined, message });
  };
  const ignored = (el) => !!el.closest('[aria-hidden="true"], [data-ui-check="ignore"], .sr-only, [inert], template');
  const isVisible = (el) => {
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const clipsOverflow = (cs) => cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
  const paddingBox = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const bl = parseFloat(cs.borderLeftWidth) || 0;
    const bt = parseFloat(cs.borderTopWidth) || 0;
    const br = parseFloat(cs.borderRightWidth) || 0;
    const bb = parseFloat(cs.borderBottomWidth) || 0;
    return { left: r.left + bl, top: r.top + bt, right: r.right - br, bottom: r.bottom - bb };
  };
  /** The area where el is visible, after every ancestor that clips it (and el itself if `self`). */
  const clipOf = (el, self) => {
    let box = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity };
    let by = null;
    // A vertical scroll area (overflow-y auto/scroll) does not hide what is below its fold: that content is one scroll away.
    // So the first scroll area on the chain only clips sideways, and the ancestors outside it clip the scroll area itself
    // (it must lie inside them), not the content that is scrolled. Everything else clips on both axes.
    let scrollBox = null;
    const outer = { top: -Infinity, bottom: Infinity };
    const cut = (p) => {
      const pb = paddingBox(p);
      const scrollsY = /(auto|scroll)/.test(getComputedStyle(p).overflowY);
      box = { ...box, left: Math.max(box.left, pb.left), right: Math.min(box.right, pb.right) };
      if (scrollBox) {
        outer.top = Math.max(outer.top, pb.top);
        outer.bottom = Math.min(outer.bottom, pb.bottom);
      } else if (scrollsY) {
        scrollBox = pb;
      } else {
        box = { ...box, top: Math.max(box.top, pb.top), bottom: Math.min(box.bottom, pb.bottom) };
      }
      by = p;
    };
    let pos = getComputedStyle(el).position;
    if (self && clipsOverflow(getComputedStyle(el))) cut(el);
    // html, body and #root only clip to the viewport: that is reported as "offscreen" instead.
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement && p.id !== 'root'; p = p.parentElement) {
      const cs = getComputedStyle(p);
      const makesBlock = cs.transform !== 'none' || cs.filter !== 'none' || cs.perspective !== 'none' || /paint|layout|strict|content/.test(cs.contain || '');
      const isContainer = pos === 'fixed' ? makesBlock : pos === 'absolute' ? cs.position !== 'static' || makesBlock : true;
      if (!isContainer) continue;
      if (clipsOverflow(cs)) cut(p);
      pos = cs.position;
    }
    // If the scroll area itself sticks out of an outer ancestor, its content is cut off for real.
    if (scrollBox && (scrollBox.top < outer.top - 1 || scrollBox.bottom > outer.bottom + 1)) box = { ...box, top: Math.max(box.top, outer.top), bottom: Math.min(box.bottom, outer.bottom) };
    return { box, by };
  };
  const textBox = (el, deep) => {
    let l = Infinity;
    let t = Infinity;
    let r = -Infinity;
    let b = -Infinity;
    let lineH = 0;
    const nodes = [];
    if (deep) {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) if (n.textContent.trim() && !ignored(n.parentElement)) nodes.push(n);
    } else for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) nodes.push(n);
    const range = document.createRange();
    for (const n of nodes) {
      range.selectNodeContents(n);
      for (const rc of range.getClientRects()) {
        if (rc.width < 0.5 || rc.height < 0.5) continue;
        l = Math.min(l, rc.left);
        t = Math.min(t, rc.top);
        r = Math.max(r, rc.right);
        b = Math.max(b, rc.bottom);
        lineH = Math.max(lineH, rc.height);
      }
    }
    return l === Infinity ? null : { left: l, top: t, right: r, bottom: b, lineH };
  };
  const outside = (a, box, tol = TOL, tolY = tol) => a.left < box.left - tol || a.top < box.top - tolY || a.right > box.right + tol || a.bottom > box.bottom + tolY;
  /** Glyphs may overhang a tight line-height (e.g. 1.05) by half the difference: that is not a cut. */
  const overhang = (el, tb) => {
    const cs = getComputedStyle(el);
    const lh = cs.lineHeight === 'normal' ? parseFloat(cs.fontSize) * 1.2 : parseFloat(cs.lineHeight);
    return Math.max(0, (tb.lineH - (Number.isFinite(lh) ? lh : tb.lineH)) / 2);
  };
  const viewport = { left: 0, top: 0, right: vw, bottom: vh };
  /** Inside a vertical scroll area: what lies below the fold is one scroll away, so only the sides count for "offscreen". */
  const inScrollY = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement && p.id !== 'root'; p = p.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return true;
    }
    return false;
  };
  const viewportFor = (el) => (inScrollY(el) ? { left: 0, right: vw, top: -Infinity, bottom: Infinity } : viewport);
  const px = (n) => Math.round(n);

  // 0. Vite error overlay
  if (document.querySelector('vite-error-overlay')) add('fails', 'console-error', null, 'Vite error overlay is showing (compile error)');

  // 1. The page must not scroll
  const se = document.scrollingElement || document.documentElement;
  if (se.scrollHeight > se.clientHeight + 1 || se.scrollWidth > se.clientWidth + 1 || window.scrollY || window.scrollX)
    add('fails', 'page-scroll', null, `page content is ${se.scrollWidth}x${se.scrollHeight} for a ${se.clientWidth}x${se.clientHeight} viewport`);

  // 2. Sideways scrolling is a failure. Vertical scrolling inside a designed scroll area is allowed (it is the safety net
  //    when content does not fit one view): it is reported as a warning so we know which screens still need it.
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const sx = /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1;
    const sy = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1;
    if (sx && isVisible(el)) add('fails', 'scroll', el, `scrolls sideways: content ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`);
    else if (sy && isVisible(el)) add('warns', 'scrolls', el, `scrolls: content ${el.scrollWidth}x${el.scrollHeight} in ${el.clientWidth}x${el.clientHeight}`);
  }

  // The top layer: the top-most modal (plus popovers and the AI badge), or the whole page.
  const dialogs = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].filter(isVisible);
  const top = dialogs[dialogs.length - 1] || null;
  const inTop = (el) => !top || top.contains(el) || !!el.closest('[data-popover], [data-ai-badge]');

  // 3. Controls: inside the viewport, not clipped, not covered
  const CONTROLS = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="link"], [role="checkbox"], [role="switch"], [tabindex]:not([tabindex="-1"])';
  for (const el of document.querySelectorAll(CONTROLS)) {
    if (ignored(el) || !inTop(el) || !isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    // Report the cause: first an ancestor that cuts the control off, then the viewport edge.
    const { box, by } = clipOf(el, false);
    if (by && outside(r, box, 1)) {
      add('fails', by.hasAttribute('data-fit') ? 'does-not-fit' : 'clipped', el, `control is cut off by ${describe(by)}`);
      continue;
    }
    if (outside(r, viewportFor(el), 1)) {
      add('fails', 'offscreen', el, `control at ${px(r.left)},${px(r.top)} ${px(r.width)}x${px(r.height)} is outside the ${vw}x${vh} viewport`);
      continue;
    }
    // A link that wraps over two lines has a bounding box whose centre may fall between its fragments:
    // hit-test the centre of its first fragment instead.
    const frags = el.getClientRects();
    const hr = frags.length > 1 ? frags[0] : r;
    const cx = hr.left + hr.width / 2;
    const cy = hr.top + hr.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    const transient = hit && hit.closest('[data-popover]') && !el.closest('[data-popover]'); // an open popover is temporary
    if (hit && hit !== el && !el.contains(hit) && !transient) {
      if (el.matches('.btn-primary')) add('fails', 'primary-covered', el, `its centre is covered by ${describe(hit)}`);
      else add('warns', 'control-covered', el, `its centre is covered by ${describe(hit)}`);
    }
    const inline = getComputedStyle(el).display === 'inline';
    if (!inline && !el.matches('.tag, .pager-dot, .term, .ai-badge') && (r.width < 44 || r.height < 44)) add('warns', 'small-target', el, `only ${px(r.width)}x${px(r.height)} px`);
  }

  // 4. Text cut inside buttons, headings, labels and tabs
  const LABELLED = 'button, [role="button"], [role="tab"], .btn, h1, h2, h3, h4, h5, h6, label, legend, summary, th, .tag, [data-check-text]';
  for (const el of document.querySelectorAll(LABELLED)) {
    if (ignored(el) || !inTop(el) || !isVisible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'inline') continue;
    const tb = textBox(el, true);
    if (!tb) continue;
    const pb = paddingBox(el);
    const ellipsis = cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1;
    if (ellipsis || outside(tb, pb, 1.5, 1.5 + overhang(el, tb))) add('fails', 'text-cut', el, `text ${px(tb.right - tb.left)}x${px(tb.bottom - tb.top)} does not fit in ${px(pb.right - pb.left)}x${px(pb.bottom - pb.top)}`);
  }

  // 5. Any text: inside the viewport and not clipped; warn when smaller than 13 px
  const small = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
    let hasText = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) hasText = true;
    if (!hasText || ignored(el) || !inTop(el) || !isVisible(el)) continue;
    const tb = textBox(el, false);
    if (!tb) continue;
    const oh = overhang(el, tb);
    const { box, by } = clipOf(el, true);
    if (by && outside(tb, box, TOL, TOL + oh)) add('fails', by.hasAttribute('data-fit') ? 'does-not-fit' : 'clipped', el, `text is cut off by ${describe(by)}`);
    else if (outside(tb, viewportFor(el), 1, 1 + oh)) add('fails', 'offscreen', el, `text at ${px(tb.left)},${px(tb.top)} goes outside the ${vw}x${vh} viewport`);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 13) {
      const key = `${describe(el)}|${fs}`;
      if (!small.has(key)) {
        small.add(key);
        add('warns', 'small-text', el, `${fs.toFixed(1)} px`);
      }
    }
  }

  for (const [key, n] of Object.entries(counts)) {
    if (n > maxPerType) {
      const [level, type] = key.split(':');
      out[level].push({ type, target: null, message: `...and ${n - maxPerType} more ${type}` });
    }
  }
  return out;
}

// ---------------------------------------------------------------- one run
async function runOne(cdp, { scene, vp, opts }) {
  const t0 = Date.now();
  const result = { scene: scene.name, viewport: vp.name, status: 'PASS', fails: [], warns: [], screenshot: null, ms: 0, phases: {} };
  let lap = Date.now();
  const phase = (name) => {
    const now = Date.now();
    result.phases[name] = now - lap;
    lap = now;
  };
  const consoleErrors = [];
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', newWindow: true });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const off = cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ').slice(0, 300));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      consoleErrors.push(`uncaught: ${(d.exception?.description || d.text || '').split('\n')[0]}`.slice(0, 300));
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      consoleErrors.push(`${msg.params.entry.source}: ${msg.params.entry.text} ${msg.params.entry.url || ''}`.slice(0, 300));
    }
  });
  const S = (method, params, timeout) => cdp.send(method, params, sessionId, timeout);
  const evaluate = async (expression, timeout = 30000) => {
    const r = await S('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, timeout);
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error((d.exception?.description || d.text || 'error').split('\n')[0]);
    }
    return r.result?.value;
  };
  try {
    await Promise.all([S('Page.enable'), S('Runtime.enable'), S('Log.enable')]);
    await S('Emulation.setFocusEmulationEnabled', { enabled: true });
    await S('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.width < 900 });
    if (opts.reducedMotion) await S('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    // A fresh player: empty localStorage on the first document of this tab.
    await S('Page.addScriptToEvaluateOnNewDocument', {
      source: "try { if (!sessionStorage.getItem('__uiCheck')) { localStorage.clear(); sessionStorage.setItem('__uiCheck', '1'); } } catch (e) {}"
    });
    const url = new URL(opts.url);
    url.searchParams.set('lang', opts.lang);
    const loaded = cdp.waitFor(sessionId, 'Page.loadEventFired', 45000);
    await S('Page.navigate', { url: url.href });
    await loaded;
    phase('load');
    const ready = await evaluate(
      `(async () => { const t0 = performance.now(); while (!window.__solasolApp) { if (performance.now() - t0 > 15000) return false; await new Promise((r) => setTimeout(r, 50)); } return true; })()`,
      20000
    );
    if (!ready) throw new Error('window.__solasolApp never appeared (is this the dev server?)');
    phase('app');
    try {
      await evaluate(wrapSetup(scene.setup), 45000);
    } catch (err) {
      result.fails.push({ type: 'setup-error', target: null, message: err.message });
    }
    phase('setup');
    await evaluate(`(async () => { await document.fonts.ready; await new Promise((r) => setTimeout(r, ${SETTLE_MS})); return true; })()`);
    phase('settle');
    const shot = await S('Page.captureScreenshot', { format: 'png' }, 60000);
    const file = `${scene.name}__${vp.name}.png`;
    fs.writeFileSync(path.join(opts.out, file), Buffer.from(shot.data, 'base64'));
    result.screenshot = file;
    phase('screenshot');
    const found = await evaluate(`(${pageChecks.toString()})(${MAX_PER_TYPE})`);
    result.fails.push(...found.fails);
    result.warns.push(...found.warns);
    phase('checks');
  } catch (err) {
    result.fails.push({ type: 'setup-error', target: null, message: err.message });
  } finally {
    off();
    for (const msg of [...new Set(consoleErrors)].slice(0, MAX_PER_TYPE)) result.fails.push({ type: 'console-error', target: null, message: msg });
    try {
      await cdp.send('Target.closeTarget', { targetId });
    } catch {
      /* already closed */
    }
  }
  if (result.fails.length) result.status = 'FAIL';
  result.ms = Date.now() - t0;
  return result;
}

// ---------------------------------------------------------------- report
function summarize(list) {
  const by = {};
  for (const f of list) by[f.type] = (by[f.type] || 0) + 1;
  return Object.entries(by)
    .map(([k, n]) => `${k}×${n}`)
    .join(' ');
}

function printTable(results) {
  const rows = results.map((r) => [r.scene, r.viewport, r.status, String(r.fails.length), String(r.warns.length), summarize(r.fails) || (r.warns.length ? `(warn) ${summarize(r.warns)}` : '')]);
  const head = ['scene', 'viewport', 'status', 'fails', 'warns', 'issues'];
  const widths = head.map((h, i) => Math.min(48, Math.max(h.length, ...rows.map((r) => r[i].length))));
  const line = (cells) => cells.map((c, i) => (i === cells.length - 1 ? c : c.padEnd(widths[i]))).join('  ');
  console.log(line(head));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(r));
}

// ---------------------------------------------------------------- main
async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    usage();
    process.exit(2);
  }
  const allScenes = await loadScenes();
  if (opts.list) {
    for (const s of allScenes) console.log(`${s.name.padEnd(24)} ${s.file.padEnd(14)} ${s.description || ''}`);
    return 0;
  }
  const scenes = pickScenes(allScenes, opts.scenes);
  const viewports = parseViewports(opts.viewports);
  opts.out = path.resolve(opts.out || path.join(os.tmpdir(), 'solasol-ui-check', new Date().toISOString().replace(/[:.]/g, '-')));
  fs.mkdirSync(opts.out, { recursive: true });

  const exe = findBrowser(opts.browser);
  console.log(`ui-check · ${scenes.length} scene(s) × ${viewports.length} viewport(s) · ${opts.jobs} job(s) · ${opts.url} · lang=${opts.lang}${opts.reducedMotion ? ' · reduced motion' : ''}`);
  console.log(`browser: ${exe}`);
  console.log(`output:  ${opts.out}\n`);

  let browser = null;
  let cdp = null;
  const cleanup = async () => {
    cdp?.close();
    await killBrowser(browser, null);
  };
  const onSignal = () => {
    cleanup().finally(() => process.exit(130));
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  const results = [];
  try {
    browser = await launchBrowser(exe);
    cdp = new CDP(browser.wsUrl);
    await cdp.open();
    const queue = [];
    for (const scene of scenes) for (const vp of viewports) queue.push({ scene, vp, index: queue.length });
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const r = await runOne(cdp, { scene: job.scene, vp: job.vp, opts });
        results[job.index] = r;
        const mark = r.status === 'PASS' ? 'ok  ' : 'FAIL';
        console.log(`${mark} ${job.scene.name} @ ${job.vp.name} (${(r.ms / 1000).toFixed(1)} s)${r.fails.length ? ` · ${summarize(r.fails)}` : ''}`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(opts.jobs, queue.length) }, worker));
  } finally {
    try {
      await killBrowser(browser, cdp);
    } finally {
      cdp?.close();
    }
  }

  const report = {
    tool: 'client/scripts/ui-check.mjs',
    date: new Date().toISOString(),
    url: opts.url,
    lang: opts.lang,
    reducedMotion: opts.reducedMotion,
    browser: exe,
    viewports: viewports.map((v) => v.name),
    scenes: scenes.map((s) => ({ name: s.name, file: s.file, description: s.description || '' })),
    passed: results.filter((r) => r.status === 'PASS').length,
    failed: results.filter((r) => r.status === 'FAIL').length,
    results
  };
  fs.writeFileSync(path.join(opts.out, 'report.json'), JSON.stringify(report, null, 2));
  console.log('');
  printTable(results);
  console.log(`\n${report.passed} passed · ${report.failed} failed · report: ${path.join(opts.out, 'report.json')}`);
  return report.failed ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`ui-check: ${err.message}`);
    process.exit(2);
  });
