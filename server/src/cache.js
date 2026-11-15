// Caché en memoria con caducidad (TTL) y peticiones compartidas.
//
//   const cache = createCache();
//   const data = await cache.wrap('clave', 60 * 60 * 1000, () => descargarAlgo());
//
// · Si la clave está guardada y no ha caducado, devuelve el valor guardado (no llama a `fn`).
// · Si ya hay una descarga en marcha con la misma clave, la comparte (dos peticiones iguales
//   a la vez = UNA sola llamada a DONKI).
// · Si `fn` falla, NO se guarda nada: la próxima petición lo vuelve a intentar.
// · El reloj se puede inyectar (`now`) para probar la caducidad sin esperar de verdad.

export function createCache({ now = () => Date.now(), maxEntries = 200 } = {}) {
  const store = new Map(); // clave → { value, expires }
  const inflight = new Map(); // clave → promesa en marcha

  /** Valor guardado o `undefined` si no existe o ya caducó. */
  function get(key) {
    const hit = store.get(key);
    if (!hit) return undefined;
    if (hit.expires <= now()) {
      store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  function has(key) {
    return get(key) !== undefined;
  }

  /** Guarda `value` durante `ttlMs` milisegundos. Devuelve el propio valor. */
  function set(key, value, ttlMs) {
    if (value === undefined) return value; // `undefined` significa "no hay nada": no se guarda
    store.delete(key); // así la clave pasa al final (la más reciente)
    if (store.size >= maxEntries) makeRoom();
    store.set(key, { value, expires: now() + ttlMs });
    return value;
  }

  /** Borra las caducadas; si sigue llena, la más antigua (los Map recuerdan el orden de llegada). */
  function makeRoom() {
    const t = now();
    for (const [k, v] of store) if (v.expires <= t) store.delete(k);
    while (store.size >= maxEntries) store.delete(store.keys().next().value);
  }

  /**
   * Devuelve lo guardado o ejecuta `fn()` una sola vez y guarda el resultado.
   * `ttl` puede ser un número (ms) o una función `(valor) => ms` para decidir según el resultado.
   */
  function wrap(key, ttl, fn) {
    const cached = get(key);
    if (cached !== undefined) return Promise.resolve(cached);
    if (inflight.has(key)) return inflight.get(key);

    const promise = Promise.resolve()
      .then(fn)
      .then((value) => set(key, value, typeof ttl === 'function' ? ttl(value) : ttl))
      .finally(() => {
        if (inflight.get(key) === promise) inflight.delete(key);
      });
    inflight.set(key, promise);
    return promise;
  }

  return {
    get,
    set,
    has,
    wrap,
    delete: (key) => store.delete(key),
    clear() {
      store.clear();
      inflight.clear();
    },
    /** ¿Hay una descarga en marcha con esta clave? */
    isPending: (key) => inflight.has(key),
    get size() {
      return store.size;
    }
  };
}
