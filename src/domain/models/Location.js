/** Domain model for a single storage Location */
export class Location {
  constructor({ aisle, level, module, position, depth }) {
    this.aisle = aisle; // 0-based indices
    this.level = level;
    this.module = module;
    this.position = position; // index within module
    this.depth = depth; // storage depth (1..n)
  }
}
