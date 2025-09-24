import * as THREE from 'three';

import { PLCStationManager } from './PLCStationManager.js';

const PREZONE_ELLIPSE_OFFSET_X = 5.3;
const PICKING_STATION_OFFSET_X = 6.0;

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

// Dynamic PLC station generation based on picking stations count
function updatePLCStationsForPickingStations(uiConfig) {
    const pickingStationsCount = uiConfig.picking_stations || 3;
    
    // Keep existing stations that are not picking-related
    let existingStations = [];
    if (uiConfig.plc_stations && Array.isArray(uiConfig.plc_stations)) {
        // Keep stations that are not picking diverters (11700-11799) or picking stations (11800-11899)
        existingStations = uiConfig.plc_stations.filter(station => {
            const plc = station.plc_address;
            const isPickingDiverter = plc >= 11700 && plc <= 11799;
            const isPickingStation = plc >= 11800 && plc <= 11899;
            return !isPickingDiverter && !isPickingStation;
        });
    }
    
    // Generate picking stations dynamically
    const pickingStations = [];
    
    for (let i = 0; i < pickingStationsCount; i++) {
    // Position picking diverters on a line for main loop connection
    const baseX = -15 + (i * 7);
    const diverterX = baseX + PICKING_STATION_OFFSET_X; // Spread diverters along X axis for main loop
        const diverterZ = -8; // Keep them in a line for main loop
        
    // Position picking stations in a line like the existing Picking Station 1
    const stationX = baseX + PICKING_STATION_OFFSET_X; // Same X spacing as diverters but different Z
        const stationZ = -14; // Same Z as existing Picking Station 1
        
        // Add picking diverter for this station (connected to main loop)
        pickingStations.push({
            "name": `Picking Diverter ${i + 1}`,
            "plc_address": 11700 + i,
            "position": { "x": diverterX, "y": 0.15, "z": diverterZ },
            "directions": { "straight": 11401, "divert": 11800 + i } // 11800, 11801, 11802, etc.
        });
        
        // Add picking station - DO NOT connect directly to main loop (11401)
        pickingStations.push({
            "name": `Picking Station ${i + 1}`,
            "plc_address": 11800 + i, // Start from 11800 (11800 + 0)
            "position": { "x": stationX, "y": 0.15, "z": stationZ },
            "directions": { "straight": null, "divert": null } // No connection to main loop
        });
    }

    // Combine existing stations with new picking stations
    uiConfig.plc_stations = [...existingStations, ...pickingStations];
    
    // Update ellipse radiusX to accommodate more stations and aisles
    if (uiConfig.prezone_visuals && uiConfig.prezone_visuals.ellipse) {
        const baseRadiusX = 15.0;
        
        // Scale based on picking stations count
        const pickingStationRadius = Math.max(0, (pickingStationsCount - 3) * 2.0); // 2 units per additional station
        
        // Scale based on aisles count (main loop should expand with more aisles)
        const aisleCount = uiConfig.aisles || 3;
        const aisleRadius = Math.max(0, (aisleCount - 3) * 3.0); // 3 units per additional aisle
        
        // Combined radius for both picking stations and aisles
        const totalAdditionalRadius = pickingStationRadius + aisleRadius;
        uiConfig.prezone_visuals.ellipse.dimensions.radiusX = baseRadiusX + totalAdditionalRadius;
        
        // Dynamic ellipse sizing complete
    }
}

