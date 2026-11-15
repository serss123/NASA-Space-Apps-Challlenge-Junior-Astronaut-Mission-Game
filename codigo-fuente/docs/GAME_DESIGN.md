# Sol a Sol · Especificación del juego (contrato técnico)

> Documento de referencia para todo el código. Fuente principal: `ai_prompt_proyecto_sol_a_sol.md`
> (funcionalidades). Complementos: enunciado del reto *Junior Astronaut Mission Trainer* (NASA Space Apps 2026)
> y *Plan Maestro* del equipo (datos, didáctica, etiquetas, privacidad).
> Decisiones del equipo (14-nov-2026): misión de **21 días reales** (1–21 de mayo de 2024), **Luna jugable**
> y **Marte "Próximamente"**, información didáctica que aparece **mientras se juega** y palabras técnicas
> **subrayadas, de otro color y clicables** con píldoras de información.

## 0. Principios que no se rompen

1. **Ninguna decisión es gratis.** Toda acción cuesta Fuerzas, Energía, materiales o un riesgo. Esperar también cuesta (la comida se consume igual).
2. **Datos reales con etiqueta.** Cada dato muestra su origen: `EN VIVO` (DONKI consultado ahora), `ARCHIVO` (copia real guardada), `SIMULADO` (inventado por el juego: averías, micrometeoritos), `CALCULADO` (p. ej. retraso Tierra–Marte de hoy). Nunca se presenta algo estático como en vivo.
3. **Fracasar no castiga:** si la salud llega a 0 → "Misión evacuada: todos a salvo" + pista concreta + volver a jugar.
4. **Lenguaje de niño (7–12 años):** frases cortas, iconos + texto (nunca solo color), botones grandes, todo jugable con teclado y con toques (sin arrastrar obligatorio).
5. **Privacidad total:** sin cuentas, sin cookies, sin analítica. Solo `localStorage` para la partida y los ajustes, con botón "Borrar progreso".
6. **Sin logos de la NASA** ni imágenes de menores. Créditos en texto ("Imagen: NASA/GSFC/Arizona State University").
7. Estilo propio: el astronauta y la base son **diseño original** (SVG/CSS). Nada copiado de otros juegos.

## 1. Arquitectura y carpetas

```
/ (raíz)                 package.json con scripts que arrancan cliente + servidor
├─ shared/               JS puro (ESM) compartido por servidor y cliente
│  ├─ gameTranslator.js  DONKI + RadLab → días del juego (línea temporal ininterrumpida)
│  ├─ dates.js           utilidades de fechas UTC
│  └─ marsDelay.js       retraso de la señal Tierra–Marte de un día (cálculo kepleriano)
├─ server/               Node + Express (ESM)
│  ├─ index.js           app Express (API + sirve client/dist en producción)
│  ├─ src/               donkiFetcher.js, donkiCompact.js, radlab.js, cache.js, sources.js, gameTranslator.js (re-exporta shared)
│  ├─ scripts/           snapshot.mjs (descarga), build-archive.mjs (construye la línea temporal ARCHIVO)
│  ├─ data/              raw-may-2024.json, archive-may-2024.json
│  └─ test/              node:test
├─ client/               React 19 + Vite, CSS puro, sin librerías de componentes
│  └─ src/
│     ├─ engine/         motor puro (reducer inmutable, reglas, semilla, informe, simulador) + tests
│     ├─ data/           archive-may-2024.json (copia para jugar sin servidor), loadTimeline.js
│     ├─ content/        glossary.js, discoveries.js, facts.js, missions.js, sources.js, simplifications.js
│     ├─ ui/             pantallas y componentes (mapa cenital, HUD, paneles de módulos, informes…)
│     ├─ minigames/      PanelCleaning, CableRepair, AntennaCalibration (React)
│     ├─ rover/          RoverRun (canvas, auto-runner)
│     ├─ audio/          sfx.js (Web Audio sintetizado, sin archivos)
│     ├─ styles/         tokens.css, base.css, buttons.css
│     └─ i18n.jsx        idioma (es/en) y helper t()
└─ docs/                 este documento, datos y simplificaciones
```

## 2. Recursos y reglas (motor)

Un **turno = un día real** de la línea temporal. Misión ARCHIVO: 1–21 de mayo de 2024 (21 días). Misión EN VIVO: los últimos 21 días de DONKI (con paso automático a ARCHIVO si falla).

