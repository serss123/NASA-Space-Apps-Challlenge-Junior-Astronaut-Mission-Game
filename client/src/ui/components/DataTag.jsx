// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Sticker that says where a piece of data comes from. The kinds stay the same as in v1
// (EN VIVO · ARCHIVO · SIMULADO · CALCULADO · DISEÑO · NASA); the labels are short and kid friendly.
// Tapping the sticker shows what it means (a tiny popover); interactive={false} renders a plain label.
//
//   <DataTag kind="ARCHIVO" />            "DATO REAL" / "REAL DATA"
//   <DataTag kind="SIMULADO" size="sm" />
import { useRef, useState } from 'react';
import { useI18n } from '../../i18n.jsx';
import Icon from './Icon.jsx';
import Popover from './Popover.jsx';
import './datatag.css';

export const TAG_KINDS = {
  'EN VIVO': {
    cls: 'tag-live',
    icon: 'live',
    label: { es: 'EN DIRECTO', en: 'LIVE' },
    tip: { es: 'Dato real de la NASA, de estos mismos días.', en: 'Real NASA data from these very days.' }
  },
  ARCHIVO: {
    cls: 'tag-archive',
    icon: 'archive',
    label: { es: 'DATO REAL', en: 'REAL DATA' },
    tip: { es: 'Dato real de la NASA, guardado de antes (no es de hoy).', en: 'Real NASA data, saved from before (not from today).' }
  },
  SIMULADO: {
    cls: 'tag-sim',
    icon: 'dice',
    label: { es: 'AZAR', en: 'CHANCE' },
    tip: { es: 'Lo decide el juego tirando los dados, aunque lo cause algo real.', en: 'The game rolls the dice for it, even when something real causes it.' }
  },
  CALCULADO: {
    cls: 'tag-calc',
    icon: 'calculator',
    label: { es: 'CALCULADO', en: 'CALCULATED' },
    tip: { es: 'Calculado en tu navegador con fórmulas de verdad.', en: 'Worked out in your browser with real formulas.' }
  },
  DISEÑO: {
    cls: 'tag-design',
    icon: 'gamepad',
    label: { es: 'REGLA DEL JUEGO', en: 'GAME RULE' },
    tip: { es: 'Una regla que inventamos para que se pueda jugar.', en: 'A rule we made up so the game can be played.' }
  },
  NASA: {
    cls: 'tag-nasa',
    icon: 'science',
    label: { es: 'CIENCIA NASA', en: 'NASA SCIENCE' },
    tip: { es: 'Ciencia que ha publicado la NASA.', en: 'Science that NASA has published.' }
  }
};
const ALIAS = { DISENO: 'DISEÑO', LIVE: 'EN VIVO', ARCHIVE: 'ARCHIVO', SIMULATED: 'SIMULADO', CALCULATED: 'CALCULADO', DESIGN: 'DISEÑO' };

export default function DataTag({ kind = 'ARCHIVO', size = 'md', interactive = true, className = '' }) {
  const { t } = useI18n();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const k = TAG_KINDS[kind] || TAG_KINDS[ALIAS[kind]] || TAG_KINDS.ARCHIVO;
  const label = t(k.label);
  const tip = t(k.tip);
  const cls = `tag ${k.cls} tag-${size}${className ? ` ${className}` : ''}`;
  const body = (
    <>
      <span className="tag-dot" aria-hidden="true">
        <Icon name={k.icon} size="100%" />
      </span>
      <span className="tag-label">{label}</span>
    </>
  );
  if (!interactive) {
    return (
      <span className={cls} title={tip}>
        {body}
        <span className="sr-only">: {tip}</span>
      </span>
    );
  }
  return (
    <>
      <button ref={ref} type="button" className={cls} aria-expanded={open} aria-haspopup="dialog" aria-label={`${label}: ${tip}`} title={tip} onClick={() => setOpen((o) => !o)}>
        {body}
      </button>
      {open && (
        <Popover anchor={ref.current} onClose={() => setOpen(false)} label={label} className="tag-tip">
          <p className="tag-tip-text">
            <span className={`tag-tip-dot ${k.cls}`} aria-hidden="true">
              <Icon name={k.icon} size={22} />
            </span>
            <span>
              <strong>{label}.</strong> {tip}
            </span>
          </p>
        </Popover>
      )}
    </>
  );
}
