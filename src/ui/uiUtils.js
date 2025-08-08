/**
 * UI utility functions for warehouse configuration management.
 * @fileoverview Shared utility functions for UIManager and InteractionManager
 */

/**
 * Ensures the levels_per_aisle array matches the aisle count, filling with a default value if needed.
 * @param {Array<number>} levelsArr - The levels_per_aisle array to mutate
 * @param {number} aisleCount - The desired length
 * @param {number} [defaultLevel=5] - The default value to use when extending
 */
export function syncLevelsPerAisle(levelsArr, aisleCount, defaultLevel = 5) {
    while (levelsArr.length < aisleCount) {
        levelsArr.push(defaultLevel);
    }
    while (levelsArr.length > aisleCount) {
        levelsArr.pop();
    }
}
// uiUtils.js
// Shared utility functions for UIManager and InteractionManager



/**
 * Returns camera position and target for a given view name and warehouse config.
 * @param {string} view - The view name (overview, front, side, top, aisle, topView, sideView, prezoneView, aisleView)
 * @param {Object} config - The warehouse config object
 * @param {number} config.aisles - Number of aisles
 * @param {number} config.storage_depth - Storage depth per aisle
 * @param {number} config.modules_per_aisle - Number of modules per aisle
 * @returns {{position: {x:number, y:number, z:number}, target: {x:number, y:number, z:number}}} Camera configuration
 */
export function getCameraViewConfig(view, config) {
    // These values should match the constants used in the main codebase
    const locationDepth = 1.5; // fallback if not imported
    const aisleWidth = 3;
    const moduleLength = 2;

    const totalRackDepth = config.storage_depth * locationDepth;
    const rackAndAisleWidth = (totalRackDepth * 2) + aisleWidth;
    const warehouseWidth = config.aisles * rackAndAisleWidth;
    const warehouseLength = config.modules_per_aisle * moduleLength;
    const centerX = warehouseWidth / 2;
    const centerZ = warehouseLength / 2;

    switch(view) {
        case 'overview': {
            // Calculate offsets based on the reference position and current warehouse config
            const offsetX = 30.0;
            const offsetY = 20.0;
            const offsetZ = 30.0;
            return {
                position: {x: centerX + offsetX, y: offsetY, z: centerZ + offsetZ},
                target: {x: centerX, y: 0, z: centerZ}
            };
        }
        case 'front':
            return {
                position: {x: centerX, y: 8, z: warehouseLength + 15},
                target: {x: centerX, y: 0, z: centerZ}
            };
        case 'side':
            return {
                position: {x: warehouseWidth + 15, y: 8, z: centerZ},
                target: {x: centerX, y: 0, z: centerZ}
            };
        case 'top':
            return {
                position: {x: centerX, y: 25, z: centerZ},
                target: {x: centerX, y: 0, z: centerZ}
            };
        case 'aisle':
            return {
                position: {x: rackAndAisleWidth/2, y: 3, z: centerZ + 10},
                target: {x: rackAndAisleWidth/2, y: 0, z: centerZ}
            };
        case 'topView':
            return {
                position: {x: centerX, y: 50, z: centerZ},
                target: {x: centerX, y: 0, z: centerZ}
            };
        case 'sideView':
            return {
                position: {x: warehouseWidth + 15, y: 10, z: centerZ},
                target: {x: centerX, y: 0, z: centerZ}
            };
        case 'prezoneView': {
            // Example offset values for prezoneView (customize as needed)
            const offsetX = -15; // No offset in X
            const offsetY = 15; // Height
            const offsetZ = -40; // Offset in Z (in front of warehouse)
            const targetOffsetZ = -8; // Target slightly in front
            return {
                position: {x: centerX + offsetX, y: offsetY, z: centerZ + offsetZ},
                target: {x: centerX + offsetX, y: 0, z: centerZ + targetOffsetZ}
            };
        }
        case 'aisleView':
            return {
                position: {x: rackAndAisleWidth / 2, y: 8, z: centerZ + 10},
                target: {x: rackAndAisleWidth / 2, y: 0, z: centerZ}
            };
        default:
            // fallback to overview
            return {
                position: {x: centerX + 15, y: 15, z: centerZ + 20},
                target: {x: centerX, y: 0, z: centerZ}
            };
    }
}
