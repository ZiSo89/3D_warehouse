/**
 * PLC Station Manager for warehouse prezone visualization
 * Handles creation and management of PLC stations and conveyor routing
 * @fileoverview Advanced PLC station system with visual genera        // *** ALL PNEUMATIC CYLINDERS DISABLED ***
        const isConnectedToMainLoop = stationData.directions && 
                                     (stationData.directions.straight === 11401 || stationData.directions.divert === 11401);
        
        console.log(`🚫🚫🚫 Station ${stationData.plc_address}: ALL PNEUMATIC CYLINDERS COMPLETELY DISABLED! NO CYLINDERS WILL BE CREATED! 🚫🚫🚫`);
        console.log(`🔗 Station ${stationData.plc_address}: Connected to main loop (11401) = ${isConnectedToMainLoop}`);

        // Force disable any cylinder creation
        const FORCE_DISABLE_ALL_CYLINDERS = true;
        if (FORCE_DISABLE_ALL_CYLINDERS) {
            console.log(`⛔ FORCE DISABLED: No pneumatic cylinders for ANY station including ${stationData.plc_address}`);
            if (isConnectedToMainLoop) {
                console.log(`🎯 Station ${stationData.plc_address} is connected to main loop 11401 - extra clean look`);
            }
            // Intentionally skip ALL cylinder creation
        }

        // Direction indicators
        this.addDirectionIndicators(group, stationData);
 */

import * as THREE from 'three';

/**
 * Manages PLC stations and their visual representation
 * @class PLCStationManager
 */
export class PLCStationManager {
    constructor() {
        this.stations = new Map();
        this.conveyorSegments = [];
        this.materials = this.createMaterials();
    }

    /**
     * Creates materials for different PLC station types
     * @returns {Object} Material definitions
     */
    createMaterials() {
        return {
            loopSwitch: new THREE.MeshLambertMaterial({ color: 0xF56500 }), // Orange
            diverter: new THREE.MeshLambertMaterial({ color: 0x9F7AEA }),   // Purple
            sensor: new THREE.MeshLambertMaterial({ color: 0x48BB78 }),     // Green
            fillReader: new THREE.MeshLambertMaterial({ color: 0xED8936 }), // Orange-red
            conveyor: new THREE.MeshLambertMaterial({ color: 0x4A5568 }),   // Dark gray
            connectionLine: new THREE.LineBasicMaterial({ 
                color: 0xA0AEC0, 
                linewidth: 2,
                transparent: true,
                opacity: 0.7
            })
        };
    }

    /**
     * Determines station type based on SRC PLC address convention
     * Format: <Floor><Conveyor-Level><Station-Type><Counter>
     * @param {number} plcAddress - 5-digit PLC station address
     * @returns {string} Station type
     */
    getStationType(plcAddress) {
        // Convert to string to extract digits
        const addressStr = plcAddress.toString().padStart(5, '0');
        
        // Extract the third digit (Station Type)
        const stationTypeDigit = parseInt(addressStr[2]);
        
        // Log for debugging
        console.log(`🔍 Analyzing PLC ${plcAddress}: Floor=${addressStr[0]}, Level=${addressStr[1]}, Type=${stationTypeDigit}, Counter=${addressStr.slice(3)}`);
        
        switch (stationTypeDigit) {
            case 4:
                return 'helper_station';     // Helper station in prezone (loop switch)
            case 5:
                return 'aisle_entrance';     // Entrance to OSR aisle
            case 6:
                return 'lift_station';       // Lift station
            case 7:
                return 'picking_diverter';   // Diversion to picking station
            case 8:
                return 'picking_station';    // Picking station
            case 9:
                return 'lift_reading_point'; // Lift entrance reading point
            default:
                console.warn(`❌ Unknown station type digit: ${stationTypeDigit} for PLC ${plcAddress}`);
                return 'unknown';
        }
    }

