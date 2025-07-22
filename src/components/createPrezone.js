import * as THREE from 'three';

export function createPrezone(uiConfig, constants) {
    console.log('🏭 Creating prezone with picking station and multi-lift conveyor system...');
    
    const prezoneGroup = new THREE.Group();
    prezoneGroup.name = 'PrezoneGroup';
    
    // Create picking station and conveyor system for all lifts
    createPickingStation(prezoneGroup, uiConfig);
    createMultiLiftConveyorSystem(prezoneGroup, uiConfig, constants);
    
    console.log('✅ Prezone created with connections to all lifts');
    
    return prezoneGroup;
}

function createPickingStation(parent, uiConfig) {
    console.log(`📦 Creating ${uiConfig.picking_stations} picking stations...`);
    
    // Calculate station layout using same logic as AnimationManager
    const stationWidth = 2.5;
    const stationSpacing = 1.0; // Gap between stations
    const stationFullWidth = stationWidth + stationSpacing;
    const totalPrezoneWidth = uiConfig.picking_stations * stationFullWidth;
    
    // Create multiple picking stations
    for (let i = 0; i < uiConfig.picking_stations; i++) {
        // Calculate position using same formula as AnimationManager
        // AnimationManager uses startStationIndex = 1, so we adjust accordingly
        const adjustedIndex = i + 1; // Start from 1 instead of 0 to match AnimationManager
        const pickingX = adjustedIndex * stationFullWidth - totalPrezoneWidth / 2 + stationWidth / 2;
        const pickingY = 0.25;
        const pickingZ = 0;
        
        const platformGeometry = new THREE.BoxGeometry(stationWidth, 0.5, 2);
        const platformMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4CAF50,  // Green
            transparent: true, 
            opacity: 0.8 
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.set(pickingX, pickingY, pickingZ);
        platform.name = `PickingStation_${i}`;
        platform.userData = { 
            type: 'picking_station',
            station_id: i,
            coordinates: { x: pickingX, y: pickingY, z: pickingZ }
        };
        
        parent.add(platform);
        
        console.log(`✅ Picking station ${i} created at relative position (${pickingX.toFixed(2)}, ${pickingY}, ${pickingZ})`);
    }
}

