/**
 * Προηγμένος LOD Manager για βελτίωση απόδοσης σε μεγάλα warehouse μοντέλα
 * Enhanced with 3-level LOD system, instanced rendering integration, and advanced frustum culling
 * 
 * Features:
 * - 3-Level LOD System (HIGH, MEDIUM, LOW)
 * - Automatic performance-based LOD switching
 * - Advanced frustum culling with spatial partitioning
 * - Instanced rendering optimization
 * - Real-time performance monitoring
 */

import * as THREE from 'three';

export class AdvancedLODManager {
    constructor() {
        // Enhanced 3-level LOD system configuration
        this.lodLevels = {
            HIGH: { 
                maxDistance: 50, 
                label: 'Υψηλή Λεπτομέρεια',
                showDetails: true,
                showFrames: true,
                showLocations: true,
                enableShadows: true,
                materialQuality: 'high'
            },
            MEDIUM: { 
                maxDistance: 150, 
                label: 'Μέση Λεπτομέρεια',
                showDetails: false,
                showFrames: true,
                showLocations: true,
                enableShadows: false,
                materialQuality: 'medium'
            },
            LOW: { 
                maxDistance: 500, 
                label: 'Χαμηλή Λεπτομέρεια',
                showDetails: false,
                showFrames: false,
                showLocations: true,
                enableShadows: false,
                materialQuality: 'low'
            }
        };
        
        // Core systems
        this.frustumCuller = new THREE.Frustum();
        this.cameraMatrix = new THREE.Matrix4();
        this.currentLOD = 'HIGH';
        this.autoOptimizationEnabled = true;
        
        // Spatial partitioning for frustum culling
        this.spatialGrid = new Map();
        this.gridSize = 50;
        this.useSpatialPartitioning = true;
        
        // Performance monitoring
        this.stats = {
            totalObjects: 0,
            visibleObjects: 0,
            culledObjects: 0,
            instancedObjects: 0,
            drawCalls: 0,
            currentLOD: 'HIGH',
            frameTime: 0,
            spatialCells: 0,
            frustumChecks: 0
        };

        // Performance thresholds for automatic LOD switching
        this.performanceThresholds = {
            targetFPS: 60,
            lowFPSThreshold: 45,
            highFPSThreshold: 58
        };

        // Frame time tracking
        this.frameTimeHistory = [];
        this.maxFrameHistory = 60;
        
        // Cache for optimization
        this.objectCache = new Map();
        this.lastCameraPosition = new THREE.Vector3();
        this.cameraMovementThreshold = 1.0;
    }

    /**
     * Initialize spatial partitioning grid for efficient culling
     */
    initializeSpatialGrid(scene) {
        if (!this.useSpatialPartitioning) return;

        this.spatialGrid.clear();
        
        // Calculate scene bounds
        const boundingBox = new THREE.Box3().setFromObject(scene);
        const size = boundingBox.getSize(new THREE.Vector3());
    const _center = boundingBox.getCenter(new THREE.Vector3());

        // Create grid structure
        const gridCountX = Math.ceil(size.x / this.gridSize);
        const gridCountZ = Math.ceil(size.z / this.gridSize);

        this.gridBounds = {
            min: boundingBox.min,
            max: boundingBox.max,
            gridCountX,
            gridCountZ,
            cellSize: this.gridSize
        };

        // Populate grid with objects
        scene.traverse((object) => {
            if (this.shouldProcessObject(object)) {
                this.addObjectToSpatialGrid(object);
            }
        });

        this.stats.spatialCells = this.spatialGrid.size;
        // Spatial grid initialized
    }

    /**
     * Add object to spatial grid
     */
    addObjectToSpatialGrid(object) {
        const position = new THREE.Vector3();
        object.getWorldPosition(position);

        const gridX = Math.floor((position.x - this.gridBounds.min.x) / this.gridSize);
        const gridZ = Math.floor((position.z - this.gridBounds.min.z) / this.gridSize);
        const gridKey = `${gridX}_${gridZ}`;

        if (!this.spatialGrid.has(gridKey)) {
            this.spatialGrid.set(gridKey, {
                objects: [],
                bounds: this.calculateCellBounds(gridX, gridZ),
                visible: true,
                lastCheckFrame: 0
            });
        }

        this.spatialGrid.get(gridKey).objects.push(object);
    }