    /**
     * Gets visual style based on station type
     * @param {string} stationType - Station type from getStationType
     * @returns {Object} Visual configuration
     */
    getStationVisualConfig(stationType) {
        const configs = {
            'helper_station': {
                color: 0xF56500,      // Orange
                icon: 'switch',
                description: 'Loop Switch',
                createMethod: 'createLoopSwitch'
            },
            'aisle_entrance': {
                color: 0x3182CE,      // Blue
                icon: 'entrance',
                description: 'Aisle Entrance',
                createMethod: 'createAisleEntrance'
            },
            'lift_station': {
                color: 0x38B2AC,      // Teal
                icon: 'elevator',
                description: 'Lift Station',
                createMethod: 'createLiftStation'
            },
            'picking_diverter': {
                color: 0x9F7AEA,      // Purple
                icon: 'fork',
                description: 'Picking Diverter',
                createMethod: 'createDiverter'
            },
            'picking_station': {
                color: 0xE53E3E,      // Red
                icon: 'workstation',
                description: 'Picking Station',
                createMethod: 'createPickingStation'
            },
            'lift_reading_point': {
                color: 0xED8936,      // Orange-red
                icon: 'scanner',
                description: 'Fill Reader',
                createMethod: 'createFillReader'
            },
            'unknown': {
                color: 0x718096,      // Gray
                icon: 'question',
                description: 'Unknown Station',
                createMethod: 'createGenericStation'
            }
        };
        
        return configs[stationType] || configs['unknown'];
    }

    /**
     * Enhanced station analysis with SRC convention
     * @param {number} plcAddress - PLC address
     * @returns {Object} Detailed station information
     */
    analyzeStationAddress(plcAddress) {
        const addressStr = plcAddress.toString().padStart(5, '0');
        
        return {
            floor: parseInt(addressStr[0]),
            conveyorLevel: parseInt(addressStr[1]), 
            stationTypeDigit: parseInt(addressStr[2]),
            counter: parseInt(addressStr.slice(3)),
            stationType: this.getStationType(plcAddress),
            visualConfig: this.getStationVisualConfig(this.getStationType(plcAddress)),
            fullAddress: plcAddress,
            addressString: addressStr
        };
    }

    /**
     * Creates visual representation of a loop switch
     * @param {Object} stationData - Station configuration
     * @returns {THREE.Group} 3D object group
     */
    createLoopSwitch(stationData) {
        const group = new THREE.Group();
        group.name = `LoopSwitch_${stationData.plc_address}`;

        // Main switch body
        const bodyGeometry = new THREE.BoxGeometry(1.2, 0.3, 0.8);
        const bodyMesh = new THREE.Mesh(bodyGeometry, this.materials.loopSwitch);
        bodyMesh.position.set(0, 0.15, 0);
        group.add(bodyMesh);

        // Switch arm removed for cleaner look

        // Direction indicators
        this.addDirectionIndicators(group, stationData);

        // Station label
        this.addStationLabel(group, stationData);

        // Base plate
        this.addBasePlate(group);

        // Store metadata
        group.userData = { 
            type: 'loop_switch', 
            plcAddress: stationData.plc_address,
            stationData: stationData
        };

        return group;
    }

    /**
     * Creates visual representation of a diverter
     * @param {Object} stationData - Station configuration
     * @returns {THREE.Group} 3D object group
     */
    createDiverter(stationData) {
        const group = new THREE.Group();
        group.name = `Diverter_${stationData.plc_address}`;

        // Main diverter housing
        const housingGeometry = new THREE.BoxGeometry(1.0, 0.4, 1.2);
        const housingMesh = new THREE.Mesh(housingGeometry, this.materials.diverter);
        housingMesh.position.set(0, 0.2, 0);
        group.add(housingMesh);

        // Diverter blade removed for cleaner look

        // Pneumatic cylinders completely removed for cleaner look
        console.log(`� No pneumatic cylinder added to station ${stationData.plc_address} - all cylinders disabled`);

        // Direction indicators
        this.addDirectionIndicators(group, stationData);

        // Station label
        this.addStationLabel(group, stationData);

        // Base plate
        this.addBasePlate(group);

        // Store metadata
        group.userData = { 
            type: 'diverter', 
            plcAddress: stationData.plc_address,
            stationData: stationData
        };

        return group;
    }

