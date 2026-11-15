// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Screen flow: menu -> (loading) -> briefing -> game. The night and final reports live inside the game screen.
// App also mounts, once, the animated sky (<BackdropProvider>) and the AI watermark (<AiBadge>), and owns the
// overlays opened from the menu: the Discovery Journal ('journal'), the data page ('data') and the settings.
//
// Every mission gets a fresh random seed. The seed is never shown to the player: it only makes
// "replay the same mission" fair (same days, same breakdown rolls, one decision changed).
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { DISCOVERIES } from './content/discoveries.js';
import { GLOSSARY } from './content/glossary.js';
import { loadTimeline } from './data/loadTimeline.js';
import { createGame, isValidSave, normalizeSeed, randomSeedCode } from './engine/index.js';
import { useI18n } from './i18n.jsx';
import { eraseAll, loadGame, loadNotebook, loadSettings, saveNotebook, saveSettings } from './persistence.js';
import AiBadge from './ui/components/AiBadge.jsx';
import ErrorBoundary from './ui/components/ErrorBoundary.jsx';
import { useGlossary } from './ui/components/Glossary.jsx';
import Modal from './ui/components/Modal.jsx';
import { BackdropProvider } from './ui/components/SpaceBackdrop.jsx';
import SunMood from './ui/components/SunMood.jsx';
import Briefing from './ui/screens/Briefing.jsx';
import DataPage from './ui/screens/DataPage.jsx';
import Game from './ui/screens/Game.jsx';
import Journal from './ui/screens/Journal.jsx';
import Menu from './ui/screens/Menu.jsx';
import archive from './data/archive-may-2024.json';
import './styles/app.css';

// Dev-only style guide. Behind import.meta.env.DEV the dynamic import is removed from production builds,
// so the game keeps a single JS chunk (the single-file build depends on it).
const StyleGuide = import.meta.env.DEV ? lazy(() => import('./ui/StyleGuide.jsx')) : null;

const SCREENS = ['menu', 'loading', 'briefing', 'game', 'styleguide'];

function initialScreen() {
  if (import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('styleguide')) return 'styleguide';
  return 'menu';
}

/** The mission (data + seed) of a given game: its very same days, source and mode. */
function missionOfGame(state, seed) {
  const preset = state.mode === 'live' ? 'live' : 'archive';
  return { preset, seed, data: { source: state.source, meta: state.meta, timeline: state.timeline, preset } };
}

const nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

function Loading() {
  const { t } = useI18n();
  return (
    <main className="app-loading" aria-busy="true">
      <div className="app-loading-card" role="status">
        <span className="anim-float">
          <SunMood level={0} size={128} />
        </span>
        <p className="sticker-title app-loading-title">{t({ es: 'Preparando la misión…', en: 'Preparing the mission…' })}</p>
      </div>
    </main>
  );
}

