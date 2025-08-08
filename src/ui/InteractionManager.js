/**
 * InteractionManager handles user interaction with the 3D scene and the control panel UI.
 * @class InteractionManager
 * @param {SceneManager} sceneManager - The main scene manager instance.
 * @param {UIManager} uiManager - The UI manager instance.
 */

import { getCameraViewConfig, syncLevelsPerAisle } from './uiUtils.js';
import * as THREE from 'three';
import { createInteractionPanel, updatePanelText } from './interactionPanel.js';
import { bindCameraEvents, setCameraPreset, animateCamera } from './cameraControls.js';
import { getSelectableObjects, filterSelectedObject, showObjectInfo } from './objectSelectionUtils.js';
import { exportWarehouseConfiguration, importWarehouseConfiguration, validateWarehouseConfiguration } from '../core/warehouseConfigIO.js';
import { calculateTotalLocations } from '../core/warehouseMetrics.js';
import { constants } from '../core/constants.js';

/**
 * Manages user interactions with the 3D warehouse scene.
 * Handles mouse events, object selection, keyboard shortcuts, and UI updates.
 * @class InteractionManager
 */
export class InteractionManager {
    /**
     * Creates a new InteractionManager instance.
     * @param {SceneManager} sceneManager - The scene manager instance
     * @param {UIManager} uiManager - The UI manager instance
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

        // Modularized UI panel
        const panel = createInteractionPanel(this.uiManager.uiConfig);
        updatePanelText(panel);
        this.bindCameraEvents();
        this.bindInputPanelEvents(panel);
        // Fix: Add toggle logic for the panel after creation
        const toggleBtn = panel.querySelector('#interaction-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const isCollapsed = panel.classList.toggle('collapsed');
                toggleBtn.setAttribute('aria-label', isCollapsed ? 'Show Panel' : 'Hide Panel');
                toggleBtn.setAttribute('title', isCollapsed ? 'Show Controls' : 'Hide Controls');
                toggleBtn.textContent = '☰';
            });
        }
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

    // ...moved to interactionPanel.js...


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

        // Export/Import
        panel.querySelector('#export-config-btn').addEventListener('click', () => {
            const filename = prompt('Enter filename for export:', 'warehouse_config.json');
            if (filename) {
                exportWarehouseConfiguration(
                    this.uiManager.uiConfig,
                    this.sceneManager.missingLocations,
                    this.sceneManager.locationTypes,
                    calculateTotalLocations,
                    filename
                );
            }
        });
        panel.querySelector('#import-config-btn').addEventListener('click', () => {
            // Reset the file input to allow re-importing the same filename
            const fileInput = panel.querySelector('#import-file-input');
            fileInput.value = '';
            fileInput.click();
        });
        panel.querySelector('#import-file-input').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.showLoadingOverlay();
                importWarehouseConfiguration(
                    file,
                    validateWarehouseConfiguration,
                    (warehouseConfig) => {
                        // Apply the configuration
                        const uiConfig = warehouseConfig.warehouse_parameters;
                        this.sceneManager.missingLocations = warehouseConfig.missing_locations || [];
                        this.sceneManager.locationTypes = warehouseConfig.location_types || [];
                        // Always use the imported config for the 3D model
                        this.sceneManager.modelConfig = { ...uiConfig };
                        
                        // For imported configs, use the actual values (don't clamp to UI slider limits)
                        // This allows importing configs with values beyond the UI slider ranges
                        const importedConfig = {
                            aisles: Math.max(1, uiConfig.aisles || 1),
                            levels_per_aisle: Array.isArray(uiConfig.levels_per_aisle)
                                ? uiConfig.levels_per_aisle.map(lv => Math.max(1, lv))
                                : [2, 2, 2, 2],
                            modules_per_aisle: Math.max(1, uiConfig.modules_per_aisle || 3),
                            locations_per_module: Math.max(1, uiConfig.locations_per_module || 2),
                            storage_depth: Math.max(1, uiConfig.storage_depth || 1),
                            picking_stations: Math.max(1, uiConfig.picking_stations || 1),
                            // Include PLC stations from the imported configuration
                            plc_stations: warehouseConfig.plc_stations || null,
                            // Include prezone_visuals from the imported configuration
                            prezone_visuals: warehouseConfig.prezone_visuals || {},
                            // Include other configuration sections
                            missing_locations: warehouseConfig.missing_locations || [],
                            location_types: warehouseConfig.location_types || []
                        };
                        this.uiManager.uiConfig = importedConfig;
                        
                        this.updateInputPanelFromConfig(panel);
                        this.uiManager.updateStorageCapacity();
                        // Build the warehouse with the imported config (no clamping)
                        this.sceneManager.buildWarehouse(importedConfig);
                        setTimeout(() => {
                            this.hideLoadingOverlay();
                            // Reset file input after successful import to allow re-importing same file
                            event.target.value = '';
                        }, 400);
                    }
                );
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
        
        // Calculate appropriate max value for level sliders based on imported values
        const maxLevels = Math.max(12, ...this.uiManager.uiConfig.levels_per_aisle, 50);
        
        // Clear and rebuild level inputs
        container.innerHTML = '<h4>Levels per Aisle:</h4>';
        for (let i = 0; i < aisleCount; i++) {
            const levelDiv = document.createElement('div');
            levelDiv.className = 'level-input';
            levelDiv.innerHTML = `
                <label>Aisle ${i + 1}:</label>
                <input type="range" min="2" max="${maxLevels}" value="${this.uiManager.uiConfig.levels_per_aisle[i]}" data-aisle="${i}">
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
        
        // Remove verbose logging from level inputs
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
        // Update slider ranges to accommodate imported values
        this.updateSliderRanges(panel);
        
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
     * Updates slider ranges to accommodate imported configuration values.
     * @param {HTMLElement} panel - The DOM element containing the input panel controls.
     */
    updateSliderRanges(panel) {
        const config = this.uiManager.uiConfig;
        
        // Update aisles slider (default max: 4)
        const aislesSlider = panel.querySelector('#aisles');
        if (config.aisles > parseInt(aislesSlider.max)) {
            aislesSlider.max = Math.max(config.aisles, 10);
        }
        
        // Update modules slider (default max: 8)
        const modulesSlider = panel.querySelector('#modules');
        if (config.modules_per_aisle > parseInt(modulesSlider.max)) {
            modulesSlider.max = Math.max(config.modules_per_aisle, 50);
        }
        
        // Update locations slider (default max: 4)
        const locationsSlider = panel.querySelector('#locations');
        if (config.locations_per_module > parseInt(locationsSlider.max)) {
            locationsSlider.max = Math.max(config.locations_per_module, 10);
        }
        
        // Update depth slider (default max: 3)
        const depthSlider = panel.querySelector('#depth');
        if (config.storage_depth > parseInt(depthSlider.max)) {
            depthSlider.max = Math.max(config.storage_depth, 5);
        }
        
        // Update stations slider (default max: 4)
        const stationsSlider = panel.querySelector('#stations');
        if (config.picking_stations > parseInt(stationsSlider.max)) {
            stationsSlider.max = Math.max(config.picking_stations, 10);
        }
    }


