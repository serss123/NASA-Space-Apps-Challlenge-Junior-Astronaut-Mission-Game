# Sol a Sol — Junior Astronaut Mission Trainer: full project overview

NASA Space Apps Challenge 2026 · Challenge *Build a Junior Astronaut Mission Trainer* · Local event: Salamanca (Spain)

> **Status of this document:** it describes the game as it is in the repository today. Items the team must fill in or confirm are marked **[team]**. Everything else is taken from the code, the data and the existing docs ([README](../README.md), [DATA.md](DATA.md), [GAME_DESIGN.md](GAME_DESIGN.md), [DESIGN.md](DESIGN.md), [AI_USE.md](../AI_USE.md)).

**Contents**

1. [The questions](#1-the-questions) (the answers for the submission form)
2. [Declaration of SI (synthetic intelligence) use](#2-declaration-of-si-synthetic-intelligence-use)
3. [What the application is](#3-what-the-application-is)
4. [Features, screen by screen](#4-features-screen-by-screen)
5. [Game rules and the engineering trade-offs](#5-game-rules-and-the-engineering-trade-offs)
6. [NASA data: what is real, simulated or calculated](#6-nasa-data-what-is-real-simulated-or-calculated)
7. [Architecture and implementation](#7-architecture-and-implementation)
8. [Design system, accessibility and layout](#8-design-system-accessibility-and-layout)
9. [Quality: tests and checks](#9-quality-tests-and-checks)
10. [How to run it](#10-how-to-run-it)
11. [Limits and what comes next](#11-limits-and-what-comes-next)

---

## 1. The questions

### 1.1 What did you develop?

**Sol a Sol** ("Sun by Sun") is a free browser game for children aged 7–12. The player is the only astronaut of a lunar base at the Moon's south pole and has to survive 21 days, **one game day for each real day** of the strongest solar storm in two decades (1–21 May 2024). The storms, flares, plasma clouds and radiation doses come from **real NASA data** (DONKI and RadLab). Every decision has a cost: power used for the shield tonight is not growing food tomorrow.

It is a complete game, not a prototype: a top-down base you walk around, seven modules with their own panels, three repair minigames, a canvas Rover expedition, night and final reports that explain *why* things happened, a Discovery Journal that works as a study guide, a glossary of 63 space words, and a "Data and sources" page for teachers and judges. It runs in Spanish and English with no accounts, no cookies and no data collection.

### 1.2 How does it address the challenge?

The challenge asks for a game or simulator that trains young people in the engineering trade-offs of living in space. Sol a Sol covers the five topics the challenge names, each as a **decision the child has to make**, not as a text to read:

| Challenge topic | In the game | The trade-off the child feels |
|---|---|---|
| Power budgeting | 3–5 power tokens every morning from the solar panels, shared between the antenna, the farm and the shield; spare power goes to a small battery | Power for the shield tonight is not growing food |
| Radiation shielding | Charge the shield **before sleeping**; each storm level needs one level of charge; the shield protects the base, **not** the Rover | Protection costs power and you must know the storm is coming |
| Life support | 5 hearts; each night −1 per unmet need; Life Support level caps every other building (the "golden rule") | Upgrade the core first, or the building you want now |
| Food production | Planting costs Stamina and ice today; food arrives two powered days later | Invest today to eat later |
| Communication delay | The antenna message takes 1.3 s to the Moon; the game shows how many *minutes* it would take to Mars on that date (3–22 min) | On Mars you cannot wait for Earth: you must plan ahead |

### 1.3 Why is it important?

- **Space weather is real and affects people.** The May 2024 storm produced auroras at low latitudes and radiation near the Moon hundreds of times above normal. Children rarely meet this topic, yet it is one of the main reasons human missions beyond Earth orbit are hard.
- **Systems thinking is a skill.** Nobody is asked to memorise facts: the child lives a system where every resource is linked to another. That is how engineers think.
- **Real data builds trust and curiosity.** Every number is labelled (REAL DATA, LIVE, CHANCE, CALCULATED, GAME RULE, NASA SCIENCE) so a child, a teacher or a judge can tell what is real and what we invented.
- **Artemis is bringing people back to the Moon's south pole**, the very place where the game happens. The audience is the generation that could work there.

### 1.4 What does it do, and how does it work?

A day is a loop:

1. **Morning.** If the antenna is on, the child sees the real headline of that day. The solar panels give power tokens; Stamina ("Fuerzas") gives the number of actions.
2. **Decide.** The child walks around the base (WASD / arrows, or taps the floor or a module) and uses the modules: link the antenna (forecast and NASA missions), plant crops, charge the shield, repair breakdowns (three minigames), upgrade buildings, or drive the Rover to collect ice, metal and rock samples.
3. **Night.** When Stamina runs out (or the child ends the day) the habitat goes dark. A bed checklist shows what will happen tonight.
4. **Report.** The game tells **what happened and why**, next to what really happened on that day (radiation measured near the Moon versus inside the International Space Station).
5. **Win or evacuate.** The child wins by reaching 100 % research with NASA missions. If health reaches 0 the mission is **evacuated — everyone is safe** (never "game over"), and the final report "Why did it happen?" explains the causes and offers to **replay the same game** changing one decision.

Under the hood a pure, immutable engine (`gameReducer`) turns the real timeline into rules; a small Express server downloads and caches NASA data; the React client draws everything. See [section 7](#7-architecture-and-implementation).

### 1.5 What benefits does it have?

- **For children:** learning by doing; no reading wall (short texts at about a 8-year-old reading level, clickable glossary words, "It's like…" examples); encouraging tone; safe failure (evacuation, not defeat).
- **For teachers:** in the archive mission everyone lives the same real 21 days, so students can compare what they decided; "replay and change one decision" lets a child test cause and effect; a Discovery Journal acts as the study guide; the data page gives sources and licences; it works offline from a single HTML file.
- **For families and schools:** free, no installation, no accounts, no cookies, no analytics; progress is stored only on the device, with an *Erase progress* button.
- **For access:** two languages, touch and keyboard, text of at least 13 px, controls of at least 44 px, reduced-motion setting, colour never the only signal.

### 1.6 What is the intended impact?

- Children understand, with their hands, that **space is an engineering problem of limited resources**, and that real scientists read real data to decide.
- They leave knowing words such as *radiation, CME, regolith, shield, signal delay*, and why a storm matters for a base on the Moon and a trip to Mars.
- Teachers get a ready-made, honest classroom activity built on public NASA data.
- The project also shows a **model for educational games with real data**: every claim traceable to a source, and every simplification declared.

*Measures we would use, once it is played in classes **[team]**:* number of children who finish the 21 days; share who can say, in their own words, why the shield mattered on the storm nights; teacher feedback on the data page. We do not collect any data in the game itself, so these would come from classroom observation.

### 1.7 What tools did you use?

| Area | Tools |
|---|---|
| Client | React 19, Vite 8, plain (vanilla) CSS, inline SVG, `<canvas>`; fonts Fredoka and Nunito (SIL OFL, via `@fontsource`) |
| Server | Node.js ≥ 20 and Express 5 (small API, in-memory cache with TTL, security headers) |
| NASA data | DONKI (CCMC) API and RadLab (OSDR); NASA image PIA13523; NASA-STD-3001, BVAD, JPL planet-position formulas, OSD-476 and the NASA stories of May 2024 as references |
| Audio | Web Audio API: every sound is generated in the browser, there are no audio files |
| Quality | Node's built-in test runner (238 tests); a custom layout checker (`ui-check`) driving headless Chrome/Edge over the DevTools protocol |
| Packaging | A build that packs the whole game into one HTML file (≈1.6 MB) |
| SI tool | Claude (Anthropic), through Claude Code — see [section 2](#2-declaration-of-si-synthetic-intelligence-use) |

### 1.8 How is your project creative?

- **The real storm is the game.** There is no invented plot: the story is the real 21 days, and the climax (the X-class flares of 10–14 May) arrives when it really arrived. The child can check it.
- **Honest labels as part of the design.** Instead of hiding what is invented, six stickers (REAL DATA, LIVE, CHANCE, CALCULATED, GAME RULE, NASA SCIENCE) are on every number. Even the breakdowns say: *the chance is simulated, the cause is real* ("a real X-class flare on 14 May caused this").
- **Failure that teaches.** Losing all hearts is an evacuation, and the final report "Why did it happen?" turns it into a three-panel comic: the decision that mattered most, the strongest event, the result. Then it offers a replay with the same seed, changing one decision.
- **Two ways to play the Sun.** The archive mission (May 2024, very stormy) and a **LIVE mission** that uses the last 21 days of DONKI. When the Sun is calm (as it is now) the game says so honestly and suggests the archive mission.
- **Mars as a taste of the future.** Mars is "coming soon", but the menu already shows today's real Earth–Mars signal delay, calculated in the browser with JPL formulas.
- **Everything is drawn with code.** The base, the astronaut, the Rover, the sky, the sun-faces that show the storm level, and the icon set are original SVG/CSS/canvas art; the only photograph is NASA's.
- **Study guide built into play.** A discovery card unlocks the first time something happens; 38 cards in 6 chapters, with stars per chapter, plus 63 glossary words each with a comparison ("It is like…").

### 1.9 What factors did your team consider?

- **Science first.** Real numbers only from NASA data or linked official sources; the AI was never a source of facts. Game-balance numbers are ours and are labelled as such. Simplifications are listed in-game (16 of them) and in [DATA.md](DATA.md).
- **Age 7–12.** Short sentences (≤ 14 words), no units such as µGy/h in the main UI (they live in a "grown-ups" section), instrument names only in the data page, a consistent vocabulary table, an encouraging tone, no scary failure.
- **Difficulty and fairness.** An automatic balance simulator plays 1000 games per strategy on the real 21 days. A sensible but imperfect child wins about 86 % with good minigame skill and about 52 % with average skill; "only shield", "only science", "always wait" and random play do not win. No choice is free, not even waiting (an automated test checks it).
- **Privacy and safety.** No accounts, no cookies, no analytics, no personal data; the server sends security headers; the game works without the server.
- **Access and devices.** One screen to see everything where possible, with inner scroll as a safety net; tested at eight viewports from 1920×1080 to a phone in portrait (412×915); keyboard, mouse and touch; text colour that follows the surface.
- **Rules of the challenge.** No NASA logos or branding, not presented as a NASA product; SI use declared everywhere it applies ([section 2](#2-declaration-of-si-synthetic-intelligence-use)).
- **Offline classrooms.** A single-file build opens by double-click, with the May 2024 data bundled.
- **Language.** The interface is bilingual (Spanish first, English mirror); the source code, comments and identifiers are in English.

---

## 2. Declaration of SI (synthetic intelligence) use

This section follows the challenge rules for SI-assisted work. The authoritative record is [AI_USE.md](../AI_USE.md); the game also says it in-app (see below).

| Rule | How Sol a Sol complies |
|---|---|
| **No NASA branding** | The game uses **no** NASA logos, flags, meatball/worm marks or mission patches, and it says on the data page that it *"is not an official NASA product; it uses public NASA data"*. The only NASA image is the real photograph PIA13523, credited to *NASA/GSFC/Arizona State University*, used under NASA's media guidelines. |
| **Clearly indicate where and how SI was used** | The table below, [AI_USE.md](../AI_USE.md), the README, the in-game data page (tab "AI and privacy"), and a **"Made with AI" badge visible on every screen** (bottom-left corner), which opens a short explanation when tapped. |
| **Visible watermark on SI-generated images and videos** | **There are no SI-generated images or videos in the game.** All art is drawn in code (SVG, CSS, canvas). Even so, the "Made with AI" badge is permanently visible on every screen, so anything on screen carries the notice. If SI-generated images or video are added later, they must carry a visible watermark first. |
| **Acknowledge SI-generated audio, code and data in text and metadata** | **Audio:** none is a recording; every sound is synthesised in the browser by code (Web Audio API) written with SI help, which is declared. **Code:** declared below and in file headers (`AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.`). **Data:** all scientific data is downloaded from NASA by our scripts; SI did **not** generate data. SI wrote the scripts and helped translate raw data into short kid-level headlines, which are labelled. |
| **Originality, intent and execution** | See the paragraph "How the idea was decided" below. |

### Where and how SI was used

| When | Tool | Used for | Where in the project |
|---|---|---|---|
| 2026-11-09 to 13 | Claude (Anthropic) | Planning document: organisation, rules, data research, comparison of options, a draft concept | Team planning document (outside the repository) |
| [date] | Gemini (Google) | A team image for the team page | spaceappschallenge.org team page only; **not used in the game** **[team: confirm]** |
| 2026-11-14 to 15 | Claude, via Claude Code | Generating the game code from the team's feature brief: engine and rules, top-down base UI, HUD, module panels, reports, the three minigames, the canvas Rover, the Express server, the DONKI/RadLab scripts, the balance simulator, the automated tests | `client/`, `server/`, `shared/` |
| 2026-11-14 to 15 | Claude, via Claude Code | Bilingual texts: glossary, discovery cards, facts, mission messages, the data page; documentation | `client/src/content/`, `docs/`, `README.md` |
| 2026-11-14 to 15 | Claude, via Claude Code | Reviewing the code (automated reviewers looking for bugs) and fixing what they found | Whole repository |
| 2026-11-15 | Claude, via Claude Code | Interface redesign: layout of the menu, briefing, journal, data page, game screen, panels and reports; legibility fixes; the layout checker and its scenes; the end-to-end tests; this document | `client/src/ui/`, `client/scripts/`, `docs/` |

### How the idea was decided (originality and intent)

The idea, the scope and the design decisions are the **team's**: the team wrote the feature brief (hearts, fatigue, base energy, buildings, the Rover runner, maintenance tasks), chose to use the real May 2024 storm as the storyline, to make 21 days and the Moon playable and Mars "coming soon", and to label every number by its origin. **[team: describe in your own words how the idea came up, who decided what, and what you changed after testing.]** The SI was used as a tool to build and write what the team decided, and everything it produced was reviewed by the team **[team: confirm]**. The SI was not used to find the solution to the challenge, and it was not used as a source of scientific facts.

---

## 3. What the application is

| | |
|---|---|
| Name | Sol a Sol — Junior Astronaut Mission Trainer |
| Audience | Children 7–12, their teachers and families |
| Languages | Spanish and English (switch at any time) |
| Platform | Any modern browser (desktop, tablet, phone); also a single offline HTML file |
| Length | 21 game days (one per real day of the storm) |
| Cost / privacy | Free; no accounts, cookies, analytics or personal data; save data stays on the device |
| Licence | Apache-2.0 (code); NASA data is public; fonts SIL OFL |

---

## 4. Features, screen by screen

### 4.1 Main menu
- Three destinations: **The great storm of 2024** (archive mission), **Today's Sun** (live mission) and **Mars (soon)** with today's real Earth–Mars signal delay.
- *Continue* when a game is saved; settings (suit colour, fewer animations, erase progress with confirmation); language and sound switches; buttons to the NASA data page and the Discovery Journal.
- A short privacy line. The real NASA photo of the south pole with its credit on large screens.

### 4.2 Mission briefing
- One page: the story with the date, the real photo with the base marked next to Shackleton crater, five short rules (power, Stamina, storms and the shield, hearts, how to win) and the controls.
- For the live mission it summarises honestly how the real Sun behaved in the last 21 days (and says if it is calm); if DONKI cannot be reached it says it is using real saved data.

### 4.3 The game screen
- **HUD:** day and date with a data label, hearts, Stamina, power tokens (free / antenna / farm / shield), food, ice, metal, rock samples, research bar, journal, sound, language and pause.
- **News ticker:** the real headline of the day, only when the antenna is linked.
- **Base map:** a top-down lunar base drawn in SVG; seven labelled modules; the astronaut walks with keyboard, mouse or touch and the map dims as Stamina runs out and at night; an "E · Use" prompt; the next step is highlighted.
- **Mission Control:** one tip at a time chosen from the base's state (a storm tonight, a broken antenna, low food…), and on day one a guided four-step list. Beside the map on wide screens, under it in portrait.

### 4.4 Module panels (each opens when the astronaut reaches a module)
| Module | What the child does |
|---|---|
| Life Support | Shares the day's power between antenna, farm and shield; sees the battery; upgrades (sets the maximum level of every other building) |
| Farm | Plants and waters up to 3 planters; sees growth; eats 1 ration every night |
| Antenna | Switches on and links with Earth (a 1.3 s signal); sees the storm forecast (1–3 nights by level), the real data of the day, the model predictions with links, and NASA missions with their needs |
| Shield | Charges it before sleeping; sees tonight's storm level; repairs short-circuited cables |
| Rover | Chooses one of three real south-pole zones; the zones unlock with the Rover level |
| Solar panels | Cleans regolith when dirty |
| Bed | A checklist of what will happen tonight (dinner, shield, outside risk, overexertion, harvest, battery), then *Sleep* |

Every action button shows its cost; when something cannot be done it says **why**.

### 4.5 Maintenance minigames (three)
- **Clean the solar panels:** rub the regolith off.
- **Fix the shield cables:** connect by colour **and** symbol (so it also works for colour-blind players).
- **Calibrate the antenna:** align the dials.
Each costs 1 Stamina only if finished; leaving with "Not now" costs nothing. Each shows a fact tied to what is being repaired.

### 4.6 Rover expedition
A side-scrolling auto-runner on a `<canvas>`: the Rover drives alone and the child controls only the **jump** (Space, ↑, W, click or tap, or the *Jump* button; hold to jump higher). Lunar gravity (1/6) makes jumps slow and long. The track is generated from the game seed for each zone; collect ice, metal and rock samples; each zone is designed to use 80 % of the battery of the level that unlocks it (20 % margin); each crash costs 5 %; at 0 % the Rover returns in **emergency mode** (half the load is lost, no injury). Pause, abort and a result screen with the loot. Radiation outside is dangerous: the shield protects the base, not the Rover.

### 4.7 Night report ("Morning")
Hearts before and after; what happened last night and why (dinner, storm and shield, outside trip, overexertion, harvest, healing after two clean nights, the watch for NASA, battery); what **really** happened that day (headline, summary, level measured by CRaTER or estimated from DONKI, Moon versus Space Station, and Mars when relevant) with a link to the original DONKI record; breakdowns with their real causes; new discoveries; a fact with a source.

### 4.8 Final report ("Why did it happen?")
A hero message (mission accomplished, evacuated — everyone is safe, or the relief crew arrives); a three-panel comic (decision that mattered most, strongest event, result); a tip for next time; seven statistics (storms blocked, dinners, food grown, expeditions, repairs, upgrades, power split); what the real Sun did while the child played; and three actions: **replay and change one decision** (same seed), new game, menu.

### 4.9 Discovery Journal and glossary
- **38 discovery cards** in six chapters (Energy, Radiation and shield, Life at the base, Communication, The Sun and space weather, The Moon and exploration), each unlocked the first time something happens: what happened, what you learned, what to remember, with a source "for grown-ups" and a data label. Locked cards show a hint. A "New discovery!" window appears in the game.
- **63 glossary words** with a one-sentence definition and an "It's like…" comparison; any word in any text is a tappable, underlined link that opens a small window.

### 4.10 Data and sources page
Seven tabs: what each label means; the NASA data used and what for (9 sources, each with provider, link and how it enters the game); how data becomes gameplay; the real days one by one (behind a spoiler button from the menu); the 16 simplifications we made; credits and licences; AI use, "not a NASA product" and privacy.

### 4.11 Classroom and replay
Every game gets a random seed that the child never sees (no codes to type). The same seed is reused only for "replay and change one decision", so the same days and the same breakdown rolls come back and cause and effect can be compared. (The engine can also start a game from a code, which would allow a shared class mission; the interface does not offer it today.)

---

## 5. Game rules and the engineering trade-offs

| Rule | Value |
|---|---|
| Hearts | start 5; −1 per unmet need each night; +1 after two clean nights |
| Stamina | 3 + Life Support level (4, 5, 6) |
| Daily power | 2 + Life Support level (3, 4, 5); −1 while the panels are dirty |
| Battery | stores 1, 2 or 3 unused power for tomorrow |
| Food | start 5; 1 ration eaten every night |
| Farm | planting costs 1 Stamina and 1 ice; grows in 2 powered days; yields 3 rations; 1–3 planters |
| Shield | max charge 1, 2 or 3 by level; each storm level needs one level of charge |
| Antenna | forecast of 1, 2 or 3 nights by level; link takes 1.3 s |
| Rover zones | cost 2, 2, 3 Stamina; unlock with Rover level 1, 2, 3; battery 100 / 130 / 170 |
| Upgrades | cost 1 Stamina plus metal and ice; no building above Life Support's level |
| Breakdowns | cables: X flare 80 % (SEP 30 %); antenna: CME shock or Kp ≥ 7 60 % (Kp 5–6 30 %); dirty panels: CME 40 %, after the Rover 25 %, micrometeorite 5 % — chances are **simulated**, causes are **real** |
| Win | 100 % research from NASA missions |
| Evacuation | health reaches 0 |

Balance is checked by `npm run simulate` (1000 games per strategy): a sensible child about 86 % (good skill) or 52 % (average); an expert 92–100 %; extreme strategies do not win. The live mission is easier because the Sun is calm now, and the game says so.

---

## 6. NASA data: what is real, simulated or calculated

Full detail and the day-by-day storm are in [DATA.md](DATA.md). In short:

| Source | Used for | Label |
|---|---|---|
| **DONKI** (NASA CCMC) | Flares (class, time), CMEs and their speed, solar particle events, shocks, geomagnetic storms (Kp), model predictions (WSA-Enlil), notifications. Archive: 1–21 May 2024. Live: the last 21 days | REAL DATA / LIVE |
| **RadLab** (NASA OSDR) | Radiation measured by CRaTER (orbiting the Moon), DOSTEL (inside the ISS) and RAD (Mars). Each day is compared with a "normal day" (average of 1–7 May 2024). It decides each night's storm level in the archive mission | REAL DATA |
| Estimation from DONKI | The live mission has no recent RadLab measurement, so the storm level is estimated from CME speed and SEP events | CALCULATED |
| JPL planet positions | Earth–Moon and Earth–Mars signal delay for any date, calculated in the browser | CALCULATED |
| PIA13523 (NASA/GSFC/ASU) | The south-pole photograph | NASA SCIENCE |
| NASA-STD-3001, BVAD, OSD-476, NASA stories, CSA toolkit | Inspiration for shielding, daily needs, farming and curiosity cards, always linked | NASA SCIENCE / GAME RULE |
| Game design | Costs, yields, upgrade prices, minigames, Rover tracks | GAME RULE (ours) |
| Chances | Whether something breaks | CHANCE |

Storm level (archive): under 3× normal = Calm; 3–30× = Small storm; 30–150× = Strong storm; over 150× = Super storm. Real peak in the archive: near the Moon (CRaTER) the dose reached **301.6 times normal on 14 May 2024**, while inside the Space Station (DOSTEL) it stayed at about **1 time normal** thanks to Earth's magnetic shield — a contrast the game teaches.

---

## 7. Architecture and implementation

```
client/           React + Vite game (all rules run in the browser)
│  ├─ src/engine/     pure game engine: reducer, selectors, config, report, RNG, simulator (+ tests)
│  ├─ src/ui/         screens, HUD, map, panels, reusable components (modal, tabs, icons, glossary…)
│  ├─ src/content/    texts: discoveries, glossary, facts, missions, sources (es + en)
│  ├─ src/minigames/  three repair minigames
│  ├─ src/rover/      Rover runner: pure physics/track engine, canvas drawing, React shell
│  ├─ src/audio/      Web Audio sound effects (no files)
│  ├─ src/styles/     design tokens, base, buttons, motion
│  ├─ src/data/       bundled May 2024 archive + live timeline loader
│  └─ scripts/        single-file build, ui-check layout tool and its scenes
server/           Express: DONKI proxy with cache, timeline service, download scripts, tests
shared/           code used by both: DONKI → game translator, dates, Earth–Moon/Mars delay (+ tests)
docs/             DATA.md, DESIGN.md, GAME_DESIGN.md, this overview
.github/          GitHub Actions workflow for GitHub Pages
index.html        self-contained game snapshot; Pages rebuilds it from the source
```

**Key implementation decisions**

- **Pure, immutable engine.** `gameReducer(state, action)` has no side effects, takes a seed, and is covered by tests and by the simulator. The UI only dispatches actions and reads selectors; this makes replays, tests and balance work possible.
- **Seeded randomness.** A deterministic RNG makes every game reproducible from a code; the child never sees the code, but "replay and change one decision" reuses it.
- **Data pipeline.** Scripts download DONKI and RadLab, compact them and translate each day into game values and kid-level headlines (`shared/gameTranslator.js`, tested). The server serves the live window with an in-memory cache (shared requests, expiry) and a graceful fallback; the client can also call DONKI directly, so the game works without the server.
- **Single-file build.** The portable build inlines code, styles, fonts, the NASA photo and the archive into one HTML file.
- **Persistence.** `localStorage` only (game, journal, settings, glossary words seen), always wrapped in try/catch; an "Erase progress" button.
- **Graphics.** SVG for the base, astronaut and icons (an original set of 78 icons); CSS for the animated sky and sun faces; `<canvas>` for the Rover with a fixed-step loop and an accessible DOM HUD.
- **Reusable UI components.** Modal (focus trap, stack, Escape, footer always visible), Tabs (ARIA), Popover, Glossary, DataTag, Icon, RichText (a tiny markup `[[glossary|text]]` and `**bold**`, including glossary words inside bold), AiBadge.
- **Security and safety.** Security headers and a body-size limit on the server; no third-party scripts; external fonts are bundled, not loaded from a CDN.
- **Layout checker (`ui-check`).** A dependency-free tool that drives headless Chrome/Edge and, for each scene at each viewport, takes a screenshot and fails on sideways scroll, controls or text cut off, covered primary buttons or console errors. It also drives **functional scenes with real clicks** (menu → briefing → link the antenna → plant → sleep → morning report → day 2; shield and upgrade; leave a repair; Rover pause and abort).

---

## 8. Design system, accessibility and layout

- **Art direction "Cartoon Lunar Outpost":** thick ink outlines, hard shadows, cream paper surfaces over a living sky; a sun with four faces (calm to super storm) that always accompanies the storm level.
- **Tokens and type:** one token file for colours, shapes, motion, layers and sizes; Fredoka for titles and Nunito for text; a fluid root size (15–19 px); text never below 13 px; touch targets of at least 44 px.
- **Legibility rule:** text colour follows the surface — ink on paper, light on dark. Dark play areas (minigames, Rover) set their own light text.
- **One view, with scroll as a safety net:** each screen tries to show everything at once, in columns on wide screens; when something does not fit, an inner scroll area (or a modal body) lets the child reach it. The page itself never scrolls, and nothing is hidden or paginated just to avoid a scrollbar.
- **Motion:** short springs, number "bumps", confetti on success, and a *reduce motion* setting that also respects the system preference.
- **Colour is never the only signal:** icons and words accompany every colour; the cable minigame uses symbols as well as colours.
- **Compact mode** for phones: icon-only map labels (44 px), a tighter HUD, a single column.

---

## 9. Quality: tests and checks

| Check | Result |
|---|---|
| Automated tests (`npm test`) | **238 passing**: engine rules and balance, "no choice is free", DONKI translator, dates and signal delay, server API and cache, Rover engine, minigame seeds, content limits (text length, glossary links, every card is fired somewhere), single-file build |
| Balance simulator | 1000 games per strategy on the real 21 days |
| Layout and flow checks (`ui-check`) | **544 scenes passing** in Spanish and **544** in English across eight viewports (1920×1080, 1366×768, 1280×720, 1024×768, 1024×600, 768×1024, 915×412, 412×915), plus the four functional click-through flows |
| Build | Production build passes |

What is **not** verified by automated checks: the feel of the game (difficulty by a real child, how fun the minigames are), the complete 21 days played by a person, and classroom use. These need human play-testing **[team]**.

---

## 10. Hosting and development

GitHub Pages is the public hosting target. Enable **Settings → Pages → Build and deployment → GitHub Actions**; the workflow in `.github/workflows/deploy-pages.yml` builds the portable HTML and publishes it at `https://<github-user>.github.io/<repository-name>/`. Pages serves only static files, so it does not run the Express API. The archive is bundled, and the live mission can request DONKI directly from the browser.

For local development and backend work:

```bash
npm run setup           # install root, server and client dependencies
npm run dev             # API on :3001 and the game on http://localhost:5173
npm run build && npm start      # production: Express serves the game on :3001
npm run build:portable  # one offline HTML file: client/dist-portable/Sol a Sol.html
npm test                # all tests
npm run simulate        # balance simulator
node client/scripts/ui-check.mjs --scenes all --viewports all --lang es   # layout and flow checks (needs the dev server and Chrome/Edge)
```

Add `?lang=en` to the address to start in English.

---

## 11. Limits and future work

- **Simplifications are declared:** one astronaut instead of a crew; "night" is a sleep schedule because the south pole has almost permanent low sun; the shield uses energy so the child can decide each night; the Rover jumps like a video game while real rovers drive slowly. All 16 are listed in the game.
- **The live mission depends on the real Sun.** With a calm Sun the game is easier, and it says so.
- **Mars is not playable yet.** It is announced with a real calculated delay; a Mars base (version 2) would make "deciding without waiting for Earth" the central rule.
- **Ideas:** a teacher guide with classroom activities and a printable worksheet; a shared class mission (the engine already supports seeds); a Mars base mission.
