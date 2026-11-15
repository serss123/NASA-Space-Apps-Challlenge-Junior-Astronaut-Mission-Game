// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// A short burst of confetti stars for successes (about one second). It does nothing under reduced motion.
//
//   <Confetti fire={successCount} origin={buttonRef.current} />   every new truthy `fire` value throws a burst
//   const [confetti, burst] = useConfetti();  ...  {confetti}  ...  burst(event.currentTarget)
//
// origin: 'center' (default) | { x, y } in px | an Element | a DOMRect (the burst starts at its centre).
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { prefersReducedMotion } from './hooks.js';

const COLORS = ['var(--energy)', 'var(--heart)', 'var(--aurora-1)', 'var(--science)', 'var(--ice)', 'var(--food)'];
const STAR = '12,1.5 14.9,8.6 22.5,9.1 16.6,14 18.5,21.4 12,17.3 5.5,21.4 7.4,14 1.5,9.1 9.1,8.6';

function originPoint(origin) {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  if (origin && typeof origin.getBoundingClientRect === 'function') origin = origin.getBoundingClientRect();
  if (origin && typeof origin.width === 'number' && typeof origin.left === 'number') return { x: origin.left + origin.width / 2, y: origin.top + origin.height / 2 };
  if (origin && typeof origin.x === 'number') return { x: origin.x, y: origin.y };
  return { x: window.innerWidth / 2, y: window.innerHeight * 0.45 };
}

function makePieces(count, colors) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 90 + Math.random() * 140;
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist - 50,
      rot: (Math.random() * 2 - 1) * 320,
      size: 12 + Math.random() * 12,
      scale: 0.7 + Math.random() * 0.6,
      color: colors[i % colors.length],
      delay: Math.random() * 90,
      life: 750 + Math.random() * 350
    };
  });
}

export default function Confetti({ fire, origin = 'center', count = 18, colors = COLORS }) {
  const [bursts, setBursts] = useState([]);
  const timers = useRef([]);

  useEffect(() => {
    if (!fire || prefersReducedMotion()) return;
    const id = `${Date.now()}-${Math.random()}`;
    setBursts((b) => [...b, { id, at: originPoint(origin), pieces: makePieces(count, colors) }]);
    timers.current.push(setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1400));
    // `origin`, `count` and `colors` are read at fire time on purpose.
  }, [fire]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (!bursts.length) return null;
  return createPortal(
    <div className="confetti-layer" aria-hidden="true">
      {bursts.map((b) =>
        b.pieces.map((p, i) => (
          <svg
            key={`${b.id}-${i}`}
            className="confetti-piece"
            viewBox="0 0 24 24"
            style={{
              left: b.at.x,
              top: b.at.y,
              '--size': `${p.size}px`,
              '--dx': `${p.dx.toFixed(1)}px`,
              '--dy': `${p.dy.toFixed(1)}px`,
              '--rot': `${p.rot.toFixed(0)}deg`,
              '--s': p.scale.toFixed(2),
              '--delay': `${p.delay.toFixed(0)}ms`,
              '--life': `${p.life.toFixed(0)}ms`
            }}
          >
            <polygon points={STAR} fill={p.color} stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        ))
      )}
    </div>,
    document.body
  );
}

/** Hook version: returns [node to render, burst(origin?)]. */
export function useConfetti(options = {}) {
  const [shot, setShot] = useState(null);
  const burst = useCallback((origin = 'center') => setShot({ n: Date.now() + Math.random(), origin }), []);
  const node = <Confetti fire={shot?.n} origin={shot?.origin} {...options} />;
  return [node, burst];
}
