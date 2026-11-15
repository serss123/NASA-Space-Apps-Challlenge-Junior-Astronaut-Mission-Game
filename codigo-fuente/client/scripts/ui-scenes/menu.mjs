// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Extra scenes for client/scripts/ui-check.mjs: the menu beyond its first view.
// See base.mjs for the helpers available inside `setup`.
export default [
  { name: 'menu-settings', description: 'Menu with the settings window open', setup: `await app.goto('menu'); await app.openOverlay('settings'); await waitFor('[role="dialog"][aria-modal="true"]');` },
  {
    name: 'menu-settings-erase',
    description: 'Settings window asking to confirm "Erase progress"',
    setup: `await app.goto('menu'); await app.openOverlay('settings'); await waitFor('.modal-foot .btn-ghost'); await click('.modal-foot .btn-ghost'); await frame();`
  },
  {
    name: 'menu-glossary',
    description: 'Menu with a glossary word open (it opens as a Modal)',
    setup: `await app.goto('menu'); await waitFor('.dest-live .term'); await click('.dest-live .term'); await waitFor('.glossary-pill');`
  }
];
