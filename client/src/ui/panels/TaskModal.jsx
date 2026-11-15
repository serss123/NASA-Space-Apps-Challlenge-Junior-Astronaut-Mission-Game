// Ventana de una reparación (minijuego de mantenimiento). Cuesta 1 💪 solo si se termina.
// Si el niño cierra la ventana durante la celebración (ya resuelto), la reparación cuenta igual.
import { useRef } from 'react';
import { MINIGAMES } from '../../minigames/index.js';
import { useI18n } from '../../i18n.jsx';
import Modal from '../components/Modal.jsx';

const INFO = {
  panels: { icon: 'broom', accent: 'var(--energy)', title: { es: 'Limpiar los paneles solares', en: 'Clean the solar panels' } },
  cables: { icon: 'plug', accent: 'var(--shield)', title: { es: 'Reparar los cables del escudo', en: 'Fix the shield cables' } },
  antenna: { icon: 'antenna', accent: 'var(--antenna)', title: { es: 'Calibrar la antena', en: 'Calibrate the antenna' } }
};

export default function TaskModal({ task, seed, reducedMotion, onSuccess, onCancel }) {
  const { t } = useI18n();
  const solved = useRef(false);
  const finished = useRef(false);
  const Game = MINIGAMES[task];
  const info = INFO[task];
  if (!Game) return null;

  const succeed = () => {
    if (finished.current) return;
    finished.current = true;
    onSuccess();
  };
  // Cerrar (✕, Escape, fuera de la ventana o "Ahora no"): si ya estaba resuelto, cuenta como reparación.
  const close = () => (solved.current ? succeed() : onCancel());

  return (
    <Modal title={t(info.title)} icon={info.icon} accent={info.accent} onClose={close} size="lg">
      <p className="muted">{t({ es: 'Coste: 1 💪 al terminar la reparación. Si cierras antes de terminar, no gastas nada.', en: 'Cost: 1 💪 when the repair is done. If you close before finishing, nothing is spent.' })}</p>
      <Game
        seed={seed}
        reducedMotion={reducedMotion}
        onSolved={() => {
          solved.current = true;
        }}
        onSuccess={succeed}
        onCancel={close}
      />
    </Modal>
  );
}
