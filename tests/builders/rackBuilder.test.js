import { describe, it, expect } from 'vitest';
import { RackBuilder } from '../../src/engine/builders/RackBuilder.js';

const baseConfig = () => ({
  aisles: 2,
  modules_per_aisle: 2,
  locations_per_module: 3,
  storage_depth: 2,
  levels_per_aisle: [2,2]
});

describe('RackBuilder incremental behavior', () => {
  it('reuses full group when identical signature (instanced)', () => {
    const rb = new RackBuilder({ instanced: true });
    const cfg = baseConfig();
    const g1 = rb.build(cfg, [], []);
    const stats1 = rb.getLastBuildStats();
    expect(stats1.mode).toBe('instanced');
    const g2 = rb.build(cfg, [], []); // should early reuse (forceIncremental false by default)
    expect(g2).toBe(g1); // shallow equality reuse
  });

  it('forces incremental path and reports stats (instanced)', () => {
    const rb = new RackBuilder({ instanced: true });
    const cfg = baseConfig();
    rb.build(cfg, [], []);
    // mutate locationTypes to change one bucket type -> expect some rebuilt
    const types = [{ aisle:0, level:0, module:0, depth:0, position:0, type:'Special' }];
    rb.build(cfg, [], types, { forceIncremental: true });
    const stats = rb.getLastBuildStats();
    expect(stats.mode).toBe('instanced');
    expect(stats.rebuilt).toBeGreaterThan(0);
  });

  it('regular mode module diff triggers incremental rebuild logs', () => {
    const rb = new RackBuilder({ instanced: false });
    const cfg = baseConfig();
    rb.build(cfg, [], []);
    // mark a missing location that affects one module signature
    const missing = [{ aisle:0, level:0, module:0, position:0 }];
    const g2 = rb.build(cfg, missing, []); // incremental regular path
    expect(g2).toBeTruthy();
  });
});
