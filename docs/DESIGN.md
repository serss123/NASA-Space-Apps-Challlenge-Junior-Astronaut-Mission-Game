# Sol a Sol — Design and writing guide (v2)

Shared brief for everyone working on the v2 redesign, people and AI agents alike. Docs and code comments are in English. Player-facing texts are bilingual: Spanish first, English mirror.

## 1. What the team asked for (feedback on v1)

1. **One screen, no scrolling.** Show only what the player needs right now; every button is always visible.
2. **Language for 7–12-year-olds.** Simple and short. Technical words appear only when they are worth learning, are always explained (clickable glossary pill), and are collected in the **Discovery Journal**, which must work as a study guide of everything learned during the mission.
3. **A more commercial, lively, distinctive look.** v1 felt static and generic (dark navy cards, emoji everywhere, glow).
4. **Code that judges can navigate easily**, with docs and comments in English, and a README that answers the organisers' questions and AI-use rules.
5. **Remove the classroom "mission of the day / game code" feature** (it does not fit the game's dynamic).

The game rules, the NASA data pipeline and the features were approved: do not change gameplay unless this guide says so.

## 2. Art direction — "Cartoon Lunar Outpost"

A living cartoon diorama at the Moon's south pole: thick ink outlines, flat bright fills, one-step cel shading and chunky toy-like UI that pops when touched.

- **Sky:** animated deep violet space (never navy) with twinkling parallax stars, a slowly turning Earth low on the horizon and the Sun glowing at one edge; a shooting star now and then. Solar storms tint the sky warm and send particle streaks from the Sun's side.
- **Surfaces:** panels are cream "paper stickers" (light and warm) with a 3 px ink outline and a hard ink drop shadow. Text on panels is dark ink, so it is easy to read. The base map is light lilac-grey Moon ground with ink-outlined modules.
- **Characters:**
  - **The astronaut:** the player, with the suit colour chosen in Settings.
  - **Sol, the Sun:** a face that shows space weather. Level 0 is calm and smiling, 1 restless, 2 angry, 3 furious with flare "hair". It replaces most storm numbers in the main UI. It appears in the HUD (only when the weather is known), the night report, the briefing and the menu logo.
  - **Mission Control:** a small Earth with a headset that talks in one-sentence speech bubbles (tips, mission messages). It replaces the v1 checklist panel.
- **Icons:** no emoji in the UI chrome (buttons, titles, HUD, tabs, tags, toasts). Use the SVG icon set (`<Icon name="…">`). Content cards (glossary, discoveries, facts) may show **one** emoji as an illustration sticker.
- **Avoid:** glassmorphism, neon glows, navy gradients, hairline borders, walls of small grey text.
- **NASA branding:** never use NASA logos, insignia, mission patches, flags or anything that imitates NASA branding. The word "NASA" appears only as a credit for data and images. The data page and README say the game is not an official NASA product.

### 2.1 Tokens (`client/src/styles/tokens.css`)

| Group | Tokens |
|---|---|
| Ink and paper | `--ink #1b1036` (outlines, text on light) · `--ink-2 #3b2d63` · `--ink-3 #6b5f8e` · `--paper #fff7e8` · `--paper-2 #ffeccc` · `--paper-3 #f5dfb8` · `--on-dark #fff7e8` · `--on-dark-dim #d8ccff` |
| Sky | `--sky-top #170b3b` · `--sky-mid #2d1466` · `--sky-low #5b1f7a` · `--horizon #ff8a5b` · `--storm-tint #ff3d6e` · `--aurora-1 #3df5c5` · `--aurora-2 #7c5cff` |
| Moon ground | `--moon-hi #ece6f7` · `--moon #c9bfdf` · `--moon-lo #9a8dbb` · `--moon-shadow #5e4f86` |
| Resources | `--heart #ff3f6c` · `--energy #ffc93c` · `--stamina #2fd38a` · `--food #ff9a3c` · `--ice #6fd8ff` · `--metal #a9b8d1` · `--sample #d79b62` · `--science #8a5cff` |
| Buildings | `--life #3fa7ff` · `--farm #45cf63` · `--antenna #19c2b0` · `--shield #2fc4ff` · `--rover #ff7a33` · `--bed #ff6fb5` |
| States | `--ok #2fd38a` · `--warn #ffb020` · `--danger #ff3f5c` · `--info #3fa7ff` |
| Data tags | `--tag-live #ff3f5c` · `--tag-archive #ffb703` · `--tag-sim #9b5de5` · `--tag-calc #00b8a9` · `--tag-design #6b5f8e` · `--tag-nasa #3fa7ff` |
| Shape | `--outline 3px` · `--outline-sm 2px` · `--r-xl 28px` · `--r-lg 22px` · `--r-md 16px` · `--r-sm 12px` · `--r-pill 999px` · `--shadow-hard 0 6px 0 var(--ink)` · `--shadow-hard-sm 0 4px 0 var(--ink)` · `--shadow-soft 0 18px 40px rgb(10 4 30 / 45%)` |
| Motion | `--ease-spring cubic-bezier(.34,1.56,.64,1)` · `--ease-out cubic-bezier(.22,1,.36,1)` · `--dur-fast 140ms` · `--dur 260ms` · `--dur-slow 480ms` |
| Layers | `--z-backdrop 0` · `--z-map 1` · `--z-hud 20` · `--z-toast 60` · `--z-modal 80` · `--z-popover 120` · `--z-badge 140` |

### 2.2 Type

- **Fonts:** display is Fredoka 600/700; body and UI are Nunito 700/800 (600 for longer text). Both are already bundled with @fontsource, so no new fonts are needed.
- **"Sticker title" style for big titles:** light fill, thick ink stroke (`paint-order: stroke fill`) and a hard ink shadow.
- **Sizes:** use `clamp()`. Minimum 15 px on phones; body 17–19 px on desktop. Line length ≤ 60ch.

### 2.3 Motion: never static, never noisy

- **Ambient:** stars twinkle, the Earth turns, the Sun breathes, the astronaut idles and bobs when walking (dust puffs), the antenna dish sweeps, farm leaves sway, the shield shimmers when charged, beacons blink.
- **Feedback:**
  - Buttons lift on hover and squash on press.
  - Numbers tick up or down; hearts pop when gained and shake when lost.
  - Energy tokens bounce when allocated; new items bounce in.
  - A success throws a short burst of confetti stars.
- **Transitions:** screens and modals enter with a short spring (≤ 350 ms); lists stagger in 40 ms steps.
- **Reduced motion:** everything respects `prefers-reduced-motion` and the in-game "Reduce motion" setting (class `.reduced-motion` on `<html>`). Ambient loops stop and transitions become fades of 120 ms or less.
- **Performance:** animate only `transform` and `opacity`, for school laptops.

## 3. Layout: everything in one view, with scroll as the safety net

- **The goal is one view.** Each screen should show everything it needs from a single point of view, without hunting. Design for that first: compact blocks, columns on wide screens, short texts.
- **Scroll is allowed, never hiding.** When something does not fit, an inner scroll area (`.scroll-y`, a Modal body, a screen) lets the player reach it. Never cut, hide, paginate or shrink content just to avoid a scrollbar.
- **The page itself never scrolls.** `html`, `body` and `#root` are 100 % high with `overflow: hidden`; every screen fills `100dvh` and scrolls inside if it must. Sideways scrolling is never allowed.
- **Target viewports (all must pass):**
  - Desktop and laptop: 1920×1080, 1366×768, 1280×720, 1024×768, 1024×600.
  - Tablet: 768×1024 (portrait).
  - Phones (compact mode): 915×412 (landscape), 412×915 (portrait).
- **Modals:**
  - Three parts: header, body and footer.
  - The footer holds the primary actions and is **always visible**.
  - The body scrolls only when its content is taller than the window.
- **Long collections** (journal, words, sources, day tables) are shown in full, in columns, inside one scroll area. Tabs may group them by topic.
- **Text:** short sentences, details behind a "Saber más / Learn more" only when they are really optional.
- **Legibility first:** text colour must follow the surface. Paper (cream) surfaces use ink text; dark surfaces use `--on-dark`. The legacy `--ink` is dark ink: never put it on a dark background (dark play areas, like the minigames and the Rover, set their own light text).
- **Buttons:**
  - One primary button per view, at the bottom right (full width on phones).
  - Touch targets ≥ 44×44 px.
- **Check:** verify with `node client/scripts/ui-check.mjs` (§8). A screen is done when it passes at every target viewport (scroll areas only raise a warning).

## 4. Writing for 7–12-year-olds (Spanish first, English mirror)

- **Address and style:** speak to the player with "tú" / "you". Use short sentences (14 words or fewer), one idea each, active voice and present tense.
- **Rough reading level:** age 8 in Spanish, Year 3–4 in English.
- **Numbers:**
  - Round them and compare them with something familiar: "45 veces más radiación de lo normal" / "45 times more radiation than normal".
  - No units such as µGy/h, mSv or km/s in the main UI. Speed may say "más rápido que una bala" / "faster than a bullet" or a rounded figure in "Saber más".
- **Acronyms:** only when they are worth learning, and always as a glossary pill (e.g. `[[cme|nube de plasma]]`).
  - Instrument names (CRaTER, DOSTEL, RAD) and model names (WSA-Enlil, Kp) appear only in the grown-ups section of the data page.
- **Technical words:** wrap every one that remains in `[[glossary-id]]` or `[[glossary-id|visible text]]`, with at most 2 per sentence and 3 per block. The first time a word is shown in a mission, the Journal records it.
- **Tone:** encouraging and playful, never scary. Losing all hearts is "¡Rescate! Todos a salvo" / "Rescue! Everyone is safe", never "game over".
- **Consistency:** the same thing always has the same name (table below). Translate meaning, not words.

| Concept | Spanish (game) | English (game) | Notes |
|---|---|---|---|
| Action points | Fuerzas | Stamina | "Te quedan 3 Fuerzas" |
| Daily power | Energía (⚡ icon) | Energy | from the solar panels each morning |
| Health | Corazones | Hearts | 5 hearts |
| Research progress | Ciencia | Science | percentage up to 100 % |
| Resources | Comida · Hielo · Metal · Rocas | Food · Ice · Metal · Rocks | rocks = samples |
| Buildings | Soporte Vital · Granja · Antena · Escudo · Cama · Rover | Life Support · Farm · Antenna · Shield · Bed · Rover | Life Support and Rover get a pill |
| Storm level 0–3 | Calma · Tormenta pequeña · Tormenta fuerte · Supertormenta | Calm · Small storm · Strong storm · Super storm | always with Sol's face |
| CME | nube de plasma (CME) | plasma cloud (CME) | glossary pill |
| Flare | llamarada | flare | class letters (M, X) only in "Saber más" |
| Kp | fuerza de la tormenta magnética, de 0 a 9 | magnetic storm strength, 0 to 9 | no "Kp" in main UI |
| SEP | lluvia de partículas del Sol | solar particle shower | glossary pill |
| Magnetosphere | escudo magnético de la Tierra | Earth's magnetic shield | glossary pill `magnetosphere` |
| ISS | Estación Espacial | Space Station | |
| Missions | "La gran tormenta de 2024" · "El Sol de hoy" · "Marte (pronto)" | "The great storm of 2024" · "Today's Sun" · "Mars (soon)" | |
| Journal | Diario de descubrimientos | Discovery Journal | was "Cuaderno" |

**Before and after.** In v1, a discovery said: "Cada mañana los paneles solares te dan 3, 4 o 5 ⚡ (2 + el nivel del Soporte Vital, y 1 menos si están sucios). Repártelos: antena 1, granja 1 y escudo 1 por cada nivel de carga."

In v2 the same card is split into four short fields:
- `happened`: "¡Buenos días! Tus [[solar-panel|paneles solares]] te dan energía."
- `learn`: "Cada mañana recibes ⚡. Repártela entre la antena, la granja y el escudo. Nunca hay para todo."
- `remember`: "La energía es poca: elige bien."

In v1, a night summary said: "15 flares recorded (X3.9); the fastest CME left at 1018 km/s; CME shock at Earth at 16:36 UTC; …".

In v2 it becomes up to three kid facts:
- "El Sol lanzó 15 llamaradas."
- "Una nube de plasma salió disparada hacia la Tierra."
- "En la Tierra hubo auroras: tormenta magnética de 9 sobre 9."

## 5. The Discovery Journal is the study guide

- **Name:** "Diario de descubrimientos" / "Discovery Journal".
- **Chapters:** one per topic (`TOPICS` in `content/discoveries.js`), each with an icon and a progress meter of three stars.

  | id | Spanish | English |
  |---|---|---|
  | `energy` | Energía | Energy |
  | `radiation` | Radiación y escudo | Radiation and shield |
  | `life` | Vida en la base | Life at the base (air, water, food, health) |
  | `comms` | Comunicación | Communication |
  | `sun` | El Sol y el clima espacial | The Sun and space weather |
  | `moon` | La Luna y la exploración | The Moon and exploration (rover, rocks, ice, NASA tools) |

- **Cards:** each discovery card is a mini lesson with an icon or emoji sticker, a title (5 words or fewer), "Lo que pasó" (`happened`), "Lo que aprendiste" (`learn`), "Recuerda" (`remember`), the words it teaches (glossary chips) and an optional "Para mayores" link (`source`).
- **Locked cards** show a hint (`hint`) such as "Pista: carga el escudo antes de una tormenta".
- **"Palabras de astronauta" / "Astronaut words":** every glossary word the player has met, with its simple definition and example, grouped by topic and paged.
- **No scrollbar:** chapter tabs, a paged grid of cards, and a detail view that replaces the grid.

## 6. Content and data shapes (v2)

```js
// content/discoveries.js
export const TOPICS = [{ id: 'energy', icon: 'bolt', title: { es, en } }, …]; // order = journal chapters
export const DISCOVERIES = {
  'base-energy': {
    emoji: '⚡',          // one illustration sticker (content only)
    topic: 'energy',     // one of TOPICS ids
    tag: 'DISEÑO',       // data label kind (EN VIVO | ARCHIVO | SIMULADO | CALCULADO | DISEÑO | NASA)
    title: { es, en },   // ≤ 5 words
    happened: { es, en },// 1 short sentence: what just happened in YOUR mission (shown in the toast)
    learn: { es, en },   // 1–2 short sentences, the science at kid level, with [[glossary]] pills
    remember: { es, en },// ≤ 10 words takeaway
    hint: { es, en },    // ≤ 10 words: how to unlock it (shown on locked cards)
    words: ['solar-panel', 'battery'], // glossary ids this card teaches (0–3)
    source: { label, url } // optional, for grown-ups
  }
};
export const DISCOVERY_ORDER = [...]; // reading order inside each chapter

// content/glossary.js
'magnetosphere': {
  emoji: '🧲', topic: 'sun',
  es: { term: 'magnetosfera', def: '≤ 20 words, simple', example: '≤ 15 words: "Es como…"' },
  en: { term: 'magnetosphere', def: '…', example: '…' },
  source: { label, url } // optional
}

// shared/gameTranslator.js — every timeline day keeps its v1 fields and adds:
day.kid = [ { icon: 'flare'|'cme'|'magnet'|'particles'|'radiation'|'calm'|'mars', es, en } ] // 0–3 kid facts, simplest first
day.headline // { es, en } rewritten in kid language (≤ 10 words)
day.summary  // { es, en } stays technical: shown only in the grown-ups part of the data page
```

Consumers must cope with old data while the content is being rewritten. If `learn` is missing, fall back to `body`; if `kid` is missing, show the headline only.

## 7. Code layout (`client/src`)

```
main.jsx · App.jsx          entry point and screen flow (menu → briefing → game → reports)
i18n.jsx · persistence.js   language (es/en) and on-device saving
engine/                     game rules: pure JS, no React (reducer, selectors, config, report, simulator, tests)
data/                       bundled real archive (May 2024) + timeline loader (server → DONKI → archive)
content/                    every text a kid reads: glossary, discoveries + topics, facts, missions, sources
styles/                     tokens.css · base.css · buttons.css · motion.css
ui/components/              reusable pieces: Icon, Modal, Pager, Tabs, RichText, Glossary (Term + pill), DataTag,
                            AiBadge, SpaceBackdrop, SunMood, EarthControl (speech bubble), ErrorBoundary
ui/screens/                 Menu, Briefing, Game, NightReport, FinalReport, Journal, DataPage (+ their css)
ui/hud/                     Hud, ControlBubble (was MissionControl), DiscoveryToast
ui/map/                     BaseMap, BaseArt, Astronaut, layout
ui/panels/                  ModulePanel (+ one file per module if useful), common, TaskModal, RoverModal
rover/                      Rover runner: engine.js (pure rules + tests) · draw.js (canvas) · RoverRun.jsx (UI)
minigames/                  the three repair minigames
audio/                      synthesised sound effects (Web Audio)
```

The whole repository follows this layout:
- `shared/`: pure JS used by the server and the client.
- `server/`: the Express API and the data scripts.
- `client/`: the game.
- `docs/`: design, data and game rules.
- `client/scripts/`: tools (single-file build, UI check).

### 7.1 Who owns what during the parallel redesign

| Owner | Files (only these may be edited) |
|---|---|
| foundation | `styles/*`, `ui/components/*`, `App.jsx`, `main.jsx`, `index.html`, engine seed removal (`engine/rng.js`, `engine/index.js`, `engine/engine.test.js`), the minimal `Menu.jsx` seed removal, folder moves and import fixes, `client/scripts/ui-check.mjs` and `client/scripts/ui-scenes/base.mjs` |
| menu-briefing | `ui/screens/Menu.jsx`, `ui/screens/Briefing.jsx`, `ui/screens/menu.css`, `ui/screens/briefing.css`, `client/scripts/ui-scenes/menu.mjs` |
| game-hud-map | `ui/screens/Game.jsx`, `ui/screens/game.css`, `ui/hud/*`, `ui/map/*`, `client/scripts/ui-scenes/game.mjs` |
| panels | `ui/panels/*`, `client/scripts/ui-scenes/panels.mjs` |
| rover-minigames | `rover/RoverRun.jsx`, `rover/rover.css`, `rover/draw.js` (looks only), `minigames/*.jsx`, `minigames/minigames.css`, `client/scripts/ui-scenes/play.mjs` |
| reports | `ui/screens/NightReport.jsx`, `ui/screens/FinalReport.jsx`, `ui/screens/reports.css`, `engine/report.js` (only if needed), `client/scripts/ui-scenes/reports.mjs` |
| journal-data | `ui/screens/Journal.jsx`, `ui/screens/DataPage.jsx`, `ui/screens/journal.css`, `ui/screens/datapage.css`, `client/scripts/ui-scenes/journal.mjs` |
| content-a | `content/glossary.js`, `content/discoveries.js`, `content/missions.js`, `content/content.test.js` |
| content-b | `content/facts.js`, `content/sources.js`, `shared/gameTranslator.js` (+ its test), player-facing strings in `server/src/*`, regenerated `server/data/archive-may-2024.json` and `client/src/data/archive-may-2024.json` |

- **Frozen files:** everything else is frozen during the parallel phase. If an owner needs a change in a frozen file, it writes a request in its final report instead of editing.
- **Stable interfaces:** component file names, default exports and existing props stay as the foundation leaves them. New props must be optional.

## 8. Checking the layout: `client/scripts/ui-check.mjs`

A dev tool that drives a headless Edge or Chrome over the Chrome DevTools Protocol.

- **How it runs:** for every scene × viewport it loads the dev server, prepares the scene through the dev hooks and saves a screenshot.
- **What fails a check:**
  - The page scrolls, or an element scrolls sideways.
  - A button or link of the top layer lies outside the viewport (what is below the fold of a vertical scroll area is fine: it is one scroll away).
  - Text or a control is cut off by an ancestor that is not a scroll area.
  - A primary button is covered by something else.
  - The page logs a console error.
- **Warnings:** text smaller than 13 px, and vertical scroll areas whose content does not fit (allowed, but see if it can fit one view).
- **Output:** a JSON report plus PNG files. The exit code is 1 when anything fails.
- **Scenes:** each owner adds its own in `client/scripts/ui-scenes/<area>.mjs`.

```bash
node client/scripts/ui-check.mjs --url http://localhost:5173 --scenes menu,briefing --viewports all --lang es --out <folder>
```

**Dev hooks** exist only in development builds (`import.meta.env.DEV`):
- **`window.__solasolApp` (App level):**
  - `screen` and `goto(screen)`.
  - `startMission({ preset, seed })`, which skips the briefing, and `showBriefing(preset)`.
  - `openOverlay('journal' | 'data' | 'settings')` and `setLang(lang)`.
  - `learnAll()`, which unlocks all discoveries and words for screenshots, and `resetAll()`.
- **`window.__solasol` (game level):** `state`, `dispatch`, `openPanel`, `openTask`, `openRover`, `closeAll`.

## 9. AI-use rules from the organisers (apply everywhere)

**The organisers' rules:**
1. Generated content may not use, contain or modify any NASA branding.
2. Clearly indicate where and how AI was used.
3. Add a visible watermark to images and videos indicating they are AI-generated.
4. Acknowledge AI-generated audio, code and data in descriptive text and metadata.
5. Judges consider originality, intent and execution when reviewing AI-assisted work.

**How the game complies:**
- **Art and sound:** all drawings (SVG, CSS, canvas) and sounds (Web Audio) are produced by AI-written code.
  - An always-visible **`<AiBadge>`** watermark ("Hecho con IA" / "Made with AI", with a robot icon) sits in a corner of every screen and explains itself when tapped.
  - The real NASA photo is marked as a real photo, not as AI.
- **Metadata:** `index.html` carries `<meta name="ai-disclosure" …>`; `package.json` files carry an `aiDisclosure` field; every source file starts with a one-line AI-assistance header; the README and `AI_USE.md` explain where and how AI was used. Use exactly these header lines (first line of the file, before any other comment):
  - JS, JSX, MJS: `// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.`
  - CSS: `/* AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md. */`
  - JSON data files cannot hold comments: their `meta` object gets `"aiDisclosure": "Real NASA data, downloaded and translated into game days by AI-assisted scripts (see AI_USE.md)."`
- **Data:** real NASA data, downloaded and translated by AI-written scripts. The game-balance numbers were designed with AI help, and the README says so.

## 10. Components (foundation API)

Everything below lives in `client/src/ui/components/` (plus `styles/` and `App.jsx`) and is owned by the foundation. Names, default exports and existing props are stable; new props must be optional. Open the dev-only style guide to see every piece working: `http://localhost:5173/?styleguide` (or `?styleguide=icons|characters|buttons|modal|nav|tags|backdrop`, or `__solasolApp.goto('styleguide')`). Player-facing strings are `{ es, en }` objects; components that take text accept a string or `{ es, en }`.

### 10.1 Where things moved (v1 → v2)

| v1 | v2 |
|---|---|
| `ui/Menu.jsx`, `menu.css`, `Briefing.jsx`, `Game.jsx`, `game.css`, `NightReport.jsx`, `FinalReport.jsx` | `ui/screens/` (same names) |
| `ui/Notebook.jsx` (`NotebookContent`) | `ui/screens/Journal.jsx` (`Journal`, props `{ discovered }`) |
| `ui/SourcesPage.jsx` (`SourcesContent`) | `ui/screens/DataPage.jsx` (`DataPage`, props `{ timeline, source, totalDays, spoilerGuard }`) |
| `ui/sources.css` | split into `ui/screens/journal.css` (journal rules) and `ui/screens/datapage.css` (the rest) |
| briefing rules of `menu.css` · report rules of `game.css` | moved unchanged to `ui/screens/briefing.css` · `ui/screens/reports.css` (each imported by its screens) |
| `ui/Hud.jsx`, `hud.css`, `DiscoveryToast.jsx` | `ui/hud/` |
| `ui/MissionControl.jsx` + `missioncontrol.css` | `ui/hud/ControlBubble.jsx` (`ControlBubble`, same props, still exports `pickTip`) + `ui/hud/controlbubble.css` |
| `ui/Modal.jsx`, `modal.css`, `RichText.jsx`, `Glossary.jsx`, `glossary.css`, `DataTag.jsx`, `ErrorBoundary.jsx` | `ui/components/` |
| `ui/TaskModal.jsx`, `ui/RoverModal.jsx` | `ui/panels/` |

`PHOTO` (the real NASA photo: `src`, `credit`, `url`) is still exported by `ui/screens/Menu.jsx`; keep that export.

### 10.2 Design system files

- **`styles/tokens.css`**: the tokens of §2.1 plus these extras:
  - type: `--font-display`, `--font-body`, fluid `--fs-root` (15 px on phones up to 19 px), `--fs-xs` (never below 13 px), `--fs-sm`, `--fs-md`, `--fs-lg`, `--fs-xl`, `--fs-2xl`, `--fs-hero`;
  - spacing: `--sp-1` … `--sp-6` (4–32 px), `--touch` (48 px), `--screen-pad`;
  - ink shades that pass AA on paper: `--science-ink`, `--link-ink`, `--danger-ink`, `--ok-ink`;
  - contextual colours `--fg`, `--fg-dim`, `--focus-ring`, `--term-color`, `--link-color` (light on the sky, dark inside paper surfaces);
  - the AI badge corner: `--ai-badge-w`, `--ai-badge-h`, `--ai-badge-gap`.
  - A clearly marked **LEGACY** block keeps v1 names (`--panel*`, `--line*`, `--ink-dim`, `--ink-faint`, `--radius-*`, `--press`, `--shadow-pop`…) until every screen is redesigned. `--ink` now means dark ink.
- **`styles/base.css`**: the page never scrolls (`html`, `body`, `#root` fill the viewport with overflow hidden). Helpers:
  - `.screen`: a fixed full-viewport grid with safe-area padding and one `minmax(0, 1fr)` column (content can never widen the screen). Start every screen from it.
  - `.paper`: cream sticker panel (3 px ink outline, hard shadow). `.paper`, `.on-paper`, `.modal` and `.popover` switch the contextual colours to ink. `.paper-2` uses the darker paper.
  - `.sticker-title` (add `.is-sun` for a yellow fill) for big titles; `.muted` (secondary text that follows the surface); `.fact-box` ("Did you know?" box); `.sr-only`.
  - Compact mode (phones = `(max-width: 600px), (max-height: 500px)`): `.hide-compact`, `.only-compact`.
  - AI badge corner: `.ai-safe-left`, `.ai-safe-bottom`.
  - Reduced motion: `prefers-reduced-motion` **or** `html.reduced-motion` stops every animation; add `.rm-fade` to an entering element to keep a 120 ms fade.
- **`styles/buttons.css`**:
  - `.btn` with `.btn-primary` (sun yellow, one per view) · `.btn-secondary` (paper) · `.btn-ghost` (outline: light on the sky, ink on paper) · `.btn-danger` · `.btn-science` · `.btn-warn` (legacy).
  - Sizes `.btn-sm` (still 48 px tall) / `.btn-lg` / `.btn-xl`, and `.btn-block`.
  - `.btn-icon`: round, icon only. **Always give it `aria-label` and `title`.** Combine it with `.btn-sm` or `.btn-lg`.
  - Put an `<Icon>` first inside the button. `.btn-row` lays out a row of actions (its `.btn-primary` stretches on phones).
- **`styles/motion.css`**: `.anim-pop-in`, `.anim-bounce-in`, `.anim-fade-in`, `.anim-float`, `.anim-wiggle`, `.anim-shake`, `.anim-twinkle`, `.anim-breathe`, `.anim-spin`, `.anim-squash`, and `.stagger` (children enter 40 ms apart; set `--i` to choose a step). Keyframes are prefixed `ss-` (`ss-pop-in`, `ss-float`…). All of them stop under reduced motion.
- **`styles/app.css`**: the screen transition wrapper (`.app-screen`) and the loading screen.

### 10.3 Components

**`<Icon name size? title? color? className? style? />`** (`Icon.jsx`): original 24×24 icons with a 2 px ink outline and flat token fills.
- `size`: px number or CSS length (default `1.25em`). Inside `.btn` the button sizes it.
- Decorative by default (`aria-hidden`); with `title` it becomes `role="img"` with that name.
- `color` (or the CSS variable `--icon-color`) recolours the main fill; `--icon-fill` is the neutral fill of control icons (paper by default); `--icon-stroke` is the outline.
- Unknown names draw a neutral placeholder (and warn once in dev); they never crash. Also exports `ICON_NAMES` and `hasIcon(name)`.
- Names: `sun calm moon earth mars star sparkle satellite rocket aurora flare cme magnet particles radiation live heart heart-broken bolt battery stamina food ice drop metal rock science life-support farm antenna shield bed rover solar-panel plug broom wrench astronaut robot book info help data calculator dice gamepad archive camera eye target trophy pin calendar clock sunrise play pause home settings sound-on sound-off globe close plus minus check menu lock arrow-right arrow-left arrow-up arrow-down refresh link-out hand keyboard trash warning`.
- Aliases: module ids (`lifeSupport`, `solar`, `panels`, `cables`) and synonyms (`ok`, `x`, `gear`, `volume`, `mute`, `journal`, `notebook`, `water`, `sample`, `samples`, `research`, `health`, `energy`, `power`, `night`, `question`, `location`, `back`, `next`, `prev`, `ai`, `photo`, `mission`, `storm`, `sep`, `kp`). Every kid-fact icon of `day.kid` (`flare cme magnet particles radiation calm mars`) exists.

**`<SpaceBackdrop mood? />`, `<BackdropProvider defaultMood?>` and `useBackdropMood(mood)`** (`SpaceBackdrop.jsx`):
- App wraps everything in `BackdropProvider`, which draws the sky once behind every screen.
- A screen asks for a mood while it is mounted with `useBackdropMood('calm' | 'storm' | 'night')`. The last mounted request wins; `null` releases it.
- Storm adds a warm tint and particle streaks from the Sun's corner; night darkens the sky and fades the Sun.
- Transform and opacity only; frozen under reduced motion.

**`<SunMood level size? label? title? animated? className? />`** (`SunMood.jsx`): Sol, the Sun.
- `level` 0–3 (clamped): calm smile · restless · angry · furious with flare hair.
- `size`: px number or CSS length (default 96).
- `label`: `true` shows the storm name under the face, or pass your own string / `{ es, en }`.
- The accessible name is the storm name (§4) unless `title` is given.
- Also exports `STORM_NAMES`, `stormName(level)` and `stormLevel(value)`.

**`<EarthControl size? mood? talking? title? />` and `<ControlSays text|children action? tone? avatar? title? live? talking? />`** (`EarthControl.jsx`):
- `EarthControl` is the Mission Control avatar: `mood` `'happy'` (default) or `'worried'`, `talking` animates the mouth, and it is decorative unless `title` is given.
- `ControlSays` is a one-sentence speech bubble next to the avatar:
  - `text` is rich text (`[[glossary]]` pills work), or pass `children`.
  - `action: { label, onClick, icon?, primary?, disabled? }` adds a button inside the bubble (secondary style unless `primary: true`).
  - `tone`: `info` (default) · `ok` · `warn` · `alert` · `night` (`warn` and `alert` make the Earth worried).
  - `title` is the kicker (default "Control de Misión"; `false` hides it). `live` (default true) announces new text politely. `avatar={false}` hides the Earth.

**`<Modal title icon? tone? size? fill? footer? onClose? closable? className? labelledBy?>`** (`Modal.jsx`):
- Keeps all v1 behaviour: a stack of modals (only the top one reacts to keys), Escape closes the top-most one when `closable`, focus trap, focus restore, `data-autofocus` and backdrop click to close.
- `icon`: an Icon name, an emoji string (v1) or a node. `tone`: accent colour of the header band and icon badge (v1 `accent` still works).
- `size`: `sm` 440 · `md` 580 (default) · `lg` 800 · `xl` 1080 · `full`. `fill`: as tall as the viewport allows (needed by a `Pager` or `Tabs` inside, which need a definite height).
- **`footer`**: put the actions here. It is always visible, its primary button stretches on phones and it keeps clear of the AI badge by itself.
- The body (`.modal-body`, marked `data-fit`) **never scrolls**: if the content does not fit, cut it or page it.
- Pop-in spring on open (a fade under reduced motion).

**`<Pager items render perPage? label? page? onPageChange? initialPage? controls? hideSinglePage? keyOf? empty? pageClassName? className? style? />`** and **`gridCapacity(area, { minWidth, rowHeight, gap })`** (`Pager.jsx`):
- Renders only the current page: a CSS grid `.pager-page` that you tune with `pageClassName`, `--pager-min` (column minimum, default 180 px) and `--pager-gap` (12 px).
- Big round arrows, dots (or "3 / 12" above 8 pages), swipe and the ←/→ keys.
- `perPage`: a number, or a function of the page area `({ width, height, compact }) => count`. Use `gridCapacity` so it matches the grid: `perPage={(a) => gridCapacity(a, { minWidth: 180, rowHeight: 120 })}` with `grid-auto-rows: 120px` in your page class.
- Give the pager a definite height (for example `flex: 1; min-height: 0` inside a column).
- `controls`: `'auto'` (arrows at the sides when the pager is wide, below it when tall), `'sides'` or `'below'`. Controlled with `page` + `onPageChange`, or uncontrolled.

**`<Tabs tabs value onChange label? compact? orientation? idBase? className? panelClassName?>{children}</Tabs>`** (`Tabs.jsx`):
- `tabs`: `[{ id, label, icon?, badge?, tone?, disabled? }]` (`badge` may be a node, e.g. three stars).
- WAI-ARIA tablist: ←/→ (↑/↓ when vertical), Home and End, roving tabindex.
- `compact`: `'auto'` (default: icon-only on phones or when the labels do not fit in one row), `true` or `false`. In icon-only mode the label stays as the accessible name and the tooltip.
- `children`: an optional panel (a node, or a function of the active id) rendered as `role="tabpanel"`. `idBase` gives stable ids (`${idBase}-tab-${id}`), handy for ui-check scenes.

**`<DataTag kind size? interactive? className? />`** (`DataTag.jsx`):
- Kinds and labels: `EN VIVO` "EN DIRECTO" / "LIVE" · `ARCHIVO` "DATO REAL" / "REAL DATA" · `SIMULADO` "AZAR" / "CHANCE" · `CALCULADO` "CALCULADO" / "CALCULATED" · `DISEÑO` (or `DISENO`) "REGLA DEL JUEGO" / "GAME RULE" · `NASA` "CIENCIA NASA" / "NASA SCIENCE".
- A tinted sticker with an icon. Tapping it opens a one-line explanation (a popover).
- `interactive={false}` renders a plain label (use it inside other buttons). `size`: `'md'` or `'sm'`. Also exports `TAG_KINDS`.

**`RichText` and `Glossary`** keep their v1 APIs:
- `<RichText text as? className? />` with `[[id]]`, `[[id|text]]` and `**bold**`; `parseRich(text)`.
- `<GlossaryProvider>`, `<Term id>children?</Term>` and `useGlossary()` → `{ show(id, anchorEl), close(), openId, seen, resetSeen(), markSeen(ids) }` (`markSeen` is new).
- Words are coloured, underlined and clickable. The pill is a paper popover with the emoji, the term, `def`, the new optional `example` and an optional "Para mayores" source link; it always stays inside the viewport.

**`<AiBadge onMore? />` and `useAvoidAiBadge(ref, gap?)`** (`AiBadge.jsx`):
- The always-visible "Hecho con IA" / "Made with AI" watermark: robot icon, bottom-left, icon-only on phones.
- Tapping it explains what was made with AI (Claude, by Anthropic, reviewed by the team), that the Moon photo is a real NASA photo, and points to the data page (`onMore` adds a button; App opens the data page outside the game).
- **It must never cover buttons.** Reserve its corner with `--ai-badge-w` / `--ai-badge-h` (or `.ai-safe-left` / `.ai-safe-bottom`), or call `useAvoidAiBadge(ref)` on an element that moves or resizes: it sets `--ai-avoid-left` (px) on it while it overlaps the badge (use `padding-left: max(<yours>, var(--ai-avoid-left, 0px))`).

**`<Confetti fire origin? count? colors? />` and `useConfetti()`** (`Confetti.jsx`): a ~1 s burst of stars each time `fire` changes to a new truthy value. `origin`: `'center'`, `{ x, y }`, an element or a DOMRect. Hook form: `const [confetti, burst] = useConfetti(); … {confetti} … burst(event.currentTarget)`. Does nothing under reduced motion.

**`<Popover anchor onClose placement? label? className? width? zIndex?>`** (`Popover.jsx`, used by the glossary pill, DataTag and AiBadge): a paper bubble with an arrow, kept inside the viewport (it flips and slides). Escape, a tap outside or the anchor's toggle close it; focus moves in and returns to the anchor. Marked `[data-popover]`.

**`<ErrorBoundary onReset>`** (`ErrorBoundary.jsx`): a friendly paper card ("¡Uy! Algo se ha roto" / "Oops! Something broke") with a button back to the menu.

**Hooks** (`hooks.js`): `useCompact()` (phones), `useMediaQuery(query)`, `useReducedMotion()` / `prefersReducedMotion()` (the system setting or `html.reduced-motion`), `useElementSize(ref)`, and the constants `COMPACT_QUERY`, `REDUCED_MOTION_QUERY`.

### 10.4 App and the screens

- App mounts `BackdropProvider` and `AiBadge` once, and wraps each screen in `.app-screen` (spring entrance, a fade under reduced motion) and an `ErrorBoundary`.
- Overlays owned by App: `'journal'` (`<Journal discovered>` in an `xl` + `fill` modal), `'data'` (`<DataPage … spoilerGuard>`, same modal) and `'settings'`.
- `Menu` receives `save`, `settings`, `onSettings(next)`, `onPlay(preset)`, `onContinue`, `onSources` / `onData`, `onNotebook` / `onJournal`, `onErase`, and the controlled settings modal `settingsOpen` + `onSettingsOpen(open)`.
- `onPlay(preset)` takes no seed: every mission gets a random seed and **no game code is ever shown or typed**.
- `Briefing` still receives `seed` (unused, kept for compatibility). `Game` keeps `initial, settings, onExit, onReplay(seed), onNewGame`; replay reuses the same seed and the same days.
- Dev hooks (development builds only, §8): `window.__solasolApp` = `{ screen, screens, goto(screen), startMission({ preset, seed }), showBriefing(preset), openOverlay('journal' | 'data' | 'settings'), closeOverlay(), setLang(lang), learnAll(), resetAll() }`. The async ones resolve after the next paint. `learnAll()` updates the App-level journal; a running `Game` keeps its own copy until it remounts.

### 10.5 ui-check details

- Scene `setup` strings run inside an async function with these helpers: `app` (`__solasolApp`), `game()` (`__solasol`), `sleep(ms)`, `frame()`, `$(sel)`, `$$(sel)`, `waitFor(selectorOrFn, ms)`, `click(selectorOrElement)` and `clickText(text, selector?)`.
- `--scenes` accepts a trailing `*` (`--scenes "styleguide*"`), `--list` prints every scene, and `--browser <path>` (or `UI_CHECK_BROWSER`) overrides the auto-detected Edge or Chrome.
- Fail types: `page-scroll`, `scroll`, `offscreen`, `clipped`, `does-not-fit` (cut off inside a `[data-fit]` area such as a modal body or a pager page), `text-cut`, `primary-covered`, `console-error` and `setup-error`. Warnings: `small-text` (< 13 px), `control-covered` and `small-target` (< 44 px).
- The top layer is the top-most open modal plus popovers and the AI badge; an open popover does not count as covering a button.
- Mark purely decorative overflow with `aria-hidden="true"` or `data-ui-check="ignore"`, and areas whose content must fit with `data-fit`.
- A run takes several seconds per scene and viewport (the fresh page load through the Vite dev server dominates): while you iterate, check one or two viewports (`--viewports 1280x720,412x915`), then run `all` before you finish. `--jobs N` runs N windows in parallel; it only helps on a fast machine (default 1).
- `report.json` lists every run with its `fails`, `warns`, `screenshot`, total `ms` and per-phase `phases` timings.
