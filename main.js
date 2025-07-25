import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneManager } from './src/core/SceneManager.js';
import { UIManager } from './src/ui/UIManager.js';
import { InteractionManager } from './src/ui/InteractionManager.js';


const sceneManager = new SceneManager();
document.body.appendChild(sceneManager.renderer.domElement);
// Initialize UI Manager
const uiManager = new UIManager(sceneManager);

// Initialize Interaction Manager
const interactionManager = new InteractionManager(sceneManager, uiManager);

// Build initial warehouse with UI config
sceneManager.buildWarehouse(uiManager.getConfig());
sceneManager.fitToWarehouseView();


