import * as THREE from 'three';
import { createOrientationLabels, createCompass, updateCompassPosition } from './sceneCompass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createRacks } from '../components/createRacks.js';
import { createPrezone } from '../components/createPrezone.js';
//import { createShuttle, createLift } from '../components/createTransporters.js';
import { AnimationManager } from '../animation/AnimationManager.js';
import { constants } from './constants.js';
import { setupLighting, createGroundPlane } from './sceneLighting.js';
import { exportWarehouseConfiguration, importWarehouseConfiguration, validateWarehouseConfiguration } from './warehouseConfigIO.js';
import { updateMissingLocations, addMissingLocation, clearMissingLocations, getLocationType, addBufferLocation, clearBufferLocations } from './locationUtils.js';
import { calculateTotalLocations } from './warehouseMetrics.js';

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

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.warehouseGroup = new THREE.Group();
        this.animationManager = new AnimationManager(this);
        this.scene.add(this.warehouseGroup);
        this.missingLocations = [
            { aisle: 1, level: 2, module: 3, depth: 0, position: 1 },
            { aisle: [0, 1], level: [3, 4], module: 2, depth: null, position: 0 },
            { aisle: 2, level: null, module: 7, depth: null, position: null }
        ];
        this.locationTypes = {
            buffer_locations: [
                { aisle: null, level: null, module: [0, 0], depth: [0, 1], position: null, type: 'Buffer' }
            ],
            default_type: 'Storage'
        };
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Bind animate method once to always preserve 'this'
        this.animate = this.animate.bind(this);
    }

    /**
     * Fits the camera view to the warehouseGroup, ignoring compass and helpers.
     * Optionally animates the camera move.
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

        // Fit camera to show the 3D warehouse (not just ground)
        // Use bounding box size to determine distance
        const fitOffset = 0.8; // Zoom in closer to the warehouse
        const maxDim = Math.max(size.x, size.y, size.z);
        const camDistance = maxDim * fitOffset;
        // Place camera diagonally above and back, looking at warehouse center
        this.camera.position.set(center.x + camDistance, center.y + camDistance * 0.6, center.z + camDistance);
        this.camera.lookAt(center);
        if (this.controls) {
            this.controls.target.copy(center);
            this.controls.update();
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

        // --- Virtualization: Frustum culling + distance-based visibility for racks ---
        if (this.warehouseGroup && this.warehouseGroup.children.length > 0) {
            const frustum = new THREE.Frustum();
            const cameraViewProjectionMatrix = new THREE.Matrix4();
            this.camera.updateMatrixWorld();
            this.camera.updateProjectionMatrix();
            cameraViewProjectionMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
            frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
            this.warehouseGroup.children.forEach(child => {
                // If this is the racksGroup, check its children for rackLines
                if (child.type === 'Group' && child.children) {
                    child.children.forEach(grandchild => {
                        if (grandchild.userData && grandchild.userData.isRackLine) {
                            // Compute distance from camera to rackLine center
                            const rackPos = new THREE.Vector3();
                            grandchild.getWorldPosition(rackPos);
                            const camPos = this.camera.position;
                            const dist = rackPos.distanceTo(camPos);
                            let visible = dist < 120;
                            if (grandchild.isMesh && grandchild.geometry && grandchild.geometry.boundingSphere) {
                                try {
                                    visible = visible && frustum.intersectsObject(grandchild);
                                } catch (e) {
                                    visible = visible;
                                }
                            }
                            grandchild.visible = visible;
                        }
                    });
                }
                // Fallback: normal frustum culling for other objects
                if (child.isMesh && child.geometry && child.geometry.boundingSphere) {
                    try {
                        child.visible = frustum.intersectsObject(child);
                    } catch (e) {
                        child.visible = true;
                    }
                } else if (!child.userData || !child.userData.isRackLine) {
                    child.visible = true;
                }
            });
        }

        this.renderer.render(this.scene, this.camera);
    }


    buildWarehouse(uiConfig) {
        // Clear previous warehouse completely
        while (this.warehouseGroup.children.length > 0) {
            this.warehouseGroup.remove(this.warehouseGroup.children[0]);
        }

        const racks = createRacks(uiConfig, constants, this.missingLocations, this.locationTypes);
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


    
}
