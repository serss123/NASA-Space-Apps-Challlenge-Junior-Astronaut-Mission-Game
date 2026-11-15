// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Extra scenes for client/scripts/ui-check.mjs: the three repair minigames and the Rover expedition. See base.mjs for
// the helpers and game.mjs for START / ACK.
import { ACK, START } from './game.mjs';

const base = `${START} ${ACK}`;
const open = (task) => `game().openTask('${task}'); await waitFor('[role="dialog"][aria-modal="true"]'); await sleep(500);`;
const rover = (zone) => `game().openRover(${zone}); await waitFor('[role="dialog"][aria-modal="true"]'); await sleep(600);`;

export default [
  { name: 'task-panels', description: 'Minigame: clean the solar panels', setup: `${base} ${open('panels')}` },
  { name: 'task-cables', description: 'Minigame: fix the shield cables', setup: `${base} ${open('cables')}` },
  { name: 'task-antenna', description: 'Minigame: calibrate the antenna', setup: `${base} ${open('antenna')}` },
  { name: 'rover-intro-1', description: 'Rover expedition, zone 1: the briefing', setup: `${base} ${rover(1)}` },
  { name: 'rover-intro-3', description: 'Rover expedition, zone 3 (locked at level 1): the briefing with the warning', setup: `${base} ${rover(3)}` },
  {
    name: 'rover-countdown',
    description: 'Rover expedition: the 3-2-1 countdown',
    setup: `${base} ${rover(1)} await click('.rover-intro-actions .btn-primary'); await sleep(500);`
  },
  {
    name: 'rover-run',
    description: 'Rover expedition: running',
    setup: `${base} ${rover(1)} await click('.rover-intro-actions .btn-primary'); await click('.rover-skip'); await sleep(1500);`
  },
  {
    name: 'rover-pause',
    description: 'Rover expedition: paused',
    setup: `${base} ${rover(1)} await click('.rover-intro-actions .btn-primary'); await click('.rover-skip'); await sleep(900); await click('.rover-pause'); await sleep(300);`
  }
];
