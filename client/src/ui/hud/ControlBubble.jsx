// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Mission Control: one tip at a time, chosen from what is happening at the base (plus a guided list on day one).
// On wide screens it is a side panel next to the map; in portrait it is a bar under the map (see game.css and controlbubble.css).
import { formatDate } from '@shared/gameTranslator.js';
import { sel } from '../../engine/index.js';
import { useI18n } from '../../i18n.jsx';
import Icon from '../components/Icon.jsx';
import RichText from '../components/RichText.jsx';
import './controlbubble.css';

/** Picks the most important tip right now. Returns { text, module, tone }. */
export function pickTip(s, lang) {
  const known = sel.knownLevelTonight(s);
  const fc = sel.forecast(s);
  const readyMission = s.missions.active.find((id) => sel.missionNeeds(s, id).ready);
  const growing = s.plots.some((p) => p.crop);

  if (s.phase === 'night') {
    if (known > 0 && s.energy.shield < known && !s.tasks.cables)
      return { tone: 'alert', module: 'shield', text: { es: `☢️ ¡Antes de dormir, carga el escudo! Esta noche hay tormenta de nivel ${known}.`, en: `☢️ Charge the shield before sleeping! Tonight brings a level ${known} storm.` } };
    if (growing && s.energy.farm === 0)
      return { tone: 'warn', module: 'farm', text: { es: '🌱 Tus plantas no tienen energía hoy: enciende la granja antes de dormir si te queda ⚡.', en: '🌱 Your plants have no power today: switch on the farm before sleeping if you have ⚡ left.' } };
    return { tone: 'night', module: 'bed', text: { es: '🌙 El hábitat se ha oscurecido: ve a la cama a dormir.', en: '🌙 The habitat has gone dark: go to bed and sleep.' } };
  }
  if (s.tasks.antenna)
    return { tone: 'alert', module: 'antenna', text: { es: '📡 La [[antenna|antena]] está descalibrada: sin ella no sabrás si viene una tormenta. Ve a repararla.', en: '📡 The [[antenna]] is out of calibration: without it you will not know if a storm is coming. Go and fix it.' } };
  if (!s.today.antennaLinked)
    return { tone: 'info', module: 'antenna', text: { es: '📡 Empieza el día: enciende la antena (1 ⚡) para saber qué trae el Sol y recibir misiones.', en: '📡 Start the day: switch on the antenna (1 ⚡) to learn what the Sun brings and get missions.' } };
  if (known > 0 && s.tasks.cables)
    return { tone: 'alert', module: 'shield', text: { es: `⚡ ¡Tormenta de nivel ${known} esta noche y los cables están rotos! Repáralos para poder cargar el escudo.`, en: `⚡ A level ${known} storm tonight and the cables are broken! Fix them so you can charge the shield.` } };
  if (known > 0 && s.energy.shield < known)
    return {
      tone: 'alert',
      module: 'shield',
      text:
        known > sel.shieldMaxCharge(s)
          ? { es: `☢️ Esta noche hay tormenta de nivel ${known} y tu escudo solo llega a ${sel.shieldMaxCharge(s)}. Mejóralo si puedes y cárgalo al máximo.`, en: `☢️ A level ${known} storm tonight and your shield only reaches ${sel.shieldMaxCharge(s)}. Upgrade it if you can and charge it fully.` }
          : { es: `☢️ Esta noche hay tormenta de nivel ${known}: carga el escudo con ${known} ⚡.`, en: `☢️ A level ${known} storm tonight: charge the shield with ${known} ⚡.` }
    };
  const storm = fc?.days.find((d) => d.offset > 0 && d.level > 0);
  if (storm)
    return {
      tone: 'warn',
      module: 'shield',
      text: {
        es: `🔭 Se acerca una tormenta para el ${formatDate(storm.date, 'es').replace(/ de \d{4}$/, '')} (nivel ${storm.level}). Prepárate: mejora el escudo, repara los cables y guarda comida.`,
        en: `🔭 A storm is coming on ${formatDate(storm.date, 'en').replace(/, \d{4}$/, '')} (level ${storm.level}). Get ready: upgrade the shield, fix the cables and store food.`
      }
    };
  if (fc?.predictions.length) {
    const p = fc.predictions[0];
    return {
      tone: 'warn',
      module: 'shield',
      text: {
        es: `☄️ La NASA prevé que una [[cme]] llegue el ${formatDate(p.arrivalTime, 'es').replace(/ de \d{4}$/, '')}. Las tormentas pueden traer [[radiation|radiación]]: ve preparando el escudo.`,
        en: `☄️ NASA predicts a [[cme]] arriving on ${formatDate(p.arrivalTime, 'en').replace(/, \d{4}$/, '')}. Storms can bring [[radiation]]: start preparing the shield.`
      }
    };
  }
  if (readyMission) return { tone: 'ok', module: 'antenna', text: { es: '🛰️ ¡Ya tienes lo que pide una misión! Envíala a la Tierra desde la antena.', en: '🛰️ You have what a mission needs! Send it to Earth from the antenna.' } };
  if (s.inv.food <= 2 && !growing)
    return { tone: 'warn', module: 'farm', text: { es: '🍽️ Queda poca comida: planta en la granja (la cosecha tarda 2 días).', en: '🍽️ Food is running low: plant in the farm (crops take 2 days).' } };
  if (growing && s.energy.farm === 0)
    return { tone: 'warn', module: 'farm', text: { es: '🌱 Tus cultivos necesitan energía hoy para crecer.', en: '🌱 Your crops need power today to grow.' } };
  if (s.tasks.panels)
    return { tone: 'warn', module: 'solar', text: { es: '🧹 Los paneles solares tienen [[regolith|regolito]]: límpialos o mañana tendrás 1 ⚡ menos.', en: '🧹 The solar panels are covered in [[regolith]]: clean them or you will get 1 ⚡ less tomorrow.' } };
  if (s.inv.ice === 0) return { tone: 'info', module: 'rover', text: { es: '🧊 No te queda hielo: sal con el Rover a buscarlo.', en: '🧊 You are out of ice: take the Rover to find some.' } };
  if (s.stamina >= 2) return { tone: 'info', module: 'rover', text: { es: '🚙 Sal con el Rover a por metal, hielo y muestras para las misiones.', en: '🚙 Take the Rover out for metal, ice and samples for the missions.' } };
  return { tone: 'info', module: 'bed', text: { es: '😴 Te quedan pocas Fuerzas: termina la jornada en la cama cuando quieras.', en: '😴 Little Stamina left: end the day in bed whenever you like.' } };
}