// ------------------------------------------------------------
// Main entry (loop removed) + simple ellipse bar
// ------------------------------------------------------------
export function createPrezone(uiConfig, _constants) {
    const prezoneGroup = new THREE.Group();
    prezoneGroup.name = 'PrezoneGroup';
    prezoneGroup.position.x = 1.0;

    if (uiConfig.plc_stations && uiConfig.plc_stations.length > 0) {
        // Update PLC stations for picking stations count
        updatePLCStationsForPickingStations(uiConfig);
        
        uiConfig.plc_stations.forEach(st => { st._decoded = decodePlc(st.plc_address); });
        const filteredStations = uiConfig.plc_stations.filter(s => s.plc_address !== 11401);
        const plcManager = new PLCStationManager();
        const plcPrezone = plcManager.generatePrezone(filteredStations);
        prezoneGroup.add(plcPrezone);
    // Create ellipse bar (visual only), supports realistic mode via uiConfig flag
    createSimpleEllipseBar(prezoneGroup, filteredStations, uiConfig);
    // Create connections to main loop (11401) for positioning stations on ellipse
        createMainLoopConnections(prezoneGroup, filteredStations, uiConfig);
        // Create station connections for dynamic conveyor system
    createStationConnections(prezoneGroup, filteredStations, uiConfig);
    // Connect all Lift Exits (216xx) to the nearest point on the main loop
    createLiftExitToLoopConnections(prezoneGroup, filteredStations, uiConfig);
    } else {
        createPickingStation(prezoneGroup, uiConfig);
    createMultiLiftConveyorSystem(prezoneGroup, uiConfig, _constants);
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
    const pickingX = adjustedIndex * stationFullWidth - totalPrezoneWidth / 2 + stationWidth / 2 + PICKING_STATION_OFFSET_X;
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

function createMultiLiftConveyorSystem(parent, uiConfig, _constants) {
    const rackAndAisleWidth = (uiConfig.storage_depth * 0.8 * 2) + 2.5;
    const levelOffset = 0.3;
    const horizontalOffset = 0.15;
    const liftStopDistance = 1.5;
    const targetLevel = 0.1;
    const sourceLevel = targetLevel + levelOffset;

    const stationWidth = 2.5, stationSpacing = 1.0, stationFullWidth = stationWidth + stationSpacing;
    const totalPrezoneWidth = uiConfig.picking_stations * stationFullWidth;
    const mainStationIndex = 1; // second station (AnimationManager logic)
    const pickingOffsetX = PICKING_STATION_OFFSET_X;
    const mainPickingX = mainStationIndex * stationFullWidth - totalPrezoneWidth / 2 + stationWidth / 2 + pickingOffsetX;

    const frontOffset = 1.0;
    const targetAisle = 0;
    const liftX = targetAisle * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25;

    const mainPath = [
        { x: mainPickingX, y: targetLevel, z: frontOffset, name: 'Forward Step' },
        { x: liftX, y: targetLevel, z: frontOffset, name: 'Left Alignment' },
        { x: liftX, y: targetLevel, z: 4, name: 'Distribution Hub' }
    ];
    for (let i = 0; i < mainPath.length - 1; i++) createConveyorSegment(parent, mainPath[i], mainPath[i + 1], `Main_TARGET_${i + 1}`, 'target', uiConfig);

    const mainSourcePath = [
        { x: liftX + horizontalOffset, y: sourceLevel, z: 4, name: 'SOURCE Distribution Hub' },
        { x: liftX + horizontalOffset, y: sourceLevel, z: frontOffset, name: 'SOURCE Left Alignment' },
        { x: mainPickingX + horizontalOffset, y: sourceLevel, z: frontOffset, name: 'SOURCE Forward Step' }
    ];
    for (let i = 0; i < mainSourcePath.length - 1; i++) createConveyorSegment(parent, mainSourcePath[i], mainSourcePath[i + 1], `Main_SOURCE_${i + 1}`, 'source', uiConfig);

    for (let s = 0; s < uiConfig.picking_stations; s++) {
        const adjusted = s + 1;
        if (adjusted !== mainStationIndex) {
            const stationX = adjusted * stationFullWidth - totalPrezoneWidth / 2 + stationWidth / 2 + pickingOffsetX;
            const stationPath = [
                { x: stationX, y: targetLevel, z: frontOffset, name: `Station ${adjusted} Forward Step` },
                { x: liftX, y: targetLevel, z: frontOffset, name: `Station ${adjusted} Left Alignment` }
            ];
            for (let i = 0; i < stationPath.length - 1; i++) createConveyorSegment(parent, stationPath[i], stationPath[i + 1], `Station${adjusted}_TARGET_${i + 1}`, 'target', uiConfig);

            const stationSourcePath = [
                { x: liftX + horizontalOffset, y: sourceLevel, z: frontOffset, name: `SOURCE Station ${adjusted} Main Forward` },
                { x: stationX + horizontalOffset, y: sourceLevel, z: frontOffset, name: `SOURCE Station ${adjusted} Forward Step` }
            ];
            for (let i = 0; i < stationSourcePath.length - 1; i++) createConveyorSegment(parent, stationSourcePath[i], stationSourcePath[i + 1], `Station${adjusted}_SOURCE_${i + 1}`, 'source', uiConfig);
        }
    }

    const distributionZ = 4;
    const distributionStart = liftX;
    const distributionEnd = (uiConfig.aisles - 1) * rackAndAisleWidth + 2;

    createConveyorSegment(parent, { x: distributionStart + horizontalOffset, y: sourceLevel, z: distributionZ, name: 'SOURCE Distribution Start' }, { x: distributionEnd + horizontalOffset + 1.3, y: sourceLevel, z: distributionZ, name: 'SOURCE Distribution End' }, 'Distribution_SOURCE', 'source', uiConfig);
    createConveyorSegment(parent, { x: distributionStart, y: targetLevel, z: distributionZ, name: 'TARGET Distribution Start' }, { x: distributionEnd + horizontalOffset + 1.3, y: targetLevel, z: distributionZ, name: 'TARGET Distribution End' }, 'Distribution_TARGET', 'target', uiConfig);

    for (let aisle = 0; aisle < uiConfig.aisles; aisle++) {
        const ax = aisle * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25;
        const liftApproachZ = distributionZ + 2;
        const liftFinalZ = distributionZ + 2 + liftStopDistance;

        const sourceBranch = [
            { x: ax + horizontalOffset, y: sourceLevel, z: distributionZ, name: `SOURCE Distribution Point ${aisle}` },
            { x: ax + horizontalOffset, y: sourceLevel, z: liftApproachZ, name: `SOURCE Lift ${aisle} Approach` },
            { x: ax + horizontalOffset, y: sourceLevel, z: liftFinalZ - 1, name: `SOURCE Lift ${aisle} Final` }
        ];
    for (let i = 0; i < sourceBranch.length - 1; i++) createConveyorSegment(parent, sourceBranch[i], sourceBranch[i + 1], `Lift${aisle}_SOURCE_${i + 1}`, 'source', uiConfig);

        const targetBranch = [
            { x: ax, y: targetLevel, z: liftFinalZ - 1, name: `TARGET Lift ${aisle} Final` },
            { x: ax, y: targetLevel, z: liftApproachZ, name: `TARGET Lift ${aisle} Approach` },
            { x: ax, y: targetLevel, z: distributionZ, name: `TARGET Distribution Point ${aisle}` }
        ];
    for (let i = 0; i < targetBranch.length - 1; i++) createConveyorSegment(parent, targetBranch[i], targetBranch[i + 1], `Lift${aisle}_TARGET_${i + 1}`, 'target', uiConfig);

        createSupportPillars(parent, ax, distributionZ, liftFinalZ, targetLevel, sourceLevel);
    }
}

// ------------------------------------------------------------
// Support pillars (currently disabled)
// ------------------------------------------------------------
function createSupportPillars(_parent, _liftX, _startZ, _endZ, _lowerLevel, _upperLevel) {
    const DISABLE = true;
    if (DISABLE) return;
    // (Implementation placeholder if pillars are later enabled)
}

// (legacy conveyor creation removed; see the realistic/legacy wrapper at the bottom of the file)

// ------------------------------------------------------------
// Station connections
// ------------------------------------------------------------
function createStationConnections(parent, stations, uiConfig) {
    stations.forEach(st => {
        if (st.plc_address === 11401 || !st.directions) return;
        
        // Create straight connections (but skip if going to main loop 11401)
        if (st.directions.straight && st.directions.straight !== 11401) {
            const target = stations.find(s => s.plc_address === st.directions.straight);
        if (target) createStationToStationConnection(parent, st, target, 'straight', uiConfig);
        }
        
        // Create divert connections (but skip if going to main loop 11401)
        if (st.directions.divert && st.directions.divert !== 11401) {
            const target = stations.find(s => s.plc_address === st.directions.divert);
        if (target) createStationToStationConnection(parent, st, target, 'divert', uiConfig);
        }
    });
}

function createStationToStationConnection(parent, fromStation, toStation, connectionType, uiConfig) {
    const flowType = connectionType === 'divert' ? 'divert_connection' : 'straight_connection';
    createConveyorSegment(parent,
        { x: fromStation.position.x, y: fromStation.position.y || 0.15, z: fromStation.position.z, name: `Station ${fromStation.plc_address}` },
        { x: toStation.position.x, y: toStation.position.y || 0.15, z: toStation.position.z, name: `Station ${toStation.plc_address}` },
    `${fromStation.plc_address}_${connectionType}_${toStation.plc_address}`, flowType, uiConfig);
}

// Position ellipse between picking/aisle stations, or use JSON config if available
function createSimpleEllipseBar(parent, stations, uiConfig) {
    let centerX, centerZ, centerY, radiusX, radiusZ;

    const visualEllipseConfig = uiConfig.prezone_visuals?.ellipse;

    if (visualEllipseConfig && visualEllipseConfig.dimensions && visualEllipseConfig.position) {
        const pos = visualEllipseConfig.position;
        const dims = visualEllipseConfig.dimensions;
        centerX = pos.x;
        centerY = pos.y;
        centerZ = pos.z;
        radiusX = dims.radiusX; // This will now be the updated radiusX from updatePLCStationsForPickingStations
        radiusZ = dims.radiusZ;
    } else {
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

    centerX += PREZONE_ELLIPSE_OFFSET_X;

    const realistic = uiConfig?.prezone_visuals?.realisticConveyors === true;
    if (realistic) {
        // Build a belt-like elliptical loop using TubeGeometry and add inner/outer rails.
        const effectiveCenterY = Math.max(0.15, centerY ?? 0.0);
        const ellipseCurve = new THREE.CatmullRomCurve3(
            Array.from({ length: 64 }, (_, i) => {
                const t = (i / 64) * Math.PI * 2;
                return new THREE.Vector3(
                    centerX + radiusX * Math.cos(t),
                    effectiveCenterY,
                    centerZ + radiusZ * Math.sin(t)
                );
            }),
            true,
            'centripetal',
            0.5
        );
        const beltRadius = 0.12;
        const beltGeom = new THREE.TubeGeometry(ellipseCurve, 256, beltRadius, 16, true);
        const beltMat = new THREE.MeshPhysicalMaterial({ color: 0x333333, metalness: 0.1, roughness: 0.9 });
        const belt = new THREE.Mesh(beltGeom, beltMat);
        belt.name = 'VisualEllipseConveyor_Belt';
        parent.add(belt);

        const railOffset = 0.22;
        const railRadius = 0.03;
        const railMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.35 });
    const right = new THREE.Vector3(1, 0, 0);
        const innerCurve = ellipseCurve.getSpacedPoints(128).map(p => p.clone().addScaledVector(right, -railOffset));
        const outerCurve = ellipseCurve.getSpacedPoints(128).map(p => p.clone().addScaledVector(right, railOffset));
        const innerTube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(innerCurve, true), 256, railRadius, 12, true);
        const outerTube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outerCurve, true), 256, railRadius, 12, true);
        const innerRail = new THREE.Mesh(innerTube, railMat);
        const outerRail = new THREE.Mesh(outerTube, railMat);
        innerRail.name = 'VisualEllipseConveyor_Rail_Inner';
        outerRail.name = 'VisualEllipseConveyor_Rail_Outer';
        parent.add(innerRail);
        parent.add(outerRail);

        // Optional legs every N segments
    const legsGroup = new THREE.Group();
        legsGroup.name = 'VisualEllipseConveyor_Legs';
        const legEvery = 16;
    const legHeight = effectiveCenterY; // height from ground up to belt
        for (let i = 0; i < 128; i += legEvery) {
            const p = ellipseCurve.getPoint(i / 128);
            const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, Math.max(0.1, legHeight), 8),
                new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.3, roughness: 0.6 })
            );
        leg.position.set(p.x, Math.max(0.05, legHeight / 2), p.z);
            legsGroup.add(leg);
        }
        parent.add(legsGroup);
    } else {
        // Geometry and Material - legacy simple torus bar
        const segments = 96;
        const baseR = Math.max(radiusX, radiusZ);
        const tubeRadius = 0.25; // Thicker like a conveyor cylinder
        const geom = new THREE.TorusGeometry(baseR, tubeRadius, 16, segments);
        geom.scale(radiusX / baseR, radiusZ / baseR, 1);
        const mat = new THREE.MeshPhysicalMaterial({
            color: 0x4a90e2,
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
}

// Position stations that reference 11401 on the main loop ellipse
function createMainLoopConnections(parent, stations, uiConfig) {
    // Get ellipse position and dimensions
    const visualEllipseConfig = uiConfig.prezone_visuals?.ellipse;
    if (!visualEllipseConfig || !visualEllipseConfig.position || !visualEllipseConfig.dimensions) {
        console.warn('[MainLoop] No ellipse config found, skipping connections');
        return;
    }

    const ellipsePos = visualEllipseConfig.position;
    const ellipseDims = visualEllipseConfig.dimensions;
    const ellipseCenterX = ellipsePos.x + PREZONE_ELLIPSE_OFFSET_X;

    // Find all stations that reference 11401
    const connectingStations = stations.filter(station => {
        return (station.directions.straight === 11401) || (station.directions.divert === 11401);
    });

    // Reposition stations on the ellipse perimeter (positioning only, no conveyor creation)
    connectingStations.forEach((station, _index) => {
        // Store original position
        const originalX = station.position.x;
        const originalZ = station.position.z;
        
        // Find the closest point on the ellipse to the original position
        const closestPoint = findClosestPointOnEllipse(
            originalX, originalZ, 
            ellipseCenterX, ellipsePos.z, 
            ellipseDims.radiusX, ellipseDims.radiusZ
        );
        
        // Find the corresponding mesh in the parent group
        const targetMesh = findStationMesh(parent, station.plc_address);
        if (targetMesh) {
            // Reposition the actual mesh to the closest point on ellipse
            targetMesh.position.set(closestPoint.x, ellipsePos.y + 0.1, closestPoint.z);
        } else {
            console.warn(`[MainLoop] Could not find mesh for station ${station.name} (${station.plc_address})`);
        }
        
        // Also update the config position for consistency
    station.position.x = closestPoint.x;
        station.position.y = ellipsePos.y + 0.1;
        station.position.z = closestPoint.z;
    });
    
    // Note: Conveyor connections are handled by createStationConnections()
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
function _createConnectionCylinder() { /* deprecated no-op */ }

// ------------------------------------------------------------
// Realistic conveyor segment builder (belt + rails + legs)
// ------------------------------------------------------------
function createRealisticConveyor(parent, startPoint, endPoint, name, flowType) {
    console.log(`Creating realistic conveyor: ${name}, flowType: ${flowType}`);
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const dz = endPoint.z - startPoint.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (length === 0) return;

    // Rotated group for belt/rails only (no roll: keep up close to world Y)
    const group = new THREE.Group();
    group.name = `Conveyor_${name}`;
    const forward = new THREE.Vector3(dx, dy, dz).normalize();
    let tempUp = new THREE.Vector3(0, 1, 0);
    // If forward nearly parallel to up, choose a different tempUp to avoid degeneracy
    if (Math.abs(forward.dot(tempUp)) > 0.999) tempUp = new THREE.Vector3(0, 0, 1);
    const right = new THREE.Vector3().crossVectors(tempUp, forward).normalize();
    const up = new THREE.Vector3().crossVectors(forward, right).normalize();
    const basis = new THREE.Matrix4().makeBasis(right, up, forward);
    group.setRotationFromMatrix(basis);
    group.position.set(startPoint.x, startPoint.y, startPoint.z);

    // Belt slab along local Z
    const beltWidth = 0.5;
    const beltThickness = 0.12;
    const beltGeom = new THREE.BoxGeometry(beltWidth, beltThickness, length);
    let beltColor = 0x333333; // Default dark belt
    if (flowType === 'loop_connection') beltColor = 0x2a2a2a; // Slightly darker for OSR connections
    const beltMat = new THREE.MeshPhysicalMaterial({ color: beltColor, metalness: 0.1, roughness: 0.9 });
    const belt = new THREE.Mesh(beltGeom, beltMat);
    belt.position.z = length / 2;

    // Rails along local Z
    const railGeom = new THREE.CylinderGeometry(0.02, 0.02, length, 12, 1, false);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 0.6, roughness: 0.35 });
    const railOffset = Math.max(0.12, beltWidth / 2 - 0.06);
    const railLeft = new THREE.Mesh(railGeom, railMat);
    const railRight = new THREE.Mesh(railGeom, railMat);
    railLeft.rotation.x = Math.PI / 2;
    railRight.rotation.x = Math.PI / 2;
    railLeft.position.set(-railOffset, 0, length / 2);
    railRight.position.set(railOffset, 0, length / 2);

    // End caps as flow markers
    let hintColor = 0x3d5a6c;
    if (flowType === 'source') hintColor = 0x1976d2;
    else if (flowType === 'target') hintColor = 0xbc6c25;
    else if (flowType === 'main') hintColor = 0x6e9075;
    else if (flowType === 'loop_connection') hintColor = 0xff4444;
    const capGeom = new THREE.SphereGeometry(0.05, 10, 10);
    const capMat = new THREE.MeshStandardMaterial({ color: hintColor, metalness: 0.4, roughness: 0.5 });
    const capA = new THREE.Mesh(capGeom, capMat);
    const capB = new THREE.Mesh(capGeom, capMat);
    capA.position.z = 0;
    capB.position.z = length;

    group.add(belt);
    group.add(railLeft);
    group.add(railRight);
    group.add(capA);
    group.add(capB);
    group.userData = { type: 'conveyor', segment_name: name, flow_type: flowType, from: startPoint.name, to: endPoint.name };
    parent.add(group);

    // Legs in world space: vertical to world Y
    const legMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.3, roughness: 0.6 });
    const footMat = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.2, roughness: 0.7 });
    const legSpacing = 1.5;
    const legCount = Math.max(1, Math.floor(length / legSpacing));
    for (let i = 0; i <= legCount; i++) {
        const t = i / Math.max(1, legCount);
        const worldX = startPoint.x + dx * t;
        const worldYTop = startPoint.y + dy * t;
        const worldZ = startPoint.z + dz * t;
        const h = Math.max(0.12, worldYTop);

        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, h, 10), legMat);
        leg.position.set(worldX, h / 2, worldZ);
        parent.add(leg);

        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 12), footMat);
        foot.position.set(worldX, 0.0125, worldZ);
        parent.add(foot);
    }
}

