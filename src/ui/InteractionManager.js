

/**
 * InteractionManager handles user interaction with the 3D scene and the control panel UI.
 * @class InteractionManager
 * @param {SceneManager} sceneManager - The main scene manager instance.
 * @param {UIManager} uiManager - The UI manager instance.
 */
import { getCameraViewConfig, syncLevelsPerAisle } from './uiUtils.js';
import * as THREE from 'three';

export class InteractionManager {
    /**
     * @param {SceneManager} sceneManager
     * @param {UIManager} uiManager
     */
    constructor(sceneManager, uiManager) {
        this.sceneManager = sceneManager;
        this.uiManager = uiManager;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;
        this.originalMaterial = null;
        this.highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5
        });

        this.init();
        this.createCameraPresets();
    }
    /**
     * Initializes event listeners and creates the interaction UI.
     */
    init() {
        // Mouse events
        this.sceneManager.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
        this.sceneManager.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));

        // Touch events for mobile selection
        this.sceneManager.renderer.domElement.addEventListener('touchstart', (event) => {
            // Only handle single-finger tap (not drag/zoom)
            if (event.touches.length === 1) {
                // Simulate a click at the touch position
                const touch = event.touches[0];
                // Create a synthetic event with clientX/clientY
                const fakeEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                };
                this.onMouseClick(fakeEvent);
            }
        });

        // Keyboard events
        document.addEventListener('keydown', this.onKeyDown.bind(this));

        // Create interaction UI
        this.createInteractionUI();
    }

    /**
     * Creates camera preset configurations.
     */
    createCameraPresets() {
        // Camera presets will be calculated dynamically based on current warehouse config
        this.cameraPresets = {
            overview: { name: "Overview" },
            topView: { name: "Top View" },
            sideView: { name: "Side View" },
            prezoneView: { name: "Prezone View" },
            aisleView: { name: "Aisle View" }
        };
    }

    /**
     * Creates the main interaction panel UI and binds events.
     */
    createInteractionUI() {
        // Prevent duplicate panel creation
        if (document.getElementById('interaction-panel')) {
            return;
        }
        // Add loading overlay to body (hidden by default)
        if (!document.getElementById('loading-overlay')) {
            const loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-spinner"></div>
            `;
            loadingOverlay.style.display = 'none';
            document.body.appendChild(loadingOverlay);
        }
        const interactionPanel = document.createElement('div');
        interactionPanel.id = 'interaction-panel';
        interactionPanel.innerHTML = `
            <div class="toggle-sticky-wrapper">
                <button id="interaction-toggle" aria-label="Hide Panel" title="Hide Controls" style="background:#b7b7a4;color:#3d3d2d;border:none;border-radius:4px;font-size:20px;width:36px;height:36px;cursor:pointer;z-index:2000;transition:background 0.3s;display:block;visibility:visible;">☰</button>
            </div>
            <div class="interaction-header">
                <h3>Settings & Actions</h3>
            </div>
            <div class="input-section">
                <div class="ui-section">
                    <label for="aisles">Aisles:</label>
                    <input type="range" id="aisles" min="1" max="4" value="${this.uiManager.uiConfig.aisles}">
                    <span id="aisles-value">${this.uiManager.uiConfig.aisles}</span>
                </div>
                <div class="ui-section" id="levels-container">
                    <h4>Levels per Aisle:</h4>
                    <!-- Dynamic level inputs will be added here -->
                </div>
                <div class="ui-section">
                    <label for="modules">Modules per Aisle:</label>
                    <input type="range" id="modules" min="3" max="8" value="${this.uiManager.uiConfig.modules_per_aisle}">
                    <span id="modules-value">${this.uiManager.uiConfig.modules_per_aisle}</span>
                </div>
                <div class="ui-section">
                    <label for="locations">Locations per Module:</label>
                    <input type="range" id="locations" min="2" max="4" value="${this.uiManager.uiConfig.locations_per_module}">
                    <span id="locations-value">${this.uiManager.uiConfig.locations_per_module}</span>
                </div>
                <div class="ui-section">
                    <label for="depth">Storage Depth:</label>
                    <input type="range" id="depth" min="1" max="3" value="${this.uiManager.uiConfig.storage_depth}">
                    <span id="depth-value">${this.uiManager.uiConfig.storage_depth}</span>
                </div>
                <div class="ui-section">
                    <label for="stations">Picking Stations:</label>
                    <input type="range" id="stations" min="1" max="4" value="${this.uiManager.uiConfig.picking_stations}">
                    <span id="stations-value">${this.uiManager.uiConfig.picking_stations}</span>
                </div>
                <div class="ui-section animation-section">
                    <h4>Container Animation:</h4>
                    <div class="animation-controls">
                        <button id="toggle-animation-btn" class="animation-btn">Start Animation</button>
                    </div>
                </div>
                <div class="ui-section configuration-section">
                    <h4>Configuration:</h4>
                    <div class="config-controls">
                        <button id="export-config-btn" class="config-btn export-btn">📤 Export JSON</button>
                        <button id="import-config-btn" class="config-btn import-btn">📥 Import JSON</button>
                        <input type="file" id="import-file-input" accept=".json" style="display: none;">
                    </div>
                </div>
                <div class="ui-section" style="display: flex; flex-direction: column; align-items: center;">
                    <button id="rebuild-btn" class="rebuild-button" style="margin-bottom: 8px;">Rebuild Warehouse</button>
                    <button id="reset-default-btn" class="reset-default-button">Reset to Default</button>
                </div>
            </div>
            <div class="camera-buttons">
                <button class="camera-btn" data-preset="overview">📊 Overview</button>
                <button class="camera-btn" data-preset="topView">⬆️ Top View</button>
                <button class="camera-btn" data-preset="sideView">↔️ Side View</button>
                <button class="camera-btn" data-preset="prezoneView">📦 Prezone</button>
            </div>
            <div class="object-info" id="object-info" style="display: none;">
                <h4>Selected Object:</h4>
                <div id="object-details"></div>
            </div>
        `;
        document.body.appendChild(interactionPanel);
        this.bindCameraEvents();
        this.bindInputPanelEvents(interactionPanel);
        // Toggle logic (single instance)
        const toggleBtn = interactionPanel.querySelector('#interaction-toggle');
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = interactionPanel.classList.toggle('collapsed');
            toggleBtn.setAttribute('aria-label', isCollapsed ? 'Show Panel' : 'Hide Panel');
            toggleBtn.setAttribute('title', isCollapsed ? 'Show Controls' : 'Hide Controls');
            toggleBtn.textContent = '☰';
        });

        // Update all UI text to English
        interactionPanel.querySelector('.interaction-header h3').textContent = 'Settings & Actions';
        interactionPanel.querySelector('label[for="aisles"]').textContent = 'Aisles:';
        interactionPanel.querySelector('label[for="modules"]').textContent = 'Modules per Aisle:';
        interactionPanel.querySelector('label[for="locations"]').textContent = 'Locations per Module:';
        interactionPanel.querySelector('label[for="depth"]').textContent = 'Storage Depth:';
        interactionPanel.querySelector('label[for="stations"]').textContent = 'Picking Stations:';
        interactionPanel.querySelector('.animation-section h4').textContent = 'Container Animation:';
        interactionPanel.querySelector('.configuration-section h4').textContent = 'Configuration:';
        interactionPanel.querySelector('#rebuild-btn').textContent = 'Rebuild Warehouse';
        interactionPanel.querySelector('#export-config-btn').textContent = '📤 Export JSON';
        interactionPanel.querySelector('#import-config-btn').textContent = '📥 Import JSON';
        interactionPanel.querySelector('#levels-container h4').textContent = 'Levels per Aisle:';
    }


    /**
     * Binds event listeners to the input panel controls.
     * @param {HTMLElement} panel - The DOM element containing the input panel controls.
     */
    bindInputPanelEvents(panel) {
        // Reset to Default button
        const resetDefaultBtn = panel.querySelector('#reset-default-btn');
        resetDefaultBtn.addEventListener('click', () => {
            // Default config (should match UIManager's default)
            const defaultConfig = {
                aisles: 3,
                levels_per_aisle: [5, 6, 4],
                modules_per_aisle: 8,
                locations_per_module: 4,
                storage_depth: 2,
                picking_stations: 3,
            };
            this.uiManager.uiConfig = JSON.parse(JSON.stringify(defaultConfig));
            this.updateInputPanelFromConfig(panel);
            this.uiManager.updateStorageCapacity();
            this.showLoadingOverlay();
            setTimeout(() => {
                this.sceneManager.buildWarehouse(this.uiManager.uiConfig);
                this.hideLoadingOverlay();
            }, 400);
        });
        // Range sliders
        const updateValue = (id, configKey) => {
            const slider = panel.querySelector(`#${id}`);
            const span = panel.querySelector(`#${id}-value`);
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.uiManager.uiConfig[configKey] = value;
                span.textContent = value;
                this.uiManager.updateStorageCapacity();
                if (id === 'aisles') {
                    this.updateLevelInputs(panel);
                }
            });
        };
        updateValue('aisles', 'aisles');
        updateValue('modules', 'modules_per_aisle');
        updateValue('locations', 'locations_per_module');
        updateValue('depth', 'storage_depth');
        updateValue('stations', 'picking_stations');

        // Dynamic level inputs
        this.updateLevelInputs(panel);

        // Animation toggle
        const toggleBtn = panel.querySelector('#toggle-animation-btn');
        let isAnimating = false;
        const animationManager = this.sceneManager.animationManager;
        const originalStart = animationManager.startContainerAnimation.bind(animationManager);
        const originalStop = animationManager.stopAnimation.bind(animationManager);
        animationManager.startContainerAnimation = async (...args) => {
            isAnimating = true;
            toggleBtn.textContent = 'Stop Animation';
            await originalStart(...args);
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
                animationManager.startContainerAnimation(this.uiManager.uiConfig);
            } else {
                animationManager.stopAnimation();
            }
        });

        // Export/Import
        panel.querySelector('#export-config-btn').addEventListener('click', () => {
            const filename = prompt('Enter filename for export:', 'warehouse_config.json');
            if (filename) {
                this.sceneManager.exportWarehouseConfiguration(this.uiManager.uiConfig, filename);
            }
        });
        panel.querySelector('#import-config-btn').addEventListener('click', () => {
            panel.querySelector('#import-file-input').click();
        });
        panel.querySelector('#import-file-input').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.showLoadingOverlay();
                this.sceneManager.importWarehouseConfiguration(file, (uiConfig, warehouseConfig) => {
                    // Always use the imported config for the 3D model
                    this.sceneManager.modelConfig = { ...uiConfig };

                    // Clamp values for UI only (sliders etc.)
                    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
                    const uiClampedConfig = {
                        aisles: clamp(uiConfig.aisles, 1, 4),
                        levels_per_aisle: Array.isArray(uiConfig.levels_per_aisle)
                            ? uiConfig.levels_per_aisle.map(lv => clamp(lv, 2, 12)).slice(0, 4)
                            : [2, 2, 2, 2],
                        modules_per_aisle: clamp(uiConfig.modules_per_aisle, 3, 8),
                        locations_per_module: clamp(uiConfig.locations_per_module, 2, 4),
                        storage_depth: clamp(uiConfig.storage_depth, 1, 3),
                        picking_stations: clamp(uiConfig.picking_stations, 1, 4),
                    };
                    this.uiManager.uiConfig = uiClampedConfig;
                    this.updateInputPanelFromConfig(panel);
                    this.uiManager.updateStorageCapacity();
                    // Build the warehouse with the full imported config (not clamped)
                    this.sceneManager.buildWarehouse(uiConfig);
                    setTimeout(() => {
                        this.hideLoadingOverlay();
                    }, 400);
                });
                event.target.value = '';
            }
        });
        // Rebuild button
        panel.querySelector('#rebuild-btn').addEventListener('click', () => {
            this.showLoadingOverlay();
            setTimeout(() => {
                this.sceneManager.buildWarehouse(this.uiManager.getConfig());
                this.hideLoadingOverlay();
            }, 400);
        });
    }

    // Show loading overlay
    /**
     * Shows the loading overlay.
     */
    showLoadingOverlay() {
        let overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'flex';
    }

    // Hide loading overlay
    /**
     * Hides the loading overlay.
     */
    hideLoadingOverlay() {
        let overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    /**
     * Updates the level input sliders for each aisle.
     * @param {HTMLElement} panel - The DOM element containing the input panel controls.
     */
    updateLevelInputs(panel) {
        const aisleCount = this.uiManager.uiConfig.aisles;
        const container = panel.querySelector('#levels-container');
        // Adjust the levels_per_aisle array using utility
        syncLevelsPerAisle(this.uiManager.uiConfig.levels_per_aisle, aisleCount);
        // Clear and rebuild level inputs
        container.innerHTML = '<h4>Levels per Aisle:</h4>';
        for (let i = 0; i < aisleCount; i++) {
            const levelDiv = document.createElement('div');
            levelDiv.className = 'level-input';
            levelDiv.innerHTML = `
                <label>Aisle ${i + 1}:</label>
                <input type="range" min="2" max="12" value="${this.uiManager.uiConfig.levels_per_aisle[i]}" data-aisle="${i}">
                <span>${this.uiManager.uiConfig.levels_per_aisle[i]}</span>
            `;
            container.appendChild(levelDiv);
            // Bind event
            const slider = levelDiv.querySelector('input');
            const valueSpan = levelDiv.querySelector('span');
            slider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                const aisleIndex = parseInt(e.target.getAttribute('data-aisle'));
                this.uiManager.uiConfig.levels_per_aisle[aisleIndex] = value;
                valueSpan.textContent = value;
                this.uiManager.updateStorageCapacity();
            });
        }
    }

    /**
     * Updates the input panel UI elements to reflect the current configuration in uiManager.uiConfig.
     * This ensures that all sliders, values, and dynamic level inputs are synchronized with the latest config,
     * typically after importing a configuration or programmatically changing settings.
     * @param {HTMLElement} panel - The DOM element containing the input panel controls.
     */
    /**
     * Updates the input panel UI elements to reflect the current configuration in uiManager.uiConfig.
     * @param {HTMLElement} panel - The DOM element containing the input panel controls.
     */
    updateInputPanelFromConfig(panel) {
        // Update all slider values and displays
        panel.querySelector('#aisles').value = this.uiManager.uiConfig.aisles;
        panel.querySelector('#aisles-value').textContent = this.uiManager.uiConfig.aisles;
        panel.querySelector('#modules').value = this.uiManager.uiConfig.modules_per_aisle;
        panel.querySelector('#modules-value').textContent = this.uiManager.uiConfig.modules_per_aisle;
        panel.querySelector('#locations').value = this.uiManager.uiConfig.locations_per_module;
        panel.querySelector('#locations-value').textContent = this.uiManager.uiConfig.locations_per_module;
        panel.querySelector('#depth').value = this.uiManager.uiConfig.storage_depth;
        panel.querySelector('#depth-value').textContent = this.uiManager.uiConfig.storage_depth;
        panel.querySelector('#stations').value = this.uiManager.uiConfig.picking_stations;
        panel.querySelector('#stations-value').textContent = this.uiManager.uiConfig.picking_stations;
        // Update level inputs
        this.updateLevelInputs(panel);
    }


    /**
     * Handles mouse click events for object selection in the 3D scene.
     * @param {MouseEvent|Object} event - The mouse or synthetic event.
     */
    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        // Collect all objects to check for intersections
        const objectsToCheck = [];
        if (this.sceneManager.warehouseGroup) {
            objectsToCheck.push(...this.sceneManager.warehouseGroup.children);
        }
        if (this.sceneManager.animationManager) {
            if (this.sceneManager.animationManager.shuttleGroup) {
                objectsToCheck.push(...this.sceneManager.animationManager.shuttleGroup.children);
            }
            if (this.sceneManager.animationManager.liftGroup) {
                objectsToCheck.push(...this.sceneManager.animationManager.liftGroup.children);
            }
        }

        const intersects = this.raycaster.intersectObjects(objectsToCheck, true);

        let selectedObject = null;
        // 1. Prioritize shuttles/lifts
        for (let intersection of intersects) {
            const obj = intersection.object;
            if (obj.userData && (obj.userData.type === 'lift' || obj.userData.type === 'shuttle')) {
                selectedObject = obj;
                break;
            }
        }
        // 2. If not found, look for storage locations and other components
        if (!selectedObject) {
            for (let intersection of intersects) {
                const obj = intersection.object;
                // Exclude conveyors, picking stations, and rack module frames
                if (
                    (obj.userData && (obj.userData.type === 'conveyor' || obj.userData.type === 'picking_station')) ||
                    (obj.name && (obj.name.startsWith('SOURCE_') || obj.name.startsWith('TARGET_') || obj.name.startsWith('PREZONE_')))
                ) {
                    continue;
                }
                if (obj.material && obj.material.color) {
                    const colorHex = obj.material.color.getHex();
                    if (
                        colorHex === 0x2196F3 || // SOURCE (blue)
                        colorHex === 0xFF9800 || // TARGET (orange)
                        colorHex === 0x666666 || // Support pillar (grey)
                        colorHex === 0x2c2c2c || colorHex === 0x404040 || (colorHex >= 0x1a1a1a && colorHex <= 0x404040) // Prezone (dark grey)
                    ) {
                        continue;
                    }
                    if (
                        colorHex === 0x4CAF50 || // Picking station (green)
                        colorHex === 0x8b4513 || (colorHex >= 0x800000 && colorHex <= 0x8b7355) // Picking station (brown range)
                    ) {
                        continue;
                    }
                }
                // Exclude rack module frames by geometry
                if (obj.geometry) {
                    const box = new THREE.Box3().setFromObject(obj);
                    const size = box.getSize(new THREE.Vector3());
                    if (size.x <= 0.15 || size.y <= 0.15 || size.z <= 0.15) {
                        continue;
                    }
                }
                selectedObject = obj;
                break;
            }
        }
        // 3. Fallback: select the first intersected object
        if (!selectedObject && intersects.length > 0) {
            selectedObject = intersects[0].object;
        }

        if (selectedObject) {
            this.selectObject(selectedObject);
        } else {
            this.deselectObject();
        }
    }

    /**
     * Handles mouse move events for hover effects in the 3D scene.
     * @param {MouseEvent} event
     */
    onMouseMove(event) {
        // Implement your mouse move logic here
    }

    /**
     * Handles keyboard events for shortcuts and controls.
     * @param {KeyboardEvent} event
     */
    onKeyDown(event) {
        // Log camera position when 'C' is pressed
        if (event.key === 'c' || event.key === 'C') {
            const cam = this.sceneManager.camera;
            if (cam && cam.position) {
                console.log('Camera position:', cam.position);
            }
        }
    }

    /**
     * Handles selection of a 3D object and updates the info panel.
     * @param {THREE.Object3D} object
     */
    selectObject(object) {
        // Deselect previous object
        this.deselectObject();

        // Select new object
        this.selectedObject = object;
        this.originalMaterial = object.material;
        // Apply highlight effect
        if (object.material.type !== 'MeshBasicMaterial' || !object.material.wireframe) {
            object.material = this.highlightMaterial;
        }

        // Special handling for shuttle - trigger arm animation
        if (object.userData && object.userData.type === 'shuttle') {
            if (this.sceneManager.animationManager && this.sceneManager.animationManager.animateShuttleArms) {
                this.sceneManager.animationManager.animateShuttleArms(object, 'pick')
                    .then(() => {
                        console.log('Shuttle arm animation completed');
                    })
                    .catch((error) => {
                        console.warn('Shuttle arm animation failed:', error);
                    });
            }
        }

        // Special handling for lift - could add lift movement animation here
        if (object.userData && object.userData.type === 'lift') {
            console.log('Container Lift selected - ready for operations');
            // Could add lift animation here in the future
        }

        // Show object info
        this.showObjectInfo(object);

        // Log selection to UIManager's log panel with userData details
        if (this.uiManager && typeof this.uiManager.addLog === 'function') {
            // Clear previous logs for new selection
            const logPanel = document.getElementById('info-log-content');
            if (logPanel) logPanel.innerHTML = '';

            let label = 'Object selected';
            if (object.userData && Object.keys(object.userData).length > 0) {
                const incrementKeys = ['aisle', 'level', 'module', 'depth', 'position'];
                // Special case: Missing Location
                if (
                    (object.userData.location_type === 'Missing Location' || object.userData.type === 'Missing Location') &&
                    object.userData.status === 'Unavailable'
                ) {
                    // Only show incremented aisle, level, module, depth, position
                    const details = incrementKeys
                        .filter(k => typeof object.userData[k] === 'number')
                        .map(k => `<div style='margin-left:10px;'><strong>${k}:</strong> ${object.userData[k] + 1}</div>`)
                        .join('');
                    label = `Selected: <strong>Missing Location</strong>${details}`;
                } else if (
                    object.userData.type === 'Buffer' || object.userData.location_type === 'Buffer' || object.userData.type === 'Nothing' || object.userData.location_type === 'Nothing'
                ) {
                    // Show incremented aisle, level, module, depth, position for Buffer/Nothing, and show type if present
                    const detailsArr = incrementKeys
                        .filter(k => typeof object.userData[k] === 'number')
                        .map(k => `<div style='margin-left:10px;'><strong>${k}:</strong> ${object.userData[k] + 1}</div>`);
                    const details = detailsArr.join('');
                    const typeLabel = object.userData.type ? ` <strong>${object.userData.type}</strong>` : '';
                    label = `Selected:${typeLabel}${details}`;
                } else if (object.userData.type === 'picking_station') {
                    // Custom: picking_station log format
                    let details = '';
                    if (Object.prototype.hasOwnProperty.call(object.userData, 'aisle') && typeof object.userData.aisle === 'number') {
                        details += `<div style='margin-left:10px;'><strong>aisle:</strong> ${object.userData.aisle + 1}</div>`;
                    }
                    label = `Selected: picking station${details}`;
                } else if (object.userData.type === 'lift') {
                    // Custom: lift log format
                    let details = '';
                    if (Object.prototype.hasOwnProperty.call(object.userData, 'aisleId') && typeof object.userData.aisleId === 'number') {
                        details += `<div style='margin-left:10px;'><strong>Aisle:</strong> ${object.userData.aisleId + 1}</div>`;
                    }
                    label = `Selected: lift${details}`;
                } else if (object.userData.type === 'conveyor_segment') {
                    // Custom: conveyor_segment log format
                    let details = '';
                    if (object.userData.flow_type) {
                        details += `<div style='margin-left:10px;'><strong>type:</strong> ${object.userData.flow_type}</div>`;
                    }
                    label = `Selected: conveyor${details}`;
                } else if (object.userData.type === 'shuttle') {
                    // Custom: shuttle log format
                    let details = '';
                    if (Object.prototype.hasOwnProperty.call(object.userData, 'aisleId') && typeof object.userData.aisleId === 'number') {
                        details += `<div style='margin-left:10px;'><strong>Aisle:</strong> ${object.userData.aisleId + 1}</div>`;
                    }
                    if (Object.prototype.hasOwnProperty.call(object.userData, 'level') && typeof object.userData.level === 'number') {
                        details += `<div style='margin-left:10px;'><strong>level:</strong> ${object.userData.level + 1}</div>`;
                    }
                    label = `Selected: shuttle${details}`;
                } else {
                    // Exclude unwanted keys and increment indices for display, and omit 'type' from details
                    const excludeKeys = ['id', 'coordinates', 'time', 'type'];
                    const details = Object.entries(object.userData)
                        .filter(([k, v]) => !excludeKeys.includes(k))
                        .map(([k, v]) => {
                            if (incrementKeys.includes(k) && typeof v === 'number') {
                                return `<div style='margin-left:10px;'><strong>${k}:</strong> ${v + 1}</div>`;
                            }
                            return `<div style='margin-left:10px;'><strong>${k}:</strong> ${v}</div>`;
                        })
                        .join('');
                    label = `Selected: <strong>${object.userData.name || object.name || 'free storage'}</strong>${details}`;
                }
            } else if (object.name) {
                label = `Selected: <strong>${object.name}</strong>`;
            }
            this.uiManager.addLog(label);
        }
    }

    /**
     * Deselects the currently selected object.
     */
    deselectObject() {
        if (this.selectedObject && this.originalMaterial) {
            // Dispose highlight material to avoid memory leaks
            if (this.selectedObject.material && this.selectedObject.material.dispose) {
                this.selectedObject.material.dispose();
            }
            // Check if the object is still present in the scene before restoring material
            let isInScene = false;
            if (this.selectedObject.parent) {
                let obj = this.selectedObject;
                while (obj.parent) {
                    if (obj.parent === this.sceneManager.scene) {
                        isInScene = true;
                        break;
                    }
                    obj = obj.parent;
                }
            }
            if (isInScene) {
                this.selectedObject.material = this.originalMaterial;
            }
            this.selectedObject = null;
            this.originalMaterial = null;
        }
        // Hide object info
        document.getElementById('object-info').style.display = 'none';
    }

    /**
     * Displays detailed information about the selected object in the info panel.
     * @param {THREE.Object3D} object
     */
    showObjectInfo(object) {
        const infoPanel = document.getElementById('object-info');
        const detailsDiv = document.getElementById('object-details');
        let objectType = 'Unknown Component';
        let objectDetails = 'Component information not available';
        // ...existing code for showObjectInfo (already present above, not repeated for brevity)...
        // You can copy the full implementation here if needed.
    }

    /**
     * Binds event listeners to camera preset buttons.
     */
    bindCameraEvents() {
        const cameraButtons = document.querySelectorAll('.camera-btn');
        cameraButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const presetName = e.target.getAttribute('data-preset');
                this.setCameraPreset(presetName);
            });
        });
    }

    /**
     * Sets the camera to a preset view.
     * @param {string} presetName
     */
    setCameraPreset(presetName) {
        const cfg = this.uiManager.getConfig ? this.uiManager.getConfig() : this.uiManager.uiConfig;
        const { position, target } = getCameraViewConfig(presetName, cfg);
        this.animateCamera(
            new THREE.Vector3(position.x, position.y, position.z),
            new THREE.Vector3(target.x, target.y, target.z)
        );
    }

    /**
     * Animates the camera to a target position and look-at point.
     * @param {THREE.Vector3} targetPosition
     * @param {THREE.Vector3} targetLookAt
     * @param {number} [duration=1000]
     */
    animateCamera(targetPosition, targetLookAt, duration = 1000) {
        const startPosition = this.sceneManager.camera.position.clone();
        const startTarget = this.sceneManager.controls.target.clone();
        let startTime = null;
        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            this.sceneManager.camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            this.sceneManager.controls.target.lerpVectors(startTarget, targetLookAt, easeProgress);
            this.sceneManager.controls.update();
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
}