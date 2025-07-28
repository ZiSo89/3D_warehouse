import * as THREE from 'three';

/**
 * Sets up ambient and directional lighting for the scene.
 * @param {THREE.Scene} scene - The Three.js scene to add lights to.
 */
export function setupLighting(scene) {
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    // Directional light for main illumination (no shadows for performance)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(30, 40, 30);
    mainLight.castShadow = false;
    scene.add(mainLight);
}

/**
 * Creates and adds a ground plane and grid helper to the scene.
 * @param {THREE.Scene} scene - The Three.js scene to add the ground to.
 */
export function createGroundPlane(scene) {
    const groundGeometry = new THREE.PlaneGeometry(300, 300);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xf5f5f0,  // Light ivory/cream
        metalness: 0.0,
        roughness: 0.8,
        transparent: false,
        envMapIntensity: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;

    // Grid helper for industrial look
    const gridHelper = new THREE.GridHelper(300, 50, 0xdddddd, 0xeeeeee);
    gridHelper.position.y = -0.05;
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;

    scene.add(ground);
    scene.add(gridHelper);
}
