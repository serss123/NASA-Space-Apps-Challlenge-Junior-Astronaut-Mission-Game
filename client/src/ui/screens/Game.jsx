// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Game screen: joins the engine (an immutable reducer) with the map, the HUD, the panels, the minigames and the reports.
// Layout (game.css): HUD and ticker on top, the map in the middle, Mission Control beside it on wide screens or under it
// in portrait. Every window (panels, discovery, pause, journal, data) is a <Modal>: the page itself never scrolls.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { DISCOVERIES } from '../../content/discoveries.js';
import { buildFinalReport, gameReducer, sel } from '../../engine/index.js';
import { useI18n } from '../../i18n.jsx';
import { sfx } from '../../audio/sfx.js';
import { clearGame, loadNotebook, saveGame, saveNotebook } from '../../persistence.js';
import DiscoveryToast from '../hud/DiscoveryToast.jsx';
import FinalReport from './FinalReport.jsx';
import Hud, { NewsTicker } from '../hud/Hud.jsx';
import ControlBubble from '../hud/ControlBubble.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import NightReport from './NightReport.jsx';
import Journal from './Journal.jsx';
import RoverModal from '../panels/RoverModal.jsx';
import DataPage from './DataPage.jsx';
import TaskModal from '../panels/TaskModal.jsx';
import BaseMap from '../map/BaseMap.jsx';
import ModulePanel from '../panels/ModulePanel.jsx';
import './game.css';

