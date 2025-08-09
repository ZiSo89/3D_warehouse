/**
 * Builds a pure domain representation (aisles/modules/locations) from uiConfig & rules.
 * Non-Three.js so it is testable.
 */
import { Aisle } from '../models/Aisle.js';
import { Module } from '../models/Module.js';
import { Location } from '../models/Location.js';

export class DomainBuilder {
  /**
   * @param {Object} opts
   * @param {Object} opts.uiConfig
   * @param {Array} opts.missingLocations
   */
  constructor({ uiConfig, missingLocations }) {
    this.uiConfig = uiConfig;
    this.missingLocations = missingLocations || [];
  }

  build() {
    const aisles = [];
    let theoreticalGross = 0; // all positions before missing removal (single level granularity for skeleton)
    for (let a = 0; a < this.uiConfig.aisles; a++) {
      const levelCount = this.uiConfig.levels_per_aisle[a] || 0;
      const modules = [];
      for (let m = 0; m < this.uiConfig.modules_per_aisle; m++) {
        const locations = [];
        for (let lvl = 0; lvl < levelCount; lvl++) {
          theoreticalGross += this.uiConfig.locations_per_module;
          for (let p = 0; p < this.uiConfig.locations_per_module; p++) {
            if (this.isMissing({ aisle: a, level: lvl, module: m, position: p })) continue;
            locations.push(new Location({ aisle: a, level: lvl, module: m, position: p, depth: this.uiConfig.storage_depth }));
          }
        }
        modules.push(new Module(m, locations));
      }
      aisles.push(new Aisle(a, levelCount, modules));
    }
    return { aisles, __theoreticalGross: theoreticalGross };
  }

  isMissing({ aisle, level, module, position }) {
    return this.missingLocations.some(r => (
      (r.aisle === undefined || r.aisle === aisle) &&
      (r.level === undefined || r.level === level) &&
      (r.module === undefined || r.module === module) &&
      (r.position === undefined || r.position === position)
    ));
  }
}
