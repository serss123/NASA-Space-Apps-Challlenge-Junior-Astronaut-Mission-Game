// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Texts of the "Datos y fuentes" / "Data and sources" page (ui/screens/DataPage.jsx): where every piece of data comes
// from, how it becomes gameplay, what we simplified, credits and licences, and what every data label means.
// Kid language (docs/DESIGN.md §4). The { es, en } texts accept [[glossary]] pills and **bold** (ui/components/RichText.jsx).
// `name` and `provider` stay as the official names (they work as credits). Every link was already checked.

const DONKI_WEB = 'https://ccmc.gsfc.nasa.gov/tools/DONKI/';
const DONKI_API = 'https://ccmc.gsfc.nasa.gov/DONKI-API/';
const RADLAB = 'https://visualization.osdr.nasa.gov/radlab/gui/';
const PHOTO = 'https://images.nasa.gov/details/PIA13523';

/** Shown on the data page and next to the credits (docs/DESIGN.md §2: no NASA branding, not an official product). */
export const DISCLAIMER = {
  es: 'Este juego no es un producto oficial de la NASA. Usa datos públicos de la NASA.',
  en: 'This game is not an official NASA product. It uses public NASA data.'
};

/** Data sources: { id, name, provider, what, how, label, url, credit }. `what` and `how` are 1–2 short sentences. */
export const SOURCES = [
  {
    id: 'donki-archive',
    name: 'DONKI · Space Weather Database Of Notifications, Knowledge, Information',
    provider: 'NASA · Community Coordinated Modeling Center (CCMC), Goddard Space Flight Center',
    what: {
      es: 'La lista de la NASA con todo lo que hace el Sol: [[flare|llamaradas]], [[cme|nubes de plasma]], lluvias de partículas y tormentas magnéticas.',
      en: 'NASA’s list of everything the Sun does: [[flare|flares]], [[cme|plasma clouds]], particle showers and magnetic storms.'
    },
    how: {
      es: '**Misión de 2024:** cada día del juego es un día real de esa lista, guardado de antes.',
      en: '**2024 mission:** every game day is a real day from that list, saved from before.'
    },
    label: 'ARCHIVO',
    url: DONKI_WEB,
    credit: 'NASA CCMC'
  },
  {
    id: 'donki-live',
    name: 'DONKI API',
    provider: 'NASA · Community Coordinated Modeling Center (CCMC), Goddard Space Flight Center',
    what: {
      es: 'La misma lista de [[donki|DONKI]], pero descargada mientras juegas. No necesita claves ni datos personales.',
      en: 'The same [[donki|DONKI]] list, but downloaded while you play. It needs no keys and no personal data.'
    },
    how: {
      es: '**Misión El Sol de hoy:** usamos los últimos 21 días. Si la NASA no contesta, juegas con los datos guardados de 2024.',
      en: '**Today’s Sun mission:** we use the last 21 days. If NASA does not answer, you play with the saved 2024 data.'
    },
    label: 'EN VIVO',
    url: DONKI_API,
    credit: 'NASA CCMC'
  },
  {
    id: 'radlab',
    name: 'RadLab · Radiation Dosimetry Database',
    provider: 'NASA · Open Science Data Repository (OSDR)',
    what: {
      es: 'La [[radiation|radiación]] medida por detectores reales: cerca de la Luna, en la [[iss|Estación Espacial]], en Marte y lejos en el espacio.',
      en: '[[radiation|Radiation]] measured by real detectors: near the Moon, on the [[iss|Space Station]], on Mars and far out in space.'
    },
    how: {
      es: 'Comparamos cada día con un día normal. Lo que midió el detector de la Luna decide la tormenta de cada noche.',
      en: 'We compare every day with a normal day. What the Moon detector measured decides each night’s storm.'
    },
    label: 'ARCHIVO',
    url: RADLAB,
    credit: 'NASA OSDR'
  },
  {
    id: 'may-2024-stories',
    name: 'NASA stories about the May 2024 solar storm',
    provider: 'NASA Science · Heliophysics',
    what: {
      es: 'Artículos de la NASA que cuentan la gran tormenta: las llamaradas, las [[aurora|auroras]] y lo que midieron sus naves.',
      en: 'NASA articles that tell the story of the great storm: the flares, the [[aurora|auroras]] and what its spacecraft measured.'
    },
    how: {
      es: 'De ahí salen muchos datos curiosos y tarjetas del Diario, siempre con su enlace.',
      en: 'Many fun facts and Journal cards come from them, always with their link.'
    },
    label: 'NASA',
    url: 'https://science.nasa.gov/science-research/heliophysics/how-nasa-tracked-the-most-intense-solar-storm-in-decades/',
    credit: 'NASA'
  },
  {
    id: 'osd-476',
    name: 'OSD-476 · plants grown in Apollo lunar soil',
    provider: 'NASA · Open Science Data Repository (OSDR)',
    what: {
      es: 'Un experimento de 2022: plantaron semillas en [[regolith|tierra de la Luna]] traída por el Apolo. Brotaron, pero crecieron despacio.',
      en: 'A 2022 experiment: seeds were planted in [[regolith|Moon soil]] brought back by Apollo. They sprouted, but grew slowly.'
    },
    how: {
      es: 'Inspira la granja: cultivar cuesta Fuerzas, hielo y energía, y la comida tarda en llegar.',
      en: 'It inspires the farm: growing food costs Stamina, ice and energy, and the food takes time to arrive.'
    },
    label: 'NASA',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-476',
    credit: 'NASA OSDR'
  },
  {
    id: 'pia13523',
    name: 'The Lunar South Pole (PIA13523)',
    provider: 'NASA · Lunar Reconnaissance Orbiter Camera (LROC)',
    what: {
      es: 'Una foto real del [[south-pole|polo sur]] de la Luna, hecha juntando muchas imágenes de una [[lro|nave de la NASA]].',
      en: 'A real photo of the Moon’s [[south-pole|south pole]], made by joining many pictures from a [[lro|NASA spacecraft]].'
    },
    how: {
      es: 'Sale en el menú y en esta página. Las zonas del Rover llevan nombres de lugares reales del polo sur.',
      en: 'It appears on the menu and on this page. The Rover zones are named after real places at the south pole.'
    },
    label: 'NASA',
    url: PHOTO,
    credit: 'NASA/GSFC/Arizona State University'
  },
  {
    id: 'csa-food',
    name: 'Food production on the Moon and in remote areas (toolkit)',
    provider: 'Canadian Space Agency (CSA)',
    what: {
      es: 'Materiales para clase sobre cómo cultivar comida en lugares cerrados, como una base en la Luna.',
      en: 'Classroom materials about growing food in closed places, like a base on the Moon.'
    },
    how: {
      es: 'Nos ayudaron a diseñar la granja del juego y algunos datos curiosos.',
      en: 'They helped us design the game’s farm and some fun facts.'
    },
    label: 'DISEÑO',
    url: 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/',
    credit: { es: 'Crédito: Agencia Espacial Canadiense', en: 'Credit: Canadian Space Agency' }
  },
  {
    id: 'jpl-approx-positions',
    name: 'Approximate Positions of the Planets',
    provider: 'NASA · JPL Solar System Dynamics',
    what: {
      es: 'Fórmulas oficiales para saber dónde está cada planeta en cualquier fecha.',
      en: 'Official formulas to know where each planet is on any date.'
    },
    how: {
      es: 'Con ellas, tu navegador calcula cuánto tarda un [[signal-delay|mensaje]] en llegar a Marte: de 3 a 22 minutos.',
      en: 'With them, your browser works out how long a [[signal-delay|message]] takes to reach Mars: 3 to 22 minutes.'
    },
    label: 'CALCULADO',
    url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
    credit: 'NASA JPL'
  },
  {
    id: 'nasa-std-3001',
    name: 'NASA-STD-3001 · Radiation protection technical brief',
    provider: 'NASA · Office of the Chief Health and Medical Officer (OCHMO)',
    what: {
      es: 'Las normas de la NASA para cuidar a los astronautas de la [[radiation|radiación]]. Dicen que el agua y las paredes gruesas protegen.',
      en: 'NASA’s rules to keep astronauts safe from [[radiation|radiation]]. They say that water and thick walls protect you.'
    },
    how: {
      es: 'Explican por qué el [[shield|escudo]] te protege de las tormentas solares. En el juego, una noche de tormenta sin escudo cuesta un corazón.',
      en: 'They explain why the [[shield|shield]] protects you from solar storms. In the game, a storm night without a shield costs a heart.'
    },
    label: 'NASA',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf',
    credit: 'NASA OCHMO'
  },
  {
    id: 'bvad',
    name: 'Life Support Baseline Values and Assumptions Document (BVAD, 2022)',
    provider: 'NASA · Technical Reports Server (NTRS)',
    what: {
      es: 'Cuánto necesita un astronauta cada día: casi 1 kilo de [[oxygen|oxígeno]], unos 3 litros de agua y más de kilo y medio de comida.',
      en: 'What one astronaut needs every day: almost 1 kilogram of [[oxygen|oxygen]], about 3 litres of water and over one and a half kilograms of food.'
    },
    how: {
      es: 'Inspira la cena de cada noche, el [[life-support|Soporte Vital]] y la granja. Las raciones del juego son diseño nuestro.',
      en: 'It inspires each night’s dinner, [[life-support|Life Support]] and the farm. The game’s rations are our own design.'
    },
    label: 'NASA',
    url: 'https://ntrs.nasa.gov/citations/20210024855',
    credit: 'NASA'
  }
];

