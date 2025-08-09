/**
 * Texture Atlas Manager για βελτίωση απόδοσης υφών
 * Combines multiple textures into atlases to reduce draw calls
 */

import * as THREE from 'three';

import { LOCATION_TYPE_COLORS, getLocationTypeColor } from '../ui/theme.js';

export class TextureAtlasManager {
    constructor() {
        this.atlases = new Map();
        this.materials = new Map();
        this.textureCache = new Map();
        this.atlasSize = 2048; // Default atlas size
        this.maxTexturesPerAtlas = 16; // 4x4 grid
        
        this.stats = {
            atlasesCreated: 0,
            texturesAtlased: 0,
            materialsCached: 0,
            memoryUsed: 0
        };
    }

    /**
     * Create material atlas for warehouse components
     */
    createWarehouseMaterialAtlas() {
        // Define standard warehouse materials with their properties
        const materialDefinitions = {
            'storage_default': {
                color: 0x457b9d,
                metalness: 0.5,
                roughness: 0.45,
                emissive: 0x001122,
                emissiveIntensity: 0.1
            },
            'storage_buffer': {
                color: LOCATION_TYPE_COLORS.Buffer,
                metalness: 0.3,
                roughness: 0.6,
                emissive: LOCATION_TYPE_COLORS.Buffer,
                emissiveIntensity: 0.45
            },
            'storage_service': {
                color: LOCATION_TYPE_COLORS.Service,
                metalness: 0.4,
                roughness: 0.5,
                emissive: LOCATION_TYPE_COLORS.Service,
                emissiveIntensity: 0.45
            },
            'storage_pick': {
                color: LOCATION_TYPE_COLORS.Pick,
                metalness: 0.35,
                roughness: 0.55,
                emissive: LOCATION_TYPE_COLORS.Pick,
                emissiveIntensity: 0.45
            },
            'storage_replenishment': {
                color: LOCATION_TYPE_COLORS.Replenishment,
                metalness: 0.3,
                roughness: 0.6,
                emissive: LOCATION_TYPE_COLORS.Replenishment,
                emissiveIntensity: 0.45
            },
            'storage_server_position': {
                color: LOCATION_TYPE_COLORS['Server position'],
                metalness: 0.4,
                roughness: 0.5,
                emissive: LOCATION_TYPE_COLORS['Server position'],
                emissiveIntensity: 0.45
            },
            'frame_steel': {
                color: 0xc0c0c0,
                metalness: 0.8,
                roughness: 0.25,
                clearcoat: 0.6,
                clearcoatRoughness: 0.18
            },
            'frame_aluminum': {
                color: 0xe5d1d0,
                metalness: 1.0,
                roughness: 0.08,
                clearcoat: 0.7,
                clearcoatRoughness: 0.12
            },
            'ground': {
                color: 0x8d99ae,
                metalness: 0.1,
                roughness: 0.8
            },
            'missing_location': {
                color: LOCATION_TYPE_COLORS['Missing'],
                metalness: 0.2,
                roughness: 0.7,
                emissive: LOCATION_TYPE_COLORS['Missing'],
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.8
            }
        };

        // Create optimized materials
        this.createOptimizedMaterials(materialDefinitions);
        
        // Create texture atlas for patterns (if needed)
        this.createPatternAtlas();
    }

    /**
     * Create optimized materials with shared properties
     */
    createOptimizedMaterials(definitions) {
        // Create base material configurations
        const baseMaterialConfig = {
            transparent: false,
            alphaTest: 0.5,
            side: THREE.FrontSide,
            shadowSide: THREE.FrontSide,
            // Use lower precision for better performance
            precision: 'mediump'
        };

        Object.entries(definitions).forEach(([name, props]) => {
            const material = new THREE.MeshPhysicalMaterial({
                ...baseMaterialConfig,
                ...props
            });

            // Enable material caching
            material.userData.atlasName = name;
            this.materials.set(name, material);
            this.stats.materialsCached++;
        });
    }

