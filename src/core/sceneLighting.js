import * as THREE from 'three';
import { isMobile } from './deviceUtils.js';

/**
 * Sets up ambient and directional lighting for the scene.
 * @param {THREE.Scene} scene - The Three.js scene to add lights to.
 */
export function setupLighting(scene) {
    // Simple ambient light since we're using MeshBasicMaterial
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
}

/**
 * Creates and adds a ground plane and grid helper to the scene.
 * Uses optimized settings for mobile devices to improve performance.
 * @param {THREE.Scene} scene - The Three.js scene to add the ground to.
 */
export function createGroundPlane(scene) {
    const mobile = isMobile();
    
    // Use smaller ground plane on mobile for better performance
    const groundSize = mobile ? 200 : 300;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    
    let groundMaterial;
    if (mobile) {
        // Use MeshBasicMaterial for better mobile performance
        groundMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xf5f5f0,  // Light ivory/cream
            transparent: false
        });
    } else {
        // Use MeshStandardMaterial for desktop
        groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf5f5f0,  // Light ivory/cream
            metalness: 0.0,
            roughness: 0.8,
            transparent: false,
            envMapIntensity: 0.1
        });
    }
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = !mobile; // Disable shadows on mobile
    ground.userData.isMobileOptimized = mobile;

    scene.add(ground);

    // Only add grid helper on desktop - it's expensive on mobile
    if (!mobile) {
        const gridHelper = new THREE.GridHelper(groundSize, 50, 0xdddddd, 0xeeeeee);
        gridHelper.position.y = -0.05;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);
    }
}
