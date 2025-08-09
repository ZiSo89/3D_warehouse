
/* eslint-disable import/order, no-unused-vars */
import * as THREE from 'three';
import { UI_THEME } from '../ui/theme.js';

/**
 * Manages 3D animations for warehouse operations including container movement,
 * shuttle operations, and lift animations using Tween.js library.
 * @class AnimationManager
 */
export class AnimationManager {
    /**
     * Creates a new AnimationManager instance.
     * @param {SceneManager} sceneManager - The scene manager instance
     * @param {Object} [uiConfig] - Optional UI configuration object
     */
    constructor(sceneManager, _uiConfig) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.warehouseGroup = sceneManager.warehouseGroup;
        // Animation state
        this.isPlaying = false;
        this.animationContainer = null;
        this.isAnimating = false;
        this.tweenJs = null;
        // Animation groups for shuttles and lifts
        this.shuttleGroup = new THREE.Group();
        this.shuttleGroup.name = 'ShuttleGroup';
        this.liftGroup = new THREE.Group();
        this.liftGroup.name = 'LiftGroup';
        // Maps to store shuttles and lifts
        this.shuttles = new Map();
        this.lifts = new Map();
        this.loadTween();

        // Lighting for animation (ambient + directional)
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        this.directionalLight.position.set(10, 20, 10);
        this.directionalLight.castShadow = true;
        this.scene.add(this.ambientLight);
        this.scene.add(this.directionalLight);
    }

    async loadTween() {
        if (typeof window.TWEEN === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js';
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    this.tweenJs = window.TWEEN;
                    resolve();
                };
            });
        } else {
            this.tweenJs = window.TWEEN;
        }
    }

    createAnimationContainer() {
        if (this.animationContainer) {
            this.scene.remove(this.animationContainer);
        }

        // Use RoundedBoxGeometry if available, fallback to BoxGeometry
        let containerGeo;
        if (THREE.RoundedBoxGeometry) {
            containerGeo = new THREE.RoundedBoxGeometry(0.5, 0.3, 0.8, 4, 0.06);
        } else {
            containerGeo = new THREE.BoxGeometry(0.5, 0.3, 0.8);
        }

        // Optionally load brushed metal texture
        let metalTexture = null;
        if (THREE.TextureLoader) {
            // You can provide a valid path to a brushed metal texture if available
            // metalTexture = new THREE.TextureLoader().load(brushedMetalUrl);
        }

        const containerMat = new THREE.MeshPhysicalMaterial({
            color: UI_THEME.header || 0x3b82f6,
            metalness: 0.85,
            roughness: 0.32,
            clearcoat: 0.7,
            clearcoatRoughness: 0.18,
            reflectivity: 0.7,
            transmission: 0.0,
            ior: 1.45,
            emissive: 0x0a0a1a,
            emissiveIntensity: 0.18,
            map: metalTexture || null
        });

        this.animationContainer = new THREE.Mesh(containerGeo, containerMat);
        this.animationContainer.castShadow = true;
        this.animationContainer.receiveShadow = true;
        this.scene.add(this.animationContainer);
        return this.animationContainer;
    }

    async startContainerAnimation(uiConfig) {
        if (this.isAnimating) {
            this.stopAnimation();
        }

        if (!this.tweenJs) {
            await this.loadTween();
        }

        this.isAnimating = true;
        this.createAnimationContainer();

        // Use correct constants for positioning (matching the warehouse layout)
        const moduleLength = uiConfig.locations_per_module * 1.2; // constants.locationLength
        const totalRackDepth = uiConfig.storage_depth * 0.8; // constants.locationDepth
        const rackAndAisleWidth = (totalRackDepth * 2) + 2.5; // constants.aisleWidth
    const _prezoneOffset = totalRackDepth + 5; // unused placeholder retained

        // Get warehouse group offset
        const warehouseOffset = this.warehouseGroup.position;

        // Calculate positions based on actual warehouse structure
        const targetAisle = Math.floor(uiConfig.aisles / 2);
        const aisleCenterX = targetAisle * rackAndAisleWidth + totalRackDepth + 1.25 + warehouseOffset.x;
    // Center module reference (unused in current animation path kept for future)
    const _startModuleZ = Math.floor(uiConfig.modules_per_aisle / 2) * moduleLength;
    const prezoneZ = -_prezoneOffset + warehouseOffset.z;

        // Starting position (picking station in prezone) - FIXED CALCULATION
        const stationWidth = 2.5;
        const totalPrezoneWidth = uiConfig.picking_stations * (stationWidth + 1);
        const startStationIndex = 1; // Use middle picking station
        const startPos = { 
            x: startStationIndex * (stationWidth + 1) - totalPrezoneWidth / 2 + stationWidth / 2 + warehouseOffset.x,
            y: 1.15, // conveyorHeight + container height
            z: prezoneZ 
        };

        // Debug: Equipment alignment analysis
        // console.log("� === EQUIPMENT ALIGNMENT ANALYSIS ===");
        this.logEquipmentPositions(uiConfig, warehouseOffset, targetAisle, aisleCenterX);

        this.animationContainer.position.set(startPos.x, startPos.y, startPos.z);

        // Use existing calculations and update target settings
        const targetLevel = 0; // First level
        const levelY = (targetLevel * 1.0) + (1.0 / 2); // EXACT shuttle Y calculation
        
        // EXACT lift position (from createLifts method) - using targetAisle=0 for simplicity
        const liftX = 0 * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25 + warehouseOffset.x;
        const liftZ = 0.5 + warehouseOffset.z;
        
        // EXACT shuttle position (from createShuttles method)  
        const shuttleX = 0 * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25 + warehouseOffset.x;
        const shuttleZ = 5 + warehouseOffset.z;

        // Module calculations for target position
        const targetModule = 3;
        const targetModuleZ = targetModule * moduleLength + moduleLength / 2 + warehouseOffset.z;

        // Use EXACT equipment positions for animation
        this.executeAnimationWithEquipmentPositions(uiConfig, {
            warehouseOffset,
            liftX,
            liftZ,
            shuttleX,
            shuttleZ,
            startPos,
            levelY,
            targetModuleZ
        });
    }

    executeAnimationWithEquipmentPositions(uiConfig, positions) {

        // Show all lifts and shuttles
        for (const lift of this.lifts.values()) {
            lift.visible = true;
        }
        for (const shuttle of this.shuttles.values()) {
            shuttle.visible = true;
        }

        const { warehouseOffset, liftX, liftZ, shuttleX, shuttleZ, startPos, levelY, targetModuleZ } = positions;

        // STEP 1: Move from picking station to cross-conveyor (Y should be on conveyor)
        const conveyorY = 0.85; // Standard conveyor height
        const crossConveyorZ = 1 + warehouseOffset.z;



        // STEP 1: Move a bit forward from picking station (Z direction)
        const frontOffset = 1.0; // Move 1 unit forward
        const stepFront = {
            x: startPos.x,
            y: conveyorY,
            z: startPos.z + frontOffset
        };

        // STEP 2: Move left (X direction) to align with lift (Z stays at new front position)
        const stepLeft = {
            x: liftX,
            y: conveyorY,
            z: startPos.z + frontOffset
        };

        // STEP 3: Move straight (Z direction) to the cross-conveyor/lift (X stays)
        const stepCrossConveyor = {
            x: liftX,
            y: conveyorY,
            z: crossConveyorZ
        };

        // STEP 4: Move straight (Z direction) to the lift (X stays)
        const stepLift = {
            x: liftX,
            y: conveyorY,
            z: liftZ
        };

        // STEP 4: Lift up to a higher level (e.g., level 3)
        // Use higherLevelY for the lift and container
        const higherLevelY = 2.5; // Change this value for desired lift height
        const step4 = {
            x: liftX,
            y: higherLevelY,
            z: liftZ
        };

        // STEP 5: Shuttle from the same level moves to lift to pick up container
        // Find the shuttle at the same aisle and at higherLevelY
        let activeShuttle = null;
        for (const shuttle of this.shuttles.values()) {
            if (
                Math.abs(shuttle.position.x - liftX) < 0.1 &&
                Math.abs(shuttle.position.y - higherLevelY) < 0.1
            ) {
                activeShuttle = shuttle;
                break;
            }
        }

        const step5 = {
            x: liftX,
            y: higherLevelY,
            z: liftZ
        };

        // STEP 6: Shuttle carries container to target module
        const step6 = {
            x: shuttleX,
            y: higherLevelY,
            z: targetModuleZ
        };

        // STEP 7: Place in rack storage
        const storageX = shuttleX - (uiConfig.storage_depth * 0.8 * 0.7);
        const step7 = {
            x: storageX,
            y: higherLevelY,
            z: targetModuleZ
        };

        // Find the lift and shuttle that need to move

        const activeLift = Array.from(this.lifts.values()).find(lift =>
            Math.abs(lift.position.x - liftX) < 0.1 && Math.abs(lift.position.z - liftZ) < 0.1
        );

        // Show only the active lift and shuttle
        if (activeLift) activeLift.visible = true;
        if (activeShuttle) activeShuttle.visible = true;

        // Create the container for animation

        // Create tweens with position logging

        // Define steps array for dynamic tween creation
        const steps = [
            { name: 'Front', to: stepFront, duration: 1000 },
            { name: 'Left', to: stepLeft, duration: 1200 },
            { name: 'CrossConveyor', to: stepCrossConveyor, duration: 2000 },
            { name: 'Lift', to: stepLift, duration: 1800 },
            { name: 'LiftUp', to: step4, duration: 2200 },
            { name: 'ShuttlePickup', to: step5, duration: 1500 },
            { name: 'ShuttleMove', to: step6, duration: 3200 },
            { name: 'Storage', to: step7, duration: 1500 }
        ];

        // Create tweens dynamically and chain them

        let prevTween = null;
        const tweens = [];
        let tweenLiftUpLift = null;
        let tween5Shuttle = null;
        let tween6Shuttle = null;
        steps.forEach((step, idx) => {
            let easingFn = this.tweenJs.Easing.Quadratic.InOut;
            if (step.name === 'LiftUp') easingFn = this.tweenJs.Easing.Sinusoidal.InOut;
            if (step.name === 'Storage') easingFn = this.tweenJs.Easing.Quadratic.Out;

            // STEP 4: LiftUp - animate lift and container together
            if (step.name === 'LiftUp' && activeLift) {
                tweenLiftUpLift = new this.tweenJs.Tween(activeLift.position)
                    .to({ x: liftX, y: higherLevelY, z: liftZ }, step.duration)
                    .easing(this.tweenJs.Easing.Sinusoidal.InOut)
                    // .onUpdate(() => {
                    //     const pos = activeLift.position;
                    //     console.log(`🔄 LIFT Update: X=${pos.x.toFixed(2)}, Y=${pos.y.toFixed(2)}, Z=${pos.z.toFixed(2)}`);
                    // })
                    // .onComplete(() => {
                    //     const pos = activeLift.position;
                    //     console.log(`🏗️ LIFT Complete: X=${pos.x.toFixed(2)}, Y=${pos.y.toFixed(2)}, Z=${pos.z.toFixed(2)}`);
                    // });
            }

            // STEP 5: ShuttlePickup - animate shuttle moving to lift
            if (step.name === 'ShuttlePickup' && activeShuttle) {
                tween5Shuttle = new this.tweenJs.Tween(activeShuttle.position)
                    .to({ x: liftX, y: higherLevelY, z: liftZ }, step.duration)
                    .easing(this.tweenJs.Easing.Quadratic.InOut)
                    .onComplete(() => {
                        // Shuttle pickup complete
                    });
            }

            // STEP 6: ShuttleMove - animate shuttle and container together
            if (step.name === 'ShuttleMove' && activeShuttle) {
                tween6Shuttle = new this.tweenJs.Tween(activeShuttle.position)
                    .to({ x: shuttleX, y: higherLevelY, z: targetModuleZ }, step.duration)
                    .easing(this.tweenJs.Easing.Quadratic.InOut);
            }

            const tween = new this.tweenJs.Tween(this.animationContainer.position)
                .to(step.to, step.duration)
                .easing(easingFn)
                // .onUpdate(() => {
                //     const pos = this.animationContainer.position;
                //     console.log(`🔄 STEP ${idx + 1} (${step.name}) Update: X=${pos.x.toFixed(2)}, Y=${pos.y.toFixed(2)}, Z=${pos.z.toFixed(2)}`);
                // })
                // .onComplete(() => {
                //     const pos = this.animationContainer.position;
                //     console.log(`✅ STEP ${idx + 1} (${step.name}) Complete: X=${pos.x.toFixed(2)}, Y=${pos.y.toFixed(2)}, Z=${pos.z.toFixed(2)}`);
                // });
            tweens.push(tween);
            if (prevTween) prevTween.chain(tween);
            prevTween = tween;
        });

        // Final step: Place in storage
        tweens[tweens.length - 1].onComplete(() => {
            // Animation complete
            this.isAnimating = false;
            // Reset container to default position
            if (this.animationContainer && startPos) {
                this.animationContainer.position.set(startPos.x, startPos.y, startPos.z);
            }
            // Reset lifts to their home positions
            for (const lift of this.lifts.values()) {
                if (lift.userData && lift.userData.homePosition) {
                    lift.position.copy(lift.userData.homePosition);
                }
            }
            // Reset shuttles to their home positions
            for (const shuttle of this.shuttles.values()) {
                if (shuttle.userData && shuttle.userData.homePosition) {
                    shuttle.position.copy(shuttle.userData.homePosition);
                }
            }
        });

        // Start animation sequence
        tweens[0].start();

        // STEP 4: Start lift up with container
        if (tweenLiftUpLift) {
            tweens[4].onStart(() => {
                setTimeout(() => tweenLiftUpLift.start(), 0);
            });
        }

        // STEP 5: Start shuttle pickup with container
        if (tween5Shuttle) {
            tweens[5].onStart(() => {
                setTimeout(() => tween5Shuttle.start(), 0);
            });
        }

        // STEP 6: Start shuttle move with container
        if (tween6Shuttle) {
            tweens[6].onStart(() => {
                setTimeout(() => tween6Shuttle.start(), 0);
            });
        }
    }

    logEquipmentPositions(uiConfig, warehouseOffset, targetAisle, aisleCenterX, prezoneOffset) {
        // Log Picking Stations (from prezone) - FIXED CALCULATION
        const stationWidth = 2.5;
        const totalPrezoneWidth = uiConfig.picking_stations * (stationWidth + 1);
        for (let i = 0; i < uiConfig.picking_stations; i++) {
            const stationX = i * (stationWidth + 1) - totalPrezoneWidth / 2 + stationWidth / 2 + warehouseOffset.x;
        }        // Log Cross-Conveyor position
        const crossConveyorZ = 1 + warehouseOffset.z;

        // Log Main Conveyors
        const rackAndAisleWidth = (uiConfig.storage_depth * 0.8 * 2) + 2.5;
        const totalRackDepth = uiConfig.storage_depth * 0.8;
        const conveyorLength = totalRackDepth + 5;
        
        for (let a = 0; a < uiConfig.aisles; a++) {
            const conveyorX = a * rackAndAisleWidth + totalRackDepth + 1.25 + warehouseOffset.x;
            const conveyorStartZ = 1 + warehouseOffset.z;
            const conveyorEndZ = conveyorLength + 1 + warehouseOffset.z;
        }

        // Log Lifts
        for (let a = 0; a < uiConfig.aisles; a++) {
            const liftX = a * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25 + warehouseOffset.x;
            const liftZ = 0.5 + warehouseOffset.z;
        }

        // Log Shuttles for target aisle
        const shuttleX = targetAisle * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25 + warehouseOffset.x;
        const shuttleZ = 5 + warehouseOffset.z;
        const levels = uiConfig.levels_per_aisle[targetAisle];
        
        for (let l = 0; l < Math.min(levels, 3); l++) {
            const levelY = (l * 1.0) + (1.0 / 2);
        }

        // Equipment alignment verification
        // Check if container targets match equipment positions
        const expectedLiftX = targetAisle * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25 + warehouseOffset.x;
        const alignmentCheck = Math.abs(aisleCenterX - expectedLiftX) < 0.1;
        // console.log(`✅ Container X alignment with equipment: ${alignmentCheck ? 'ALIGNED' : 'MISALIGNED'}`);
        // console.log(`📏 Container X: ${aisleCenterX.toFixed(2)} vs Equipment X: ${expectedLiftX.toFixed(2)}`);
    }

    executeAnimationSequence(uiConfig, dimensions) {
        const { targetAisle, aisleCenterX, startModuleZ, prezoneZ, moduleLength, totalRackDepth, warehouseOffset } = dimensions;

        // STEP 1: Move from picking station to conveyor (behind picking station)
        const step1 = { 
            x: 0 + warehouseOffset.x, 
            y: 1.15, 
            z: prezoneZ + 2 // Move behind picking station to conveyor
        };

        // STEP 2: Move along cross-conveyor to correct aisle
        const step2 = { 
            x: aisleCenterX, 
            y: 1.15, 
            z: prezoneZ + 2 // Stay on conveyor level
        };

        // STEP 3: Move towards lift (where conveyors end)
        const liftZ = 0.5 + warehouseOffset.z; // Lift position we set earlier
        const step3 = { 
            x: aisleCenterX, 
            y: 1.15, 
            z: liftZ // Move to lift position
        };

        // STEP 4: Lift up to target level
        const targetLevel = Math.min(Math.floor(uiConfig.levels_per_aisle[targetAisle] * 0.6), 3) || 1;
        const levelY = (targetLevel * 1.0) + (1.0 / 2); // Match shuttle height calculation
        const step4 = { 
            x: aisleCenterX, 
            y: levelY, 
            z: liftZ // Lift up at same position
        };

        // STEP 5: Transfer to shuttle (move into aisle)
        const shuttleZ = 5 + warehouseOffset.z; // Shuttle position we set earlier
        const step5 = { 
            x: aisleCenterX, 
            y: levelY, 
            z: shuttleZ // Move to shuttle
        };

        // STEP 6: Shuttle moves to target module
        const targetModule = Math.floor(uiConfig.modules_per_aisle * 0.7);
        const targetModuleZ = targetModule * moduleLength + moduleLength / 2 + warehouseOffset.z;
        const step6 = { 
            x: aisleCenterX, 
            y: levelY, 
            z: targetModuleZ // Shuttle along aisle
        };

        // STEP 7: Place in rack (extend into storage)
        const rackX = aisleCenterX - (totalRackDepth * 0.7); // Into rack
        const step7 = { 
            x: rackX, 
            y: levelY, 
            z: targetModuleZ // Final storage position
        };

        // Create tweens with minimal logging
        const tween1 = new this.tweenJs.Tween(this.animationContainer.position)
            .to(step1, 2000)
            .easing(this.tweenJs.Easing.Quadratic.InOut);

        const tween2 = new this.tweenJs.Tween(this.animationContainer.position)
            .to(step2, 2500)
            .easing(this.tweenJs.Easing.Quadratic.InOut);

        const tween3 = new this.tweenJs.Tween(this.animationContainer.position)
            .to(step3, 1800)
            .easing(this.tweenJs.Easing.Quadratic.InOut);

        const tween4 = new this.tweenJs.Tween(this.animationContainer.position)
            .to(step4, 2200)
            .easing(this.tweenJs.Easing.Sinusoidal.InOut);

        const tween5 = new this.tweenJs.Tween(this.animationContainer.position)
            .to(step5, 1500)
            .easing(this.tweenJs.Easing.Quadratic.InOut);

        const tween6 = new this.tweenJs.Tween(this.animationContainer.position)
            .to(step6, 3200)
            .easing(this.tweenJs.Easing.Quadratic.InOut);

        const tween7 = new this.tweenJs.Tween(this.animationContainer.position)
            .to(step7, 1500)
            .easing(this.tweenJs.Easing.Quadratic.Out)
            .onComplete(() => {
                this.isAnimating = false;
            });

        // Chain the tweens
        tween1.chain(tween2);
        tween2.chain(tween3);
        tween3.chain(tween4);
        tween4.chain(tween5);
        tween5.chain(tween6);
        tween6.chain(tween7);

        // Start animation
        tween1.start();
    }

    stopAnimation() {
        if (this.tweenJs) {
            this.tweenJs.removeAll();
        }

        // Reset container to default position if exists
        if (this.animationContainer && this.lastStartPos) {
            this.animationContainer.position.set(this.lastStartPos.x, this.lastStartPos.y, this.lastStartPos.z);
        }

        // Reset lifts to their home positions
        for (const lift of this.lifts.values()) {
            if (lift.userData && lift.userData.homePosition) {
                lift.position.copy(lift.userData.homePosition);
            }
        }
        // Reset shuttles to their home positions
        for (const shuttle of this.shuttles.values()) {
            if (shuttle.userData && shuttle.userData.homePosition) {
                shuttle.position.copy(shuttle.userData.homePosition);
            }
        }

        if (this.animationContainer) {
            this.scene.remove(this.animationContainer);
            this.animationContainer = null;
        }

        this.isAnimating = false;
        // Store start position for reset on stop
        // positions variable not defined here originally; guard previous start position instead
        if (this.lastStartPos) {
            // keep stored starting point
        }
    }

    update() {
        if (this.tweenJs && this.isAnimating) {
            this.tweenJs.update();
        }
    }

    // Create animated shuttles and lifts for the warehouse
    createAnimatedEquipment(uiConfig) {        
        // Clear existing equipment
        this.shuttles.clear();
        this.lifts.clear();
        
        // Remove old groups from scene
        this.scene.remove(this.shuttleGroup);
        this.scene.remove(this.liftGroup);
        
        // Create new groups
        this.shuttleGroup = new THREE.Group();
        this.shuttleGroup.name = 'ShuttleGroup';
        this.liftGroup = new THREE.Group();
        this.liftGroup.name = 'LiftGroup';
        
        // Get warehouse offset
        const warehouseOffset = this.warehouseGroup.position;
        
        // Create shuttles for each aisle and level
        this.createShuttles(uiConfig, warehouseOffset);
        
        // Create lifts for each aisle
        this.createLifts(uiConfig, warehouseOffset);
        
        // Add groups to scene
        this.scene.add(this.shuttleGroup);
        this.scene.add(this.liftGroup);
        
        // console.log(`🤖 Created ${this.shuttles.size} shuttles and ${this.lifts.size} lifts`);
    }

    createShuttles(uiConfig, warehouseOffset) {
        const rackAndAisleWidth = (uiConfig.storage_depth * 0.8 * 2) + 2.5;
        for (let a = 0; a < uiConfig.aisles; a++) {
            const levels = uiConfig.levels_per_aisle[a];
            for (let l = 0; l < levels; l++) {
                const shuttleId = `${a}_${l}`;
                // Use RoundedBoxGeometry if available
                let shuttleGeometry;
                if (THREE.RoundedBoxGeometry) {
                    shuttleGeometry = new THREE.RoundedBoxGeometry(0.8, 0.3, 1.2, 4, 0.08);
                } else {
                    shuttleGeometry = new THREE.BoxGeometry(0.8, 0.3, 1.2);
                }
                // Optionally load brushed metal texture
                let metalTexture = null;
                if (THREE.TextureLoader) {
                    // metalTexture = new THREE.TextureLoader().load(brushedMetalUrl);
                }
                // Use a lighter color from UI_THEME for the shuttle
                const lightShuttleColor = UI_THEME.toggleBg || '#b7b7a4';
                const shuttleMaterial = new THREE.MeshPhysicalMaterial({
                    color: lightShuttleColor,
                    metalness: 0.92,
                    roughness: 0.22,
                    clearcoat: 0.7,
                    clearcoatRoughness: 0.13,
                    reflectivity: 0.7,
                    transmission: 0.0,
                    ior: 1.45,
                    emissive: 0x220000,
                    emissiveIntensity: 0.22,
                    map: metalTexture || null
                });
                const shuttle = new THREE.Mesh(shuttleGeometry, shuttleMaterial);
                shuttle.castShadow = true;
                shuttle.receiveShadow = true;
                // Position shuttle in the aisle
                const aisleX = a * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25 + warehouseOffset.x;
                const levelY = (l * 1.0) + (1.0 / 2);
                const shuttleZ = 5 + warehouseOffset.z;
                shuttle.position.set(aisleX, levelY, shuttleZ);
                shuttle.userData = {
                    type: 'shuttle',
                    aisleId: a,
                    level: l,
                    id: shuttleId,
                    homePosition: new THREE.Vector3(aisleX, levelY, shuttleZ),
                    isMoving: false,
                    targetPosition: null,
                    speed: 2.0
                };
                shuttle.name = `Shuttle_${a}_${l}`;
                this.shuttleGroup.add(shuttle);
                this.shuttles.set(shuttleId, shuttle);
            }
        }
    }

    createLifts(uiConfig, warehouseOffset) {
        const rackAndAisleWidth = (uiConfig.storage_depth * 0.8 * 2) + 2.5;
        for (let a = 0; a < uiConfig.aisles; a++) {
            const liftId = `lift_${a}`;
            // Use RoundedBoxGeometry if available
            let liftGeometry;
            if (THREE.RoundedBoxGeometry) {
                liftGeometry = new THREE.RoundedBoxGeometry(0.6, 1.8, 0.6, 4, 0.08);
            } else {
                liftGeometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
            }
            // Optionally load brushed metal texture
            let metalTexture = null;
            if (THREE.TextureLoader) {
                // metalTexture = new THREE.TextureLoader().load(brushedMetalUrl);
            }
            const liftMaterial = new THREE.MeshPhysicalMaterial({
                color: UI_THEME.toggleBg || 0xffd700,
                metalness: 0.95,
                roughness: 0.18,
                clearcoat: 0.8,
                clearcoatRoughness: 0.12,
                reflectivity: 0.8,
                transmission: 0.0,
                ior: 1.45,
                emissive: 0x222200,
                emissiveIntensity: 0.18,
                map: metalTexture || null
            });
            const lift = new THREE.Mesh(liftGeometry, liftMaterial);
            lift.castShadow = true;
            lift.receiveShadow = true;
            // Position lift CLOSE TO PREZONE, before OSR (negative Z direction)
            const liftX = a * rackAndAisleWidth + (uiConfig.storage_depth * 0.8) + 1.25 + warehouseOffset.x;
            const liftY = 1.0;
            const liftZ = 0.5 + warehouseOffset.z;
            lift.position.set(liftX, liftY, liftZ);
            lift.userData = {
                type: 'lift',
                aisleId: a,
                id: liftId,
                homePosition: new THREE.Vector3(liftX, liftY, liftZ),
                isMoving: false,
                targetPosition: null,
                speed: 1.5,
                currentLevel: 0
            };
            lift.name = `Lift_${a}`;
            this.liftGroup.add(lift);
            this.lifts.set(liftId, lift);
        }
    }

    /**
     * Animates the telescopic arms of a shuttle for pick/place operations
     * @param {THREE.Group} shuttleObject - The shuttle group object
     * @param {string} action - 'pick' or 'place'
     * @returns {Promise} Promise that resolves when animation completes
     */
    async animateShuttleArms(shuttleObject, action = 'pick') {
        if (!shuttleObject || shuttleObject.userData.type !== 'shuttle') {
            console.warn('Invalid shuttle object for arm animation');
            return;
        }

        // Find the telescopic arms in the shuttle group
        const arm1 = shuttleObject.getObjectByName('telescopicArm1');
        const arm2 = shuttleObject.getObjectByName('telescopicArm2');

        if (!arm1 || !arm2) {
            console.warn('Telescopic arms not found in shuttle object');
            return;
        }

        // Wait for TWEEN.js to be loaded
        await this.loadTween();
        if (!this.tweenJs) {
            console.warn('TWEEN.js not available for arm animation');
            return;
        }

        // Store original positions
        const originalArm1Z = arm1.position.z;
        const originalArm2Z = arm2.position.z;

        // Animation parameters
        const extensionDistance = 0.3; // How far the arms extend
        const animationDuration = 500; // Duration in milliseconds

        // Update shuttle status
        const originalStatus = shuttleObject.userData.status;
        shuttleObject.userData.status = action === 'pick' ? 'Picking' : 'Placing';

        return new Promise((resolve) => {
            // Extend arms animation
            const extendTween = new this.tweenJs.Tween({ z: originalArm1Z })
                .to({ z: originalArm1Z + extensionDistance }, animationDuration)
                .easing(this.tweenJs.Easing.Quadratic.Out)
                .onUpdate((coords) => {
                    arm1.position.z = coords.z;
                    arm2.position.z = coords.z;
                })
                .onComplete(() => {
                    // Hold extended position briefly
                    setTimeout(() => {
                        // Retract arms animation
                        const retractTween = new this.tweenJs.Tween({ z: originalArm1Z + extensionDistance })
                            .to({ z: originalArm1Z }, animationDuration)
                            .easing(this.tweenJs.Easing.Quadratic.In)
                            .onUpdate((coords) => {
                                arm1.position.z = coords.z;
                                arm2.position.z = coords.z;
                            })
                            .onComplete(() => {
                                // Restore original status
                                shuttleObject.userData.status = originalStatus;
                                // console.log(`🦾 Shuttle arm animation complete: ${action}`);
                                resolve();
                            });
                        retractTween.start();
                    }, 300); // Hold for 300ms
                });

            extendTween.start();
            // console.log(`🦾 Animating shuttle arms: ${action}`);
        });
    }
}