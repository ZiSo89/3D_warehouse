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
import { getSelectableObjects, filterSelectedObject } from './objectSelectionUtils.js';
import { exportWarehouseConfiguration, importWarehouseConfiguration, validateWarehouseConfiguration } from '../core/warehouseConfigIO.js';

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
                exportWarehouseConfiguration(
                    this.uiManager.uiConfig,
                    this.sceneManager.missingLocations,
                    this.sceneManager.locationTypes,
                    this.sceneManager.calculateTotalLocations.bind(this.sceneManager),
                    filename
                );
            }
        });
        panel.querySelector('#import-config-btn').addEventListener('click', () => {
            panel.querySelector('#import-file-input').click();
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
                        this.sceneManager.locationTypes = warehouseConfig.location_types || {
                            buffer_locations: [],
                            default_type: 'Storage'
                        };
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

        // No object info panel in warehouse model

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
                        .map(k => {
                            const val = object.userData[k];
                            return `<div style='margin-left:10px;'><strong>${k}:</strong> ${val === -1 ? '-' : val + 1}</div>`;
                        })
                        .join('');
                    label = `Selected: <strong>Missing Location</strong>${details}`;
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
     * Sets the camera to a preset view.
     * @param {string} presetName
     */
    // Camera preset and animation logic moved to cameraControls.js
}