// Wrapper that chooses realistic or legacy cylinder
function createConveyorSegment(parent, startPoint, endPoint, _segmentName, flowType = 'general', uiConfig) {
    const DISABLED = false; // set true to hide conveyors
    if (DISABLED) return;

    const useRealistic = uiConfig?.prezone_visuals?.realisticConveyors === true;
    if (useRealistic) {
        return createRealisticConveyor(parent, startPoint, endPoint, _segmentName, flowType);
    }

    // Fallback to simple slab belt
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const dz = endPoint.z - startPoint.z;
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (length === 0) return;

    // Force realistic mode for loop_connection (OSR to main loop)
    if (flowType === 'loop_connection') {
        console.log(`Creating realistic conveyor for OSR->Loop: ${_segmentName}`);
        return createRealisticConveyor(parent, startPoint, endPoint, _segmentName, flowType);
    }

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
    const group = new THREE.Group();
    group.name = `ConveyorSegment_${_segmentName}`;
    const forward = new THREE.Vector3(dx, dy, dz).normalize();
    let tempUp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(forward.dot(tempUp)) > 0.999) tempUp = new THREE.Vector3(0, 0, 1);
    const right = new THREE.Vector3().crossVectors(tempUp, forward).normalize();
    const up = new THREE.Vector3().crossVectors(forward, right).normalize();
    const basis = new THREE.Matrix4().makeBasis(right, up, forward);
    group.setRotationFromMatrix(basis);
    group.position.set(startPoint.x, startPoint.y, startPoint.z);

    const beltWidth = 0.5;
    const beltThickness = 0.12;
    const geom = new THREE.BoxGeometry(beltWidth, beltThickness, length);
    const mat = new THREE.MeshPhysicalMaterial({ color, metalness: 0.7, roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.18, reflectivity: 0.6, transparent: true, opacity });
    const slab = new THREE.Mesh(geom, mat);
    slab.position.z = length / 2;

    group.add(slab);
    group.userData = { type: 'conveyor_segment', segment_name: _segmentName, flow_type: flowType, from: startPoint.name, to: endPoint.name };
    parent.add(group);
}

