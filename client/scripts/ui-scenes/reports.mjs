// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Extra scenes for client/scripts/ui-check.mjs: the night report and the final report. See base.mjs for the helpers
// and game.mjs for START / ACK / LINK.
import { ACK, LINK, START } from './game.mjs';

/** Go to bed and wake up: the night report opens. */
const SLEEP = `game().dispatch({ type: 'END_DAY' }); await sleep(250); game().dispatch({ type: 'SLEEP' }); await waitFor('[role="dialog"][aria-modal="true"]');`;
/** Three breakdowns with real causes, as the night report lists them. */
const BREAKDOWNS = `{ const s = game().state; game().dispatch({ type: 'LOAD', state: { ...s, log: [...s.log,
  { kind: 'breakdown', day: s.dayIndex, task: 'panels', cause: { kind: 'rover' } },
  { kind: 'breakdown', day: s.dayIndex, task: 'cables', cause: { kind: 'flareX', ref: 'X5.8', time: '2024-05-14T01:55:00Z', link: 'https://example.org' } },
  { kind: 'breakdown', day: s.dayIndex, task: 'antenna', cause: { kind: 'kp', ref: 'Kp 8', kp: 8.3 } }] } }); await sleep(200); }`;
/** End the mission with the given result. */
const END = (result) => `{ const s = game().state; game().dispatch({ type: 'LOAD', state: { ...s, phase: 'ended', outcome: { result: '${result}', day: s.dayIndex, date: s.timeline[s.dayIndex].date, cause: null } } }); await waitFor('[role="dialog"][aria-modal="true"]'); await sleep(250); }`;

export default [
  { name: 'report-night', description: 'Night report after a quiet first night', setup: `${START} ${ACK} ${SLEEP}` },
  { name: 'report-night-linked', description: 'Night report with the forecast known and a day of real data', setup: `${START} ${LINK} ${SLEEP}` },
  { name: 'report-night-full', description: 'Night report with new discoveries, three breakdowns and a fact (the longest case)', setup: `${START} game().dispatch({ type: 'ALLOCATE', system: 'antenna', value: 1 }); await sleep(80); game().dispatch({ type: 'LINK_ANTENNA' }); await sleep(120); ${SLEEP} ${BREAKDOWNS}` },
  { name: 'report-final-win', description: 'Final report: mission accomplished', setup: `${START} ${ACK} ${END('win')}` },
  { name: 'report-final-evacuated', description: 'Final report: evacuated', setup: `${START} ${ACK} ${END('evacuated')}` },
  { name: 'report-final-timeup', description: 'Final report: the relief crew arrives', setup: `${START} ${LINK} ${END('timeUp')}` }
];
