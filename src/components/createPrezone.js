import * as THREE from 'three';

export function createPrezone(uiConfig, constants) {
    const prezoneGroup = new THREE.Group();
    prezoneGroup.name = 'PreZone';
    
    // Enhanced dimensions for better spacing
    const stationWidth = 2.5;
    const stationDepth = 1.5;
    const stationHeight = 1.2;
    const conveyorHeight = 0.4;
    const conveyorWidth = 0.6; // Reduced width to prevent overlaps
    const stationSpacing = 1.5; // Increased spacing between stations
    
    // Collision detection arrays
    const occupiedPositions = [];
    
    // Helper function to check for collisions
    const checkCollision = (position, size) => {
        const newBounds = {
            minX: position.x - size.x / 2,
            maxX: position.x + size.x / 2,
            minZ: position.z - size.z / 2,
            maxZ: position.z + size.z / 2
        };
        
        return occupiedPositions.some(existing => {
            return !(newBounds.maxX < existing.minX || 
                    newBounds.minX > existing.maxX || 
                    newBounds.maxZ < existing.minZ || 
                    newBounds.minZ > existing.maxZ);
        });
    };
    
    // Helper function to register occupied space
    const registerPosition = (position, size) => {
        occupiedPositions.push({
            minX: position.x - size.x / 2,
            maxX: position.x + size.x / 2,
            minZ: position.z - size.z / 2,
            maxZ: position.z + size.z / 2
        });
    };

    const stationMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x6e9075, // Medium green from palette
        metalness: 0.2,
        roughness: 0.8,
        envMapIntensity: 0.4
    });
    
    const conveyorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1e3231, // Dark green-grey from palette
        metalness: 0.7,
        roughness: 0.3,
        envMapIntensity: 0.8
    });
    
    // Enhanced conveyor belt material
    const beltMaterial = new THREE.MeshStandardMaterial({
        color: 0x93032e, // Deep red from palette
        metalness: 0.1,
        roughness: 0.9
    });
    
    // Conveyor frame material
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0xe5d1d0, // Light peachy from palette
        metalness: 0.6,
        roughness: 0.4
    });

    const totalPrezoneWidth = uiConfig.picking_stations * (stationWidth + stationSpacing);
    const totalRackDepth = uiConfig.storage_depth * constants.locationDepth;
    const rackAndAisleWidth = (totalRackDepth * 2) + constants.aisleWidth;

    // Create picking stations with collision detection
    for (let i = 0; i < uiConfig.picking_stations; i++) {
        const stationGroup = new THREE.Group();
        stationGroup.name = `picking_station_${i}`;

        // Calculate station position with proper spacing
        const stationX = i * (stationWidth + stationSpacing) - totalPrezoneWidth / 2 + stationWidth / 2;
        const stationPosition = new THREE.Vector3(stationX, 0, 0);
        const stationSize = new THREE.Vector3(stationWidth, stationHeight, stationDepth);

        // Check for collision before placing station
        if (!checkCollision(stationPosition, stationSize)) {
            // Picking station table
            const deskGeometry = new THREE.BoxGeometry(stationWidth, stationHeight, stationDepth);
            const desk = new THREE.Mesh(deskGeometry, stationMaterial);
            desk.position.y = stationHeight / 2;
            desk.castShadow = true;
            desk.receiveShadow = true;
            stationGroup.add(desk);

            // Register station position
            registerPosition(stationPosition, stationSize);

            // Front conveyor (towards operator)
            const frontConveyorPos = new THREE.Vector3(
                stationX, 
                conveyorHeight / 2, 
                -(stationDepth / 2 + conveyorWidth / 2 + 0.3)
            );
            const conveyorSize = new THREE.Vector3(stationWidth * 0.8, conveyorHeight, conveyorWidth);
            
            if (!checkCollision(frontConveyorPos, conveyorSize)) {
                const conveyorGeometry = new THREE.BoxGeometry(stationWidth * 0.8, conveyorHeight, conveyorWidth);
                const conveyor = new THREE.Mesh(conveyorGeometry, conveyorMaterial);
                conveyor.position.copy(frontConveyorPos);
                conveyor.castShadow = true;
                conveyor.receiveShadow = true;
                stationGroup.add(conveyor);
                registerPosition(frontConveyorPos, conveyorSize);
            }

            // Back conveyor (towards OSR)
            const backConveyorPos = new THREE.Vector3(
                stationX, 
                conveyorHeight / 2, 
                (stationDepth / 2 + conveyorWidth / 2 + 0.3)
            );
            
            if (!checkCollision(backConveyorPos, conveyorSize)) {
                const backConveyorGeometry = new THREE.BoxGeometry(stationWidth * 0.8, conveyorHeight, conveyorWidth);
                const backConveyor = new THREE.Mesh(backConveyorGeometry, conveyorMaterial);
                backConveyor.position.copy(backConveyorPos);
                backConveyor.castShadow = true;
                backConveyor.receiveShadow = true;
                stationGroup.add(backConveyor);
                registerPosition(backConveyorPos, conveyorSize);
            }

            stationGroup.position.set(stationX, 0, 0);
            prezoneGroup.add(stationGroup);
        }
    }

    // Add cross-conveyor connecting all picking stations (with collision detection)
    const crossConveyorLength = totalPrezoneWidth + 2;
    const crossConveyorPos = new THREE.Vector3(0, conveyorHeight / 2, 3.5); // Moved further back
    const crossConveyorSize = new THREE.Vector3(crossConveyorLength, conveyorHeight, conveyorWidth);
    
    if (!checkCollision(crossConveyorPos, crossConveyorSize)) {
        const crossConveyorGeometry = new THREE.BoxGeometry(crossConveyorLength, conveyorHeight, conveyorWidth);
        const crossConveyor = new THREE.Mesh(crossConveyorGeometry, conveyorMaterial);
        crossConveyor.position.copy(crossConveyorPos);
        crossConveyor.castShadow = true;
        crossConveyor.receiveShadow = true;
        prezoneGroup.add(crossConveyor);
        registerPosition(crossConveyorPos, crossConveyorSize);
    }

    // Create main conveyors with better spacing and collision detection
    const conveyorLength = totalRackDepth + 6;
    
    for (let a = 0; a < uiConfig.aisles; a++) {
        const aisleBaseX = (a - (uiConfig.aisles - 1) / 2) * rackAndAisleWidth;
        
        // SOURCE conveyor line (wider separation to prevent overlaps)
        const sourceX = aisleBaseX - 1.0; // More separation
        const sourcePos = new THREE.Vector3(sourceX, conveyorHeight / 2, conveyorLength / 2 + 2);
        const sourceSize = new THREE.Vector3(conveyorWidth, conveyorHeight, conveyorLength);
        
        if (!checkCollision(sourcePos, sourceSize)) {
            const sourceConveyorGeometry = new THREE.BoxGeometry(conveyorWidth, conveyorHeight, conveyorLength);
            const sourceConveyor = new THREE.Mesh(sourceConveyorGeometry, conveyorMaterial);
            sourceConveyor.position.copy(sourcePos);
            sourceConveyor.userData = {
                type: 'conveyor',
                lineType: 'source',
                aisleId: a,
                controlledBy: 'steuer'
            };
            sourceConveyor.castShadow = true;
            sourceConveyor.receiveShadow = true;
            prezoneGroup.add(sourceConveyor);
            registerPosition(sourcePos, sourceSize);
        }
        
        // TARGET conveyor line
        const targetX = aisleBaseX + 1.0; // More separation
        const targetPos = new THREE.Vector3(targetX, conveyorHeight / 2, conveyorLength / 2 + 2);
        
        if (!checkCollision(targetPos, sourceSize)) {
            const targetConveyorGeometry = new THREE.BoxGeometry(conveyorWidth, conveyorHeight, conveyorLength);
            const targetConveyor = new THREE.Mesh(targetConveyorGeometry, beltMaterial);
            targetConveyor.position.copy(targetPos);
            targetConveyor.userData = {
                type: 'conveyor',
                lineType: 'target',
                aisleId: a,
                controlledBy: 'steuer'
            };
            targetConveyor.castShadow = true;
            targetConveyor.receiveShadow = true;
            prezoneGroup.add(targetConveyor);
            registerPosition(targetPos, sourceSize);
        }
    }

    return prezoneGroup;
}
