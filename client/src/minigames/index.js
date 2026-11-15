// Minijuegos de mantenimiento de la base ("tareas de la base"). Cada uno pinta solo su contenido:
// el marco (título, coste 1 💪 y botón de cerrar) lo pone ui/TaskModal.jsx.
//
//   <PanelCleaning seed="LUNA-4821:3:panels" reducedMotion={false} onSuccess={() => …} onCancel={() => …} />
//
// Contrato común: ({ seed = 'LUNA-0000', reducedMotion = false, onSuccess, onCancel }).
//   · onSuccess() se llama UNA sola vez, tras una celebración corta, cuando la avería queda reparada
//     (nunca al desmontar). onCancel es opcional: si llega, se ofrece un botón "Ahora no".
//   · El tablero sale de la semilla (seededRandom.js), así que la misma semilla da el mismo tablero.
//   · Sin fallo ni temporizador: los errores solo dan pistas y se vuelve a intentar.
import AntennaCalibration from './AntennaCalibration.jsx';
import CableRepair from './CableRepair.jsx';
import PanelCleaning from './PanelCleaning.jsx';

export { AntennaCalibration, CableRepair, PanelCleaning };

/** Avería del motor (claves de state.tasks) → minijuego que la repara. */
export const MINIGAMES = Object.freeze({
  panels: PanelCleaning,
  cables: CableRepair,
  antenna: AntennaCalibration
});
