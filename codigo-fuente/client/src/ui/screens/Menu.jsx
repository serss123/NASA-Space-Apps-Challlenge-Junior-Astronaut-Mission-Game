// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Main menu: three destinations (the archive storm of May 2024, the LIVE Sun and "Mars (soon)").
// Layout rule (docs/DESIGN.md section 3): one screen, no scroll. The screen is a fixed grid (top bar / content /
// footer) and the content shrinks by dropping optional parts (logo, photo, long text) as the viewport gets smaller;
// see menu.css for the breakpoints.
import { useEffect, useState } from 'react';
import { earthMarsLightTime, formatDelay } from '@shared/marsDelay.js';
import { useI18n } from '../../i18n.jsx';
import { sfx } from '../../audio/sfx.js';
import DataTag from '../components/DataTag.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import RichText from '../components/RichText.jsx';
import Astronaut from '../map/Astronaut.jsx';
import photoSrc from '../../assets/lunar-south-pole-lro.jpg';
import './menu.css';

// The photo goes through Vite: on the web it is /assets/….jpg, in the single-file build it is inlined.
export const PHOTO = {
  src: photoSrc,
  credit: 'NASA/GSFC/Arizona State University (LRO · LROC, PIA13523)',
  url: 'https://images.nasa.gov/details/PIA13523'
};

const SUIT_COLORS = [
  { c: '#ff8a3d', es: 'Naranja', en: 'Orange' },
  { c: '#3ee6a0', es: 'Verde', en: 'Green' },
  { c: '#5ab0ff', es: 'Azul', en: 'Blue' },
  { c: '#ff5d73', es: 'Rojo', en: 'Red' },
  { c: '#b18cff', es: 'Morado', en: 'Purple' },
  { c: '#ffc83d', es: 'Amarillo', en: 'Yellow' }
];

/**
 * Settings window. It never scrolls: the body only holds the suit colours and one switch, and the
 * destructive action lives in the footer, where it swaps in place for its own confirmation.
 */
