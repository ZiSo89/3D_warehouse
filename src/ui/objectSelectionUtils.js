// Helper functions for object selection and info display
import * as THREE from 'three';

export function getSelectableObjects(sceneManager) {
    const objectsToCheck = [];
    if (sceneManager.warehouseGroup) {
        objectsToCheck.push(...sceneManager.warehouseGroup.children);
    }
    if (sceneManager.animationManager) {
        if (sceneManager.animationManager.shuttleGroup) {
            objectsToCheck.push(...sceneManager.animationManager.shuttleGroup.children);
        }
        if (sceneManager.animationManager.liftGroup) {
            objectsToCheck.push(...sceneManager.animationManager.liftGroup.children);
        }
    }
    return objectsToCheck;
}

export function filterSelectedObject(intersects) {
    // 1. Prioritize shuttles/lifts
    for (let intersection of intersects) {
        const obj = intersection.object;
        if (obj.userData && (obj.userData.type === 'lift' || obj.userData.type === 'shuttle')) {
            return obj;
        }
    }
    // 2. If not found, look for storage locations and other components
    for (let intersection of intersects) {
        const obj = intersection.object;
        if (
            (obj.userData && (obj.userData.type === 'conveyor' || obj.userData.type === 'picking_station')) ||
            (obj.name && (obj.name.startsWith('SOURCE_') || obj.name.startsWith('TARGET_') || obj.name.startsWith('PREZONE_')))
        ) {
            continue;
        }
        if (obj.material && obj.material.color) {
            const colorHex = obj.material.color.getHex();
            if (
                colorHex === 0x2196F3 ||
                colorHex === 0xFF9800 ||
                colorHex === 0x666666 ||
                colorHex === 0x2c2c2c || colorHex === 0x404040 || (colorHex >= 0x1a1a1a && colorHex <= 0x404040)
            ) {
                continue;
            }
            if (
                colorHex === 0x4CAF50 ||
                colorHex === 0x8b4513 || (colorHex >= 0x800000 && colorHex <= 0x8b7355)
            ) {
                continue;
            }
        }
        if (obj.geometry) {
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            if (size.x <= 0.15 || size.y <= 0.15 || size.z <= 0.15) {
                continue;
            }
        }
        return obj;
    }
    // 3. Fallback: select the first intersected object
    if (intersects.length > 0) {
        return intersects[0].object;
    }
    return null;
}

export function showObjectInfo(object) {
    const infoPanel = document.getElementById('object-info');
    const detailsDiv = document.getElementById('object-details');
    let objectType = 'Unknown Component';
    let objectDetails = 'Component information not available';
    // ...existing code for showObjectInfo (copy full implementation if needed)...
    // This is a stub for modularization; fill in as needed.
    infoPanel.style.display = 'block';
    detailsDiv.textContent = objectType + ': ' + objectDetails;
}