    /**
     * Calculate bounds for spatial grid cell
     */
    calculateCellBounds(gridX, gridZ) {
        const min = new THREE.Vector3(
            this.gridBounds.min.x + gridX * this.gridSize,
            this.gridBounds.min.y,
            this.gridBounds.min.z + gridZ * this.gridSize
        );

        const max = new THREE.Vector3(
            min.x + this.gridSize,
            this.gridBounds.max.y,
            min.z + this.gridSize
        );

        return new THREE.Box3(min, max);
    }

    /**
     * Main LOD update method - enhanced with spatial optimization
     */
    updateLOD(camera, scene, autoOptimize = true) {
        const startTime = performance.now();
        
        // Initialize spatial grid if needed
        if (this.useSpatialPartitioning && this.spatialGrid.size === 0) {
            this.initializeSpatialGrid(scene);
        }
        
        // Reset frame stats
        this.resetFrameStats();
        
        // Update frustum matrix
        this.updateFrustum(camera);
        
        // Check if camera moved significantly
        const cameraHasMoved = this.hasCameraMoved(camera);
        
        // Perform culling and LOD processing
        if (this.useSpatialPartitioning && this.spatialGrid.size > 0) {
            this.processSpatialLOD(camera, cameraHasMoved);
        } else {
            this.processDirectLOD(scene, camera);
        }
        
        // Update frame time history
        const frameTime = performance.now() - startTime;
        this.updateFrameTimeHistory(frameTime);
        
        // Auto-optimize LOD based on performance
        if (autoOptimize && this.autoOptimizationEnabled) {
            this.autoOptimizeLOD();
        }
        
        // Update stats
        this.stats.frameTime = frameTime;
        this.stats.currentLOD = this.currentLOD;
        
        // Cache camera position
        this.lastCameraPosition.copy(camera.position);
    }

    /**
     * Reset frame statistics
     */
    resetFrameStats() {
        this.stats.visibleObjects = 0;
        this.stats.culledObjects = 0;
        this.stats.drawCalls = 0;
        this.stats.frustumChecks = 0;
        this.stats.totalObjects = 0;
    }

    /**
     * Check if camera has moved significantly
     */
    hasCameraMoved(camera) {
        return this.lastCameraPosition.distanceTo(camera.position) > this.cameraMovementThreshold;
    }

    /**
     * Process LOD using spatial partitioning
     */
    processSpatialLOD(camera, cameraHasMoved) {
        const cameraPosition = camera.position;
        
        // Sort cells by distance for processing order
        const sortedCells = Array.from(this.spatialGrid.entries())
            .map(([key, cell]) => {
                const center = cell.bounds.getCenter(new THREE.Vector3());
                const distance = cameraPosition.distanceTo(center);
                return { key, cell, distance, center };
            })
            .sort((a, b) => a.distance - b.distance);

    for (const { cell, distance, center: _center } of sortedCells) {
            // Skip very distant cells entirely
            if (distance > this.lodLevels.LOW.maxDistance * 1.5) {
                this.setCellVisibility(cell, false);
                continue;
            }

            // Check if cell is in frustum
            if (!this.frustumCuller.intersectsBox(cell.bounds)) {
                this.setCellVisibility(cell, false);
                this.stats.culledObjects += cell.objects.length;
                continue;
            }

            // Process objects in visible cells
            this.processCellObjects(cell, camera, distance, cameraHasMoved);
        }
    }

    /**
     * Set visibility for all objects in a cell
     */
    setCellVisibility(cell, visible) {
        cell.objects.forEach(object => {
            object.visible = visible;
            this.stats.totalObjects++;
            if (visible) {
                this.stats.visibleObjects++;
            } else {
                this.stats.culledObjects++;
            }
        });
    }

    /**
     * Process objects within a spatial cell
     */
    processCellObjects(cell, camera, cellDistance, _forceUpdate) {
    // const lodLevel = this.determineLODLevel(cellDistance); // not directly used; per-object LOD computed below
        
        cell.objects.forEach(object => {
            this.stats.totalObjects++;
            
            // Individual object processing
            const objectDistance = this.getDistanceToCamera(object, camera);
            const objectLOD = this.determineLODLevel(objectDistance);
            
            // Apply frustum culling for closer objects
            if (cellDistance < 100) {
                if (!this.isObjectInFrustum(object)) {
                    object.visible = false;
                    this.stats.culledObjects++;
                    return;
                }
                this.stats.frustumChecks++;
            }
            
            // Apply LOD
            this.applyLODToObject(object, objectLOD);
            
            if (object.visible) {
                this.stats.visibleObjects++;
                if (object.isInstancedMesh) {
                    this.stats.instancedObjects++;
                }
                this.stats.drawCalls++;
            }
        });
    }

