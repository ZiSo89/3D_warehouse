import * as THREE from 'three';
import { getLocationTypeColor } from '../ui/theme.js';
import { TextureAtlasManager } from '../core/TextureAtlasManager.js';

/**
 * Instanced Rendering implementation for racks - Priority 1 Optimization
 * Enhanced with Texture Atlasing - Priority 3 Optimization
 * Reduces draw calls significantly by grouping similar geometries
 */
export class InstancedRacksManager {
    constructor() {
        this.instances = new Map();
        this.geometries = new Map();
        this.materials = new Map();
        this.maxInstanceCount = 10000; // Maximum instances per type
        
        // Initialize texture atlas manager
        this.textureAtlas = new TextureAtlasManager();
        this.textureAtlas.createWarehouseMaterialAtlas();
        
        this.stats = {
            totalLocations: 0,
            instancedMeshes: 0,
            drawCalls: 0,
            materialsUsed: 0
        };
    }

    /**
     * Create optimized racks using instanced rendering
     */
    createInstancedRacks(uiConfig, constants, missingLocations = [], locationTypes = null) {
        const racksGroup = new THREE.Group();
        
        // Add lighting
        this.addLighting(racksGroup);
        
        // Pre-calculate dimensions
        const rackAndAisleWidth = (2 * uiConfig.storage_depth * constants.locationDepth) + constants.aisleWidth;
        const totalRackDepth = uiConfig.storage_depth * constants.locationDepth;
        const moduleLength = uiConfig.locations_per_module * constants.locationLength;
        
        // Group locations by type for instancing
        const locationGroups = this.groupLocationsByType(uiConfig, constants, missingLocations, locationTypes);
        
        // Create instanced meshes for each location type
        this.createInstancedMeshes(locationGroups, racksGroup);
        
        // Create rack frames (also instanced)
        this.createInstancedFrames(uiConfig, constants, racksGroup, rackAndAisleWidth, totalRackDepth, moduleLength);
        
        return racksGroup;
    }

    /**
     * Group locations by type and side for efficient instancing
     */
    groupLocationsByType(uiConfig, constants, missingLocations, locationTypes) {
        const groups = new Map();
        
        for (let a = 0; a < uiConfig.aisles; a++) {
            const levels = uiConfig.levels_per_aisle[a];
            
            for (let side = 0; side < 2; side++) { // West and East
                const isEast = side === 1;
                const rackAndAisleWidth = (2 * uiConfig.storage_depth * constants.locationDepth) + constants.aisleWidth;
                const totalRackDepth = uiConfig.storage_depth * constants.locationDepth;
                
                const xBase = a * rackAndAisleWidth + (isEast ? totalRackDepth + constants.aisleWidth : 0);
                
                for (let l = 0; l < levels; l++) {
                    for (let m = 0; m < uiConfig.modules_per_aisle; m++) {
                        for (let d = 0; d < uiConfig.storage_depth; d++) {
                            for (let s = 0; s < uiConfig.locations_per_module; s++) {
                                
                                // Check if location is missing
                                let locationType;
                                if (this.isLocationMissing(a, l, m, d, s, missingLocations)) {
                                    locationType = 'Missing';
                                } else {
                                    // Get location type
                                    locationType = this.getLocationType(a, l, m, d, s, locationTypes);
                                }
                                
                                const groupKey = `${locationType}_${side}`;
                                
                                if (!groups.has(groupKey)) {
                                    groups.set(groupKey, {
                                        type: locationType,
                                        side: side,
                                        positions: [],
                                        userData: []
                                    });
                                }
                                
                                // Calculate position
                                let displayDepth, dIndex;
                                if (isEast) {
                                    dIndex = d;
                                    displayDepth = d;
                                } else {
                                    dIndex = uiConfig.storage_depth - 1 - d;
                                    displayDepth = d;
                                }
                                
                                const x = xBase + (dIndex * constants.locationDepth) + (constants.locationDepth / 2);
                                const y = (l * constants.levelHeight) + (constants.levelHeight / 2);
                                const z = (m * uiConfig.locations_per_module * constants.locationLength) + 
                                         (s * constants.locationLength) + (constants.locationLength / 2);
                                
                                groups.get(groupKey).positions.push(new THREE.Vector3(x, y, z));
                                groups.get(groupKey).userData.push({
                                    aisle: a,
                                    level: l,
                                    module: m,
                                    depth: displayDepth,
                                    position: s,
                                    type: locationType,
                                    id: `${a}-${l}-${m}-${displayDepth}-${s}`
                                });
                                
                                this.stats.totalLocations++;
                            }
                        }
                    }
                }
            }
        }
        
        return groups;
    }

