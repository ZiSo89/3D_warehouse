/**
 * Main entry point for the 3D Warehouse Visualization Application.
 * Initializes the scene, UI components, and handles keyboard navigation.
 * @fileoverview 3D warehouse model with performance optimizations and interactive controls
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneManager } from './src/core/SceneManager.js';
import { UIManager } from './src/ui/UIManager.js';
import { InteractionManager } from './src/ui/InteractionManager.js';
import { PerformanceMonitorUI } from './src/ui/PerformanceMonitorUI.js';
import { EventBus } from './src/integration/EventBus.js';
import { SceneAssembler } from './src/engine/builders/SceneAssembler.js';

// Initialize core components
const sceneManager = new SceneManager();

// Domain & metrics pipeline (non-invasive)
const eventBus = new EventBus();
const sceneAssembler = new SceneAssembler(eventBus);

// Make canvas focusable and focus it for keyboard navigation
const canvas = sceneManager.renderer.domElement;
canvas.setAttribute('tabindex', '0');
canvas.style.outline = 'none';
document.body.appendChild(canvas);
setTimeout(() => { canvas.focus(); }, 100);

// Initialize UI Manager
const uiManager = new UIManager(sceneManager);

// Initialize Interaction Manager
const interactionManager = new InteractionManager(sceneManager, uiManager);

// Initialize Performance Monitor
const performanceMonitor = new PerformanceMonitorUI(sceneManager);

/**
 * Initializes the warehouse with default configuration.
 * Loads configuration from JSON file and builds the 3D model.
 * @async
 * @function initializeWarehouse
 */
const initializeWarehouse = async () => {
    // Wait for default configuration to load
    if (sceneManager.loadDefaultConfiguration) {
        const loadedConfig = await sceneManager.loadDefaultConfiguration();
        if (loadedConfig) {
            // Update UIManager with the loaded configuration
            uiManager.updateConfig(loadedConfig);
        }
    }
    
    sceneManager.buildWarehouse(uiManager.getConfig());
    
    // Build domain representation & emit metrics (does not alter rendering yet)
    try {
        sceneAssembler.buildDomain(uiManager.getConfig(), sceneManager.missingLocations || []);
    } catch (e) {
        console.warn('Domain build failed:', e);
    }
    
    sceneManager.fitToWarehouseView();
};

initializeWarehouse();

// Add keyboard shortcuts for testing
document.addEventListener('keydown', (event) => {
    if (event.key === 'i' || event.key === 'I') {
        // Toggle instanced rendering
        const current = sceneManager.isInstancedRenderingEnabled();
        sceneManager.toggleInstancedRendering(!current);
        sceneManager.buildWarehouse(uiManager.getConfig());
    }
    if (event.key === 'h' || event.key === 'H') {
        // Show help
        alert('🎮 Camera Controls:\nW/S: Forward/Back\nA/D: Left/Right\nQ/E: Up/Down\nR/F: Zoom In/Out\n\nOther:\nI: Toggle rendering mode');
    }
});

// === Game-like Keyboard Navigation ===
const keyState = {};
const moveStep = 0.45;
const zoomStep = 0.55;
const navigationKeys = ['w','a','s','d','q','e','r','f','arrowup','arrowdown','arrowleft','arrowright'];

window.addEventListener('keydown', (e) => {
    keyState[e.key.toLowerCase()] = true;
    if (navigationKeys.includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
});
window.addEventListener('keyup', (e) => {
    keyState[e.key.toLowerCase()] = false;
    if (navigationKeys.includes(e.key.toLowerCase())) {
        e.preventDefault();
    }
});

/**
 * Main game-like camera control loop using WASD keys.
 * Provides continuous camera movement and zoom controls.
 * @function gameCameraLoop
 */
function gameCameraLoop() {
    const controls = sceneManager.controls;
    const camera = sceneManager.camera;
    if (!controls || !camera) {
        requestAnimationFrame(gameCameraLoop);
        return;
    }
    
    let moved = false;
    
    // Movement: WASD/Arrow keys
    if (keyState['w'] || keyState['arrowup']) {
        controls.target.z -= moveStep;
        moved = true;
    }
    if (keyState['s'] || keyState['arrowdown']) {
        controls.target.z += moveStep;
        moved = true;
    }
    if (keyState['a'] || keyState['arrowleft']) {
        controls.target.x += moveStep;
        moved = true;
    }
    if (keyState['d'] || keyState['arrowright']) {
        controls.target.x -= moveStep;
        moved = true;
    }
    
    // Vertical: Q/E
    if (keyState['q']) {
        controls.target.y += moveStep;
        moved = true;
    }
    if (keyState['e']) {
        controls.target.y -= moveStep;
        moved = true;
    }
    
    // Zoom: R/F
    if (keyState['r']) {
        camera.position.addScaledVector(camera.getWorldDirection(new THREE.Vector3()), moveStep * zoomStep);
        moved = true;
    }
    if (keyState['f']) {
        camera.position.addScaledVector(camera.getWorldDirection(new THREE.Vector3()), -moveStep * zoomStep);
        moved = true;
    }
    if (moved) {
        controls.update();
    }
    requestAnimationFrame(gameCameraLoop);
}
gameCameraLoop();


