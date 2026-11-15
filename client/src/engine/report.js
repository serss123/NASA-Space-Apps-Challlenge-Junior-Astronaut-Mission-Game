// Informe final "¿Por qué pasó?": la decisión que más pesó, el evento más fuerte y el resultado,
// con los datos reales de cada eslabón. Devuelve datos (la interfaz los convierte en frases es/en).
import { summarizeTimeline } from '../../../shared/gameTranslator.js';
import { DAMAGE_CAUSES } from './config.js';

const countBy = (list, key) => list.reduce((acc, e) => ((acc[e[key]] = (acc[e[key]] || 0) + 1), acc), {});

export function buildFinalReport(s) {
  const result = s.outcome?.result ?? 'timeUp';
  const lastIndex = Math.min(s.dayIndex, s.timeline.length - 1);
  const played = s.timeline.slice(0, lastIndex + 1);
  const damage = s.log.filter((e) => e.kind === 'damage');
  const damageCounts = countBy(damage, 'cause');
  // La causa que más pesó: la más repetida; a igualdad, la que provocó la evacuación y después la más grave.
  const rank = (c) => (c === s.outcome?.cause ? -1 : DAMAGE_CAUSES.indexOf(c));
  const mainCause = Object.entries(damageCounts).sort((a, b) => b[1] - a[1] || rank(a[0]) - rank(b[0]))[0]?.[0] ?? null;

  // El evento más fuerte que vivió la base: la noche de mayor radiación (y, a igualdad, mayor multiplicador).
  let strongest = null;
  played.forEach((day, i) => {
    const score = day.radiation.level * 10000 + (day.radiation.multiplier || 0) + (day.flares.x.length ? 1 : 0);
    if (!strongest || score > strongest.score) strongest = { score, index: i, day };
  });
  const strongestNight = s.log.find((e) => e.day === strongest?.index && e.kind === 'night');
  const strongestEvent = strongest
    ? {
        index: strongest.index,
        date: strongest.day.date,
        level: strongest.day.radiation.level,
        multiplier: strongest.day.radiation.multiplier,
        basis: strongest.day.radiation.basis,
        issX: strongest.day.radiation.stations?.iss?.x ?? null,
        maxFlare: strongest.day.flares.max,
        kp: strongest.day.geomagnetic?.kpMax ?? null,
        protected: strongestNight ? strongestNight.protected : null,
        happened: !!strongestNight
      }
    : null;

  // La decisión que más pesó.
  const shieldUpgrades = s.log.filter((e) => e.kind === 'upgrade' && e.building === 'shield');
  const firstStormDay = played.findIndex((d) => d.radiation.level > 0);
  let keyDecision;
  if (result === 'evacuated' || mainCause) {
    const hits = damage.filter((e) => e.cause === mainCause).map((e) => ({ day: e.day, date: s.timeline[e.day]?.date, level: e.level, multiplier: s.timeline[e.day]?.radiation.multiplier ?? null }));
    keyDecision = { kind: mainCause, count: hits.length, hits: hits.slice(0, 4), plants: s.stats.plants, harvests: s.stats.harvests };
  } else if (s.stats.stormNights > 0) {
    keyDecision = {
      kind: 'shieldReady',
      blocked: s.stats.stormsBlocked,
      stormNights: s.stats.stormNights,
      shieldLevel: s.levels.shield,
      upgradedBeforeStorm: shieldUpgrades.some((e) => firstStormDay >= 0 && e.day < firstStormDay),
      upgradeDays: shieldUpgrades.map((e) => ({ day: e.day, level: e.level, date: s.timeline[e.day]?.date }))
    };
  } else {
    keyDecision = { kind: 'steady', plants: s.stats.plants, expeditions: s.stats.expeditions };
  }

  const tip =
    result === 'win'
      ? 'challenge'
      : mainCause === 'radiation'
        ? 'shield'
        : mainCause === 'hunger'
          ? 'farm'
          : mainCause === 'overexertion'
            ? 'rest'
            : mainCause === 'outside'
              ? 'outside'
              : 'rover';

  return {
    result,
    cause: s.outcome?.cause ?? mainCause,
    seed: s.seed,
    mode: s.mode,
    source: s.source,
    daysPlayed: lastIndex + 1,
    totalDays: s.timeline.length,
    endDate: s.timeline[lastIndex]?.date,
    research: s.research,
    health: s.health,
    missionsDone: [...s.missions.done],
    levels: { ...s.levels },
    damageCounts,
    mainCause,
    keyDecision,
    strongestEvent,
    tip,
    stats: structuredClone(s.stats),
    sun: summarizeTimeline(played)
  };
}
