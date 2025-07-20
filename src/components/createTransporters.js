import * as THREE from 'three';

export function createTransporters(uiConfig, constants) {
    const transportersGroup = new THREE.Group();

    const liftMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x93032e, // Deep red from palette
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0x1e0508, // Darker red emissive
        emissiveIntensity: 0.05,
        envMapIntensity: 1.2
    });
    
    const shuttleMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x6e9075, // Medium green from palette
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0x1a221c, // Darker green emissive
        emissiveIntensity: 0.03,
        envMapIntensity: 1.0
    });
    
    // Additional materials for details
    const carbonFiberMaterial = new THREE.MeshStandardMaterial({
        color: 0x1e3231, // Dark green-grey from palette
        metalness: 0.9,
        roughness: 0.1,
        envMapIntensity: 1.5
    });
    
    const plasticMaterial = new THREE.MeshStandardMaterial({
        color: 0xe5d1d0, // Light peachy from palette
        metalness: 0.1,
        roughness: 0.9
    });

    const totalRackDepth = uiConfig.storage_depth * constants.locationDepth;
    const rackAndAisleWidth = (totalRackDepth * 2) + constants.aisleWidth;

    for (let a = 0; a < uiConfig.aisles; a++) {
        // Simplified Lift
        const liftGeometry = new THREE.BoxGeometry(0.6, 1.0, 0.6);
        const lift = new THREE.Mesh(liftGeometry, liftMaterial);
        lift.position.set(
            a * rackAndAisleWidth + totalRackDepth + (constants.aisleWidth / 2),
            0.5,
            -totalRackDepth / 2
        );
        lift.castShadow = true;
        lift.receiveShadow = true;
        transportersGroup.add(lift);

        // Simplified Shuttle
        const shuttleGeometry = new THREE.BoxGeometry(0.4, 0.3, 1.0);
        const shuttle = new THREE.Mesh(shuttleGeometry, shuttleMaterial);
        shuttle.position.set(
            lift.position.x,
            constants.levelHeight / 2,
            (uiConfig.modules_per_aisle * uiConfig.locations_per_module * constants.locationLength) / 2
        );
        shuttle.castShadow = true;
        shuttle.receiveShadow = true;
        transportersGroup.add(shuttle);
    }

    return transportersGroup;
}
