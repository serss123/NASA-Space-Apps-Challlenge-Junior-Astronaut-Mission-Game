// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// "New discovery!" cards and the chapters of the Discovery Journal, the study guide of the mission
// (docs/DESIGN.md sections 4-6). A card unlocks the FIRST time something happens: the engine fires it
// (engine/reducer.js, discover()) or the UI dispatches { type: 'DISCOVER', id }. Every card below is fired
// somewhere and every fired id has a card: content.test.js checks both, plus every writing limit.
//
// TOPICS: the journal chapters, in display order.
//   { id, icon (an Icon.jsx name), title: { es, en }, about: { es, en } (optional one-line subtitle) }
// DISCOVERIES[id]:
//   emoji     one illustration sticker (content cards only, never UI chrome)
//   topic     a TOPICS id: the chapter the card lives in
//   tag       data label kind: NASA | ARCHIVO | EN VIVO | SIMULADO | CALCULADO | DISEÑO (ui/components/DataTag.jsx)
//   title     plain text, at most 5 words
//   happened  "Lo que pasó": 1 sentence, at most 14 words, what just happened in YOUR mission (the toast text)
//   learn     "Lo que aprendiste": 1-2 sentences of at most 14 words, real science at kid level, at most 3 pills
//   remember  "Recuerda": plain text, at most 10 words
//   hint      plain text for locked cards, at most 10 words (the screen adds the "Pista:" / "Hint:" label)
//   words     0-3 glossary ids the card teaches; each one appears as a pill in `happened` or `learn`
//   source    optional { label, url } for grown-ups ("Para mayores")
// Mark-up in happened/learn (ui/components/RichText.jsx): [[id]] or [[id|visible text]] for glossary pills, **bold**.
// Figures come from the game's real data (DONKI + RadLab, docs/DATA.md) or from the linked source. Game-rule
// numbers appear only when a kid needs them to play: the HUD already shows the exact amounts.

const RADLAB = { label: 'NASA OSDR · RadLab', url: 'https://visualization.osdr.nasa.gov/radlab/gui/' };
const RADIATION_BRIEF = {
  label: 'NASA-STD-3001 · Radiation protection technical brief',
  url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf'
};
const SOLAR_STORMS = { label: 'NASA · Solar storms and flares', url: 'https://science.nasa.gov/sun/solar-storms-and-flares/' };

/** Journal chapters, in display order. */
export const TOPICS = [
  {
    id: 'energy',
    icon: 'bolt',
    title: { es: 'Energía', en: 'Energy' },
    about: { es: 'Paneles solares, baterías y cómo repartir la energía.', en: 'Solar panels, batteries and sharing out energy.' }
  },
  {
    id: 'radiation',
    icon: 'shield',
    title: { es: 'Radiación y escudo', en: 'Radiation and shield' },
    about: { es: 'Qué es la radiación y cómo protegerte.', en: 'What radiation is and how to stay safe.' }
  },
  {
    id: 'life',
    icon: 'heart',
    title: { es: 'Vida en la base', en: 'Life at the base' },
    about: { es: 'Aire, agua, comida y salud.', en: 'Air, water, food and health.' }
  },
  {
    id: 'comms',
    icon: 'antenna',
    title: { es: 'Comunicación', en: 'Communication' },
    about: { es: 'La antena, las señales y la ayuda de la Tierra.', en: 'The antenna, signals and help from Earth.' }
  },
  {
    id: 'sun',
    icon: 'sun',
    title: { es: 'El Sol y el clima espacial', en: 'The Sun and space weather' },
    about: { es: 'Llamaradas, nubes de plasma y tormentas.', en: 'Flares, plasma clouds and storms.' }
  },
  {
    id: 'moon',
    icon: 'moon',
    title: { es: 'La Luna y la exploración', en: 'The Moon and exploration' },
    about: { es: 'Rover, rocas, hielo y naves de la NASA.', en: 'Rover, rocks, ice and NASA spacecraft.' }
  }
];

