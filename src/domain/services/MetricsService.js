/**
 * Computes simple warehouse metrics from domain graph.
 */
export class MetricsService {
  compute(domain) {
    let net = 0;
    const aisleBreakdown = [];
    const levelCounts = new Map(); // level -> net locations
    for (const aisle of domain.aisles) {
      let aisleCount = 0;
      for (const module of aisle.modules) {
        for (const loc of module.locations) {
          aisleCount++;
          const prev = levelCounts.get(loc.level) || 0;
          levelCounts.set(loc.level, prev + 1);
        }
      }
      aisleBreakdown.push({ aisle: aisle.id, net: aisleCount });
      net += aisleCount;
    }
    const gross = domain.__theoreticalGross ?? net;
    const missing = gross - net;
    const levels = [...levelCounts.entries()].sort((a,b)=>a[0]-b[0]).map(([level,count])=>({level, net: count}));
    return { gross, net, missing, aisles: aisleBreakdown, levels };
  }
}