    /**
     * Handles mouse click events for object selection in the 3D scene.
     * @param {MouseEvent|Object} event - The mouse or synthetic event.
     */
    /**
     * Handles mouse click events for object selection.
     * Uses raycasting to detect clicked objects and highlights them.
     * @param {MouseEvent} event - The mouse click event
     */
    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        const objectsToCheck = getSelectableObjects(this.sceneManager);
        const intersects = this.raycaster.intersectObjects(objectsToCheck, true);
        const selectedObject = filterSelectedObject(intersects);
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
        // Log camera position when 'C' is pressed (for debugging)
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
        
        // LOG OBJECT POSITION AND DETAILS
        console.log('=== OBJECT SELECTION DEBUG ===');
        console.log('Object clicked:', object);
        console.log('Object name:', object.name);
        console.log('Object type:', object.type);
        
        // Log position information
        if (object.position) {
            console.log('Object Position:', {
                x: object.position.x.toFixed(3),
                y: object.position.y.toFixed(3),
                z: object.position.z.toFixed(3)
            });
        }
        
        // Log world position
        const worldPosition = new THREE.Vector3();
        if (object && typeof object.getWorldPosition === 'function') {
            object.getWorldPosition(worldPosition);
            console.log('World Position:', {
                x: worldPosition.x.toFixed(3),
                y: worldPosition.y.toFixed(3),
                z: worldPosition.z.toFixed(3)
            });
        } else if (object && object.userData && object.userData.isInstancedMeshInstance) {
            // Handle instanced mesh instances
            console.log('Instanced Mesh Instance Position:', {
                x: object.instancePosition.x.toFixed(3),
                y: object.instancePosition.y.toFixed(3),
                z: object.instancePosition.z.toFixed(3)
            });
            console.log('Instance ID:', object.instanceId);
        } else {
            console.warn('Object does not have getWorldPosition method:', object);
            console.log('Object is Three.js Object3D:', object instanceof THREE.Object3D);
        }
        
