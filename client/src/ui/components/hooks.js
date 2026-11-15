// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Small shared hooks for layout and motion. No dependencies; safe outside the browser (tests, SSR).
import { useEffect, useState } from 'react';

/** Phones: width <= 600 px or height <= 500 px. Same query as the .hide-compact / .only-compact helpers in base.css. */
export const COMPACT_QUERY = '(max-width: 600px), (max-height: 500px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const hasWindow = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/** true while the media query matches. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (hasWindow() ? window.matchMedia(query).matches : false));
  useEffect(() => {
    if (!hasWindow()) return undefined;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** true on phones (compact mode): show icons instead of labels, stack things, shrink art. */
export function useCompact() {
  return useMediaQuery(COMPACT_QUERY);
}

/** true when motion must stop: the system setting or the in-game "Reduce motion" switch (html.reduced-motion). */
export function prefersReducedMotion() {
  if (!hasWindow()) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches || document.documentElement.classList.contains('reduced-motion');
}

/** Hook version of prefersReducedMotion(): re-renders when either source changes. */
export function useReducedMotion() {
  const system = useMediaQuery(REDUCED_MOTION_QUERY);
  const [setting, setSetting] = useState(() => (hasWindow() ? document.documentElement.classList.contains('reduced-motion') : false));
  useEffect(() => {
    if (!hasWindow() || typeof MutationObserver === 'undefined') return undefined;
    const html = document.documentElement;
    const obs = new MutationObserver(() => setSetting(html.classList.contains('reduced-motion')));
    obs.observe(html, { attributes: true, attributeFilter: ['class'] });
    setSetting(html.classList.contains('reduced-motion'));
    return () => obs.disconnect();
  }, []);
  return system || setting;
}

/** The size of an element's content box, kept up to date with a ResizeObserver. Returns { width, height }. */
export function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize((prev) => (prev.width === box.width && prev.height === box.height ? prev : { width: box.width, height: box.height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
