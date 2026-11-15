# NASA data used in *Sol a Sol* — and why

*Sol a Sol* turns real NASA space-weather data into the daily decisions of a Moon base. Every number shown in the game carries a label:

| Label | Meaning |
|---|---|
| **ARCHIVO** (archive) | Real NASA data, downloaded earlier and stored in the game (the May 2024 mission). |
| **EN VIVO** (live) | Real NASA data fetched right now from DONKI (the "sky these days" mission). |
| **CALCULADO** (calculated) | Computed in the browser with real formulas (Earth–Moon and Earth–Mars signal delay). |
| **SIMULADO** (simulated) | Invented by the game with probabilities (breakdowns, micrometeorites, Rover tracks). |
| **DISEÑO** (game design) | Our own simplification so that the game is playable (costs, yields, hearts). |
| **NASA** | A published NASA fact or image, with its source link. |

Nothing static is ever presented as live: if the live download fails, the game says so and falls back to the archive.

## 1. Datasets

### NASA CCMC · DONKI (Space Weather Database Of Notifications, Knowledge, Information)
- **API (no key):** `https://ccmc.gsfc.nasa.gov/DONKI-API/get/<TYPE>?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — web: <https://ccmc.gsfc.nasa.gov/tools/DONKI/>
- **Types used:** `FLR` (solar flares), `CME` (coronal mass ejections, with their speed from the most accurate analysis), `SEP` (solar energetic particles), `GST` (geomagnetic storms, Kp index), `IPS` (interplanetary shocks = CME arrivals at Earth/Moon), `MPC`, `RBE`, `HSS`, `WSAEnlilSimulations` (model predictions of CME arrival times) and `notifications` (bulletin summaries).
- **How the game uses it:** each game day *is* a real day. DONKI decides the night's radiation in the live mission, the real model warnings the antenna shows (e.g. on 8 May 2024 WSA-Enlil predicted the shock for 10 May 12:12 UTC; it arrived at 16:36 UTC), the headline of every day, and which breakdowns can happen (an X-class flare can short-circuit the shield cables, a CME shock can decalibrate the antenna…).
- **Why the CCMC address:** the api.nasa.gov route for DONKI returned 404 during our tests and `DEMO_KEY` is blocked after a few calls; the CCMC address needs no key and allows browser calls (CORS).

### NASA OSDR · RadLab (Radiation Dosimetry Database)
- **API:** `https://visualization.osdr.nasa.gov/radlab/api/?timestamp>=…&timestamp<…&instrument_id&absorbed_dose_rate&format=json` — web: <https://visualization.osdr.nasa.gov/radlab/gui/>
- **Instruments:** **CRaTER** on NASA's LRO spacecraft (lunar orbit), **DOSTEL 1/2** inside the ISS, **RAD** on the Curiosity rover (surface of Mars) and **BPD** on BioSentinel (deep space). Unit: absorbed dose rate in µGy/h, averaged per UTC day.
- **How the game uses it:** in the archive mission, the radiation level of each night is the **real dose measured near the Moon by CRaTER**, compared with a normal day (the average of 1–7 May 2024). The night report shows, side by side, what CRaTER measured near the Moon and what DOSTEL measured inside the ISS, which teaches why the Moon needs a shelter (no magnetosphere). On 20 May the report shows Curiosity's RAD peak on Mars.
- **Why the server:** RadLab does not allow browser calls (CORS), so the Express server (or the snapshot script) calls it and stores daily averages.

### NASA image PIA13523 — "The Lunar South Pole"
LROC Wide Angle Camera south-pole mosaic from LRO. Credit: **NASA/GSFC/Arizona State University** — <https://images.nasa.gov/details/PIA13523>. Shown on the menu, the mission briefing (with a pin next to Shackleton crater) and the data page.

### NASA OSDR study OSD-476 — plants grown in Apollo lunar soil
Used in the greenhouse discovery card and facts: plants sprouted in Apollo regolith but grew more slowly and with small roots. <https://osdr.nasa.gov/bio/repo/data/studies/OSD-476>

