// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// "¿Sabías que…?" / "Did you know…?" facts of "Sol a Sol": short, true and with their source (checked link).
// Shape: { id, emoji, topic, tags: [...], text: { es, en }, source: { label, url }, tag? }
//   · text:  kid language (docs/DESIGN.md §4): 1–2 sentences, one idea, at most 25 words, rounded numbers compared
//            with familiar things, no units such as km/s or mSv. Technical words go in glossary pills [[id|text]].
//   · topic: the Discovery Journal chapter (TOPICS ids in content/discoveries.js):
//            energy · radiation · life · comms · sun · moon.
//   · tags:  moments when the UI may pick the fact (ModulePanel, NightReport):
//            storm, calm, radiation, iss, mars, moon, food, water, energy, rover, ice, health, forecast, sun, general.
//   · tag:   data label. 'ARCHIVO' = real data of the May 2024 storm (DONKI, RadLab or NASA telling it);
//            'NASA' = science published by NASA (or by the team of a NASA instrument); 'CALCULADO' = worked out by the
//            game with official formulas (JPL). No tag = a number from another official source (Spain's nuclear safety
//            council CSN, the Canadian Space Agency, NOAA): its link says where it comes from.

const DONKI = 'https://ccmc.gsfc.nasa.gov/tools/DONKI/';
const RADLAB = 'https://visualization.osdr.nasa.gov/radlab/gui/';
const STORMS = 'https://science.nasa.gov/sun/solar-storms-and-flares/';
const MAY_STORM = 'https://science.nasa.gov/science-research/heliophysics/what-nasa-is-learning-from-the-biggest-geomagnetic-storm-in-20-years/';
const MARS_STORM = 'https://www.nasa.gov/solar-system/planets/mars/nasa-watches-mars-light-up-during-epic-solar-storm/';
const STD3001 = 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf';
const BVAD = 'https://ntrs.nasa.gov/citations/20210024855';
const ISS_FACTS = 'https://www.nasa.gov/international-space-station/space-station-facts-and-figures/';
const MOON_FACTS = 'https://science.nasa.gov/moon/facts/';
const ROVERS = 'https://www.nasa.gov/missions/moon-base/nasa-provides-progress-update-on-moon-base-rovers/';
const REGOLITH = 'https://science.nasa.gov/biological-physical/what-hazards-are-caused-by-lunar-regolith/';
const HUMAN_BODY = 'https://www.nasa.gov/humans-in-space/the-human-body-in-space/';
const SHADOWS = 'https://science.nasa.gov/resource/shadows-near-the-moons-south-pole/';

const src = (label, url) => ({ label, url });

