import * as THREE from 'three';
import { PLCStationManager } from './PLCStationManager.js';

// PLC address decoding (F L T C C)
function decodePlc(plc) {
    const s = plc.toString().padStart(5, '0');
    const floor = +s[0];
    const level = +s[1];
    const typeDigit = s[2];
    const counter = +s.slice(3);
    const typeMap = { '4': 'helper', '5': 'aisle_entrance', '6': 'lift', '7': 'diverter', '8': 'picking', '9': 'lift_reader' };
    return { floor, level, type: typeMap[typeDigit] || 'unknown', counter };
}

// ------------------------------------------------------------
// Main entry (loop removed) + simple ellipse bar
// ------------------------------------------------------------
export function createPrezone(uiConfig, constants) {
    console.log('🔧 Creating prezone with config:', uiConfig);
    console.log('🏭 PLC stations in config:', uiConfig.plc_stations);

    const prezoneGroup = new THREE.Group();
    prezoneGroup.name = 'PrezoneGroup';

    if (uiConfig.plc_stations && uiConfig.plc_stations.length > 0) {
        uiConfig.plc_stations.forEach(st => { st._decoded = decodePlc(st.plc_address); });
        const filteredStations = uiConfig.plc_stations.filter(s => s.plc_address !== 11401);
        const plcManager = new PLCStationManager();
        const plcPrezone = plcManager.generatePrezone(filteredStations);
        prezoneGroup.add(plcPrezone);
        // Create simple ellipse bar (visual only), now reading from uiConfig
        createSimpleEllipseBar(prezoneGroup, filteredStations, uiConfig);
        // Create connections to main loop (11401) 
        createMainLoopConnections(prezoneGroup, filteredStations, uiConfig);
        // Station connections disabled - existing conveyors will be used
        // createStationConnections(prezoneGroup, filteredStations);
    } else {
        createPickingStation(prezoneGroup, uiConfig);
        createMultiLiftConveyorSystem(prezoneGroup, uiConfig, constants);
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    prezoneGroup.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 100;
    prezoneGroup.add(dirLight);

    return prezoneGroup;
}

// ------------------------------------------------------------
// Legacy picking stations + multi‑lift system
// ------------------------------------------------------------
function createPickingStation(parent, uiConfig) {
    const stationWidth = 2.5;
    const stationSpacing = 1.0;
    const stationFullWidth = stationWidth + stationSpacing;
    const totalPrezoneWidth = uiConfig.picking_stations * stationFullWidth;
    const specialStations = (uiConfig.special_stations || []);

    for (let i = 0; i < uiConfig.picking_stations; i++) {
        const adjustedIndex = i + 1;
        const pickingX = adjustedIndex * stationFullWidth - totalPrezoneWidth / 2 + stationWidth / 2;
        const pickingY = 0.25;
        const pickingZ = 0;

        const special = specialStations.find(s => s.index === i);
        let color = 0x2d3a2e;
        let emissive = 0x000000;
        let emissiveIntensity = 0.0;
        if (special) {
            if (special.type === 'buffer') { color = 0xbc6c25; emissive = color; emissiveIntensity = 0.5; }
            else if (special.type === 'reserved') { color = 0x1976d2; emissive = color; emissiveIntensity = 0.5; }
        }

        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(stationWidth, 0.5, 2),
            new THREE.MeshPhysicalMaterial({
                color, metalness: 0.4, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.18,
                reflectivity: 0.5, transparent: false, opacity: 1.0, emissive, emissiveIntensity
            })
        );
        platform.position.set(pickingX, pickingY, pickingZ);
        platform.name = `PickingStation_${i}`;
        platform.userData = { type: 'picking_station', station_id: i, coordinates: { x: pickingX, y: pickingY, z: pickingZ }, special_type: special?.type };
        parent.add(platform);
    }
}

