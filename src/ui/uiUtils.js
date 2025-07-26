/**
 * Ensures the levels_per_aisle array matches the aisle count, filling with a default value if needed.
 * @param {Array} levelsArr - The levels_per_aisle array to mutate.
 * @param {number} aisleCount - The desired length.
 * @param {number} [defaultLevel=5] - The default value to use when extending.
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
 * @param {object} config - The warehouse config object
 * @returns {{position: {x:number, y:number, z:number}, target: {x:number, y:number, z:number}}}
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
        case 'overview':
            return {
                position: {x: centerX + 15, y: 15, z: centerZ + 20},
                target: {x: centerX, y: 0, z: centerZ}
            };
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
        case 'prezoneView':
            return {
                position: {x: centerX, y: 12, z: -25},
                target: {x: centerX, y: 0, z: -8}
            };
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
