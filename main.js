import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneManager } from './src/core/SceneManager.js';
import { UIManager } from './src/ui/UIManager.js';
import { InteractionManager } from './src/ui/InteractionManager.js';


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

// Build initial warehouse with UI config
sceneManager.buildWarehouse(uiManager.getConfig());

sceneManager.fitToWarehouseView();

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
        // Only log once per missing controls/camera
        if (!window._navWarned) {
            console.warn('[KeyboardNav] controls or camera not ready', controls, camera);
            window._navWarned = true;
        }
        requestAnimationFrame(gameCameraLoop);
        return;
    } else {
        window._navWarned = false;
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


