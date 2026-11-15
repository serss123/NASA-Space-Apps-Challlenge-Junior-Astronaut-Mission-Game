// Reduce los registros crudos de DONKI a lo que usa el juego, conservando SIEMPRE
// el identificador y el enlace original para que cada cifra sea trazable.

const trim = (s, n) => (typeof s === 'string' && s.length > n ? `${s.slice(0, n - 1)}…` : s ?? '');
const ids = (linked) => (Array.isArray(linked) ? linked.map((l) => l.activityID).filter(Boolean) : []);

export function extractSummary(messageBody = '') {
  const m = String(messageBody).match(/##\s*Summary:\s*([\s\S]*?)(?=\n##|$)/i);
  return (m ? m[1] : '').replace(/\s+/g, ' ').trim();
}

function mostAccurate(analyses) {
  if (!Array.isArray(analyses) || analyses.length === 0) return null;
  return analyses.find((a) => a.isMostAccurate) || analyses[analyses.length - 1];
}

export function compactDonki(type, list) {
  if (!Array.isArray(list)) return [];
  switch (type) {
    case 'FLR':
      return list.map((f) => ({
        id: f.flrID,
        beginTime: f.beginTime,
        peakTime: f.peakTime,
        endTime: f.endTime,
        classType: f.classType,
        sourceLocation: f.sourceLocation,
        activeRegionNum: f.activeRegionNum,
        link: f.link,
        linked: ids(f.linkedEvents)
      }));
    case 'CME':
      return list.map((c) => {
        const a = mostAccurate(c.cmeAnalyses);
        return {
          id: c.activityID,
          startTime: c.startTime,
          sourceLocation: c.sourceLocation,
          activeRegionNum: c.activeRegionNum,
          speed: a?.speed ?? null,
          type: a?.type ?? null,
          halfAngle: a?.halfAngle ?? null,
          note: trim(c.note, 400),
          link: c.link,
          linked: ids(c.linkedEvents)
        };
      });
    case 'SEP':
      return list.map((s) => ({
        id: s.sepID,
        eventTime: s.eventTime,
        instruments: (s.instruments || []).map((i) => i.displayName),
        link: s.link,
        linked: ids(s.linkedEvents)
      }));
    case 'GST':
      return list.map((g) => {
        const kp = (g.allKpIndex || []).map((k) => ({ time: k.observedTime, kp: k.kpIndex }));
        return {
          id: g.gstID,
          startTime: g.startTime,
          kpMax: kp.length ? Math.max(...kp.map((k) => k.kp)) : null,
          kp,
          link: g.link,
          linked: ids(g.linkedEvents)
        };
      });
    case 'IPS':
      return list.map((i) => ({
        id: i.activityID,
        eventTime: i.eventTime,
        location: i.location,
        link: i.link,
        linked: ids(i.linkedEvents)
      }));
    case 'MPC':
    case 'RBE':
    case 'HSS':
      return list.map((e) => ({
        id: e.mpcID || e.rbeID || e.hssID,
        eventTime: e.eventTime,
        link: e.link,
        linked: ids(e.linkedEvents)
      }));
    case 'WSAEnlilSimulations':
      return list.map((w) => ({
        id: w.simulationID,
        modelCompletionTime: w.modelCompletionTime,
        estimatedShockArrivalTime: w.estimatedShockArrivalTime,
        estimatedDuration: w.estimatedDuration,
        kp90: w.kp_90 ?? null,
        kp180: w.kp_180 ?? null,
        isEarthGB: w.isEarthGB ?? null,
        impacts: (w.impactList || []).map((i) => ({
          location: i.location,
          arrivalTime: i.arrivalTime,
          isGlancingBlow: i.isGlancingBlow
        })),
        cmes: (w.cmeInputs || []).map((ci) => ({
          id: ci.cmeid,
          startTime: ci.cmeStartTime,
          speed: ci.speed,
          isMostAccurate: ci.isMostAccurate
        })),
        link: w.link
      }));
    case 'notifications':
      return list.map((n) => ({
        id: n.messageID,
        type: n.messageType,
        issueTime: n.messageIssueTime,
        link: n.messageURL,
        summary: trim(extractSummary(n.messageBody), 700)
      }));
    default:
      return list;
  }
}
