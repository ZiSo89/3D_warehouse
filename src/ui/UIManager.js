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
            // Compact object details for mobile
            if (window.innerWidth <= 600 && /aisle:|level:|module:|depth:|position:/i.test(message)) {
                // Try to extract the 'Selected: X' label
                let labelMatch = message.match(/Selected: ?(<strong>.*?<\/strong>|[\w ]+)/i);
                let label = labelMatch ? labelMatch[0] : '';
                // Extract all key: value pairs
                const regex = /<strong>(aisle|level|module|depth|position):<\/strong>\s*([\d]+)/gi;
                let compact = [];
                let m;
                while ((m = regex.exec(message)) !== null) {
                    compact.push(`${m[1]}: ${m[2]}`);
                }
                if (compact.length) {
                    entry.innerHTML = (label ? label + ' ' : '') + compact.join(' | ');
                } else {
                    entry.innerHTML = message;
                }
            } else {
                entry.innerHTML = message;
            }
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
            <div class="toggle-sticky-wrapper">
                <button id="ui-toggle" aria-label="Hide Info Panel" title="Hide Info Panel" style="background:#b7b7a4;color:#3d3d2d;border:none;border-radius:4px;font-size:20px;width:36px;height:36px;cursor:pointer;z-index:2000;transition:background 0.3s;display:block;visibility:visible;">☰</button>
            </div>
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
        // Toggle logic for info panel
        const toggleBtn = uiContainer.querySelector('#ui-toggle');
        const uiContent = uiContainer.querySelector('#ui-content');
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = uiContainer.classList.toggle('collapsed');
            toggleBtn.setAttribute('aria-label', isCollapsed ? 'Show Info Panel' : 'Hide Info Panel');
            toggleBtn.setAttribute('title', isCollapsed ? 'Show Info Panel' : 'Hide Info Panel');
            toggleBtn.textContent = '☰';
            if (isCollapsed) {
                uiContent.style.display = 'none';
            } else {
                uiContent.style.display = '';
            }
        });
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #ui-toggle {
                position: absolute;
                top: 8px;
                right: 8px;
                background: #b7b7a4;
                color: #3d3d2d;
                border: none;
                border-radius: 4px;
                font-size: 20px;
                width: 36px;
                height: 36px;
                cursor: pointer;
                z-index: 2000;
                transition: background 0.3s;
                display: block;
                visibility: visible;
            }
            #ui-toggle:hover {
                background: #bc6c25;
            }
            #ui-panel.collapsed {
                width: 48px !important;
                min-width: 0 !important;
                max-width: 48px !important;
                height: 48px !important;
                padding: 0 !important;
                overflow: hidden !important;
            }
            #ui-panel.collapsed .ui-header,
            #ui-panel.collapsed .ui-content {
                display: none !important;
            }
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
                scrollbar-color: #6e9075 #e0e4e2;
            }
            .ui-content::-webkit-scrollbar {
                width: 8px;
            }
            .ui-content::-webkit-scrollbar-track {
                background: #e0e4e2;
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
                background: #e0e4e2;
            }
            .ui-section h4 {
                margin: 0 0 10px 0;
                color: #3d3d4c;
            }
            .ui-label {
                display: block;
                background: #f8f8f3; /* OC-108 */
                color: #3d5a6c; /* AF-565 text */
                font-weight: bold;
                border-radius: 4px;
                padding: 3px 8px;
                margin-bottom: 6px;
                font-size: 13px;
                text-align: left;
            }
            .ui-slider-label {
                color: #3d5a6c;
                font-weight: bold;
                font-size: 13px;
                margin-bottom: 2px;
                display: block;
            }
            .ui-slider-value {
                color: #3d5a6c;
                font-weight: bold;
                font-size: 15px;
                margin-left: 8px;
                display: inline-block;
                min-width: 24px;
                text-align: center;
                vertical-align: middle;
            }
            input[type="range"] {
                width: 70%;
                accent-color: #bcb6c6; /* 2114-60 muted lavender */
                background: #f8f8f3;
                border-radius: 4px;
                height: 6px;
                margin: 0 8px 0 0;
                border: 1px solid #bfcad6;
                box-shadow: none;
            }
            input[type="range"]::-webkit-slider-thumb {
                background: #bcb6c6;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                border: 2px solid #3d5a6c;
                box-shadow: 0 1px 4px rgba(61,90,108,0.12);
            }
            input[type="range"]::-moz-range-thumb {
                background: #bcb6c6;
                border-radius: 50%;
                border: 2px solid #3d5a6c;
                width: 18px;
                height: 18px;
                box-shadow: 0 1px 4px rgba(61,90,108,0.12);
            }
            input[type="range"]::-ms-thumb {
                background: #bcb6c6;
                border-radius: 50%;
                border: 2px solid #3d5a6c;
                width: 18px;
                height: 18px;
                box-shadow: 0 1px 4px rgba(61,90,108,0.12);
            }
            input[type="range"]:focus {
                outline: none;
                box-shadow: 0 0 0 2px #bcb6c6;
            }
            input[type="range"]::-webkit-slider-runnable-track {
                background: #e0e4e2;
                height: 6px;
                border-radius: 4px;
                border: 1px solid #bfcad6;
            }
            input[type="range"]::-ms-fill-lower {
                background: #e0e4e2;
            }
            input[type="range"]::-ms-fill-upper {
                background: #e0e4e2;
            }
            input[type="range"]::-moz-range-track {
                background: #e0e4e2;
                height: 6px;
                border-radius: 4px;
                border: 1px solid #bfcad6;
            }
            input[type="range"]:disabled {
                background: #dbe3e6;
            }
            .capacity-section {
                background: #f1faee;
                padding: 15px;
                border-radius: 8px;
                border: 2px solid #2d6a4f;
            }
            .capacity-display {
                font-size: 24px;
                font-weight: bold;
                text-align: center;
                color: #2d6a4f;
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
