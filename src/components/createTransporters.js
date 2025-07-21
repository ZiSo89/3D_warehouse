import * as THREE from 'three';
import { constants } from '../core/constants.js';

/**
 * Creates a 3D model for an OSR shuttle.
 * The shuttle consists of a main body and two telescopic arms.
 * @returns {THREE.Group} A group containing all parts of the shuttle.
 */
export function createShuttle() {
    const shuttleGroup = new THREE.Group();

    // Shuttle Body - main red body
    const bodyGeometry = new THREE.BoxGeometry(0.6, 0.2, 1.0);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xdc143c, // Crimson Red
        metalness: 0.7,
        roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.1;
    shuttleGroup.add(body);

    // Telescopic Arms (Flaps) - small gray arms for container handling
    const armGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.1);
    const armMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x696969, // Dim Gray
        metalness: 0.8,
        roughness: 0.2
    });
    
    const arm1 = new THREE.Mesh(armGeometry, armMaterial);
    arm1.position.set(0.25, 0.1, 0.45); // Positioned at the front-right
    arm1.name = 'telescopicArm1';
    shuttleGroup.add(arm1);

    const arm2 = new THREE.Mesh(armGeometry, armMaterial);
    arm2.position.set(-0.25, 0.1, 0.45); // Positioned at the front-left
    arm2.name = 'telescopicArm2';
    shuttleGroup.add(arm2);

    // Add userData for identification and status tracking
    shuttleGroup.userData = {
        type: 'shuttle',
        status: 'Idle',
        aisleId: null,
        level: null
    };

    return shuttleGroup;
}

/**
 * Creates a 3D model for a container lift.
 * @returns {THREE.Mesh} The lift mesh.
 */
export function createLift() {
    const liftGeometry = new THREE.BoxGeometry(constants.locationLength * 1.1, 0.8, constants.locationDepth * 1.1);
    const liftMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffd700, // Gold
        metalness: 0.8,
        roughness: 0.3
    });
    const lift = new THREE.Mesh(liftGeometry, liftMaterial);

    // Add userData for identification and status tracking
    lift.userData = {
        type: 'lift',
        status: 'Idle',
        aisleId: null
    };

    return lift;
}

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
        // Old lifts and shuttles removed - now using animated equipment from AnimationManager
        // This loop can be removed entirely if no other transporters are needed
    }

    return transportersGroup;
}
