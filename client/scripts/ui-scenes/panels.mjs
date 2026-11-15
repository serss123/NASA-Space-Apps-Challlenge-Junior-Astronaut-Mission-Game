// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Extra scenes for client/scripts/ui-check.mjs: the module panels (one page each; the body scrolls if it must). See base.mjs
// for the helpers and game.mjs for START / ACK / LINK / BREAK.
import { ACK, BREAK, LINK, START } from './game.mjs';

const open = (id) => `game().openPanel('${id}'); await waitFor('.panel-modal .panel-page, .panel-modal .checklist'); await sleep(250);`;
const base = `${START} ${ACK}`;

export default [
  { name: 'panel-life', description: 'Life Support', setup: `${base} ${open('lifeSupport')}` },
  { name: 'panel-farm', description: 'Farm (planters)', setup: `${base} ${open('farm')}` },
  { name: 'panel-farm-planted', description: 'Farm with a crop growing', setup: `${base} game().dispatch({ type: 'PLANT', plot: 0 }); await sleep(120); ${open('farm')}` },
  { name: 'panel-antenna', description: 'Antenna, not linked yet', setup: `${base} ${open('antenna')}` },
  { name: 'panel-antenna-linked', description: 'Antenna, linked: forecast, missions, today, learn', setup: `${START} ${LINK} ${open('antenna')}` },
  { name: 'panel-antenna-broken', description: 'Antenna broken: repair card', setup: `${base} ${BREAK} ${open('antenna')}` },
  { name: 'panel-shield', description: 'Shield', setup: `${START} ${LINK} ${open('shield')}` },
  { name: 'panel-shield-broken', description: 'Shield with short-circuited cables', setup: `${base} ${BREAK} ${open('shield')}` },
  { name: 'panel-rover', description: 'Rover zones', setup: `${base} ${open('rover')}` },
  { name: 'panel-rover-linked', description: 'Rover zones, antenna linked', setup: `${START} ${LINK} ${open('rover')}` },
  { name: 'panel-solar', description: 'Solar panels, clean', setup: `${base} ${open('solar')}` },
  { name: 'panel-solar-broken', description: 'Solar panels, dirty (repair card)', setup: `${base} ${BREAK} ${open('solar')}` },
  { name: 'panel-bed-day', description: 'Bed during the day (end the day)', setup: `${base} ${open('bed')}` },
  { name: 'panel-bed-night', description: 'Bed at night (the checklist and the "Sleep" button)', setup: `${START} ${LINK} game().dispatch({ type: 'END_DAY' }); await sleep(250); ${open('bed')}` }
];
