// Guardado local (solo en este dispositivo). Sin cuentas, sin cookies y sin enviar nada a ningún servidor.
const KEYS = {
  save: 'solasol.save.v1',
  notebook: 'solasol.notebook.v1',
  settings: 'solasol.settings.v1'
};

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const saveGame = (state) => write(KEYS.save, state);
export const loadGame = () => read(KEYS.save, null);
export const clearGame = () => {
  try {
    window.localStorage.removeItem(KEYS.save);
  } catch {
    /* ignorar */
  }
};

/** Cuaderno de descubrimientos: persiste entre partidas. */
export const loadNotebook = () => new Set(read(KEYS.notebook, []));
export const saveNotebook = (set) => write(KEYS.notebook, [...set]);

export const loadSettings = () => ({ reducedMotion: false, suitColor: '#ff8a3d', ...read(KEYS.settings, {}) });
export const saveSettings = (s) => write(KEYS.settings, s);

/** "Borrar progreso": partida, cuaderno, ajustes y palabras vistas. */
export function eraseAll() {
  try {
    for (const k of Object.keys(window.localStorage)) if (k.startsWith('solasol.')) window.localStorage.removeItem(k);
  } catch {
    /* ignorar */
  }
}
