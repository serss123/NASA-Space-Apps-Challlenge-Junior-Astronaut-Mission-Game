# Sol a Sol — Junior Astronaut Mission Trainer

**A free browser game for kids aged 7–12: run a base at the Moon's south pole through the real solar storm of May 2024, with real NASA data. Every choice has a cost.**

NASA Space Apps Challenge 2026 · Challenge *Build a Junior Astronaut Mission Trainer* · Local event: Salamanca (Spain)

> Judges: open the game, choose **"La gran tormenta solar / The great solar storm"** and play a few days. Add `?lang=en` to the URL to start in English (the language button is always visible). Everything a judge needs to verify the science is in the in-game page **📚 NASA data & sources** and in [docs/DATA.md](docs/DATA.md).

---

## Run it

Requirements: Node.js ≥ 20.19 (tested with Node 24) and npm.

```bash
npm run setup          # installs the root, server and client dependencies
npm run dev            # Express API on :3001 + Vite on http://localhost:5173
```

```bash
npm run build          # builds the client into client/dist
npm start              # Express serves the built game and the API on http://localhost:3001
```

```bash
npm run build:portable # the whole game in ONE file: client/dist-portable/Sol a Sol.html (double-click to play)
```

```bash
npm test               # 213 tests: engine rules, balance, translator, server API, rover, minigames, content, single-file build
npm run simulate       # balance simulator: 1000 automatic games per strategy on the real 21 days
npm run data:download  # re-download the real DONKI + RadLab data (no API key needed)
npm run data:build     # rebuild the game timeline from that download
```

The game also works **without the server**: the real May 2024 archive is bundled in the client, and the live mission can call DONKI directly from the browser.

**Play without installing anything:** `npm run build:portable` packs the code, styles, fonts, the NASA photo and the May 2024 data into a single HTML file (about 1.6 MB) that opens with a double click, with no server and no install — the easiest way to share the game. The archive mission works offline; the live mission needs internet (it asks DONKI directly) and, without it, falls back to the archive and says so.

## What it teaches

Kids live the engineering trade-offs NASA mission planners face, using the challenge's five topics:

| Topic | In the game | The trade-off |
|---|---|---|
| **Power budgeting** | 3–5 power tokens every morning (solar panels), shared between the antenna, the farm and the shield; unused power goes to a small battery | Power used for the shield tonight is not growing food |
| **Radiation shielding** | Charge the shield **before sleeping**: each storm level needs one level of charge | Protection costs power; the shield protects the base, not the Rover |
| **Life support** | 5 hearts; each night −1 per unmet need (no dinner, unshielded storm, overexertion); Life Support level caps every other building ("golden rule") | Upgrading the core first vs. the building you want now |
| **Food production** | Planting costs Stamina and ice today; food arrives two powered days later | Invest today to eat later |
| **Communication delay** | The antenna's message travels 1.3 s to the Moon; the game shows how many *minutes* it would take to Mars on that date | On Mars you must decide without waiting for Earth |

No choice is free — not even waiting (food is still eaten). An automated test checks it.

## How to play (one day = one real day)

1. **Morning:** read the real news of the day (if the antenna is on), get your power tokens and Stamina ("Fuerzas" = action points).
2. **Decide:** walk around the base (WASD / arrows, or tap) and use the modules: link the antenna (forecast + NASA missions), plant, charge the shield, repair breakdowns (3 minigames), upgrade buildings, or drive the Rover (canvas auto-runner: jump over craters and collect ice, metal and rock samples).
3. **Night:** when Stamina runs out (or you end the day), the habitat goes dark: check the bed checklist and sleep.
4. **Report:** what happened and **why**, next to what really happened that day (CRaTER near the Moon vs. DOSTEL inside the ISS).
5. **Win** by reaching 100 % research with NASA missions; if your health reaches 0 the mission is **evacuated — everyone is safe** — and the final report *"Why did it happen?"* explains the causes and offers to replay the **same game code** changing one decision.

## Features

- Top-down Moon base drawn in SVG + CSS, an original astronaut character, keyboard / mouse / touch movement, interaction nodes and styled modals.
- Real-data timeline: 21 days of NASA DONKI + RadLab (1–21 May 2024), plus a **LIVE mission** with the last 21 days of DONKI (automatic fallback to the archive, always labelled).
- 3 maintenance minigames (rub the regolith off the panels, connect the cables by colour **and** symbol, align the antenna dials) and a canvas **Rover** with lunar gravity, an 80 % / 20 % battery margin and an emergency return.
- Didactic layer: **discovery cards** that pop up the first time something happens and fill a **Discovery notebook**; **clickable glossary words** (underlined, coloured) with short explanations; "Did you know…?" facts with sources.
- Bilingual (Spanish / English), no accounts, no cookies, no analytics — progress is saved only on the device, with an *Erase progress* button.
- Seeded games (`LUNA-1234`) and a **class "mission of the day"** so a whole class gets the same breakdowns and can compare strategies.
- Mars shown as *coming soon*, with today's real Earth–Mars signal delay.

## NASA data used and why