// ------------------------------------------------------------
// Connect Lift Exits (PLC 216xx) to the main loop ellipse
// ------------------------------------------------------------
function createLiftExitToLoopConnections(parent, stations, uiConfig) {
    const ellipseCfg = uiConfig.prezone_visuals?.ellipse;
    if (!ellipseCfg?.position || !ellipseCfg?.dimensions) {
        console.warn('[LiftExitToLoop] No ellipse config found, skipping connections');
        return;
    }
    const ellipsePos = ellipseCfg.position;
    const ellipseDims = ellipseCfg.dimensions;
    const ellipseCenterX = ellipsePos.x + PREZONE_ELLIPSE_OFFSET_X;

    const liftExits = stations.filter(s => s.plc_address >= 21600 && s.plc_address < 21700);
    if (liftExits.length === 0) return;

    liftExits.forEach(st => {
        const closest = findClosestPointOnEllipse(
            st.position.x,
            st.position.z,
            ellipseCenterX,
            ellipsePos.z,
            ellipseDims.radiusX,
            ellipseDims.radiusZ
        );
        const from = { x: st.position.x, y: st.position.y || 0.15, z: st.position.z, name: `Lift Exit ${st.plc_address}` };
        const to = { x: closest.x, y: (ellipsePos.y ?? 0.0) + 0.15, z: closest.z, name: 'Main Loop Ellipse' };
        createConveyorSegment(parent, from, to, `LiftExit_${st.plc_address}_ToLoop`, 'loop_connection', uiConfig);
    });
}

// Export function to update PLC stations from external modules
export function updatePLCStationsForPickingCount(uiConfig) {
    updatePLCStationsForPickingStations(uiConfig);
}