function createMultiLiftConveyorSystem(parent, uiConfig, constants) {
    const rackAndAisleWidth = (uiConfig.storage_depth * 0.8 * 2) + 2.5;
    const levelOffset = 0.3;
    const horizontalOffset = 0.15;
    const liftStopDistance = 1.5;
    const targetLevel = 0.1;
    const sourceLevel = targetLevel + levelOffset;

    const stationWidth = 2.5, stationSpacing = 1.0, stationFullWidth = stationWidth + stationSpacing;
    const totalPrezoneWidth = uiConfig.picking_stations * stationFullWidth;
    const mainStationIndex = 1; // second station (AnimationManager logic)
    const mainPickingX = mainStationIndex * stationFullWidth - totalPrezoneWidth / 2 + stationWidth / 2;

    const frontOffset = 1.0;
    const targetAisle = 0;
    const liftX = targetAisle * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25;

    const mainPath = [
        { x: mainPickingX, y: targetLevel, z: frontOffset, name: 'Forward Step' },
        { x: liftX, y: targetLevel, z: frontOffset, name: 'Left Alignment' },
        { x: liftX, y: targetLevel, z: 4, name: 'Distribution Hub' }
    ];
    for (let i = 0; i < mainPath.length - 1; i++) createConveyorSegment(parent, mainPath[i], mainPath[i + 1], `Main_TARGET_${i + 1}`, 'target');

    const mainSourcePath = [
        { x: liftX + horizontalOffset, y: sourceLevel, z: 4, name: 'SOURCE Distribution Hub' },
        { x: liftX + horizontalOffset, y: sourceLevel, z: frontOffset, name: 'SOURCE Left Alignment' },
        { x: mainPickingX + horizontalOffset, y: sourceLevel, z: frontOffset, name: 'SOURCE Forward Step' }
    ];
    for (let i = 0; i < mainSourcePath.length - 1; i++) createConveyorSegment(parent, mainSourcePath[i], mainSourcePath[i + 1], `Main_SOURCE_${i + 1}`, 'source');

    for (let s = 0; s < uiConfig.picking_stations; s++) {
        const adjusted = s + 1;
        if (adjusted !== mainStationIndex) {
            const stationX = adjusted * stationFullWidth - totalPrezoneWidth / 2 + stationWidth / 2;
            const stationPath = [
                { x: stationX, y: targetLevel, z: frontOffset, name: `Station ${adjusted} Forward Step` },
                { x: liftX, y: targetLevel, z: frontOffset, name: `Station ${adjusted} Left Alignment` }
            ];
            for (let i = 0; i < stationPath.length - 1; i++) createConveyorSegment(parent, stationPath[i], stationPath[i + 1], `Station${adjusted}_TARGET_${i + 1}`, 'target');

            const stationSourcePath = [
                { x: liftX + horizontalOffset, y: sourceLevel, z: frontOffset, name: `SOURCE Station ${adjusted} Main Forward` },
                { x: stationX + horizontalOffset, y: sourceLevel, z: frontOffset, name: `SOURCE Station ${adjusted} Forward Step` }
            ];
            for (let i = 0; i < stationSourcePath.length - 1; i++) createConveyorSegment(parent, stationSourcePath[i], stationSourcePath[i + 1], `Station${adjusted}_SOURCE_${i + 1}`, 'source');
        }
    }

    const distributionZ = 4;
    const distributionStart = liftX;
    const distributionEnd = (uiConfig.aisles - 1) * rackAndAisleWidth + 2;

    createConveyorSegment(parent, { x: distributionStart + horizontalOffset, y: sourceLevel, z: distributionZ, name: 'SOURCE Distribution Start' }, { x: distributionEnd + horizontalOffset + 1.3, y: sourceLevel, z: distributionZ, name: 'SOURCE Distribution End' }, 'Distribution_SOURCE', 'source');
    createConveyorSegment(parent, { x: distributionStart, y: targetLevel, z: distributionZ, name: 'TARGET Distribution Start' }, { x: distributionEnd + horizontalOffset + 1.3, y: targetLevel, z: distributionZ, name: 'TARGET Distribution End' }, 'Distribution_TARGET', 'target');

    for (let aisle = 0; aisle < uiConfig.aisles; aisle++) {
        const ax = aisle * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25;
        const liftApproachZ = distributionZ + 2;
        const liftFinalZ = distributionZ + 2 + liftStopDistance;

        const sourceBranch = [
            { x: ax + horizontalOffset, y: sourceLevel, z: distributionZ, name: `SOURCE Distribution Point ${aisle}` },
            { x: ax + horizontalOffset, y: sourceLevel, z: liftApproachZ, name: `SOURCE Lift ${aisle} Approach` },
            { x: ax + horizontalOffset, y: sourceLevel, z: liftFinalZ - 1, name: `SOURCE Lift ${aisle} Final` }
        ];
        for (let i = 0; i < sourceBranch.length - 1; i++) createConveyorSegment(parent, sourceBranch[i], sourceBranch[i + 1], `Lift${aisle}_SOURCE_${i + 1}`, 'source');

        const targetBranch = [
            { x: ax, y: targetLevel, z: liftFinalZ - 1, name: `TARGET Lift ${aisle} Final` },
            { x: ax, y: targetLevel, z: liftApproachZ, name: `TARGET Lift ${aisle} Approach` },
            { x: ax, y: targetLevel, z: distributionZ, name: `TARGET Distribution Point ${aisle}` }
        ];
        for (let i = 0; i < targetBranch.length - 1; i++) createConveyorSegment(parent, targetBranch[i], targetBranch[i + 1], `Lift${aisle}_TARGET_${i + 1}`, 'target');

        createSupportPillars(parent, ax, distributionZ, liftFinalZ, targetLevel, sourceLevel);
    }
}