        // Log userData
        if (object.userData && Object.keys(object.userData).length > 0) {
            console.log('Object userData:', object.userData);
            
            // Special logging for PLC stations
            if (object.userData.plc_address) {
                console.log('🏭 PLC STATION DETECTED:');
                console.log('  - PLC Address:', object.userData.plc_address);
                console.log('  - Station Name:', object.userData.name || 'Unknown');
                console.log('  - Station Type:', object.userData.type || 'Unknown');
            }
            
            // Special logging for lifts
            if (object.userData.type === 'lift') {
                console.log('🔧 LIFT DETECTED:');
                console.log('  - Lift Type:', object.userData.type);
                console.log('  - Aisle:', object.userData.aisle);
            }
        }
        
        // Log parent hierarchy
        let parent = object.parent;
        let level = 0;
        console.log('Parent hierarchy:');
        while (parent && level < 5) {
            console.log(`  Level ${level}: ${parent.name || parent.type || 'Unnamed'}`);
            if (parent.userData && Object.keys(parent.userData).length > 0) {
                console.log(`    userData:`, parent.userData);
            }
            parent = parent.parent;
            level++;
        }
        
        console.log('=== END DEBUG ===');
        
        // Handle instanced mesh highlighting differently
        if (object.userData && object.userData.isInstancedMeshInstance) {
            this.highlightInstancedMesh(object);
        } else {
            // Regular mesh highlighting
            this.originalMaterial = object.material;
            // Apply highlight effect
            if (object.material && (object.material.type !== 'MeshBasicMaterial' || !object.material.wireframe)) {
                object.material = this.highlightMaterial;
            }
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
            // Could add lift animation here in the future
        }

        // Show object info for the selected object
        if (typeof showObjectInfo === 'function') {
            showObjectInfo(object);
        }

