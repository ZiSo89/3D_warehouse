/**
 * Προηγμένος LOD Manager για βελτίωση απόδοσης σε μεγάλα warehouse μοντέλα
 * Enhanced with 3-level LOD system and instanced rendering integration
 * Integrated with advanced frustum culling
 */

import * as THREE from 'three';
import { FrustumCullingManager } from './FrustumCullingManager.js';

export class AdvancedLODManager {
    constructor() {
        // Enhanced 3-level LOD system
        this.lodLevels = {
            HIGH: { 
                maxDistance: 50, 
                label: 'Υψηλή Λεπτομέρεια',
                showDetails: true,
                showFrames: true,
                showLocations: true,
                instancedRendering: true
            },
            MEDIUM: { 
                maxDistance: 150, 
                label: 'Μέση Λεπτομέρεια',
                showDetails: false,
                showFrames: true,
                showLocations: true,
                instancedRendering: true
            },
            LOW: { 
                maxDistance: 500, 
                label: 'Χαμηλή Λεπτομέρεια',
                showDetails: false,
                showFrames: false,
                showLocations: true,
                instancedRendering: true
            }
        };
        
        this.instances = new Map(); // Instanced rendering groups
        this.lodGroups = new Map(); // LOD grouped objects
        this.frustumCuller = new THREE.Frustum();
        this.cameraMatrix = new THREE.Matrix4();
        this.currentLOD = 'HIGH';
        
        // Initialize advanced frustum culling manager
        this.frustumCullingManager = new FrustumCullingManager();
        
        // Performance monitoring
        this.stats = {
            totalObjects: 0,
            visibleObjects: 0,
            culledObjects: 0,
            instancedObjects: 0,
            drawCalls: 0,
            currentLOD: 'HIGH',
            frameTime: 0
        };

        // Performance thresholds for automatic LOD switching
        this.performanceThresholds = {
            targetFPS: 60,
            lowFPSThreshold: 45,
            highFPSThreshold: 58
        };

        this.frameTimeHistory = [];
        this.maxFrameHistory = 60; // Track last 60 frames
    }

    /**
     * Enhanced 3-Level LOD Management with performance monitoring
     */
    updateLOD(camera, scene, autoOptimize = true) {
        const startTime = performance.now();
        
        // Initialize spatial grid if not done
        if (this.frustumCullingManager.spatialGrid.size === 0) {
            this.frustumCullingManager.initializeSpatialGrid(scene);
        }
        
        // Perform advanced frustum culling first
        this.frustumCullingManager.performCulling(camera, scene);
        
        // Reset LOD stats
        this.stats.visibleObjects = 0;
        this.stats.culledObjects = 0;
        this.stats.drawCalls = 0;

        // Update frustum for legacy compatibility
        this.updateFrustum(camera);

        // Process warehouse objects for LOD
        scene.traverse((object) => {
            if (this.shouldProcessObject(object) && object.visible) {
                this.processObjectLOD(object, camera);
            }
        });

        // Merge stats from frustum culling manager
        const frustumStats = this.frustumCullingManager.getStats();
        this.stats.totalObjects = frustumStats.totalObjects;
        this.stats.visibleObjects = frustumStats.visibleObjects;
        this.stats.culledObjects = frustumStats.culledObjects;

        // Calculate frame time and update history
        const frameTime = performance.now() - startTime;
        this.updateFrameTimeHistory(frameTime);

        // Auto-optimize LOD based on performance if enabled
        if (autoOptimize) {
            this.autoOptimizeLOD();
        }

        this.stats.frameTime = frameTime;
        this.stats.currentLOD = this.currentLOD;
    }

    /**
     * Process individual object for LOD and frustum culling
     */
    processObjectLOD(object, camera) {
        const distance = this.getDistanceToCamera(object, camera);
        const lodLevel = this.determineLODLevel(distance);
        
        // Frustum culling
        if (!this.isInFrustum(object)) {
            object.visible = false;
            this.stats.culledObjects++;
            return;
        }

        // Apply LOD settings
        this.applyLODToObject(object, lodLevel);
        
        if (object.visible) {
            this.stats.visibleObjects++;
            if (object.isInstancedMesh) {
                this.stats.instancedObjects++;
            }
            this.stats.drawCalls++;
        }
    }

    /**
     * Determine LOD level based on distance
     */
    determineLODLevel(distance) {
        if (distance <= this.lodLevels.HIGH.maxDistance) return 'HIGH';
        if (distance <= this.lodLevels.MEDIUM.maxDistance) return 'MEDIUM';
        if (distance <= this.lodLevels.LOW.maxDistance) return 'LOW';
        return 'HIDDEN';
    }

    /**
     * Apply LOD settings to an object
     */
    applyLODToObject(object, lodLevel) {
        const lodConfig = this.lodLevels[lodLevel];
        
        if (lodLevel === 'HIDDEN') {
            object.visible = false;
            return;
        }

        object.visible = true;

        // Handle instanced meshes
        if (object.userData.isInstancedRack) {
            this.applyInstancedLOD(object, lodLevel);
        }
        // Handle frame objects
        else if (object.userData.isInstancedFrame) {
            object.visible = lodConfig.showFrames;
        }
        // Handle rack lines (legacy)
        else if (object.userData.isRackLine) {
            this.applyRackLineLOD(object, lodLevel);
        }
    }