### Other references
- **JPL "Approximate Positions of the Planets"** (E. M. Standish) — <https://ssd.jpl.nasa.gov/planets/approx_pos.html>. Used to *calculate* the Earth–Mars light time of any date in the browser (≈11.0 min on 14 Nov 2026; ≈15.8 min on 20 May 2024). The Earth–Moon delay uses the main term of the lunar distance (≈1.2–1.35 s).
- **NASA-STD-3001** (shielding cuts a solar-storm dose by about half; 600 mSv career limit), **NASA BVAD** (daily oxygen, water and food needs of an astronaut), the **NASA Human Research Program** (bone loss) and NASA Moon/Mars fact sheets — used in fact cards, each with its link.
- **Canadian Space Agency** food production educator resources (partner agency) — context for the greenhouse. Credit: Canadian Space Agency.

## 2. Pipeline

```
server/scripts/snapshot.mjs      DONKI (10 types) + RadLab daily means, 24 Apr → 22 May 2024
        │                        → server/data/raw-may-2024.json (compact records, each with its DONKI id and link)
        ▼
server/scripts/build-archive.mjs + shared/gameTranslator.js
        │                        → one game day per date, 1 → 21 May 2024 (uninterrupted: calm days included)
        ▼
server/data/archive-may-2024.json  and  client/src/data/archive-may-2024.json (bundled: playable offline)
```

The live mission uses the **same translator** (`shared/gameTranslator.js`) on the last 21 days of DONKI, either in the Express server (`GET /api/game/timeline?preset=live`, cached 1 h) or — if the server is unreachable — directly from the browser. If both fail, the bundled archive is played and the briefing says so.

Refresh the archive:
```bash
npm run data:download   # downloads DONKI + RadLab (no key). Add --retry-missing to re-ask RadLab for failed days
npm run data:build      # rebuilds the 21-day game timeline from the download
```

## 3. From data to gameplay

**Radiation level of the night (archive mission, measured by CRaTER):**

| CRaTER vs normal day | Level | Shield charge needed |
|---|---|---|
| under 3× | 0 — calm | none |
| 3× to 30× | 1 — weak storm | 1 |
| 30× to 150× | 2 — strong storm | 2 |
| 150× or more | 3 — extreme storm | 3 |

**Radiation level estimated from DONKI (live mission, or a day without RadLab data):** a SEP event gives level 2 (3 if GOES reports >100 MeV protons or there is an ≥X5 flare); a CME shock gives level 1/2/3 when the CME travelled under 1000 / 1000–2000 / over 2000 km/s; a SEP plus a shock adds one level; particles linger one more day with one level less. Maximum 3.

**Breakdowns (SIMULATED probability, triggered by a REAL event of that day):**

| Real event (DONKI) | Breakdown | Chance | If not repaired |
|---|---|---|---|
| X-class flare | Short-circuited shield cables | 80 % | the shield cannot be charged |
| SEP (no X flare) | Short-circuited shield cables | 30 % | 〃 |
| CME shock (IPS) or Kp ≥ 7 | Antenna out of calibration | 60 % | no forecast, no missions |
| Kp 5–6 | Antenna out of calibration | 30 % | 〃 |
| CME shock (IPS) | Regolith on the solar panels | 40 % | −1 ⚡ every morning |
| A Rover trip / a micrometeorite | Regolith on the solar panels | 25 % / 5 % | 〃 |

The rolls depend only on the game code (seed), the day and the task — never on earlier decisions — so a mission can be replayed with the same code changing a single decision (a fair test).

## 4. The real May 2024 storm, day by day (archive mission)

"Normal day" = average of 1–7 May 2024. RadLab answered for all 21 days (the first download of 21–22 May timed out with HTTP 504 and was retried successfully).

