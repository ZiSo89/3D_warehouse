// Utility for warehouse metrics calculations

/**
 * Calculates the total number of available locations in the warehouse, excluding missing ones.
 * @param {Object} uiConfig - The warehouse UI configuration.
 * @param {Array} missingLocations - Array of missing location definitions.
 * @returns {number}
 */
export function calculateTotalLocations(uiConfig, missingLocations) {
    let totalLocations = 0;
    // Helper function to check if a location is missing
    const isLocationMissing = (aisle, level, module, depth, position) => {
        return missingLocations.some(missing => {
            const aisleMatch = Array.isArray(missing.aisle) ? 
                missing.aisle.includes(aisle) : 
                (missing.aisle === null || missing.aisle === aisle);
            const levelMatch = Array.isArray(missing.level) ? 
                missing.level.includes(level) : 
                (missing.level === null || missing.level === level);
            const moduleMatch = missing.module === null || missing.module === module;
            const depthMatch = missing.depth === null || missing.depth === depth;
            const positionMatch = missing.position === null || missing.position === position;
            return aisleMatch && levelMatch && moduleMatch && depthMatch && positionMatch;
        });
    };
    for (let a = 0; a < uiConfig.aisles; a++) {
        const levels = uiConfig.levels_per_aisle[a];
        for (let l = 0; l < levels; l++) {
            for (let m = 0; m < uiConfig.modules_per_aisle; m++) {
                for (let d = 0; d < uiConfig.storage_depth; d++) {
                    for (let s = 0; s < uiConfig.locations_per_module; s++) {
                        for (let side = 0; side < 2; side++) {
                            if (!isLocationMissing(a, l, m, d, s)) {
                                totalLocations++;
                            }
                        }
                    }
                }
            }
        }
    }
    return totalLocations;
}
