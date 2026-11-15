// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Dev-only style guide: every foundation component on one screen, without scrolling (it follows its own rules).
// Open it with ?styleguide (or ?styleguide=buttons to pick a section) or __solasolApp.goto('styleguide').
// It is loaded with React.lazy only in development, so it never reaches the production bundle.
import { useRef, useState } from 'react';
import { useI18n } from '../i18n.jsx';
import { useConfetti } from './components/Confetti.jsx';
import DataTag, { TAG_KINDS } from './components/DataTag.jsx';
import EarthControl, { ControlSays } from './components/EarthControl.jsx';
import Icon, { ICON_NAMES } from './components/Icon.jsx';
import Modal from './components/Modal.jsx';
import Pager, { gridCapacity } from './components/Pager.jsx';
import RichText from './components/RichText.jsx';
import { useBackdropMood } from './components/SpaceBackdrop.jsx';
import SunMood from './components/SunMood.jsx';
import Tabs from './components/Tabs.jsx';
import './styleguide.css';

// The AI badge itself is mounted once by App (bottom-left corner); the Tags section points at it.

const SECTIONS = [
  { id: 'icons', icon: 'star', label: { es: 'Iconos', en: 'Icons' } },
  { id: 'characters', icon: 'sun', label: { es: 'Personajes', en: 'Characters' }, tone: 'var(--horizon)' },
  { id: 'buttons', icon: 'hand', label: { es: 'Botones', en: 'Buttons' }, tone: 'var(--stamina)' },
  { id: 'modal', icon: 'book', label: { es: 'Ventanas', en: 'Windows' }, tone: 'var(--life)' },
  { id: 'nav', icon: 'arrow-right', label: { es: 'Páginas', en: 'Pages' }, tone: 'var(--ice)' },
  { id: 'tags', icon: 'info', label: { es: 'Etiquetas', en: 'Tags' }, tone: 'var(--bed)' },
  { id: 'backdrop', icon: 'moon', label: { es: 'Fondo', en: 'Sky' }, tone: 'var(--science)' }
];
const MOODS = [
  { id: 'calm', icon: 'sun', label: { es: 'Calma', en: 'Calm' } },
  { id: 'storm', icon: 'flare', label: { es: 'Tormenta', en: 'Storm' } },
  { id: 'night', icon: 'moon', label: { es: 'Noche', en: 'Night' } }
];
const SIZES = ['sm', 'md', 'lg', 'xl', 'full'];

function initialSection() {
  const v = new URLSearchParams(window.location.search).get('styleguide');
  return SECTIONS.some((s) => s.id === v) ? v : 'icons';
}

function IconsSection() {
  return (
    <Pager
      items={ICON_NAMES}
      label="Icons"
      perPage={(area) => gridCapacity(area, { minWidth: 92, rowHeight: 84 })}
      pageClassName="sg-icon-grid"
      keyOf={(name) => name}
      render={(name) => (
        <figure className="sg-icon">
          <Icon name={name} size={40} />
          <figcaption>{name}</figcaption>
        </figure>
      )}
    />
  );
}

function CharactersSection() {
  const { t } = useI18n();
  return (
    <div className="sg-characters">
      <div className="sg-row sg-suns">
        {[0, 1, 2, 3].map((lv) => (
          <SunMood key={lv} level={lv} size="clamp(56px, 17vmin, 150px)" label />
        ))}
      </div>
      <div className="sg-row sg-earths">
        <EarthControl size={56} title={t({ es: 'Control de Misión contento', en: 'Happy Mission Control' })} />
        <EarthControl size={56} mood="worried" title={t({ es: 'Control de Misión preocupado', en: 'Worried Mission Control' })} />
        <ControlSays
          className="sg-says"
          tone="warn"
          talking
          text={{ es: 'Se acerca una [[cme|nube de plasma]]: carga el escudo.', en: 'A [[cme|plasma cloud]] is coming: charge the shield.' }}
          action={{ label: { es: 'Ir allí', en: 'Go there' }, icon: 'arrow-right', onClick: () => {} }}
        />
      </div>
    </div>
  );
}

