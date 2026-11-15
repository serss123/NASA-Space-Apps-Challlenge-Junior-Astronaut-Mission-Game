// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Texts of the NASA missions that arrive through the antenna. Rules, needs and rewards live in
// engine/config.js (MISSIONS); the ids here must match them (content.test.js checks it).
// Shape: id: { emoji, icon, title: { es, en }, brief: { es, en }, done: { es, en } }
//   · emoji   one illustration sticker for content cards; icon: an Icon.jsx name for UI chrome
//   · title   plain text, at most 4 words
//   · brief   Mission Control speaking ("nos" / "us" is the team on Earth): at most 2 short sentences that say
//             what to bring (in **bold**) and why science needs it, with [[glossary]] pills
//   · done    the thank-you shown when the mission is delivered: 1 sentence (after a short "¡Gracias!")
// In the game, rock samples are called "Rocas" / "Rocks" (docs/DESIGN.md section 4).
// The missions and their amounts are game DESIGN; the science they explain is real.

export const MISSION_TEXT = {
  'm-anorthosite': {
    emoji: '⚪',
    icon: 'rock',
    title: { es: 'Las rocas blancas', en: 'The white rocks' },
    brief: {
      es: 'Tráenos **4 rocas de [[anorthosite|anortosita]]** de la zona 1. Son de la primera corteza de la Luna y cuentan cómo se formó.',
      en: 'Bring us **4 [[anorthosite]] rocks** from zone 1. They come from the Moon’s first crust and tell how it formed.'
    },
    done: {
      es: '¡Gracias! Con ellas estudiamos cómo nació la corteza de la Luna.',
      en: 'Thank you! With them we can study how the Moon’s crust was born.'
    }
  },
  'm-water': {
    emoji: '💧',
    icon: 'ice',
    title: { es: 'Hielo para el laboratorio', en: 'Ice for the lab' },
    brief: {
      es: 'Envíanos **3 trozos de [[water-ice|hielo]]** para analizarlos. Antes de vivir en el polo, hay que saber cuánta agua guarda.',
      en: 'Send us **3 chunks of [[water-ice|ice]]** to analyse. Before living at the pole, we must know how much water it holds.'
    },
    done: {
      es: '¡Gracias! Sacar agua, [[oxygen|oxígeno]] y combustible del hielo es la [[isru|ISRU]].',
      en: 'Thank you! Getting water, [[oxygen]] and fuel from ice is [[isru|ISRU]].'
    }
  },
  'm-breccia': {
    emoji: '🧩',
    icon: 'rock',
    title: { es: 'Diario de impactos', en: 'The impact diary' },
    brief: {
      es: 'Tráenos **4 rocas de [[breccia|brecha]]** de la cresta, en la zona 2. Cada una guarda la historia de los choques de la Luna.',
      en: 'Bring us **4 [[breccia]] rocks** from the ridge in zone 2. Each one keeps the story of the Moon’s crashes.'
    },
    done: {
      es: '¡Gracias! La Luna guarda la historia de choques que la Tierra ya casi borró.',
      en: 'Thank you! The Moon still keeps the crash story that Earth has almost erased.'
    }
  },
  'm-storm-watch': {
    emoji: '📡',
    icon: 'antenna',
    title: { es: 'Vigía del clima espacial', en: 'Space-weather watch' },
    brief: {
      es: 'Conecta la [[antenna|antena]] **3 días con el Sol activo**. Tus datos nos ayudan a predecir el [[space-weather|clima espacial]].',
      en: 'Link the [[antenna]] on **3 days when the Sun is active**. Your data helps us predict [[space-weather]].'
    },
    done: {
      es: '¡Gracias! Con mejores previsiones protegeremos de la [[radiation|radiación]] a los astronautas de [[artemis|Artemis]].',
      en: 'Thank you! Better forecasts will keep [[artemis|Artemis]] astronauts safe from [[radiation]].'
    }
  },
  'm-polar-ice': {
    emoji: '🧊',
    icon: 'ice',
    title: { es: 'Hielo de la sombra', en: 'Ice from the shadows' },
    brief: {
      es: 'Tráenos **4 rocas heladas** del [[psr|cráter en sombra]] (zona 3). Son [[regolith|regolito]] helado: queremos saber cuánta agua guardan.',
      en: 'Bring us **4 icy rocks** from the [[psr|shadowed crater]] (zone 3). They are icy [[regolith]]: we want to know how much water they hold.'
    },
    done: {
      es: '¡Gracias! Saber dónde hay hielo ayuda a elegir dónde construir una base.',
      en: 'Thank you! Knowing where the ice is helps choose where to build a base.'
    }
  },
  'm-collection': {
    emoji: '🗃️',
    icon: 'science',
    title: { es: 'Colección del polo sur', en: 'South pole collection' },
    brief: {
      es: 'Tráenos **2 rocas de cada zona** para el laboratorio. Comparar sitios distintos nos ayuda a conocer el [[south-pole|polo sur]].',
      en: 'Bring us **2 rocks from each zone** for the lab. Comparing different sites helps us understand the [[south-pole]].'
    },
    done: {
      es: '¡Colección completa! Ayudará a elegir dónde aterrizarán los astronautas de [[artemis|Artemis]].',
      en: 'Collection complete! It will help choose where [[artemis|Artemis]] astronauts will land.'
    }
  }
};
