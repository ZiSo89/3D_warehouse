import * as THREE from 'three';

export function createPrezone(uiConfig, constants) {
    const prezoneGroup = new THREE.Group();
    prezoneGroup.name = 'PreZone'; // Set the name for the group
    const stationWidth = 2.5;
    const stationDepth = 1.5;
    const stationHeight = 1.2;
    const conveyorHeight = 0.4;
    const conveyorWidth = 0.8;

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

    const totalPrezoneWidth = uiConfig.picking_stations * (stationWidth + 1); // Add spacing
    const totalRackDepth = uiConfig.storage_depth * constants.locationDepth;
    const rackAndAisleWidth = (totalRackDepth * 2) + constants.aisleWidth;

    for (let i = 0; i < uiConfig.picking_stations; i++) {
        const stationGroup = new THREE.Group();
        stationGroup.name = `picking_station_${i}`; // Set the name for each station

        // Picking station table
        const deskGeometry = new THREE.BoxGeometry(stationWidth, stationHeight, stationDepth);
        const desk = new THREE.Mesh(deskGeometry, stationMaterial);
        desk.position.y = stationHeight / 2;
        desk.castShadow = true;
        desk.receiveShadow = true;
        stationGroup.add(desk);

        // Simplified conveyor belt section in front of the station
        const conveyorGeometry = new THREE.BoxGeometry(stationWidth, conveyorHeight, conveyorWidth);
        const conveyor = new THREE.Mesh(conveyorGeometry, conveyorMaterial);
        conveyor.position.y = conveyorHeight / 2;
        conveyor.position.z = -(stationDepth / 2 + conveyorWidth / 2 + 0.1);
        conveyor.castShadow = true;
        conveyor.receiveShadow = true;
        stationGroup.add(conveyor);

        // Simplified conveyor belt section behind the station (connecting to OSR side)
        const backConveyorGeometry = new THREE.BoxGeometry(stationWidth, conveyorHeight, conveyorWidth);
        const backConveyor = new THREE.Mesh(backConveyorGeometry, conveyorMaterial);
        backConveyor.position.y = conveyorHeight / 2;
        backConveyor.position.z = (stationDepth / 2 + conveyorWidth / 2 + 0.1);
        backConveyor.castShadow = true;
        backConveyor.receiveShadow = true;
        stationGroup.add(backConveyor);
        
        stationGroup.position.x = i * (stationWidth + 1) - totalPrezoneWidth / 2 + stationWidth / 2;
        prezoneGroup.add(stationGroup);
    }

    // Add cross-conveyor connecting all picking stations (on OSR side)
    const crossConveyorLength = totalPrezoneWidth + 2;
    const crossConveyorGeometry = new THREE.BoxGeometry(crossConveyorLength, conveyorHeight, conveyorWidth);
    const crossConveyor = new THREE.Mesh(crossConveyorGeometry, conveyorMaterial);
    crossConveyor.position.set(
        0, // Center between all stations
        conveyorHeight / 2,
        2 // Position behind all stations (OSR side)
    );
    crossConveyor.castShadow = true;
    crossConveyor.receiveShadow = true;
    prezoneGroup.add(crossConveyor);

    // Add main conveyors connecting picking stations to lifts (towards OSR)
    const conveyorLength = totalRackDepth + 5; // Extended length to reach beyond lifts
    
    // Create SOURCE and TARGET conveyor lines for each aisle (steuer-controlled)
    for (let a = 0; a < uiConfig.aisles; a++) {
        const aisleX = a * rackAndAisleWidth + totalRackDepth + (constants.aisleWidth / 2);
        
        // SOURCE conveyor line (containers coming FROM OSR to picking stations)
        const sourceConveyorGeometry = new THREE.BoxGeometry(conveyorWidth, conveyorHeight, conveyorLength);
        const sourceConveyor = new THREE.Mesh(sourceConveyorGeometry, conveyorMaterial);
        sourceConveyor.position.set(
            aisleX - 0.5, // Offset left for source line
            conveyorHeight / 2,
            conveyorLength / 2 + 1
        );
        sourceConveyor.userData = {
            type: 'conveyor',
            lineType: 'source',
            aisleId: a,
            controlledBy: 'steuer'
        };
        sourceConveyor.castShadow = true;
        sourceConveyor.receiveShadow = true;
        prezoneGroup.add(sourceConveyor);
        
        // TARGET conveyor line (containers going TO OSR from picking stations)
        const targetConveyorGeometry = new THREE.BoxGeometry(conveyorWidth, conveyorHeight, conveyorLength);
        const targetConveyor = new THREE.Mesh(targetConveyorGeometry, beltMaterial); // Different color
        targetConveyor.position.set(
            aisleX + 0.5, // Offset right for target line
            conveyorHeight / 2,
            conveyorLength / 2 + 1
        );
        targetConveyor.userData = {
            type: 'conveyor',
            lineType: 'target',
            aisleId: a,
            controlledBy: 'steuer'
        };
        targetConveyor.castShadow = true;
        targetConveyor.receiveShadow = true;
        prezoneGroup.add(targetConveyor);
        
        // Add connecting conveyors between picking stations and main conveyors
        if (a < uiConfig.picking_stations) {
            const stationX = a * (stationWidth + 1) - totalPrezoneWidth / 2 + stationWidth / 2;
            const connectionLength = Math.abs(aisleX - stationX);
            if (connectionLength > 0.5) { // Only create if there's significant distance
                // Connection to source line
                const sourceConnectionGeometry = new THREE.BoxGeometry(connectionLength, conveyorHeight, conveyorWidth);
                const sourceConnection = new THREE.Mesh(sourceConnectionGeometry, conveyorMaterial);
                sourceConnection.position.set(
                    (aisleX - 0.5 + stationX) / 2,
                    conveyorHeight / 2,
                    1.0 // Position closer to stations for source
                );
                sourceConnection.userData = { type: 'conveyor', lineType: 'source_connection' };
                prezoneGroup.add(sourceConnection);
                
                // Connection to target line
                const targetConnectionGeometry = new THREE.BoxGeometry(connectionLength, conveyorHeight, conveyorWidth);
                const targetConnection = new THREE.Mesh(targetConnectionGeometry, beltMaterial);
                targetConnection.position.set(
                    (aisleX + 0.5 + stationX) / 2,
                    conveyorHeight / 2,
                    2.0 // Position further back for target
                );
                targetConnection.userData = { type: 'conveyor', lineType: 'target_connection' };
                prezoneGroup.add(targetConnection);
            }
        }
    }

    return prezoneGroup;
}