// ------------------------------------------------------------
// Support pillars (currently disabled)
// ------------------------------------------------------------
function createSupportPillars(parent, liftX, startZ, endZ, lowerLevel, upperLevel) {
    const DISABLE = true;
    if (DISABLE) return;
    // (Implementation placeholder if pillars are later enabled)
}

// ------------------------------------------------------------
// Conveyor segment creation
// ------------------------------------------------------------
function createConveyorSegment(parent, startPoint, endPoint, segmentName, flowType = 'general') {
    const DISABLED = false; // set true to hide conveyors
    if (DISABLED) {
        console.log(`🚫 Conveyor skipped: ${segmentName}`);
        return;
    }

    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const dz = endPoint.z - startPoint.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (length === 0) return;

    let color, opacity;
    switch (flowType) {
        case 'source': color = 0x1976d2; opacity = 0.92; break;
        case 'target': color = 0xbc6c25; opacity = 0.92; break;
        case 'main': color = 0x6e9075; opacity = 0.85; break;
        case 'loop_connection': color = 0xff4444; opacity = 0.88; break;
        case 'straight_connection': color = 0x00ff88; opacity = 0.85; break;
        case 'divert_connection': color = 0xffaa00; opacity = 0.85; break;
        default: color = 0x3d5a6c; opacity = 0.7; break;
    }

    const geom = new THREE.CylinderGeometry(0.12, 0.12, length, 14, 1, false);
    const mat = new THREE.MeshPhysicalMaterial({ color, metalness: 0.7, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.18, reflectivity: 0.6, transparent: true, opacity });
    const mesh = new THREE.Mesh(geom, mat);

    // Align cylinder: default up (0,1,0) -> direction
    const dir = new THREE.Vector3(dx, dy, dz).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    mesh.quaternion.copy(quat);

    // Midpoint
    mesh.position.set(startPoint.x + dx / 2, startPoint.y + dy / 2, startPoint.z + dz / 2);
    mesh.name = `ConveyorSegment_${segmentName}`;
    mesh.userData = { type: 'conveyor_segment', segment_name: segmentName, flow_type: flowType, from: startPoint.name, to: endPoint.name };
    parent.add(mesh);
}

// ------------------------------------------------------------
// Station connections
// ------------------------------------------------------------
function createStationConnections(parent, stations) {
    stations.forEach(st => {
        if (st.plc_address === 11401 || !st.directions) return;
        if (st.directions.straight && st.directions.straight !== 11401) {
            const target = stations.find(s => s.plc_address === st.directions.straight);
            if (target) createStationToStationConnection(parent, st, target, 'straight');
        }
        if (st.directions.divert && st.directions.divert !== 11401) {
            const target = stations.find(s => s.plc_address === st.directions.divert);
            if (target) createStationToStationConnection(parent, st, target, 'divert');
        }
    });
}

function createStationToStationConnection(parent, fromStation, toStation, connectionType) {
    const flowType = connectionType === 'divert' ? 'divert_connection' : 'straight_connection';
    createConveyorSegment(parent,
        { x: fromStation.position.x, y: fromStation.position.y || 0.15, z: fromStation.position.z, name: `Station ${fromStation.plc_address}` },
        { x: toStation.position.x, y: toStation.position.y || 0.15, z: toStation.position.z, name: `Station ${toStation.plc_address}` },
        `${fromStation.plc_address}_${connectionType}_${toStation.plc_address}`, flowType);
}

