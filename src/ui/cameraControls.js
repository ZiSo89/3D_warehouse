// Camera controls and preset logic extracted from InteractionManager
import * as THREE from 'three';
import { getCameraViewConfig } from './uiUtils.js';

export function bindCameraEvents(setCameraPreset) {
    const cameraButtons = document.querySelectorAll('.camera-btn');
    cameraButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const presetName = e.target.getAttribute('data-preset');
            setCameraPreset(presetName);
        });
    });
}

export function setCameraPreset(sceneManager, uiManager, presetName) {
    const cfg = uiManager.getConfig ? uiManager.getConfig() : uiManager.uiConfig;
    const { position, target } = getCameraViewConfig(presetName, cfg);
    animateCamera(sceneManager, position, target);
}

export function animateCamera(sceneManager, position, target, duration = 1000) {
    const startPosition = sceneManager.camera.position.clone();
    const startTarget = sceneManager.controls.target.clone();
    const targetPosition = new THREE.Vector3(position.x, position.y, position.z);
    const targetLookAt = new THREE.Vector3(target.x, target.y, target.z);
    let startTime = null;
    const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        sceneManager.camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
        sceneManager.controls.target.lerpVectors(startTarget, targetLookAt, easeProgress);
        sceneManager.controls.update();
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    requestAnimationFrame(animate);
}
