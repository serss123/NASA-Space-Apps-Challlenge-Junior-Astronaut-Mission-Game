// Todos los números del equilibrio del juego en un solo sitio (ver docs/GAME_DESIGN.md §2).
// Son decisiones de diseño propias (etiqueta DISEÑO), no datos de la NASA; los datos reales llegan por la línea temporal.

export const BALANCE = {
  maxLevel: 3,
  health: { start: 5, max: 5, healAfterPerfectNights: 2 },
  stamina: { base: 3 }, // Fuerzas máximas = base + nivel de Soporte Vital (4/5/6)
  energy: { base: 2, dirtyPanelsPenalty: 1 }, // energía diaria = base + nivel de Soporte Vital (3/4/5)
  battery: { capacityPerLifeSupport: 1 }, // energía que se puede guardar para mañana (1/2/3)
  food: { start: 5, perNight: 1 },
  start: { ice: 4, metal: 3 },
  farm: { plantStamina: 1, plantIce: 1, growDays: 2, yield: 3, plotsByLevel: [0, 1, 2, 3] },
  shield: { maxChargeByLevel: [0, 1, 2, 3] },
  antenna: { forecastDaysByLevel: [0, 1, 2, 3], linkSeconds: 1.3 },
  rover: {
    zoneStamina: { 1: 2, 2: 2, 3: 3 },
    zoneLevel: { 1: 1, 2: 2, 3: 3 },
    dustChance: 0.25, // salir con el Rover levanta polvo (SIMULADO)
    capacityByLevel: { 1: 100, 2: 130, 3: 170 }
  },
  maintenance: { repairStamina: 1, micrometeoriteChance: 0.05 },
  upgradeStamina: 1,
  upgrades: {
    lifeSupport: { 2: { metal: 4, ice: 1 }, 3: { metal: 6, ice: 2 } },
    farm: { 2: { metal: 3, ice: 1 }, 3: { metal: 4, ice: 2 } },
    antenna: { 2: { metal: 3 }, 3: { metal: 4, ice: 1 } },
    shield: { 2: { metal: 3, ice: 1 }, 3: { metal: 5, ice: 2 } },
    rover: { 2: { metal: 4 }, 3: { metal: 6, ice: 1 } }
  },
  radiation: { outsideDamageMinLevel: 2 },
  missions: { maxActive: 3 }
};

export const BUILDING_IDS = ['lifeSupport', 'farm', 'antenna', 'shield', 'rover'];
export const TASK_IDS = ['panels', 'cables', 'antenna'];
export const ZONE_IDS = [1, 2, 3];
export const SAMPLE_OF_ZONE = { 1: 'z1', 2: 'z2', 3: 'z3' };

// Misiones de la NASA: lo que piden, la investigación que dan y cuándo pueden llegar por la antena.
export const MISSIONS = [
  { id: 'm-anorthosite', need: { samples: { z1: 4 } }, reward: 15, unlock: (s) => true },
  { id: 'm-water', need: { ice: 3 }, reward: 10, unlock: (s) => s.dayIndex >= 1 },
  { id: 'm-breccia', need: { samples: { z2: 4 } }, reward: 15, unlock: (s) => s.dayIndex >= 3 || s.missions.done.includes('m-anorthosite') },
  { id: 'm-storm-watch', need: { watch: 3 }, reward: 20, unlock: (s) => s.dayIndex >= 2 },
  { id: 'm-polar-ice', need: { samples: { z3: 4 } }, reward: 20, unlock: (s) => s.dayIndex >= 6 || s.levels.rover >= 2 },
  {
    id: 'm-collection',
    need: { samples: { z1: 2, z2: 2, z3: 2 } },
    reward: 20,
    unlock: (s) => s.missions.done.includes('m-breccia') && s.missions.done.includes('m-polar-ice')
  }
];
export const MISSION_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

// Causas de daño (orden de gravedad para el informe).
export const DAMAGE_CAUSES = ['radiation', 'outside', 'hunger', 'overexertion'];
