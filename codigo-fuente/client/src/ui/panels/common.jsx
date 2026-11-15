// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Shared pieces of the module panels: cost chips, action buttons with their reason, the energy switch, the shield
// stepper, the upgrade box, sections and the storm-level badge. They live on paper (the panels are Modals), so every
// colour comes from the v2 tokens and every icon is an <Icon> (no emoji in the UI chrome, docs/DESIGN.md section 2).
import { BALANCE, sel } from '../../engine/index.js';
import { useI18n } from '../../i18n.jsx';
import { sfx } from '../../audio/sfx.js';
import Icon, { hasIcon } from '../components/Icon.jsx';
import RichText from '../components/RichText.jsx';
import './panels.css';

/** Emoji of each resource, still used inside sentences (content text). */
export const ICON = { stamina: '💪', energy: '⚡', metal: '🔩', ice: '🧊', food: '🍽️', health: '❤️', z1: '🪨', z2: '🪨', z3: '🪨', research: '🔬', watch: '📡' };
/** The same resources as <Icon> names, for chips and buttons. */
export const ICON_NAME = { stamina: 'stamina', energy: 'bolt', metal: 'metal', ice: 'ice', food: 'food', health: 'heart', z1: 'rock', z2: 'rock', z3: 'rock', research: 'science', watch: 'antenna' };

export const RES_NAME = {
  stamina: { es: 'Fuerzas', en: 'Stamina' },
  energy: { es: 'energía', en: 'power' },
  metal: { es: 'metal', en: 'metal' },
  ice: { es: 'hielo', en: 'ice' },
  food: { es: 'raciones', en: 'rations' },
  z1: { es: 'anortosita (zona 1)', en: 'anorthosite (zone 1)' },
  z2: { es: 'brecha (zona 2)', en: 'breccia (zone 2)' },
  z3: { es: 'regolito helado (zona 3)', en: 'icy regolith (zone 3)' },
  watch: { es: 'días vigilando el Sol', en: 'days watching the Sun' }
};

/** The icon of a button: an <Icon> name, or (for old call sites) a plain emoji. */
function Glyph({ icon }) {
  if (!icon) return null;
  return typeof icon === 'string' && hasIcon(icon) ? <Icon name={icon} /> : <span className="btn-icon" aria-hidden="true">{icon}</span>;
}

/** Why something cannot be done, in words for a child. */
export function reasonText(reason, t, extra = {}) {
  const R = {
    night: { es: 'Es de noche: ya no puedes hacer tareas. Ve a dormir.', en: 'It is night: no more tasks. Go to sleep.' },
    stamina: { es: 'No te quedan Fuerzas.', en: 'You have no Stamina left.' },
    metal: { es: 'Te falta metal: búscalo con el Rover.', en: 'You need more metal: find it with the Rover.' },
    ice: { es: 'Te falta hielo: búscalo con el Rover.', en: 'You need more ice: find it with the Rover.' },
    goldenRule: { es: 'Regla de oro: primero mejora el Soporte Vital.', en: 'Golden rule: upgrade Life Support first.' },
    maxLevel: { es: 'Ya está al nivel máximo.', en: 'Already at the top level.' },
    occupied: { es: 'Ya hay un cultivo aquí.', en: 'Something is already growing here.' },
    locked: { es: `Necesitas el Rover de nivel ${extra.need ?? ''}.`, en: `You need a level ${extra.need ?? ''} Rover.` },
    cables: { es: 'Los cables están cortocircuitados: repáralos primero.', en: 'The cables are short-circuited: fix them first.' },
    linked: { es: 'La antena ya gastó su energía hoy.', en: 'The antenna already used its power today.' },
    energy: { es: 'No te queda energía libre.', en: 'No free power left.' },
    antennaOff: { es: 'Primero enciende la antena con el interruptor de arriba (1 de energía).', en: 'First switch on the antenna with the switch above (1 power).' },
    antennaNoPower: {
      es: 'Para encender la antena necesitas 1 de energía libre: quítala de la granja o del escudo.',
      en: 'To switch on the antenna you need 1 free power: take it from the farm or the shield.'
    },
    broken: { es: 'La antena está descalibrada: repárala.', en: 'The antenna is out of calibration: fix it.' },
    notLinked: { es: 'Conecta la antena con la Tierra para enviar los datos.', en: 'Link the antenna with Earth to send the data.' },
    missing: { es: 'Aún te faltan cosas para esta misión.', en: 'You still need some things for this mission.' },
    phase: { es: 'Ahora no se puede.', en: 'Not possible right now.' }
  };
  return t(R[reason] || R.phase);
}

