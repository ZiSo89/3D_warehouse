import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { createOrientationLabels, createCompass, updateCompassPosition } from './sceneCompass.js';
// Legacy creators (createRacks / createRacksInstanced) deprecated – unified RackBuilder in use.
import { RackBuilder } from '../engine/builders/RackBuilder.js';
import { createPrezone } from '../components/createPrezone.js';
import { AdvancedLODManager } from './AdvancedLODManager.js';
import { AnimationManager } from '../animation/AnimationManager.js';
import { constants } from './constants.js';
import { setupLighting, createGroundPlane } from './sceneLighting.js';
import { getCameraViewConfig } from '../ui/uiUtils.js';

/**
 * Main scene manager for the 3D warehouse visualization.
 * Handles scene setup, camera controls, lighting, and warehouse building.
 * @class SceneManager
 */
export class SceneManager {
    /**
     * Handles window resize: updates camera aspect and renderer size.
     */
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Creates a new SceneManager instance.
     * Initializes Three.js scene, camera, renderer, and controls.
     * @constructor
     */
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.warehouseGroup = new THREE.Group();
        this.animationManager = new AnimationManager(this);
        this.scene.add(this.warehouseGroup);
        this.useInstancedRendering = true; // Enable instanced rendering by default
    this.useNewRackBuilder = true; // feature flag enabled by default now
    this.rackBuilder = new RackBuilder({ instanced: this.useInstancedRendering });
        
        // Initialize Advanced LOD Manager
        this.lodManager = new AdvancedLODManager();
        this.useLOD = true; // Enable LOD by default
        
