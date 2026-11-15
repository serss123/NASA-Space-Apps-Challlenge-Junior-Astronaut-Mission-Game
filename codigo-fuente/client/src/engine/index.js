// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Entry point of the game engine (pure JS, no React).
export { BALANCE, BUILDING_IDS, TASK_IDS, ZONE_IDS, MISSIONS, MISSION_BY_ID, SAMPLE_OF_ZONE } from './config.js';
export { createGame, gameReducer, isValidSave, GAME_VERSION, ACTION_TYPES } from './reducer.js';
export { buildFinalReport } from './report.js';
export { normalizeSeed, randomSeedCode, makeRandom, hashString } from './rng.js';
export * as sel from './selectors.js';