function ButtonsSection() {
  const { t } = useI18n();
  return (
    <div className="sg-buttons">
      <div className="sg-row">
        <button type="button" className="btn btn-primary">
          <Icon name="rocket" />
          {t({ es: 'Principal', en: 'Primary' })}
        </button>
        <button type="button" className="btn btn-secondary">
          <Icon name="book" />
          {t({ es: 'Secundario', en: 'Secondary' })}
        </button>
        <button type="button" className="btn btn-ghost">
          <Icon name="arrow-left" />
          {t({ es: 'Fantasma', en: 'Ghost' })}
        </button>
        <button type="button" className="btn btn-danger">
          <Icon name="trash" />
          {t({ es: 'Peligro', en: 'Danger' })}
        </button>
        <button type="button" className="btn btn-science">
          <Icon name="science" />
          {t({ es: 'Ciencia', en: 'Science' })}
        </button>
      </div>
      <div className="sg-row">
        <button type="button" className="btn btn-secondary btn-sm">
          {t({ es: 'Pequeño', en: 'Small' })}
        </button>
        <button type="button" className="btn btn-secondary">
          {t({ es: 'Normal', en: 'Normal' })}
        </button>
        <button type="button" className="btn btn-secondary btn-lg">
          {t({ es: 'Grande', en: 'Large' })}
        </button>
        <button type="button" className="btn btn-primary btn-xl hide-compact">
          <Icon name="play" />
          {t({ es: '¡A jugar!', en: 'Play!' })}
        </button>
        <button type="button" className="btn btn-primary" disabled>
          <Icon name="lock" />
          {t({ es: 'Bloqueado', en: 'Locked' })}
        </button>
      </div>
      <div className="sg-row">
        {[
          ['play', { es: 'Jugar', en: 'Play' }],
          ['pause', { es: 'Pausa', en: 'Pause' }],
          ['settings', { es: 'Ajustes', en: 'Settings' }],
          ['sound-on', { es: 'Sonido', en: 'Sound' }],
          ['globe', { es: 'Idioma', en: 'Language' }],
          ['close', { es: 'Cerrar', en: 'Close' }]
        ].map(([name, label]) => (
          <button key={name} type="button" className="btn btn-icon btn-secondary" aria-label={t(label)} title={t(label)}>
            <Icon name={name} />
          </button>
        ))}
        <button type="button" className="btn btn-icon btn-primary btn-lg" aria-label={t({ es: 'Siguiente', en: 'Next' })} title={t({ es: 'Siguiente', en: 'Next' })}>
          <Icon name="arrow-right" />
        </button>
      </div>
    </div>
  );
}

