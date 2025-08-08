import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneManager } from './src/core/SceneManager.js';
import { UIManager } from './src/ui/UIManager.js';
import { InteractionManager } from './src/ui/InteractionManager.js';
import { PerformanceMonitorUI } from './src/ui/PerformanceMonitorUI.js';


const sceneManager = new SceneManager();
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

// Build initial warehouse with UI config - wait for configuration to load
const initializeWarehouse = async () => {
    // Wait for default configuration to load
    if (sceneManager.loadDefaultConfiguration) {
        await sceneManager.loadDefaultConfiguration();
    }
    sceneManager.buildWarehouse(uiManager.getConfig());
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
        console.log(`🔄 Rendering mode switched to: ${!current ? 'Instanced' : 'Regular'}`);
        console.log('💡 Now try selecting objects to see the difference');
    }
    if (event.key === 'h' || event.key === 'H') {
        // Show help
        console.log('🎮 Keyboard shortcuts:');
        console.log('  I - Toggle between Instanced and Regular rendering');
        console.log('  P - Toggle performance monitor');
        console.log('  C - Log camera position');
        console.log('  H - Show this help');
    }
});

console.log('🚀 Warehouse 3D Model loaded with performance optimizations!');
console.log('📊 Press "P" to toggle performance monitor');
console.log('🔄 Press "I" to toggle between Instanced/Regular rendering');
console.log('❓ Press "H" for all keyboard shortcuts');
console.log('🎯 Optimizations active:');
console.log('  • Instanced Rendering: Reduces draw calls');
console.log('  • 3-Level LOD System: Automatic quality adjustment');
console.log('  • Texture Atlasing: Optimized materials');
console.log('  • Advanced Frustum Culling: Spatial partitioning');
console.log('📍 Click on objects to select them - instanced objects show detailed info');

// === Game-like Keyboard Navigation ===
// WASD/Arrow keys: move camera target, Q/E: up/down, R/F: zoom in/out, C: log camera position
const keyState = {};

const moveStep = 0.45; // per frame, faster
const zoomStep = 0.55;
const navigationKeys = [
    'w','a','s','d','q','e','r','f',
    'arrowup','arrowdown','arrowleft','arrowright'
];

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

function gameCameraLoop() {
    // Always get the latest controls/camera (in case warehouse is rebuilt)
    const controls = sceneManager.controls;
    const camera = sceneManager.camera;
    if (!controls || !camera) {
        // Controls/camera not ready yet - this is normal during initialization
        requestAnimationFrame(gameCameraLoop);
        return;
    }
    let moved = false;
    // Forward/back (W/S or Up/Down)
    if (keyState['w'] || keyState['arrowup']) {
        controls.target.z -= moveStep;
        moved = true;
    }
    if (keyState['s'] || keyState['arrowdown']) {
        controls.target.z += moveStep;
        moved = true;
    }
    // Left/right (A/D or Left/Right)
    if (keyState['a'] || keyState['arrowleft']) {
        controls.target.x += moveStep;
        moved = true;
    }
    if (keyState['d'] || keyState['arrowright']) {
        controls.target.x -= moveStep;
        moved = true;
    }
    // Up/down (Q/E)
    if (keyState['q']) {
        controls.target.y += moveStep;
        moved = true;
    }
    if (keyState['e']) {
        controls.target.y -= moveStep;
        moved = true;
    }
    // Zoom in/out (R/F)
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