// Position ellipse between picking/aisle stations, or use JSON config if available
function createSimpleEllipseBar(parent, stations, uiConfig) {
    console.log('[Ellipse] createSimpleEllipseBar called with prezone_visuals:', uiConfig.prezone_visuals);
    let centerX, centerZ, centerY, radiusX, radiusZ;

    const visualEllipseConfig = uiConfig.prezone_visuals?.ellipse;

    if (visualEllipseConfig && visualEllipseConfig.dimensions && visualEllipseConfig.position) {
        console.log('[Ellipse] Using configuration from JSON.');
        const pos = visualEllipseConfig.position;
        const dims = visualEllipseConfig.dimensions;
        centerX = pos.x;
        centerY = pos.y;
        centerZ = pos.z;
        radiusX = dims.radiusX;
        radiusZ = dims.radiusZ;
    } else {
        console.log('[Ellipse] No JSON config found, calculating dynamically.');
        const pickingAndDiverters = stations.filter(s => ['picking', 'diverter'].includes(s._decoded?.type));
        const aisleEntrances = stations.filter(s => s._decoded?.type === 'aisle_entrance');

        if (pickingAndDiverters.length === 0 || aisleEntrances.length === 0) {
            console.warn('[Ellipse] Could not find both picking and aisle entrance stations for dynamic positioning.');
            return;
        }

        const pickingZs = pickingAndDiverters.map(s => s.position.z);
        const avgPickingZ = pickingZs.reduce((a, b) => a + b, 0) / pickingZs.length;
        const aisleZs = aisleEntrances.map(s => s.position.z);
        const avgAisleZ = aisleZs.reduce((a, b) => a + b, 0) / aisleZs.length;

        const allRelevantStations = [...pickingAndDiverters, ...aisleEntrances];
        const xs = allRelevantStations.map(s => s.position.x);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);

        centerX = (minX + maxX) / 2;
        centerZ = (avgPickingZ + avgAisleZ) / 2;
        centerY = 0.15;
        const marginX = 2.0;
        radiusX = (maxX - minX) / 2 + marginX;
        radiusZ = 0.55;
    }

    console.log(`[Ellipse] Final - Center: (${centerX.toFixed(2)}, ${centerZ.toFixed(2)}), Radii: (${radiusX.toFixed(2)}, ${radiusZ.toFixed(2)})`);

    // Geometry and Material - Made to look like a conveyor cylinder
    const segments = 96;
    const baseR = Math.max(radiusX, radiusZ);
    const tubeRadius = 0.25; // Thicker like a conveyor cylinder
    const geom = new THREE.TorusGeometry(baseR, tubeRadius, 16, segments);
    // Correct scaling: Scale Y axis of the geometry, which becomes Z axis after rotation
    geom.scale(radiusX / baseR, radiusZ / baseR, 1);

    // Material similar to conveyor cylinders - metallic gray/blue
    const mat = new THREE.MeshPhysicalMaterial({
        color: 0x4a90e2, // Blue-gray like conveyor cylinders
        metalness: 0.8,
        roughness: 0.2,
        clearcoat: 0.3,
        clearcoatRoughness: 0.1,
        transparent: false,
        opacity: 1.0
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(centerX, centerY, centerZ);
    mesh.rotation.x = Math.PI / 2;
    mesh.name = 'VisualEllipseBar';
    parent.add(mesh);
}

// Position stations that reference 11401 on the main loop ellipse
function createMainLoopConnections(parent, stations, uiConfig) {
    console.log('[MainLoop] createMainLoopConnections called with uiConfig:', uiConfig);
    
    // Get ellipse position and dimensions
    const visualEllipseConfig = uiConfig.prezone_visuals?.ellipse;
    if (!visualEllipseConfig || !visualEllipseConfig.position || !visualEllipseConfig.dimensions) {
        console.warn('[MainLoop] No ellipse config found, skipping connections');
        console.warn('[MainLoop] prezone_visuals:', uiConfig.prezone_visuals);
        return;
    }

    const ellipsePos = visualEllipseConfig.position;
    const ellipseDims = visualEllipseConfig.dimensions;

    // Find all stations that reference 11401
    const connectingStations = stations.filter(station => {
        return (station.directions.straight === 11401) || (station.directions.divert === 11401);
    });

    console.log(`[MainLoop] Found ${connectingStations.length} stations to position on main loop`);

    // Reposition stations on the ellipse perimeter
    connectingStations.forEach((station, index) => {
        // Store original position
        const originalX = station.position.x;
        const originalZ = station.position.z;
        
        // Find the closest point on the ellipse to the original position
        const closestPoint = findClosestPointOnEllipse(
            originalX, originalZ, 
            ellipsePos.x, ellipsePos.z, 
            ellipseDims.radiusX, ellipseDims.radiusZ
        );
        
        // Find the corresponding mesh in the parent group
        const targetMesh = findStationMesh(parent, station.plc_address);
        if (targetMesh) {
            // Reposition the actual mesh to the closest point on ellipse
            targetMesh.position.set(closestPoint.x, ellipsePos.y + 0.1, closestPoint.z);
            console.log(`[MainLoop] Repositioned mesh for ${station.name} (${station.plc_address}) from (${originalX.toFixed(2)}, ${originalZ.toFixed(2)}) to closest ellipse point (${closestPoint.x.toFixed(2)}, ${closestPoint.z.toFixed(2)})`);
        } else {
            console.warn(`[MainLoop] Could not find mesh for station ${station.name} (${station.plc_address})`);
        }
        
        // Also update the config position for consistency
        station.position.x = closestPoint.x;
        station.position.y = ellipsePos.y + 0.1;
        station.position.z = closestPoint.z;
    });

    console.log(`[MainLoop] Successfully repositioned ${connectingStations.length} stations on main loop ellipse`);
}

// Helper function to find the closest point on an ellipse to a given point
function findClosestPointOnEllipse(pointX, pointZ, ellipseCenterX, ellipseCenterZ, radiusX, radiusZ) {
    // Translate to ellipse-centered coordinates
    const dx = pointX - ellipseCenterX;
    const dz = pointZ - ellipseCenterZ;
    
    // Handle special case where point is at center
    if (Math.abs(dx) < 0.001 && Math.abs(dz) < 0.001) {
        return { x: ellipseCenterX + radiusX, z: ellipseCenterZ };
    }
    
    // Use parametric approach to find closest point
    let bestDistance = Infinity;
    let bestPoint = { x: ellipseCenterX + radiusX, z: ellipseCenterZ };
    
    // Sample points around the ellipse
    const samples = 36; // Every 10 degrees
    for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2;
        const ellipseX = ellipseCenterX + radiusX * Math.cos(angle);
        const ellipseZ = ellipseCenterZ + radiusZ * Math.sin(angle);
        
        const distance = Math.sqrt(
            Math.pow(ellipseX - pointX, 2) + 
            Math.pow(ellipseZ - pointZ, 2)
        );
        
        if (distance < bestDistance) {
            bestDistance = distance;
            bestPoint = { x: ellipseX, z: ellipseZ };
        }
    }
    
    return bestPoint;
}

