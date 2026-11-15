// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Extra scenes for client/scripts/ui-check.mjs: the Discovery Journal and the data page beyond their first view.
// See base.mjs for the helpers available inside `setup`.
const openJournal = `app.learnAll(); await app.openOverlay('journal'); await waitFor('.journal [role="tab"]');`;
const openData = `await app.openOverlay('data'); await waitFor('.sources [role="tab"]');`;
/** Click the n-th tab (0-based; -1 = the last one) of the open window. */
const tab = (n) => `{ const tabs = $$('.modal [role="tab"]'); await click(tabs.at(${n})); await sleep(250); await frame(); }`;

export default [
  { name: 'journal-locked', description: 'Journal of a new player: locked cards with hints', setup: `await app.openOverlay('journal'); await waitFor('.journal [role="tab"]');` },
  { name: 'journal-words', description: 'Journal, words tab (chips in a pager)', setup: `${openJournal} ${tab(-1)}` },
  {
    name: 'journal-word-modal',
    description: 'Journal, words tab, a word open as a Modal on top of the Journal',
    setup: `${openJournal} ${tab(-1)} await click('.word-chip'); await waitFor('.glossary-pill');`
  },
  { name: 'journal-chapter-last', description: 'Journal, last chapter', setup: `${openJournal} ${tab(-2)}` },
  { name: 'data-sources', description: 'Data page, NASA data tab', setup: `${openData} ${tab(1)}` },
  { name: 'data-convert', description: 'Data page, "data to game" tab', setup: `${openData} ${tab(2)}` },
  { name: 'data-days-gate', description: 'Data page, days tab behind the spoiler button', setup: `${openData} ${tab(3)}` },
  {
    name: 'data-days',
    description: 'Data page, days tab revealed',
    setup: `${openData} ${tab(3)} await click('.spoiler-gate .btn'); await sleep(250); await frame();`
  },
  { name: 'data-simplified', description: 'Data page, simplified tab', setup: `${openData} ${tab(4)}` },
  { name: 'data-credits', description: 'Data page, credits tab', setup: `${openData} ${tab(5)}` },
  { name: 'data-about', description: 'Data page, AI and privacy tab', setup: `${openData} ${tab(6)}` }
];
