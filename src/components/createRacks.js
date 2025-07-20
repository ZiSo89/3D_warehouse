import * as THREE from 'three';

export function createRacks(uiConfig, constants) {
    const racksGroup = new THREE.Group();

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
                            // Single optimized location box with palette colors
                            const locationMaterial = new THREE.MeshStandardMaterial({
                                color: (d % 2 === 0) ? 0x6e9075 : 0xf1faee, // Green and cream from palette
                                metalness: 0.3,
                                roughness: 0.7
                            });
                            
                            const locationGeometry = new THREE.BoxGeometry(
                                constants.locationDepth * 0.8, 
                                constants.levelHeight * 0.8, 
                                constants.locationLength * 0.8
                            );
                            const locationBox = new THREE.Mesh(locationGeometry, locationMaterial);
                            locationBox.castShadow = true;
                            locationBox.receiveShadow = true;

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
