/**
 * Βελτιστοποιητής Απόδοσης για Μεγάλα Warehouse Μοντέλα
 * Περιλαμβάνει: Texture Atlasing, Geometry Batching, Memory Management
 */

import * as THREE from 'three';

export class WarehousePerformanceOptimizer {
    constructor() {
        this.textureAtlas = null;
        this.materialCache = new Map();
        this.geometryCache = new Map();
        this.batchedMeshes = new Map();
        
        this.config = {
            maxTextureSize: 2048,
            targetFPS: 60,
            maxDrawCalls: 100,
            memoryThreshold: 512, // MB
            lodDistances: {
                high: 50,
                medium: 150,
                low: 300
            }
        };
    }

    /**
     * Δημιουργία Texture Atlas για όλα τα warehouse materials
     */
    createTextureAtlas(textures) {
        console.log('🎨 Δημιουργία Texture Atlas...');
        
        const canvas = document.createElement('canvas');
        canvas.width = this.config.maxTextureSize;
        canvas.height = this.config.maxTextureSize;
        const ctx = canvas.getContext('2d');
        
        const atlasData = {
            texture: null,
            uvMappings: new Map(),
            regions: []
        };
        
        let currentX = 0;
        let currentY = 0;
        let rowHeight = 0;
        
        textures.forEach((texture, name) => {
            if (texture.image) {
                const img = texture.image;
                const width = Math.min(img.width, 256); // Μέγιστο μέγεθος ανά texture
                const height = Math.min(img.height, 256);
                
                // Έλεγχος αν χωράει στη σειρά
                if (currentX + width > this.config.maxTextureSize) {
                    currentX = 0;
                    currentY += rowHeight;
                    rowHeight = 0;
                }
                
                // Σχεδίαση στο atlas
                ctx.drawImage(img, currentX, currentY, width, height);
                
                // Αποθήκευση UV mapping
                atlasData.uvMappings.set(name, {
                    u: currentX / this.config.maxTextureSize,
                    v: currentY / this.config.maxTextureSize,
                    width: width / this.config.maxTextureSize,
                    height: height / this.config.maxTextureSize
                });
                
                currentX += width;
                rowHeight = Math.max(rowHeight, height);
            }
        });
        
        // Δημιουργία Three.js texture από canvas
        atlasData.texture = new THREE.CanvasTexture(canvas);
        atlasData.texture.flipY = false;
        
        this.textureAtlas = atlasData;
        console.log(`✅ Texture Atlas δημιουργήθηκε: ${textures.size} textures σε ${this.config.maxTextureSize}x${this.config.maxTextureSize}`);
        
        return atlasData;
    }

    /**
     * Βελτιστοποίηση geometries με batching
     */
    optimizeGeometries(meshes) {
        console.log('🔧 Βελτιστοποίηση Geometries...');
        
        // Ομαδοποίηση meshes βάσει material
        const materialGroups = new Map();
        
        meshes.forEach(mesh => {
            const materialKey = this.getMaterialKey(mesh.material);
            if (!materialGroups.has(materialKey)) {
                materialGroups.set(materialKey, []);
            }
            materialGroups.get(materialKey).push(mesh);
        });
        
        const optimizedGroups = [];
        
        materialGroups.forEach((groupMeshes, materialKey) => {
            if (groupMeshes.length > 1) {
                // Συγχώνευση geometries με το ίδιο material
                const mergedGeometry = this.mergeGeometries(groupMeshes);
                const batchedMesh = new THREE.Mesh(mergedGeometry, groupMeshes[0].material);
                
                optimizedGroups.push({
                    type: 'batched',
                    mesh: batchedMesh,
                    originalCount: groupMeshes.length,
                    materialKey
                });
                
                console.log(`📦 Batched ${groupMeshes.length} meshes με material: ${materialKey}`);
            } else {
                // Μονό mesh - κρατάμε όπως είναι
                optimizedGroups.push({
                    type: 'single',
                    mesh: groupMeshes[0],
                    originalCount: 1,
                    materialKey
                });
            }
        });
        
        return optimizedGroups;
    }

    /**
     * Συγχώνευση geometries
     */
    mergeGeometries(meshes) {
        const geometries = [];
        
        meshes.forEach(mesh => {
            const geometry = mesh.geometry.clone();
            geometry.applyMatrix4(mesh.matrixWorld);
            geometries.push(geometry);
        });
        
        return THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
    }

    /**
     * Δημιουργία κλειδιού για material caching
     */
    getMaterialKey(material) {
        if (material.name) return material.name;
        
        const color = material.color ? material.color.getHexString() : 'ffffff';
        const type = material.type || 'Material';
        const wireframe = material.wireframe ? 'wire' : 'solid';
        
        return `${type}_${color}_${wireframe}`;
    }

