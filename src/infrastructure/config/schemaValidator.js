/** Lightweight JSON Schema validator wrapper (runtime optional).
 * For now performs only minimal structural checks matching warehouse.schema.json.
 * Upgrade later by adding a real validator (Ajv) if needed.
 */
export function validateAgainstSchema(config) {
  if (!config || typeof config !== 'object') return { valid: false, errors: ['Config not object'] };
  const wp = config.warehouse_parameters;
  if (!wp) return { valid: false, errors: ['warehouse_parameters missing'] };
  const errs = [];
  const num = (v) => typeof v === 'number' && !isNaN(v);
  if (!num(wp.aisles) || wp.aisles < 1) errs.push('aisles invalid');
  if (!Array.isArray(wp.levels_per_aisle) || wp.levels_per_aisle.length !== wp.aisles) errs.push('levels_per_aisle length mismatch');
  if (!num(wp.modules_per_aisle) || wp.modules_per_aisle < 1) errs.push('modules_per_aisle invalid');
  if (!num(wp.locations_per_module) || wp.locations_per_module < 1) errs.push('locations_per_module invalid');
  if (!num(wp.storage_depth) || wp.storage_depth < 1) errs.push('storage_depth invalid');
  if (!num(wp.picking_stations) || wp.picking_stations < 0) errs.push('picking_stations invalid');
  return { valid: errs.length === 0, errors: errs };
}