/** "Cómo lo hemos simplificado" / "How we simplified it": what we simplified and why, one sentence each. */
export const SIMPLIFICATIONS = [
  {
    es: '**Un turno es un día real:** la misión de 2024 va del 1 al 21 de mayo y la de hoy usa los últimos 21 días.',
    en: '**One turn is one real day:** the 2024 mission runs from 1 to 21 May, and today’s mission uses the last 21 days.'
  },
  {
    es: 'La radiación de cada noche se resume en **4 niveles**, de Calma a Supertormenta, para que se entienda de un vistazo.',
    en: 'Each night’s radiation is summed up in **4 levels**, from Calm to Super storm, so you can read it at a glance.'
  },
  {
    es: '“Un día normal” es la media del 1 al 7 de mayo de 2024, antes de la gran tormenta, para poder comparar.',
    en: '“A normal day” is the average of 1–7 May 2024, before the great storm, so that we can compare.'
  },
  {
    es: 'El detector que usamos da vueltas a la Luna en lugar de estar en el suelo, porque es la mejor medida diaria que hay.',
    en: 'The detector we use circles the Moon instead of sitting on the ground, because it is the best daily measurement there is.'
  },
  {
    es: 'En la misión de hoy no hay medidas de radiación recientes, así que el juego la calcula con los avisos de la NASA.',
    en: 'Today’s mission has no recent radiation measurements, so the game works it out from NASA’s alerts.'
  },
  {
    es: 'Para jugar más fácil, el aire, el agua y el calor van juntos en el [[life-support|Soporte Vital]], y la comida va aparte, en la granja.',
    en: 'To make the game easier, air, water and warmth go together in [[life-support|Life Support]], and food goes apart, in the farm.'
  },
  {
    es: 'Los **corazones** resumen tu salud; en la realidad se mide la [[dose|dosis]] de radiación y hay límites.',
    en: '**Hearts** sum up your health; in real life the radiation [[dose|dose]] is measured and there are limits.'
  },
  {
    es: 'El [[shield|escudo]] del juego gasta energía para que decidas cada noche; los refugios de verdad usan paredes gruesas, agua o [[regolith|regolito]].',
    en: 'The game’s [[shield|shield]] uses energy so that you decide every night; real shelters use thick walls, water or [[regolith|regolith]].'
  },
  {
    es: 'Las **averías** son probabilidades SIMULADAS, pero siempre las provoca algo que pasó de verdad ese día en el Sol.',
    en: '**Breakdowns** are SIMULATED chances, but something that really happened on the Sun that day always triggers them.'
  },
  {
    es: 'Los costes, las cosechas, las mejoras, las misiones y los circuitos del [[rover|Rover]] son **diseño nuestro**, no datos de la NASA.',
    en: 'Costs, harvests, upgrades, missions and [[rover|Rover]] tracks are **our own design**, not NASA data.'
  },
  {
    es: 'La [[antenna|antena]] te enseña lo que pasó de verdad en los días siguientes, aunque las previsiones reales a veces fallan.',
    en: 'The [[antenna|antenna]] shows you what really happened on the next days, even though real forecasts sometimes fail.'
  },
  {
    es: 'La “noche” es tu hora de dormir, porque en el [[south-pole|polo sur]] el Sol casi nunca se pone.',
    en: '“Night” is your bedtime, because at the [[south-pole|south pole]] the Sun hardly ever sets.'
  },
  {
    es: 'En la base vive una sola persona para que el juego sea sencillo; en las misiones reales viaja un equipo.',
    en: 'Only one person lives at the base to keep the game simple; real missions fly a whole crew.'
  },
  {
    es: 'Las misiones “se envían a la Tierra” por la antena; en la realidad, las muestras viajarían en una nave.',
    en: 'Missions are “sent to Earth” through the antenna; in real life, the samples would travel on a spacecraft.'
  },
  {
    es: 'El Rover salta rocas como en un videojuego; los rovers de verdad van despacio y rodean los obstáculos.',
    en: 'The Rover jumps over rocks like in a video game; real rovers drive slowly and go around obstacles.'
  },
  {
    es: 'El [[signal-delay|retraso de la señal]] hasta la Luna, algo más de 1 segundo, es real; el de Marte se calcula con fórmulas oficiales.',
    en: 'The [[signal-delay|signal delay]] to the Moon, just over 1 second, is real; the one to Mars is worked out with official formulas.'
  },
  {
    es: 'Redondeamos los números para que se lean fácil: por ejemplo, 301,6 veces lo normal se convierte en 300.',
    en: 'We round numbers so they are easy to read: for example, 301.6 times normal becomes 300.'
  }
];

