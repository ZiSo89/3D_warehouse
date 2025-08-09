/** Domain model for a Module (segment of rack) */
export class Module {
  constructor(index, locations) {
    this.index = index;        // position within sector/aisle
    this.locations = locations; // Location[]
  }
}
