import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createRacks } from '../components/createRacks.js';
import { createPrezone } from '../components/createPrezone.js';
//import { createShuttle, createLift } from '../components/createTransporters.js';
import { AnimationManager } from '../animation/AnimationManager.js';
import { constants } from './constants.js';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.warehouseGroup = new THREE.Group();
        this.animationManager = new AnimationManager(this);
        this.scene.add(this.warehouseGroup);
        
        // Define missing locations (like in WH_MODEL.txt)
        this.missingLocations = [
            // Example: Missing location due to building column in aisle 1, level 2, module 3, depth 0, position 1
            { aisle: 1, level: 2, module: 3, depth: 0, position: 1 },
            // Example: Multiple aisles affected - service levels have missing locations
            { aisle: [0, 1], level: [3, 4], module: 2, depth: null, position: 0 },
            // Example: Missing entire module due to lift shaft
            { aisle: 2, level: null, module: 7, depth: null, position: null }
        ];
        
        // Define location types (like in WH_MODEL.txt)
        this.locationTypes = {
            // Buffer locations near lifts - these are special locations used for lift operations
            buffer_locations: [
                // Buffer zone in aisle 0, all levels, first and last modules
                { aisle: 0, level: null, module: [0, 0], depth: [0, 1], position: null, type: 'Buffer' },
                // Buffer zone in last aisle, all levels, first and last modules  
                { aisle: 2, level: null, module: [6, 7], depth: [0, 1], position: null, type: 'Buffer' }
            ],
            // All other locations are Storage by default
            default_type: 'Storage'
        };
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limited pixel ratio
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap; // Faster shadow type
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.antialias = false; // Disabled for performance
        document.body.appendChild(this.renderer.domElement);

        this.camera.position.set(15, 15, 30);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;

        this.scene.background = new THREE.Color(0xf1faee); // Light cream from palette
        this.scene.fog = new THREE.Fog(0xf1faee, 50, 100); // Matching fog color

        this.setupLighting();

        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        this.createOrientationLabels(); // Large labels at warehouse edges
        this.createCompass(); // 3D compass for orientation

        this.animate();
    }

    createOrientationLabels() {
        const labels = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
        const positions = [
            new THREE.Vector3(0, 1, -140), // North
            new THREE.Vector3(0, 1, 140),  // South
            new THREE.Vector3(140, 1, 0),  // East
            new THREE.Vector3(-140, 1, 0)  // West
        ];

        labels.forEach((text, i) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const fontSize = 48;
            context.font = `bold ${fontSize}px Arial`;
            const textWidth = context.measureText(text).width;

            canvas.width = textWidth;
            canvas.height = fontSize;
            
            context.font = `bold ${fontSize}px Arial`;
            context.fillStyle = 'rgba(30, 50, 49, 0.7)';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, canvas.width / 2, canvas.height / 2);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMaterial);
            
            sprite.position.copy(positions[i]);
            sprite.scale.set(canvas.width / 5, canvas.height / 5, 1.0);
            
            this.scene.add(sprite);
        });
    }

    createCompass() {
        // Create compass group positioned at bottom-right of screen
        this.compassGroup = new THREE.Group();
        
        // Compass base (circle)
        const compassGeometry = new THREE.CylinderGeometry(3, 3, 0.2, 32);
        const compassMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d3748, 
            metalness: 0.7,
            roughness: 0.3
        });
        const compassBase = new THREE.Mesh(compassGeometry, compassMaterial);
        this.compassGroup.add(compassBase);

        // Create directional arrows
        const arrowGeometry = new THREE.ConeGeometry(0.4, 1.5, 8);
        
        // North arrow (red) - points to negative Z (back of warehouse)
        const northArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshStandardMaterial({ color: 0xff4444 }));
        northArrow.position.set(0, 0.6, -2);
        northArrow.rotation.x = Math.PI;
        this.compassGroup.add(northArrow);
        
        // South arrow (blue) - points to positive Z (lift area)
        const southArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshStandardMaterial({ color: 0x4444ff }));
        southArrow.position.set(0, 0.6, 2);
        this.compassGroup.add(southArrow);
        
        // East arrow (green) - points to positive X (right)
        const eastArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshStandardMaterial({ color: 0x44ff44 }));
        eastArrow.position.set(2, 0.6, 0);
        eastArrow.rotation.z = -Math.PI / 2;
        this.compassGroup.add(eastArrow);
        
        // West arrow (yellow) - points to negative X (left)
        const westArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshStandardMaterial({ color: 0xffff44 }));
        westArrow.position.set(-2, 0.6, 0);
        westArrow.rotation.z = Math.PI / 2;
        this.compassGroup.add(westArrow);

        // Add text labels
        this.addCompassLabels();
        
        // Position compass in corner of warehouse area
        this.compassGroup.position.set(20, 2, 20);
        this.compassGroup.scale.setScalar(0.8);
        
        this.scene.add(this.compassGroup);
    }

    addCompassLabels() {
        const labels = [
            { text: 'N', position: new THREE.Vector3(0, 1.2, -2.5), color: '#ff4444' },
            { text: 'S', position: new THREE.Vector3(0, 1.2, 2.5), color: '#4444ff' },
            { text: 'E', position: new THREE.Vector3(2.5, 1.2, 0), color: '#44ff44' },
            { text: 'W', position: new THREE.Vector3(-2.5, 1.2, 0), color: '#ffff44' }
        ];

        labels.forEach(({ text, position, color }) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const fontSize = 64;
            
            canvas.width = 80;
            canvas.height = 80;
            
            context.font = `bold ${fontSize}px Arial`;
            context.fillStyle = color;
            context.strokeStyle = '#000000';
            context.lineWidth = 3;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            context.strokeText(text, 40, 40);
            context.fillText(text, 40, 40);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMaterial);
            
            sprite.position.copy(position);
            sprite.scale.set(1.5, 1.5, 1.0);
            
            this.compassGroup.add(sprite);
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        
        // Update TWEEN animations if available
        if (typeof TWEEN !== 'undefined') {
            TWEEN.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    setupLighting() {
        // Optimized ambient light for better performance
        const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
        this.scene.add(ambientLight);

        // Main directional light with optimized shadow settings
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(30, 40, 30);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;  // Reduced from 4096
        mainLight.shadow.mapSize.height = 2048; // Reduced from 4096
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 100;
        mainLight.shadow.camera.left = -60;
        mainLight.shadow.camera.right = 60;
        mainLight.shadow.camera.top = 60;
        mainLight.shadow.camera.bottom = -60;
        mainLight.shadow.bias = -0.0001;
        this.scene.add(mainLight);

        // Simplified secondary light (no shadows for performance)
        const fillLight = new THREE.DirectionalLight(0xfff8dc, 0.5);
        fillLight.position.set(-25, 35, -25);
        fillLight.castShadow = false; // Disabled for performance
        this.scene.add(fillLight);

        // Reduced number of point lights
        const pointLight1 = new THREE.PointLight(0xffffff, 0.8, 30, 2);
        pointLight1.position.set(15, 20, 15);
        pointLight1.castShadow = false; // Disabled for performance
        this.scene.add(pointLight1);

        // Ground plane for shadows
        this.createGroundPlane();
    }

    createGroundPlane() {
        const groundGeometry = new THREE.PlaneGeometry(300, 300);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf5f5f0,  // Ανοιχτό κιτρινωπό (ivory/cream)
            metalness: 0.0,   // Καθόλου μεταλλικό
            roughness: 0.8,   // Τραχύ για βιομηχανικό look
            transparent: false,
            envMapIntensity: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1; // Λίγο κάτω από τη βάση
        ground.receiveShadow = true;
        
        // Add grid lines for industrial warehouse look
        const gridHelper = new THREE.GridHelper(300, 50, 0xdddddd, 0xeeeeee);
        gridHelper.position.y = -0.05;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        
        this.scene.add(ground);
        this.scene.add(gridHelper);
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
        const box = new THREE.Box3().setFromObject(this.warehouseGroup);
        const center = box.getCenter(new THREE.Vector3());
        this.warehouseGroup.position.x += (this.warehouseGroup.position.x - center.x);
        this.warehouseGroup.position.z += (this.warehouseGroup.position.z - center.z);
        
        // Create animated equipment after warehouse is built
        this.animationManager.createAnimatedEquipment(uiConfig);
        
        console.log('Warehouse built successfully');
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

    // Method to add/remove missing locations dynamically
    updateMissingLocations(newMissingLocations) {
        this.missingLocations = newMissingLocations;
    }

    // Method to add a single missing location
    addMissingLocation(aisle, level, module, depth, position) {
        this.missingLocations.push({ aisle, level, module, depth, position });
    }

    // Method to clear all missing locations
    clearMissingLocations() {
        this.missingLocations = [];
    }

    // Methods to manage location types dynamically
    getLocationType(aisle, level, module, depth, position) {
        // Check if location matches any buffer location definition
        const isBuffer = this.locationTypes.buffer_locations.some(buffer => {
            const aisleMatch = Array.isArray(buffer.aisle) ? 
                buffer.aisle.includes(aisle) : 
                (buffer.aisle === null || buffer.aisle === aisle);
            
            const levelMatch = Array.isArray(buffer.level) ? 
                buffer.level.includes(level) : 
                (buffer.level === null || buffer.level === level);
            
            const moduleMatch = Array.isArray(buffer.module) ? 
                buffer.module.includes(module) : 
                (buffer.module === null || buffer.module === module);
            
            const depthMatch = Array.isArray(buffer.depth) ? 
                buffer.depth.includes(depth) : 
                (buffer.depth === null || buffer.depth === depth);
            
            const positionMatch = Array.isArray(buffer.position) ? 
                buffer.position.includes(position) : 
                (buffer.position === null || buffer.position === position);
            
            return aisleMatch && levelMatch && moduleMatch && depthMatch && positionMatch;
        });
        
        return isBuffer ? 'Buffer' : this.locationTypes.default_type;
    }

    // Method to add a buffer location type
    addBufferLocation(aisle, level, module, depth, position) {
        this.locationTypes.buffer_locations.push({ 
            aisle, level, module, depth, position, type: 'Buffer' 
        });
    }

    // Method to clear all buffer locations
    clearBufferLocations() {
        this.locationTypes.buffer_locations = [];
    }

    // JSON Export/Import Methods for Warehouse Configurations
    exportWarehouseConfiguration(uiConfig, filename = 'warehouse_config.json') {
        const warehouseConfig = {
            metadata: {
                name: filename.replace('.json', ''),
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Exported warehouse configuration'
            },
            warehouse_parameters: {
                aisles: uiConfig.aisles,
                levels_per_aisle: [...uiConfig.levels_per_aisle],
                modules_per_aisle: uiConfig.modules_per_aisle,
                locations_per_module: uiConfig.locations_per_module,
                storage_depth: uiConfig.storage_depth,
                picking_stations: uiConfig.picking_stations
            },
            missing_locations: [...this.missingLocations],
            location_types: {
                buffer_locations: [...this.locationTypes.buffer_locations],
                default_type: this.locationTypes.default_type
            },
            calculated_metrics: {
                total_locations: this.calculateTotalLocations(uiConfig),
                total_modules: uiConfig.aisles * uiConfig.modules_per_aisle,
                total_levels: uiConfig.levels_per_aisle.reduce((sum, levels) => sum + levels, 0)
            }
        };

        // Create and download JSON file
        const jsonString = JSON.stringify(warehouseConfig, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);

        console.log("Configuration exported successfully");
        return warehouseConfig;
    }

    importWarehouseConfiguration(jsonFile, callback) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const warehouseConfig = JSON.parse(event.target.result);
                
                // Validate the configuration structure
                if (!this.validateWarehouseConfiguration(warehouseConfig)) {
                    throw new Error('Invalid warehouse configuration format');
                }

                // Apply the configuration
                const uiConfig = warehouseConfig.warehouse_parameters;
                this.missingLocations = warehouseConfig.missing_locations || [];
                this.locationTypes = warehouseConfig.location_types || {
                    buffer_locations: [],
                    default_type: 'Storage'
                };

                console.log("Configuration imported successfully");
                
                // Call the callback with the imported configuration
                if (callback) {
                    callback(uiConfig, warehouseConfig);
                }
                
            } catch (error) {
                console.error("❌ Error importing warehouse configuration:", error);
                alert(`Error importing configuration: ${error.message}`);
            }
        };
        
        reader.readAsText(jsonFile);
    }

    validateWarehouseConfiguration(config) {
        // Check required structure
        if (!config.warehouse_parameters) return false;
        
        const params = config.warehouse_parameters;
        
        // Validate required parameters
        const requiredParams = ['aisles', 'levels_per_aisle', 'modules_per_aisle', 'locations_per_module', 'storage_depth', 'picking_stations'];
        for (const param of requiredParams) {
            if (!(param in params)) {
                console.error(`Missing required parameter: ${param}`);
                return false;
            }
        }

        // Validate ranges
        if (params.aisles < 1 || params.aisles > 8) return false;
        if (params.modules_per_aisle < 3 || params.modules_per_aisle > 15) return false;
        if (params.locations_per_module < 2 || params.locations_per_module > 8) return false;
        if (params.storage_depth < 1 || params.storage_depth > 6) return false;
        if (params.picking_stations < 1 || params.picking_stations > 8) return false;
        
        // Validate levels_per_aisle array
        if (!Array.isArray(params.levels_per_aisle) || params.levels_per_aisle.length !== params.aisles) return false;
        
        for (const levels of params.levels_per_aisle) {
            if (levels < 2 || levels > 12) return false;
        }

        return true;
    }

    calculateTotalLocations(uiConfig) {
        let totalLocations = 0;
        
        // Helper function to check if a location is missing
        const isLocationMissing = (aisle, level, module, depth, position) => {
            return this.missingLocations.some(missing => {
                const aisleMatch = Array.isArray(missing.aisle) ? 
                    missing.aisle.includes(aisle) : 
                    (missing.aisle === null || missing.aisle === aisle);
                
                const levelMatch = Array.isArray(missing.level) ? 
                    missing.level.includes(level) : 
                    (missing.level === null || missing.level === level);
                
                const moduleMatch = missing.module === null || missing.module === module;
                const depthMatch = missing.depth === null || missing.depth === depth;
                const positionMatch = missing.position === null || missing.position === position;
                
                return aisleMatch && levelMatch && moduleMatch && depthMatch && positionMatch;
            });
        };
        
        // Count actual available locations (excluding missing ones)
        for (let a = 0; a < uiConfig.aisles; a++) {
            const levels = uiConfig.levels_per_aisle[a];
            
            for (let l = 0; l < levels; l++) {
                for (let m = 0; m < uiConfig.modules_per_aisle; m++) {
                    for (let d = 0; d < uiConfig.storage_depth; d++) {
                        for (let s = 0; s < uiConfig.locations_per_module; s++) {
                            // Count locations on both sides of the aisle (West and East)
                            for (let side = 0; side < 2; side++) {
                                // Check if this location is missing
                                if (!isLocationMissing(a, l, m, d, s)) {
                                    // Location exists, so count it
                                    totalLocations++;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return totalLocations;
    }
}
