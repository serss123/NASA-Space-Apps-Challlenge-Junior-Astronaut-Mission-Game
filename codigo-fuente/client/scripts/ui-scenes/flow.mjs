// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Functional scenes for client/scripts/ui-check.mjs: they play the game with REAL clicks (no dev shortcuts except to read the
// state) and throw if something does not work. They check the flow, not the layout (ui-check also runs its layout checks at
// the end). See base.mjs for the helpers.

/** Assert helper, available in every flow: fail(message) stops the scene with a readable error. */
const PRE = `
  const fail = (m) => { throw new Error('FLOW: ' + m); };
  const need = async (sel, ms = 8000) => { try { return await waitFor(sel, ms); } catch { fail('not found: ' + sel); } };
  const press = (key) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  /** Close any "New discovery!" window by tapping its primary button. */
  const dismissDiscoveries = async () => { for (let i = 0; i < 30 && $('.discovery-modal'); i++) { await click($('.discovery-modal .modal-foot .btn-primary')); await sleep(120); } };
  /** Tap a module on the map and wait until its panel opens (the astronaut walks there first). */
  const openModule = async (index) => { await click($$('.map-node')[index]); await need('.panel-modal', 12000); await sleep(200); };
  const startGameFromMenu = async () => {
    await app.goto('menu');
    await click(await need('.dest-moon .btn-primary'));
    await click(await need('.briefing-foot .btn-primary', 10000));
    await need('.game .hud');
    await sleep(300);
    await dismissDiscoveries();
  };
`;
const MODULE = { lifeSupport: 0, antenna: 1, farm: 2, shield: 3, bed: 4, rover: 5, solar: 6 };

export default [
  {
    name: 'flow-first-day',
    description: 'Real clicks: menu -> briefing -> game -> link the antenna -> plant -> end the day -> sleep -> morning report -> day 2',
    setup: `${PRE}
      await startGameFromMenu();
      if (!game()) fail('game hooks missing');
      if (game().state.dayIndex !== 0) fail('should start on day 1');

      // 1. Antenna: switch it on and link it with Earth
      await openModule(${MODULE.antenna});
      await click(await need('.panel-modal [role="switch"]'));
      await sleep(150);
      if (game().state.energy.antenna !== 1) fail('the antenna switch did not give 1 power to the antenna');
      await click(await need('.panel-modal .action .btn-secondary:not(:disabled)'));
      await waitFor(() => game().state.today.antennaLinked, 6000).catch(() => fail('the antenna never linked'));
      await sleep(300);
      if (!$('.ticker.is-linked')) fail('the ticker should show the real headline after linking');
      if (!$('.panel-modal .forecast')) fail('the forecast should show after linking');
      if (/\\[\\[|\\]\\]/.test($('.panel-modal').innerText)) fail('raw [[glossary]] markup is visible in the antenna panel');
      press('Escape'); await sleep(300);
      await dismissDiscoveries();

      // 2. Farm: plant (costs Stamina and ice)
      const staminaBefore = game().state.stamina;
      await openModule(${MODULE.farm});
      await click(await need('.panel-modal .plot .btn:not(:disabled)'));
      await sleep(200);
      if (game().state.stamina >= staminaBefore) fail('planting did not cost Stamina');
      if (!game().state.plots.some((p) => p.crop)) fail('nothing was planted');
      press('Escape'); await sleep(300);
      await dismissDiscoveries();

      // 3. End the day in bed, then sleep
      await openModule(${MODULE.bed});
      await click(await need('.panel-modal .action .btn'));
      await waitFor(() => game().state.phase === 'night', 4000).catch(() => fail('the day did not end'));
      await sleep(300);
      await dismissDiscoveries();
      if (!$('.panel-modal')) await openModule(${MODULE.bed});
      await click(await need('.panel-modal .modal-foot .btn-primary'));
      await need('.report-modal', 6000);
      if (!/\\d/.test($('.report-modal .health-change').getAttribute('aria-label'))) fail('the night report has no health summary');
      await click(await need('.report-modal .modal-foot .btn-primary'));
      await waitFor(() => game().state.phase === 'day' && game().state.dayIndex === 1, 4000).catch(() => fail('day 2 did not start'));
      await sleep(300);
      if (!/2/.test($('.hud-day-num strong').textContent)) fail('the HUD does not show day 2');
    `
  },
  {
    name: 'flow-shield-and-upgrade',
    description: 'Real clicks: charge the shield and upgrade Life Support (resources are spent)',
    setup: `${PRE}
      await startGameFromMenu();
      await openModule(${MODULE.lifeSupport});
      const cells = $$('.panel-modal .shield-cell:not(:disabled)');
      if (!cells.length) fail('no shield cell can be charged');
      await click(cells[0]);
      await sleep(150);
      if (game().state.energy.shield !== 1) fail('charging the shield did not use 1 power');
      const up = $('.panel-modal .upgrade-box .btn:not(:disabled)');
      if (up) {
        const before = { ...game().state.inv };
        await click(up);
        await sleep(200);
        if (game().state.levels.lifeSupport !== 2) fail('Life Support did not reach level 2');
        if (game().state.inv.metal >= before.metal && game().state.inv.ice >= before.ice) fail('the upgrade cost nothing');
      }
      press('Escape'); await sleep(200);
    `
  },
  {
    name: 'flow-repair-cancel',
    description: 'Real clicks: open a repair minigame and leave it ("Not now"): nothing is spent',
    setup: `${PRE}
      await startGameFromMenu();
      const s = game().state;
      game().dispatch({ type: 'LOAD', state: { ...s, tasks: { ...s.tasks, panels: { cause: { kind: 'rover' } } } } });
      await sleep(200);
      const before = game().state.stamina;
      await openModule(${MODULE.solar});
      await click(await need('.panel-modal .tone-alert .btn:not(:disabled)'));
      await need('.mg-root', 6000);
      if (/\\[\\[|\\]\\]/.test($('.mg-root').innerText)) fail('raw glossary markup in the minigame');
      const cancel = [...$$('.modal .btn')].find((b) => /ahora no|not now/i.test(b.innerText));
      if (!cancel) fail('the minigame has no "Not now" button');
      await click(cancel);
      await sleep(300);
      if ($('.mg-root')) fail('the minigame window did not close');
      if (game().state.stamina !== before) fail('cancelling the repair cost Stamina');
    `
  },
  {
    name: 'flow-rover-abort',
    description: 'Real clicks: open the Rover, start, pause and abort: the expedition ends and the window closes',
    setup: `${PRE}
      await startGameFromMenu();
      await openModule(${MODULE.rover});
      const go = await need('.panel-modal .zone-card .btn:not(:disabled)');
      await click(go);
      await need('.rover-intro', 6000);
      await click(await need('.rover-intro-actions .btn-primary'));
      await click(await need('.rover-skip'));
      await sleep(1200);
      await click(await need('.rover-pause'));
      await click(await need('.rover-pause-actions .btn-danger'));
      await need('.rover-end', 8000);
      const home = [...$$('.rover-end .btn')].find((b) => /volver|back to base/i.test(b.innerText));
      if (!home) fail('the end screen has no "Back to base" button');
      await click(home);
      await waitFor(() => !$('.rover-root'), 4000).catch(() => fail('the Rover window did not close'));
      if (game().state.stats.expeditions < 1) fail('the expedition was not counted');
    `
  }
];