/** Credits and licences: { what, license, url? } (what and license may be plain text or { es, en }). */
export const CREDITS = [
  {
    what: {
      es: 'Código, dibujos y sonidos creados con ayuda de IA (Claude, de Anthropic) y revisados por el equipo',
      en: 'Code, drawings and sounds made with AI help (Claude by Anthropic) and reviewed by the team'
    },
    license: { es: 'Uso de la IA explicado en AI_USE.md · Apache-2.0', en: 'Use of AI explained in AI_USE.md · Apache-2.0' }
  },
  {
    what: { es: 'Tipografía Fredoka (paquete @fontsource/fredoka)', en: 'Fredoka typeface (@fontsource/fredoka package)' },
    license: 'SIL Open Font License 1.1',
    url: 'https://fontsource.org/fonts/fredoka'
  },
  {
    what: { es: 'Tipografía Nunito (paquete @fontsource/nunito)', en: 'Nunito typeface (@fontsource/nunito package)' },
    license: 'SIL Open Font License 1.1',
    url: 'https://fontsource.org/fonts/nunito'
  },
  {
    what: { es: 'Foto “The Lunar South Pole” (PIA13523)', en: 'Photo “The Lunar South Pole” (PIA13523)' },
    license: { es: 'Foto real: NASA/GSFC/Arizona State University · uso según las normas de imágenes de la NASA', en: 'Real photo: NASA/GSFC/Arizona State University · used under NASA’s media guidelines' },
    url: PHOTO
  },
  {
    what: { es: 'Datos de DONKI y RadLab', en: 'DONKI and RadLab data' },
    license: { es: 'Datos abiertos y públicos de la NASA', en: 'Open, public NASA data' },
    url: DONKI_WEB
  },
  {
    what: { es: 'Sonidos', en: 'Sounds' },
    license: { es: 'Creados en tu navegador con la Web Audio API: no hay archivos de audio', en: 'Made in your browser with the Web Audio API: there are no audio files' },
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API'
  },
  {
    what: { es: 'Dibujos (astronauta, base, Rover y minijuegos)', en: 'Drawings (astronaut, base, Rover and minigames)' },
    license: { es: 'Dibujados con código (SVG, CSS y canvas) · Apache-2.0', en: 'Drawn with code (SVG, CSS and canvas) · Apache-2.0' }
  },
  { what: 'React', license: 'MIT', url: 'https://react.dev/' },
  { what: 'Vite', license: 'MIT', url: 'https://vite.dev/' },
  { what: '@vitejs/plugin-react', license: 'MIT', url: 'https://github.com/vitejs/vite-plugin-react' },
  { what: 'Express', license: 'MIT', url: 'https://expressjs.com/' },
  { what: 'cors', license: 'MIT', url: 'https://github.com/expressjs/cors' },
  { what: 'concurrently', license: 'MIT', url: 'https://github.com/open-cli-tools/concurrently' },
  {
    what: { es: 'Código de Sol a Sol', en: 'Sol a Sol source code' },
    license: 'Apache-2.0',
    url: 'https://www.apache.org/licenses/LICENSE-2.0'
  }
];

