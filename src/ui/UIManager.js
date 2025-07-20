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
        
        // 📊 INITIAL CONFIG LOG - SEND THIS TO ME! 📊
        console.log("🎛️ === INITIAL UI CONFIGURATION ===");
        console.log("📋 Default uiConfig:", this.uiConfig);
        console.log("🏁 === END INITIAL CONFIG ===");
        
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
                        <button id="start-animation-btn" class="animation-btn">Start Animation</button>
                        <button id="stop-animation-btn" class="animation-btn secondary">Stop Animation</button>
                    </div>
                    <div class="equipment-controls">
                        <button id="toggle-equipment-btn" class="animation-btn">🤖 Show Equipment</button>
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
                max-height: 80vh;
                overflow-y: auto;
            }
            
            #ui-panel.collapsed {
                height: auto;
                max-height: none;
                overflow: visible;
            }
            
            .ui-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 1px solid #6e9075;
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
            
            .ui-content {
                transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
                max-height: 1000px;
                opacity: 1;
                overflow: hidden;
            }
            
            .ui-content.collapsed {
                max-height: 0;
                opacity: 0;
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

        // Animation buttons
        document.getElementById('start-animation-btn').addEventListener('click', () => {
            this.sceneManager.animationManager.startContainerAnimation(this.uiConfig);
        });

        document.getElementById('stop-animation-btn').addEventListener('click', () => {
            this.sceneManager.animationManager.stopAnimation();
        });

        // Equipment toggle button
        document.getElementById('toggle-equipment-btn').addEventListener('click', () => {
            const btn = document.getElementById('toggle-equipment-btn');
            const shuttleGroup = this.sceneManager.animationManager.shuttleGroup;
            const liftGroup = this.sceneManager.animationManager.liftGroup;
            
            if (shuttleGroup.visible) {
                shuttleGroup.visible = false;
                liftGroup.visible = false;
                btn.textContent = '🤖 Show Equipment';
                btn.classList.add('secondary');
            } else {
                shuttleGroup.visible = true;
                liftGroup.visible = true;
                btn.textContent = '🚫 Hide Equipment';
                btn.classList.remove('secondary');
            }
        });
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
        for (let i = 0; i < this.uiConfig.aisles; i++) {
            const levels = this.uiConfig.levels_per_aisle[i];
            const capacity = levels * this.uiConfig.modules_per_aisle * this.uiConfig.locations_per_module * this.uiConfig.storage_depth * 2; // 2 sides per aisle
            total += capacity;
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
}