    /**
     * Δυναμικό LOD βάσει performance
     */
    dynamicLODAdjustment(currentFPS, camera, objects) {
        if (currentFPS < this.config.targetFPS * 0.8) {
            // Χαμηλή απόδοση - μείωση λεπτομερειών
            this.aggressiveLOD(camera, objects);
            console.log('⚡ Εφαρμογή aggressive LOD λόγω χαμηλής απόδοσης');
        } else if (currentFPS > this.config.targetFPS * 1.1) {
            // Καλή απόδοση - αύξηση λεπτομερειών
            this.enhancedLOD(camera, objects);
        }
    }

    /**
     * Aggressive LOD για χαμηλή απόδοση
     */
    aggressiveLOD(camera, objects) {
        const cameraPosition = camera.position;
        
        objects.forEach(object => {
            const distance = cameraPosition.distanceTo(object.position);
            
            if (distance > this.config.lodDistances.high * 0.5) {
                // Πολύ μακριά - κρύψε ή χρησιμοποίησε wireframe
                if (distance > this.config.lodDistances.low) {
                    object.visible = false;
                } else {
                    object.visible = true;
                    if (object.material) {
                        object.material.wireframe = true;
                        object.castShadow = false;
                        object.receiveShadow = false;
                    }
                }
            }
        });
    }

    /**
     * Enhanced LOD για καλή απόδοση
     */
    enhancedLOD(camera, objects) {
        const cameraPosition = camera.position;
        
        objects.forEach(object => {
            const distance = cameraPosition.distanceTo(object.position);
            
            if (distance < this.config.lodDistances.medium) {
                object.visible = true;
                if (object.material) {
                    object.material.wireframe = false;
                    if (distance < this.config.lodDistances.high) {
                        object.castShadow = true;
                        object.receiveShadow = true;
                    }
                }
            }
        });
    }

    /**
     * Παρακολούθηση memory usage
     */
    monitorMemoryUsage() {
        if (performance.memory) {
            const used = performance.memory.usedJSHeapSize / 1024 / 1024;
            const total = performance.memory.totalJSHeapSize / 1024 / 1024;
            
            if (used > this.config.memoryThreshold) {
                console.warn(`⚠️ Υψηλή χρήση μνήμης: ${used.toFixed(1)}MB / ${total.toFixed(1)}MB`);
                this.freeUnusedResources();
            }
            
            return { used, total, percentage: (used / total) * 100 };
        }
        
        return null;
    }

    /**
     * Απελευθέρωση αχρησιμοποίητων πόρων
     */
    freeUnusedResources() {
        console.log('🧹 Απελευθέρωση αχρησιμοποίητων πόρων...');
        
        // Καθαρισμός geometry cache
        this.geometryCache.forEach((geometry, key) => {
            if (geometry.userData.lastUsed && 
                Date.now() - geometry.userData.lastUsed > 60000) { // 1 λεπτό
                geometry.dispose();
                this.geometryCache.delete(key);
            }
        });
        
        // Καθαρισμός material cache
        this.materialCache.forEach((material, key) => {
            if (material.userData.lastUsed && 
                Date.now() - material.userData.lastUsed > 60000) {
                material.dispose();
                this.materialCache.delete(key);
            }
        });
        
        // Αναγκαστικό garbage collection (αν υπάρχει)
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Αναφορά απόδοσης
     */
    getOptimizationReport() {
        const memory = this.monitorMemoryUsage();
        
        return {
            cacheStats: {
                geometries: this.geometryCache.size,
                materials: this.materialCache.size,
                batchedMeshes: this.batchedMeshes.size
            },
            memory: memory,
            textureAtlas: this.textureAtlas ? {
                size: `${this.config.maxTextureSize}x${this.config.maxTextureSize}`,
                textures: this.textureAtlas.uvMappings.size
            } : null,
            recommendations: this.getPerformanceRecommendations()
        };
    }

    /**
     * Συστάσεις βελτίωσης απόδοσης
     */
    getPerformanceRecommendations() {
        const recommendations = [];
        
        if (this.geometryCache.size > 100) {
            recommendations.push('Πολλά geometries στο cache - εφαρμόστε aggressive cleanup');
        }
        
        if (!this.textureAtlas) {
            recommendations.push('Δημιουργήστε texture atlas για μείωση draw calls');
        }
        
        const memory = this.monitorMemoryUsage();
        if (memory && memory.percentage > 80) {
            recommendations.push('Υψηλή χρήση μνήμης - εφαρμόστε πιο aggressive LOD');
        }
        
        return recommendations;
    }
}
