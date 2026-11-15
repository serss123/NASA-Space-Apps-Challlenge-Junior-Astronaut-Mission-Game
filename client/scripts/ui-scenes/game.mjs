// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Extra scenes for client/scripts/ui-check.mjs: the game screen (HUD, map, Mission Control, windows) in several states.
// See base.mjs for the helpers available inside `setup`. Exported pieces (START, ACK, LINK, BREAK) are reused by panels.mjs.

/** Start the archive mission with a fixed seed and wait for the game hooks. */
export const START = `await app.startMission({ preset: 'archive', seed: 'LUNA-0001' }); await waitFor(() => window.__solasol);`;
/** Acknowledge every pending discovery, so no "New discovery!" window covers the screen. */
export const ACK = `for (let i = 0; i < 40 && game().state.pending.length; i++) { game().dispatch({ type: 'ACK_DISCOVERY', id: game().state.pending[0] }); await sleep(60); } await sleep(150);`;
/** Switch the antenna on and link it with Earth (shows the forecast). */
export const LINK = `game().dispatch({ type: 'ALLOCATE', system: 'antenna', value: 1 }); await sleep(60); game().dispatch({ type: 'LINK_ANTENNA' }); await sleep(120); ${ACK}`;
/** Break the three things that can break, with real causes (the long texts of the panels). */
export const BREAK = `{ const s = game().state; game().dispatch({ type: 'LOAD', state: { ...s, tasks: { panels: { cause: { kind: 'rover' } }, cables: { cause: { kind: 'flareX', ref: 'X5.8', time: '2024-05-14T01:55:00Z', link: 'https://example.org' } }, antenna: { cause: { kind: 'kp', ref: 'Kp 8', kp: 8.3 } } } } }); await sleep(150); }`;

export default [
  { name: 'game-clear', description: 'Game, first morning, no window open (the map, the HUD and Mission Control alone)', setup: `${START} ${ACK}` },
  { name: 'game-linked', description: 'Game with the antenna linked (news ticker with the real headline)', setup: `${START} ${LINK}` },
  { name: 'game-broken', description: 'Game with the panels, cables and antenna broken (alert badges on the map)', setup: `${START} ${ACK} ${BREAK}` },
  { name: 'game-night', description: 'Game at night (the bed is highlighted)', setup: `${START} ${ACK} game().dispatch({ type: 'END_DAY' }); await sleep(250);` },
  { name: 'game-pause', description: 'Pause window', setup: `${START} ${ACK} game().openOverlay('menu'); await waitFor('[role="dialog"]');` },
  { name: 'game-journal', description: 'Journal opened from the game', setup: `${START} ${ACK} game().openOverlay('notebook'); await waitFor('.journal [role="tab"]');` },
  { name: 'game-data', description: 'Data page opened from the game (only the days lived so far)', setup: `${START} ${ACK} game().openOverlay('sources'); await waitFor('.sources [role="tab"]');` }
];