| Day | Date | What happened (DONKI) | Night level | Moon (CRaTER) | ISS (DOSTEL) | Mars (RAD) | Breakdown chances (cables / antenna / panels) |
|---|---|---|---|---|---|---|---|
| 1 | 2024-05-01 | 🔭 A model predicts a CME arrival on May 4 | 0 | 1× | 1.2× | 1× | 0% / 0% / 0% |
| 2 | 2024-05-02 | 💥 A CME cloud reaches the Earth and the Moon | 0 | 1× | 0.9× | 1× | 0% / 60% / 40% |
| 3 | 2024-05-03 | ⚡ Class X1.6 solar flare | 0 | 1× | 1× | 1× | 80% / 0% / 0% |
| 4 | 2024-05-04 | 🔭 A model predicts a CME arrival on May 6 | 0 | 1× | 1× | 1× | 0% / 0% / 0% |
| 5 | 2024-05-05 | 💥 A CME cloud reaches the Earth and the Moon | 0 | 1× | 1× | 1× | 80% / 60% / 40% |
| 6 | 2024-05-06 | ⚡ Class X4.5 solar flare | 0 | 1× | 1× | 1× | 80% / 0% / 0% |
| 7 | 2024-05-07 | 🔭 A model predicts a CME arrival on May 10 | 0 | 1× | 0.9× | 1× | 0% / 0% / 0% |
| 8 | 2024-05-08 | ⚡ Class X1.0 solar flare | 0 | 1.1× | 1× | 1× | 80% / 0% / 0% |
| 9 | 2024-05-09 | ☢️ Satellites detect fast solar particles | 0 | 2.2× | 1× | 1× | 80% / 0% / 0% |
| 10 | 2024-05-10 | ☢️ High radiation near the Moon: 45 times normal | 2 | 45× | 0.9× | 1× | 80% / 60% / 40% |
| 11 | 2024-05-11 | ☢️ Very high radiation near the Moon: 214 times normal! | 3 | 214× | 0.8× | 1× | 80% / 60% / 40% |
| 12 | 2024-05-12 | ☢️ High radiation near the Moon: 48 times normal | 2 | 48× | 0.9× | 1× | 80% / 60% / 40% |
| 13 | 2024-05-13 | ☢️ High radiation near the Moon: 72 times normal | 2 | 72× | 1× | 1× | 30% / 30% / 0% |
| 14 | 2024-05-14 | ☢️ Very high radiation near the Moon: 302 times normal! | 3 | 302× | 1× | 1× | 80% / 0% / 0% |
| 15 | 2024-05-15 | ☢️ High radiation near the Moon: 102 times normal | 2 | 102× | 1× | 0.9× | 80% / 60% / 40% |
| 16 | 2024-05-16 | ☢️ High radiation near the Moon: 43 times normal | 2 | 43× | 0.9× | 0.9× | 0% / 60% / 40% |
| 17 | 2024-05-17 | 💥 A CME cloud reaches the Earth and the Moon | 1 | 13× | 1× | 0.8× | 0% / 60% / 40% |
| 18 | 2024-05-18 | ☀️ Clear day: the Sun is calm | 0 | 2.8× | 0.9× | 0.8× | 0% / 0% / 0% |
| 19 | 2024-05-19 | ☀️ Busy Sun: 3 M-class flares | 0 | 1.8× | 1× | 0.8× | 0% / 0% / 0% |
| 20 | 2024-05-20 | 🔴 Radiation rises on Mars (14 times normal, peak 63)! The Moon is calm | 0 | 1.9× | 1× | 14× | 0% / 0% / 0% |
| 21 | 2024-05-21 | 🔭 A model predicts a CME arrival on May 23 | 0 | 2.8× | 1× | 2.6× | 0% / 0% / 0% |

**Highlights of the window:** 18 X-class flares (12 from active region AR 13664, 5 from AR 13663, 1 from AR 13685); the biggest, **X8.7 on 14 May**; a **Kp 9** geomagnetic storm on 11 May; radiation near the Moon up to **302×** normal (14 May) while inside the ISS it never exceeded **1.2×**; the fastest CME left the Sun at **2678 km/s** on 20 May, when the same solar region faced Mars and Curiosity's RAD measured **14×** normal (peak **63×**).

## 5. What is real, simulated or calculated

| Real (NASA) | Calculated | Simulated / game design |
|---|---|---|
| Dates, flares, CMEs and their speeds, SEP, shocks, Kp, WSA-Enlil predictions and bulletins (DONKI) | Earth–Moon and Earth–Mars signal delay of each date | Breakdown probabilities (always triggered by a real event, except micrometeorites and Rover dust) |
| Radiation measured near the Moon, inside the ISS and on Mars (RadLab) | Radiation multipliers (daily mean ÷ the 1–7 May average) | Hearts, Stamina, power tokens, costs, crop yields, Rover tracks and items |
| The lunar south pole photo (LRO) and the facts in the cards, each with its link | Radiation levels 0–3 (thresholds above) | Forecasts for *future* days are a game helper (real forecasts sometimes fail — and the game says so) |