export default function App() {
  const { t, setLang } = useI18n();
  const { resetSeen, markSeen } = useGlossary();
  const [screen, setScreen] = useState(initialScreen); // menu | loading | briefing | game | styleguide
  const [overlay, setOverlay] = useState(null); // journal | data | settings
  const [settings, setSettings] = useState(loadSettings);
  const [save, setSave] = useState(() => (isValidSave(loadGame()) ? loadGame() : null));
  const [mission, setMission] = useState(null); // { preset, seed, data }
  const [game, setGame] = useState(null); // { key, state }
  const [notebook, setNotebook] = useState(loadNotebook);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', !!settings.reducedMotion);
  }, [settings.reducedMotion]);

  const updateSettings = (next) => {
    setSettings(next);
    saveSettings(next);
  };

  /** Loads the timeline and shows the briefing. `seed` is optional (dev hooks); players always get a random one. */
  const prepare = useCallback(async (preset, seed) => {
    setOverlay(null);
    setScreen('loading');
    const data = await loadTimeline(preset);
    const m = { preset, seed: normalizeSeed(seed) || randomSeedCode(), data };
    setMission(m);
    setScreen('briefing');
    return m;
  }, []);

  const launch = useCallback(
    (m = mission) => {
      const state = createGame({
        timeline: m.data.timeline,
        seed: m.seed,
        mode: m.data.source === 'EN VIVO' ? 'live' : 'archive',
        source: m.data.source,
        meta: m.data.meta
      });
      setOverlay(null);
      setGame({ key: Date.now(), state });
      setScreen('game');
    },
    [mission]
  );

  const exitToMenu = useCallback(() => {
    setSave(isValidSave(loadGame()) ? loadGame() : null);
    setNotebook(loadNotebook());
    setGame(null);
    setScreen('menu');
  }, []);

  const openJournal = useCallback(() => {
    setNotebook(loadNotebook());
    setOverlay('journal');
  }, []);

  const eraseProgress = useCallback(() => {
    eraseAll();
    resetSeen();
    setSave(null);
    setNotebook(new Set());
    setSettings(loadSettings());
  }, [resetSeen]);

  // ---- Dev hooks (docs/DESIGN.md section 8): only in development builds, never in production ----
  const live = useRef({});
  live.current = { screen, mission, game, prepare, launch, exitToMenu, openJournal, eraseProgress, markSeen, setLang };
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const L = () => live.current;
    const startMission = async ({ preset = 'archive', seed } = {}) => {
      const data = await loadTimeline(preset);
      const m = { preset, seed: normalizeSeed(seed) || randomSeedCode(), data };
      setMission(m);
      L().launch(m);
      await nextPaint();
      return L().screen;
    };
    window.__solasolApp = {
      get screen() {
        return L().screen;
      },
      screens: SCREENS,
      async goto(name) {
        const s = L();
        if (name === 'menu') s.exitToMenu();
        else if (name === 'briefing') {
          if (s.mission) setScreen('briefing');
          else await s.prepare('archive');
        } else if (name === 'game') {
          if (s.game) setScreen('game');
          else await startMission({});
        } else if (SCREENS.includes(name)) setScreen(name);
        else throw new Error(`Unknown screen: ${name}`);
        await nextPaint();
        return L().screen;
      },
      startMission,
      async showBriefing(preset = 'archive') {
        await L().prepare(preset);
        await nextPaint();
        return L().screen;
      },
      async openOverlay(name) {
        if (name === 'journal') L().openJournal();
        else if (name === 'settings') {
          if (L().screen !== 'menu') L().exitToMenu();
          setOverlay('settings');
        } else setOverlay(name || null);
        await nextPaint();
      },
      closeOverlay: () => setOverlay(null),
      setLang: (lang) => L().setLang(lang === 'en' ? 'en' : 'es'),
      learnAll() {
        const all = new Set(Object.keys(DISCOVERIES));
        saveNotebook(all);
        setNotebook(all);
        L().markSeen(Object.keys(GLOSSARY));
      },
      resetAll() {
        L().eraseProgress();
        setOverlay(null);
        setGame(null);
        setMission(null);
        setScreen('menu');
      }
    };
    return () => {
      delete window.__solasolApp;
    };
  }, []);

  return (
    <BackdropProvider>
      <ErrorBoundary key={screen} onReset={exitToMenu}>
        <div className="app-screen rm-fade" data-screen={screen}>
          {screen === 'menu' && (
            <Menu
              save={save}
              settings={settings}
              onSettings={updateSettings}
              onPlay={(preset) => prepare(preset)}
              onContinue={() => {
                const s = loadGame();
                if (isValidSave(s)) {
                  // The saved game becomes the "current" mission (for Replay / New game).
                  setMission(missionOfGame(s, s.seed));
                  setGame({ key: Date.now(), state: s });
                  setScreen('game');
                }
              }}
              onSources={() => setOverlay('data')}
              onData={() => setOverlay('data')}
              onNotebook={openJournal}
              onJournal={openJournal}
              onErase={eraseProgress}
              settingsOpen={overlay === 'settings'}
              onSettingsOpen={(open) => setOverlay(open ? 'settings' : null)}
            />
          )}

          {screen === 'loading' && <Loading />}

          {screen === 'briefing' && mission && (
            <Briefing
              data={mission.data}
              seed={mission.seed}
              onStart={() => launch()}
              onBack={() => {
                setMission(null);
                setScreen('menu');
              }}
            />
          )}

          {screen === 'game' && game && (
            <Game
              key={game.key}
              initial={game.state}
              settings={settings}
              onExit={exitToMenu}
              onReplay={(seed) => {
                // Same seed and the SAME days as the game that just ended: a fair test to change one decision.
                const m = missionOfGame(game.state, seed);
                setMission(m);
                launch(m);
              }}
              onNewGame={() => prepare(game.state.mode === 'live' ? 'live' : 'archive')}
            />
          )}

          {screen === 'styleguide' && StyleGuide && (
            <Suspense fallback={<Loading />}>
              <StyleGuide onExit={exitToMenu} />
            </Suspense>
          )}
        </div>
      </ErrorBoundary>

      {overlay === 'data' && (
        <Modal title={t({ es: 'Datos y fuentes', en: 'Data and sources' })} icon="data" tone="var(--info)" size="xl" fill onClose={() => setOverlay(null)}>
          <DataPage timeline={archive.timeline} source="ARCHIVO" spoilerGuard />
        </Modal>
      )}
      {overlay === 'journal' && (
        <Modal title={t({ es: 'Diario de descubrimientos', en: 'Discovery Journal' })} icon="book" tone="var(--science)" size="xl" fill onClose={() => setOverlay(null)}>
          <Journal discovered={notebook} />
        </Modal>
      )}

      <AiBadge onMore={screen === 'game' ? undefined : () => setOverlay('data')} />
    </BackdropProvider>
  );
}