function createMultiLiftConveyorSystem(parent, uiConfig, constants) {
    console.log('🛤️ Creating dual-level conveyor system (SOURCE above + TARGET below) for all lifts...');
    
    // Calculate lift positions based on AnimationManager logic
    const rackAndAisleWidth = (uiConfig.storage_depth * 0.8 * 2) + 2.5;
    const levelOffset = 0.3; // Reduced vertical distance between SOURCE (upper) and TARGET (lower) levels
    const horizontalOffset = 0.15; // Small horizontal offset to prevent overlap
    const liftStopDistance = 1.5; // Stop distance before lifts to avoid overlap
    
    // Define level heights
    const targetLevel = 0.1; // Lower level for TARGET (outgoing materials)
    const sourceLevel = targetLevel + levelOffset; // Upper level for SOURCE (incoming materials)
    
    // Calculate picking station positions using same logic as AnimationManager
    const stationWidth = 2.5;
    const stationSpacing = 1.0;
    const stationFullWidth = stationWidth + stationSpacing;
    const totalPrezoneWidth = uiConfig.picking_stations * stationFullWidth;
    
    // Use middle picking station for main path (same as AnimationManager startStationIndex = 1)
    // AnimationManager always uses index 1 (second station) regardless of total stations
    const mainStationIndex = 1; // Fixed to match AnimationManager logic
    const mainPickingX = mainStationIndex * stationFullWidth - totalPrezoneWidth / 2 + stationWidth / 2;
    
    // Main path from main picking station (index 1) following animation steps
    // STEP 1: Forward from picking station
    // STEP 2: Left to align with lift
    // STEP 3: Forward to distribution hub
    const frontOffset = 1.0; // Same as AnimationManager
    const targetAisle = 0; // First aisle (same as AnimationManager for simplicity)
    const liftX = targetAisle * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25;
    
    const mainPath = [
        { x: mainPickingX, y: 0.25, z: 0, name: "Main Picking Station (Index 1)" },
        { x: mainPickingX, y: targetLevel, z: frontOffset, name: "Forward Step" },
        { x: liftX, y: targetLevel, z: frontOffset, name: "Left Alignment" },
        { x: liftX, y: targetLevel, z: 4, name: "Distribution Hub" }
    ];
    
    // Create main conveyor path (TARGET flow at lower level)
    for (let i = 0; i < mainPath.length - 1; i++) {
        createConveyorSegment(parent, mainPath[i], mainPath[i + 1], `Main_TARGET_${i + 1}`, 'target');
    }
    
    // Create main SOURCE conveyor path (upper level) - reverse direction with slight offset
    const mainSourcePath = [
        { x: liftX + horizontalOffset, y: sourceLevel, z: 4, name: "SOURCE Distribution Hub" },
        { x: liftX + horizontalOffset, y: sourceLevel, z: frontOffset, name: "SOURCE Left Alignment" },
        { x: mainPickingX + horizontalOffset, y: sourceLevel, z: frontOffset, name: "SOURCE Forward Step" },
        { x: mainPickingX + horizontalOffset, y: 0.35, z: 0, name: "SOURCE Main Picking Station (Index 1)" }
    ];
    
    for (let i = 0; i < mainSourcePath.length - 1; i++) {
        createConveyorSegment(parent, mainSourcePath[i], mainSourcePath[i + 1], `Main_SOURCE_${i + 1}`, 'source');
    }
    
    // Create connection paths from all other picking stations to main distribution line
    for (let s = 0; s < uiConfig.picking_stations; s++) {
        const adjustedStationIndex = s + 1; // Match the adjusted indexing (1-based)
        if (adjustedStationIndex !== mainStationIndex) { // Skip main station (index 1) already connected
            const stationX = adjustedStationIndex * stationFullWidth - totalPrezoneWidth / 2 + stationWidth / 2;
            
            // Connect each station to the main distribution line (TARGET - lower level)
            const stationPath = [
                { x: stationX, y: 0.25, z: 0, name: `Picking Station ${adjustedStationIndex}` },
                { x: stationX, y: targetLevel, z: 1, name: `Station ${adjustedStationIndex} Exit` },
                { x: liftX, y: targetLevel, z: 2.5, name: `Station ${adjustedStationIndex} Distribution` }
            ];
            
            // Create station connection conveyors (TARGET)
            for (let i = 0; i < stationPath.length - 1; i++) {
                createConveyorSegment(parent, stationPath[i], stationPath[i + 1], `Station${adjustedStationIndex}_TARGET_${i + 1}`, 'target');
            }
            
            // Create SOURCE conveyors (upper level) - reverse direction with offset
            const stationSourcePath = [
                { x: liftX + horizontalOffset, y: sourceLevel, z: 2.5, name: `SOURCE Station ${adjustedStationIndex} Distribution` },
                { x: stationX + horizontalOffset, y: sourceLevel, z: 1, name: `SOURCE Station ${adjustedStationIndex} Exit` },
                { x: stationX + horizontalOffset, y: 0.35, z: 0, name: `SOURCE Picking Station ${adjustedStationIndex}` }
            ];
            
            // Create station SOURCE connection conveyors
            for (let i = 0; i < stationSourcePath.length - 1; i++) {
                createConveyorSegment(parent, stationSourcePath[i], stationSourcePath[i + 1], `Station${adjustedStationIndex}_SOURCE_${i + 1}`, 'source');
            }
        }
    }
    
    // Create dual-level distribution conveyors
    const distributionZ = 4;
    const distributionStart = liftX - 2; // Start aligned with first lift
    const distributionEnd = (uiConfig.aisles - 1) * rackAndAisleWidth + 2;
    
    // SOURCE distribution conveyor (UPPER level) with offset
    const sourceDistStart = { x: distributionStart + horizontalOffset, y: sourceLevel, z: distributionZ, name: "SOURCE Distribution Start" };
    const sourceDistEnd = { x: distributionEnd + horizontalOffset, y: sourceLevel, z: distributionZ, name: "SOURCE Distribution End" };
    createConveyorSegment(parent, sourceDistStart, sourceDistEnd, "Distribution_SOURCE", 'source');
    
    // TARGET distribution conveyor (LOWER level)
    const targetDistStart = { x: distributionStart, y: targetLevel, z: distributionZ, name: "TARGET Distribution Start" };
    const targetDistEnd = { x: distributionEnd, y: targetLevel, z: distributionZ, name: "TARGET Distribution End" };
    createConveyorSegment(parent, targetDistStart, targetDistEnd, "Distribution_TARGET", 'target');
    
    // Create dual-level conveyor branches to each lift
    for (let aisle = 0; aisle < uiConfig.aisles; aisle++) {
        const liftX = aisle * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25;
        const liftApproachZ = distributionZ + 2; // Stop before lift
        const liftFinalZ = distributionZ + 2 + liftStopDistance; // Final position before lift
        
        // SOURCE branch (materials going TO lift) - UPPER level with offset
        const sourceBranchPath = [
            { x: liftX + horizontalOffset, y: sourceLevel, z: distributionZ, name: `SOURCE Distribution Point ${aisle}` },
            { x: liftX + horizontalOffset, y: sourceLevel, z: liftApproachZ, name: `SOURCE Lift ${aisle} Approach` },
            { x: liftX + horizontalOffset, y: sourceLevel, z: liftFinalZ, name: `SOURCE Lift ${aisle} Final` }
        ];
        
        // TARGET branch (materials coming FROM lift) - LOWER level
        const targetBranchPath = [
            { x: liftX, y: targetLevel, z: liftFinalZ, name: `TARGET Lift ${aisle} Final` },
            { x: liftX, y: targetLevel, z: liftApproachZ, name: `TARGET Lift ${aisle} Approach` },
            { x: liftX, y: targetLevel, z: distributionZ, name: `TARGET Distribution Point ${aisle}` }
        ];
        
        // Create SOURCE branch conveyors (upper level)
        for (let i = 0; i < sourceBranchPath.length - 1; i++) {
            createConveyorSegment(parent, sourceBranchPath[i], sourceBranchPath[i + 1], `Lift${aisle}_SOURCE_${i + 1}`, 'source');
        }
        
        // Create TARGET branch conveyors (lower level)
        for (let i = 0; i < targetBranchPath.length - 1; i++) {
            createConveyorSegment(parent, targetBranchPath[i], targetBranchPath[i + 1], `Lift${aisle}_TARGET_${i + 1}`, 'target');
        }
        
        // Create support pillars between levels
        createSupportPillars(parent, liftX, distributionZ, liftFinalZ, targetLevel, sourceLevel);
    }
    
    console.log(`✅ Dual-level conveyor system created for ${uiConfig.picking_stations} stations and ${uiConfig.aisles} lifts with upper/lower levels`);
}