| Recurso | Icono | Inicio | Regla |
|---|---|---|---|
| Salud | ❤️ | 5/5 | Cada noche −1 por cada necesidad no cubierta. 0 → evacuación. +1 tras 2 noches seguidas sin daño (máx. 5). |
| Fuerzas (el "Cansancio" del markdown: puntos de acción) | 💪 | 4 | Máx. = 3 + nivel de Soporte Vital. Se gastan en tareas (1), plantar (1), mejorar (1), Rover (2 o 3). Puede quedar < 0 (sobreesfuerzo). Al dormir: si cenaste → al máximo; si no → `max(1, min(actual, máx))`. |
| Energía de la base | ⚡ | 3 | Cada amanecer: 2 + nivel de Soporte Vital − 1 si los paneles están sucios + lo guardado en la batería. Se reparte entre Antena (1), Granja (1) y Escudo (1 por carga). Lo no usado al dormir se guarda en la **batería** (capacidad = nivel de Soporte Vital). |
| Comida | 🍽️ | 5 raciones | 1 ración cada noche (cena). Sin ración → −1 ❤️ y no recuperas Fuerzas. |
| Hielo (agua) | 🧊 | 4 | Plantar, mejoras. |
| Metal | 🔩 | 3 | Mejoras. |
| Muestras | 🪨 | 0 | Por zona: `z1` anortosita, `z2` brecha de impacto, `z3` regolito helado. Para misiones. |
| Investigación | 🔬 | 0 % | Misiones de la NASA. **100 % = victoria.** |

### Edificios (nivel 1 al empezar, máximo 3)
**Regla de oro:** ningún edificio puede superar el nivel del Soporte Vital. Mejorar cuesta 1 💪 + materiales.

| Edificio | Efecto por nivel | Mejora a Nv2 | Mejora a Nv3 |
|---|---|---|---|
| Soporte Vital 🫁 | Energía 3/4/5 · Fuerzas máx. 4/5/6 · Batería 1/2/3 | 4 🔩 + 1 🧊 | 6 🔩 + 2 🧊 |
| Granja 🌱 | Bancales 1/2/3 · cosecha 3 raciones | 3 🔩 + 1 🧊 | 4 🔩 + 2 🧊 |
| Antena 📡 | Previsión: esta noche / +mañana / +2 días | 3 🔩 | 4 🔩 + 1 🧊 |
| Escudo 🛡️ | Carga máxima 1/2/3 | 3 🔩 + 1 🧊 | 5 🔩 + 2 🧊 |
| Rover 🚙 | Batería 100/130/170 · zonas 1/2/3 | 4 🔩 | 6 🔩 + 1 🧊 |
| Cama 🛏️ | Resuelve la noche (no se mejora) | — | — |

- **Granja:** plantar cuesta 1 💪 + 1 🧊 en un bancal vacío. Un cultivo necesita **2 días con la granja encendida** (1 ⚡ ese día). Al anochecer de su 2.º día encendido se cosecha solo: +3 raciones.
- **Antena:** encenderla cuesta 1 ⚡/día. Al encenderla, la señal tarda **1,3 s** (distancia Tierra–Luna) y entonces llegan: la previsión de radiación, los avisos del día y las misiones. Muestra también el retraso de hoy si la base estuviera en Marte (CALCULADO).
- **Escudo:** cargar cuesta 1 ⚡ por nivel de carga (hasta su nivel). La carga se gasta cada noche. Si los **cables están cortocircuitados**, no se puede cargar.
- **Cama:** solo se usa cuando el hábitat se oscurece: al llegar a 0 💪 o al pulsar "Terminar la jornada". De noche aún se puede repartir energía (cargar el escudo), pero no hacer tareas.

### La noche (al dormir), en este orden
1. **Granja:** los cultivos crecen si la granja tuvo energía hoy; cosecha automática.
2. **Cena:** −1 ración. Si no hay → −1 ❤️ (causa `hunger`), no se recuperan Fuerzas.
3. **Radiación:** nivel de la noche `L` (0–3). Si `L > 0` y carga del escudo `< L` → −1 ❤️ (causa `radiation`).
4. **Salida en tormenta:** si saliste con el Rover un día de radiación `L ≥ 2` → −1 ❤️ (causa `outside`): el escudo protege la base, no al Rover.
5. **Sobreesfuerzo:** si 💪 < 0 → −1 ❤️ (causa `overexertion`).
6. ❤️ = 0 → evacuación. Si no, amanece: nuevo día, energía, Fuerzas, averías nuevas (tiradas con la semilla), misiones nuevas.