    /**
     * Create instanced meshes for each location group
     */
    createInstancedMeshes(locationGroups, racksGroup) {
        const locationGeometry = new THREE.BoxGeometry(
            0.8 * 0.8, // constants.locationDepth * 0.8
            1.0 * 0.8, // constants.levelHeight * 0.8
            1.2 * 0.8  // constants.locationLength * 0.8
        );
        
        locationGroups.forEach((group, groupKey) => {
            const count = group.positions.length;
            if (count === 0) return;
            
            // Get optimized material from texture atlas
            const materialName = this.getMaterialNameForLocationType(group.type);
            const material = this.textureAtlas.getMaterial(materialName);
            
            // Clone material to avoid shared state issues
            const instanceMaterial = material.clone();
            instanceMaterial.userData.locationType = group.type;
            
            // Create instanced mesh
            const instancedMesh = new THREE.InstancedMesh(locationGeometry, instanceMaterial, count);
            instancedMesh.castShadow = true;
            instancedMesh.receiveShadow = true;
            
            // Set instance matrices
            const matrix = new THREE.Matrix4();
            for (let i = 0; i < count; i++) {
                matrix.setPosition(group.positions[i]);
                instancedMesh.setMatrixAt(i, matrix);
                
                // Store user data for interactions
                if (!instancedMesh.userData.locations) {
                    instancedMesh.userData.locations = [];
                }
                instancedMesh.userData.locations[i] = group.userData[i];
            }
            
            instancedMesh.userData.isInstancedRack = true;
            instancedMesh.userData.groupKey = groupKey;
            instancedMesh.instanceMatrix.needsUpdate = true;
            
            racksGroup.add(instancedMesh);
            this.stats.instancedMeshes++;
            this.stats.materialsUsed++;
        });
    }

    /**
     * Map location type to material name
     */
    getMaterialNameForLocationType(locationType) {
        const typeMapping = {
            'Storage': 'storage_default',
            'Buffer': 'storage_buffer',
            'Service': 'storage_service',
            'Server position': 'storage_server_position',
            'Pick': 'storage_pick',
            'Replenishment': 'storage_replenishment',
            'Missing': 'missing_location'
        };
        
        // If type not found, create a dynamic material name (handle spaces and special chars)
        if (typeMapping[locationType]) {
            return typeMapping[locationType];
        } else {
            const safeName = locationType.toLowerCase()
                .replace(/\s+/g, '_')  // Replace spaces with underscores
                .replace(/[^a-z0-9_]/g, ''); // Remove special characters
            return `storage_${safeName}`;
        }
    }    /**
     * Create instanced rack frames
     */
    createInstancedFrames(uiConfig, constants, racksGroup, rackAndAisleWidth, totalRackDepth, moduleLength) {
        const frameGeometry = new THREE.BoxGeometry(totalRackDepth, 0.08, moduleLength);
        
        // Use optimized material from texture atlas
        const frameMaterial = this.textureAtlas.getMaterial('frame_steel');
        
        // Calculate total frame instances needed
        let frameCount = 0;
        for (let a = 0; a < uiConfig.aisles; a++) {
            const levels = uiConfig.levels_per_aisle[a];
            frameCount += levels * uiConfig.modules_per_aisle * 2; // 2 sides per aisle
        }
        
        const frameInstancedMesh = new THREE.InstancedMesh(frameGeometry, frameMaterial, frameCount);
        frameInstancedMesh.castShadow = true;
        frameInstancedMesh.receiveShadow = true;
        
        // Set frame positions
        const matrix = new THREE.Matrix4();
        let instanceIndex = 0;
        
        for (let a = 0; a < uiConfig.aisles; a++) {
            const levels = uiConfig.levels_per_aisle[a];
            
            for (let side = 0; side < 2; side++) {
                const isEast = side === 1;
                const xBase = a * rackAndAisleWidth + (isEast ? totalRackDepth + constants.aisleWidth : 0);
                
                for (let l = 0; l < levels; l++) {
                    for (let m = 0; m < uiConfig.modules_per_aisle; m++) {
                        const x = xBase + totalRackDepth / 2;
                        const y = l * constants.levelHeight;
                        const z = m * moduleLength + moduleLength / 2;
                        
                        matrix.setPosition(x, y, z);
                        frameInstancedMesh.setMatrixAt(instanceIndex, matrix);
                        instanceIndex++;
                    }
                }
            }
        }
        
        frameInstancedMesh.instanceMatrix.needsUpdate = true;
        frameInstancedMesh.userData.isInstancedFrame = true;
        racksGroup.add(frameInstancedMesh);
        this.stats.materialsUsed++;
    }

