// AI-assisted code: written with Claude (Anthropic) and reviewed by the team. See AI_USE.md.
// Data and information sources used by "Sol a Sol" (GET /api/sources).
// Every source: { id, name, provider, url, usedFor: { es, en }, label, labels }
//   · usedFor: one short sentence a 7–12-year-old can read (what the game takes from it).
//   · label:   the main label the game shows on what comes from that source
//              ('EN VIVO' · 'ARCHIVO' · 'SIMULADO' · 'CALCULADO').
//   · labels:  every possible label (DONKI can be EN VIVO or ARCHIVO depending on the mission).
// The addresses are the official public pages; no logo is used, only the text of the credit.

import { DONKI_BASE } from './donkiFetcher.js';
import { RADLAB_BASE } from './radlab.js';

export const SOURCES = Object.freeze([
  {
    id: 'donki',
    name: 'DONKI · Space Weather Database Of Notifications, Knowledge, Information',
    provider: 'NASA · Community Coordinated Modeling Center (CCMC)',
    url: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
    api: DONKI_BASE,
    usedFor: {
      es: 'Lo que hizo el Sol cada día de la misión: llamaradas, nubes de plasma, lluvias de partículas y tormentas magnéticas.',
      en: 'What the Sun did on every mission day: flares, plasma clouds, particle showers and magnetic storms.'
    },
    label: 'EN VIVO',
    labels: ['EN VIVO', 'ARCHIVO']
  },
  {
    id: 'radlab',
    name: 'RadLab · Radiation Dosimetry Database',
    provider: 'NASA · Open Science Data Repository (OSDR)',
    url: 'https://visualization.osdr.nasa.gov/radlab/gui/',
    api: RADLAB_BASE,
    usedFor: {
      es: 'La radiación que midieron de verdad unos detectores cerca de la Luna, en la Estación Espacial, en Marte y en el espacio.',
      en: 'The radiation really measured by detectors near the Moon, on the Space Station, on Mars and in deep space.'
    },
    label: 'ARCHIVO',
    labels: ['ARCHIVO']
  },
  {
    id: 'osd-476',
    name: 'OSD-476 · Plants grow in lunar regolith (thale cress)',
    provider: 'NASA · Open Science Data Repository (OSDR)',
    url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-476',
    usedFor: {
      es: 'La granja de la base: en un experimento real crecieron plantas en tierra traída de la Luna por el Apolo.',
      en: 'The base farm: in a real experiment, plants grew in soil brought back from the Moon by Apollo.'
    },
    label: 'ARCHIVO',
    labels: ['ARCHIVO']
  },
  {
    id: 'lro-south-pole',
    name: 'The Lunar South Pole (LRO · LROC mosaic)',
    provider: 'NASA/GSFC/Arizona State University',
    url: 'https://science.nasa.gov/photojournal/the-lunar-south-pole',
    usedFor: {
      es: 'La foto que usamos de modelo para dibujar la base en el polo sur de la Luna (el dibujo es nuestro).',
      en: 'The photo we used as a model to draw the base at the Moon’s south pole (the drawing is ours).'
    },
    label: 'ARCHIVO',
    labels: ['ARCHIVO']
  },
  {
    id: 'csa-food-toolkit',
    name: 'Toolkit for educators and youth · Food production on the Moon and in remote areas',
    provider: 'Canadian Space Agency (CSA)',
    url: 'https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/',
    usedFor: {
      es: 'Ideas para cultivar comida en la Luna; la granja del juego es una versión más sencilla (SIMULADO).',
      en: 'Ideas for growing food on the Moon; the game farm is a simpler version (SIMULATED).'
    },
    label: 'SIMULADO',
    labels: ['SIMULADO']
  },
  {
    id: 'jpl-approx-positions',
    name: 'Approximate Positions of the Planets (E. M. Standish)',
    provider: 'NASA · JPL Solar System Dynamics',
    url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
    usedFor: {
      es: 'Calcular cuánto tarda hoy un mensaje de radio en ir de la Tierra a Marte.',
      en: 'Working out how long a radio message takes today to travel from Earth to Mars.'
    },
    label: 'CALCULADO',
    labels: ['CALCULADO']
  }
]);

/** Finds a source by its id (or `null`). */
export const getSource = (id) => SOURCES.find((s) => s.id === id) || null;
