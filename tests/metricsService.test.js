import { describe, it, expect } from 'vitest';
import { DomainBuilder } from '../src/domain/services/DomainBuilder.js';
import { MetricsService } from '../src/domain/services/MetricsService.js';

const baseConfig = {
  aisles: 1,
  levels_per_aisle: [2],
  modules_per_aisle: 2,
  locations_per_module: 5,
  storage_depth: 1,
  picking_stations: 0
};

describe('MetricsService', () => {
  it('computes gross/net/missing', () => {
    const missing = [{ aisle: 0, level: 1, module: 1, position: 3 }];
    const builder = new DomainBuilder({ uiConfig: baseConfig, missingLocations: missing });
    const domain = builder.build();
    const metrics = new MetricsService().compute(domain);
    const gross = (2 * 2 * 5); // levels * modules * locations
    const removed = 1; // one missing at a specific level
    expect(metrics.gross).toBe(gross);
    expect(metrics.net).toBe(gross - removed);
    expect(metrics.missing).toBe(removed);
  });
});