    /**
     * Add lighting to the scene
     */
    addLighting(racksGroup) {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        racksGroup.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 100;
        racksGroup.add(dirLight);
    }

    /**
     * Helper function to check if a location should be missing
     */
    isLocationMissing(aisle, level, module, depth, position, missingLocations) {
        return missingLocations.some(missing => {
            const aisleMatch = Array.isArray(missing.aisle) ? 
                missing.aisle.includes(aisle) : 
                (missing.aisle === null || missing.aisle === aisle);
            
            const levelMatch = Array.isArray(missing.level) ? 
                missing.level.includes(level) : 
                (missing.level === null || missing.level === level);
            
            const moduleMatch = Array.isArray(missing.module) ?
                missing.module.includes(module) :
                (missing.module === null || missing.module === module);
                
            const depthMatch = Array.isArray(missing.depth) ?
                missing.depth.includes(depth) :
                (missing.depth === null || missing.depth === depth);
                
            const positionMatch = Array.isArray(missing.position) ?
                missing.position.includes(position) :
                (missing.position === null || missing.position === position);
            
            return aisleMatch && levelMatch && moduleMatch && depthMatch && positionMatch;
        });
    }

    /**
     * Helper function to get location type
     */
    getLocationType(aisle, level, module, depth, position, locationTypes) {
        if (!locationTypes || !Array.isArray(locationTypes)) return 'Storage';

        const typeMatch = locationTypes.find(locType => {
            const aisleMatch = Array.isArray(locType.aisle) ? 
                locType.aisle.includes(aisle) : 
                (locType.aisle === null || locType.aisle === aisle);

            const levelMatch = Array.isArray(locType.level) ? 
                locType.level.includes(level) : 
                (locType.level === null || locType.level === level);

            const moduleMatch = Array.isArray(locType.module) ?
                locType.module.includes(module) :
                (locType.module === null || locType.module === module);
                
            const depthMatch = Array.isArray(locType.depth) ?
                locType.depth.includes(depth) :
                (locType.depth === null || locType.depth === depth);
                
            const positionMatch = Array.isArray(locType.position) ?
                locType.position.includes(position) :
                (locType.position === null || locType.position === position);

            const matches = aisleMatch && levelMatch && moduleMatch && depthMatch && positionMatch;
            
            return matches;
        });

        return typeMatch ? typeMatch.type : 'Storage';
    }

    /**
     * Update instance visibility based on camera distance (for LOD)
     */
    updateLOD(camera, lodLevel = 'HIGH') {
        // This will be integrated with the LOD system
        // For now, just maintain full visibility
        this.stats.drawCalls = this.stats.instancedMeshes;
    }

    /**
     * Get performance statistics including texture atlas
     */
    getStats() {
        const atlasStats = this.textureAtlas.getStats();
        return { 
            ...this.stats,
            textureAtlas: atlasStats
        };
    }

    /**
     * Dispose resources
     */
    dispose() {
        if (this.textureAtlas) {
            this.textureAtlas.dispose();
        }
    }
}

// Export the function for backward compatibility
export function createRacksInstanced(uiConfig, constants, missingLocations = [], locationTypes = null) {
    const manager = new InstancedRacksManager();
    return manager.createInstancedRacks(uiConfig, constants, missingLocations, locationTypes);
}
