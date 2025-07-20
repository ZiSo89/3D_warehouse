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
    
    // Create horizontal conveyors that connect picking stations to each aisle
    for (let a = 0; a < uiConfig.aisles; a++) {
        // Main horizontal conveyor from prezone to lift (towards OSR)
        const mainConveyorGeometry = new THREE.BoxGeometry(conveyorWidth, conveyorHeight, conveyorLength);
        const mainConveyor = new THREE.Mesh(mainConveyorGeometry, conveyorMaterial);
        
        // Position conveyor to start from prezone and reach towards OSR (positive Z direction)
        mainConveyor.position.set(
            a * rackAndAisleWidth + totalRackDepth + (constants.aisleWidth / 2),
            conveyorHeight / 2,
            conveyorLength / 2 + 1 // Start closer to prezone, extend towards OSR
        );
        mainConveyor.castShadow = true;
        mainConveyor.receiveShadow = true;
        prezoneGroup.add(mainConveyor);
        
        // Add connecting conveyors between picking stations and main conveyors
        if (a < uiConfig.picking_stations) {
            const connectionLength = Math.abs(mainConveyor.position.x - (a * (stationWidth + 1) - totalPrezoneWidth / 2 + stationWidth / 2));
            if (connectionLength > 0.5) { // Only create if there's significant distance
                const connectionConveyorGeometry = new THREE.BoxGeometry(connectionLength, conveyorHeight, conveyorWidth);
                const connectionConveyor = new THREE.Mesh(connectionConveyorGeometry, conveyorMaterial);
                
                connectionConveyor.position.set(
                    (mainConveyor.position.x + (a * (stationWidth + 1) - totalPrezoneWidth / 2 + stationWidth / 2)) / 2,
                    conveyorHeight / 2,
                    1.5 // Position at the back of picking stations (OSR side)
                );
                connectionConveyor.castShadow = true;
                connectionConveyor.receiveShadow = true;
                prezoneGroup.add(connectionConveyor);
            }
        }
    }

    return prezoneGroup;
}