    /**
     * Process LOD directly without spatial partitioning
     */
    processDirectLOD(scene, camera) {
    scene.traverse((object) => {
            if (this.shouldProcessObject(object)) {
                this.stats.totalObjects++;
                this.processObjectLOD(object, camera);
            }
        });
    }

    /**
     * Process individual object for LOD
     */
    processObjectLOD(object, camera) {
        const distance = this.getDistanceToCamera(object, camera);
        const lodLevel = this.determineLODLevel(distance);
        
        // Frustum culling
        if (!this.isObjectInFrustum(object)) {
            object.visible = false;
            this.stats.culledObjects++;
            return;
        }
        
        this.stats.frustumChecks++;
        
        // Apply LOD
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

        // Handle different object types
        if (object.userData.isInstancedRack) {
            this.applyInstancedLOD(object, lodLevel, lodConfig);
        } else if (object.userData.isInstancedFrame) {
            object.visible = lodConfig.showFrames;
            this.applyMaterialLOD(object, lodConfig);
        } else if (object.userData.isRackLine) {
            this.applyRackLineLOD(object, lodLevel, lodConfig);
        } else if (object.isMesh) {
            this.applyMeshLOD(object, lodConfig);
        }
    }

    /**
     * Apply LOD to instanced rack objects
     */
    applyInstancedLOD(object, _lodLevel, lodConfig) {
        // Shadow settings
        object.castShadow = lodConfig.enableShadows;
        object.receiveShadow = lodConfig.enableShadows;
        
        // Material quality adjustment
        this.applyMaterialLOD(object, lodConfig);
    }

    /**
     * Apply LOD to regular mesh objects
     */
    applyMeshLOD(object, lodConfig) {
        object.castShadow = lodConfig.enableShadows;
        object.receiveShadow = lodConfig.enableShadows;
        this.applyMaterialLOD(object, lodConfig);
    }

    /**
     * Apply material-level LOD optimizations
     */
    applyMaterialLOD(object, lodConfig) {
        if (!object.material) return;
        
        const material = object.material;
        
        switch (lodConfig.materialQuality) {
            case 'high':
                if (material.metalness !== undefined) {
                    material.metalness = material.userData.originalMetalness || material.metalness;
                    material.roughness = material.userData.originalRoughness || material.roughness;
                }
                break;
                
            case 'medium':
                if (material.metalness !== undefined) {
                    if (!material.userData.originalMetalness) {
                        material.userData.originalMetalness = material.metalness;
                        material.userData.originalRoughness = material.roughness;
                    }
                    material.metalness *= 0.8;
                    material.roughness = Math.min(1, material.roughness * 1.2);
                }
                break;
                
            case 'low': {
                if (material.metalness !== undefined) {
                    if (!material.userData.originalMetalness) {
                        material.userData.originalMetalness = material.metalness;
                        material.userData.originalRoughness = material.roughness;
                    }
                    material.metalness *= 0.5;
                    material.roughness = Math.min(1, material.roughness * 1.5);
                }
                break; }
        }
    }

