import { describe, it, expect } from 'vitest';
import { DomainBuilder } from '../src/domain/services/DomainBuilder.js';

const baseConfig = {
  aisles: 2,
  levels_per_aisle: [2, 1],
  modules_per_aisle: 3,
  locations_per_module: 4,
  storage_depth: 2,
  picking_stations: 1
};

describe('DomainBuilder', () => {
  it('computes theoretical gross correctly', () => {
    const builder = new DomainBuilder({ uiConfig: baseConfig, missingLocations: [] });
    const domain = builder.build();
    // gross = sum(levels_per_aisle[a]) * modules * locations_per_module per aisle separately
    const theoretical = (2 * 3 * 4) + (1 * 3 * 4); // aisle0 + aisle1
    expect(domain.__theoreticalGross).toBe(theoretical);
  });

  it('applies missing rule with wildcard level', () => {
    const builder = new DomainBuilder({ uiConfig: baseConfig, missingLocations: [{ aisle: 0, module: 1, position: 2 }] });
    const domain = builder.build();
    // Compute how many times that location appears across levels of aisle 0: levels_per_aisle[0] = 2
    const removed = 2; // position removed in each level
    const netCountAisle0 = (2 * 3 * 4) - removed; // theoretical - missing
    const netCountAisle1 = (1 * 3 * 4);
    // Actual net = sum of module.location lengths (each location object is per level+position)
    let net = 0;
    for (const aisle of domain.aisles) for (const mod of aisle.modules) net += mod.locations.length;
    expect(net).toBe(netCountAisle0 + netCountAisle1);
  });
});