### Mantenimiento (estilo "tareas de la base"; cada reparación cuesta 1 💪 + minijuego)
| Avería | Disparador (dato real → probabilidad SIMULADA) | Si no se arregla |
|---|---|---|
| Paneles sucios de regolito | Llegada de un choque de CME (IPS) 40 % · tras salir con el Rover 25 % · micrometeorito 5 % | −1 ⚡ cada amanecer |
| Cables cortocircuitados | Llamarada clase X **80 %** · partículas SEP 30 % | No se puede cargar el escudo |
| Antena descalibrada | Choque de CME o tormenta geomagnética Kp ≥ 7: 60 % · Kp 5–6: 30 % | Sin previsión ni misiones |

Las averías se quedan hasta repararlas (una avería del mismo tipo no se acumula).

### Rover (auto-runner en canvas)
Zona 1 *Borde del cráter Shackleton* (Nv1, 2 💪) · Zona 2 *Cresta de conexión* (Nv2, 2 💪) · Zona 3 *Cráter en sombra permanente* (Nv3, 3 💪).
La pista de cada zona está calculada para gastar el **80 %** de la batería del nivel que la desbloquea (20 % de margen).
Cada choque −5 % de batería. Batería 0 → **regreso de emergencia**: se pierde la mitad de lo recogido; sin daño físico.

### Misiones de la NASA (llegan por la antena; máx. 3 activas; se entregan desde la antena encendida)
| id | Pide | 🔬 |
|---|---|---|
| `m-anorthosite` | 4 muestras z1 | 15 |
| `m-water` | 3 🧊 | 10 |
| `m-breccia` | 4 muestras z2 | 15 |
| `m-storm-watch` | antena encendida y conectada 3 días con actividad solar registrada en DONKI (llamarada, CME, partículas, choque o tormenta geomagnética) | 20 |
| `m-polar-ice` | 4 muestras z3 | 20 |
| `m-collection` | 2 muestras de cada zona | 20 |

### Objetos de cada pista y equilibrio (calibrado con el simulador)
Zona 1: 11 objetos (4 🔩, 4 muestras, 3 🧊) · zona 2: 13 (6 🔩, 5 muestras, 2 🧊) · zona 3: 15 (7 🧊, 6 muestras, 2 🔩).
`npm run simulate` juega 1000 partidas por estrategia sobre los 21 días reales: un niño sensato pero imperfecto gana ≈86 % con buena habilidad en los minijuegos y ≈52 % con habilidad media; un experto, 92–100 %; "solo escudo" 0 %, "solo ciencia" ≈16 %, "esperar siempre" 0 % y al azar 0 %. En la misión EN VIVO (Sol tranquilo de noviembre de 2026) es más fácil: es la realidad, y la presentación lo explica.

## 3. Datos reales → días del juego (`shared/gameTranslator.js`)

Cada día de la línea temporal (`TimelineDay`):

```js
{
  index, date: 'AAAA-MM-DD', source: 'ARCHIVO' | 'EN VIVO', calm: boolean,
  flares: { total, mCount, x: ['X5.8', …], max: 'X5.8' | null, items: [{ id, classType, peakTime, link }] },
  cmes: { total, fastest: { id, speed, startTime, link } | null },
  sep: [{ id, eventTime, instruments, link }],
  shocks: [{ id, eventTime, location, speed, link }],      // IPS en la Tierra (vale para la Luna)
  geomagnetic: { kpMax, id, link } | null,
  predictions: [{ id, madeAt, arrivalTime, location: 'Earth' | 'Mars', link }],  // WSA-Enlil
  notifications: [{ id, type, issueTime, summary, link }],
  radiation: {
    level: 0..3,                // el que usa la noche
    basis: 'measured' | 'estimated',
    estimatedLevel: 0..3,       // regla DONKI
    multiplier: number | null,  // CRaTER (LRO) frente a un día normal (media 1–7 mayo 2024)
    stations: { moonOrbit, iss, mars, deepSpace }   // { x, mean, max } reales de RadLab o null
  },
  triggers: { panels, cables, antenna },             // probabilidades 0..1
  triggerCauses: { panels, cables, antenna },        // texto corto con el evento real que lo causa
  headline: { es, en }, summary: { es, en },
  stormDamage, radMultiplier                         // compatibilidad con el prototipo
}
```