    /**
     * Create pattern atlas for repeated textures
     */
    createPatternAtlas() {
        // Headless/test environment guard: skip pattern atlas when no DOM
        if (typeof document === 'undefined' || !document.createElement) {
            return; // In Node/Vitest we don't have a canvas; skip procedural pattern atlas
        }
        // Create procedural textures for different patterns
        const patterns = this.createProceduralPatterns();
        
        if (patterns.length === 0) return;

        // Create atlas canvas
        const atlasCanvas = document.createElement('canvas');
        atlasCanvas.width = this.atlasSize;
        atlasCanvas.height = this.atlasSize;
        const ctx = atlasCanvas.getContext('2d');

        // Calculate grid size
        const gridSize = Math.ceil(Math.sqrt(patterns.length));
        const cellSize = this.atlasSize / gridSize;

        // Draw patterns to atlas
        patterns.forEach((pattern, index) => {
            const row = Math.floor(index / gridSize);
            const col = index % gridSize;
            const x = col * cellSize;
            const y = row * cellSize;

            ctx.drawImage(pattern.canvas, x, y, cellSize, cellSize);
        });

        // Create texture from atlas
        const atlasTexture = new THREE.CanvasTexture(atlasCanvas);
        atlasTexture.wrapS = THREE.RepeatWrapping;
        atlasTexture.wrapT = THREE.RepeatWrapping;
        atlasTexture.generateMipmaps = true;
        atlasTexture.minFilter = THREE.LinearMipmapLinearFilter;
        atlasTexture.magFilter = THREE.LinearFilter;

        this.atlases.set('patterns', {
            texture: atlasTexture,
            patterns: patterns,
            gridSize: gridSize,
            cellSize: cellSize
        });

        this.stats.atlasesCreated++;
        this.stats.texturesAtlased += patterns.length;
    }

    /**
     * Create procedural patterns for materials
     */
    createProceduralPatterns() {
        const patterns = [];
        const patternSize = 256;

        // Metal grid pattern
        patterns.push(this.createMetalGridPattern(patternSize));
        
        // Concrete pattern
        patterns.push(this.createConcretePattern(patternSize));
        
        // Warning stripes pattern
        patterns.push(this.createWarningStripesPattern(patternSize));

        return patterns;
    }

    /**
     * Create metal grid pattern
     */
    createMetalGridPattern(size) {
        if (typeof document === 'undefined') {
            return { canvas: { width: size, height: size }, name: 'metal_grid' };
        }
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base metal color
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(0, 0, size, size);

        // Grid lines
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        const gridSpacing = size / 8;

        for (let i = 0; i <= 8; i++) {
            const pos = i * gridSpacing;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, size);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(size, pos);
            ctx.stroke();
        }

