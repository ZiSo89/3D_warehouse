

import * as THREE from 'three';
import { getLocationTypeColor } from '../ui/theme.js';

export function createRacks(uiConfig, constants, missingLocations = [], locationTypes = null) {
    const racksGroup = new THREE.Group();

    // Add ambient and directional lights for better depth and shadow
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

    // Helper function to check if a location should be missing
    const isLocationMissing = (aisle, level, module, depth, position) => {
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
    };

    // Helper function to get location type
    const getLocationType = (aisle, level, module, depth, position) => {
        if (!locationTypes || !Array.isArray(locationTypes)) return 'Storage';

        // Check if location matches any location type definition
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

            return aisleMatch && levelMatch && moduleMatch && depthMatch && positionMatch;
        });

        return typeMatch ? typeMatch.type : 'Storage';
    };

    const moduleLength = uiConfig.locations_per_module * constants.locationLength;
    const totalRackDepth = uiConfig.storage_depth * constants.locationDepth;
    const rackAndAisleWidth = (totalRackDepth * 2) + constants.aisleWidth;

    // Use MeshPhysicalMaterial for more realistic metal appearance
    const darkGreyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x1e3231, // Dark green-grey from palette
        metalness: 0.7,
        roughness: 0.5,
        clearcoat: 0.4,
        clearcoatRoughness: 0.25,
        reflectivity: 0.7,
        envMapIntensity: 0.7
    });
    const lightGreyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x6e9075, // Medium green from palette
        metalness: 0.5,
        roughness: 0.4,
        clearcoat: 0.3,
        clearcoatRoughness: 0.3,
        reflectivity: 0.5,
        envMapIntensity: 0.5
    });

    // Enhanced frame materials with better metallic appearance
    const steelFrameMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x1e3231, // Dark base color
        metalness: 1.0,
        roughness: 0.25,
        clearcoat: 0.6,
        clearcoatRoughness: 0.18,
        reflectivity: 0.8,
        envMapIntensity: 1.0
    });

    const aluminumFrameMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xe5d1d0, // Light peachy color from palette
        metalness: 1.0,
        roughness: 0.08,
        clearcoat: 0.7,
        clearcoatRoughness: 0.12,
        reflectivity: 0.95,
        envMapIntensity: 1.2
    });

    for (let a = 0; a < uiConfig.aisles; a++) {
        const levels = uiConfig.levels_per_aisle[a];

        // Create West and East rack lines
        for (let i = 0; i < 2; i++) {
            const rackLine = new THREE.Group();
            rackLine.userData.isRackLine = true; // Tag for LOD visibility
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
                                // Create a transparent/ghost box for missing location
                                if (uiConfig.showMissingIndicators !== false) {
                                    const missingLocationGeometry = new THREE.BoxGeometry(
                                        constants.locationDepth * 0.8,
                                        constants.levelHeight * 0.8,
                                        constants.locationLength * 0.8
                                    );
                                    const missingLocationMaterial = new THREE.MeshStandardMaterial({
                                        color: 0xff4444, // Light red color
                                        transparent: true,
                                        opacity: 0.15, // Very low opacity (15%)
                                        metalness: 0.2,
                                        roughness: 0.8,
                                        side: THREE.DoubleSide
                                    });
                                    const missingBox = new THREE.Mesh(missingLocationGeometry, missingLocationMaterial);
                                    missingBox.position.set(
                                        (d * constants.locationDepth) + (constants.locationDepth / 2),
                                        (l * constants.levelHeight) + (constants.levelHeight / 2),
                                        (s * constants.locationLength) + (constants.locationLength / 2)
                                    );
                                    missingBox.castShadow = true;
                                    missingBox.receiveShadow = true;
                                    // Add metadata for interaction
                                    missingBox.userData = {
                                        type: 'Storage Location',
                                        aisle: a,
                                        level: l, 
                                        module: m,
                                        depth: d,
                                        position: s,
                                        location_type: 'Missing',
                                        status: 'Unavailable'
                                    };
                                    moduleGroup.add(missingBox);
                                }
                                continue; // Skip creating the storage location
                            }

                            // Get location type to determine material
                            const locationType = getLocationType(a, l, m, d, s);

                            // Use theme-based color logic from theme.js
                            const { color, emissive, emissiveIntensity } = getLocationTypeColor(locationType, d);
                            let locationMaterial = new THREE.MeshPhysicalMaterial({
                                color: color,
                                metalness: 0.5,
                                roughness: 0.45,
                                clearcoat: 0.3,
                                clearcoatRoughness: 0.18,
                                reflectivity: 0.5,
                                transparent: false,
                                emissive: emissive,
                                emissiveIntensity: emissiveIntensity
                            });

                            const locationGeometry = new THREE.BoxGeometry(
                                constants.locationDepth * 0.8, 
                                constants.levelHeight * 0.8, 
                                constants.locationLength * 0.8
                            );
                            const locationBox = new THREE.Mesh(locationGeometry, locationMaterial);
                            locationBox.castShadow = true;
                            locationBox.receiveShadow = true;


                            // For right (East, i === 1), depth increases left to right (depth = d + 1)
                            // For left (West, i === 0), depth increases from right to left (depth = storage_depth - d)

                            let displayDepth, dIndex;
                            if (isEast) {
                                dIndex = d;
                                displayDepth = d;
                            } else {
                                dIndex = uiConfig.storage_depth - 1 - d;
                                displayDepth = d;
                            }

                            // Store location metadata for future reference (like click interactions)
                            locationBox.userData = {
                                aisle: a,
                                level: l,
                                module: m,
                                depth: displayDepth,
                                position: s,
                                type: locationType,
                                id: `${a}-${l}-${m}-${displayDepth}-${s}`,
                                coordinates: {
                                    x: (dIndex * constants.locationDepth) + (constants.locationDepth / 2),
                                    y: (l * constants.levelHeight) + (constants.levelHeight / 2),
                                    z: (s * constants.locationLength) + (constants.locationLength / 2)
                                }
                            };

                            locationBox.position.set(
                                (dIndex * constants.locationDepth) + (constants.locationDepth / 2),
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