function ModalSection() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState('md');
  const [confetti, burst] = useConfetti();
  return (
    <div className="sg-modal">
      <p className="sg-note">{t({ es: 'Ventana en tres partes: cabecera, cuerpo (nunca hace scroll) y pie (siempre visible).', en: 'A window in three parts: header, body (never scrolls) and footer (always visible).' })}</p>
      <div className="sg-row" role="group" aria-label={t({ es: 'Tamaño', en: 'Size' })}>
        {SIZES.map((s) => (
          <button key={s} type="button" data-size={s} className={`btn btn-sm ${s === size ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={s === size} onClick={() => setSize(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="sg-row">
        <button type="button" className="btn btn-primary btn-lg sg-open-modal" onClick={() => setOpen(true)}>
          <Icon name="book" />
          {t({ es: 'Abrir ventana', en: 'Open window' })}
        </button>
        <button type="button" className="btn btn-science" onClick={(e) => burst(e.currentTarget)}>
          <Icon name="sparkle" />
          {t({ es: '¡Confeti!', en: 'Confetti!' })}
        </button>
      </div>
      <RichText
        as="p"
        className="sg-note"
        text={{
          es: 'Toca las palabras: una [[cme|nube de plasma]], el [[magnetosphere|escudo magnético]] o el [[regolith|regolito]].',
          en: 'Tap the words: a [[cme|plasma cloud]], the [[magnetosphere|magnetic shield]] or the [[regolith]].'
        }}
      />
      {confetti}
      {open && (
        <Modal
          title={t({ es: '¡Buenos días, astronauta!', en: 'Good morning, astronaut!' })}
          icon="sunrise"
          tone="var(--energy)"
          size={size}
          onClose={() => setOpen(false)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                {t({ es: 'Ahora no', en: 'Not now' })}
              </button>
              <button type="button" className="btn btn-primary" data-autofocus onClick={() => setOpen(false)}>
                <Icon name="check" />
                {t({ es: '¡A trabajar!', en: "Let's go!" })}
              </button>
            </>
          }
        >
          <RichText as="p" text={{ es: 'Tus [[solar-panel|paneles solares]] te dan energía. Repártela bien.', en: 'Your [[solar-panel|solar panels]] give you energy. Share it well.' }} />
          <ControlSays text={{ es: 'Esta noche hay calma. ¡Buen día para explorar!', en: 'Tonight will be calm. A good day to explore!' }} tone="ok" />
          <p className="fact-box">{t({ es: '¿Sabías que…? La Luna tarda unos 27 días en dar una vuelta.', en: 'Did you know…? The Moon takes about 27 days to turn once.' })}</p>
        </Modal>
      )}
    </div>
  );
}

function NavSection() {
  const { t } = useI18n();
  const [tab, setTab] = useState('energy');
  const cards = Array.from({ length: 23 }, (_, i) => i + 1);
  const demoTabs = [
    { id: 'energy', icon: 'bolt', label: { es: 'Energía', en: 'Energy' }, badge: '2/3' },
    { id: 'shield', icon: 'shield', label: { es: 'Escudo', en: 'Shield' }, tone: 'var(--shield)' },
    { id: 'moon', icon: 'moon', label: { es: 'La Luna', en: 'The Moon' }, tone: 'var(--moon)' }
  ];
  const text = {
    energy: { es: 'Cada mañana recibes energía. Nunca hay para todo.', en: 'Every morning you get energy. There is never enough for everything.' },
    shield: { es: 'Carga el escudo antes de una tormenta.', en: 'Charge the shield before a storm.' },
    moon: { es: 'En el polo sur hay hielo escondido en los cráteres.', en: 'At the south pole there is ice hidden in the craters.' }
  };
  return (
    <div className="sg-nav">
      <section className="sg-nav-pager" aria-label="Pager">
        <Pager
          items={cards}
          label={t({ es: 'Tarjetas', en: 'Cards' })}
          perPage={(area) => gridCapacity(area, { minWidth: 138, rowHeight: 64 })}
          pageClassName="sg-card-grid"
          render={(n) => (
            <div className="sg-card">
              <Icon name="star" size={26} />
              <span>
                {t({ es: 'Tarjeta', en: 'Card' })} {n}
              </span>
            </div>
          )}
        />
      </section>
      <section className="sg-nav-tabs" aria-label="Tabs">
        <Tabs tabs={demoTabs} value={tab} onChange={setTab} label={t({ es: 'Temas', en: 'Topics' })}>
          {(active) => <RichText as="p" className="sg-tab-text" text={text[active]} />}
        </Tabs>
      </section>
    </div>
  );
}

function TagsSection() {
  const { t } = useI18n();
  return (
    <div className="sg-tags">
      <div className="sg-row">
        {Object.keys(TAG_KINDS).map((k) => (
          <DataTag key={k} kind={k} />
        ))}
      </div>
      <p className="sticker-title sg-sticker">Sol a Sol</p>
      <div className="sg-row sg-samples">
        <p className="fact-box">{t({ es: 'Caja de dato curioso.', en: 'A fun-fact box.' })}</p>
        <p className="sg-badge-note">
          <Icon name="robot" size={28} />
          <span>{t({ es: 'La marca «Hecho con IA» está siempre abajo a la izquierda. ¡Tócala!', en: 'The “Made with AI” mark is always at the bottom left. Tap it!' })}</span>
          <Icon name="arrow-down" size={24} className="sg-badge-arrow" />
        </p>
      </div>
    </div>
  );
}

function BackdropSection({ mood, setMood }) {
  const { t } = useI18n();
  return (
    <div className="sg-backdrop">
      <div className="sg-row" role="group" aria-label={t({ es: 'Ánimo del cielo', en: 'Sky mood' })}>
        {MOODS.map((m) => (
          <button key={m.id} type="button" data-mood={m.id} className={`btn ${m.id === mood ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={m.id === mood} onClick={() => setMood(m.id)}>
            <Icon name={m.icon} />
            {t(m.label)}
          </button>
        ))}
      </div>
      <p className="sg-note sg-on-sky">{t({ es: 'Estrellas que brillan, la Tierra girando sobre el horizonte y el Sol en la esquina.', en: 'Twinkling stars, the Earth turning above the horizon and the Sun in the corner.' })}</p>
    </div>
  );
}

export default function StyleGuide({ onExit }) {
  const { t, lang, setLang } = useI18n();
  const [section, setSection] = useState(initialSection);
  const [mood, setMood] = useState('calm');
  const panelRef = useRef(null);
  useBackdropMood(section === 'backdrop' ? mood : 'calm');

  return (
    <main className="sg screen">
      <header className="sg-head">
        <h1 className="sticker-title is-sun sg-title">{t({ es: 'Guía de estilo', en: 'Style guide' })}</h1>
        <div className="sg-head-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLang(lang === 'es' ? 'en' : 'es')} aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}>
            <Icon name="globe" />
            {lang === 'es' ? 'EN' : 'ES'}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onExit}>
            <Icon name="home" />
            {t({ es: 'Menú', en: 'Menu' })}
          </button>
        </div>
      </header>
      <Tabs tabs={SECTIONS} value={section} onChange={setSection} label={t({ es: 'Secciones', en: 'Sections' })} idBase="sg" className="sg-tabs" panelClassName={`sg-panel${section === 'backdrop' ? ' is-clear' : ' paper'}`}>
        {(active) => (
          <div ref={panelRef} className="sg-panel-inner" data-fit="">
            {active === 'icons' && <IconsSection />}
            {active === 'characters' && <CharactersSection />}
            {active === 'buttons' && <ButtonsSection />}
            {active === 'modal' && <ModalSection />}
            {active === 'nav' && <NavSection />}
            {active === 'tags' && <TagsSection />}
            {active === 'backdrop' && <BackdropSection mood={mood} setMood={setMood} />}
          </div>
        )}
      </Tabs>
    </main>
  );
}
