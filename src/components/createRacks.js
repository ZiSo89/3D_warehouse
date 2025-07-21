import * as THREE from 'three';

export function createRacks(uiConfig, constants, missingLocations = [], locationTypes = null) {
    const racksGroup = new THREE.Group();

    // Helper function to check if a location should be missing
    const isLocationMissing = (aisle, level, module, depth, position) => {
        return missingLocations.some(missing => {
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

    // Helper function to get location type
    const getLocationType = (aisle, level, module, depth, position) => {
        if (!locationTypes) return 'Storage';
        
        // Check if location matches any buffer location definition
        const isBuffer = locationTypes.buffer_locations.some(buffer => {
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
        
        return isBuffer ? 'Buffer' : locationTypes.default_type;
    };

    const moduleLength = uiConfig.locations_per_module * constants.locationLength;
    const totalRackDepth = uiConfig.storage_depth * constants.locationDepth;
    const rackAndAisleWidth = (totalRackDepth * 2) + constants.aisleWidth;

    const darkGreyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1e3231, // Dark green-grey from palette
        metalness: 0.3,
        roughness: 0.7,
        envMapIntensity: 0.5
    });
    const lightGreyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x6e9075, // Medium green from palette
        metalness: 0.2,
        roughness: 0.6,
        envMapIntensity: 0.4
    });
    
    // Enhanced frame materials with better metallic appearance
    const steelFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0x1e3231, // Dark base color
        metalness: 0.8,
        roughness: 0.3,
        envMapIntensity: 1.0
    });
    
    const aluminumFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0xe5d1d0, // Light peachy color from palette
        metalness: 0.9,
        roughness: 0.1,
        envMapIntensity: 1.2
    });

    for (let a = 0; a < uiConfig.aisles; a++) {
        const levels = uiConfig.levels_per_aisle[a];

        // Create West and East rack lines
        for (let i = 0; i < 2; i++) {
            const rackLine = new THREE.Group();
            const isEast = i === 1;
            rackLine.position.x = a * rackAndAisleWidth + (isEast ? totalRackDepth + constants.aisleWidth : 0);

            for (let l = 0; l < levels; l++) {
                for (let m = 0; m < uiConfig.modules_per_aisle; m++) {
                    const moduleGroup = new THREE.Group();
                    moduleGroup.position.z = m * moduleLength;

                    // Enhanced module frame with better materials and structure
                    const frameMaterial = (m % 2 === 0) ? steelFrameMaterial : aluminumFrameMaterial;
                    
                    // Create more detailed frame structure
                    const frameThickness = 0.08;
                    const postThickness = 0.12;
                    
                    // Simplified frame structure for better performance
                    // Bottom frame only
                    const bottomFrameGeometry = new THREE.BoxGeometry(totalRackDepth, frameThickness, moduleLength);
                    const bottomFrame = new THREE.Mesh(bottomFrameGeometry, frameMaterial);
                    bottomFrame.position.set(
                        totalRackDepth / 2,
                        (l * constants.levelHeight),
                        moduleLength / 2
                    );
                    bottomFrame.castShadow = true;
                    bottomFrame.receiveShadow = true;
                    moduleGroup.add(bottomFrame);
                    
                    // Only corner posts (reduced number)
                    const postGeometry = new THREE.BoxGeometry(postThickness, constants.levelHeight, postThickness);
                    const positions = [
                        [0, 0, 0], [totalRackDepth, 0, moduleLength]
                    ]; // Only 2 posts instead of 4
                    
                    positions.forEach(pos => {
                        const post = new THREE.Mesh(postGeometry, frameMaterial);
                        post.position.set(
                            pos[0],
                            (l * constants.levelHeight) + (constants.levelHeight / 2),
                            pos[2]
                        );
                        post.castShadow = true;
                        post.receiveShadow = true;
                        moduleGroup.add(post);
                    });


                    // Simplified storage locations for better performance
                    for (let d = 0; d < uiConfig.storage_depth; d++) {
                        for (let s = 0; s < uiConfig.locations_per_module; s++) {
                            // Check if this location should be missing
                            if (isLocationMissing(a, l, m, d, s)) {
                                // Create a visual indicator for missing location (optional column/obstacle)
                                if (uiConfig.showMissingIndicators !== false) {
                                    const obstacleGeometry = new THREE.CylinderGeometry(0.2, 0.3, constants.levelHeight * levels, 8);
                                    const obstacleMaterial = new THREE.MeshStandardMaterial({
                                        color: 0x8b0000, // Dark red for obstacles
                                        metalness: 0.1,
                                        roughness: 0.9
                                    });
                                    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
                                    obstacle.position.set(
                                        (d * constants.locationDepth) + (constants.locationDepth / 2),
                                        (constants.levelHeight * levels) / 2,
                                        (s * constants.locationLength) + (constants.locationLength / 2)
                                    );
                                    obstacle.castShadow = true;
                                    obstacle.receiveShadow = true;
                                    moduleGroup.add(obstacle);
                                }
                                continue; // Skip creating the storage location
                            }

                            // Get location type to determine material
                            const locationType = getLocationType(a, l, m, d, s);
                            
                            // Create different materials based on location type
                            let locationMaterial;
                            if (locationType === 'Buffer') {
                                // Buffer locations - bright orange/yellow for easy identification
                                locationMaterial = new THREE.MeshStandardMaterial({
                                    color: 0xff8500, // Bright orange for buffer locations
                                    metalness: 0.4,
                                    roughness: 0.5,
                                    emissive: 0x331a00, // Slight orange glow
                                    emissiveIntensity: 0.1
                                });
                            } else {
                                // Regular storage locations - existing color scheme
                                locationMaterial = new THREE.MeshStandardMaterial({
                                    color: (d % 2 === 0) ? 0x6e9075 : 0xf1faee, // Green and cream from palette
                                    metalness: 0.3,
                                    roughness: 0.7
                                });
                            }
                            
                            const locationGeometry = new THREE.BoxGeometry(
                                constants.locationDepth * 0.8, 
                                constants.levelHeight * 0.8, 
                                constants.locationLength * 0.8
                            );
                            const locationBox = new THREE.Mesh(locationGeometry, locationMaterial);
                            locationBox.castShadow = true;
                            locationBox.receiveShadow = true;

                            // Store location metadata for future reference (like click interactions)
                            locationBox.userData = {
                                aisle: a,
                                level: l,
                                module: m,
                                depth: d,
                                position: s,
                                type: locationType,
                                id: `${a}-${l}-${m}-${d}-${s}`,
                                coordinates: {
                                    x: (d * constants.locationDepth) + (constants.locationDepth / 2),
                                    y: (l * constants.levelHeight) + (constants.levelHeight / 2),
                                    z: (s * constants.locationLength) + (constants.locationLength / 2)
                                }
                            };

                            locationBox.position.set(
                                (d * constants.locationDepth) + (constants.locationDepth / 2),
                                (l * constants.levelHeight) + (constants.levelHeight / 2),
                                (s * constants.locationLength) + (constants.locationLength / 2)
                            );
                            moduleGroup.add(locationBox);
                        }
                    }
                    rackLine.add(moduleGroup);
                }
            }
            racksGroup.add(rackLine);
        }
    }

    return racksGroup;
}