    /**
     * Creates visual representation of a sensor
     * @param {Object} stationData - Station configuration
     * @returns {THREE.Group} 3D object group
     */
    createSensor(stationData) {
        const group = new THREE.Group();
        group.name = `Sensor_${stationData.plc_address}`;

        // Sensor head
        const headGeometry = new THREE.SphereGeometry(0.12, 16, 16);
        const headMesh = new THREE.Mesh(headGeometry, this.materials.sensor);
        headMesh.position.set(0, 0.3, 0);
        group.add(headMesh);

        // Mounting bracket
        const bracketGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        const bracketMesh = new THREE.Mesh(bracketGeometry, new THREE.MeshLambertMaterial({ color: 0x718096 }));
        bracketMesh.position.set(0, 0.1, 0);
        group.add(bracketMesh);

        // Detection beam (laser line)
        const beamGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-2, 0.3, 0),
            new THREE.Vector3(2, 0.3, 0)
        ]);
        const beamLine = new THREE.Line(beamGeometry, new THREE.LineBasicMaterial({ 
            color: 0xFF0000,
            transparent: true,
            opacity: 0.3
        }));
        group.add(beamLine);

        // Station label
        this.addStationLabel(group, stationData);

        // Store metadata
        group.userData = { 
            type: 'sensor', 
            plcAddress: stationData.plc_address,
            stationData: stationData
        };

        return group;
    }

    /**
     * Creates visual representation of a fill reader
     * @param {Object} stationData - Station configuration
     * @returns {THREE.Group} 3D object group
     */
    createFillReader(stationData) {
        console.log('📖 Creating Fill Reader:', stationData.name);
        console.log('📍 Position data:', stationData.position);
        console.log('🏷️ PLC Address:', stationData.plc_address);
        
        const group = new THREE.Group();
        group.name = `FillReader_${stationData.plc_address}`;

        // Scanner unit
        const scannerGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.4);
        const scannerMesh = new THREE.Mesh(scannerGeometry, this.materials.fillReader);
        scannerMesh.position.set(0, 0.3, 0);
        group.add(scannerMesh);
        console.log('✅ Scanner unit created');

        // Scanning window
        const windowGeometry = new THREE.PlaneGeometry(0.6, 0.4);
        const windowMesh = new THREE.Mesh(windowGeometry, new THREE.MeshLambertMaterial({ 
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.3
        }));
        windowMesh.position.set(0, 0.3, 0.21);
        group.add(windowMesh);
        console.log('✅ Scanning window added');

        // Laser grid pattern
        this.addScanningGrid(group);
        console.log('✅ Scanning grid added');

        // Station label
        this.addStationLabel(group, stationData);
        console.log('✅ Station label added');

        // Base plate
        this.addBasePlate(group);
        console.log('✅ Base plate added');

        // Store metadata
        group.userData = { 
            type: 'fill_reader', 
            plcAddress: stationData.plc_address,
            stationData: stationData,
            name: stationData.name
        };
        
        console.log('✅ Fill Reader creation completed for:', stationData.name);
        console.log('🎯 Final group children count:', group.children.length);

        return group;
    }

    /**
     * Creates aisle entrance station
     * @param {Object} stationData - Station configuration
     * @returns {THREE.Group} 3D object group
     */
    createAisleEntrance(stationData) {
        const group = new THREE.Group();
        group.name = `AisleEntrance_${stationData.plc_address}`;

        // Main entrance gate
        const gateGeometry = new THREE.BoxGeometry(2.0, 0.5, 0.3);
        const gateMesh = new THREE.Mesh(gateGeometry, new THREE.MeshLambertMaterial({ color: 0x3182CE }));
        gateMesh.position.set(0, 0.25, 0);
        group.add(gateMesh);

        // Entrance arch
        const archGeometry = new THREE.BoxGeometry(0.2, 2.0, 0.3);
        const leftArch = new THREE.Mesh(archGeometry, new THREE.MeshLambertMaterial({ color: 0x2C5282 }));
        leftArch.position.set(-1.1, 1.0, 0);
        const rightArch = new THREE.Mesh(archGeometry, new THREE.MeshLambertMaterial({ color: 0x2C5282 }));
        rightArch.position.set(1.1, 1.0, 0);
        group.add(leftArch, rightArch);

        // Direction indicators
        this.addDirectionIndicators(group, stationData);

        // Station label
        this.addStationLabel(group, stationData);

        // Base plate
        this.addBasePlate(group);

        // Store metadata
        group.userData = { 
            type: 'aisle_entrance', 
            plcAddress: stationData.plc_address,
            stationData: stationData
        };

        return group;
    }

    /**
     * Creates lift station
     * @param {Object} stationData - Station configuration
     * @returns {THREE.Group} 3D object group
     */
    createLiftStation(stationData) {
        console.log('🏗️ Creating Lift Station:', stationData.name);
        console.log('📍 Position data:', stationData.position);
        console.log('🏷️ PLC Address:', stationData.plc_address);
        
        const group = new THREE.Group();
        group.name = `LiftStation_${stationData.plc_address}`;

        // Lift platform
        const platformGeometry = new THREE.BoxGeometry(1.5, 0.2, 1.5);
        const platformMesh = new THREE.Mesh(platformGeometry, new THREE.MeshLambertMaterial({ color: 0x38B2AC }));
        platformMesh.position.set(0, 0.1, 0);
        group.add(platformMesh);
        console.log('✅ Platform created and added');

        // Lift shaft indicators
        const shaftGeometry = new THREE.BoxGeometry(0.1, 3.0, 0.1);
        const corners = [
            new THREE.Vector3(-0.7, 1.5, -0.7),
            new THREE.Vector3(0.7, 1.5, -0.7),
            new THREE.Vector3(-0.7, 1.5, 0.7),
            new THREE.Vector3(0.7, 1.5, 0.7)
        ];
        
        corners.forEach((pos, index) => {
            const shaft = new THREE.Mesh(shaftGeometry, new THREE.MeshLambertMaterial({ color: 0x2C7A7B }));
            shaft.position.copy(pos);
            group.add(shaft);
        });
        console.log('✅ Shaft indicators created (4 corners)');

        // Direction indicators
        this.addDirectionIndicators(group, stationData);
        console.log('✅ Direction indicators added');

        // Station label
        this.addStationLabel(group, stationData);
        console.log('✅ Station label added');

        // Store metadata
        group.userData = { 
            type: 'lift_station', 
            plcAddress: stationData.plc_address,
            stationData: stationData,
            name: stationData.name
        };
        
        console.log('✅ Lift Station creation completed for:', stationData.name);
        console.log('🎯 Final group children count:', group.children.length);
        
        return group;
    }

    /**
     * Creates picking station
     * @param {Object} stationData - Station configuration
     * @returns {THREE.Group} 3D object group
     */
    createPickingStation(stationData) {
        const group = new THREE.Group();
        group.name = `PickingStation_${stationData.plc_address}`;

        // Workstation desk
        const deskGeometry = new THREE.BoxGeometry(2.0, 0.1, 1.0);
        const deskMesh = new THREE.Mesh(deskGeometry, new THREE.MeshLambertMaterial({ color: 0xE53E3E }));
        deskMesh.position.set(0, 0.8, 0);
        group.add(deskMesh);

        // Support legs
        const legGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        const legPositions = [
            [-0.9, 0.4, -0.4], [0.9, 0.4, -0.4],
            [-0.9, 0.4, 0.4], [0.9, 0.4, 0.4]
        ];
        
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, new THREE.MeshLambertMaterial({ color: 0xC53030 }));
            leg.position.set(...pos);
            group.add(leg);
        });

        // Station label
        this.addStationLabel(group, stationData);

        // Store metadata
        group.userData = { 
            type: 'picking_station', 
            plcAddress: stationData.plc_address,
            stationData: stationData
        };

        return group;
    }

    /**
     * Creates generic station for unknown types
     * @param {Object} stationData - Station configuration
     * @returns {THREE.Group} 3D object group
     */
    createGenericStation(stationData) {
        const group = new THREE.Group();
        group.name = `GenericStation_${stationData.plc_address}`;

        // Simple box representation
        const boxGeometry = new THREE.BoxGeometry(1.0, 0.5, 1.0);
        const boxMesh = new THREE.Mesh(boxGeometry, new THREE.MeshLambertMaterial({ color: 0x718096 }));
        boxMesh.position.set(0, 0.25, 0);
        group.add(boxMesh);

        // Station label
        this.addStationLabel(group, stationData);

        // Store metadata
        group.userData = { 
            type: 'generic_station', 
            plcAddress: stationData.plc_address,
            stationData: stationData
        };

        return group;
    }

    /**
     * Adds direction indicators to station
     * @param {THREE.Group} group - Station group
     * @param {Object} stationData - Station configuration
     */
    addDirectionIndicators(group, stationData) {
        const directions = stationData.directions;

        // Straight arrow
        if (directions.straight) {
            const straightArrow = this.createArrow(0x48BB78, 'straight');
            straightArrow.position.set(0, 0.6, 0.3);
            group.add(straightArrow);
        }

        // Divert arrow
        if (directions.divert) {
            const divertArrow = this.createArrow(0xF56500, 'divert');
            divertArrow.position.set(0.3, 0.6, 0);
            divertArrow.rotation.y = Math.PI / 2;
            group.add(divertArrow);
        }
    }

    /**
     * Creates an arrow indicator
     * @param {number} color - Arrow color
     * @param {string} type - Arrow type ('straight' or 'divert')
     * @returns {THREE.Group} Arrow mesh group
     */
    createArrow(color, type) {
        const group = new THREE.Group();

        // Arrow shaft
        const shaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
        const shaftMesh = new THREE.Mesh(shaftGeometry, new THREE.MeshLambertMaterial({ color }));
        shaftMesh.rotation.z = Math.PI / 2;
        group.add(shaftMesh);

        // Arrow head
        const headGeometry = new THREE.ConeGeometry(0.05, 0.1, 8);
        const headMesh = new THREE.Mesh(headGeometry, new THREE.MeshLambertMaterial({ color }));
        headMesh.rotation.z = -Math.PI / 2;
        headMesh.position.set(0.2, 0, 0);
        group.add(headMesh);

        return group;
    }

    /**
     * Adds station label with SRC information
     * @param {THREE.Group} group - Station group
     * @param {Object} stationData - Station configuration
     */
    addStationLabel(group, stationData) {
        // Create text sprite for station label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 320;
        canvas.height = 96;

        // Get SRC analysis
        const analysis = this.analyzeStationAddress(stationData.plc_address);

        context.fillStyle = '#2D3748';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#FFFFFF';
        context.font = 'bold 14px Arial';
        context.textAlign = 'center';
        
        // Station name and description
        context.fillText(stationData.name, canvas.width / 2, 20);
        context.fillText(analysis.visualConfig.description, canvas.width / 2, 40);
        
        // PLC address and SRC breakdown
        context.font = '12px Arial';
        context.fillText(`PLC: ${stationData.plc_address}`, canvas.width / 2, 60);
        context.fillText(`F${analysis.floor}L${analysis.conveyorLevel}T${analysis.stationTypeDigit}C${String(analysis.counter).padStart(2, '0')}`, canvas.width / 2, 80);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2.5, 0.75, 1);
        sprite.position.set(0, 1.2, 0);
        group.add(sprite);
    }

    /**
     * Adds base plate to station
     * @param {THREE.Group} group - Station group
     */
    addBasePlate(group) {
        const plateGeometry = new THREE.BoxGeometry(1.4, 0.05, 1.4);
        const plateMesh = new THREE.Mesh(plateGeometry, new THREE.MeshLambertMaterial({ color: 0x4A5568 }));
        plateMesh.position.set(0, -0.025, 0);
        group.add(plateMesh);
    }

    /**
     * Adds scanning grid to fill reader
     * @param {THREE.Group} group - Fill reader group
     */
    addScanningGrid(group) {
        const gridGroup = new THREE.Group();
        
        // Create grid lines
        for (let i = -0.2; i <= 0.2; i += 0.1) {
            // Vertical lines
            const vGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i, 0.1, 0.22),
                new THREE.Vector3(i, 0.5, 0.22)
            ]);
            const vLine = new THREE.Line(vGeometry, new THREE.LineBasicMaterial({ 
                color: 0x00FFFF,
                transparent: true,
                opacity: 0.5
            }));
            gridGroup.add(vLine);

            // Horizontal lines
            const hGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-0.2, 0.3 + i, 0.22),
                new THREE.Vector3(0.2, 0.3 + i, 0.22)
            ]);
            const hLine = new THREE.Line(hGeometry, new THREE.LineBasicMaterial({ 
                color: 0x00FFFF,
                transparent: true,
                opacity: 0.5
            }));
            gridGroup.add(hLine);
        }
        
        group.add(gridGroup);
    }

    /**
     * Creates conveyor segment between two stations
     * @param {Object} fromStation - Source station
     * @param {Object} toStation - Target station
     * @param {string} pathType - 'straight' or 'divert'
     * @returns {THREE.Group} Conveyor segment
     */
    createConveyorSegment(fromStation, toStation, pathType) {
        const group = new THREE.Group();
        group.name = `Conveyor_${fromStation.plc_address}_to_${toStation.plc_address}`;

        const startPos = new THREE.Vector3(fromStation.position.x, fromStation.position.y, fromStation.position.z);
        const endPos = new THREE.Vector3(toStation.position.x, toStation.position.y, toStation.position.z);

        // Create conveyor belt
        const path = this.calculateConveyorPath(startPos, endPos, pathType);
        const conveyorMesh = this.createConveyorMesh(path);
        group.add(conveyorMesh);

        // Add flow direction arrows
        const flowArrows = this.createFlowArrows(path);
        group.add(flowArrows);

        return group;
    }

    /**
     * Calculates optimal path between two points
     * @param {THREE.Vector3} start - Start position
     * @param {THREE.Vector3} end - End position
     * @param {string} pathType - Path type
     * @returns {Array} Path points
     */
    calculateConveyorPath(start, end, pathType) {
        const points = [];
        
        if (pathType === 'straight') {
            points.push(start, end);
        } else {
            // Create curved path for divert
            const midPoint = new THREE.Vector3(
                (start.x + end.x) / 2,
                start.y,
                (start.z + end.z) / 2
            );
            points.push(start, midPoint, end);
        }
        
        return points;
    }

    /**
     * Creates conveyor belt mesh from path
     * @param {Array} pathPoints - Path definition
     * @returns {THREE.Mesh} Conveyor mesh
     */
    createConveyorMesh(pathPoints) {
        const curve = new THREE.CatmullRomCurve3(pathPoints);
        const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.4, 8, false);
        const conveyorMesh = new THREE.Mesh(tubeGeometry, this.materials.conveyor);
        return conveyorMesh;
    }

    /**
     * Creates flow direction arrows along path
     * @param {Array} pathPoints - Path definition
     * @returns {THREE.Group} Arrow group
     */
    createFlowArrows(pathPoints) {
        const arrowGroup = new THREE.Group();
        
        // Add arrows along the path
        for (let i = 0; i < pathPoints.length - 1; i++) {
            const start = pathPoints[i];
            const end = pathPoints[i + 1];
            
            const arrow = this.createArrow(0x00FFFF, 'flow');
            arrow.position.copy(start).add(new THREE.Vector3().subVectors(end, start).multiplyScalar(0.5));
            arrow.lookAt(end);
            arrow.scale.set(0.5, 0.5, 0.5);
            arrowGroup.add(arrow);
        }
        
        return arrowGroup;
    }

    /**
     * Generates complete prezone from PLC station configuration
     * @param {Array} plcStations - Array of PLC station configurations
     * @returns {THREE.Group} Complete prezone group
     */
    generatePrezone(plcStations) {
        console.log('🏭 PLCStationManager: Starting SRC-compliant prezone generation...');
        console.log('📊 Stations to process:', plcStations);
        
        const prezoneGroup = new THREE.Group();
        prezoneGroup.name = 'SRC_PLCPrezone';

        // Create all PLC stations with SRC analysis
        plcStations.forEach((stationData, index) => {
            console.log(`🔧 Processing station ${index + 1}/${plcStations.length}:`, stationData.name);
            
            // Analyze using SRC convention
            const analysis = this.analyzeStationAddress(stationData.plc_address);
            console.log(`📡 SRC Analysis:`, analysis);
            
            let stationMesh;
            const visualConfig = analysis.visualConfig;

            // Create station based on SRC type
            switch (analysis.stationType) {
                case 'helper_station':
                    console.log('🔄 Creating helper station (loop switch)...');
                    stationMesh = this.createLoopSwitch(stationData);
                    break;
                case 'aisle_entrance':
                    console.log('🚪 Creating aisle entrance...');
                    stationMesh = this.createAisleEntrance(stationData);
                    break;
                case 'lift_station':
                    console.log('� Creating lift station...');
                    stationMesh = this.createLiftStation(stationData);
                    break;
                case 'picking_diverter':
                    console.log('↗️ Creating picking diverter...');
                    stationMesh = this.createDiverter(stationData);
                    break;
                case 'picking_station':
                    console.log('👷 Creating picking station...');
                    stationMesh = this.createPickingStation(stationData);
                    break;
                case 'lift_reading_point':
                    console.log('📖 Creating lift reading point...');
                    stationMesh = this.createFillReader(stationData);
                    break;
                default:
                    console.warn(`❌ Unknown SRC station type: ${analysis.stationType} for PLC ${stationData.plc_address}`);
                    stationMesh = this.createGenericStation(stationData);
                    break;
            }

            // Position the station
            stationMesh.position.set(
                stationData.position.x,
                stationData.position.y,
                stationData.position.z
            );
            
            // Add SRC metadata
            stationMesh.userData.srcAnalysis = analysis;
            
            console.log(`📍 Positioned ${analysis.visualConfig.description} at (${stationData.position.x}, ${stationData.position.y}, ${stationData.position.z})`);
            
            // VERIFICATION: Get world position after adding to group
            prezoneGroup.add(stationMesh);
            
            // Get world position for verification
            const worldPos = new THREE.Vector3();
            stationMesh.getWorldPosition(worldPos);
            console.log(`🌍 World position after adding to group: (${worldPos.x.toFixed(3)}, ${worldPos.y.toFixed(3)}, ${worldPos.z.toFixed(3)})`);
            
            this.stations.set(stationData.plc_address, {
                data: stationData,
                mesh: stationMesh,
                analysis: analysis
            });
            
            console.log(`✅ ${analysis.visualConfig.description} ${stationData.name} created and added`);
            console.log(`🔍 Station mesh children count: ${stationMesh.children.length}`);
            console.log(`🎯 Can be selected: ${stationMesh.userData ? 'YES' : 'NO'}`);
            console.log('---');
        });

        console.log('🛤️ Generating SRC-compliant conveyor connections...');
        // Generate conveyor connections
        this.generateConveyorConnections(plcStations, prezoneGroup);

        console.log(`🎉 SRC PLC prezone generation complete! Created ${plcStations.length} stations`);
        return prezoneGroup;
    }

    /**
     * Generates conveyor connections between stations
     * @param {Array} plcStations - PLC station configurations
     * @param {THREE.Group} prezoneGroup - Prezone group to add conveyors to
     */
    generateConveyorConnections(plcStations, prezoneGroup) {
        const stationMap = new Map();
        plcStations.forEach(station => {
            stationMap.set(station.plc_address, station);
        });

        plcStations.forEach(station => {
            const directions = station.directions;

            // Create straight path
            if (directions.straight) {
                const targetStation = stationMap.get(directions.straight);
                if (targetStation) {
                    const conveyorSegment = this.createConveyorSegment(station, targetStation, 'straight');
                    prezoneGroup.add(conveyorSegment);
                }
            }

            // Create divert path
            if (directions.divert) {
                const targetStation = stationMap.get(directions.divert);
                if (targetStation) {
                    const conveyorSegment = this.createConveyorSegment(station, targetStation, 'divert');
                    prezoneGroup.add(conveyorSegment);
                }
            }
        });
    }

    /**
     * Gets station by PLC address
     * @param {number} plcAddress - PLC address
     * @returns {Object|null} Station data and mesh
     */
    getStation(plcAddress) {
        return this.stations.get(plcAddress) || null;
    }

    /**
     * Updates station visual state
     * @param {number} plcAddress - PLC address
     * @param {Object} state - New state
     */
    updateStationState(plcAddress, state) {
        const station = this.getStation(plcAddress);
        if (station) {
            // Update visual indicators based on state
            console.log(`🔄 Updating PLC station ${plcAddress} state:`, state);
        }
    }
}
