// Ventana de la expedición con el Rover (minijuego en canvas). El propio minijuego gestiona pausa y regreso.
import RoverRun from '../../rover/RoverRun.jsx';
import { useI18n } from '../../i18n.jsx';
import Modal from '../components/Modal.jsx';

export default function RoverModal({ zone, roverLevel, seed, reducedMotion, onFinish, onCancel }) {
  const { t } = useI18n();
  return (
    <Modal title={t({ es: `Expedición con el Rover · Zona ${zone}`, en: `Rover expedition · Zone ${zone}` })} icon="rover" accent="var(--rover)" size="xl" closable={false} className="rover-modal">
      <RoverRun zone={zone} roverLevel={roverLevel} seed={seed} reducedMotion={reducedMotion} onFinish={onFinish} onCancel={onCancel} />
    </Modal>
  );
}