function createSupportPillars(parent, liftX, startZ, endZ, lowerLevel, upperLevel) {
    // Create support pillars every 2 units along the conveyor path
    const pillarSpacing = 2;
    const pillarCount = Math.floor((endZ - startZ) / pillarSpacing) + 1;
    
    for (let i = 0; i <= pillarCount; i++) {
        const pillarZ = startZ + (i * pillarSpacing);
        if (pillarZ <= endZ) {
            const pillarHeight = upperLevel - lowerLevel;
            const pillarGeometry = new THREE.CylinderGeometry(0.05, 0.05, pillarHeight);
            const pillarMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x666666, // Dark grey
                metalness: 0.7,
                roughness: 0.3
            });
            
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(liftX, lowerLevel + pillarHeight/2, pillarZ);
            pillar.name = `SupportPillar_${liftX}_${pillarZ}`;
            pillar.userData = {
                type: 'support_pillar',
                coordinates: { x: liftX, y: lowerLevel + pillarHeight/2, z: pillarZ }
            };
            
            parent.add(pillar);
        }
    }
}

function createConveyorSegment(parent, startPoint, endPoint, segmentName, flowType = 'general') {
    // Calculate segment properties
    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;
    const deltaZ = endPoint.z - startPoint.z;
    
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
    const centerX = (startPoint.x + endPoint.x) / 2;
    const centerY = (startPoint.y + endPoint.y) / 2;
    const centerZ = (startPoint.z + endPoint.z) / 2;
    
    // Determine conveyor dimensions based on direction
    let width, height, depth;
    if (Math.abs(deltaX) > Math.abs(deltaZ)) {
        // Horizontal movement (X direction)
        width = length;
        height = 0.1;
        depth = 0.6; // Full width since levels are separated vertically
    } else {
        // Forward/backward movement (Z direction)
        width = 0.6; // Full width since levels are separated vertically
        height = 0.1;
        depth = length;
    }
    
    // Color-code conveyors based on flow type
    let color, opacity;
    switch(flowType) {
        case 'source':
            color = 0x2196F3; // Blue for SOURCE (incoming materials)
            opacity = 0.9;
            break;
        case 'target':
            color = 0xFF9800; // Orange for TARGET (outgoing materials)
            opacity = 0.9;
            break;
        case 'main':
            color = 0x4CAF50; // Green for main path
            opacity = 0.8;
            break;
        default:
            color = 0x607D8B; // Grey for general
            opacity = 0.7;
    }
    
    // Create conveyor box with flow-specific appearance
    const conveyorGeometry = new THREE.BoxGeometry(width, height, depth);
    const conveyorMaterial = new THREE.MeshLambertMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        metalness: 0.3,
        roughness: 0.7
    });
    
    const conveyor = new THREE.Mesh(conveyorGeometry, conveyorMaterial);
    conveyor.position.set(centerX, centerY, centerZ);
    conveyor.name = `ConveyorSegment_${segmentName}`;
    conveyor.userData = {
        type: 'conveyor_segment',
        segment_name: segmentName,
        flow_type: flowType,
        from: startPoint.name,
        to: endPoint.name,
        coordinates: { x: centerX, y: centerY, z: centerZ }
    };
    
    parent.add(conveyor);
    
    console.log(`✅ ${flowType.toUpperCase()} conveyor "${segmentName}" created: ${startPoint.name} → ${endPoint.name}`);
}