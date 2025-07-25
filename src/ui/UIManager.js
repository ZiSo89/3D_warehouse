export class UIManager {
    /**
     * Appends a log message to the Logs / Info panel.
     * @param {string} message - The message to log (HTML allowed).
     */
    addLog(message) {
        const logPanel = document.getElementById('info-log-content');
        if (logPanel) {
            const entry = document.createElement('div');
            entry.className = 'info-log-entry';
            entry.innerHTML = message;
            logPanel.appendChild(entry);
            logPanel.scrollTop = logPanel.scrollHeight;
        }
    }
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.uiConfig = {
            aisles: 3,
            levels_per_aisle: [5, 6, 4],
            modules_per_aisle: 8,
            locations_per_module: 4,
            storage_depth: 2,
            picking_stations: 3,
        };
        
        this.createUI();
        this.updateStorageCapacity();
    }

    createUI() {
        // Create Info Panel container (info only)
        const uiContainer = document.createElement('div');
        uiContainer.id = 'ui-panel';
        uiContainer.innerHTML = `
            <div class="ui-header">
                <h2>Warehouse Info</h2>
            </div>
            <div id="ui-content" class="ui-content">
                <div class="ui-section capacity-section">
                    <h4>Storage Capacity:</h4>
                    <div id="storage-capacity" class="capacity-display">0</div>
                    <small>Total storage locations</small>
                </div>
                <div class="ui-section" id="info-logs">
                    <h4>Informations</h4>
                    <div id="info-log-content"></div>
                </div>
                <div class="ui-section object-info" id="object-info" style="display: none;">
                    <h4>Selected Object:</h4>
                    <div id="object-details"></div>
                </div>
            </div>
        `;
        document.body.appendChild(uiContainer);
        this.addStyles();
        this.updateStorageCapacity();
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #ui-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                background: #f1faee;
                border: 2px solid #1e3231;
                border-radius: 10px;
                padding: 15px;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                max-height: 85vh;
                display: flex;
                flex-direction: column;
                transition: opacity 0.3s, visibility 0.3s;
            }
            .ui-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #6e9075;
                flex-shrink: 0;
            }
            .ui-header h2 {
                margin: 0;
                color: #1e3231;
                font-size: 18px;
                flex-grow: 1;
            }
            .ui-content {
                transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
                max-height: calc(85vh - 80px);
                opacity: 1;
                overflow-y: auto;
                overflow-x: hidden;
                flex-grow: 1;
                scrollbar-width: thin;
                scrollbar-color: #6e9075 #e5d1d0;
            }
            .ui-content::-webkit-scrollbar {
                width: 8px;
            }
            .ui-content::-webkit-scrollbar-track {
                background: #e5d1d0;
                border-radius: 4px;
            }
            .ui-content::-webkit-scrollbar-thumb {
                background: #6e9075;
                border-radius: 4px;
            }
            .ui-content::-webkit-scrollbar-thumb:hover {
                background: #5a735f;
            }
            .ui-section {
                margin-bottom: 15px;
                padding: 12px;
                border: 1px solid #6e9075;
                border-radius: 6px;
                background: #e5d1d0;
            }
            .ui-section h4 {
                margin: 0 0 10px 0;
                color: #1e3231;
            }
            .capacity-section {
                background: #f1faee;
                padding: 15px;
                border-radius: 8px;
                border: 2px solid #93032e;
            }
            .capacity-display {
                font-size: 24px;
                font-weight: bold;
                text-align: center;
                color: #93032e;
                margin: 10px 0;
            }
        `;
        document.head.appendChild(style);
    }

    // All event bindings for input controls have been moved to InteractionManager.
    // UIManager now only manages Info Panel display and updates.

    updateLevelInputs() {
        // No-op: Level input controls are now managed by InteractionManager
        return;
    }

    updateStorageCapacity() {
        const totalCapacity = this.calculateStorageCapacity();
        document.getElementById('storage-capacity').textContent = totalCapacity.toLocaleString();
    }

    calculateStorageCapacity() {
        let total = 0;
        
        // Get missing locations and location types from SceneManager
        const missingLocations = this.sceneManager.missingLocations || [];
        const locationTypes = this.sceneManager.locationTypes || { buffer_locations: [], default_type: 'Storage' };
        
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
        
        // Count actual available locations
        for (let a = 0; a < this.uiConfig.aisles; a++) {
            const levels = this.uiConfig.levels_per_aisle[a];
            
            for (let l = 0; l < levels; l++) {
                for (let m = 0; m < this.uiConfig.modules_per_aisle; m++) {
                    for (let d = 0; d < this.uiConfig.storage_depth; d++) {
                        for (let s = 0; s < this.uiConfig.locations_per_module; s++) {
                            // Count locations on both sides of the aisle (West and East)
                            for (let side = 0; side < 2; side++) {
                                // Check if this location is missing
                                if (!isLocationMissing(a, l, m, d, s)) {
                                    // Location exists, so count it
                                    total++;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return total;
    }

    getConfig() {
        return this.uiConfig;
    }

    // Duplicate addLog removed. The correct version is at the top of the file, without timestamp.

    setCameraView(view) {
        const camera = this.sceneManager.camera;
        const controls = this.sceneManager.controls;
        
        // Calculate warehouse dimensions based on current config
        const totalRackDepth = this.uiConfig.storage_depth * 1.5; // locationDepth from constants
        const rackAndAisleWidth = (totalRackDepth * 2) + 3; // aisleWidth from constants
        const warehouseWidth = this.uiConfig.aisles * rackAndAisleWidth;
        const warehouseLength = this.uiConfig.modules_per_aisle * 2; // moduleLength from constants
        
        const centerX = warehouseWidth / 2;
        const centerZ = warehouseLength / 2;
        
        switch(view) {
            case 'overview':
                camera.position.set(centerX + 15, 15, centerZ + 20);
                controls.target.set(centerX, 0, centerZ);
                break;
                
            case 'front':
                camera.position.set(centerX, 8, warehouseLength + 15);
                controls.target.set(centerX, 0, centerZ);
                break;
                
            case 'side':
                camera.position.set(warehouseWidth + 15, 8, centerZ);
                controls.target.set(centerX, 0, centerZ);
                break;
                
            case 'top':
                camera.position.set(centerX, 25, centerZ);
                controls.target.set(centerX, 0, centerZ);
                break;
                
            case 'aisle':
                camera.position.set(rackAndAisleWidth/2, 3, centerZ + 10);
                controls.target.set(rackAndAisleWidth/2, 0, centerZ);
                break;
        }
        
        controls.update();
    }

    updateUIFromConfig() {
        // No-op: UI controls are now managed by InteractionManager
        return;
    }
}
