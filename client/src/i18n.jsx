// Idioma del juego (español / inglés). Los textos viven junto a cada componente como { es, en }.
// Orden de preferencia: ?lang=en|es en la URL (enlace de entrega en inglés) → lo guardado → idioma del navegador.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'solasol.lang';
const LangContext = createContext(null);

function detectLang() {
  if (typeof window === 'undefined') return 'en';
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl === 'es' || fromUrl === 'en') return fromUrl;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* sin almacenamiento: seguimos */
  }
  const nav = (navigator.languages?.[0] || navigator.language || 'en').toLowerCase();
  return nav.startsWith('es') ? 'es' : 'en';
}

/** Elige el texto del idioma activo. Acepta { es, en }, una cadena o null. */
export function pick(obj, lang) {
  if (obj == null) return '';
  if (typeof obj === 'string' || typeof obj === 'number') return String(obj);
  return obj[lang] ?? obj.es ?? obj.en ?? '';
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(detectLang);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignorar */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((obj) => pick(obj, lang), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** { lang, setLang, t } — t({ es: 'Hola', en: 'Hi' }) */
export function useI18n() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useI18n() debe usarse dentro de <LangProvider>');
  return ctx;
}

/** Formatea números según el idioma (1.234,5 / 1,234.5). */
export function fmtNum(n, lang, digits = 0) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: digits });
}
