/** Domain model for an Aisle */
export class Aisle {
  constructor(id, levels, modules) {
    this.id = id;              // 0-based id
    this.levels = levels;      // number of levels
    this.modules = modules;    // Module[]
  }
}
