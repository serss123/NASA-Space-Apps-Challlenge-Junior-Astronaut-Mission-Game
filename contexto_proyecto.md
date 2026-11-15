# MISSION CONTEXT: JUNIOR ASTRONAUT MISSION TRAINER

**Hackathon:** NASA Space Apps Challenge 2026
**Target Audience:** Kids 7-12 years old.
**Mission:** 21-day Lunar outpost survival.
**Tech Stack:** React + Vite (client), Node/Express (server), vanilla CSS with SVG/Canvas.

## HARD CONSTRAINTS & RULES

1. **NO NASA Branding:** Do not generate, use, or modify any NASA logos or official branding.
2. **SI (Synthetic Intelligence) Rules:**
   - Watermarks required on all SI-generated images/videos.
   - SI use for code, audio, and data must be clearly stated in the README and metadata.
3. **Language:** All codebase (variables, functions, comments) must be in English.

## CURRENT STATE

- Unit tests passing (238/238).
- Visual base ready (colors, icons, animated sky, solar storm faces, Earth-Control, "Made with AI" marks).
- Educational texts for kids ready (38 diary cards, 63 glossary words with "It's like..." examples, 21 daily phrases).
- Real NASA open data downloaded (DONKI, OSDR).

## PENDING TASKS (EXECUTE IN THIS ORDER)

1. **UI Redesign (Zero-Scroll):**
   - Force 100vh/100vw, no scrolling allowed. Buttons must always be visible.
   - High legibility typography. Complex glossary words must be clickable and open as Modals (to avoid scrolling).
   - Divide UI refactor into 3 agent tasks:
     a) Menu, presentation, diary, data page.
     b) Game loop, map, module panels.
     c) Night/final reports, Rover, minigames.
2. **Code Translation:** Refactor all Spanish variable/function names to English. Add JSDoc comments in English explaining the engineering trade-offs.
3. **README for Judges:** Create a highly structured README.md detailing NASA data usage, the educational trade-offs, and a strict table declaring SI usage per hackathon rules.
4. **Final Packaging:** Verify tests, build, and create the final ZIP.