export default function Game({ initial, settings, onExit, onReplay, onNewGame }) {
  const { t } = useI18n();
  const [state, dispatch] = useReducer(gameReducer, initial);
  const [panel, setPanel] = useState(null);
  const [task, setTask] = useState(null);
  const [roverZone, setRoverZone] = useState(null);
  const [overlay, setOverlay] = useState(null); // 'menu' | 'notebook' | 'sources'
  const [walkTo, setWalkTo] = useState(null);
  const [notebook, setNotebook] = useState(loadNotebook);
  const prev = useRef(state);

  // Development only: a hook to try panels and reports from the console (it does not exist in production).
  useEffect(() => {
    if (import.meta.env.DEV) window.__solasol = { state, dispatch, openPanel: setPanel, openTask: setTask, openRover: setRoverZone, openOverlay: setOverlay };
  }, [state]);

  // Autosave on this device (and erase it when the mission ends).
  useEffect(() => {
    if (state.phase === 'ended') clearGame();
    else saveGame(state);
  }, [state]);

  // Sounds of the important changes.
  useEffect(() => {
    const p = prev.current;
    prev.current = state;
    if (p === state) return;
    if (p.phase === 'day' && state.phase === 'night') sfx.play('night');
    if (p.phase === 'report' && state.phase === 'day') sfx.play('day');
    if (state.phase === 'ended' && p.phase !== 'ended') sfx.play(state.outcome?.result === 'win' ? 'win' : 'night');
    const newBreak = ['panels', 'cables', 'antenna'].some((k) => !p.tasks[k] && state.tasks[k]);
    if (newBreak && state.phase === 'day') sfx.play('alarm');
  }, [state]);

  // Discoveries already seen in other games (or without text) are acknowledged silently.
  useEffect(() => {
    const skip = state.pending.filter((id) => notebook.has(id) || !DISCOVERIES[id]);
    for (const id of skip) dispatch({ type: 'ACK_DISCOVERY', id });
  }, [state.pending, notebook]);

  const learn = useCallback((ids) => {
    setNotebook((prevSet) => {
      const next = new Set(prevSet);
      ids.forEach((id) => next.add(id));
      saveNotebook(next);
      return next;
    });
    ids.forEach((id) => dispatch({ type: 'ACK_DISCOVERY', id }));
  }, []);

  const freshPending = state.pending.filter((id) => !notebook.has(id) && DISCOVERIES[id]);
  const report = useMemo(() => (state.phase === 'ended' ? buildFinalReport(state) : null), [state]);

  const paused = !!panel || !!task || !!roverZone || !!overlay || state.phase === 'report' || state.phase === 'ended';
  // A new discovery waits until nothing else is open, then it takes over the screen (the map must not move behind it).
  const discoveryOpen = !paused && freshPending.length > 0;
  const goTo = useCallback((id, use = true) => {
    setWalkTo({ id, use, n: Math.random() });
  }, []);

  const startTask = (k) => {
    setPanel(null);
    setTask(k);
  };
  const startRover = (z) => {
    setPanel(null);
    setRoverZone(z);
  };

  return (
    <div className={`game${settings.reducedMotion ? ' reduced-motion' : ''}`}>
      <Hud state={state} onMenu={() => setOverlay('menu')} onNotebook={() => setOverlay('notebook')} />
      <NewsTicker state={state} />
      <BaseMap
        state={state}
        paused={paused || discoveryOpen}
        reducedMotion={settings.reducedMotion}
        suitColor={settings.suitColor}
        onUse={(id) => setPanel(id)}
        walkTo={walkTo}
        highlight={state.phase === 'night' ? 'bed' : state.dayIndex === 0 && !state.today.antennaLinked ? 'antenna' : null}
      />
      <ControlBubble state={state} onGo={(id) => goTo(id)} />

      {panel && (
        <ModulePanel
          moduleId={panel}
          state={state}
          dispatch={dispatch}
          reducedMotion={settings.reducedMotion}
          onClose={() => setPanel(null)}
          onStartTask={startTask}
          onStartRover={startRover}
          onSleep={() => {
            setPanel(null);
            dispatch({ type: 'SLEEP' });
          }}
        />
      )}

      {task && (
        <TaskModal
          task={task}
          seed={`${state.seed}:${state.dayIndex}:${task}`}
          reducedMotion={settings.reducedMotion}
          onCancel={() => setTask(null)}
          onSuccess={() => {
            dispatch({ type: 'REPAIR', task });
            setTask(null);
          }}
        />
      )}

      {roverZone && (
        <RoverModal
          zone={roverZone}
          roverLevel={state.levels.rover}
          seed={`${state.seed}:${state.dayIndex}:${state.today.expeditions}`}
          reducedMotion={settings.reducedMotion}
          onCancel={() => setRoverZone(null)}
          onFinish={(result) => {
            dispatch({ type: 'EXPEDITION_DONE', zone: roverZone, result });
            setRoverZone(null);
          }}
        />
      )}

      {state.phase === 'report' && (
        <NightReport
          state={state}
          fresh={freshPending}
          onWake={() => {
            learn(freshPending);
            dispatch({ type: 'WAKE' });
          }}
        />
      )}

      {state.phase === 'ended' && report && (
        <FinalReport
          report={report}
          state={state}
          fresh={freshPending}
          onLearn={() => learn(freshPending)}
          onReplay={() => onReplay(state.seed)}
          onNewGame={onNewGame}
          onMenu={onExit}
          onSources={() => setOverlay('sources')}
        />
      )}

      {discoveryOpen && (
        <DiscoveryToast
          id={freshPending[0]}
          total={freshPending.length}
          onOk={() => learn([freshPending[0]])}
          onNotebook={() => {
            learn([freshPending[0]]); // the card that was just announced already shows as unlocked
            setOverlay('notebook');
          }}
        />
      )}

      {overlay === 'menu' && (
        <Modal
          title={t({ es: 'Pausa', en: 'Paused' })}
          icon="pause"
          tone="var(--info)"
          size="sm"
          onClose={() => setOverlay(null)}
          footer={
            <button type="button" className="btn btn-primary" onClick={() => setOverlay(null)} data-autofocus>
              <Icon name="play" />
              {t({ es: 'Seguir jugando', en: 'Keep playing' })}
            </button>
          }
        >
          <p className="muted">{t({ es: 'La partida se guarda sola en este dispositivo.', en: 'The game saves itself on this device.' })}</p>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => setOverlay('notebook')}>
            <Icon name="book" />
            {t({ es: 'Diario de descubrimientos', en: 'Discovery Journal' })}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => setOverlay('sources')}>
            <Icon name="data" />
            {t({ es: 'Datos y fuentes', en: 'Data and sources' })}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={onExit}>
            <Icon name="home" />
            {t({ es: 'Salir al menú (se guarda)', en: 'Exit to menu (saved)' })}
          </button>
        </Modal>
      )}
      {overlay === 'notebook' && (
        <Modal title={t({ es: 'Diario de descubrimientos', en: 'Discovery Journal' })} icon="book" tone="var(--science)" size="xl" fill onClose={() => setOverlay(null)}>
          <Journal discovered={notebook} />
        </Modal>
      )}
      {overlay === 'sources' && (
        <Modal title={t({ es: 'Datos y fuentes', en: 'Data and sources' })} icon="data" tone="var(--info)" size="xl" fill onClose={() => setOverlay(null)}>
          {/* During the game only the days already lived are shown (and today if the antenna told it): the forecast
              costs energy and must not come for free here. When the mission ends, all of them are shown. */}
          <DataPage
            timeline={state.phase === 'ended' ? state.timeline : state.timeline.slice(0, state.dayIndex + (sel.hasForecast(state) ? 1 : 0))}
            totalDays={state.timeline.length}
            source={state.source}
          />
        </Modal>
      )}
      <span className="sr-only" aria-live="polite">
        {state.phase === 'night' ? t({ es: 'Es de noche. Ve a la cama.', en: 'It is night. Go to bed.' }) : ''}
        {sel.isEnded(state) ? t({ es: 'La misión ha terminado.', en: 'The mission is over.' }) : ''}
      </span>
    </div>
  );
}
