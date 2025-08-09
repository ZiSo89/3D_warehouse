/**
 * Warehouse configuration export/import utilities.
 * @fileoverview Helper functions for exporting and importing warehouse configurations.
 * JSDoc typedefs are provided so editors & tooling (ESLint / TypeScript intellisense) can reason about
 * the data structures without a TypeScript migration.
 */

/**
 * A single missing location descriptor (all indices 0-based internally).
 * Any of the index properties can be -1 to indicate a wildcard / not specified.
 * @typedef {Object} MissingLocation
 * @property {number} [aisle]
 * @property {number} [level]
 * @property {number} [module]
 * @property {number} [depth]
 * @property {number} [position]
 * @property {string} [side] Optional side info (e.g., 'left'/'right').
 */

/**
 * Descriptor of a special location type override / custom definition.
 * @typedef {Object} LocationTypeDescriptor
 * @property {string} id Unique id / name.
 * @property {number} [aisle]
 * @property {number|number[]} [level]
 * @property {number} [module]
 * @property {number} [depth]
 * @property {number|number[]} [position]
 * @property {string} [category] UI grouping category.
 * @property {Object<string,any>} [meta] Arbitrary metadata.
 */

/**
 * Prezone ellipse shape.
 * @typedef {Object} PrezoneEllipse
 * @property {{x:number,y:number,z:number}} position
 * @property {{radiusX:number,radiusZ:number}} dimensions
 */

/**
 * Prezone visuals container.
 * @typedef {Object} PrezoneVisuals
 * @property {PrezoneEllipse} ellipse
 */

/**
 * PLC Station descriptor.
 * @typedef {Object} PlcStation
 * @property {number} id Station numeric id.
 * @property {string} type Station type (e.g. 'SimpleStation','EvoLift').
 * @property {string} [description]
 * @property {string} [group]
 */

/**
 * UI configuration object used by the editor / scene before export.
 * @typedef {Object} UIConfig
 * @property {number} aisles
 * @property {number[]} levels_per_aisle Array length equals aisles.
 * @property {number} modules_per_aisle
 * @property {number} locations_per_module
 * @property {number} storage_depth Storage depth per location (e.g., 1,2,3).
 * @property {number} picking_stations Total picking stations.
 * @property {PrezoneVisuals} [prezone_visuals]
 * @property {PlcStation[]} [plc_stations]
 */

/**
 * The object shape written to JSON during export.
 * @typedef {Object} WarehouseConfig
 * @property {{name:string,created:string,version:string,description:string}} metadata
 * @property {{
 *  aisles:number,
 *  levels_per_aisle:number[],
 *  modules_per_aisle:number,
 *  locations_per_module:number,
 *  storage_depth:number,
 *  picking_stations:number
 * }} warehouse_parameters
 * @property {PrezoneVisuals} prezone_visuals
 * @property {PlcStation[]} plc_stations
 * @property {MissingLocation[]} missing_locations
 * @property {LocationTypeDescriptor[]} location_types
 */

/**
 * Convert one-based indices (as exposed to external JSON) to zero-based internal form.
 * Leaves -1 (wildcard) values untouched.
 * @param {Record<string,any>} obj
 * @param {string[]} keys Index-like keys to convert.
 * @param {1|-1} direction +1 to convert 0->1 (export), -1 to convert 1->0 (import)
 * @returns {Record<string,any>} Mutated shallow clone.
 */
function convertIndexFields(obj, keys, direction) {
    const newObj = { ...obj };
    for (const key of keys) {
        const value = newObj[key];
        if (typeof value === 'number' && value !== -1) {
            newObj[key] = value + direction;
        } else if (Array.isArray(value)) {
            newObj[key] = value.map(v => (typeof v === 'number' && v !== -1 ? v + direction : v));
        }
    }
    return newObj;
}

const INDEX_KEYS = ['aisle', 'level', 'module', 'depth', 'position'];

/**
 * Exports the warehouse configuration as a JSON file and returns the config object.
 * @param {Object} uiConfig - The current UI configuration
 * @param {Array} missingLocations - Array of missing locations
 * @param {Object} locationTypes - Location types object
 * @param {Function} calculateTotalLocations - Function to calculate total locations
 * @param {string} [filename='warehouse_config.json'] - The filename for export
 * @returns {Object} The warehouse configuration object
 */
export function exportWarehouseConfiguration(uiConfig, missingLocations, locationTypes, calculateTotalLocations, filename = 'warehouse_config.json') {
    /** @type {MissingLocation[]} */
    const convertedMissingLocations = missingLocations.map(loc => (loc && typeof loc === 'object' ? convertIndexFields(loc, INDEX_KEYS, +1) : loc));

    /** @type {LocationTypeDescriptor[]} */
    const convertedLocationTypes = (Array.isArray(locationTypes) ? locationTypes : []).map(loc => (loc && typeof loc === 'object' ? convertIndexFields(loc, INDEX_KEYS, +1) : loc));

    /** @type {WarehouseConfig} */
    const warehouseConfig = {
        metadata: {
            name: filename.replace('.json', ''),
            created: new Date().toISOString(),
            version: '2.0.0',
            description: 'Enhanced warehouse configuration with PLC prezone'
        },
        warehouse_parameters: {
            aisles: uiConfig.aisles,
            levels_per_aisle: [...uiConfig.levels_per_aisle],
            modules_per_aisle: uiConfig.modules_per_aisle,
            locations_per_module: uiConfig.locations_per_module,
            storage_depth: uiConfig.storage_depth,
            picking_stations: uiConfig.picking_stations
        },
        // Include prezone visuals with current ellipse dimensions (same structure as warehouse_config_instance)
        prezone_visuals: uiConfig.prezone_visuals ? {
            ellipse: {
                position: { ...uiConfig.prezone_visuals.ellipse.position },
                dimensions: { ...uiConfig.prezone_visuals.ellipse.dimensions }
            }
        } : {
            ellipse: {
                position: { x: 0, y: 0.0, z: -5.0 },
                dimensions: { radiusX: 20.0, radiusZ: 2.0 }
            }
        },
        // Include PLC stations (same structure as warehouse_config_instance)
        plc_stations: uiConfig.plc_stations ? uiConfig.plc_stations.map(s => ({ ...s })) : [],
        missing_locations: [...convertedMissingLocations],
        location_types: [...convertedLocationTypes]
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
            
            // Log essential import information only
            console.log('✅ Configuration imported:', jsonFile.name);
            
            if (!validateWarehouseConfiguration(warehouseConfig)) {
                throw new Error('Invalid warehouse configuration format');
            }

            // Convert 1-based indices in missing_locations and buffer_locations to 0-based
            if (Array.isArray(warehouseConfig.missing_locations)) {
                warehouseConfig.missing_locations = warehouseConfig.missing_locations.map(loc => (loc && typeof loc === 'object' ? convertIndexFields(loc, INDEX_KEYS, -1) : loc));
            }
            if (warehouseConfig.location_types && Array.isArray(warehouseConfig.location_types)) {
                warehouseConfig.location_types = warehouseConfig.location_types.map(loc => (loc && typeof loc === 'object' ? convertIndexFields(loc, INDEX_KEYS, -1) : loc));
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