    /**
     * Apply LOD to instanced rack objects
     */
    applyInstancedLOD(object, lodLevel) {
        const lodConfig = this.lodLevels[lodLevel];
        
        // Modify material based on LOD
        if (object.material) {
            switch (lodLevel) {
                case 'HIGH':
                    // Full quality material
                    object.material.transparent = false;
                    object.castShadow = true;
                    object.receiveShadow = true;
                    break;
                case 'MEDIUM':
                    // Reduced quality
                    object.material.transparent = false;
                    object.castShadow = false;
                    object.receiveShadow = true;
                    break;
                case 'LOW':
                    // Simplified rendering
                    object.material.transparent = false;
                    object.castShadow = false;
                    object.receiveShadow = false;
                    break;
            }
        }
    }

    /**
     * Apply LOD to legacy rack line objects
     */
    applyRackLineLOD(object, lodLevel) {
        const lodConfig = this.lodLevels[lodLevel];
        
        object.visible = lodConfig.showLocations;
        
        // Traverse children and apply LOD
        object.traverse((child) => {
            if (child.isMesh) {
                switch (lodLevel) {
                    case 'HIGH':
                        child.visible = true;
                        child.castShadow = true;
                        child.receiveShadow = true;
                        break;
                    case 'MEDIUM':
                        child.visible = true;
                        child.castShadow = false;
                        child.receiveShadow = false;
                        break;
                    case 'LOW':
                        // Only show every 4th location for performance
                        const showLocation = (child.userData?.position ?? 0) % 4 === 0;
                        child.visible = showLocation;
                        child.castShadow = false;
                        child.receiveShadow = false;
                        break;
                }
            }
        });
    }

    /**
     * Automatic LOD optimization based on performance
     */
    autoOptimizeLOD() {
        if (this.frameTimeHistory.length < 30) return; // Need enough data
        
        const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        const currentFPS = 1000 / avgFrameTime;
        
        // Auto-adjust LOD based on performance
        if (currentFPS < this.performanceThresholds.lowFPSThreshold) {
            // Performance is poor, reduce quality
            if (this.currentLOD === 'HIGH') {
                this.setGlobalLOD('MEDIUM');
            } else if (this.currentLOD === 'MEDIUM') {
                this.setGlobalLOD('LOW');
            }
        } else if (currentFPS > this.performanceThresholds.highFPSThreshold) {
            // Performance is good, increase quality
            if (this.currentLOD === 'LOW') {
                this.setGlobalLOD('MEDIUM');
            } else if (this.currentLOD === 'MEDIUM') {
                this.setGlobalLOD('HIGH');
            }
        }
    }

    /**
     * Set global LOD level
     */
    setGlobalLOD(level) {
        if (this.lodLevels[level]) {
            this.currentLOD = level;
            console.log(`LOD switched to: ${this.lodLevels[level].label}`);
        }
    }

    /**
     * Update frame time history for performance monitoring
     */
    updateFrameTimeHistory(frameTime) {
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.maxFrameHistory) {
            this.frameTimeHistory.shift();
        }
    }

    /**
     * Update frustum matrix for culling
     */
    updateFrustum(camera) {
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();
        this.cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        this.frustumCuller.setFromProjectionMatrix(this.cameraMatrix);
    }

    /**
     * Check if object should be processed for LOD
     */
    shouldProcessObject(object) {
        return object.isMesh || 
               object.userData.isInstancedRack || 
               object.userData.isInstancedFrame || 
               object.userData.isRackLine ||
               object.isInstancedMesh;
    }

    /**
     * Get distance from object to camera
     */
    getDistanceToCamera(object, camera) {
        const objectPosition = new THREE.Vector3();
        object.getWorldPosition(objectPosition);
        return camera.position.distanceTo(objectPosition);
    }

    /**
     * Check if object is within camera frustum
     */
    isInFrustum(object) {
        if (!object.geometry || !object.geometry.boundingSphere) {
            return true; // Assume visible if no bounding sphere
        }
        
        try {
            return this.frustumCuller.intersectsObject(object);
        } catch (e) {
            return true; // Fallback to visible
        }
    }

    /**
     * Create instanced mesh for similar objects
     */
    createInstancedMesh(geometry, material, maxCount = 1000) {
        const instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
        instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        
        // Enable shadows
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;
        
        return instancedMesh;
    }

    /**
     * Get performance statistics
     */
    getPerformanceReport() {
        const avgFrameTime = this.frameTimeHistory.length > 0 
            ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length 
            : 0;
        const currentFPS = avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0;
        
        // Get frustum culling stats
        const frustumStats = this.frustumCullingManager.getStats();
        
        return {
            lod: {
                ...this.stats,
                averageFrameTime: avgFrameTime.toFixed(2),
                currentFPS: currentFPS,
                lodLevel: this.currentLOD
            },
            frustumCulling: frustumStats
        };
    }

    /**
     * Manual LOD level control
     */
    forceLOD(level) {
        if (this.lodLevels[level]) {
            this.currentLOD = level;
            console.log(`LOD manually set to: ${this.lodLevels[level].label}`);
        }
    }

    /**
     * Enable/disable automatic LOD optimization
     */
    setAutoOptimization(enabled) {
        this.autoOptimizationEnabled = enabled;
        console.log(`Auto LOD optimization ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Configure frustum culling settings
     */
    setFrustumCullingSettings(settings) {
        this.frustumCullingManager.setOptimizationSettings(settings);
    }

    /**
     * Enable/disable spatial partitioning
     */
    setSpatialPartitioning(enabled) {
        this.frustumCullingManager.setSpatialPartitioning(enabled);
    }

    /**
     * Update spatial grid when scene changes
     */
    updateSpatialGrid(scene) {
        this.frustumCullingManager.updateSpatialGrid(scene);
    }

    /**
     * Dispose resources
     */
    dispose() {
        if (this.frustumCullingManager) {
            this.frustumCullingManager.dispose();
        }
    }
}