/** Cost chips: { stamina: 1, ice: 1 } → "1 [stamina icon] · 1 [ice icon]". */
export function CostChips({ cost = {}, className = '' }) {
  const { t } = useI18n();
  const items = Object.entries(cost).filter(([, v]) => v);
  if (!items.length) return null;
  return (
    <span className={`cost-chips ${className}`}>
      {items.map(([k, v]) => (
        <span key={k} className={`cost-chip cost-${k}`} title={t(RES_NAME[k] || { es: k, en: k })}>
          {v}
          <Icon name={ICON_NAME[k] || 'sparkle'} size="1.1em" title={t(RES_NAME[k] || { es: k, en: k })} />
        </span>
      ))}
    </span>
  );
}

/** An action button with its cost and, when it cannot be done, the reason (never just a grey button). */
export function ActionButton({ label, icon, cost, check, onClick, variant = 'primary', size = '', extra }) {
  const { t } = useI18n();
  const ok = check ? check.ok : true;
  return (
    <div className="action">
      <button
        type="button"
        className={`btn btn-${variant} ${size} btn-block`}
        disabled={!ok}
        onClick={() => {
          sfx.play('click');
          onClick();
        }}
      >
        <Glyph icon={icon} />
        <span>{label}</span>
        {cost && <CostChips cost={cost} className="btn-cost" />}
      </button>
      {!ok && check?.reason && (
        <p className="action-reason" role="note">
          <Icon name="lock" size="1.1em" /> {reasonText(check.reason, t, check)}
        </p>
      )}
      {ok && check?.overexert && (
        <p className="action-warn" role="note">
          <Icon name="warning" size="1.1em" /> {t({ es: 'No te llegan las Fuerzas: harás un sobreesfuerzo y esta noche perderás 1 corazón.', en: 'Not enough Stamina: you will overexert and lose 1 heart tonight.' })}
        </p>
      )}
      {extra}
    </div>
  );
}

