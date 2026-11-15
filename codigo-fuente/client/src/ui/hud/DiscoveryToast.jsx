// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// "New discovery!": the first time something happens, a Modal tells the child what happened, what they learned and what
// to remember (the same card as the Journal). It used to be a floating card that covered the HUD and the map on small
// screens; as a Modal it never hides anything it should not and its buttons are always visible.
import { DISCOVERIES } from '../../content/discoveries.js';
import { useI18n } from '../../i18n.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import { DiscoveryCard } from '../screens/Journal.jsx';

export default function DiscoveryToast({ id, total, onOk, onNotebook }) {
  const { t } = useI18n();
  const d = DISCOVERIES[id];
  if (!d) return null;
  return (
    <Modal
      title={`${t({ es: '¡Nuevo descubrimiento!', en: 'New discovery!' })}${total > 1 ? ` · 1/${total}` : ''}`}
      icon="book"
      tone="var(--science)"
      size="lg"
      className="discovery-modal"
      onClose={onOk}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onNotebook}>
            <Icon name="book" />
            {t({ es: 'Ver en el Diario', en: 'See in the Journal' })}
          </button>
          <button type="button" className="btn btn-primary" onClick={onOk} data-autofocus>
            <Icon name="check" />
            {t({ es: '¡Entendido!', en: 'Got it!' })}
          </button>
        </>
      }
    >
      <DiscoveryCard d={d} />
    </Modal>
  );
}