/** What every data label means (one sentence for kids). The keys are the DataTag kinds. */
export const LABELS = {
  'EN VIVO': {
    es: 'Dato real de la NASA, descargado ahora mismo mientras juegas.',
    en: 'Real NASA data, downloaded right now while you play.'
  },
  ARCHIVO: {
    es: 'Dato real guardado de antes, como los de mayo de 2024: pasó de verdad, pero no es de hoy.',
    en: 'Real data saved from before, like the May 2024 data: it really happened, but it is not from today.'
  },
  SIMULADO: {
    es: 'Lo decide el juego como si tirara un dado, por ejemplo si algo se rompe, aunque lo provoque algo real.',
    en: 'The game decides it as if rolling dice, for example whether something breaks, even when something real causes it.'
  },
  CALCULADO: {
    es: 'Lo calcula tu navegador con fórmulas oficiales, como lo que tarda un mensaje en llegar a Marte.',
    en: 'Your browser works it out with official formulas, like how long a message takes to reach Mars.'
  },
  DISEÑO: {
    es: 'Una regla o un número que hemos inventado para poder jugar: no es un dato de la NASA.',
    en: 'A rule or a number we made up so the game can be played: it is not NASA data.'
  },
  NASA: {
    es: 'Ciencia de la NASA, de sus webs o de sus misiones, con un enlace para que lo compruebes.',
    en: 'NASA science, from its websites or its missions, with a link so you can check it.'
  }
};