export const DISCOVERIES = {
  // ---------- Energy ----------
  'base-energy': {
    emoji: '⚡',
    topic: 'energy',
    tag: 'DISEÑO',
    title: { es: 'Energía para repartir', en: 'Energy to share out' },
    happened: {
      es: 'Tus [[solar-panel|paneles solares]] te dan energía cada mañana.',
      en: 'Your [[solar-panel|solar panels]] give you energy every morning.'
    },
    learn: {
      es: 'Los paneles convierten la luz del Sol en energía eléctrica. Repártela entre la antena, la granja y el escudo.',
      en: 'Panels turn sunlight into electric energy. Share it out between the antenna, the farm and the shield.'
    },
    remember: { es: 'La energía es poca: elige bien.', en: 'Energy is limited: choose well.' },
    hint: { es: 'Abre el Soporte Vital y reparte la energía.', en: 'Open Life Support and share out the energy.' },
    words: ['solar-panel']
  },
  'base-battery': {
    emoji: '🔋',
    topic: 'energy',
    tag: 'DISEÑO',
    title: { es: 'Energía para mañana', en: 'Energy for tomorrow' },
    happened: {
      es: 'La energía que te sobró se ha guardado en la [[battery|batería]].',
      en: 'The energy you did not use is now saved in the [[battery]].'
    },
    learn: {
      es: 'Una batería guarda energía para usarla cuando no hay luz. En casi toda la Luna, la noche dura unos 15 días de la Tierra.',
      en: 'A battery stores energy to use when there is no light. On most of the Moon, night lasts about 15 Earth days.'
    },
    remember: { es: 'La batería guarda energía para después.', en: 'A battery saves energy for later.' },
    hint: { es: 'Duerme sin gastar toda la energía del día.', en: 'Go to sleep with some energy left over.' },
    words: ['battery'],
    source: { label: 'NASA · Moon phases', url: 'https://science.nasa.gov/moon/moon-phases/' }
  },
  'dirty-panels': {
    emoji: '🧹',
    topic: 'energy',
    tag: 'SIMULADO',
    title: { es: 'Paneles llenos de polvo', en: 'Dusty solar panels' },
    happened: {
      es: 'El [[regolith|polvo lunar]] ha tapado tus paneles: tendrás menos energía.',
      en: '[[regolith|Moon dust]] has covered your panels: you will get less energy.'
    },
    learn: {
      es: 'El polvo lunar es afilado y se pega por [[static-electricity|electricidad estática]]. En las misiones Apolo lo ensuciaba todo.',
      en: 'Moon dust is sharp and sticks because of [[static-electricity]]. On the Apollo missions it got everywhere.'
    },
    remember: { es: 'Limpia los paneles para recuperar tu energía.', en: 'Clean the panels to get your energy back.' },
    hint: { es: 'Sal con el Rover: levanta mucho polvo.', en: 'Drive the Rover out: it kicks up dust.' },
    words: ['regolith', 'static-electricity'],
    source: { label: 'NASA · What hazards are caused by lunar regolith?', url: 'https://science.nasa.gov/biological-physical/what-hazards-are-caused-by-lunar-regolith/' }
  },
  'short-circuit': {
    emoji: '🔌',
    topic: 'energy',
    tag: 'SIMULADO',
    title: { es: '¡Chispas en los cables!', en: 'Sparks in the cables!' },
    happened: {
      es: 'Un [[short-circuit|cortocircuito]] no te deja cargar el escudo.',
      en: 'A [[short-circuit]] stops you charging the shield.'
    },
    learn: {
      es: 'Pasa cuando la electricidad se escapa por donde no debe. Las [[solar-storm|tormentas solares]] pueden estropear aparatos así.',
      en: 'It happens when electricity escapes where it should not. [[solar-storm|Solar storms]] can damage machines like this.'
    },
    remember: { es: 'Repara los cables antes de la próxima tormenta.', en: 'Fix the cables before the next storm.' },
    hint: { es: 'Vive un día con una llamarada muy fuerte.', en: 'Live through a day with a huge flare.' },
    words: ['short-circuit', 'solar-storm'],
    source: SOLAR_STORMS
  },
  'rover-battery': {
    emoji: '🔋',
    topic: 'energy',
    tag: 'DISEÑO',
    title: { es: 'Guarda batería para volver', en: 'Save battery to get back' },
    happened: {
      es: 'Tus viajes con el [[rover|Rover]] gastan mucha [[battery|batería]].',
      en: 'Your [[rover|Rover]] trips use up a lot of [[battery]].'
    },
    learn: {
      es: 'Cada choque gasta más, y sin batería pierdes la mitad de lo recogido. El rover de [[artemis|Artemis]] podrá recorrer hasta 10 km con una carga.',
      en: 'Each crash uses more; run out and you lose half of what you found. The [[artemis|Artemis]] rover will drive up to 10 km on one charge.'
    },
    remember: { es: 'Conduce sin chocar y guarda batería para volver.', en: 'Drive carefully and keep battery to get back.' },
    hint: { es: 'Sal dos veces con el Rover.', en: 'Take the Rover out twice.' },
    words: ['rover', 'battery'],
    source: { label: 'NASA · Progress update on Moon Base rovers', url: 'https://www.nasa.gov/missions/moon-base/nasa-provides-progress-update-on-moon-base-rovers/' }
  },

  // ---------- Radiation and shield ----------
  'radiation-storm': {
    emoji: '☢️',
    topic: 'radiation',
    tag: 'DISEÑO',
    title: { es: 'Tormenta de radiación', en: 'Radiation storm' },
    happened: {
      es: 'Esta noche ha llegado una tormenta de [[radiation|radiación]] a tu base.',
      en: 'Last night, a [[radiation]] storm reached your base.'
    },
    learn: {
      es: 'El [[storm-level|nivel de tormenta]] viene de datos reales de la NASA. Si la carga del [[shield|escudo]] llega a ese nivel, estás a salvo.',
      en: 'The [[storm-level|storm level]] comes from real NASA data. If the [[shield]] charge reaches that level, you are safe.'
    },
    remember: { es: 'Carga el escudo hasta el nivel de la tormenta.', en: 'Charge the shield up to the storm level.' },
    hint: { es: 'Duerme una noche con tormenta solar.', en: 'Sleep through a night with a solar storm.' },
    words: ['radiation', 'storm-level', 'shield'],
    source: RADLAB
  },
  shield: {
    emoji: '🛡️',
    topic: 'radiation',
    tag: 'NASA',
    title: { es: '¡Escudo cargado!', en: 'Shield charged!' },
    happened: {
      es: 'Has cargado el [[shield|escudo]] con energía para esta noche.',
      en: 'You charged the [[shield]] with energy for tonight.'
    },
    learn: {
      es: 'Las paredes de aluminio reducen a la mitad la [[dose|dosis]] de una tormenta solar. El agua también protege mucho: con ella se refuerzan los refugios.',
      en: 'Aluminium walls cut the [[dose]] from a solar storm in half. Water protects well too: it is used to reinforce shelters.'
    },
    remember: { es: 'Cargar el escudo cuesta energía, pero te protege.', en: 'Charging the shield costs energy, but it keeps you safe.' },
    hint: { es: 'Pon energía en el escudo.', en: 'Put some energy into the shield.' },
    words: ['shield', 'dose'],
    source: RADIATION_BRIEF
  },
  'crater-detector': {
    emoji: '📟',
    topic: 'radiation',
    tag: 'ARCHIVO',
    title: { es: '¿Quién mide la radiación?', en: 'Who measures the radiation?' },
    happened: {
      es: '¡Cerca de la Luna ha habido más de 30 veces la radiación normal!',
      en: 'Near the Moon, radiation went over 30 times normal!'
    },
    learn: {
      es: 'La nave [[lro]] está en [[orbit|órbita]] alrededor de la Luna y mide la radiación. Sus medidas de 2024 deciden el nivel de cada noche.',
      en: 'The [[lro]] spacecraft is in [[orbit]] around the Moon and measures radiation. Its 2024 measurements set the level of each night.'
    },
    remember: { es: 'LRO mide la radiación cerca de la Luna.', en: 'LRO measures the radiation near the Moon.' },
    hint: { es: 'Vive una tormenta fuerte en «La gran tormenta de 2024».', en: 'Survive a strong storm in “The great storm of 2024”.' },
    words: ['lro', 'orbit'],
    source: RADLAB
  },
  'iss-vs-moon': {
    emoji: '🛰️',
    topic: 'radiation',
    tag: 'ARCHIVO',
    title: { es: 'Mismo Sol, distinto escudo', en: 'Same Sun, different shield' },
    happened: {
      es: 'Cerca de la Luna ha habido mucha radiación; en la [[iss|Estación Espacial]], lo normal.',
      en: 'Near the Moon there was lots of radiation; on the [[iss|Space Station]], just normal.'
    },
    learn: {
      es: 'La Estación vuela dentro del [[magnetosphere|escudo magnético de la Tierra]]. La Luna pasa casi todo el mes fuera de él.',
      en: 'The Station flies inside [[magnetosphere|Earth’s magnetic shield]]. The Moon spends most of the month outside it.'
    },
    remember: { es: 'En la Luna necesitas tu propio escudo.', en: 'On the Moon you need your own shield.' },
    hint: { es: 'Duerme una noche de tormenta fuerte en 2024.', en: 'Sleep through a strong storm night in 2024.' },
    words: ['iss', 'magnetosphere'],
    source: RADLAB
  },
  'outside-storm': {
    emoji: '🚙',
    topic: 'radiation',
    tag: 'DISEÑO',
    title: { es: 'Fuera, sin escudo', en: 'Outside, with no shield' },
    happened: {
      es: 'Has salido con el Rover en un día de tormenta fuerte: pierdes un corazón.',
      en: 'You took the Rover out on a strong-storm day: you lose a heart.'
    },
    learn: {
      es: 'El [[shield|escudo]] protege la base, pero no tu [[spacesuit|traje espacial]]. Si avisan de tormenta, los astronautas se refugian en la zona más protegida.',
      en: 'The [[shield]] protects the base, but not your [[spacesuit]]. When a storm is coming, astronauts shelter in the safest spot.'
    },
    remember: { es: 'Con tormenta fuerte, quédate en la base.', en: 'In a strong storm, stay inside the base.' },
    hint: { es: 'Pasa cuando sales con el Rover en una tormenta fuerte.', en: 'It happens if you drive out during a strong storm.' },
    words: ['shield', 'spacesuit'],
    source: RADIATION_BRIEF
  },

  // ---------- Life at the base ----------
  'golden-rule': {
    emoji: '👑',
    topic: 'life',
    tag: 'DISEÑO',
    title: { es: 'La regla de oro', en: 'The golden rule' },
    happened: { es: '¡Has mejorado tu primer edificio!', en: 'You upgraded your first building!' },
    learn: {
      es: 'Ningún edificio puede tener más nivel que el [[life-support|Soporte Vital]]. En una base real pasa igual: sin aire, agua ni energía, nada funciona.',
      en: 'No building can have a higher level than [[life-support]]. A real base is the same: without air, water or energy, nothing works.'
    },
    remember: { es: 'Mejora primero el Soporte Vital.', en: 'Upgrade Life Support first.' },
    hint: { es: 'Mejora un edificio con metal y hielo.', en: 'Upgrade a building with metal and ice.' },
    words: ['life-support'],
    source: { label: 'NASA · Environmental Control and Life Support System (ECLSS)', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/' }
  },
  stamina: {
    emoji: '💪',
    topic: 'life',
    tag: 'DISEÑO',
    title: { es: 'Tus Fuerzas', en: 'Your Stamina' },
    happened: { es: 'Has gastado Fuerzas en tu primera tarea.', en: 'You used Stamina on your first task.' },
    learn: {
      es: 'Cada tarea gasta Fuerzas, y cuando se acaban llega la noche. En la Estación Espacial, [[mission-control|Control de Misión]] planea el día de cada astronauta.',
      en: 'Every task uses Stamina, and when it runs out, night falls. On the Space Station, [[mission-control]] plans each astronaut’s day.'
    },
    remember: { es: 'Cena y duerme para recuperar tus Fuerzas.', en: 'Eat dinner and sleep to get your Stamina back.' },
    hint: { es: 'Haz cualquier tarea en la base.', en: 'Do any task at the base.' },
    words: ['mission-control']
  },
  greenhouse: {
    emoji: '🌱',
    topic: 'life',
    tag: 'NASA',
    title: { es: 'Plantar en la Luna', en: 'Planting on the Moon' },
    happened: { es: 'Has plantado tu primera semilla en la granja.', en: 'You planted your first seed in the farm.' },
    learn: {
      es: 'Tu granja es un [[greenhouse|invernadero]]: dale energía dos días y cosecharás. En 2022 brotaron semillas en [[regolith|suelo lunar]] traído por el Apolo, pero crecieron despacio.',
      en: 'Your farm is a [[greenhouse]]: power it for two days to harvest. In 2022, seeds sprouted in [[regolith|Moon soil]] brought back by Apollo, but grew slowly.'
    },
    remember: { es: 'Planta pronto: la comida tarda dos días.', en: 'Plant early: food takes two days to grow.' },
    hint: { es: 'Planta una semilla en la granja.', en: 'Plant a seed in the farm.' },
    words: ['greenhouse', 'regolith'],
    source: { label: 'NASA · Scientists grow plants in lunar soil', url: 'https://www.nasa.gov/humans-in-space/scientists-grow-plants-in-lunar-soil/' }
  },
  harvest: {
    emoji: '🧺',
    topic: 'life',
    tag: 'NASA',
    title: { es: '¡Primera cosecha!', en: 'First harvest!' },
    happened: { es: '¡Tu granja ha dado su primera cosecha de comida!', en: 'Your farm gave its first harvest of food!' },
    learn: {
      es: 'Las plantas dan comida y [[oxygen|oxígeno]], y ayudan a reciclar el agua. En la [[iss|Estación Espacial]] ya han crecido lechugas y hasta flores.',
      en: 'Plants give food and [[oxygen]], and help recycle water. Lettuce and even flowers have grown on the [[iss|Space Station]].'
    },
    remember: { es: 'Plantar hoy te da comida mañana.', en: 'Planting today means food tomorrow.' },
    hint: { es: 'Planta y da energía a la granja dos días.', en: 'Plant, then power the farm for two days.' },
    words: ['oxygen', 'iss'],
    source: { label: 'NASA · Growing plants in space', url: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/' }
  },
  hunger: {
    emoji: '🍽️',
    topic: 'life',
    tag: 'NASA',
    title: { es: 'Una noche sin cena', en: 'A night with no dinner' },
    happened: {
      es: 'No había comida para cenar: pierdes un corazón y no recuperas Fuerzas.',
      en: 'No food for dinner: you lose a heart and your Stamina does not refill.'
    },
    learn: {
      es: 'Un astronauta come más de kilo y medio de comida al día. Además, necesita el doble de agua para beber y cocinar.',
      en: 'Each astronaut eats over one and a half kilos of food a day. They also need twice as much water for drinking and cooking.'
    },
    remember: { es: 'Planta a tiempo para no quedarte sin cena.', en: 'Plant in time so you never miss dinner.' },
    hint: { es: 'Pasa si te quedas sin comida para cenar.', en: 'It happens if you run out of food.' },
    words: [],
    source: { label: 'NASA · Life Support Baseline Values and Assumptions Document (2022)', url: 'https://ntrs.nasa.gov/citations/20210024855' }
  },
  overexertion: {
    emoji: '😵',
    topic: 'life',
    tag: 'NASA',
    title: { es: 'Demasiado esfuerzo', en: 'Too much effort' },
    happened: {
      es: 'Has acabado el día con las Fuerzas bajo cero: pierdes un corazón.',
      en: 'You ended the day with Stamina below zero: you lose a heart.'
    },
    learn: {
      es: 'Los astronautas planean su esfuerzo: trabajo, ejercicio y descanso. En [[microgravity|microgravedad]] los huesos se debilitan, por eso hacen ejercicio a diario.',
      en: 'Astronauts plan their effort: work, exercise and rest. In [[microgravity]] bones get weaker, so they exercise every day.'
    },
    remember: { es: 'No gastes más Fuerzas de las que tienes.', en: 'Do not use more Stamina than you have.' },
    hint: { es: 'Pasa si gastas más Fuerzas de las que tienes.', en: 'It happens if you use more Stamina than you have.' },
    words: ['microgravity'],
    source: { label: 'NASA · The human body in space', url: 'https://www.nasa.gov/humans-in-space/the-human-body-in-space/' }
  },
  recovery: {
    emoji: '💖',
    topic: 'life',
    tag: 'DISEÑO',
    title: { es: '¡Recuperas un corazón!', en: 'You got a heart back!' },
    happened: {
      es: 'Dos noches seguidas sin problemas te han devuelto un corazón.',
      en: 'Two trouble-free nights in a row gave you back a heart.'
    },
    learn: {
      es: 'Los corazones resumen tu salud. Los médicos de la NASA vigilan el sueño, la comida y la [[radiation|radiación]].',
      en: 'Hearts sum up your health. NASA doctors keep an eye on sleep, food and [[radiation]].'
    },
    remember: { es: 'Descansa, cena y protégete: así recuperas salud.', en: 'Rest, eat and stay safe to heal.' },
    hint: { es: 'Tras perder un corazón, pasa dos noches sin problemas.', en: 'After losing a heart, have two trouble-free nights.' },
    words: [],
    source: { label: 'NASA · Human Research Program', url: 'https://www.nasa.gov/hrp/' }
  },
  evacuation: {
    emoji: '🚀',
    topic: 'life',
    tag: 'DISEÑO',
    title: { es: '¡Rescate! Todos a salvo', en: 'Rescue! Everyone is safe' },
    happened: {
      es: 'Sin corazones, toca la [[evacuation|evacuación]]: una nave te lleva a casa.',
      en: 'With no hearts left, it is time for [[evacuation]]: a ship takes you home.'
    },
    learn: {
      es: 'En el espacio, volver a tiempo es de valientes: la seguridad va primero. Mira el informe y prueba otra estrategia.',
      en: 'In space, coming back in time is brave: safety comes first. Read the report and try a new plan.'
    },
    remember: { es: 'La seguridad va primero.', en: 'Safety comes first.' },
    hint: { es: 'Pasa si te quedas sin corazones.', en: 'It happens if you run out of hearts.' },
    words: ['evacuation']
  },

  // ---------- Communication ----------
  'signal-delay': {
    emoji: '⏱️',
    topic: 'comms',
    tag: 'CALCULADO',
    title: { es: '1,3 segundos hasta la Tierra', en: '1.3 seconds to Earth' },
    happened: {
      es: 'Tu señal ha llegado a la Tierra con unos 1,3 segundos de [[signal-delay|retraso]].',
      en: 'Your signal reached Earth with a [[signal-delay|delay]] of about 1.3 seconds.'
    },
    learn: {
      es: 'Las señales de radio viajan a la [[light-speed|velocidad de la luz]]. A [[mars|Marte]] tardarían entre 3 y 22 minutos.',
      en: 'Radio signals travel at the [[light-speed|speed of light]]. To [[mars|Mars]] they would take 3 to 22 minutes.'
    },
    remember: { es: 'Cuanto más lejos, más tarda la señal.', en: 'The farther away, the longer a signal takes.' },
    hint: { es: 'Enciende la antena y conecta con la Tierra.', en: 'Switch on the antenna and link with Earth.' },
    words: ['signal-delay', 'light-speed'],
    source: { label: 'NASA JPL · Approximate positions of the planets', url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html' }
  },
  forecast: {
    emoji: '🔭',
    topic: 'comms',
    tag: 'DISEÑO',
    title: { es: 'La previsión del clima espacial', en: 'The space-weather forecast' },
    happened: {
      es: 'La [[antenna|antena]] te ha traído la previsión de esta noche.',
      en: 'The [[antenna]] brought you tonight’s forecast.'
    },
    learn: {
      es: 'La NASA vigila el [[space-weather|clima espacial]] y avisa de las tormentas. En el juego la [[forecast|previsión]] acierta siempre; en la realidad, a veces falla.',
      en: 'NASA watches [[space-weather]] and warns about storms. In the game the [[forecast]] is always right; real ones sometimes fail.'
    },
    remember: { es: 'Mira la previsión antes de cargar el escudo.', en: 'Check the forecast before charging the shield.' },
    hint: { es: 'Conecta la antena con la Tierra.', en: 'Link the antenna with Earth.' },
    words: ['antenna', 'forecast', 'space-weather'],
    source: { label: 'NASA CCMC · DONKI', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/' }
  },
  'antenna-calibration': {
    emoji: '📡',
    topic: 'comms',
    tag: 'SIMULADO',
    title: { es: 'Antena descalibrada', en: 'Antenna out of tune' },
    happened: {
      es: 'Tu [[antenna|antena]] ya no apunta bien: hay que [[calibrate|calibrarla]].',
      en: 'Your [[antenna]] no longer points well: you must [[calibrate]] it.'
    },
    learn: {
      es: 'Sin calibrar, no recibes la previsión ni misiones. En la Tierra, las [[geomagnetic-storm|tormentas magnéticas]] pueden hacer fallar la radio y el GPS.',
      en: 'Out of tune, it brings no forecast and no missions. On Earth, [[geomagnetic-storm|magnetic storms]] can make radio and GPS fail.'
    },
    remember: { es: 'Calibra la antena para no quedarte sin avisos.', en: 'Calibrate the antenna to keep getting warnings.' },
    hint: { es: 'Pasa con nubes de plasma o tormentas magnéticas.', en: 'It happens with plasma clouds or magnetic storms.' },
    words: ['calibrate', 'geomagnetic-storm'],
    source: { label: 'NASA · Space weather', url: 'https://science.nasa.gov/heliophysics/focus-areas/space-weather/' }
  },
  research: {
    emoji: '🔬',
    topic: 'comms',
    tag: 'DISEÑO',
    title: { es: '¡Misión entregada!', en: 'Mission delivered!' },
    happened: {
      es: 'Has enviado tu primera misión a la Tierra y tu [[research|Ciencia]] ha subido.',
      en: 'You sent your first mission to Earth, and your [[research|Science]] went up.'
    },
    learn: {
      es: 'Con el 100 % de Ciencia, ganas la partida. Las [[sample|muestras]] de roca y hielo ayudan a preparar [[artemis|Artemis]].',
      en: 'Reach 100 % Science and you win the game. Rock and ice [[sample|samples]] help prepare the [[artemis|Artemis]] missions.'
    },
    remember: { es: 'Cada misión entregada te acerca a la victoria.', en: 'Every mission you deliver brings you closer to winning.' },
    hint: { es: 'Entrega una misión desde la antena.', en: 'Deliver a mission from the antenna.' },
    words: ['research', 'sample'],
    source: { label: 'NASA · Artemis', url: 'https://www.nasa.gov/humans-in-space/artemis/' }
  },
  'storm-science': {
    emoji: '🧑‍🔬',
    topic: 'comms',
    tag: 'ARCHIVO',
    title: { es: 'Vigía del clima espacial', en: 'Space-weather watcher' },
    happened: { es: 'Tus notas de las tormentas han llegado a la Tierra.', en: 'Your storm notes have reached Earth.' },
    learn: {
      es: '[[radlab|RadLab]] guarda las medidas de radiación de la Luna, la Estación y Marte. La nave [[biosentinel|BioSentinel]], en el espacio profundo, midió decenas de veces lo normal.',
      en: '[[radlab|RadLab]] keeps radiation measurements from the Moon, the Station and Mars. Out in deep space, [[biosentinel|BioSentinel]] measured tens of times normal.'
    },
    remember: { es: 'Vigilar el Sol es ciencia de verdad.', en: 'Watching the Sun is real science.' },
    hint: { es: 'Completa la misión «Vigía del clima espacial».', en: 'Complete the “Space-weather watch” mission.' },
    words: ['radlab', 'biosentinel'],
    source: RADLAB
  },

  // ---------- The Sun and space weather ----------
  flare: {
    emoji: '⚡',
    topic: 'sun',
    tag: 'NASA',
    title: { es: 'Una llamarada solar', en: 'A solar flare' },
    happened: { es: '¡El Sol ha lanzado una [[flare|llamarada]] de verdad!', en: 'The Sun has fired a real [[flare]]!' },
    learn: {
      es: 'Es un destello gigante, y su luz nos llega en unos 8 minutos. La NASA apunta las grandes en su base de datos [[donki|DONKI]].',
      en: 'It is a giant flash, and its light reaches us in about 8 minutes. NASA logs the big ones in its [[donki|DONKI]] database.'
    },
    remember: { es: 'Una llamarada es un destello gigante del Sol.', en: 'A flare is a giant flash on the Sun.' },
    hint: { es: 'Duerme tras un día con llamaradas.', en: 'Sleep after a day with flares.' },
    words: ['flare', 'donki'],
    source: SOLAR_STORMS
  },
  'x-class': {
    emoji: '💥',
    topic: 'sun',
    tag: 'ARCHIVO',
    title: { es: '¡Llamarada de clase X!', en: 'X-class flare!' },
    happened: {
      es: '¡El Sol ha lanzado una [[x-class|llamarada X]], de las más fuertes!',
      en: 'The Sun fired an [[x-class|X flare]], one of the strongest kind!'
    },
    learn: {
      es: 'Las llamaradas X son las más potentes y suelen salir de una [[active-region|región activa]]. Del 1 al 21 de mayo de 2024, el Sol lanzó 18.',
      en: 'X flares are the strongest, and usually come from an [[active-region]]. From 1 to 21 May 2024, the Sun fired 18 of them.'
    },
    remember: { es: 'La X es la letra de las llamaradas más fuertes.', en: 'X is the letter for the strongest flares.' },
    hint: { es: 'Duerme tras un día con llamarada X.', en: 'Sleep after a day with an X flare.' },
    words: ['x-class', 'active-region'],
    source: { label: 'NASA · How NASA tracked the most intense solar storm in decades', url: 'https://science.nasa.gov/science-research/heliophysics/how-nasa-tracked-the-most-intense-solar-storm-in-decades/' }
  },
  cme: {
    emoji: '☁️',
    topic: 'sun',
    tag: 'NASA',
    title: { es: 'Una nube de plasma', en: 'A plasma cloud' },
    happened: {
      es: 'El Sol ha lanzado una [[cme|nube de plasma]] al espacio.',
      en: 'The Sun has thrown a [[cme|plasma cloud]] into space.'
    },
    learn: {
      es: 'Es una nube gigante de [[plasma]], un gas tan caliente que tiene carga eléctrica. Las más rápidas llegan a la Tierra en menos de un día.',
      en: 'It is a giant cloud of [[plasma]]: super-hot, electrically charged gas. The fastest ones reach Earth in less than a day.'
    },
    remember: { es: 'Una nube de plasma tarda horas o días en llegar.', en: 'A plasma cloud takes hours or days to arrive.' },
    hint: { es: 'Duerme tras un día con nube de plasma.', en: 'Sleep after a day with a plasma cloud.' },
    words: ['cme', 'plasma'],
    source: SOLAR_STORMS
  },
  'cme-arrival': {
    emoji: '🌊',
    topic: 'sun',
    tag: 'ARCHIVO',
    title: { es: '¡Llega la nube de plasma!', en: 'The plasma cloud arrives!' },
    happened: {
      es: 'Una [[cme|nube de plasma]] ha chocado contra la Tierra y la Luna.',
      en: 'A [[cme|plasma cloud]] has hit the Earth and the Moon.'
    },
    learn: {
      es: 'En mayo de 2024, la NASA predijo un choque así dos días antes. Solo se equivocó por unas 4 horas.',
      en: 'In May 2024, NASA predicted a hit like this two days ahead. It was only about 4 hours off.'
    },
    remember: { es: 'Tras un choque, revisa los paneles y la antena.', en: 'After a hit, check the panels and the antenna.' },
    hint: { es: 'Duerme el día que llegue una nube de plasma.', en: 'Sleep on a day when a plasma cloud arrives.' },
    words: ['cme'],
    source: { label: 'NASA CCMC DONKI · CME shock at Earth, 10 May 2024', url: 'https://ccmc.gsfc.nasa.gov/DONKI/view/IPS/30688/-1' }
  },
  sep: {
    emoji: '🔆',
    topic: 'sun',
    tag: 'NASA',
    title: { es: 'Lluvia de partículas', en: 'A particle shower' },
    happened: {
      es: 'El Sol ha disparado una [[sep|lluvia de partículas]] rapidísima.',
      en: 'The Sun has fired a super-fast [[sep|particle shower]].'
    },
    learn: {
      es: 'Algunas partículas llegan en menos de una hora, antes que la nube de plasma. Fuera del [[magnetosphere|escudo magnético de la Tierra]], son el mayor peligro para los astronautas.',
      en: 'Some particles arrive in under an hour, before the plasma cloud. Outside [[magnetosphere|Earth’s magnetic shield]], they are the biggest danger to astronauts.'
    },
    remember: { es: 'Las partículas llegan antes: prepara el escudo pronto.', en: 'Particles arrive first: get the shield ready early.' },
    hint: { es: 'Duerme tras un día con lluvia de partículas.', en: 'Sleep after a day with a particle shower.' },
    words: ['sep', 'magnetosphere'],
    source: {
      label: 'NASA · How NASA will protect astronauts from space radiation at the Moon',
      url: 'https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/'
    }
  },
  'geomagnetic-storm': {
    emoji: '🌌',
    topic: 'sun',
    tag: 'ARCHIVO',
    title: { es: 'Tormenta magnética en la Tierra', en: 'A magnetic storm on Earth' },
    happened: {
      es: 'Una [[geomagnetic-storm|tormenta magnética]] muy fuerte ha sacudido la Tierra.',
      en: 'A very strong [[geomagnetic-storm|magnetic storm]] has shaken the Earth.'
    },
    learn: {
      es: 'La de mayo de 2024 fue la más fuerte en unos 20 años. Se vieron [[aurora|auroras]] mucho más al sur de lo normal, ¡hasta en España!',
      en: 'The May 2024 storm was the strongest in about 20 years. [[aurora|Auroras]] were seen much farther south than usual, even in Spain!'
    },
    remember: { es: 'Las tormentas magnéticas encienden auroras en el cielo.', en: 'Magnetic storms light up auroras in the sky.' },
    hint: { es: 'Vive la tormenta magnética de mayo de 2024.', en: 'Live through the magnetic storm of May 2024.' },
    words: ['geomagnetic-storm', 'aurora'],
    source: {
      label: 'NASA · What NASA is learning from the biggest geomagnetic storm in 20 years',
      url: 'https://science.nasa.gov/science-research/heliophysics/what-nasa-is-learning-from-the-biggest-geomagnetic-storm-in-20-years/'
    }
  },
  'mars-storm': {
    emoji: '🔴',
    topic: 'sun',
    tag: 'ARCHIVO',
    title: { es: '¡Tormenta en Marte!', en: 'Storm on Mars!' },
    happened: { es: '¡La tormenta del Sol ha llegado hasta [[mars|Marte]]!', en: 'The Sun’s storm has reached all the way to [[mars|Mars]]!' },
    learn: {
      es: 'El Sol gira, y la zona de las grandes llamaradas acabó mirando a Marte. El 20 de mayo, el rover [[curiosity|Curiosity]] midió allí 14 veces lo normal.',
      en: 'The Sun spins, so the region of the big flares ended up facing Mars. On 20 May, the [[curiosity|Curiosity]] rover measured 14 times normal there.'
    },
    remember: { es: 'Las tormentas del Sol también llegan a otros planetas.', en: 'Solar storms reach other planets too.' },
    hint: { es: 'Juega la tormenta de 2024 hasta el 20 de mayo.', en: 'Play the 2024 storm until 20 May.' },
    words: ['mars', 'curiosity'],
    source: { label: 'NASA · NASA watches Mars light up during epic solar storm', url: 'https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm/' }
  },

  // ---------- The Moon and exploration ----------
  welcome: {
    emoji: '👩‍🚀',
    topic: 'moon',
    tag: 'NASA',
    title: { es: '¡Hola, polo sur!', en: 'Hello, south pole!' },
    happened: {
      es: 'Ya estás al mando de tu base en el [[south-pole|polo sur]] de la Luna.',
      en: 'You are now in charge of your base at the Moon’s [[south-pole]].'
    },
    learn: {
      es: 'La NASA quiere enviar astronautas aquí con [[artemis|Artemis]]. Cada día del juego es un día real, con datos de la NASA.',
      en: 'NASA wants to send astronauts here with [[artemis|Artemis]]. Every game day is a real day, with real NASA data.'
    },
    remember: { es: 'Nada es gratis: piensa antes de gastar.', en: 'Nothing is free: think before you spend.' },
    hint: { es: 'Empieza una misión nueva.', en: 'Start a new mission.' },
    words: ['south-pole', 'artemis'],
    source: { label: 'NASA · Moon Base: the lunar South Pole', url: 'https://www.nasa.gov/reference/moonbase-environment/' }
  },
  'polar-day': {
    emoji: '🌅',
    topic: 'moon',
    tag: 'DISEÑO',
    title: { es: 'Noche en el polo sur', en: 'Night at the south pole' },
    happened: { es: 'Se acabó el día de trabajo: toca ir a dormir.', en: 'Your work day is over: time to go to bed.' },
    learn: {
      es: 'En el [[south-pole|polo sur]], el Sol casi no sube: va rozando el horizonte. Hay picos con luz casi siempre y [[crater|cráteres]] que nunca la ven.',
      en: 'At the [[south-pole]], the Sun barely rises: it skims the horizon. Some peaks get light almost always, and some [[crater|craters]] never do.'
    },
    remember: { es: 'En el polo sur, el Sol va siempre muy bajo.', en: 'At the south pole, the Sun always stays low.' },
    hint: { es: 'Gasta todas tus Fuerzas o termina el día.', en: 'Use all your Stamina or end the day.' },
    words: ['south-pole', 'crater'],
    source: { label: 'NASA SVS · Shadows near the Moon’s South Pole', url: 'https://science.nasa.gov/resource/shadows-near-the-moons-south-pole/' }
  },
  'lunar-gravity': {
    emoji: '🪶',
    topic: 'moon',
    tag: 'NASA',
    title: { es: 'Saltos a cámara lenta', en: 'Slow-motion jumps' },
    happened: { es: '¡Tu [[rover|Rover]] ha dado saltos enormes por la Luna!', en: 'Your [[rover|Rover]] made huge jumps across the Moon!' },
    learn: {
      es: 'La [[lunar-gravity|gravedad de la Luna]] es la sexta parte de la de la Tierra. Allí pesas seis veces menos, ¡y saltas mucho más!',
      en: 'The Moon’s [[lunar-gravity|gravity]] is one sixth of Earth’s. You weigh six times less there, and you jump much higher!'
    },
    remember: { es: 'En la Luna pesas seis veces menos.', en: 'On the Moon you weigh six times less.' },
    hint: { es: 'Sal a explorar con el Rover.', en: 'Go exploring with the Rover.' },
    words: ['rover', 'lunar-gravity'],
    source: { label: 'NASA · Moon facts', url: 'https://science.nasa.gov/moon/facts/' }
  },
  metal: {
    emoji: '🔩',
    topic: 'moon',
    tag: 'NASA',
    title: { es: 'Metal del suelo lunar', en: 'Metal from Moon soil' },
    happened: { es: 'Tu Rover ha recogido metal para mejorar la base.', en: 'Your Rover collected metal to upgrade the base.' },
    learn: {
      es: 'Las rocas lunares tienen hierro, aluminio y hasta oxígeno. Usar lo que ya hay allí, sin traerlo de la Tierra, es la [[isru|ISRU]].',
      en: 'Moon rocks contain iron, aluminium and even oxygen. Using what is already there, instead of bringing it from Earth, is [[isru|ISRU]].'
    },
    remember: { es: 'Usar lo que hay en la Luna ahorra viajes.', en: 'Using Moon resources saves trips from Earth.' },
    hint: { es: 'Recoge metal con el Rover.', en: 'Collect metal with the Rover.' },
    words: ['isru'],
    source: { label: 'NASA · Moon composition and structure', url: 'https://science.nasa.gov/moon/composition/' }
  },
  samples: {
    emoji: '⚪',
    topic: 'moon',
    tag: 'NASA',
    title: { es: 'Anortosita, la roca blanca', en: 'Anorthosite, the white rock' },
    happened: {
      es: 'Has recogido [[anorthosite|anortosita]], la roca clara de las tierras altas lunares.',
      en: 'You collected [[anorthosite]], the bright rock of the Moon’s highlands.'
    },
    learn: {
      es: 'Cuando la Luna era joven, su capa de fuera estaba fundida. Al enfriarse, sus cristales flotaron como cubitos de hielo y formaron la primera corteza.',
      en: 'When the Moon was young, its outer layer was melted rock. As it cooled, crystals floated up like ice cubes and formed the first crust.'
    },
    remember: { es: 'La anortosita es la roca de la primera corteza lunar.', en: 'Anorthosite is the rock of the Moon’s first crust.' },
    hint: { es: 'Recoge rocas en la zona 1 con el Rover.', en: 'Collect rocks in zone 1 with the Rover.' },
    words: ['anorthosite'],
    source: { label: 'NASA Astromaterials · Anorthosite', url: 'https://curator.jsc.nasa.gov/education/diskdetails.cfm?disk=18&class=Anorthosite' }
  },
  breccia: {
    emoji: '🧩',
    topic: 'moon',
    tag: 'NASA',
    title: { es: 'Brecha: roca de rocas', en: 'Breccia: a rock of rocks' },
    happened: {
      es: 'Has recogido [[breccia|brecha de impacto]], una roca hecha de trozos de rocas.',
      en: 'You collected [[breccia|impact breccia]], a rock made of bits of other rocks.'
    },
    learn: {
      es: 'Los meteoritos rompen rocas y el calor del choque suelda los trozos. Cada brecha es como un diario de los golpes de la Luna.',
      en: 'Meteorites smash rocks, and the heat of the crash welds the pieces. Each breccia is like a diary of the Moon’s crashes.'
    },
    remember: { es: 'La brecha guarda la historia de los choques.', en: 'Breccia keeps the story of the crashes.' },
    hint: { es: 'Mejora el Rover y recoge rocas en la zona 2.', en: 'Upgrade the Rover and collect rocks in zone 2.' },
    words: ['breccia'],
    source: { label: 'NASA Astromaterials · Breccia', url: 'https://curator.jsc.nasa.gov/education/diskdetails.cfm?disk=21&class=Breccia' }
  },
  'water-ice': {
    emoji: '🧊',
    topic: 'moon',
    tag: 'NASA',
    title: { es: '¡Hielo de agua!', en: 'Water ice!' },
    happened: {
      es: 'Tu Rover ha recogido [[water-ice|hielo de agua]] del suelo lunar.',
      en: 'Your Rover collected [[water-ice]] from the Moon’s ground.'
    },
    learn: {
      es: 'En 2009, la NASA estrelló un cohete contra un cráter y halló agua. Ese hielo sirve para beber, regar y fabricar [[oxygen|oxígeno]].',
      en: 'In 2009, NASA crashed a rocket into a crater and found water. That ice can be used for drinking, watering plants and making [[oxygen]].'
    },
    remember: { es: 'El hielo lunar puede darnos agua y aire.', en: 'Moon ice can give us water and air.' },
    hint: { es: 'Recoge hielo con el Rover.', en: 'Collect ice with the Rover.' },
    words: ['water-ice', 'oxygen'],
    source: { label: 'NASA · LCROSS mission', url: 'https://science.nasa.gov/mission/lcross/' }
  },
  'psr-ice': {
    emoji: '🌑',
    topic: 'moon',
    tag: 'NASA',
    title: { es: 'Regolito helado', en: 'Icy regolith' },
    happened: {
      es: 'Has recogido [[regolith|regolito]] helado de un cráter siempre a oscuras.',
      en: 'You collected icy [[regolith]] from a crater that is always dark.'
    },
    learn: {
      es: 'Los [[psr|cráteres en sombra]] llevan miles de millones de años sin ver el Sol. Allí puede hacer más de 200 grados bajo cero: por eso guardan hielo.',
      en: '[[psr|Shadowed craters]] have not seen the Sun for billions of years. It can get below minus 200 degrees there, so they keep ice.'
    },
    remember: { es: 'Los cráteres más fríos guardan el hielo de la Luna.', en: 'The coldest craters keep the Moon’s ice.' },
    hint: { es: 'Mejora el Rover y recoge rocas en la zona 3.', en: 'Upgrade the Rover and collect rocks in zone 3.' },
    words: ['regolith', 'psr'],
    source: { label: 'NASA · Moon’s South Pole is full of mystery and science intrigue', url: 'https://www.nasa.gov/humans-in-space/moons-south-pole-is-full-of-mystery-science-intrigue/' }
  }
};

// Compatibility shim: some v1 screens still render `body`. Fill it from the two new fields (same RichText
// mark-up) so they keep working while the screens move to happened/learn.
// TODO(v2): remove when every screen reads happened/learn
for (const d of Object.values(DISCOVERIES)) {
  if (!d.body) d.body = { es: `${d.happened.es} ${d.learn.es}`, en: `${d.happened.en} ${d.learn.en}` };
}

// Journal reading order: chapter by chapter (TOPICS order), and inside each chapter from the basics to the details.
export const DISCOVERY_ORDER = [
  // energy: get it, store it, lose it (dust, sparks), take it on the road
  'base-energy',
  'base-battery',
  'dirty-panels',
  'short-circuit',
  'rover-battery',
  // radiation: what a storm is, the shield, who measures it, why the Station is safer, outside the shield
  'radiation-storm',
  'shield',
  'crater-detector',
  'iss-vs-moon',
  'outside-storm',
  // life: the base that keeps you alive, your effort, food, health
  'golden-rule',
  'stamina',
  'greenhouse',
  'harvest',
  'hunger',
  'overexertion',
  'recovery',
  'evacuation',
  // comms: the signal, the forecast, a broken antenna, sending science home
  'signal-delay',
  'forecast',
  'antenna-calibration',
  'research',
  'storm-science',
  // sun: flares, the strongest flares, plasma clouds and their arrival, particles, magnetic storms, Mars
  'flare',
  'x-class',
  'cme',
  'cme-arrival',
  'sep',
  'geomagnetic-storm',
  'mars-storm',
  // moon: the base and its light, the Rover, rocks, then ice
  'welcome',
  'polar-day',
  'lunar-gravity',
  'metal',
  'samples',
  'breccia',
  'water-ice',
  'psr-ice'
];