/** Energy switch (antenna, farm): 0 or 1 token. */
export function EnergyToggle({ state, system, dispatch, label, help }) {
  const { t } = useI18n();
  const on = state.energy[system] > 0;
  const chk = sel.canAllocate(state, system, on ? 0 : 1);
  return (
    <div className={`energy-toggle${on ? ' is-on' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={typeof label === 'string' ? label : t({ es: 'Interruptor de energía', en: 'Power switch' })}
        className="energy-switch"
        disabled={!chk.ok}
        onClick={() => {
          sfx.play(on ? 'click' : 'power');
          dispatch({ type: 'ALLOCATE', system, value: on ? 0 : 1 });
        }}
      >
        <span className="energy-knob">{on ? <Icon name="bolt" size={24} /> : null}</span>
      </button>
      <div className="energy-toggle-text">
        <strong>{label}</strong>
        <span>{on ? t({ es: 'Encendida · usa 1 de energía hoy', en: 'On · uses 1 power today' }) : t({ es: 'Apagada · 0 de energía', en: 'Off · 0 power' })}</span>
        {help && <RichText as="small" text={help} />}
        {!chk.ok && (
          <small className="action-reason">
            <Icon name="lock" size="1.1em" /> {reasonText(chk.reason, t)}
          </small>
        )}
      </div>
    </div>
  );
}

/** Shield charge selector (0..max). */
export function ShieldStepper({ state, dispatch }) {
  const { t } = useI18n();
  const max = sel.shieldMaxCharge(state);
  const cur = state.energy.shield;
  const set = (v) => {
    if (!sel.canAllocate(state, 'shield', v).ok) {
      sfx.play('error');
      return;
    }
    sfx.play(v > cur ? 'power' : 'click');
    dispatch({ type: 'ALLOCATE', system: 'shield', value: v });
  };
  return (
    <div className="shield-stepper" role="group" aria-label={t({ es: 'Carga del escudo', en: 'Shield charge' })}>
      <button type="button" className="btn btn-ghost btn-icon" onClick={() => set(cur - 1)} disabled={cur <= 0} aria-label={t({ es: 'Quitar carga', en: 'Less charge' })}>
        <Icon name="minus" />
      </button>
      <div className="shield-cells">
        {Array.from({ length: BALANCE.maxLevel }).map((_, i) => (
          <button
            key={i}
            type="button"
            className={`shield-cell${i < cur ? ' is-on' : ''}${i >= max ? ' is-locked' : ''}`}
            onClick={() => set(i + 1 === cur ? i : i + 1)}
            disabled={i >= max}
            aria-pressed={i < cur}
            aria-label={i >= max ? t({ es: `Nivel ${i + 1}: mejora el escudo`, en: `Level ${i + 1}: upgrade the shield` }) : t({ es: `Cargar ${i + 1}`, en: `Charge ${i + 1}` })}
          >
            {i >= max ? <Icon name="lock" size={26} /> : <Icon name="shield" size={30} className={i < cur ? '' : 'is-dim'} />}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-secondary btn-icon" onClick={() => set(cur + 1)} disabled={cur >= max} aria-label={t({ es: 'Más carga', en: 'More charge' })}>
        <Icon name="plus" />
      </button>
      <span className="shield-count" aria-live="polite">
        {t({ es: `Carga ${cur} de ${max} · gasta ${cur} de energía`, en: `Charge ${cur} of ${max} · uses ${cur} power` })}
      </span>
    </div>
  );
}

const UPGRADE_EFFECT = {
  lifeSupport: (n) => ({ es: `Nivel ${n}: ${2 + n} de energía al día, ${3 + n} Fuerzas y batería de ${n}. Deja subir los demás edificios a nivel ${n}.`, en: `Level ${n}: ${2 + n} power a day, ${3 + n} Stamina and a battery of ${n}. Lets other buildings reach level ${n}.` }),
  farm: (n) => ({ es: `Nivel ${n}: ${n} bancales para cultivar a la vez.`, en: `Level ${n}: ${n} planters growing at once.` }),
  antenna: (n) => ({ es: `Nivel ${n}: previsión de ${n} ${n === 1 ? 'noche' : 'noches'}.`, en: `Level ${n}: forecast for ${n} ${n === 1 ? 'night' : 'nights'}.` }),
  shield: (n) => ({ es: `Nivel ${n}: carga máxima ${n} (para tormentas de nivel ${n}).`, en: `Level ${n}: max charge ${n} (for level ${n} storms).` }),
  rover: (n) => ({ es: `Nivel ${n}: batería ${BALANCE.rover.capacityByLevel[n]} y zona ${n} desbloqueada.`, en: `Level ${n}: battery ${BALANCE.rover.capacityByLevel[n]} and zone ${n} unlocked.` })
};

/** Upgrade box of a building. */
export function UpgradeBox({ state, building, dispatch }) {
  const { t } = useI18n();
  const level = state.levels[building];
  if (level >= BALANCE.maxLevel) {
    return (
      <div className="upgrade-box is-max">
        <strong>
          <Icon name="star" /> <Icon name="star" /> <Icon name="star" /> {t({ es: 'Nivel máximo', en: 'Top level' })}
        </strong>
      </div>
    );
  }
  const chk = sel.canUpgrade(state, building);
  const cost = sel.upgradeCost(state, building) || {};
  return (
    <div className="upgrade-box">
      <p className="upgrade-next">
        <Icon name="arrow-up" /> {t(UPGRADE_EFFECT[building](level + 1))}
      </p>
      <ActionButton
        variant="science"
        icon="wrench"
        label={t({ es: `Mejorar a nivel ${level + 1}`, en: `Upgrade to level ${level + 1}` })}
        cost={{ stamina: BALANCE.upgradeStamina, ...cost }}
        check={chk}
        onClick={() => {
          sfx.play('build');
          dispatch({ type: 'UPGRADE', building });
        }}
      />
      {chk.reason === 'goldenRule' && (
        <RichText
          as="p"
          className="golden-rule"
          text={{
            es: '**Regla de oro:** ningún edificio puede tener más nivel que el [[life-support]]. Es el corazón de la base.',
            en: '**Golden rule:** no building can be higher level than [[life-support]]. It is the heart of the base.'
          }}
        />
      )}
    </div>
  );
}

/** A block of a panel page: optional icon + title, then its content. tone: alert | ok | warn. */
export function Section({ title, icon, children, tone }) {
  return (
    <section className={`panel-section${tone ? ` tone-${tone}` : ''}`}>
      {title && (
        <h3>
          {icon && <Icon name={icon} />}
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

/** Names of the four storm levels (docs/DESIGN.md section 4). */
const LEVEL_NAMES = [
  { es: 'Calma', en: 'Calm' },
  { es: 'Tormenta pequeña', en: 'Small storm' },
  { es: 'Tormenta fuerte', en: 'Strong storm' },
  { es: 'Supertormenta', en: 'Super storm' }
];

/** Storm level as an icon plus a word (colour is never the only signal). compact: icon and number only. */
export function RadiationLevel({ level, compact = false }) {
  const { t } = useI18n();
  if (level == null)
    return (
      <span className="rad-level is-unknown">
        <Icon name="help" size={22} /> {t({ es: 'Desconocido', en: 'Unknown' })}
      </span>
    );
  return (
    <span className={`rad-level is-level-${level}`}>
      <Icon name={level === 0 ? 'calm' : 'radiation'} size={22} />
      <span className={compact ? 'sr-only' : undefined}>{t(LEVEL_NAMES[level])}</span>
      {compact && <span aria-hidden="true">{level}</span>}
    </span>
  );
}
