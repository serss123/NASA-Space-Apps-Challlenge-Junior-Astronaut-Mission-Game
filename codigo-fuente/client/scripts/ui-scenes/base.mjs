// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Base scenes for client/scripts/ui-check.mjs (one per main screen, plus the style guide sections).
// Each scene: { name, description, setup } where `setup` is the body of an async function run in the page
// after the app loaded with an empty localStorage. Helpers available inside setup:
//   app (window.__solasolApp), game() (window.__solasol), sleep(ms), frame(), $(sel), $$(sel),
//   waitFor(selectorOrFn, ms), click(selectorOrElement), clickText(text, selector)
// Other owners add their own files next to this one (menu.mjs, game.mjs, panels.mjs, play.mjs, reports.mjs, journal.mjs).

// The style guide is loaded lazily (dev only): wait for it before touching it.
const openStyleguide = `await app.goto('styleguide'); await waitFor('.sg .tabs-panel');`;
const styleguideSection = (id) => `${openStyleguide} await click('#sg-tab-${id}'); await frame();`;

export default [
  { name: 'menu', description: 'Main menu for a new player', setup: `await app.goto('menu');` },
  { name: 'briefing', description: 'Briefing of "The great storm of 2024"', setup: `await app.showBriefing('archive');` },
  {
    name: 'game-start',
    description: 'First morning of the archive mission (fixed seed)',
    setup: `await app.startMission({ preset: 'archive', seed: 'LUNA-0001' }); await waitFor(() => window.__solasol);`
  },
  { name: 'journal', description: 'Discovery Journal with everything unlocked', setup: `app.learnAll(); await app.openOverlay('journal');` },
  { name: 'data', description: 'Data page (from the menu)', setup: `await app.openOverlay('data');` },
  { name: 'styleguide', description: 'Style guide: icon set (first page)', setup: `${openStyleguide} await waitFor('.sg-icon');` },
  { name: 'styleguide-characters', description: 'Style guide: Sol 0-3, Mission Control and its speech bubble', setup: styleguideSection('characters') },
  { name: 'styleguide-buttons', description: 'Style guide: buttons', setup: styleguideSection('buttons') },
  {
    name: 'styleguide-modal',
    description: 'Style guide: a modal with a footer (size md)',
    setup: `${styleguideSection('modal')} await click('.sg-open-modal'); await waitFor('[role="dialog"][aria-modal="true"]');`
  },
  {
    name: 'styleguide-modal-full',
    description: 'Style guide: the same modal at size "full"',
    setup: `${styleguideSection('modal')} await click('[data-size="full"]'); await click('.sg-open-modal'); await waitFor('[role="dialog"][aria-modal="true"]');`
  },
  {
    name: 'styleguide-pill',
    description: 'Style guide: a glossary pill open',
    setup: `${styleguideSection('modal')} await click('.term'); await waitFor('.glossary-pill');`
  },
  { name: 'styleguide-nav', description: 'Style guide: pager and tabs', setup: styleguideSection('nav') },
  { name: 'styleguide-tags', description: 'Style guide: data tags, sticker title, AI badge note', setup: styleguideSection('tags') },
  {
    name: 'styleguide-badge',
    description: 'Style guide: the AI badge popover open',
    setup: `${styleguideSection('tags')} await click('[data-ai-badge]'); await waitFor('.ai-pop');`
  },
  {
    name: 'styleguide-storm',
    description: 'Style guide: the sky in storm mood',
    setup: `${styleguideSection('backdrop')} await click('[data-mood="storm"]'); await sleep(900);`
  }
];