        // Log selection to UIManager's log panel with userData details
        if (this.uiManager && typeof this.uiManager.addLog === 'function') {
            // Clear previous logs for new selection
            const logPanel = document.getElementById('info-log-content');
            if (logPanel) logPanel.innerHTML = '';

            let label = 'Object selected';
            if (object.userData && Object.keys(object.userData).length > 0) {
                const incrementKeys = ['aisle', 'level', 'module', 'depth', 'position'];
                
                // Handle instanced mesh instances
                if (object.userData.isInstancedMeshInstance) {
                    const locationData = {
                        aisle: object.userData.aisle,
                        level: object.userData.level,
                        module: object.userData.module,
                        depth: object.userData.depth,
                        position: object.userData.position
                    };
                    
                    // Show location type and details without mentioning "Instanced Location" or instance ID
                    const locationType = object.userData.type || 'Storage';
                    label = `${locationType} Location`;
                    
                    const details = incrementKeys
                        .filter(k => typeof locationData[k] === 'number')
                        .map(k => {
                            const val = locationData[k];
                            return `<div style='margin-left:10px;'><strong>${k}:</strong> ${val === -1 ? '-' : val + 1}</div>`;
                        })
                        .join('');
                    if (details) {
                        label += '<br>' + details;
                    }
                }
                // Special case: Missing Location
                else if (
                    (object.userData.location_type === 'Missing' || object.userData.type === 'Missing') &&
                    object.userData.status === 'Unavailable'
                ) {
                    // Only show incremented aisle, level, module, depth, position
                    const details = incrementKeys
                        .filter(k => typeof object.userData[k] === 'number')
                        .map(k => {
                            const val = object.userData[k];
                            return `<div style='margin-left:10px;'><strong>${k}:</strong> ${val === -1 ? '-' : val + 1}</div>`;
                        })
                        .join('');
                    label = `Selected: <strong>Missing</strong>${details}`;
                } else if (
                    object.userData.type === 'Buffer' || object.userData.location_type === 'Buffer'
                ) {
                    // Show incremented aisle, level, module, depth, position for Buffer, and show type if present
                    const detailsArr = incrementKeys
                        .filter(k => typeof object.userData[k] === 'number')
                        .map(k => {
                            const val = object.userData[k];
                            return `<div style='margin-left:10px;'><strong>${k}:</strong> ${val === -1 ? '-' : val + 1}</div>`;
                        });
                    const details = detailsArr.join('');
                    const typeLabel = object.userData.type ? ` <strong>${object.userData.type}</strong>` : '';
                    label = `Selected:${typeLabel}${details}`;
                } else if (object.userData.type === 'picking_station') {
                    // Custom: picking_station log format
                    let details = '';
                    if (Object.prototype.hasOwnProperty.call(object.userData, 'aisle') && typeof object.userData.aisle === 'number') {
                        const val = object.userData.aisle;
                        details += `<div style='margin-left:10px;'><strong>aisle:</strong> ${val === -1 ? '-' : val + 1}</div>`;
                    }
                    label = `Selected: picking station${details}`;
                } else if (object.userData.type === 'lift') {
                    // Custom: lift log format
                    let details = '';
                    if (Object.prototype.hasOwnProperty.call(object.userData, 'aisleId') && typeof object.userData.aisleId === 'number') {
                        const val = object.userData.aisleId;
                        details += `<div style='margin-left:10px;'><strong>Aisle:</strong> ${val === -1 ? '-' : val + 1}</div>`;
                    }
                    label = `Selected: lift${details}`;
                } else if (object.userData.type === 'conveyor_segment') {
                    // Custom: conveyor_segment log format
                    let details = '';
                    if (Object.prototype.hasOwnProperty.call(object.userData, 'aisleId') && typeof object.userData.aisleId === 'number') {
                        const val = object.userData.aisleId;
                        details += `<div style='margin-left:10px;'><strong>Aisle:</strong> ${val === -1 ? '-' : val + 1}</div>`;
                    }
                    if (Object.prototype.hasOwnProperty.call(object.userData, 'level') && typeof object.userData.level === 'number') {
                        const val = object.userData.level;
                        details += `<div style='margin-left:10px;'><strong>level:</strong> ${val === -1 ? '-' : val + 1}</div>`;
                    }
                    if (object.userData.flow_type) {
                        details += `<div style='margin-left:10px;'><strong>type:</strong> ${object.userData.flow_type}</div>`;
                    }
                    label = `Selected: conveyor${details}`;
                } else if (object.userData.type === 'shuttle') {
                    // Custom: shuttle log format
                    let details = '';
                    if (Object.prototype.hasOwnProperty.call(object.userData, 'aisleId') && typeof object.userData.aisleId === 'number') {
                        const val = object.userData.aisleId;
                        details += `<div style='margin-left:10px;'><strong>Aisle:</strong> ${val === -1 ? '-' : val + 1}</div>`;
                    }
                    if (Object.prototype.hasOwnProperty.call(object.userData, 'level') && typeof object.userData.level === 'number') {
                        const val = object.userData.level;
                        details += `<div style='margin-left:10px;'><strong>level:</strong> ${val === -1 ? '-' : val + 1}</div>`;
                    }
                    label = `Selected: shuttle${details}`;
                } else {
                    // Exclude unwanted keys and increment indices for display, and omit 'type' from details
                    const excludeKeys = ['id', 'coordinates', 'time', 'type'];
                    const details = Object.entries(object.userData)
                        .filter(([k, v]) => !excludeKeys.includes(k))
                        .map(([k, v]) => {
                            if (incrementKeys.includes(k) && typeof v === 'number') {
                                return `<div style='margin-left:10px;'><strong>${k}:</strong> ${v === -1 ? '-' : v + 1}</div>`;
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
        // No object info panel in warehouse model
    }

    // No object info panel in warehouse model

    /**
     * Binds event listeners to camera preset buttons.
     */
    bindCameraEvents() {
        bindCameraEvents((presetName) => setCameraPreset(this.sceneManager, this.uiManager, presetName));
    }

    /**
     * Special highlighting for instanced meshes
     * @param {Object} instanceObject - The virtual instance object
     */
    highlightInstancedMesh(instanceObject) {
        const originalMesh = instanceObject.userData.originalMesh;
        const instanceId = instanceObject.userData.instanceId;
        
        // Store original state for restoration
        this.originalMaterial = originalMesh.material;
        this.selectedInstanceId = instanceId;
        this.isInstancedSelection = true;
        
        // Create a temporary highlight material for the specific instance
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.7
        });
        
        // For instanced meshes, we can't change individual instance materials
        // So we'll create a visual indicator instead
        this.createInstanceHighlight(instanceObject);
    }

    /**
     * Create a visual highlight for a specific instance
     * @param {Object} instanceObject - The virtual instance object
     */
    createInstanceHighlight(instanceObject) {
        if (this.instanceHighlight) {
            this.sceneManager.scene.remove(this.instanceHighlight);
            this.instanceHighlight.geometry.dispose();
            this.instanceHighlight.material.dispose();
        }
        
        const originalMesh = instanceObject.userData.originalMesh;
        const instanceId = instanceObject.userData.instanceId;
        
        // Get the exact world position of this instance
        const matrix = new THREE.Matrix4();
        originalMesh.getMatrixAt(instanceId, matrix);
        
        // Apply parent transformations to get world coordinates
        const worldMatrix = new THREE.Matrix4();
        worldMatrix.multiplyMatrices(originalMesh.matrixWorld, matrix);
        
        // Extract the center position of the instance
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        worldMatrix.decompose(position, quaternion, scale);
        
        // Determine the appropriate size based on the object type
        let width, height, depth;
        
        // Check if this is a rack location or frame
        if (originalMesh.userData.isInstancedRack) {
            // This is a storage location - use location dimensions
            width = constants.locationLength;
            height = constants.levelHeight;
            depth = constants.locationDepth;
        } else if (originalMesh.name && originalMesh.name.includes('frame')) {
            // This is a rack frame - use frame dimensions
            width = constants.modulePostSize;
            height = constants.levelHeight * 2; // Frames are taller
            depth = constants.modulePostSize;
        } else {
            // Default to location size for unknown objects
            width = constants.locationLength;
            height = constants.levelHeight;
            depth = constants.locationDepth;
        }
        
        // Instead of using constants, get the actual geometry dimensions
        const originalGeometry = originalMesh.geometry;
        if (originalGeometry && originalGeometry.boundingBox) {
            originalGeometry.computeBoundingBox();
        }
        
        let actualWidth, actualHeight, actualDepth;
        
        if (originalGeometry && originalGeometry.boundingBox) {
            const box = originalGeometry.boundingBox;
            actualWidth = box.max.x - box.min.x;
            actualHeight = box.max.y - box.min.y;
            actualDepth = box.max.z - box.min.z;
            
            width = actualWidth;
            height = actualHeight;
            depth = actualDepth;
        } else {
            // Fallback to constants if no bounding box
            width = constants.locationLength;
            height = constants.levelHeight;
            depth = constants.locationDepth;
        }
        
        // Make the highlight just slightly larger for visibility
        const highlightGeometry = new THREE.BoxGeometry(
            width * 1.05,  // Very small increase
            height * 1.05, 
            depth * 1.05
        );
        
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.9
        });
        
        this.instanceHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        
        // Position the highlight at the exact center of the instance
        this.instanceHighlight.position.copy(position);
        
        // Don't copy the quaternion rotation - keep it aligned with world axes
        // This prevents the highlight from being rotated incorrectly
        this.instanceHighlight.rotation.set(0, 0, 0);
        
        this.instanceHighlight.userData.isHighlight = true;
        
        this.sceneManager.scene.add(this.instanceHighlight);
    }

    /**
     * Enhanced deselection to handle instanced meshes
     */
    deselectObject() {
        if (this.selectedObject) {
            // Handle instanced mesh deselection
            if (this.isInstancedSelection && this.instanceHighlight) {
                this.sceneManager.scene.remove(this.instanceHighlight);
                this.instanceHighlight.geometry.dispose();
                this.instanceHighlight.material.dispose();
                this.instanceHighlight = null;
                this.isInstancedSelection = false;
                this.selectedInstanceId = null;
            }
            // Handle regular mesh deselection
            else if (this.originalMaterial) {
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
                // Restore material only if object is still in scene
                if (isInScene) {
                    this.selectedObject.material = this.originalMaterial;
                }
            }
        }
        
        // Reset state
        this.selectedObject = null;
        this.originalMaterial = null;
        
        // Hide object info panel
        const infoPanel = document.getElementById('object-info');
        if (infoPanel) {
            infoPanel.style.display = 'none';
        }
    }

    /**
     * Sets the camera to a preset view.
     * @param {string} presetName
     */
    // Camera preset and animation logic moved to cameraControls.js
}