// Utility functions for managing missing locations and location types in the warehouse

/**
 * Updates the missing locations array.
 * @param {Array} newMissingLocations
 * @returns {Array}
 */
export function updateMissingLocations(newMissingLocations) {
    return newMissingLocations;
}

/**
 * Adds a single missing location to the array.
 * @param {Array} missingLocations
 * @param {Object} location
 * @returns {Array}
 */
export function addMissingLocation(missingLocations, location) {
    return [...missingLocations, location];
}

/**
 * Clears all missing locations.
 * @returns {Array}
 */
export function clearMissingLocations() {
    return [];
}

/**
 * Determines the type of a location based on buffer definitions.
 * @param {Array} bufferLocations
 * @param {string} defaultType
 * @param {Object} query
 * @returns {string}
 */
export function getLocationType(bufferLocations, defaultType, query) {
    const isBuffer = bufferLocations.some(buffer => {
        const aisleMatch = Array.isArray(buffer.aisle) ? buffer.aisle.includes(query.aisle) : (buffer.aisle === null || buffer.aisle === query.aisle);
        const levelMatch = Array.isArray(buffer.level) ? buffer.level.includes(query.level) : (buffer.level === null || buffer.level === query.level);
        const moduleMatch = Array.isArray(buffer.module) ? buffer.module.includes(query.module) : (buffer.module === null || buffer.module === query.module);
        const depthMatch = Array.isArray(buffer.depth) ? buffer.depth.includes(query.depth) : (buffer.depth === null || buffer.depth === query.depth);
        const positionMatch = Array.isArray(buffer.position) ? buffer.position.includes(query.position) : (buffer.position === null || buffer.position === query.position);
        return aisleMatch && levelMatch && moduleMatch && depthMatch && positionMatch;
    });
    return isBuffer ? 'Buffer' : defaultType;
}

/**
 * Adds a buffer location definition.
 * @param {Array} bufferLocations
 * @param {Object} buffer
 * @returns {Array}
 */
export function addBufferLocation(bufferLocations, buffer) {
    return [...bufferLocations, { ...buffer, type: 'Buffer' }];
}

/**
 * Clears all buffer locations.
 * @returns {Array}
 */
export function clearBufferLocations() {
    return [];
}
