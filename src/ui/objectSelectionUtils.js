// Helper functions for object selection and info display
import * as THREE from 'three';

export function getSelectableObjects(sceneManager) {
    const objectsToCheck = [];
    
    // Handle regular meshes and groups
    if (sceneManager.warehouseGroup) {
        sceneManager.warehouseGroup.traverse((child) => {
            // Include both regular meshes and instanced meshes
            if (child.isMesh || child.isInstancedMesh) {
                objectsToCheck.push(child);
            }
        });
    }
    
    // Handle animated objects
    if (sceneManager.animationManager) {
        if (sceneManager.animationManager.shuttleGroup) {
            sceneManager.animationManager.shuttleGroup.traverse((child) => {
                if (child.isMesh || child.isInstancedMesh) {
                    objectsToCheck.push(child);
                }
            });
        }
        if (sceneManager.animationManager.liftGroup) {
            sceneManager.animationManager.liftGroup.traverse((child) => {
                if (child.isMesh || child.isInstancedMesh) {
                    objectsToCheck.push(child);
                }
            });
        }
    }
    
    return objectsToCheck;
}

export function filterSelectedObject(intersects) {
    // Handle instanced meshes specially
    for (let intersection of intersects) {
        const obj = intersection.object;
        
        // For instanced meshes, we need to check the instanceId
        if (obj.isInstancedMesh) {
            // Get the specific location data for this instance
            const instanceData = obj.userData.locations && obj.userData.locations[intersection.instanceId];
            
            // Create a virtual object representing this specific instance
            const instanceObject = {
                ...obj,
                userData: {
                    ...obj.userData,
                    ...instanceData, // Include the specific location data
                    instanceId: intersection.instanceId,
                    isInstancedMeshInstance: true,
                    originalMesh: obj
                },
                // Add position information for this specific instance
                instancePosition: intersection.point,
                instanceId: intersection.instanceId
            };
            
            // Check if this instance should be selectable
            if (isSelectableInstance(instanceObject)) {
                return instanceObject;
            }
            continue;
        }
        
        // 1. Prioritize shuttles/lifts (regular meshes)
        if (obj.userData && (obj.userData.type === 'lift' || obj.userData.type === 'shuttle')) {
            return obj;
        }
    }
    
    // 2. If not found, look for storage locations and other components
    for (let intersection of intersects) {
        const obj = intersection.object;
        
        // Skip instanced meshes in this pass (already handled above)
        if (obj.isInstancedMesh) {
            continue;
        }
        
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

/**
 * Check if an instanced mesh instance should be selectable
 * @param {Object} instanceObject - The virtual instance object
 * @returns {boolean} - Whether this instance is selectable
 */
function isSelectableInstance(instanceObject) {
    // Safety check: ensure instanceObject and originalMesh exist
    if (!instanceObject || !instanceObject.userData || !instanceObject.userData.originalMesh) {
        return false;
    }
    
    const obj = instanceObject.userData.originalMesh;
    
    // Safety check: ensure obj exists
    if (!obj) {
        return false;
    }
    
    // Allow selection of rack locations and warehouse components
    if (obj.userData && obj.userData.type) {
        const type = obj.userData.type;
        return ['Storage', 'Buffer', 'Pick', 'Replenishment', 'rack_frame', 'rack_location'].includes(type);
    }
    
    // Allow selection based on mesh name patterns
    if (obj.name) {
        return obj.name.includes('rack') || obj.name.includes('location') || obj.name.includes('frame');
    }
    
    // Default to selectable for warehouse components
    return true;
}

export function showObjectInfo(object) {
    // Since the InteractionManager already displays detailed object information 
    // in the "Informations" section, we'll hide the duplicate "Selected Object" 
    // section to avoid showing the same information twice
    
    const infoPanel = document.getElementById('object-info');
    
    // Hide the entire "Selected Object" section to prevent duplication
    if (infoPanel) {
        infoPanel.style.display = 'none';
    }
    
    // Store selection data for debugging if needed
    if (object.userData && object.userData.isInstancedMeshInstance) {
        // Instance selection data available in object.userData
    } else {
        // Regular object selection data available in object.userData
    }
}