const FIRST_DAY_STEPS = [
  { id: 'antenna', done: (s) => s.today.antennaLinked, text: { es: 'Enciende y conecta la antena', en: 'Switch on and link the antenna' }, module: 'antenna' },
  { id: 'farm', done: (s) => s.stats.plants > 0, text: { es: 'Planta en la granja', en: 'Plant in the farm' }, module: 'farm' },
  { id: 'rover', done: (s) => s.stats.expeditions > 0, text: { es: 'Explora con el Rover', en: 'Explore with the Rover' }, module: 'rover' },
  { id: 'bed', done: (s) => s.phase !== 'day', text: { es: 'Cuando oscurezca, ve a la cama', en: 'When it gets dark, go to bed' }, module: 'bed' }
];

export default function ControlBubble({ state, onGo }) {
  const { t, lang } = useI18n();
  const tip = pickTip(state, lang);
  const firstDay = state.dayIndex === 0 && state.phase !== 'ended';
  return (
    <aside className={`mc on-paper mc-${tip.tone}`} aria-label={t({ es: 'Control de Misión', en: 'Mission Control' })}>
      <span className="mc-avatar" aria-hidden="true">
        <Icon name="satellite" size="100%" />
      </span>
      <div className="mc-body">
        <strong className="mc-title">{t({ es: 'Control de Misión', en: 'Mission Control' })}</strong>
        <RichText as="p" className="mc-text" text={tip.text} />
        {firstDay && (
          <ol className="mc-steps">
            {FIRST_DAY_STEPS.map((st) => {
              const done = st.done(state);
              const isNext = !done && FIRST_DAY_STEPS.find((x) => !x.done(state))?.id === st.id;
              return (
                <li key={st.id} className={`${done ? 'done' : ''}${isNext ? ' is-next' : ''}`}>
                  <button type="button" onClick={() => onGo(st.module)} className="mc-step-btn">
                    <Icon name={done ? 'check' : 'target'} size="1.2em" />
                    {t(st.text)}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {tip.module && (
        <button type="button" className="btn btn-secondary btn-sm mc-go" onClick={() => onGo(tip.module)}>
          <Icon name="target" />
          {t({ es: 'Ir allí', en: 'Go there' })}
        </button>
      )}
      <span className="mc-keys" aria-hidden="true">
        <Icon name="keyboard" size="1.3em" /> {t({ es: 'WASD / flechas o toca el suelo · E para usar', en: 'WASD / arrows or tap the floor · E to use' })}
      </span>
    </aside>
  );
}
