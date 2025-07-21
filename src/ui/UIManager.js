export class UIManager {
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
        // Create UI container
        const uiContainer = document.createElement('div');
        uiContainer.id = 'ui-panel';
        uiContainer.innerHTML = `
            <div class="ui-header">
                <h2>3D OSR Warehouse Controls</h2>
                <button id="toggle-panel-btn" class="toggle-btn">−</button>
            </div>
            
            <div id="ui-content" class="ui-content">
                <div class="ui-section">
                    <label for="aisles">Aisles:</label>
                    <input type="range" id="aisles" min="1" max="8" value="${this.uiConfig.aisles}">
                    <span id="aisles-value">${this.uiConfig.aisles}</span>
                </div>

                <div class="ui-section" id="levels-container">
                    <h4>Levels per Aisle:</h4>
                    <!-- Dynamic level inputs will be added here -->
                </div>

                <div class="ui-section">
                    <label for="modules">Modules per Aisle:</label>
                    <input type="range" id="modules" min="3" max="15" value="${this.uiConfig.modules_per_aisle}">
                    <span id="modules-value">${this.uiConfig.modules_per_aisle}</span>
                </div>

                <div class="ui-section">
                    <label for="locations">Locations per Module:</label>
                    <input type="range" id="locations" min="2" max="8" value="${this.uiConfig.locations_per_module}">
                    <span id="locations-value">${this.uiConfig.locations_per_module}</span>
                </div>

                <div class="ui-section">
                    <label for="depth">Storage Depth:</label>
                    <input type="range" id="depth" min="1" max="6" value="${this.uiConfig.storage_depth}">
                    <span id="depth-value">${this.uiConfig.storage_depth}</span>
                </div>

                <div class="ui-section">
                    <label for="stations">Picking Stations:</label>
                    <input type="range" id="stations" min="1" max="8" value="${this.uiConfig.picking_stations}">
                    <span id="stations-value">${this.uiConfig.picking_stations}</span>
                </div>

                <div class="ui-section capacity-section">
                    <h4>Storage Capacity:</h4>
                    <div id="storage-capacity" class="capacity-display">0</div>
                    <small>Total storage locations</small>
                </div>

                <div class="ui-section animation-section">
                    <h4>Container Animation:</h4>
                    <div class="animation-controls">
                        <button id="toggle-animation-btn" class="animation-btn">Start Animation</button>
                    </div>
                    <!-- Equipment controls removed -->
                </div>

                <div class="ui-section configuration-section">
                    <h4>Configuration:</h4>
                    <div class="config-controls">
                        <button id="export-config-btn" class="config-btn export-btn">📤 Export JSON</button>
                        <button id="import-config-btn" class="config-btn import-btn">📥 Import JSON</button>
                        <input type="file" id="import-file-input" accept=".json" style="display: none;">
                    </div>
                </div>

                <div class="ui-section">
                    <button id="rebuild-btn" class="rebuild-button">Rebuild Warehouse</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(uiContainer);
        this.addStyles();
        this.bindEvents();
        this.updateLevelInputs();
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
            }
            
            .ui-content {
                transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
                max-height: calc(85vh - 80px); /* Account for header height */
                opacity: 1;
                overflow-y: auto;
                overflow-x: hidden;
                flex-grow: 1;
                /* Custom scrollbar styling */
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
            
            .ui-content.collapsed {
                max-height: 0;
                opacity: 0;
                overflow: hidden;
            }
            
            #ui-panel.collapsed {
                height: auto;
                max-height: none;
            }
            
            .ui-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #6e9075;
                flex-shrink: 0; /* Prevent header from shrinking */
            }
            
            .ui-header h2 {
                margin: 0;
                color: #1e3231;
                font-size: 18px;
                flex-grow: 1;
            }
            
            .toggle-btn {
                background: #93032e;
                color: #f1faee;
                border: none;
                border-radius: 4px;
                width: 30px;
                height: 30px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s;
            }
            
            .toggle-btn:hover {
                background: #6e0520;
            }
            
            .ui-section {
                margin-bottom: 15px;
                padding: 12px;
                border: 1px solid #6e9075;
                border-radius: 6px;
                background: #e5d1d0;
            }
            
            .ui-section label {
                display: block;
                margin-bottom: 5px;
                color: #1e3231;
                font-weight: bold;
            }
            
            .ui-section input[type="range"] {
                width: 60%;
                margin-right: 10px;
                height: 6px;
                border-radius: 3px;
                background: #6e9075;
                outline: none;
                -webkit-appearance: none;
            }
            
            .ui-section input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #93032e;
                cursor: pointer;
                border: 1px solid #f1faee;
            }
            
            .ui-section input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #93032e;
                cursor: pointer;
                border: 1px solid #f1faee;
            }
            
            .ui-section span {
                color: #93032e;
                font-weight: bold;
                min-width: 30px;
                display: inline-block;
            }
            
            .level-input {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
                padding-left: 10px;
            }
            
            .level-input label {
                min-width: 80px;
                margin-right: 10px;
                margin-bottom: 0;
                color: #1e3231;
            }
            
            .level-input input {
                width: 50%;
                margin-right: 10px;
            }
            
            #levels-container {
                /* When there are many aisles, limit the height and add scroll */
                max-height: 300px;
                overflow-y: auto;
                overflow-x: hidden;
            }
            
            #levels-container::-webkit-scrollbar {
                width: 6px;
            }
            
            #levels-container::-webkit-scrollbar-track {
                background: #f1faee;
                border-radius: 3px;
            }
            
            #levels-container::-webkit-scrollbar-thumb {
                background: #93032e;
                border-radius: 3px;
            }
            
            #levels-container::-webkit-scrollbar-thumb:hover {
                background: #6e0520;
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
            
            .animation-section {
                background: #f1faee;
                border: 2px solid #93032e;
            }
            
            .camera-buttons, .animation-controls, .equipment-controls {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .equipment-controls {
                grid-template-columns: 1fr;
            }
            
            .camera-btn, .animation-btn {
                padding: 8px 12px;
                background: #6e9075;
                color: #f1faee;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .camera-btn:hover, .animation-btn:hover {
                background: #93032e;
            }
            
            .animation-btn {
                background: #93032e;
            }
            
            .animation-btn:hover {
                background: #6e0520;
            }
            
            .animation-btn.secondary {
                background: #6e9075;
            }
            
            .animation-btn.secondary:hover {
                background: #5a735f;
            }
            
            .rebuild-button {
                width: 100%;
                padding: 10px;
                background: #6e9075;
                color: #f1faee;
                border: none;
                border-radius: 5px;
                font-weight: bold;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .rebuild-button:hover {
                background: #5a735f;
            }

            .configuration-section {
                border-top: 2px solid #e5d1d0;
                padding-top: 15px;
                margin-top: 15px;
            }

            .config-controls {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .config-btn {
                padding: 8px 12px;
                border: none;
                border-radius: 4px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 13px;
            }

            .export-btn {
                background: #1e3231;
                color: #f1faee;
            }

            .export-btn:hover {
                background: #2d4948;
                transform: translateY(-1px);
            }

            .import-btn {
                background: #93032e;
                color: #f1faee;
            }

            .import-btn:hover {
                background: #b8043a;
                transform: translateY(-1px);
            }
            
            .ui-section h4 {
                margin: 0 0 10px 0;
                color: #1e3231;
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        // Panel toggle
        document.getElementById('toggle-panel-btn').addEventListener('click', () => {
            const content = document.getElementById('ui-content');
            const btn = document.getElementById('toggle-panel-btn');
            content.classList.toggle('collapsed');
            btn.textContent = content.classList.contains('collapsed') ? '+' : '−';
        });

        // Rebuild button
        document.getElementById('rebuild-btn').addEventListener('click', () => {
            this.sceneManager.buildWarehouse(this.getConfig());
        });

        // Range inputs
        const updateValue = (id, configKey) => {
            const slider = document.getElementById(id);
            const span = document.getElementById(`${id}-value`);
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.uiConfig[configKey] = value;
                span.textContent = value;
                this.updateStorageCapacity();
            });
        };

        updateValue('aisles', 'aisles');
        updateValue('modules', 'modules_per_aisle');
        updateValue('locations', 'locations_per_module');
        updateValue('depth', 'storage_depth');
        updateValue('stations', 'picking_stations');

        // Update aisles count and rebuild level inputs
        document.getElementById('aisles').addEventListener('input', () => {
            this.updateLevelInputs();
        });

        // Animation toggle button
        const toggleBtn = document.getElementById('toggle-animation-btn');
        let isAnimating = false;

        // Listen for animation end to reset button
        const animationManager = this.sceneManager.animationManager;
        const originalStart = animationManager.startContainerAnimation.bind(animationManager);
        const originalStop = animationManager.stopAnimation.bind(animationManager);

        // Patch startContainerAnimation to reset button at end
        animationManager.startContainerAnimation = async (...args) => {
            isAnimating = true;
            toggleBtn.textContent = 'Stop Animation';
            await originalStart(...args);
            // Wait for animation to finish (isAnimating set to false in AnimationManager)
            const checkEnd = () => {
                if (!animationManager.isAnimating) {
                    isAnimating = false;
                    toggleBtn.textContent = 'Start Animation';
                } else {
                    setTimeout(checkEnd, 200);
                }
            };
            checkEnd();
        };

        animationManager.stopAnimation = (...args) => {
            isAnimating = false;
            toggleBtn.textContent = 'Start Animation';
            return originalStop(...args);
        };

        toggleBtn.addEventListener('click', () => {
            if (!isAnimating) {
                animationManager.startContainerAnimation(this.uiConfig);
            } else {
                animationManager.stopAnimation();
            }
        });

        // Configuration Export/Import buttons
        document.getElementById('export-config-btn').addEventListener('click', () => {
            const filename = prompt('Enter filename for export:', 'warehouse_config.json');
            if (filename) {
                this.sceneManager.exportWarehouseConfiguration(this.uiConfig, filename);
            }
        });

        document.getElementById('import-config-btn').addEventListener('click', () => {
            document.getElementById('import-file-input').click();
        });

        document.getElementById('import-file-input').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.sceneManager.importWarehouseConfiguration(file, (uiConfig, warehouseConfig) => {
                    // Update UI with imported configuration
                    this.uiConfig = uiConfig;
                    this.updateUIFromConfig();
                    this.updateStorageCapacity();
                    this.sceneManager.buildWarehouse(this.uiConfig);
                    
                    // Show success message
                    alert(`Successfully imported warehouse configuration: "${warehouseConfig.metadata.name}"`);
                });
                // Clear the file input
                event.target.value = '';
            }
        });

        // ...existing code...
    }

    updateLevelInputs() {
        const aisleCount = this.uiConfig.aisles;
        const container = document.getElementById('levels-container');
        
        // Adjust the levels_per_aisle array
        while (this.uiConfig.levels_per_aisle.length < aisleCount) {
            this.uiConfig.levels_per_aisle.push(5);
        }
        while (this.uiConfig.levels_per_aisle.length > aisleCount) {
            this.uiConfig.levels_per_aisle.pop();
        }

        // Clear and rebuild level inputs
        container.innerHTML = '<h4>Levels per Aisle:</h4>';
        
        for (let i = 0; i < aisleCount; i++) {
            const levelDiv = document.createElement('div');
            levelDiv.className = 'level-input';
            levelDiv.innerHTML = `
                <label>Aisle ${i + 1}:</label>
                <input type="range" min="2" max="12" value="${this.uiConfig.levels_per_aisle[i]}" data-aisle="${i}">
                <span>${this.uiConfig.levels_per_aisle[i]}</span>
            `;
            container.appendChild(levelDiv);

            // Bind event
            const slider = levelDiv.querySelector('input');
            const valueSpan = levelDiv.querySelector('span');
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const aisleIndex = parseInt(e.target.getAttribute('data-aisle'));
                this.uiConfig.levels_per_aisle[aisleIndex] = value;
                valueSpan.textContent = value;
                this.updateStorageCapacity();
            });
        }
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
        // Update all slider values and displays
        document.getElementById('aisles').value = this.uiConfig.aisles;
        document.getElementById('aisles-value').textContent = this.uiConfig.aisles;
        
        document.getElementById('modules').value = this.uiConfig.modules_per_aisle;
        document.getElementById('modules-value').textContent = this.uiConfig.modules_per_aisle;
        
        document.getElementById('locations').value = this.uiConfig.locations_per_module;
        document.getElementById('locations-value').textContent = this.uiConfig.locations_per_module;
        
        document.getElementById('depth').value = this.uiConfig.storage_depth;
        document.getElementById('depth-value').textContent = this.uiConfig.storage_depth;
        
        document.getElementById('stations').value = this.uiConfig.picking_stations;
        document.getElementById('stations-value').textContent = this.uiConfig.picking_stations;
        
        // Update level inputs
        this.updateLevelInputs();
    }
}
