/**
 * Enhanced Frustum Culling Manager για βελτίωση ορατότητας
 * Advanced visibility optimization with spatial partitioning
 */

import * as THREE from 'three';

export class FrustumCullingManager {
    constructor() {
        this.frustum = new THREE.Frustum();
        this.cameraMatrix = new THREE.Matrix4();
        this.spatialGrid = new Map();
        this.gridSize = 50; // Size of each spatial grid cell
        this.cullingEnabled = true;
        this.useSpatialPartitioning = true;
        
        this.stats = {
            totalObjects: 0,
            visibleObjects: 0,
            culledObjects: 0,
            spatialCells: 0,
            frustumChecks: 0,
            spatialOptimizations: 0
        };

        // Performance optimization settings
        this.optimizationSettings = {
            batchCulling: true,
            spatialCaching: true,
            hierarchicalCulling: true,
            distanceBasedDetail: true
        };
    }

    /**
     * Initialize spatial partitioning grid
     */
    initializeSpatialGrid(scene) {
        if (!this.useSpatialPartitioning) return;

        // Clear existing grid
        this.spatialGrid.clear();

        // Calculate scene bounds
        const boundingBox = new THREE.Box3().setFromObject(scene);
        const size = boundingBox.getSize(new THREE.Vector3());
        const center = boundingBox.getCenter(new THREE.Vector3());

        // Create spatial grid
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
            if (this.shouldCullObject(object)) {
                this.addObjectToSpatialGrid(object);
            }
        });

        this.stats.spatialCells = this.spatialGrid.size;
        console.log(`Spatial grid initialized: ${gridCountX}x${gridCountZ} cells, ${this.stats.spatialCells} populated`);
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
                lastCullResult: null,
                framesCached: 0
            });
        }

        this.spatialGrid.get(gridKey).objects.push(object);
    }

    /**
     * Calculate bounds for a spatial grid cell
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

        return { min, max };
    }

    /**
     * Perform enhanced frustum culling
     */
    performCulling(camera, scene) {
        if (!this.cullingEnabled) return;

        // Update frustum
        this.updateFrustum(camera);

        // Reset stats
        this.stats.totalObjects = 0;
        this.stats.visibleObjects = 0;
        this.stats.culledObjects = 0;
        this.stats.frustumChecks = 0;
        this.stats.spatialOptimizations = 0;

        if (this.useSpatialPartitioning && this.spatialGrid.size > 0) {
            this.performSpatialCulling(camera);
        } else {
            this.performDirectCulling(scene);
        }
    }

    /**
     * Perform culling using spatial partitioning
     */
    performSpatialCulling(camera) {
        const cameraPosition = camera.position;
        const processedCells = new Set();

        // Process cells in order of distance from camera
        const sortedCells = Array.from(this.spatialGrid.entries())
            .map(([key, cell]) => {
                const cellCenter = new THREE.Vector3(
                    (cell.bounds.min.x + cell.bounds.max.x) * 0.5,
                    (cell.bounds.min.y + cell.bounds.max.y) * 0.5,
                    (cell.bounds.min.z + cell.bounds.max.z) * 0.5
                );
                const distance = cameraPosition.distanceTo(cellCenter);
                return { key, cell, distance, center: cellCenter };
            })
            .sort((a, b) => a.distance - b.distance);

        for (const { key, cell, distance, center } of sortedCells) {
            // Skip very distant cells
            if (distance > 200) {
                this.setCellVisibility(cell, false);
                this.stats.spatialOptimizations++;
                continue;
            }

            // Check if entire cell is outside frustum
            if (!this.isCellInFrustum(cell.bounds)) {
                this.setCellVisibility(cell, false);
                this.stats.culledObjects += cell.objects.length;
                this.stats.spatialOptimizations++;
                continue;
            }

            // Process individual objects in cell
            this.processCellObjects(cell, camera, distance);
            processedCells.add(key);
        }
    }

    /**
     * Check if spatial cell is within frustum
     */
    isCellInFrustum(bounds) {
        const box = new THREE.Box3(bounds.min, bounds.max);
        return this.frustum.intersectsBox(box);
    }

    /**
     * Set visibility for all objects in a cell
     */
    setCellVisibility(cell, visible) {
        cell.objects.forEach(object => {
            object.visible = visible;
            if (visible) {
                this.stats.visibleObjects++;
            }
        });
    }

    /**
     * Process objects within a spatial cell
     */
    processCellObjects(cell, camera, cellDistance) {
        cell.objects.forEach(object => {
            this.stats.totalObjects++;

            // Apply distance-based optimizations
            if (this.optimizationSettings.distanceBasedDetail) {
                this.applyDistanceOptimizations(object, cellDistance);
            }

            // Individual frustum check for closer objects
            if (cellDistance < 100) {
                const isVisible = this.isObjectInFrustum(object);
                object.visible = isVisible;
                this.stats.frustumChecks++;

                if (isVisible) {
                    this.stats.visibleObjects++;
                } else {
                    this.stats.culledObjects++;
                }
            } else {
                // For distant objects, use cell-level culling
                object.visible = true;
                this.stats.visibleObjects++;
            }
        });
    }

    /**
     * Apply distance-based optimizations
     */
    applyDistanceOptimizations(object, distance) {
        // Disable shadows for distant objects
        if (distance > 100) {
            if (object.castShadow) {
                object.castShadow = false;
                object.userData.shadowsDisabled = true;
            }
        } else if (object.userData.shadowsDisabled) {
            object.castShadow = true;
            object.userData.shadowsDisabled = false;
        }

        // Reduce material quality for very distant objects
        if (distance > 150 && object.material) {
            if (!object.userData.originalMaterial) {
                object.userData.originalMaterial = object.material;
            }
            
            // Use simplified material for distant objects
            if (object.material.metalness !== undefined) {
                object.material.metalness = Math.max(0, object.material.metalness - 0.2);
                object.material.roughness = Math.min(1, object.material.roughness + 0.2);
            }
        } else if (object.userData.originalMaterial && distance <= 150) {
            // Restore original material for closer objects
            object.material = object.userData.originalMaterial;
            object.userData.originalMaterial = null;
        }
    }

    /**
     * Perform direct frustum culling (fallback)
     */
    performDirectCulling(scene) {
        scene.traverse((object) => {
            if (this.shouldCullObject(object)) {
                this.stats.totalObjects++;
                const isVisible = this.isObjectInFrustum(object);
                object.visible = isVisible;
                this.stats.frustumChecks++;

                if (isVisible) {
                    this.stats.visibleObjects++;
                } else {
                    this.stats.culledObjects++;
                }
            }
        });
    }

    /**
     * Check if object is within frustum
     */
    isObjectInFrustum(object) {
        if (!object.geometry || !object.geometry.boundingSphere) {
            return true; // Assume visible if no bounding info
        }

        try {
            return this.frustum.intersectsObject(object);
        } catch (e) {
            return true; // Fallback to visible
        }
    }

    /**
     * Check if object should be culled
     */
    shouldCullObject(object) {
        return object.isMesh || 
               object.isInstancedMesh ||
               object.userData.isInstancedRack || 
               object.userData.isInstancedFrame || 
               object.userData.isRackLine;
    }

    /**
     * Update frustum matrix
     */
    updateFrustum(camera) {
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();
        this.cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.cameraMatrix);
    }

    /**
     * Enable/disable frustum culling
     */
    setCullingEnabled(enabled) {
        this.cullingEnabled = enabled;
        console.log(`Frustum culling ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Enable/disable spatial partitioning
     */
    setSpatialPartitioning(enabled) {
        this.useSpatialPartitioning = enabled;
        console.log(`Spatial partitioning ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Configure optimization settings
     */
    setOptimizationSettings(settings) {
        this.optimizationSettings = { ...this.optimizationSettings, ...settings };
        console.log('Optimization settings updated:', this.optimizationSettings);
    }

    /**
     * Get culling statistics
     */
    getStats() {
        const cullRatio = this.stats.totalObjects > 0 
            ? (this.stats.culledObjects / this.stats.totalObjects * 100).toFixed(1)
            : 0;

        return {
            ...this.stats,
            cullRatio: `${cullRatio}%`,
            spatialGridEnabled: this.useSpatialPartitioning,
            cullingEnabled: this.cullingEnabled
        };
    }

    /**
     * Update spatial grid (call when objects move significantly)
     */
    updateSpatialGrid(scene) {
        if (!this.useSpatialPartitioning) return;
        
        // Rebuild spatial grid
        this.initializeSpatialGrid(scene);
    }

    /**
     * Clear spatial grid
     */
    dispose() {
        this.spatialGrid.clear();
        console.log('Frustum culling manager disposed');
    }
}