| Data | Source | How the game uses it | Label |
|---|---|---|---|
| Solar flares, CMEs (speed), SEP, geomagnetic storms (Kp), CME shock arrivals, WSA-Enlil predictions, bulletins | NASA CCMC **DONKI** (`ccmc.gsfc.nasa.gov/DONKI-API`) | Every game day is a real day: headlines, forecasts, breakdown triggers, live radiation estimate | ARCHIVE (May 2024) / LIVE |
| Radiation measured near the Moon (CRaTER/LRO), inside the ISS (DOSTEL), on Mars (RAD/Curiosity), in deep space (BioSentinel) | NASA OSDR **RadLab** | The radiation level of each night in the archive mission; the Moon-vs-ISS lesson | ARCHIVE |
| Lunar south pole mosaic PIA13523 | NASA/GSFC/Arizona State University (LRO · LROC) | Menu, briefing (where the base is) and data page | NASA |
| Plants in Apollo lunar soil (OSD-476) | NASA OSDR | Greenhouse discovery and facts | NASA |
| Approximate planetary positions | NASA JPL | Earth–Mars signal delay of any date | CALCULATED |
| Shielding, consumables, health facts | NASA-STD-3001, BVAD, NASA HRP | Fact cards (each with its link) | NASA |

Details, endpoints, the processing pipeline and the full day-by-day table: **[docs/DATA.md](docs/DATA.md)**.

## How we simplified it

- One turn = one real day; air, water and food are grouped as Life Support; hearts stand for health instead of a dose in mSv.
- Night radiation = CRaTER's measured dose near the Moon turned into levels 0–3 (under 3×, under 30×, under 150×, 150× or more), or estimated from DONKI in the live mission.
- Breakdowns are **simulated probabilities triggered by real events** (e.g. an X-class flare → 80 % chance of short-circuited cables).
- Costs, crop yields, Rover tracks and the forecast of *future* days are our own design (real forecasts sometimes fail, and the game says so).

## Balance

`npm run simulate` plays 1000 games per strategy on the real 21 days. A sensible but imperfect kid wins **≈86 %** of games with good minigame skill and **≈52 %** with average skill; an expert wins 92–100 %; "always shield" and "always wait" win 0 %, "always science" ≈16 %, random play 0 %. With today's calmer Sun (live mission) the game is easier — that is reality, and the briefing explains it.

## Architecture

```
shared/        Pure JS shared by server and client: DONKI + RadLab → game days (gameTranslator), dates, Mars/Moon delay
server/        Node + Express 5: /api/game/timeline (archive | live | custom dates), /api/radlab/daily (CORS proxy),
               /api/space/delay, /api/sources, /api/health; caching, rate limit, security headers; serves client/dist
client/        React 19 + Vite, plain CSS/SVG/canvas (no component libraries)
  src/engine/  pure immutable game engine (reducer), seeded RNG, final report, balance simulator + tests
  src/ui/      base map, HUD, module panels, reports, menu, notebook, data page, glossary pills
  src/rover/   canvas auto-runner (pure engine.js + draw.js + RoverRun.jsx)
  src/minigames/ the three maintenance minigames
  src/content/ bilingual glossary, discoveries, facts, missions, sources
  scripts/     build-portable.mjs: the single-file version (everything inlined into one HTML) + its tests
docs/          GAME_DESIGN.md (rules and contracts) · DATA.md (data and science)
```

Fallback chain for the timeline: Express server → DONKI directly from the browser (live mission) → bundled real archive.

## Accessibility and privacy

Big buttons with relief, keyboard play (move, open modules, every control, Escape closes windows), visible focus, icons + text (never colour alone; the cables minigame uses colour **and** symbol **and** word), reduced-motion option (also honours the system setting), plain language with clickable explanations, Spanish and English. No accounts, no cookies, no analytics, no personal data: the game saves only on the device (localStorage) and has an *Erase progress* button.

## Credits and licences

- Project licence: **Apache-2.0** (see [LICENSE](LICENSE)).
- Fonts: Fredoka and Nunito via @fontsource (SIL Open Font License 1.1). React, Vite, Express, cors: MIT.
- All art (base, astronaut, Rover, minigames) is drawn in code by the team; sounds are synthesised in the browser (Web Audio). No NASA logos are used.
- Lunar south pole image PIA13523: NASA/GSFC/Arizona State University. Data: NASA CCMC DONKI, NASA OSDR RadLab, NASA OSDR OSD-476, NASA JPL. Partner agency resources: Canadian Space Agency.

## Use of AI tools

AI tools were used and are declared in **[AI_USE.md](AI_USE.md)**.

## Team

Team **"La Magma 1"** — NASA Space Apps Challenge 2026, Salamanca (Spain).
<!-- TODO: add the team members' names -->

---

## Resumen en español

**Sol a Sol** es un juego web gratuito para niños de 7 a 12 años. Diriges una base en el polo sur de la Luna durante la tormenta solar real del 1 al 21 de mayo de 2024, con datos de la NASA (DONKI y RadLab). Cada mañana repartes la energía entre la antena, la granja y el escudo. Gastas tus Fuerzas en plantar, reparar averías (tres minijuegos), mejorar edificios o salir con el Rover. Por la noche sabrás si te protegiste a tiempo de la radiación que midió de verdad la nave LRO cerca de la Luna. Ninguna decisión es gratis. Cada dato dice si es **EN VIVO**, **ARCHIVO**, **SIMULADO** o **CALCULADO**, y el informe final explica *por qué* pasó lo que pasó. Para jugarlo: `npm run setup` y `npm run dev` (http://localhost:5173). Para compartirlo sin instalar nada, `npm run build:portable` crea un único archivo HTML que se abre con doble clic.
