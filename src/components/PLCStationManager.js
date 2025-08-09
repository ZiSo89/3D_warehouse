/**
 * PLC Station Manager for warehouse prezone visualization
 * Handles creation and management of PLC stations and conveyor routing
 * @fileoverview Advanced PLC station system with visual representation
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

        // Simple box for loop switch
        const boxGeometry = new THREE.BoxGeometry(1.2, 0.4, 0.8);
        const boxMesh = new THREE.Mesh(boxGeometry, this.materials.loopSwitch);
        boxMesh.position.set(0, 0.2, 0);
        group.add(boxMesh);

        // Station label
        this.addStationLabel(group, stationData);

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

        // Simple box for diverter
        const boxGeometry = new THREE.BoxGeometry(1.0, 0.4, 1.2);
        const boxMesh = new THREE.Mesh(boxGeometry, this.materials.diverter);
        boxMesh.position.set(0, 0.2, 0);
        group.add(boxMesh);

        // Station label
        this.addStationLabel(group, stationData);

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

        // Simple box for sensor
        const boxGeometry = new THREE.BoxGeometry(0.6, 0.4, 0.3);
        const boxMesh = new THREE.Mesh(boxGeometry, this.materials.sensor);
        boxMesh.position.set(0, 0.2, 0);
        group.add(boxMesh);

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
        const group = new THREE.Group();
        group.name = `FillReader_${stationData.plc_address}`;

        // Simple box for fill reader
        const boxGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.6);
        const boxMesh = new THREE.Mesh(boxGeometry, this.materials.fillReader);
        boxMesh.position.set(0, 0.2, 0);
        group.add(boxMesh);

        // Station label
        this.addStationLabel(group, stationData);

        // Store metadata
        group.userData = { 
            type: 'fill_reader', 
            plcAddress: stationData.plc_address,
            stationData: stationData,
            name: stationData.name
        };

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

        // Simple box for aisle entrance
        const boxGeometry = new THREE.BoxGeometry(1.5, 0.5, 0.8);
        const boxMesh = new THREE.Mesh(boxGeometry, new THREE.MeshLambertMaterial({ color: 0x3182CE }));
        boxMesh.position.set(0, 0.25, 0);
        group.add(boxMesh);

        // Station label
        this.addStationLabel(group, stationData);

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
        const group = new THREE.Group();
        group.name = `LiftStation_${stationData.plc_address}`;

        // Simple box for lift station
        const boxGeometry = new THREE.BoxGeometry(1.5, 0.4, 1.5);
        const boxMesh = new THREE.Mesh(boxGeometry, new THREE.MeshLambertMaterial({ color: 0x38B2AC }));
        boxMesh.position.set(0, 0.2, 0);
        group.add(boxMesh);

        // Station label
        this.addStationLabel(group, stationData);

        // Store metadata
        group.userData = { 
            type: 'lift_station', 
            plcAddress: stationData.plc_address,
            stationData: stationData,
            name: stationData.name
        };
        
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

        // Simple box for picking station
        const boxGeometry = new THREE.BoxGeometry(2.0, 0.4, 1.0);
        const boxMesh = new THREE.Mesh(boxGeometry, new THREE.MeshLambertMaterial({ color: 0xE53E3E }));
        boxMesh.position.set(0, 0.2, 0);
        group.add(boxMesh);

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
     * Adds direction indicators to station (simplified - no complex shapes)
     * @param {THREE.Group} group - Station group
     * @param {Object} stationData - Station configuration
     */
    addDirectionIndicators(_group, _stationData) {
        // Simplified - no complex arrow indicators
        return;
    }

    /**
     * Creates an arrow indicator (simplified - returns empty group)
     * @param {number} color - Arrow color
     * @param {string} type - Arrow type ('straight' or 'divert')
     * @returns {THREE.Group} Empty group
     */
    createArrow(_color, _type) {
        // Simplified - return empty group
        return new THREE.Group();
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
     * Adds base plate to station (simplified - no extra shapes)
     * @param {THREE.Group} group - Station group
     */
    addBasePlate(_group) {
        // Simplified - no base plate
        return;
    }

    /**
     * Adds scanning grid to fill reader (simplified - no complex shapes)
     * @param {THREE.Group} group - Fill reader group
     */
    addScanningGrid(_group) {
        // Simplified - no scanning grid
        return;
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
        const prezoneGroup = new THREE.Group();
        prezoneGroup.name = 'SRC_PLCPrezone';

        // Create all PLC stations with SRC analysis
    plcStations.forEach((stationData) => {
            // Analyze using SRC convention
            const analysis = this.analyzeStationAddress(stationData.plc_address);
            
            let stationMesh;

            // Create station based on SRC type
            switch (analysis.stationType) {
                case 'helper_station':
                    stationMesh = this.createLoopSwitch(stationData);
                    break;
                case 'aisle_entrance':
                    stationMesh = this.createAisleEntrance(stationData);
                    break;
                case 'lift_station':
                    stationMesh = this.createLiftStation(stationData);
                    break;
                case 'picking_diverter':
                    stationMesh = this.createDiverter(stationData);
                    break;
                case 'picking_station':
                    stationMesh = this.createPickingStation(stationData);
                    break;
                case 'lift_reading_point':
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
            
            prezoneGroup.add(stationMesh);
            
            this.stations.set(stationData.plc_address, {
                data: stationData,
                mesh: stationMesh,
                analysis: analysis
            });
        });

        // Generate conveyor connections
        this.generateConveyorConnections(plcStations, prezoneGroup);

        return prezoneGroup;
    }

    /**
     * Generates conveyor connections between stations
     * @param {Array} plcStations - PLC station configurations
     * @param {THREE.Group} prezoneGroup - Prezone group to add conveyors to
     */
    generateConveyorConnections(plcStations, _prezoneGroup) {
        const stationMap = new Map();
        plcStations.forEach(station => {
            stationMap.set(station.plc_address, station);
        });

        plcStations.forEach(station => {
            const _directions = station.directions;

            // Create straight path - DISABLED: Conveyors handled by createStationConnections
            /*
            if (directions.straight) {
                const targetStation = stationMap.get(directions.straight);
                if (targetStation) {
                    const conveyorSegment = this.createConveyorSegment(station, targetStation, 'straight');
                    prezoneGroup.add(conveyorSegment);
                }
            }

            // Create divert path - DISABLED: Conveyors handled by createStationConnections
            if (directions.divert) {
                const targetStation = stationMap.get(directions.divert);
                if (targetStation) {
                    const conveyorSegment = this.createConveyorSegment(station, targetStation, 'divert');
                    prezoneGroup.add(conveyorSegment);
                }
            }
            */
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
    updateStationState(plcAddress, _state) {
        const station = this.getStation(plcAddress);
        if (station) {
            // Update visual indicators based on state
        }
    }
}