// Helper function to find a station mesh by PLC address
function findStationMesh(parent, plcAddress) {
    // Search through all children and their children
    function searchRecursive(object) {
        // Check if this object has userData with the PLC address (check both formats)
        if (object.userData) {
            if (object.userData.plc_address === plcAddress || 
                object.userData.plcAddress === plcAddress) {
                return object;
            }
        }
        
        // Check if this object has a name that includes the PLC address
        if (object.name && object.name.includes(plcAddress.toString())) {
            return object;
        }
        
        // Search children
        for (let child of object.children) {
            const result = searchRecursive(child);
            if (result) return result;
        }
        
        return null;
    }
    
    return searchRecursive(parent);
}

// Create a cylinder between two points
function createConnectionCylinder(parent, startPoint, endPoint, name) {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const dz = endPoint.z - startPoint.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (length === 0) return;
    
    // Create cylinder geometry
    const geometry = new THREE.CylinderGeometry(0.1, 0.1, length, 12);
    
    // Material similar to main loop
    const material = new THREE.MeshPhysicalMaterial({
        color: 0x6a8caf, // Slightly different blue-gray
        metalness: 0.7,
        roughness: 0.3,
        clearcoat: 0.2,
        transparent: false,
        opacity: 1.0
    });
    
    const cylinder = new THREE.Mesh(geometry, material);
    
    // Position cylinder at midpoint
    cylinder.position.set(
        (startPoint.x + endPoint.x) / 2,
        (startPoint.y + endPoint.y) / 2,
        (startPoint.z + endPoint.z) / 2
    );
    
    // Rotate cylinder to align with direction
    const direction = new THREE.Vector3(dx, dy, dz).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    cylinder.setRotationFromQuaternion(quaternion);
    
    cylinder.name = name;
    cylinder.userData = { 
        type: 'main_loop_connection',
        from_station: startPoint,
        to_loop: endPoint
    };
    
    parent.add(cylinder);
}