function SettingsModal({ settings, onSettings, onErase, onClose }) {
  const { t } = useI18n();
  const [confirmErase, setConfirmErase] = useState(false);

  const footer = confirmErase ? (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => setConfirmErase(false)}>
        {t({ es: 'No, mantener', en: 'No, keep it' })}
      </button>
      <button
        type="button"
        className="btn btn-danger"
        onClick={() => {
          onErase();
          onClose();
        }}
      >
        <Icon name="trash" />
        {t({ es: 'Sí, borrar', en: 'Yes, erase' })}
      </button>
    </>
  ) : (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmErase(true)}>
        <Icon name="trash" />
        {t({ es: 'Borrar progreso', en: 'Erase progress' })}
      </button>
      <button type="button" className="btn btn-primary" onClick={onClose}>
        {t({ es: 'Listo', en: 'Done' })}
      </button>
    </>
  );

  return (
    <Modal title={t({ es: 'Ajustes', en: 'Settings' })} icon="settings" tone="var(--info)" size="sm" onClose={onClose} footer={footer}>
      {confirmErase ? (
        <p className="settings-warning">{t({ es: 'Se borrarán la partida, el diario y los ajustes de este dispositivo. ¿Seguro?', en: 'This erases the saved game, the journal and the settings on this device. Are you sure?' })}</p>
      ) : (
        <>
          <fieldset className="settings-group">
            <legend>{t({ es: 'Color del traje', en: 'Suit colour' })}</legend>
            <div className="suit-colors">
              {SUIT_COLORS.map(({ c, es, en }) => (
                <button
                  key={c}
                  type="button"
                  className={`suit-swatch${settings.suitColor === c ? ' is-on' : ''}`}
                  style={{ '--c': c }}
                  aria-label={t({ es, en })}
                  title={t({ es, en })}
                  aria-pressed={settings.suitColor === c}
                  onClick={() => onSettings({ ...settings, suitColor: c })}
                >
                  {settings.suitColor === c && <Icon name="check" size={26} />}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="settings-check">
            <input type="checkbox" checked={settings.reducedMotion} onChange={(e) => onSettings({ ...settings, reducedMotion: e.target.checked })} />
            {t({ es: 'Menos animaciones', en: 'Fewer animations' })}
          </label>
          <p className="settings-note hide-compact">{t({ es: 'Este juego no pide ni envía datos personales.', en: 'This game does not ask for or send personal data.' })}</p>
        </>
      )}
    </Modal>
  );
}

// settingsOpen / onSettingsOpen (optional): App controls the settings modal (dev hook openOverlay('settings')).
export default function Menu({ save, settings, onSettings, onPlay, onContinue, onSources, onNotebook, onErase, settingsOpen, onSettingsOpen }) {
  const { t, lang, setLang } = useI18n();
  const [ownSettingsOpen, setOwnSettingsOpen] = useState(false);
  const showSettings = settingsOpen ?? ownSettingsOpen;
  const setShowSettings = onSettingsOpen ?? setOwnSettingsOpen;
  const [muted, setMuted] = useState(sfx.isMuted());
  useEffect(() => sfx.subscribe(setMuted), []);
  const mars = earthMarsLightTime(new Date());
  const days = t({ es: '21 días', en: '21 days' });

  // Every mission gets a fresh random seed from App (no game code is ever shown or typed).
  const play = (preset) => {
    sfx.play('ok');
    onPlay(preset);
  };

  return (
    <main className="screen menu">
      <div className="menu-top">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLang(lang === 'es' ? 'en' : 'es')} aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}>
          <Icon name="globe" />
          <span className="hide-compact">{lang === 'es' ? 'English' : 'Español'}</span>
          <span className="only-compact">{lang === 'es' ? 'EN' : 'ES'}</span>
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => sfx.toggle()} aria-pressed={muted} aria-label={muted ? t({ es: 'Activar el sonido', en: 'Turn the sound on' }) : t({ es: 'Quitar el sonido', en: 'Mute the sound' })}>
          <Icon name={muted ? 'sound-off' : 'sound-on'} />
          <span className="hide-compact">{muted ? t({ es: 'Sin sonido', en: 'Muted' }) : t({ es: 'Sonido', en: 'Sound' })}</span>
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowSettings(true)} aria-label={t({ es: 'Ajustes', en: 'Settings' })}>
          <Icon name="settings" />
          <span className="hide-compact">{t({ es: 'Ajustes', en: 'Settings' })}</span>
        </button>
      </div>

      <div className="menu-main">
        <header className="menu-hero">
          <div className="logo-box" aria-hidden="true">
            <div className="logo">
              <span className="logo-sun" />
              <span className="logo-moon" />
              <span className="logo-astro">
                <Astronaut color={settings.suitColor} size={64} />
              </span>
            </div>
          </div>
          <h1 className="sticker-title is-sun menu-title">Sol a Sol</h1>
          <p className="menu-sub">{t({ es: 'Entrenador de jóvenes astronautas · 7–12 años', en: 'Junior Astronaut Mission Trainer · ages 7–12' })}</p>
          <RichText
            as="p"
            className="menu-lead"
            text={{
              es: 'El Sol del juego es el **Sol real**. Dirige una base en el [[south-pole|polo sur]] de la Luna: cada decisión cuesta algo.',
              en: 'The Sun in this game is the **real Sun**. Run a base at the Moon’s [[south-pole]]: every choice has a cost.'
            }}
          />
        </header>

        <section className="dest-grid" aria-label={t({ es: 'Elige tu misión', en: 'Choose your mission' })}>
          <article className="dest dest-moon paper">
            <div className="dest-photo" style={{ '--photo': `url(${PHOTO.src})` }} role="img" aria-label={t({ es: 'Foto real del polo sur de la Luna, hecha por la nave LRO de la NASA', en: 'Real photo of the Moon’s south pole, taken by NASA’s LRO spacecraft' })} />
            <div className="dest-body">
              <div className="dest-tags">
                <DataTag kind="ARCHIVO" size="sm" />
                <span className="dest-chip">{days}</span>
              </div>
              <h2>{t({ es: 'La gran tormenta de 2024', en: 'The great storm of 2024' })}</h2>
              <p className="dest-text">{t({ es: 'Polo sur de la Luna, 1–21 de mayo de 2024. Cada día del juego es un día real del Sol.', en: 'Moon’s south pole, 1–21 May 2024. Every game day is a real day of the Sun.' })}</p>
              <div className="dest-actions">
                <button type="button" className="btn btn-primary btn-lg" onClick={() => play('archive')}>
                  <Icon name="rocket" />
                  {t({ es: 'Empezar misión', en: 'Start mission' })}
                </button>
                {save && (
                  <button type="button" className="btn btn-secondary" onClick={onContinue}>
                    <Icon name="play" />
                    {t({ es: `Continuar (día ${save.dayIndex + 1})`, en: `Continue (day ${save.dayIndex + 1})` })}
                  </button>
                )}
              </div>
              <small className="photo-credit">
                <Icon name="camera" size={16} />{' '}
                <a href={PHOTO.url} target="_blank" rel="noreferrer noopener">
                  {PHOTO.credit}
                </a>
              </small>
            </div>
          </article>

          <article className="dest dest-live paper">
            <div className="dest-body">
              <div className="dest-tags">
                <DataTag kind="EN VIVO" size="sm" />
                <span className="dest-chip">{days}</span>
              </div>
              <h2>{t({ es: 'El Sol de hoy', en: 'Today’s Sun' })}</h2>
              <RichText
                as="p"
                className="dest-text"
                text={{
                  es: 'Los últimos 21 días del Sol real, bajados de [[donki|DONKI]]. Sin conexión, jugarás la misión de archivo.',
                  en: 'The real Sun’s last 21 days, from [[donki|DONKI]]. With no connection, you will play the archive mission.'
                }}
              />
              <div className="dest-actions">
                <button type="button" className="btn btn-secondary btn-lg" onClick={() => play('live')}>
                  <Icon name="satellite" />
                  {t({ es: 'Jugar con el Sol de hoy', en: 'Play with today’s Sun' })}
                </button>
              </div>
            </div>
          </article>

          <article className="dest dest-mars paper is-soon">
            <div className="dest-body">
              <div className="dest-tags">
                <span className="dest-chip">
                  <Icon name="lock" size={16} /> {t({ es: 'Próximamente', en: 'Coming soon' })}
                </span>
                <DataTag kind="CALCULADO" size="sm" />
              </div>
              <h2>{t({ es: 'Marte (pronto)', en: 'Mars (soon)' })}</h2>
              <RichText
                as="p"
                className="dest-text"
                text={{
                  es: `Hoy, un mensaje de la Tierra a [[mars|Marte]] tarda **${formatDelay(mars.seconds, 'es')}**. A la Luna, solo 1 segundo.`,
                  en: `Today a message from Earth to [[mars|Mars]] takes **${formatDelay(mars.seconds, 'en')}**. To the Moon, just 1 second.`
                }}
              />
            </div>
          </article>
        </section>
      </div>

      <footer className="menu-foot">
        <p className="privacy hide-compact">
          <Icon name="lock" size={18} /> {t({ es: 'Sin cuentas, sin cookies y sin recoger datos. Se guarda solo en este dispositivo.', en: 'No accounts, no cookies, no data collected. Saved only on this device.' })}
        </p>
        <div className="menu-foot-actions">
          <button type="button" className="btn btn-secondary" onClick={onSources}>
            <Icon name="data" />
            {t({ es: 'Datos de la NASA', en: 'NASA data' })}
          </button>
          <button type="button" className="btn btn-science" onClick={onNotebook}>
            <Icon name="book" />
            {t({ es: 'Diario', en: 'Journal' })}
          </button>
        </div>
      </footer>

      {showSettings && <SettingsModal settings={settings} onSettings={onSettings} onErase={onErase} onClose={() => setShowSettings(false)} />}
    </main>
  );
}