        this.missingLocations = [];
        this.locationTypes = [];
        this.currentConfig = null; // Store current warehouse configuration
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Bind animate method once to always preserve 'this'
        this.animate = this.animate.bind(this);
    }

    /**
     * Loads default configuration from warehouse_config_instance.json file.
     * @async
     * @returns {Promise<Object|null>} The loaded configuration object or null if failed
     */
    async loadDefaultConfiguration() {
        try {
            const response = await fetch('/warehouse_config_instance.json');
            if (response.ok) {
                const config = await response.json();
                
                // Store the full configuration
                this.fullConfig = config;
                
                // Convert 1-based indices to 0-based for internal use
                this.missingLocations = this.convertToZeroBased(config.missing_locations || []);
                this.locationTypes = this.convertToZeroBased(config.location_types || []);
                
                console.log('✅ Configuration loaded successfully from warehouse_config_instance.json');
                return config;
            } else {
                console.warn('❌ Could not load default configuration from warehouse_config_instance.json, HTTP status:', response.status);
                return this.getFallbackConfiguration();
            }
        } catch (error) {
            console.warn('❌ Error loading default configuration:', error);
            return this.getFallbackConfiguration();
        }
    }

    /**
     * Returns a fallback configuration when the JSON file cannot be loaded.
     * @returns {Object} Basic warehouse configuration
     */
    getFallbackConfiguration() {
        console.log('🔄 Using fallback configuration');
        return {
            metadata: {
                name: "fallback_config",
                version: "1.0.0",
                description: "Fallback warehouse configuration"
            },
            warehouse_parameters: {
                aisles: 3,
                levels_per_aisle: [9, 5, 3],
                modules_per_aisle: 6,
                locations_per_module: 4,
                storage_depth: 2,
                picking_stations: 3
            },
            missing_locations: [],
            location_types: [],
            plc_stations: []
        };
    }

    /**
     * Convert 1-based indices to 0-based for internal use
     */
    convertToZeroBased(locationArray) {
        if (!Array.isArray(locationArray)) return [];
        
        return locationArray.map(loc => {
            if (loc && typeof loc === 'object') {
                const newLoc = { ...loc };
                ['aisle', 'level', 'module', 'depth', 'position'].forEach(key => {
                    if (typeof newLoc[key] === 'number') {
                        newLoc[key] = newLoc[key] - 1;
                    } else if (Array.isArray(newLoc[key])) {
                        // Convert arrays from 1-based to 0-based
                        newLoc[key] = newLoc[key].map(val => 
                            typeof val === 'number' ? val - 1 : val
                        );
                    }
                });
                return newLoc;
            }
            return loc;
        });
    }

    /**
     * Fits the camera view to the warehouse group, ignoring compass and helpers.
     * @param {boolean} [animate=true] - Whether to animate the camera transition
     */
    fitToWarehouseView(animate) {
        if (typeof animate === 'undefined') animate = true;
        if (!this.warehouseGroup || !this.camera) return;

        // Controls must be initialized before fitting
        if (!this.controls) {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        }

        // Compute bounding box of warehouse only
        const box = new THREE.Box3().setFromObject(this.warehouseGroup);
        const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
        // Use overview camera position on initial load
        if (this.currentConfig) {
            const overviewConfig = getCameraViewConfig('overview', this.currentConfig);
            this.camera.position.set(
                overviewConfig.position.x, 
                overviewConfig.position.y, 
                overviewConfig.position.z
            );
            this.camera.lookAt(
                overviewConfig.target.x, 
                overviewConfig.target.y, 
                overviewConfig.target.z
            );
            
            if (this.controls) {
                this.controls.target.set(
                    overviewConfig.target.x, 
                    overviewConfig.target.y, 
                    overviewConfig.target.z
                );
                this.controls.update();
            }
        } else {
            // Fallback to original behavior if no config available
            const fitOffset = 1.5; // Reduced to zoom in
            const maxDim = Math.max(size.x, size.y, size.z);
            const camDistance = maxDim * fitOffset;
            this.camera.position.set(center.x + camDistance, center.y + camDistance * 0.6, center.z + camDistance);
            this.camera.lookAt(center);
            if (this.controls) {
                this.controls.target.copy(center);
                this.controls.update();
            }
        }

        this.scene.background = new THREE.Color(0xf1faee); // Light cream from palette
        this.scene.fog = new THREE.Fog(0xf1faee, 50, 100); // Matching fog color

        setupLighting(this.scene);
        createGroundPlane(this.scene);

        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        createOrientationLabels(this.scene); // Large labels at warehouse edges
        this.compassGroup = createCompass(this.scene); // 3D compass for orientation

        this.animate();
    }

    // Removed: now in sceneCompass.js

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update();

        // Update TWEEN animations if available
        if (typeof TWEEN !== 'undefined') {
            TWEEN.update();
        }

        // Use Enhanced LOD Manager for performance optimization
        if (this.useLOD && this.lodManager) {
            this.lodManager.updateLOD(this.camera, this.scene, true);
        } else {
            // Fallback to legacy frustum culling
            this.legacyFrustumCulling();
        }

        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Legacy frustum culling for backward compatibility
     */
    legacyFrustumCulling() {
        if (this.warehouseGroup && this.warehouseGroup.children.length > 0) {
            const frustum = new THREE.Frustum();
            const cameraViewProjectionMatrix = new THREE.Matrix4();
            this.camera.updateMatrixWorld();
            this.camera.updateProjectionMatrix();
            cameraViewProjectionMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
            frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
            
            this.warehouseGroup.children.forEach(child => {
                if (child.type === 'Group' && child.children) {
                    child.children.forEach(grandchild => {
                        if (grandchild.userData && grandchild.userData.isRackLine) {
                            const rackPos = new THREE.Vector3();
                            grandchild.getWorldPosition(rackPos);
                            const camPos = this.camera.position;
                            const dist = rackPos.distanceTo(camPos);
                            let visible = dist < 120;
                            if (grandchild.isMesh && grandchild.geometry && grandchild.geometry.boundingSphere) {
                                try {
                                    visible = visible && frustum.intersectsObject(grandchild);
                                } catch {
                                    // swallow intersection errors (leave visibility as-is)
                                }
                            }
                            grandchild.visible = visible;
                        }
                    });
                }
                if (child.isMesh && child.geometry && child.geometry.boundingSphere) {
                    try {
                        child.visible = frustum.intersectsObject(child);
                    } catch {
                        child.visible = true; // fallback visible
                    }
                } else if (!child.userData || !child.userData.isRackLine) {
                    child.visible = true;
                }
            });
        }
    }

    /**
     * Builds the complete warehouse 3D model based on UI configuration.
     * Creates racks, prezone, lighting, and initializes LOD management.
     * @param {Object} uiConfig - Configuration object containing warehouse parameters
     * @param {number} uiConfig.aisles - Number of aisles
     * @param {number} uiConfig.storage_depth - Storage depth per aisle
     * @param {Array} uiConfig.levels_per_aisle - Levels for each aisle
     * @param {number} uiConfig.picking_stations - Number of picking stations
     */
    buildWarehouse(uiConfig) {
        // Store the current configuration
        this.currentConfig = { ...uiConfig };
        
        // Clear previous warehouse completely
        while (this.warehouseGroup.children.length > 0) {
            this.warehouseGroup.remove(this.warehouseGroup.children[0]);
        }

    // Always use unified RackBuilder now
    this.rackBuilder.instanced = this.useInstancedRendering;
    const racks = this.rackBuilder.build(uiConfig, this.missingLocations, this.locationTypes);
        
        this.warehouseGroup.add(racks);

        const prezone = createPrezone(uiConfig, constants);
        prezone.position.z = - (uiConfig.storage_depth * constants.locationDepth) - 5;
        this.warehouseGroup.add(prezone);

        // Center the warehouse (only X and Z, keep Y at ground level)
        // Only use warehouseGroup for bounding box, ignore compassGroup and other helpers
        const box = new THREE.Box3().setFromObject(this.warehouseGroup);
        const center = box.getCenter(new THREE.Vector3());
        this.warehouseGroup.position.x = this.warehouseGroup.position.x - center.x;
        this.warehouseGroup.position.z = this.warehouseGroup.position.z - center.z;

        // Create animated equipment after warehouse is built
        this.animationManager.createAnimatedEquipment(uiConfig);

        // Update compass position after warehouse is rebuilt
        updateCompassPosition(this.compassGroup, this.warehouseGroup);
    }

    updateTheme(isDark) {
        if (isDark) {
            // Dark theme
            this.scene.background = new THREE.Color(0x111827); // Dark blue-grey
            this.scene.fog = new THREE.Fog(0x111827, 50, 100);
        } else {
            // Light theme  
            this.scene.background = new THREE.Color(0xf1faee); // Light cream
            this.scene.fog = new THREE.Fog(0xf1faee, 50, 100);
        }
    }

    /**
     * Toggle between instanced and regular rendering
     */
    setInstancedRendering(enabled) {
        this.useInstancedRendering = enabled;
    }

    toggleInstancedRendering(enabled) {
        this.useInstancedRendering = enabled;
    }

    /**
     * Get current rendering mode
     */
    isInstancedRenderingEnabled() {
        return this.useInstancedRendering;
    }

    /**
     * Toggle LOD system
     */
    toggleLOD(enabled) {
        this.useLOD = enabled;
    }

    /**
     * Set LOD level manually
     */
    setLODLevel(level) {
        if (this.lodManager) {
            this.lodManager.forceLOD(level);
        }
    }

    /**
     * Get LOD performance report
     */
    getLODStats() {
        return this.lodManager ? this.lodManager.getPerformanceReport() : null;
    }

    /**
     * Enable/disable automatic LOD optimization
     */
    setAutoLOD(enabled) {
        if (this.lodManager) {
            this.lodManager.setAutoOptimization(enabled);
        }
    }


    
}