    /**
     * Apply LOD to legacy rack line objects
     */
    applyRackLineLOD(object, lodLevel, lodConfig) {
        object.visible = lodConfig.showLocations;
        
        if (!object.visible) return;
        
        // Traverse children and apply LOD
        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = lodConfig.enableShadows;
                child.receiveShadow = lodConfig.enableShadows;
                
                switch (lodLevel) {
                    case 'HIGH':
                        child.visible = true;
                        break;
                    case 'MEDIUM':
                        child.visible = true;
                        break;
                    case 'LOW':
                        /* eslint-disable no-case-declarations */
                        // Show only every 4th location for performance
                        const showLocation = (child.userData?.position ?? 0) % 4 === 0;
                        child.visible = showLocation;
                        /* eslint-enable no-case-declarations */
                        break;
                }
                
                this.applyMaterialLOD(child, lodConfig);
            }
        });
    }

    /**
     * Automatic LOD optimization based on performance
     */
    autoOptimizeLOD() {
        if (this.frameTimeHistory.length < 30) return;
        
        const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        const currentFPS = 1000 / avgFrameTime;
        
        // Auto-adjust LOD based on performance
        if (currentFPS < this.performanceThresholds.lowFPSThreshold) {
            if (this.currentLOD === 'HIGH') {
                this.setGlobalLOD('MEDIUM');
            } else if (this.currentLOD === 'MEDIUM') {
                this.setGlobalLOD('LOW');
            }
        } else if (currentFPS > this.performanceThresholds.highFPSThreshold) {
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
            console.log(`🎛️ LOD switched to: ${this.lodLevels[level].label} (${level})`);
        }
    }

    /**
     * Update frame time history
     */
    updateFrameTimeHistory(frameTime) {
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.maxFrameHistory) {
            this.frameTimeHistory.shift();
        }
    }

    /**
     * Update frustum matrix
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
               object.isInstancedMesh ||
               object.userData.isInstancedRack || 
               object.userData.isInstancedFrame || 
               object.userData.isRackLine;
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
    isObjectInFrustum(object) {
        if (!object.geometry || !object.geometry.boundingSphere) {
            return true; // Assume visible if no bounding info
        }
        
        try {
                return this.frustumCuller.intersectsObject(object);
    } catch {
            return true; // Fallback to visible
        }
    }

    /**
     * Manual LOD level control
     */
    forceLOD(level) {
        if (this.lodLevels[level]) {
            this.currentLOD = level;
            this.autoOptimizationEnabled = false;
            console.log(`🎛️ LOD manually set to: ${this.lodLevels[level].label} (Auto-optimization disabled)`);
        }
    }

    /**
     * Enable/disable automatic LOD optimization
     */
    setAutoOptimization(enabled) {
        this.autoOptimizationEnabled = enabled;
        console.log(`🤖 Auto LOD optimization ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Enable/disable spatial partitioning
     */
    setSpatialPartitioning(enabled) {
        this.useSpatialPartitioning = enabled;
        if (!enabled) {
            this.spatialGrid.clear();
        }
        console.log(`🗂️ Spatial partitioning ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update spatial grid (call when scene changes significantly)
     */
    updateSpatialGrid(scene) {
        if (this.useSpatialPartitioning) {
            this.initializeSpatialGrid(scene);
        }
    }

    /**
     * Get comprehensive performance report
     */
    getPerformanceReport() {
        const avgFrameTime = this.frameTimeHistory.length > 0 
            ? this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length 
            : 0;
        const currentFPS = avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0;
        const cullRatio = this.stats.totalObjects > 0 
            ? (this.stats.culledObjects / this.stats.totalObjects * 100).toFixed(1)
            : 0;
        
        return {
            lod: {
                ...this.stats,
                averageFrameTime: avgFrameTime.toFixed(2),
                currentFPS: currentFPS,
                lodLevel: this.currentLOD,
                autoOptimization: this.autoOptimizationEnabled
            },
            frustumCulling: {
                cullRatio: `${cullRatio}%`,
                spatialGridEnabled: this.useSpatialPartitioning,
                spatialCells: this.stats.spatialCells,
                frustumChecks: this.stats.frustumChecks
            },
            performance: {
                targetFPS: this.performanceThresholds.targetFPS,
                status: currentFPS >= this.performanceThresholds.targetFPS ? 'Excellent' :
                       currentFPS >= this.performanceThresholds.highFPSThreshold ? 'Good' :
                       currentFPS >= this.performanceThresholds.lowFPSThreshold ? 'Fair' : 'Poor'
            }
        };
    }

    /**
     * Configure performance thresholds
     */
    setPerformanceThresholds(thresholds) {
        this.performanceThresholds = { ...this.performanceThresholds, ...thresholds };
        console.log('⚙️ Performance thresholds updated:', this.performanceThresholds);
    }

    /**
     * Configure LOD distances
     */
    setLODDistances(high, medium, low) {
        this.lodLevels.HIGH.maxDistance = high;
        this.lodLevels.MEDIUM.maxDistance = medium;
        this.lodLevels.LOW.maxDistance = low;
        console.log(`📏 LOD distances updated: HIGH=${high}, MEDIUM=${medium}, LOW=${low}`);
    }

    /**
     * Get current configuration
     */
    getConfiguration() {
        return {
            currentLOD: this.currentLOD,
            autoOptimization: this.autoOptimizationEnabled,
            spatialPartitioning: this.useSpatialPartitioning,
            lodDistances: {
                high: this.lodLevels.HIGH.maxDistance,
                medium: this.lodLevels.MEDIUM.maxDistance,
                low: this.lodLevels.LOW.maxDistance
            },
            performanceThresholds: this.performanceThresholds,
            gridSize: this.gridSize
        };
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.spatialGrid.clear();
        this.objectCache.clear();
        this.frameTimeHistory.length = 0;
        console.log('🧹 Advanced LOD Manager disposed');
    }
}