        return { canvas, name: 'metal_grid' };
    }

    /**
     * Create concrete pattern
     */
    createConcretePattern(size) {
        if (typeof document === 'undefined') {
            return { canvas: { width: size, height: size }, name: 'concrete' };
        }
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Base concrete color
        ctx.fillStyle = '#8d99ae';
        ctx.fillRect(0, 0, size, size);

        // Add noise for concrete texture
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 30;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }

        ctx.putImageData(imageData, 0, 0);
        return { canvas, name: 'concrete' };
    }

    /**
     * Create warning stripes pattern
     */
    createWarningStripesPattern(size) {
        if (typeof document === 'undefined') {
            return { canvas: { width: size, height: size }, name: 'warning_stripes' };
        }
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const stripeWidth = size / 8;
        
        for (let i = 0; i < 8; i++) {
            ctx.fillStyle = i % 2 === 0 ? '#f1c40f' : '#e74c3c';
            ctx.fillRect(i * stripeWidth, 0, stripeWidth, size);
        }

        return { canvas, name: 'warning_stripes' };
    }

    /**
     * Get material by name
     */
    getMaterial(name) {
        if (this.materials.has(name)) {
            return this.materials.get(name);
        }
        
        // Check if it's a storage location type we can create dynamically
        if (name.startsWith('storage_')) {
            const locationType = name.replace('storage_', '').replace(/_/g, ' ');
            const capitalizedType = locationType.split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            // Use the improved color generation function
            const colorData = getLocationTypeColor(capitalizedType, 0);
            
            const material = new THREE.MeshPhysicalMaterial({
                color: colorData.color,
                metalness: 0.35,
                roughness: 0.55,
                emissive: colorData.emissive,
                emissiveIntensity: colorData.emissiveIntensity,
                transparent: false,
                alphaTest: 0.5,
                side: THREE.FrontSide,
                shadowSide: THREE.FrontSide,
                precision: 'mediump'
            });
            
            material.userData.atlasName = name;
            material.userData.locationType = capitalizedType;
            this.materials.set(name, material);
            this.stats.materialsCached++;
            
            return material;
        }
        
        return this.createDefaultMaterial();
    }

    /**
     * Get material with pattern from atlas
     */
    getMaterialWithPattern(baseName, patternName) {
        const cacheKey = `${baseName}_${patternName}`;
        
        if (this.materials.has(cacheKey)) {
            return this.materials.get(cacheKey);
        }

        const baseMaterial = this.getMaterial(baseName);
        const atlas = this.atlases.get('patterns');
        
        if (!atlas) {
            return baseMaterial;
        }

        // Find pattern in atlas
        const pattern = atlas.patterns.find(p => p.name === patternName);
        if (!pattern) {
            return baseMaterial;
        }

        // Clone base material and add atlas texture
        const material = baseMaterial.clone();
        material.map = atlas.texture;
        
        // Calculate UV offset for the pattern in atlas
        const patternIndex = atlas.patterns.indexOf(pattern);
        const row = Math.floor(patternIndex / atlas.gridSize);
        const col = patternIndex % atlas.gridSize;
        const uvScale = 1 / atlas.gridSize;
        
        // Set UV transform
        material.map.offset.set(col * uvScale, row * uvScale);
        material.map.repeat.set(uvScale, uvScale);

        this.materials.set(cacheKey, material);
        return material;
    }

    /**
     * Create default fallback material
     */
    createDefaultMaterial() {
        return new THREE.MeshPhysicalMaterial({
            color: 0x457b9d,
            metalness: 0.5,
            roughness: 0.5
        });
    }

    /**
     * Optimize materials for instanced rendering
     */
    optimizeMaterialsForInstancing() {
    this.materials.forEach((material, _name) => {
            // Disable features that don't work well with instancing
            material.transparent = false;
            material.alphaTest = 0;
            
            // Use more efficient settings
            material.precision = 'mediump';
            material.shadowSide = THREE.FrontSide;
            
            // Enable material optimization
            material.userData.optimizedForInstancing = true;
        });
    }

    /**
     * Preload all materials to avoid runtime creation
     */
    preloadMaterials() {
        // Force compilation of all materials
        this.materials.forEach((material) => {
            material.needsUpdate = true;
        });
    }

    /**
     * Get atlas statistics
     */
    getStats() {
        // Calculate memory usage estimate
        this.stats.memoryUsed = this.calculateMemoryUsage();
        return { ...this.stats };
    }

    /**
     * Calculate estimated memory usage
     */
    calculateMemoryUsage() {
        let memoryBytes = 0;
        
        // Atlas textures
        this.atlases.forEach((atlas) => {
            if (atlas.texture && atlas.texture.image) {
                const size = this.atlasSize;
                memoryBytes += size * size * 4; // RGBA
            }
        });

        // Materials (rough estimate)
        memoryBytes += this.materials.size * 1024; // ~1KB per material

        return Math.round(memoryBytes / 1024 / 1024 * 100) / 100; // MB
    }

    /**
     * Clear cache and free memory
     */
    dispose() {
        // Dispose textures
        this.atlases.forEach((atlas) => {
            if (atlas.texture) {
                atlas.texture.dispose();
            }
        });

        // Dispose materials
        this.materials.forEach((material) => {
            material.dispose();
        });

        this.atlases.clear();
        this.materials.clear();
        this.textureCache.clear();
    }
}
