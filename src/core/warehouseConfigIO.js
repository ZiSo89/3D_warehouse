// Warehouse configuration export/import helpers for SceneManager modularization

/**
 * Exports the warehouse configuration as a JSON file and returns the config object.
 * @param {Object} uiConfig - The current UI configuration.
 * @param {Array} missingLocations - Array of missing locations.
 * @param {Object} locationTypes - Location types object.
 * @param {Function} calculateTotalLocations - Function to calculate total locations.
 * @param {string} [filename='warehouse_config.json'] - The filename for export.
 * @returns {Object} The warehouse configuration object.
 */
export function exportWarehouseConfiguration(uiConfig, missingLocations, locationTypes, calculateTotalLocations, filename = 'warehouse_config.json') {
    // Convert internal 0-based indices to 1-based for JSON export
    const convertedMissingLocations = missingLocations.map(loc => {
        if (loc && typeof loc === 'object') {
            const newLoc = { ...loc };
            ['aisle', 'level', 'module', 'depth', 'position'].forEach(key => {
                if (typeof newLoc[key] === 'number' && newLoc[key] !== -1) {
                    newLoc[key] = newLoc[key] + 1;
                }
            });
            return newLoc;
        }
        return loc;
    });

    const convertedBufferLocations = locationTypes.buffer_locations.map(loc => {
        if (loc && typeof loc === 'object') {
            const newLoc = { ...loc };
            ['aisle', 'level', 'module', 'depth', 'position'].forEach(key => {
                if (typeof newLoc[key] === 'number' && newLoc[key] !== -1) {
                    newLoc[key] = newLoc[key] + 1;
                }
            });
            return newLoc;
        }
        return loc;
    });

    const warehouseConfig = {
        metadata: {
            name: filename.replace('.json', ''),
            created: new Date().toISOString(),
            version: '1.0.0',
            description: 'Exported warehouse configuration'
        },
        warehouse_parameters: {
            aisles: uiConfig.aisles,
            levels_per_aisle: [...uiConfig.levels_per_aisle],
            modules_per_aisle: uiConfig.modules_per_aisle,
            locations_per_module: uiConfig.locations_per_module,
            storage_depth: uiConfig.storage_depth,
            picking_stations: uiConfig.picking_stations
        },
        missing_locations: [...convertedMissingLocations],
        location_types: {
            buffer_locations: [...convertedBufferLocations],
            default_type: locationTypes.default_type
        },
        calculated_metrics: {
            total_locations: calculateTotalLocations(uiConfig, missingLocations),
            total_modules: uiConfig.aisles * uiConfig.modules_per_aisle,
            total_levels: uiConfig.levels_per_aisle.reduce((sum, levels) => sum + levels, 0)
        }
    };

    const jsonString = JSON.stringify(warehouseConfig, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.style.display = 'none';
    
    // Add to DOM and trigger download immediately
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Clean up after download
    setTimeout(() => {
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    }, 100);

    console.log('✅ Warehouse configuration exported:', filename);
    return warehouseConfig;
}

/**
 * Imports a warehouse configuration from a JSON file and applies it via callback.
 * @param {File} jsonFile - The JSON file to import.
 * @param {Function} validateWarehouseConfiguration - Function to validate config structure.
 * @param {Function} callback - Callback to apply the imported config.
 */
export function importWarehouseConfiguration(jsonFile, validateWarehouseConfiguration, callback) {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const warehouseConfig = JSON.parse(event.target.result);
            if (!validateWarehouseConfiguration(warehouseConfig)) {
                throw new Error('Invalid warehouse configuration format');
            }

            // Convert 1-based indices in missing_locations and buffer_locations to 0-based
            if (Array.isArray(warehouseConfig.missing_locations)) {
                warehouseConfig.missing_locations = warehouseConfig.missing_locations.map(loc => {
                    // If loc is an object with index fields, convert them
                    if (loc && typeof loc === 'object') {
                        const newLoc = { ...loc };
                        ['aisle', 'level', 'module', 'depth', 'position'].forEach(key => {
                            if (typeof newLoc[key] === 'number') {
                                newLoc[key] = newLoc[key] - 1;
                            }
                        });
                        return newLoc;
                    }
                    return loc;
                });
            }
            if (
                warehouseConfig.location_types &&
                Array.isArray(warehouseConfig.location_types.buffer_locations)
            ) {
                warehouseConfig.location_types.buffer_locations = warehouseConfig.location_types.buffer_locations.map(loc => {
                    if (loc && typeof loc === 'object') {
                        const newLoc = { ...loc };
                        ['aisle', 'level', 'module', 'depth', 'position'].forEach(key => {
                            if (typeof newLoc[key] === 'number') {
                                newLoc[key] = newLoc[key] - 1;
                            }
                        });
                        return newLoc;
                    }
                    return loc;
                });
            }

            // If you have other index arrays to convert, add them here

            if (callback) {
                callback(warehouseConfig);
            }
        } catch (error) {
            console.error('❌ Error importing warehouse configuration:', error);
            alert(`Error importing configuration: ${error.message}`);
        }
    };
    reader.readAsText(jsonFile);
}

/**
 * Validates the structure of a warehouse configuration object.
 * @param {Object} config - The configuration object to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
export function validateWarehouseConfiguration(config) {
    if (!config.warehouse_parameters) return false;
    const params = config.warehouse_parameters;
    const requiredParams = ['aisles', 'levels_per_aisle', 'modules_per_aisle', 'locations_per_module', 'storage_depth', 'picking_stations'];
    for (const param of requiredParams) {
        if (!(param in params)) {
            console.error(`Missing required parameter: ${param}`);
            return false;
        }
    }
    if (!Array.isArray(params.levels_per_aisle) || params.levels_per_aisle.length !== params.aisles) return false;
    return true;
}