**Nivel de radiación medido (ARCHIVO):** CRaTER `x < 3` → 0 · `< 30` → 1 · `< 150` → 2 · `≥ 150` → 3.
**Nivel estimado (EN VIVO o sin RadLab):** SEP → 2 (3 si GOES >100 MeV o llamarada ≥ X5) · choque IPS con CME `< 1000 km/s` → 1, `1000–2000` → 2, `≥ 2000` → 3 · si hay SEP y choque, +1 · las partículas de un SEP siguen al día siguiente con un nivel menos. Máximo 3.
**Día despejado:** sin X, sin SEP, sin choque, sin Kp ≥ 5 y nivel 0.

## 4. Contratos de componentes

### Idioma
`import { useI18n } from '../i18n.jsx'` → `{ lang, setLang, t }`; `t({ es: '…', en: '…' })` devuelve el texto del idioma activo.
Los textos viven junto a cada componente como objetos `{ es, en }`.

### Glosario y texto enriquecido
`import RichText from '../ui/RichText.jsx'` → `<RichText text="La [[cme]] tarda días; la [[sep|radiación]] llega antes." />`.
`[[id]]` muestra la palabra del glosario; `[[id|texto]]` muestra otro texto. Se pinta subrayada, de otro color y clicable: abre una píldora con la explicación.
`import { Term } from '../ui/Glossary.jsx'` → `<Term id="regolith">regolito</Term>` (la píldora la pinta `GlossaryProvider`).
Formato de `client/src/content/glossary.js`: `GLOSSARY[id] = { emoji, es: { term, def }, en: { term, def }, source?: { label, url } }`.

### Minijuegos de mantenimiento (`client/src/minigames/`)
`export default function PanelCleaning({ seed, reducedMotion, onSuccess, onCancel })`, igual `CableRepair` y `AntennaCalibration`.
Pintan solo el contenido: el marco (título, coste, cerrar) lo pone `ui/TaskModal.jsx`. Llaman a `onSuccess()` al terminar. Sin temporizador que castigue.

### Rover (`client/src/rover/RoverRun.jsx`)
`<RoverRun zone={1|2|3} roverLevel={1..3} seed="LUNA-4821" reducedMotion onFinish={(r) => …} onCancel={…} />`
`r = { completed, emergency, aborted, collected: { ice, metal, samples }, collisions, batteryLeft, progress }`; `samples` es de la zona jugada.

### Audio
`import { sfx } from '../audio/sfx.js'` → `sfx.play('click' | 'ok' | 'error' | 'jump' | 'collect' | 'hit' | 'alarm' | 'night' | 'day' | 'win' | 'spark' | 'signal')`.

## 5. Estilo visual

Ciencia ficción limpia: colores vivos sobre fondos espaciales oscuros, tipografías **Fredoka** (títulos y botones) y **Nunito** (texto), alojadas en el proyecto. Botones grandes con relieve (sombra inferior que se hunde al pulsar). Variables en `client/src/styles/tokens.css`; botones en `buttons.css` (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-warn`, `.btn-danger`, `.btn-ghost`, `.btn-lg`, `.btn-sm`). Etiquetas de datos: `.tag .tag-live`, `.tag-archive`, `.tag-sim`, `.tag-calc`.
Prefijos de clases para no chocar: `mg-` (minijuegos), `rover-` (Rover), `ui-`/nombres de pantalla (interfaz).
Respetar `prefers-reduced-motion` y la prop `reducedMotion`.

## 6. Didáctica mientras se juega

- **Descubrimientos:** la primera vez que aparece algo (primer hielo, primera llamarada X, primera tormenta…) sale una tarjeta corta que se guarda en el **Cuaderno de descubrimientos** (persiste entre partidas). IDs en `client/src/content/discoveries.js`.
- **Glosario clicable** en todos los textos con `[[id]]`.
- **Informe de cada noche:** qué pasó y por qué (causas), el dato real del día (CRaTER, la Estación, DONKI) con su etiqueta y su enlace.
- **Informe final "¿Por qué pasó?"**: la decisión que más pesó, el evento más fuerte y el resultado, con datos reales; volver a jugar con la misma semilla para cambiar una decisión.
