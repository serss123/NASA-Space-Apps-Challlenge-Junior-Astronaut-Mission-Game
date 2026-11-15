# Use of SI / AI tools

The 2026 Space Apps rules allow AI as a tool (not to come up with the solution) and ask teams to declare every use. This is the honest record of how AI was used in *Sol a Sol*.

| Date | Tool | Used for | Where | Reviewed by |
|---|---|---|---|---|
| 2026-11-09 to 13 | Claude (Anthropic) | Planning document ("Plan Maestro"): organisation, rules, data research, comparison of options and a draft game concept | Team planning document (not in the repository) | [team] |
| [date] | Gemini (Google) | Team image | Team page on spaceappschallenge.org (not used in the game) | [team] |
| 2026-11-14 to 15 | Claude (Anthropic) via Claude Code | Generation of the game code from the team's feature brief: game engine and rules, top-down base UI, HUD, module panels, reports, the three maintenance minigames, the canvas Rover, the Express server, the DONKI/RadLab download and translation scripts, the balance simulator and the automated tests | `client/`, `server/`, `shared/` | [team] |
| 2026-11-14 to 15 | Claude (Anthropic) via Claude Code | Bilingual (Spanish/English) texts: glossary, discovery cards, facts, mission messages, data & sources page; documentation (README, DATA.md, GAME_DESIGN.md) | `client/src/content/`, `docs/`, `README.md` | [team] |
| 2026-11-14 to 15 | Claude (Anthropic) via Claude Code | Review of the code (automated reviewers looking for bugs, then fixes) | whole repository | [team] |

**How the idea was decided:** [the team describes it, as it happened — e.g. the team's own feature brief ("Sol a Sol" markdown: hearts, fatigue, base energy, buildings, Rover runner, maintenance tasks) and the team's decisions on scope (21 days, Moon playable, Mars "coming soon").]

**Data and numbers:** every scientific number shown in the game comes from NASA data downloaded by the scripts (DONKI, RadLab) or from official sources linked in the game; AI was not used as a source of facts. Game-balance numbers (costs, yields) are our own design and are labelled as such.

**Images and media:** no AI-generated images, video or audio are used. All art is drawn in code (SVG/CSS/canvas); the only photo is NASA's PIA13523 (NASA/GSFC/Arizona State University). No NASA logos, flags or mission identifiers are used.