export const FACTS = [
  // ---------- The real storm of May 2024 (ARCHIVO) ----------
  {
    id: 'may24-18-x-flares',
    emoji: '⚡',
    topic: 'sun',
    tags: ['storm', 'sun'],
    text: {
      es: 'Del 1 al 21 de mayo de 2024, el Sol lanzó 18 [[x-class|llamaradas muy fuertes]]. ¡Doce salieron de la misma [[active-region|zona activa]]!',
      en: 'From 1 to 21 May 2024, the Sun fired 18 [[x-class|very strong flares]]. Twelve of them came from the same [[active-region|active region]]!'
    },
    source: src('NASA CCMC · DONKI', DONKI),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-x8-7',
    emoji: '💥',
    topic: 'sun',
    tags: ['storm', 'sun'],
    text: {
      es: 'El 14 de mayo de 2024, el Sol lanzó una [[x-class|llamarada]] enorme: ¡la más fuerte en varios años!',
      en: 'On 14 May 2024, the Sun fired a huge [[x-class|flare]]: the strongest in several years!'
    },
    source: src('NASA · How NASA tracked the most intense solar storm in decades', 'https://science.nasa.gov/science-research/heliophysics/how-nasa-tracked-the-most-intense-solar-storm-in-decades/'),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-quiet-x4-5',
    emoji: '🤔',
    topic: 'radiation',
    tags: ['calm', 'sun', 'radiation'],
    text: {
      es: 'No todas las [[flare|llamaradas]] suben la radiación: el 6 de mayo de 2024 hubo una muy fuerte y cerca de la Luna no subió.',
      en: 'Not every [[flare|flare]] raises radiation: on 6 May 2024 there was a very strong one, and near the Moon it did not go up.'
    },
    source: src('NASA CCMC DONKI · X4.5 flare', 'https://ccmc.gsfc.nasa.gov/DONKI/view/FLR/30484/-1'),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-g4-watch',
    emoji: '📢',
    topic: 'comms',
    tags: ['forecast', 'storm'],
    text: {
      es: 'El 9 de mayo de 2024, los vigilantes del Sol avisaron de una [[geomagnetic-storm|tormenta magnética]] muy fuerte. ¡No daban un aviso así desde 2005!',
      en: 'On 9 May 2024, Sun watchers warned of a very strong [[geomagnetic-storm|magnetic storm]]. They had not given a warning like that since 2005!'
    },
    source: src('NOAA SWPC · First G4 watch since 2005', 'https://www.swpc.noaa.gov/news/swpc-issues-its-first-g4-watch-2005'),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-enlil-48h',
    emoji: '🎯',
    topic: 'comms',
    tags: ['forecast', 'storm'],
    text: {
      es: 'El 8 de mayo de 2024, una [[forecast|previsión]] dijo que una [[cme|nube de plasma]] llegaría en 2 días. ¡Falló solo por unas 4 horas!',
      en: 'On 8 May 2024, a [[forecast|forecast]] said a [[cme|plasma cloud]] would arrive in 2 days. It was only about 4 hours off!'
    },
    source: src('NASA CCMC DONKI · WSA-Enlil simulation', 'https://ccmc.gsfc.nasa.gov/DONKI/view/WSA-ENLIL/30576/-1'),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-false-alarm',
    emoji: '🤷',
    topic: 'comms',
    tags: ['forecast'],
    text: {
      es: 'El 13 de mayo de 2024, una [[forecast|previsión]] anunció una [[cme|nube de plasma]] que nunca llegó. ¡A veces las previsiones fallan!',
      en: 'On 13 May 2024, a [[forecast|forecast]] announced a [[cme|plasma cloud]] that never came. Forecasts sometimes get it wrong!'
    },
    source: src('NASA CCMC DONKI · WSA-Enlil simulation', 'https://ccmc.gsfc.nasa.gov/DONKI/view/WSA-ENLIL/30801/-1'),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-kp9',
    emoji: '🌐',
    topic: 'sun',
    tags: ['storm', 'general'],
    text: {
      es: 'El 11 de mayo de 2024, la [[geomagnetic-storm|tormenta magnética]] llegó a 9 sobre 9: ¡la más fuerte en la Tierra en 20 años!',
      en: 'On 11 May 2024, the [[geomagnetic-storm|magnetic storm]] reached 9 out of 9: the strongest on Earth in 20 years!'
    },
    source: src('NASA · What NASA is learning from the biggest geomagnetic storm in 20 years', MAY_STORM),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-auroras',
    emoji: '🌌',
    topic: 'sun',
    tags: ['storm', 'general'],
    text: {
      es: 'Durante la gran tormenta de mayo de 2024 se vieron [[aurora|auroras]] mucho más al sur de lo normal, ¡incluso en España!',
      en: 'During the great storm of May 2024, [[aurora|auroras]] were seen much farther south than usual — even in Spain!'
    },
    source: src('NASA · What NASA is learning from the biggest geomagnetic storm in 20 years', MAY_STORM),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-flights',
    emoji: '✈️',
    topic: 'comms',
    tags: ['storm', 'general'],
    text: {
      es: 'Durante la gran tormenta de mayo de 2024, muchos aviones cambiaron de ruta para evitar radiación y fallos de radio.',
      en: 'During the great storm of May 2024, many planes changed course to avoid radiation and radio problems.'
    },
    source: src('NASA · What NASA is learning from the biggest geomagnetic storm in 20 years', MAY_STORM),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-satellite-drag',
    emoji: '🛰️',
    topic: 'sun',
    tags: ['storm', 'general'],
    text: {
      es: 'La tormenta de mayo de 2024 hinchó lo más alto del aire de la Tierra, y miles de satélites notaron que el aire los frenaba.',
      en: 'The May 2024 storm puffed up the top of Earth’s air, and thousands of satellites felt it slowing them down.'
    },
    source: src('NASA · What NASA is learning from the biggest geomagnetic storm in 20 years', MAY_STORM),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-moon-peak',
    emoji: '📈',
    topic: 'radiation',
    tags: ['radiation', 'storm', 'moon'],
    text: {
      es: 'El 14 de mayo de 2024, cerca de la Luna hubo unas 300 veces la radiación de un día normal: ¡el pico de la tormenta!',
      en: 'On 14 May 2024, near the Moon there was about 300 times the radiation of a normal day: the peak of the storm!'
    },
    source: src('NASA OSDR · RadLab', RADLAB),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-iss-calm',
    emoji: '🛰️',
    topic: 'radiation',
    tags: ['iss', 'radiation', 'storm'],
    text: {
      es: 'En la gran tormenta de 2024, la [[iss|Estación Espacial]] casi no notó la radiación extra: la protegía el [[magnetosphere|escudo magnético de la Tierra]].',
      en: 'In the great storm of 2024, the [[iss|Space Station]] barely noticed the extra radiation: [[magnetosphere|Earth’s magnetic shield]] protected it.'
    },
    source: src('NASA OSDR · RadLab', RADLAB),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-biosentinel',
    emoji: '🧫',
    topic: 'radiation',
    tags: ['radiation', 'storm'],
    text: {
      es: 'Del 11 al 14 de mayo de 2024, la pequeña nave [[biosentinel|BioSentinel]], lejos de la Tierra, midió decenas de veces más radiación de lo normal.',
      en: 'From 11 to 14 May 2024, the small [[biosentinel|BioSentinel]] spacecraft, far from Earth, measured tens of times more radiation than normal.'
    },
    source: src('NASA · BioSentinel studies solar radiation as Earth watches aurora', 'https://www.nasa.gov/general/nasas-biosentinel-studies-solar-radiation-as-earth-watches-aurora/'),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-calm-days',
    emoji: '😌',
    topic: 'radiation',
    tags: ['calm', 'radiation', 'moon'],
    text: {
      es: 'Incluso en mayo de 2024, el mes de la gran tormenta, 13 de los 21 días fueron tranquilos cerca de la Luna.',
      en: 'Even in May 2024, the month of the great storm, 13 of the 21 days were calm near the Moon.'
    },
    source: src('NASA OSDR · RadLab', RADLAB),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-back-to-normal',
    emoji: '🌤️',
    topic: 'radiation',
    tags: ['calm', 'radiation'],
    text: {
      es: 'Las tormentas pasan: desde el 18 de mayo de 2024, la radiación cerca de la Luna volvió a ser baja.',
      en: 'Storms pass: from 18 May 2024, radiation near the Moon was low again.'
    },
    source: src('NASA OSDR · RadLab', RADLAB),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-mars-x12',
    emoji: '🌞',
    topic: 'sun',
    tags: ['mars', 'sun'],
    text: {
      es: 'El 20 de mayo de 2024, una [[flare|llamarada]] gigante salió de la cara del Sol que no vemos y alcanzó [[mars|Marte]].',
      en: 'On 20 May 2024, a giant [[flare|flare]] burst from the side of the Sun we cannot see and reached [[mars|Mars]].'
    },
    source: src('NASA · NASA watches Mars light up during epic solar storm', MARS_STORM),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-mars-xrays',
    emoji: '🩻',
    topic: 'radiation',
    tags: ['mars', 'health', 'radiation'],
    text: {
      es: 'Un astronauta junto a [[curiosity|Curiosity]] el 20 de mayo de 2024 habría recibido tanta radiación como en 30 radiografías de pecho.',
      en: 'An astronaut next to [[curiosity|Curiosity]] on 20 May 2024 would have got as much radiation as 30 chest X-rays.'
    },
    source: src('NASA · NASA watches Mars light up during epic solar storm', MARS_STORM),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-mars-auroras',
    emoji: '🟣',
    topic: 'sun',
    tags: ['mars', 'storm'],
    text: {
      es: 'La tormenta de mayo de 2024 también encendió [[aurora|auroras]] en [[mars|Marte]]. ¡Una nave de la NASA las vio en el lado de noche del planeta!',
      en: 'The May 2024 storm lit up [[aurora|auroras]] on [[mars|Mars]] too. A NASA spacecraft saw them on the planet’s night side!'
    },
    source: src('NASA · NASA watches Mars light up during epic solar storm', MARS_STORM),
    tag: 'ARCHIVO'
  },
  {
    id: 'may24-fastest-cme',
    emoji: '🚀',
    topic: 'sun',
    tags: ['sun', 'storm'],
    text: {
      es: 'La [[cme|nube de plasma]] más rápida de la gran tormenta de 2024 iría de la Tierra a la Luna en menos de 3 minutos.',
      en: 'The fastest [[cme|plasma cloud]] of the great storm of 2024 could fly from Earth to the Moon in under 3 minutes.'
    },
    source: src('NASA CCMC DONKI · CME, 20 May 2024', 'https://ccmc.gsfc.nasa.gov/DONKI/view/CME/31034/-1'),
    tag: 'ARCHIVO'
  },

  // ---------- The Sun ----------
  {
    id: 'sun-flare-classes',
    emoji: '🔤',
    topic: 'sun',
    tags: ['sun', 'storm'],
    text: {
      es: 'Las [[flare|llamaradas]] se ordenan con letras: A, B, C, M y X. ¡Cada letra es 10 veces más fuerte que la anterior!',
      en: '[[flare|Flares]] are sorted by letters: A, B, C, M and X. Each letter is 10 times stronger than the one before!'
    },
    source: src('NASA · Solar storms and flares', STORMS),
    tag: 'NASA'
  },
  {
    id: 'sun-flare-8-minutes',
    emoji: '⏱️',
    topic: 'sun',
    tags: ['sun', 'general'],
    text: {
      es: 'La luz de una [[flare|llamarada]] tarda unos 8 minutos en llegar a la Tierra. ¡Cuando la vemos, ya está aquí!',
      en: 'The light of a [[flare|flare]] takes about 8 minutes to reach Earth. By the time we see it, it is already here!'
    },
    source: src('NASA · Solar storms and flares', STORMS),
    tag: 'NASA'
  },
  {
    id: 'sun-record-flare',
    emoji: '🏆',
    topic: 'sun',
    tags: ['sun', 'storm'],
    text: {
      es: 'La llamarada más fuerte jamás medida fue en 2003. ¡Era tan potente que los aparatos no pudieron medirla entera!',
      en: 'The strongest flare ever measured happened in 2003. It was so powerful that the instruments could not measure all of it!'
    },
    source: src('NASA · Solar storms and flares', STORMS),
    tag: 'NASA'
  },
  {
    id: 'sun-fast-particles',
    emoji: '🏎️',
    topic: 'radiation',
    tags: ['storm', 'radiation', 'forecast'],
    text: {
      es: 'Las [[sep|partículas]] más rápidas del Sol llegan a la Tierra en unos 30 minutos. ¡Un avión tardaría casi 20 años!',
      en: 'The fastest [[sep|particles]] from the Sun reach Earth in about 30 minutes. A plane would take almost 20 years!'
    },
    source: src('NASA · Solar storms and flares', STORMS),
    tag: 'NASA'
  },
  {
    id: 'sun-cme-travel',
    emoji: '☁️',
    topic: 'sun',
    tags: ['storm', 'forecast', 'sun'],
    text: {
      es: 'Una [[cme|nube de plasma]] puede llegar a la Tierra en solo 15 horas. ¡Las más lentas tardan varios días!',
      en: 'A [[cme|plasma cloud]] can reach Earth in just 15 hours. The slowest ones take several days!'
    },
    source: src('NASA · Solar storms and flares', STORMS),
    tag: 'NASA'
  },
  {
    id: 'sun-rotation',
    emoji: '🔄',
    topic: 'sun',
    tags: ['sun'],
    text: {
      es: 'El Sol gira: tarda unos 25 días en dar una vuelta. Por eso una misma zona puede disparar a la Tierra y luego a [[mars|Marte]].',
      en: 'The Sun spins: it takes about 25 days to turn once. So the same spot can fire at Earth first and at [[mars|Mars]] later.'
    },
    source: src('NASA · Sun facts', 'https://science.nasa.gov/sun/facts/'),
    tag: 'NASA'
  },
  {
    id: 'sun-sunspots',
    emoji: '⚫',
    topic: 'sun',
    tags: ['sun', 'calm'],
    text: {
      es: 'Las [[sunspot|manchas solares]] se ven oscuras porque son zonas del Sol un poco más frías que las de alrededor.',
      en: '[[sunspot|Sunspots]] look dark because they are parts of the Sun a little cooler than the areas around them.'
    },
    source: src('NASA · Sunspots', 'https://science.nasa.gov/sun/sunspots/'),
    tag: 'NASA'
  },
  {
    id: 'sun-solar-wind',
    emoji: '🌬️',
    topic: 'sun',
    tags: ['sun', 'calm'],
    text: {
      es: 'Aunque no haya tormenta, el Sol siempre sopla un [[solar-wind|viento]] de partículas diminutas en todas direcciones.',
      en: 'Even with no storm, the Sun always blows a [[solar-wind|wind]] of tiny particles in every direction.'
    },
    source: src('NASA · What is the solar wind?', 'https://science.nasa.gov/sun/what-is-the-solar-wind/'),
    tag: 'NASA'
  },
  {
    id: 'sun-cycle',
    emoji: '🔁',
    topic: 'sun',
    tags: ['sun', 'general'],
    text: {
      es: 'El Sol pasa por épocas tranquilas y movidas cada 11 años, más o menos. En 2024 llegó a su época más movida.',
      en: 'The Sun goes through calm and busy times every 11 years or so. In 2024 it reached its busiest time.'
    },
    source: src('NASA · NASA, NOAA: Sun reaches maximum phase in 11-year solar cycle', 'https://science.nasa.gov/science-research/heliophysics/nasa-noaa-sun-reaches-maximum-phase-in-11-year-solar-cycle/'),
    tag: 'NASA'
  },
  {
    id: 'earth-protected',
    emoji: '🌍',
    topic: 'radiation',
    tags: ['storm', 'general', 'calm'],
    text: {
      es: 'En el suelo de la Tierra, las tormentas solares no nos hacen daño: nos protegen el [[magnetosphere|escudo magnético]] y el aire.',
      en: 'On the ground on Earth, solar storms do not harm us: [[magnetosphere|Earth’s magnetic shield]] and the air protect us.'
    },
    source: src('NASA · Solar storms and flares', STORMS),
    tag: 'NASA'
  },
  {
    id: 'donki-anyone',
    emoji: '🗂️',
    topic: 'sun',
    tags: ['forecast', 'general'],
    text: {
      es: 'La NASA apunta cada [[flare|llamarada]] y cada tormenta del Sol en una lista pública, [[donki|DONKI]]. ¡Este juego usa esa lista!',
      en: 'NASA writes down every [[flare|flare]] and storm of the Sun in a public list, [[donki|DONKI]]. This game uses that list!'
    },
    source: src('NASA CCMC · DONKI', DONKI),
    tag: 'NASA'
  },

  // ---------- Radiation and health ----------
  {
    id: 'rad-normal-day',
    emoji: '🌠',
    topic: 'radiation',
    tags: ['calm', 'radiation'],
    text: {
      es: 'Aunque el Sol esté tranquilo, siempre llegan [[cosmic-ray|rayos cósmicos]] de muy lejos, de fuera del sistema solar.',
      en: 'Even when the Sun is calm, [[cosmic-ray|cosmic rays]] always arrive from far away, from outside the solar system.'
    },
    source: src('NASA · Why space radiation matters', 'https://www.nasa.gov/missions/analog-field-testing/why-space-radiation-matters/'),
    tag: 'NASA'
  },
  {
    id: 'rad-shielding',
    emoji: '🛡️',
    topic: 'radiation',
    tags: ['radiation', 'storm', 'health'],
    text: {
      es: 'Unas paredes de metal o plástico frenan la mitad de la radiación de una tormenta solar. ¡Los [[cosmic-ray|rayos cósmicos]] casi las atraviesan!',
      en: 'Metal or plastic walls stop half the radiation of a solar storm. [[cosmic-ray|Cosmic rays]] go almost straight through!'
    },
    source: src('NASA-STD-3001 · Radiation protection technical brief', STD3001),
    tag: 'NASA'
  },
  {
    id: 'rad-water-shelter',
    emoji: '💧',
    topic: 'radiation',
    tags: ['water', 'storm', 'radiation'],
    text: {
      es: '¡El agua frena la radiación! Por eso un refugio espacial se puede proteger poniendo depósitos de agua alrededor.',
      en: 'Water blocks radiation! That is why a space shelter can be protected by putting water tanks around it.'
    },
    source: src('NASA-STD-3001 · Radiation protection technical brief', STD3001),
    tag: 'NASA'
  },
  {
    id: 'rad-career-limit',
    emoji: '🧮',
    topic: 'radiation',
    tags: ['health', 'radiation'],
    text: {
      es: 'La NASA vigila cuánta radiación recibe cada astronauta. Hay un límite para toda su carrera: si lo alcanza, ya no vuela más.',
      en: 'NASA keeps track of how much radiation each astronaut gets. There is a limit for their whole career: reach it, and no more flights.'
    },
    source: src('NASA-STD-3001 · Radiation protection technical brief', STD3001),
    tag: 'NASA'
  },
  {
    id: 'rad-lunar-surface',
    emoji: '🌕',
    topic: 'radiation',
    tags: ['moon', 'radiation'],
    text: {
      es: 'En el suelo de la Luna recibes menos radiación que flotando en el espacio: ¡la propia Luna te tapa por debajo!',
      en: 'On the Moon’s ground you get less radiation than floating in space: the Moon itself shields you from below!'
    },
    source: src('NASA-STD-3001 · Radiation protection technical brief', STD3001),
    tag: 'NASA'
  },
  {
    id: 'rad-spain',
    emoji: '🇪🇸',
    topic: 'radiation',
    tags: ['radiation', 'calm', 'health'],
    text: {
      es: 'En la Luna recibirías en menos de 2 días tanta radiación como en España en un año entero.',
      en: 'On the Moon you would get as much radiation in under 2 days as in a whole year in Spain.'
    },
    source: src('CSN (Spain) · Dosis de radiación', 'https://www.csn.es/documents/10182/914805/Dosis%20de%20radiaci%C3%B3n')
  },
  {
    id: 'health-bones',
    emoji: '🦴',
    topic: 'life',
    tags: ['health', 'iss'],
    text: {
      es: '[[microgravity|Flotando en el espacio]], los huesos y los músculos se debilitan. ¡Por eso los astronautas hacen ejercicio todos los días!',
      en: '[[microgravity|Floating in space]], bones and muscles get weaker. That is why astronauts exercise every day!'
    },
    source: src('NASA · The human body in space', HUMAN_BODY),
    tag: 'NASA'
  },
  {
    id: 'health-oxygen',
    emoji: '💨',
    topic: 'life',
    tags: ['health', 'general'],
    text: {
      es: 'Un astronauta respira cada día casi 1 kilo de [[oxygen|oxígeno]]: ¡lo que pesa una botella de agua de litro!',
      en: 'An astronaut breathes almost 1 kilogram of [[oxygen|oxygen]] a day: as heavy as a 1-litre bottle of water!'
    },
    source: src('NASA · Life Support Baseline Values and Assumptions Document (2022)', BVAD),
    tag: 'NASA'
  },

  // ---------- Food and water ----------
  {
    id: 'food-per-day',
    emoji: '🥫',
    topic: 'life',
    tags: ['food', 'health'],
    text: {
      es: 'Un astronauta come cada día más de kilo y medio de comida.',
      en: 'An astronaut eats more than one and a half kilograms of food every day.'
    },
    source: src('NASA · Life Support Baseline Values and Assumptions Document (2022)', BVAD),
    tag: 'NASA'
  },
  {
    id: 'water-per-day',
    emoji: '🚰',
    topic: 'life',
    tags: ['water', 'health'],
    text: {
      es: 'Un astronauta necesita unos 3 litros de agua al día para beber y para preparar la comida.',
      en: 'An astronaut needs about 3 litres of water a day to drink and to make food.'
    },
    source: src('NASA · Life Support Baseline Values and Assumptions Document (2022)', BVAD),
    tag: 'NASA'
  },
  {
    id: 'food-lunar-soil',
    emoji: '🌿',
    topic: 'life',
    tags: ['food', 'moon'],
    text: {
      es: 'En 2022, unos científicos plantaron semillas en [[regolith|tierra de la Luna]] traída por el Apolo. ¡Brotaron, pero crecieron despacio!',
      en: 'In 2022, scientists planted seeds in [[regolith|Moon soil]] brought back by Apollo. They sprouted, but grew slowly!'
    },
    source: src('NASA OSDR · Study OSD-476', 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-476'),
    tag: 'NASA'
  },
  {
    id: 'food-veggie',
    emoji: '🥬',
    topic: 'life',
    tags: ['food', 'iss'],
    text: {
      es: 'En el huerto de la [[iss|Estación Espacial]] ya han crecido lechugas, coles y hasta flores.',
      en: 'In the [[iss|Space Station]] garden, lettuce, cabbages and even flowers have already grown.'
    },
    source: src('NASA · Growing plants in space', 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/'),
    tag: 'NASA'
  },
  {
    id: 'food-csa',
    emoji: '🍅',
    topic: 'life',
    tags: ['food', 'water'],
    text: {
      es: 'En una base lunar, las plantas darían comida y [[oxygen|oxígeno]], y además ayudarían a limpiar el agua.',
      en: 'At a Moon base, plants would give food and [[oxygen|oxygen]], and they would also help clean the water.'
    },
    source: src('Canadian Space Agency · Food production toolkit', 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/')
  },
  {
    id: 'water-iss-98',
    emoji: '♻️',
    topic: 'life',
    tags: ['water', 'iss'],
    text: {
      es: 'La [[iss|Estación Espacial]] recicla casi toda su agua: ¡98 de cada 100 gotas, también las del sudor y el pis!',
      en: 'The [[iss|Space Station]] recycles almost all its water: 98 drops out of 100, even from sweat and pee!'
    },
    source: src('NASA · Water recovery milestone on the Space Station', 'https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/'),
    tag: 'NASA'
  },
  {
    id: 'water-oxygen-iss',
    emoji: '🫧',
    topic: 'life',
    tags: ['iss', 'water', 'health'],
    text: {
      es: 'En la [[iss|Estación Espacial]] fabrican [[oxygen|oxígeno]] para respirar separando el agua con electricidad.',
      en: 'On the [[iss|Space Station]], they make [[oxygen|oxygen]] to breathe by splitting water with electricity.'
    },
    source: src('NASA · Environmental Control and Life Support System (ECLSS)', 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/'),
    tag: 'NASA'
  },

  // ---------- Ice ----------
  {
    id: 'ice-coldest',
    emoji: '🥶',
    topic: 'moon',
    tags: ['ice', 'moon'],
    text: {
      es: 'Algunos cráteres del [[south-pole|polo sur]] no ven el Sol desde hace miles de millones de años. ¡Están a más de 200 grados bajo cero!',
      en: 'Some craters at the Moon’s [[south-pole|south pole]] have not seen the Sun for billions of years. They are colder than minus 200 degrees Celsius!'
    },
    source: src('NASA · Moon’s South Pole is full of mystery and science intrigue', 'https://www.nasa.gov/humans-in-space/moons-south-pole-is-full-of-mystery-science-intrigue/'),
    tag: 'NASA'
  },
  {
    id: 'ice-trap',
    emoji: '🧊',
    topic: 'moon',
    tags: ['ice', 'water'],
    text: {
      es: 'El hielo de la Luna se esconde en [[psr|cráteres siempre a oscuras]]. ¡Al sol, desaparecería enseguida!',
      en: 'The Moon’s ice hides in [[psr|craters that are always dark]]. In sunlight, it would vanish at once!'
    },
    source: src('NASA SVS · Shadows near the Moon’s South Pole', SHADOWS),
    tag: 'NASA'
  },
  {
    id: 'ice-lcross',
    emoji: '🎯',
    topic: 'moon',
    tags: ['ice', 'water', 'moon'],
    text: {
      es: 'En 2009, la NASA estrelló a propósito un trozo de cohete contra un cráter lunar. ¡En el polvo que levantó había agua!',
      en: 'In 2009, NASA crashed part of a rocket into a Moon crater on purpose. The dust it threw up had water in it!'
    },
    source: src('NASA · LCROSS mission', 'https://science.nasa.gov/mission/lcross/'),
    tag: 'NASA'
  },
  {
    id: 'ice-uses',
    emoji: '⛽',
    topic: 'moon',
    tags: ['ice', 'water'],
    text: {
      es: 'El [[water-ice|hielo]] de la Luna podría darnos agua para beber, aire para respirar ¡y hasta combustible para cohetes!',
      en: 'Moon [[water-ice|ice]] could give us water to drink, air to breathe and even rocket fuel!'
    },
    source: src('NASA · In-Situ Resource Utilization', 'https://www.nasa.gov/overview-in-situ-resource-utilization/'),
    tag: 'NASA'
  },
  {
    id: 'ice-artemis-landing',
    emoji: '🧭',
    topic: 'moon',
    tags: ['moon', 'ice'],
    text: {
      es: 'La NASA quiere que sus próximos astronautas aterricen cerca del [[south-pole|polo sur]] de la Luna, junto a los cráteres con hielo.',
      en: 'NASA wants its next astronauts to land near the Moon’s [[south-pole|south pole]], close to the icy craters.'
    },
    source: src('NASA · Update on Artemis III Moon landing regions', 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/'),
    tag: 'NASA'
  },

  // ---------- The Moon ----------
  {
    id: 'moon-gravity',
    emoji: '🪶',
    topic: 'moon',
    tags: ['moon', 'health'],
    text: {
      es: 'En la Luna [[lunar-gravity|pesas 6 veces menos]]: si en casa pesas 30 kilos, allí pesarías como 5.',
      en: 'On the Moon [[lunar-gravity|you weigh 6 times less]]: if you weigh 30 kilos at home, there you would weigh about 5.'
    },
    source: src('NASA · Moon facts', MOON_FACTS),
    tag: 'NASA'
  },
  {
    id: 'moon-temperatures',
    emoji: '🌡️',
    topic: 'moon',
    tags: ['moon', 'general'],
    text: {
      es: 'Al sol, el suelo de la Luna está más caliente que el agua hirviendo. ¡A oscuras baja a 170 grados bajo cero!',
      en: 'In sunlight, the Moon’s ground is hotter than boiling water. In the dark it drops to minus 170 degrees!'
    },
    source: src('NASA · Moon facts', MOON_FACTS),
    tag: 'NASA'
  },
  {
    id: 'moon-distance',
    emoji: '📏',
    topic: 'moon',
    tags: ['moon', 'general'],
    text: {
      es: 'Entre la Tierra y la Luna cabrían 30 planetas como el nuestro, puestos en fila.',
      en: 'About 30 planets like ours would fit in a row between Earth and the Moon.'
    },
    source: src('NASA · Moon facts', MOON_FACTS),
    tag: 'NASA'
  },
  {
    id: 'moon-day-night',
    emoji: '🌗',
    topic: 'energy',
    tags: ['moon', 'energy', 'calm'],
    text: {
      es: 'En casi toda la Luna, la noche dura unas 2 semanas: ¡2 semanas sin luz para los [[solar-panel|paneles solares]]!',
      en: 'On most of the Moon, night lasts about 2 weeks: 2 weeks with no light for [[solar-panel|solar panels]]!'
    },
    source: src('NASA · Moon phases', 'https://science.nasa.gov/moon/moon-phases/'),
    tag: 'NASA'
  },
  {
    id: 'moon-polar-sun',
    emoji: '🌄',
    topic: 'moon',
    tags: ['moon', 'energy'],
    text: {
      es: 'En el [[south-pole|polo sur]] de la Luna, el Sol siempre está muy bajito, rozando el horizonte. ¡Las sombras son larguísimas!',
      en: 'At the Moon’s [[south-pole|south pole]], the Sun always stays very low, skimming the horizon. Shadows are super long!'
    },
    source: src('NASA SVS · Shadows near the Moon’s South Pole', SHADOWS),
    tag: 'NASA'
  },
  {
    id: 'moon-light-and-dark',
    emoji: '☀️',
    topic: 'energy',
    tags: ['energy', 'moon'],
    text: {
      es: 'En el polo sur, algunas colinas tienen luz casi siempre y algunos cráteres nunca. ¡Los [[solar-panel|paneles solares]] van en las colinas!',
      en: 'At the south pole, some hills get light almost all the time and some craters never do. [[solar-panel|Solar panels]] go on the hills!'
    },
    source: src('NASA · Moon Base: the lunar South Pole', 'https://www.nasa.gov/reference/moonbase-environment/'),
    tag: 'NASA'
  },
  {
    id: 'moon-micrometeorites',
    emoji: '✨',
    topic: 'moon',
    tags: ['moon', 'general'],
    text: {
      es: 'Los [[micrometeorite|micrometeoritos]] son más pequeños que la cabeza de un alfiler, pero chocan contra la Luna ¡mucho más rápido que una bala!',
      en: '[[micrometeorite|Micrometeorites]] are smaller than a pinhead, but they hit the Moon much faster than a bullet!'
    },
    source: src('NASA · LADEE mission results', 'https://science.nasa.gov/mission/ladee/outcome/'),
    tag: 'NASA'
  },
  {
    id: 'moon-dust-sharp',
    emoji: '🔪',
    topic: 'moon',
    tags: ['moon', 'energy'],
    text: {
      es: 'El [[regolith|polvo lunar]] es afilado como trocitos de cristal: en la Luna no hay viento ni agua que redondeen sus granos.',
      en: '[[regolith|Moon dust]] is sharp like tiny bits of glass: the Moon has no wind or water to round off its grains.'
    },
    source: src('NASA · What hazards are caused by lunar regolith?', REGOLITH),
    tag: 'NASA'
  },
  {
    id: 'moon-dust-shield',
    emoji: '🧲',
    topic: 'moon',
    tags: ['energy', 'moon'],
    text: {
      es: 'En 2025, un aparato de la NASA limpió [[regolith|polvo lunar]] en la propia Luna usando solo electricidad.',
      en: 'In 2025, a NASA device cleaned off [[regolith|Moon dust]] right on the Moon, using only electricity.'
    },
    source: src('NASA · Dust shield successfully repels lunar regolith on the Moon', 'https://www.nasa.gov/image-article/nasas-dust-shield-successfully-repels-lunar-regolith-on-moon/'),
    tag: 'NASA'
  },
  {
    id: 'moon-crust-elements',
    emoji: '🔩',
    topic: 'moon',
    tags: ['moon', 'general'],
    text: {
      es: '¡Las rocas de la Luna tienen [[oxygen|oxígeno]] dentro, mezclado con hierro, aluminio y otros elementos!',
      en: 'Moon rocks have [[oxygen|oxygen]] inside them, mixed with iron, aluminium and other elements!'
    },
    source: src('NASA · Moon composition and structure', 'https://science.nasa.gov/moon/composition/'),
    tag: 'NASA'
  },
  {
    id: 'moon-lro',
    emoji: '🌕',
    topic: 'moon',
    tags: ['moon', 'radiation'],
    text: {
      es: 'Una [[lro|nave de la NASA]] da vueltas a la Luna desde 2009. ¡Ninguna otra ha aguantado tanto tiempo allí!',
      en: 'A [[lro|NASA spacecraft]] has been circling the Moon since 2009. No other has lasted that long there!'
    },
    source: src('NASA · Lunar Reconnaissance Orbiter', 'https://science.nasa.gov/mission/lro/'),
    tag: 'NASA'
  },
  {
    id: 'moon-signal',
    emoji: '📡',
    topic: 'comms',
    tags: ['general', 'moon'],
    text: {
      es: 'Un [[signal-delay|mensaje de radio]] tarda poco más de 1 segundo en ir de la Tierra a la Luna: ¡lo que tardas en decir «hola, Luna»!',
      en: 'A [[signal-delay|radio message]] takes just over 1 second to go from Earth to the Moon: about as long as saying “hello, Moon”!'
    },
    source: src('NASA · What is a light-day?', 'https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/'),
    tag: 'NASA'
  },
  {
    id: 'moon-artemis-ii',
    emoji: '🚀',
    topic: 'moon',
    tags: ['general', 'moon'],
    text: {
      es: 'En abril de 2026, cuatro astronautas de [[artemis|Artemis II]] dieron la vuelta a la Luna y volvieron a casa.',
      en: 'In April 2026, four [[artemis|Artemis II]] astronauts flew around the Moon and came back home.'
    },
    source: src('NASA · Artemis II', 'https://www.nasa.gov/mission/artemis-ii/'),
    tag: 'NASA'
  },

  // ---------- The Space Station ----------
  {
    id: 'iss-16-orbits',
    emoji: '🌍',
    topic: 'moon',
    tags: ['iss', 'general'],
    text: {
      es: 'La [[iss|Estación Espacial]] da 16 vueltas a la Tierra cada día: ¡ve 16 amaneceres y 16 atardeceres!',
      en: 'The [[iss|Space Station]] circles Earth 16 times a day: it sees 16 sunrises and 16 sunsets!'
    },
    source: src('NASA · Space Station facts and figures', ISS_FACTS),
    tag: 'NASA'
  },
  {
    id: 'iss-solar-arrays',
    emoji: '🔆',
    topic: 'energy',
    tags: ['iss', 'energy'],
    text: {
      es: 'De punta a punta, las alas de [[solar-panel|paneles solares]] de la [[iss|Estación Espacial]] miden más que el avión de pasajeros más grande del mundo.',
      en: 'From tip to tip, the [[iss|Space Station]]’s [[solar-panel|solar panel]] wings are longer than the world’s biggest passenger plane.'
    },
    source: src('NASA · Space Station facts and figures', ISS_FACTS),
    tag: 'NASA'
  },

  // ---------- Rovers ----------
  {
    id: 'rover-ltv',
    emoji: '🛻',
    topic: 'energy',
    tags: ['rover', 'energy'],
    text: {
      es: 'El coche lunar que prepara la NASA podrá recorrer hasta 10 kilómetros con una sola carga de [[battery|batería]].',
      en: 'The Moon car NASA is preparing will drive up to 10 kilometres on a single [[battery|battery]] charge.'
    },
    source: src('NASA · Progress update on Moon Base rovers', ROVERS),
    tag: 'NASA'
  },
  {
    id: 'rover-viper',
    emoji: '🚙',
    topic: 'moon',
    tags: ['rover', 'ice'],
    text: {
      es: 'Un rover de la NASA irá al [[south-pole|polo sur]] en 2027 para buscar hielo dentro de cráteres siempre a oscuras.',
      en: 'A NASA rover will go to the [[south-pole|south pole]] in 2027 to look for ice inside craters that are always dark.'
    },
    source: src('NASA · Progress update on Moon Base rovers', ROVERS),
    tag: 'NASA'
  },
  {
    id: 'rover-apollo',
    emoji: '🔋',
    topic: 'energy',
    tags: ['rover', 'energy'],
    text: {
      es: 'En tres misiones Apolo, los astronautas condujeron coches por la Luna. ¡Sus [[battery|baterías]] no se podían recargar!',
      en: 'On three Apollo missions, astronauts drove cars on the Moon. Their [[battery|batteries]] could not be recharged!'
    },
    source: src('NASA NSSDC · Apollo Lunar Roving Vehicle', 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html'),
    tag: 'NASA'
  },
  {
    id: 'rover-dust',
    emoji: '🌫️',
    topic: 'moon',
    tags: ['rover', 'moon'],
    text: {
      es: 'Con la gravedad tan débil de la Luna, el [[regolith|polvo]] salta con facilidad y lo cubre todo: rovers, trajes y aparatos.',
      en: 'With the Moon’s weak gravity, [[regolith|dust]] jumps up easily and covers everything: rovers, suits and machines.'
    },
    source: src('NASA · What hazards are caused by lunar regolith?', REGOLITH),
    tag: 'NASA'
  },

  // ---------- Mars ----------
  {
    id: 'mars-no-shield',
    emoji: '🧲',
    topic: 'radiation',
    tags: ['mars', 'radiation'],
    text: {
      es: '[[mars|Marte]] no tiene un escudo magnético como el de la Tierra y su aire es muy fino. ¡Le llega mucha más radiación!',
      en: '[[mars|Mars]] has no magnetic shield like Earth’s, and its air is very thin. Much more radiation reaches it!'
    },
    source: src('NASA · Mars facts', 'https://science.nasa.gov/mars/facts/'),
    tag: 'NASA'
  },
  {
    id: 'mars-sol',
    emoji: '🌅',
    topic: 'moon',
    tags: ['mars'],
    text: {
      es: 'Un día en [[mars|Marte]] se llama [[sol|sol]] y dura 24 horas y 39 minutos: ¡un poco más que aquí!',
      en: 'A day on [[mars|Mars]] is called a [[sol|sol]] and lasts 24 hours and 39 minutes: a bit longer than here!'
    },
    source: src('NASA · Spirit’s 1,000th sol', 'https://www.nasa.gov/image-article/barsoom/'),
    tag: 'NASA'
  },
  {
    id: 'mars-delay',
    emoji: '📨',
    topic: 'comms',
    tags: ['mars', 'general', 'forecast'],
    text: {
      es: 'Un [[signal-delay|mensaje]] de la Tierra a [[mars|Marte]] tarda entre 3 y 22 minutos. ¡Allí no puedes esperar a que la Tierra te avise!',
      en: 'A [[signal-delay|message]] from Earth to [[mars|Mars]] takes 3 to 22 minutes. There, you cannot wait for Earth to warn you!'
    },
    source: src('NASA JPL · Approximate positions of the planets', 'https://ssd.jpl.nasa.gov/planets/approx_pos.html'),
    tag: 'CALCULADO'
  }
];
