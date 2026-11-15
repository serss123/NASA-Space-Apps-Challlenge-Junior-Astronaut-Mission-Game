// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Clickable glossary of Sol a Sol, listed in the Discovery Journal as "Palabras de astronauta" / "Astronaut words".
// Texts mark a word with [[id]] or [[id|visible text]] (ui/components/RichText.jsx); tapping it opens a pill
// with the entry below (ui/components/Glossary.jsx).
// Shape (docs/DESIGN.md section 6):
//   id: { emoji, topic, es: { term, def, example }, en: { term, def, example }, source?: { label, url } }
//   · topic    a TOPICS id from content/discoveries.js: the journal chapter that lists the word
//   · term     the word as it reads inside a sentence (lower case except names and acronyms). A [[id]] pill
//              without its own text shows the term, so it must fit in the middle of a sentence
//   · def      plain text (no mark-up), at most 20 simple words
//   · example  an everyday comparison, "Es como…" / "It is like…", at most 15 words
//   · source   optional link for grown-ups (official pages already cited in the project)
// Instrument and model names (crater-detector, wsa-enlil, kp-index) belong to the grown-ups part of the data page;
// kid texts use the plain names instead (content.test.js checks it).
// Entries are grouped by topic in journal order, from the basics to the details.

const RADLAB = { label: 'NASA OSDR · RadLab', url: 'https://visualization.osdr.nasa.gov/radlab/gui/' };
const SOLAR_STORMS = { label: 'NASA · Solar storms and flares', url: 'https://science.nasa.gov/sun/solar-storms-and-flares/' };
const ECLSS = { label: 'NASA · Environmental Control and Life Support (ECLSS)', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/' };

export const GLOSSARY = {
  // ---------- Energy ----------
  'solar-panel': {
    emoji: '☀️',
    topic: 'energy',
    es: {
      term: 'panel solar',
      def: 'Una placa que convierte la luz del Sol en electricidad. En el polo sur, se pone donde llega más luz.',
      example: 'Es como una hoja de planta: atrapa la luz del Sol.'
    },
    en: {
      term: 'solar panel',
      def: 'A panel that turns sunlight into electricity. At the south pole, it goes where the most light falls.',
      example: 'It is like a plant leaf: it catches sunlight.'
    },
    source: { label: 'NASA · The Lunar South Pole Region', url: 'https://www.nasa.gov/reference/moonbase-environment/' }
  },
  battery: {
    emoji: '🔋',
    topic: 'energy',
    es: {
      term: 'batería',
      def: 'Guarda electricidad para usarla más tarde, cuando no hay luz o cuando necesitas más.',
      example: 'Es como una hucha, pero de energía en vez de monedas.'
    },
    en: {
      term: 'battery',
      def: 'It stores electricity to use later, when there is no light or you need more.',
      example: 'It is like a piggy bank, but for energy instead of coins.'
    }
  },
  'static-electricity': {
    emoji: '💫',
    topic: 'energy',
    es: {
      term: 'electricidad estática',
      def: 'Carga eléctrica que se acumula y hace que las cosas se peguen. El polvo lunar se pega así.',
      example: 'Es como cuando frotas un globo en el pelo y se queda pegado.'
    },
    en: {
      term: 'static electricity',
      def: 'Electric charge that builds up and makes things stick. Moon dust sticks like this.',
      example: 'It is like rubbing a balloon on your hair until it sticks.'
    },
    source: { label: 'NASA · Dust shield repels lunar regolith', url: 'https://www.nasa.gov/image-article/nasas-dust-shield-successfully-repels-lunar-regolith-on-moon/' }
  },
  'short-circuit': {
    emoji: '🔌',
    topic: 'energy',
    es: {
      term: 'cortocircuito',
      def: 'Cuando la electricidad se escapa por un camino equivocado y un aparato deja de funcionar.',
      example: 'Es como si el agua se saliera del tubo antes de llegar al grifo.'
    },
    en: {
      term: 'short circuit',
      def: 'When electricity escapes along the wrong path and a device stops working.',
      example: 'It is like water leaking from a pipe before it reaches the tap.'
    }
  },

  // ---------- Radiation and shield ----------
  radiation: {
    emoji: '☢️',
    topic: 'radiation',
    es: {
      term: 'radiación',
      def: 'Energía invisible que viaja por el espacio. Un poco no hace daño; mucha daña el cuerpo y las máquinas.',
      example: 'Es como el sol del verano: un poco va bien, mucho quema.'
    },
    en: {
      term: 'radiation',
      def: 'Invisible energy that travels through space. A little is harmless; a lot harms bodies and machines.',
      example: 'It is like summer sun: a little is fine, too much burns.'
    },
    source: { label: 'NASA · Why space radiation matters', url: 'https://www.nasa.gov/missions/analog-field-testing/why-space-radiation-matters/' }
  },
  'storm-level': {
    emoji: '🚦',
    topic: 'radiation',
    es: {
      term: 'nivel de tormenta',
      def: 'Lo fuerte que es la radiación: Calma, Tormenta pequeña, Tormenta fuerte o Supertormenta. Carga el escudo hasta ese nivel.',
      example: 'Es como el aviso del tiempo, pero para saber cuánto escudo cargar.'
    },
    en: {
      term: 'storm level',
      def: 'How strong the radiation is: Calm, Small storm, Strong storm or Super storm. Charge your shield to match.',
      example: 'It is like a weather warning that tells you how much shield to charge.'
    },
    source: RADLAB
  },
  shield: {
    emoji: '🛡️',
    topic: 'radiation',
    es: {
      term: 'escudo',
      def: 'Lo que protege tu base de la radiación. En la vida real se usan paredes gruesas, agua o regolito.',
      example: 'Es como un paraguas: te tapa cuando llueve radiación.'
    },
    en: {
      term: 'shield',
      def: 'What protects your base from radiation. In real life, thick walls, water or regolith are used.',
      example: 'It is like an umbrella that covers you when radiation rains down.'
    },
    source: { label: 'NASA · How NASA will protect astronauts from space radiation at the Moon', url: 'https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/' }
  },
  dose: {
    emoji: '📏',
    topic: 'radiation',
    es: {
      term: 'dosis',
      def: 'Cuánta radiación recibe tu cuerpo. Los astronautas la miden para no pasar de un límite.',
      example: 'Es como contar las horas que pasas al sol en la playa.'
    },
    en: {
      term: 'dose',
      def: 'How much radiation your body receives. Astronauts measure it so they stay under a limit.',
      example: 'It is like counting the hours you spend in the sun at the beach.'
    },
    source: { label: 'CSN (Spain) · Dosis de radiación', url: 'https://www.csn.es/documents/10182/914805/Dosis%20de%20radiaci%C3%B3n' }
  },
  'cosmic-ray': {
    emoji: '🌠',
    topic: 'radiation',
    es: {
      term: 'rayos cósmicos',
      def: 'Partículas rapidísimas que llegan de fuera del sistema solar todos los días. Atraviesan casi cualquier pared.',
      example: 'Son como una llovizna que no para nunca, de día y de noche.'
    },
    en: {
      term: 'cosmic rays',
      def: 'Super-fast particles that arrive from outside the solar system every day. They pass through almost any wall.',
      example: 'They are like a drizzle that never stops, day or night.'
    },
    source: { label: 'NASA-STD-3001 · Radiation protection technical brief', url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf' }
  },
  dosimeter: {
    emoji: '⌚',
    topic: 'radiation',
    es: {
      term: 'dosímetro',
      def: 'Un aparato que mide la dosis de radiación. Los astronautas llevan uno encima.',
      example: 'Es como un termómetro, pero en vez de calor mide radiación.'
    },
    en: {
      term: 'dosimeter',
      def: 'A device that measures the radiation dose. Astronauts carry one with them.',
      example: 'It is like a thermometer, but it measures radiation instead of heat.'
    },
    source: RADLAB
  },
  'crater-detector': {
    emoji: '📟',
    topic: 'radiation',
    es: {
      term: 'CRaTER',
      def: 'El detector de radiación de la nave LRO. Sus medidas cerca de la Luna deciden cada noche del juego.',
      example: 'Es como un guardián que cuenta las partículas que pasan a su lado.'
    },
    en: {
      term: 'CRaTER',
      def: 'The radiation detector on the LRO spacecraft. Its readings near the Moon set each night in the game.',
      example: 'It is like a guard counting the particles that fly past it.'
    },
    source: RADLAB
  },
  radlab: {
    emoji: '📊',
    topic: 'radiation',
    es: {
      term: 'RadLab',
      def: 'Un archivo de la NASA con la radiación medida junto a la Luna, en la Estación y en Marte.',
      example: 'Es como un álbum donde se guarda la radiación de cada día.'
    },
    en: {
      term: 'RadLab',
      def: 'A NASA archive of radiation measured near the Moon, on the Space Station and on Mars.',
      example: 'It is like an album that keeps the radiation of every day.'
    },
    source: RADLAB
  },
  biosentinel: {
    emoji: '🧫',
    topic: 'radiation',
    es: {
      term: 'BioSentinel',
      def: 'Una pequeña nave de la NASA que da vueltas al Sol, lejos de la Tierra, y mide la radiación.',
      example: 'Es como una boya en el mar que avisa de las olas.'
    },
    en: {
      term: 'BioSentinel',
      def: 'A small NASA spacecraft that circles the Sun, far from Earth, measuring radiation.',
      example: 'It is like a buoy at sea that warns about big waves.'
    },
    source: { label: 'NASA · BioSentinel studies solar radiation', url: 'https://www.nasa.gov/general/nasas-biosentinel-studies-solar-radiation-as-earth-watches-aurora/' }
  },

  // ---------- Life at the base ----------
  'life-support': {
    emoji: '🫁',
    topic: 'life',
    es: {
      term: 'Soporte Vital',
      def: 'Las máquinas que te mantienen con vida en la base: aire para respirar, agua limpia y temperatura agradable.',
      example: 'Es como los pulmones y el corazón de tu base.'
    },
    en: {
      term: 'Life Support',
      def: 'The machines that keep you alive at the base: air to breathe, clean water and a comfy temperature.',
      example: 'It is like the lungs and heart of your base.'
    },
    source: ECLSS
  },
  oxygen: {
    emoji: '💨',
    topic: 'life',
    es: {
      term: 'oxígeno',
      def: 'El gas del aire que necesitas para respirar. En la Estación Espacial se fabrica a partir de agua.',
      example: 'Es como lo que necesita una vela para no apagarse.'
    },
    en: {
      term: 'oxygen',
      def: 'The gas in the air that you need to breathe. On the Space Station it is made from water.',
      example: 'It is like what a candle needs so it does not go out.'
    },
    source: { label: 'NASA · ECLSS', url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/' }
  },
  greenhouse: {
    emoji: '🌱',
    topic: 'life',
    es: {
      term: 'invernadero',
      def: 'Un lugar cerrado con luz, agua y aire para cultivar plantas. Tu granja de la base es uno.',
      example: 'Es como una casita de cristal donde las plantas están calentitas.'
    },
    en: {
      term: 'greenhouse',
      def: 'A closed place with light, water and air for growing plants. Your base farm is one.',
      example: 'It is like a little glass house that keeps plants cosy.'
    },
    source: { label: 'NASA · Growing plants in space', url: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/' }
  },
  spacesuit: {
    emoji: '🧑‍🚀',
    topic: 'life',
    es: {
      term: 'traje espacial',
      def: 'Ropa especial que te da aire y la temperatura justa fuera de la base. Te protege del polvo.',
      example: 'Es como una nave espacial pequeñita hecha a tu medida.'
    },
    en: {
      term: 'spacesuit',
      def: 'Special clothing that gives you air and the right temperature outside the base. It protects you from dust.',
      example: 'It is like a tiny spaceship made just for you.'
    },
    source: { label: 'NASA · Spacesuits and rovers', url: 'https://www.nasa.gov/suits-and-rovers/' }
  },
  airlock: {
    emoji: '🚪',
    topic: 'life',
    es: {
      term: 'esclusa',
      def: 'Una salita con dos puertas para salir al exterior sin que se escape el aire de la base.',
      example: 'Es como un recibidor con dos puertas: nunca se abren a la vez.'
    },
    en: {
      term: 'airlock',
      def: 'A small room with two doors for going outside without letting the base’s air escape.',
      example: 'It is like a porch with two doors that never open together.'
    }
  },
  microgravity: {
    emoji: '🎈',
    topic: 'life',
    es: {
      term: 'microgravedad',
      def: 'La sensación de flotar dentro de una nave en órbita. Sin ejercicio, los huesos y músculos se debilitan.',
      example: 'Es como la bajada de una montaña rusa, pero sin parar.'
    },
    en: {
      term: 'microgravity',
      def: 'The feeling of floating inside a spacecraft in orbit. Without exercise, bones and muscles get weaker.',
      example: 'It is like the drop on a roller coaster, but it never stops.'
    },
    source: { label: 'NASA · The human body in space', url: 'https://www.nasa.gov/humans-in-space/the-human-body-in-space/' }
  },
  evacuation: {
    emoji: '🏃',
    topic: 'life',
    es: {
      term: 'evacuación',
      def: 'Salir de un lugar peligroso para ponerte a salvo. En el espacio, la seguridad va siempre primero.',
      example: 'Es como cuando todo el cole sale al patio en un simulacro.'
    },
    en: {
      term: 'evacuation',
      def: 'Leaving a dangerous place to get to safety. In space, safety always comes first.',
      example: 'It is like a fire drill at school, when everyone goes outside.'
    }
  },

  // ---------- Communication ----------
  antenna: {
    emoji: '📡',
    topic: 'comms',
    es: {
      term: 'antena',
      def: 'Un aparato que envía y recibe señales de radio. Une tu base con la Tierra.',
      example: 'Es como un teléfono gigante que habla con la Tierra.'
    },
    en: {
      term: 'antenna',
      def: 'A device that sends and receives radio signals. It links your base with Earth.',
      example: 'It is like a giant phone that talks to Earth.'
    }
  },
  calibrate: {
    emoji: '🎛️',
    topic: 'comms',
    es: {
      term: 'calibrar',
      def: 'Ajustar un aparato para que funcione bien. Una antena sin calibrar no apunta bien a la Tierra.',
      example: 'Es como afinar una guitarra para que suene bien.'
    },
    en: {
      term: 'calibrate',
      def: 'To adjust a device so it works well. An antenna out of tune does not point well at Earth.',
      example: 'It is like tuning a guitar so it sounds right.'
    }
  },
  'signal-delay': {
    emoji: '⏱️',
    topic: 'comms',
    es: {
      term: 'retraso de la señal',
      def: 'Lo que tarda un mensaje en llegar. A la Luna, poco más de un segundo; a Marte, minutos.',
      example: 'Es como el eco: tu voz tarda un poco en volver.'
    },
    en: {
      term: 'signal delay',
      def: 'How long a message takes to arrive. To the Moon, just over a second; to Mars, minutes.',
      example: 'It is like an echo: your voice takes a moment to come back.'
    },
    source: { label: 'NASA · What is a light-day?', url: 'https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/' }
  },
  'light-speed': {
    emoji: '💡',
    topic: 'comms',
    es: {
      term: 'velocidad de la luz',
      def: 'Lo más rápido que existe: la luz podría dar más de 7 vueltas a la Tierra en un segundo.',
      example: 'Es como encender la luz: llega a toda la habitación al instante.'
    },
    en: {
      term: 'speed of light',
      def: 'The fastest speed there is: light could circle Earth more than 7 times in one second.',
      example: 'It is like switching on a lamp: the whole room lights up at once.'
    },
    source: { label: 'NASA Glenn · How fast is the speed of light?', url: 'https://www.grc.nasa.gov/www/k-12/Numbers/Math/Mathematical_Thinking/how_fast_is_the_speed.htm' }
  },
  'mission-control': {
    emoji: '🎧',
    topic: 'comms',
    es: {
      term: 'Control de Misión',
      def: 'El equipo de la Tierra que vigila la misión día y noche y ayuda a los astronautas.',
      example: 'Es como el entrenador que te da consejos desde la banda.'
    },
    en: {
      term: 'Mission Control',
      def: 'The team on Earth that watches the mission day and night and helps the astronauts.',
      example: 'It is like a coach giving you tips from the side of the pitch.'
    }
  },
  forecast: {
    emoji: '🔭',
    topic: 'comms',
    es: {
      term: 'previsión',
      def: 'Decir lo que va a pasar antes de que pase, usando datos. Ayuda a prepararse, aunque a veces falla.',
      example: 'Es como el parte del tiempo de la tele, pero del Sol.'
    },
    en: {
      term: 'forecast',
      def: 'Saying what will happen before it happens, using data. It helps you prepare, but it is sometimes wrong.',
      example: 'It is like the TV weather forecast, but for the Sun.'
    }
  },
  research: {
    emoji: '🔬',
    topic: 'comms',
    es: {
      term: 'ciencia',
      def: 'Hacer preguntas y buscar respuestas con experimentos y datos. Tu barra de Ciencia sube con cada misión.',
      example: 'Es como ser detective: buscas pistas hasta resolver el misterio.'
    },
    en: {
      term: 'science',
      def: 'Asking questions and finding answers with experiments and data. Your Science bar grows with every mission.',
      example: 'It is like being a detective: you follow clues to solve a mystery.'
    }
  },

  // ---------- The Sun and space weather ----------
  'space-weather': {
    emoji: '🌦️',
    topic: 'sun',
    es: {
      term: 'clima espacial',
      def: 'Lo que hace el Sol y cómo afecta al espacio: viento solar, llamaradas, nubes de plasma y tormentas.',
      example: 'Es como el tiempo de tu ciudad, pero en el espacio.'
    },
    en: {
      term: 'space weather',
      def: 'What the Sun does and how it changes space: solar wind, flares, plasma clouds and storms.',
      example: 'It is like the weather in your town, but out in space.'
    },
    source: { label: 'NASA · Space weather', url: 'https://science.nasa.gov/heliophysics/focus-areas/space-weather/' }
  },
  'solar-storm': {
    emoji: '🌩️',
    topic: 'sun',
    es: {
      term: 'tormenta solar',
      def: 'Cuando el Sol se pone muy activo y lanza llamaradas, nubes de plasma y partículas rapidísimas.',
      example: 'Es como un enfado del Sol que se nota hasta muy lejos.'
    },
    en: {
      term: 'solar storm',
      def: 'When the Sun gets very active and fires flares, plasma clouds and super-fast particles.',
      example: 'It is like the Sun getting angry, and you can feel it far away.'
    },
    source: SOLAR_STORMS
  },
  'solar-wind': {
    emoji: '🌬️',
    topic: 'sun',
    es: {
      term: 'viento solar',
      def: 'Un chorro de partículas con carga eléctrica que sale del Sol sin parar, en todas direcciones.',
      example: 'Es como una brisa que el Sol sopla siempre.'
    },
    en: {
      term: 'solar wind',
      def: 'A stream of electrically charged particles that flows from the Sun nonstop, in every direction.',
      example: 'It is like a breeze that the Sun is always blowing.'
    },
    source: { label: 'NASA · What is the solar wind?', url: 'https://science.nasa.gov/sun/what-is-the-solar-wind/' }
  },
  plasma: {
    emoji: '🔥',
    topic: 'sun',
    es: {
      term: 'plasma',
      def: 'Gas tan caliente que tiene carga eléctrica. El Sol está hecho de plasma.',
      example: 'Es como lo que brilla dentro de un rayo.'
    },
    en: {
      term: 'plasma',
      def: 'Gas so hot that it is electrically charged. The Sun is made of plasma.',
      example: 'It is like the glowing streak inside a lightning bolt.'
    },
    source: { label: 'NASA · Sun facts', url: 'https://science.nasa.gov/sun/facts/' }
  },
  sunspot: {
    emoji: '⚫',
    topic: 'sun',
    es: {
      term: 'mancha solar',
      def: 'Una mancha oscura en el Sol. Es menos caliente que lo de alrededor porque allí se juntan los campos magnéticos.',
      example: 'Es como un lunar en la cara del Sol.'
    },
    en: {
      term: 'sunspot',
      def: 'A dark patch on the Sun. It is cooler than the area around it because magnetic fields bunch up there.',
      example: 'It is like a freckle on the Sun’s face.'
    },
    source: { label: 'NASA · Sunspots', url: 'https://science.nasa.gov/sun/sunspots/' }
  },
  'active-region': {
    emoji: '🌋',
    topic: 'sun',
    es: {
      term: 'región activa',
      def: 'Una zona del Sol con campos magnéticos muy fuertes, a menudo con manchas. De ahí salen las grandes llamaradas.',
      example: 'Es como un volcán del Sol que a veces entra en erupción.'
    },
    en: {
      term: 'active region',
      def: 'An area of the Sun with very strong magnetic fields, often with sunspots. Big flares come from there.',
      example: 'It is like a volcano on the Sun that sometimes erupts.'
    },
    source: { label: 'NOAA SWPC · First G4 watch since 2005 (region 3664)', url: 'https://www.swpc.noaa.gov/news/swpc-issues-its-first-g4-watch-2005' }
  },
  flare: {
    emoji: '⚡',
    topic: 'sun',
    es: {
      term: 'llamarada solar',
      def: 'Un destello gigante de luz en el Sol. Su luz tarda unos 8 minutos en llegar hasta aquí.',
      example: 'Es como el flash de una cámara, pero enorme y en el Sol.'
    },
    en: {
      term: 'solar flare',
      def: 'A giant flash of light on the Sun. Its light takes about 8 minutes to get here.',
      example: 'It is like a camera flash, but huge and on the Sun.'
    },
    source: SOLAR_STORMS
  },
  'x-class': {
    emoji: '💥',
    topic: 'sun',
    es: {
      term: 'llamarada de clase X',
      def: 'Las llamaradas más fuertes. De menor a mayor: A, B, C, M y X. Cada letra es 10 veces más.',
      example: 'Es como el último nivel de un videojuego: el más difícil.'
    },
    en: {
      term: 'X-class flare',
      def: 'The strongest flares. From weakest to strongest: A, B, C, M and X. Each letter is 10 times stronger.',
      example: 'It is like the final level of a video game: the toughest one.'
    },
    source: SOLAR_STORMS
  },
  cme: {
    emoji: '☁️',
    topic: 'sun',
    es: {
      term: 'nube de plasma (CME)',
      def: 'Una nube gigante de gas muy caliente que lanza el Sol. Las más rápidas llegan en menos de un día.',
      example: 'Es como un estornudo gigante del Sol que viaja por el espacio.'
    },
    en: {
      term: 'plasma cloud (CME)',
      def: 'A giant cloud of very hot gas thrown out by the Sun. The fastest arrive in less than a day.',
      example: 'It is like a giant sneeze from the Sun that flies through space.'
    },
    source: { label: 'NOAA SWPC · Coronal mass ejections', url: 'https://www.swpc.noaa.gov/phenomena/coronal-mass-ejections' }
  },
  sep: {
    emoji: '🔆',
    topic: 'sun',
    es: {
      term: 'lluvia de partículas del Sol (SEP)',
      def: 'Partículas diminutas que el Sol dispara rapidísimo. Las más veloces llegan en menos de una hora.',
      example: 'Es como una granizada invisible que cae sobre la Luna.'
    },
    en: {
      term: 'solar particle shower (SEP)',
      def: 'Tiny particles the Sun fires at amazing speed. The fastest arrive in less than an hour.',
      example: 'It is like an invisible hailstorm falling on the Moon.'
    },
    source: { label: 'NASA · How NASA will protect astronauts from space radiation at the Moon', url: 'https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/' }
  },
  magnetosphere: {
    emoji: '🧲',
    topic: 'sun',
    es: {
      term: 'magnetosfera',
      def: 'El escudo magnético de la Tierra. Aparta la mayoría de las partículas del Sol, pero la Luna suele quedar fuera.',
      example: 'Es como una burbuja invisible que envuelve la Tierra.'
    },
    en: {
      term: 'magnetosphere',
      def: 'Earth’s magnetic shield. It pushes away most particles from the Sun, but the Moon is usually outside it.',
      example: 'It is like an invisible bubble wrapped around Earth.'
    },
    source: { label: 'NASA · Magnetospheres', url: 'https://science.nasa.gov/heliophysics/focus-areas/magnetosphere-ionosphere/' }
  },
  'geomagnetic-storm': {
    emoji: '🌐',
    topic: 'sun',
    es: {
      term: 'tormenta geomagnética',
      def: 'Una sacudida del escudo magnético de la Tierra, sobre todo al llegar una nube de plasma. Puede traer auroras.',
      example: 'Es como un terremoto, pero en el escudo magnético de la Tierra.'
    },
    en: {
      term: 'geomagnetic storm',
      def: 'A shake-up of Earth’s magnetic shield, mostly when a plasma cloud arrives. It can bring auroras.',
      example: 'It is like an earthquake, but in Earth’s magnetic shield.'
    },
    source: { label: 'NOAA SWPC · Geomagnetic storms', url: 'https://www.swpc.noaa.gov/phenomena/geomagnetic-storms' }
  },
  aurora: {
    emoji: '🌌',
    topic: 'sun',
    es: {
      term: 'aurora',
      def: 'Luces de colores en el cielo, sobre todo cerca de los polos. Las encienden partículas que chocan con el aire.',
      example: 'Es como un espectáculo de luces que pinta el cielo de verde y rosa.'
    },
    en: {
      term: 'aurora',
      def: 'Coloured lights in the sky, mostly near the poles. Particles crashing into the air switch them on.',
      example: 'It is like a light show that paints the sky green and pink.'
    },
    source: { label: 'NOAA SWPC · Aurora', url: 'https://www.swpc.noaa.gov/phenomena/aurora' }
  },
  'kp-index': {
    emoji: '📈',
    topic: 'sun',
    es: {
      term: 'índice Kp',
      def: 'Un número del 0 al 9 que dice lo fuerte que es una tormenta magnética. El 9 es el máximo.',
      example: 'Es como la escala de picante de una salsa: del 0 al 9.'
    },
    en: {
      term: 'Kp index',
      def: 'A number from 0 to 9 that says how strong a magnetic storm is. The top is 9.',
      example: 'It is like the spice scale on a hot sauce, from 0 to 9.'
    },
    source: { label: 'NOAA SWPC · Planetary K-index', url: 'https://www.swpc.noaa.gov/products/planetary-k-index' }
  },
  'wsa-enlil': {
    emoji: '🖥️',
    topic: 'sun',
    es: {
      term: 'WSA-Enlil',
      def: 'Un programa de ordenador que calcula cuándo llegará una nube de plasma a la Tierra o a Marte.',
      example: 'Es como un GPS que calcula cuándo llegará la nube.'
    },
    en: {
      term: 'WSA-Enlil',
      def: 'A computer program that works out when a plasma cloud will reach Earth or Mars.',
      example: 'It is like a GPS app working out when the cloud arrives.'
    },
    source: { label: 'NOAA SWPC · WSA-Enlil solar wind prediction', url: 'https://www.swpc.noaa.gov/products/wsa-enlil-solar-wind-prediction' }
  },
  donki: {
    emoji: '🗂️',
    topic: 'sun',
    es: {
      term: 'DONKI',
      def: 'La base de datos de la NASA sobre el clima espacial. Apunta llamaradas, nubes de plasma y tormentas.',
      example: 'Es como un diario donde la NASA apunta cada rabieta del Sol.'
    },
    en: {
      term: 'DONKI',
      def: 'NASA’s space-weather database. It records flares, plasma clouds and storms.',
      example: 'It is like a diary where NASA notes down every solar tantrum.'
    },
    source: { label: 'NASA CCMC · DONKI', url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/' }
  },

  // ---------- The Moon and exploration ----------
  'south-pole': {
    emoji: '🧭',
    topic: 'moon',
    es: {
      term: 'polo sur',
      def: 'La zona más al sur de la Luna. El Sol va rozando el horizonte y hay cráteres siempre a oscuras.',
      example: 'Es como un atardecer que dura casi para siempre.'
    },
    en: {
      term: 'south pole',
      def: 'The part of the Moon that is farthest south. The Sun skims the horizon, and some craters are always dark.',
      example: 'It is like a sunset that lasts almost forever.'
    },
    source: { label: 'NASA · The Lunar South Pole Region', url: 'https://www.nasa.gov/reference/moonbase-environment/' }
  },
  regolith: {
    emoji: '🪨',
    topic: 'moon',
    es: {
      term: 'regolito',
      def: 'El polvo y las piedrecitas que cubren la Luna. Sus granos son afilados y se pegan a todo.',
      example: 'Es como arena de playa, pero áspera como la lija.'
    },
    en: {
      term: 'regolith',
      def: 'The dust and tiny stones covering the Moon. Its grains are sharp and stick to everything.',
      example: 'It is like beach sand, but rough like sandpaper.'
    },
    source: { label: 'NASA · What hazards are caused by lunar regolith?', url: 'https://science.nasa.gov/biological-physical/what-hazards-are-caused-by-lunar-regolith/' }
  },
  crater: {
    emoji: '🕳️',
    topic: 'moon',
    es: {
      term: 'cráter',
      def: 'Un hoyo redondo que deja una roca espacial al chocar. La Luna tiene muchísimos porque casi no tiene aire.',
      example: 'Es como la marca que deja una piedra al caer en la arena.'
    },
    en: {
      term: 'crater',
      def: 'A round hole left when a space rock crashes. The Moon has loads because it has almost no air.',
      example: 'It is like the dent a stone makes when it drops into sand.'
    }
  },
  psr: {
    emoji: '🌑',
    topic: 'moon',
    es: {
      term: 'cráter en sombra permanente',
      def: 'Un cráter del polo con el fondo siempre a oscuras. Allí hace muchísimo frío y puede haber hielo.',
      example: 'Es como el rincón de un congelador al que nunca llega la luz.'
    },
    en: {
      term: 'permanently shadowed crater',
      def: 'A polar crater whose floor is always dark. It is freezing cold there, and there can be ice.',
      example: 'It is like a corner of a freezer that light never reaches.'
    },
    source: { label: 'NASA · Moon’s South Pole is full of mystery', url: 'https://www.nasa.gov/humans-in-space/moons-south-pole-is-full-of-mystery-science-intrigue/' }
  },
  'water-ice': {
    emoji: '🧊',
    topic: 'moon',
    es: {
      term: 'hielo de agua',
      def: 'Agua congelada escondida en los cráteres más fríos del polo. Sirve para beber, regar y fabricar oxígeno.',
      example: 'Es como el hielo del congelador, pero mezclado con polvo lunar.'
    },
    en: {
      term: 'water ice',
      def: 'Frozen water hidden in the coldest polar craters. It can be used for drinking, watering plants and making oxygen.',
      example: 'It is like ice from your freezer, mixed with Moon dust.'
    },
    source: { label: 'NASA · Moon water and ices', url: 'https://science.nasa.gov/moon/moon-water-and-ices/' }
  },
  'lunar-gravity': {
    emoji: '🪶',
    topic: 'moon',
    es: {
      term: 'gravedad lunar',
      def: 'La fuerza que te atrae hacia el suelo de la Luna. Es la sexta parte de la de la Tierra.',
      example: 'Es como saltar a cámara lenta, igual que en los vídeos del Apolo.'
    },
    en: {
      term: 'lunar gravity',
      def: 'The force pulling you down to the Moon’s ground. It is one sixth of Earth’s.',
      example: 'It is like jumping in slow motion, just like in the Apollo videos.'
    },
    source: { label: 'NASA · Moon facts', url: 'https://science.nasa.gov/moon/facts/' }
  },
  anorthosite: {
    emoji: '⚪',
    topic: 'moon',
    es: {
      term: 'anortosita',
      def: 'Una roca blanca de la primera corteza lunar. Por ella, las zonas altas de la Luna se ven claras.',
      example: 'Es como la nata que sube y flota encima de la leche.'
    },
    en: {
      term: 'anorthosite',
      def: 'A white rock from the Moon’s first crust. It is why the lunar highlands look bright.',
      example: 'It is like cream that rises and floats on top of milk.'
    },
    source: { label: 'NASA Astromaterials · Anorthosite', url: 'https://curator.jsc.nasa.gov/education/diskdetails.cfm?disk=18&class=Anorthosite' }
  },
  breccia: {
    emoji: '🧩',
    topic: 'moon',
    es: {
      term: 'brecha de impacto',
      def: 'Una roca hecha de trozos de otras rocas, rotos por meteoritos y pegados por el calor del choque.',
      example: 'Es como un turrón de almendras, pero con trozos de roca.'
    },
    en: {
      term: 'impact breccia',
      def: 'A rock made of bits of other rocks, broken by meteorites and stuck together by the crash’s heat.',
      example: 'It is like a nut chocolate bar, but with bits of rock.'
    },
    source: { label: 'NASA Astromaterials · Breccia', url: 'https://curator.jsc.nasa.gov/education/diskdetails.cfm?disk=21&class=Breccia' }
  },
  micrometeorite: {
    emoji: '✨',
    topic: 'moon',
    es: {
      term: 'micrometeorito',
      def: 'Un granito de roca espacial, más pequeño que una cabeza de alfiler. Choca más rápido que una bala.',
      example: 'Es como un grano de arena lanzado a toda velocidad.'
    },
    en: {
      term: 'micrometeorite',
      def: 'A speck of space rock, smaller than a pinhead. It hits the Moon faster than a bullet.',
      example: 'It is like a grain of sand flying at top speed.'
    },
    source: { label: 'NASA · LADEE results', url: 'https://science.nasa.gov/mission/ladee/outcome/' }
  },
  sample: {
    emoji: '🧪',
    topic: 'moon',
    es: {
      term: 'muestra',
      def: 'Un trocito de roca, polvo o hielo que se recoge para estudiarlo. En el juego, tus Rocas son muestras.',
      example: 'Es como una pieza de un puzle que ayuda a entender la Luna.'
    },
    en: {
      term: 'sample',
      def: 'A small piece of rock, dust or ice collected to study. In the game, your Rocks are samples.',
      example: 'It is like a puzzle piece that helps explain the Moon.'
    }
  },
  isru: {
    emoji: '⛏️',
    topic: 'moon',
    es: {
      term: 'ISRU',
      def: 'Usar lo que ya hay en la Luna, como hielo o rocas, en vez de traerlo de la Tierra.',
      example: 'Es como cocinar con lo que hay en la nevera, sin ir a comprar.'
    },
    en: {
      term: 'ISRU',
      def: 'Using what is already on the Moon, like ice or rocks, instead of bringing it from Earth.',
      example: 'It is like cooking with what is in the fridge instead of going shopping.'
    },
    source: { label: 'NASA · In-Situ Resource Utilization', url: 'https://www.nasa.gov/overview-in-situ-resource-utilization/' }
  },
  rover: {
    emoji: '🚙',
    topic: 'moon',
    es: {
      term: 'Rover',
      def: 'Un vehículo para explorar otro mundo. Puede llevar personas o ir solo, como un robot.',
      example: 'Es como un coche todoterreno, pero preparado para la Luna.'
    },
    en: {
      term: 'Rover',
      def: 'A vehicle for exploring another world. It can carry people or drive itself, like a robot.',
      example: 'It is like an off-road car, built for the Moon.'
    },
    source: { label: 'NASA · Moon Base rovers update', url: 'https://www.nasa.gov/missions/moon-base/nasa-provides-progress-update-on-moon-base-rovers/' }
  },
  orbit: {
    emoji: '🪐',
    topic: 'moon',
    es: {
      term: 'órbita',
      def: 'El camino que sigue algo al dar vueltas alrededor de algo más grande, como la Luna alrededor de la Tierra.',
      example: 'Es como hacer girar una pelota atada a una cuerda.'
    },
    en: {
      term: 'orbit',
      def: 'The path something follows as it goes round and round something bigger, like the Moon around Earth.',
      example: 'It is like swinging a ball round and round on a string.'
    }
  },
  lro: {
    emoji: '🌕',
    topic: 'moon',
    es: {
      term: 'LRO',
      def: 'Una nave de la NASA que da vueltas a la Luna desde 2009. Hace mapas y mide la radiación.',
      example: 'Es como un dron que vigila la Luna desde arriba.'
    },
    en: {
      term: 'LRO',
      def: 'A NASA spacecraft circling the Moon since 2009. It makes maps and measures radiation.',
      example: 'It is like a drone watching over the Moon from above.'
    },
    source: { label: 'NASA · Lunar Reconnaissance Orbiter', url: 'https://science.nasa.gov/mission/lro/' }
  },
  iss: {
    emoji: '🛰️',
    topic: 'moon',
    es: {
      term: 'Estación Espacial Internacional',
      def: 'Un laboratorio que da 16 vueltas a la Tierra al día. Vuela dentro del escudo magnético de la Tierra.',
      example: 'Es como una casa con laboratorio que vuela alrededor de la Tierra.'
    },
    en: {
      term: 'International Space Station',
      def: 'A lab that circles Earth 16 times a day. It flies inside Earth’s magnetic shield.',
      example: 'It is like a house with a lab, flying around Earth.'
    },
    source: { label: 'NASA · Space Station facts and figures', url: 'https://www.nasa.gov/international-space-station/space-station-facts-and-figures/' }
  },
  artemis: {
    emoji: '🚀',
    topic: 'moon',
    es: {
      term: 'Artemis',
      def: 'El programa de la NASA para volver a la Luna con astronautas y crear una base cerca del polo sur.',
      example: 'Es como una gran excursión en varias etapas hasta la Luna.'
    },
    en: {
      term: 'Artemis',
      def: 'NASA’s program to send astronauts back to the Moon and build a base near the south pole.',
      example: 'It is like a big school trip to the Moon, in several stages.'
    },
    source: { label: 'NASA · Artemis', url: 'https://www.nasa.gov/humans-in-space/artemis/' }
  },
  mars: {
    emoji: '🔴',
    topic: 'moon',
    es: {
      term: 'Marte',
      def: 'El cuarto planeta desde el Sol. Tiene muy poco aire y casi ningún escudo magnético.',
      example: 'Es como un desierto rojo y helado, muy lejos de casa.'
    },
    en: {
      term: 'Mars',
      def: 'The fourth planet from the Sun. It has very thin air and almost no magnetic shield.',
      example: 'It is like a red, frozen desert, very far from home.'
    },
    source: { label: 'NASA · Mars facts', url: 'https://science.nasa.gov/mars/facts/' }
  },
  sol: {
    emoji: '🌅',
    topic: 'moon',
    es: {
      term: 'sol',
      def: 'Un día de Marte. Dura 24 horas y 39 minutos: un poco más que un día de la Tierra.',
      example: 'Es como un día de la Tierra con casi 40 minutos de regalo.'
    },
    en: {
      term: 'sol',
      def: 'A day on Mars. It lasts 24 hours and 39 minutes: a bit longer than an Earth day.',
      example: 'It is like an Earth day with almost 40 bonus minutes.'
    },
    source: { label: 'NASA · Spirit’s 1,000th sol', url: 'https://www.nasa.gov/image-article/barsoom/' }
  },
  curiosity: {
    emoji: '🤖',
    topic: 'moon',
    es: {
      term: 'Curiosity',
      def: 'Un rover de la NASA que explora Marte desde 2012. También mide la radiación que llega al suelo.',
      example: 'Es como un científico robot del tamaño de un coche.'
    },
    en: {
      term: 'Curiosity',
      def: 'A NASA rover exploring Mars since 2012. It also measures the radiation reaching the ground.',
      example: 'It is like a robot scientist the size of a car.'
    },
    source: { label: 'NASA · Curiosity rover', url: 'https://science.nasa.gov/mission/msl-curiosity/' }
  },
  osdr: {
    emoji: '🗄️',
    topic: 'moon',
    es: {
      term: 'OSDR',
      def: 'El archivo abierto de la NASA con datos de experimentos en el espacio. Cualquiera puede consultarlo.',
      example: 'Es como una biblioteca pública llena de experimentos espaciales.'
    },
    en: {
      term: 'OSDR',
      def: 'NASA’s open archive of data from experiments in space. Anyone can explore it.',
      example: 'It is like a public library full of space experiments.'
    },
    source: { label: 'NASA · Open Science Data Repository', url: 'https://science.nasa.gov/biological-physical/data/osdr/' }
  }
};
