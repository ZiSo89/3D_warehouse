import * as THREE from 'three';
import { Container } from './Container.js';
import { CoordinatedOperations } from './CoordinatedOperations.js';

export class AnimationManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.warehouseGroup = sceneManager.warehouseGroup;
        
        // Animation state
        this.isPlaying = false;
        this.speed = 1.0;
        this.clock = new THREE.Clock();
        
        // Container management
        this.containers = new Map(); // ID -> Container
        this.containerPool = []; // Reusable containers
        this.activeAnimations = new Set();
        this.operationQueue = [];
        
        // Animation groups for organization
        this.shuttleGroup = new THREE.Group();
        this.shuttleGroup.name = 'ShuttleGroup';
        this.liftGroup = new THREE.Group();
        this.liftGroup.name = 'LiftGroup';
        this.conveyorGroup = new THREE.Group();
        this.conveyorGroup.name = 'ConveyorGroup';

        // Ensure groups are added to warehouse group
        if (!this.warehouseGroup.children.includes(this.shuttleGroup)) {
            this.warehouseGroup.add(this.shuttleGroup);
        }
        if (!this.warehouseGroup.children.includes(this.liftGroup)) {
            this.warehouseGroup.add(this.liftGroup);
        }
        if (!this.warehouseGroup.children.includes(this.conveyorGroup)) {
            this.warehouseGroup.add(this.conveyorGroup);
        }
        
        // Warehouse configuration (will be set by buildAnimationSystem)
        this.warehouseConfig = null;
        this.shuttles = new Map(); // aisleId_level -> shuttle mesh
        this.lifts = new Map(); // aisleId -> lift mesh
        
        // Coordinated operations only
        this.coordinatedOperations = new CoordinatedOperations(this);
        
        this.init();
    }

    init() {
        this.createAnimationControls();
        console.log('AnimationManager initialized');
    }

    buildAnimationSystem(warehouseConfig) {
        this.warehouseConfig = warehouseConfig;
        console.log('Building animation system for warehouse config:', warehouseConfig);
        
        // Ensure animation groups are properly connected to scene
        if (!this.warehouseGroup.children.includes(this.shuttleGroup)) {
            this.warehouseGroup.add(this.shuttleGroup);
        }
        if (!this.warehouseGroup.children.includes(this.liftGroup)) {
            this.warehouseGroup.add(this.liftGroup);
        }
        if (!this.warehouseGroup.children.includes(this.conveyorGroup)) {
            this.warehouseGroup.add(this.conveyorGroup);
        }
        
        // Clear existing animations
        this.stop();
        this.clearAllAnimations();
        
        // Create animated shuttles and lifts with simple positioning
        this.createAnimatedShuttles();
        this.createAnimatedLifts();
        this.createAnimatedConveyors();
        
        console.log('Animation system built successfully');
        console.log('Lifts created:', Array.from(this.lifts.keys()));
        console.log('Shuttles created:', Array.from(this.shuttles.keys()));
    }

    createAnimatedShuttles() {
        // Find existing rack structures to position shuttles correctly
        const rackGroups = [];
        this.warehouseGroup.traverse(child => {
            if (child.name && child.name.includes('rack')) {
                rackGroups.push(child);
            }
        });

        // Create shuttles based on warehouse config
        for (let a = 0; a < this.warehouseConfig.aisles; a++) {
            const levels = this.warehouseConfig.levels_per_aisle[a];
            
            for (let l = 0; l < levels; l++) {
                const shuttleId = `${a}_${l}`;
                
                // Create shuttle mesh
                const shuttleGeometry = new THREE.BoxGeometry(0.8, 0.3, 1.2);
                const shuttleMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0xdc143c,
                    metalness: 0.3,
                    roughness: 0.7,
                    emissive: 0x220000
                });
                
                const shuttle = new THREE.Mesh(shuttleGeometry, shuttleMaterial);
                shuttle.castShadow = true;
                shuttle.receiveShadow = true;
                
                // Position shuttle inside the aisle at proper level
                // Use simple positioning that works with the existing warehouse layout
                const aisleX = -5 + (a * 8); // Simple X spacing between aisles
                const levelY = 1.5 + (l * 2.5); // Level height
                const shuttleZ = 5; // Inside the aisle area
                
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
                
                this.shuttleGroup.add(shuttle);
                shuttle.name = `Shuttle_${a}_${l}`;
                this.shuttles.set(shuttleId, shuttle);
                
                console.log(`Created shuttle ${shuttleId} at position:`, shuttle.position);
            }
        }
    }

    createAnimatedLifts() {
        // Create only 3 lifts positioned in the prezone area
        const maxLifts = 3;
        
        for (let a = 0; a < maxLifts; a++) {
            const liftId = `lift_${a}`;
            
            // Create lift mesh
            const liftGeometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
            const liftMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffd700,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x222200
            });
            
            const lift = new THREE.Mesh(liftGeometry, liftMaterial);
            lift.castShadow = true;
            lift.receiveShadow = true;
            
            // Position lifts in prezone area with simple, working coordinates
            const liftX = -5 + (a * 8); // Align with aisles
            const liftY = 1.0;
            const liftZ = -15; // In prezone area
            
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
            
            this.liftGroup.add(lift);
            lift.name = `Lift_${a}`;
            this.lifts.set(liftId, lift);
            
            console.log(`Created lift ${liftId} at position:`, lift.position);
        }
    }

    createAnimatedConveyors() {
        // Add animated elements to existing conveyor system
        // This will be enhanced in later steps
        console.log('Conveyor animation system ready');
    }

    createContainer(id, type = 'standard') {
        let container;
        
        // Try to reuse from pool
        if (this.containerPool.length > 0) {
            container = this.containerPool.pop();
            container.reset(id, type);
        } else {
            container = new Container(id, type);
            this.scene.add(container.mesh);
        }
        
        this.containers.set(id, container);
        return container;
    }

    removeContainer(id) {
        const container = this.containers.get(id);
        if (container) {
            this.containers.delete(id);
            container.hide();
            this.containerPool.push(container); // Return to pool
        }
    }

    // Animation Control Methods
    play() {
        this.isPlaying = true;
        this.clock.start();
        console.log('Animation system started');
    }

    pause() {
        this.isPlaying = false;
        console.log('Animation system paused');
    }

    stop() {
        this.isPlaying = false;
        this.clock.stop();
        this.coordinatedOperations.stopAllOperations();
        this.clearAllAnimations();
        
        // Update button states
        const coordinatedBtn = document.getElementById('coordinated-btn');
        if (coordinatedBtn) {
            coordinatedBtn.textContent = '🏭 OSR Operations';
            coordinatedBtn.classList.remove('active');
        }
        
        console.log('Animation system stopped');
    }

    setSpeed(speed) {
        this.speed = Math.max(0.1, Math.min(5.0, speed));
        console.log(`Animation speed set to: ${this.speed}x`);
    }

    clearAllAnimations() {
        this.activeAnimations.clear();
        this.operationQueue = [];
        
        // Reset all shuttles to home position
        this.shuttles.forEach(shuttle => {
            shuttle.position.copy(shuttle.userData.homePosition);
            shuttle.userData.isMoving = false;
            shuttle.userData.targetPosition = null;
        });
        
        // Reset all lifts to home position
        this.lifts.forEach(lift => {
            lift.position.copy(lift.userData.homePosition);
            lift.userData.isMoving = false;
            lift.userData.targetPosition = null;
            lift.userData.currentLevel = 0;
        });
        
        // Hide all containers
        this.containers.forEach(container => container.hide());
    }

    update() {
        if (!this.isPlaying) return;
        
        const deltaTime = this.clock.getDelta() * this.speed;
        
        // Update all active animations
        this.updateShuttleAnimations(deltaTime);
        this.updateLiftAnimations(deltaTime);
        this.updateContainerAnimations(deltaTime);
        
        // Process operation queue
        this.processOperationQueue();
    }

    updateShuttleAnimations(deltaTime) {
        this.shuttles.forEach(shuttle => {
            if (shuttle.userData.isMoving && shuttle.userData.targetPosition) {
                const current = shuttle.position;
                const target = shuttle.userData.targetPosition;
                const distance = current.distanceTo(target);
                
                if (distance < 0.1) {
                    // Reached target
                    shuttle.position.copy(target);
                    shuttle.userData.isMoving = false;
                    shuttle.userData.targetPosition = null;
                    console.log(`Shuttle ${shuttle.userData.id} reached target`);
                } else {
                    // Move towards target
                    const direction = target.clone().sub(current).normalize();
                    const moveDistance = shuttle.userData.speed * deltaTime;
                    current.add(direction.multiplyScalar(Math.min(moveDistance, distance)));
                }
            }
        });
    }

    updateLiftAnimations(deltaTime) {
        this.lifts.forEach(lift => {
            if (lift.userData.isMoving && lift.userData.targetPosition) {
                const current = lift.position;
                const target = lift.userData.targetPosition;
                const distance = Math.abs(current.y - target.y);
                
                if (distance < 0.1) {
                    // Reached target
                    lift.position.copy(target);
                    lift.userData.isMoving = false;
                    lift.userData.targetPosition = null;
                    console.log(`Lift ${lift.userData.id} reached level ${lift.userData.currentLevel}`);
                } else {
                    // Move towards target
                    const direction = Math.sign(target.y - current.y);
                    const moveDistance = lift.userData.speed * deltaTime;
                    current.y += direction * Math.min(moveDistance, distance);
                }
            }
        });
    }

    updateContainerAnimations(deltaTime) {
        this.containers.forEach(container => {
            container.update(deltaTime);
        });
    }

    processOperationQueue() {
        // Process queued operations (will be implemented in next steps)
        if (this.operationQueue.length > 0) {
            // Implementation in Phase 3
        }
    }

    createAnimationControls() {
        // Create UI controls for animation system
        const controlsPanel = document.createElement('div');
        controlsPanel.id = 'animation-controls';
        controlsPanel.innerHTML = `
            <div class="animation-header">
                <h3>🎬 Animation Controls</h3>
            </div>
            
            <div class="animation-buttons">
                <button id="play-btn" class="anim-btn">▶️ Play</button>
                <button id="pause-btn" class="anim-btn">⏸️ Pause</button>
                <button id="stop-btn" class="anim-btn">⏹️ Stop</button>
            </div>
            
            <div class="demo-controls">
                <button id="coordinated-btn" class="anim-btn demo-btn">🏭 OSR Operations</button>
            </div>
            
            <div class="animation-controls">
                <label>Speed: <span id="speed-value">1.0x</span></label>
                <input type="range" id="speed-slider" min="0.1" max="3.0" step="0.1" value="1.0">
            </div>
            
            <div class="animation-info">
                <div>Active: <span id="active-count">0</span></div>
                <div>Queued: <span id="queue-count">0</span></div>
            </div>
        `;
        
        document.body.appendChild(controlsPanel);
        this.addAnimationStyles();
        this.bindAnimationEvents();
    }

    addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #animation-controls {
                position: fixed;
                top: 320px;
                left: 20px;
                width: 200px;
                background: rgba(30, 30, 30, 0.9);
                color: white;
                border: 2px solid #555;
                border-radius: 10px;
                padding: 15px;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                z-index: 1000;
            }
            
            .animation-header h3 {
                margin: 0 0 15px 0;
                color: #fff;
                text-align: center;
                font-size: 16px;
            }
            
            .animation-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 5px;
                margin-bottom: 15px;
            }
            
            .anim-btn {
                padding: 8px 4px;
                background: #555;
                color: white;
                border: 1px solid #777;
                border-radius: 5px;
                cursor: pointer;
                font-size: 10px;
                transition: background 0.3s;
            }
            
            .anim-btn:hover {
                background: #007acc;
            }
            
            .demo-controls {
                margin-bottom: 15px;
                display: grid;
                grid-template-columns: 1fr;
                gap: 8px;
            }
            
            .demo-btn {
                width: 100%;
                padding: 8px;
                background: #4CAF50;
                color: white;
                border: 1px solid #45a049;
                border-radius: 5px;
                cursor: pointer;
                font-size: 11px;
                transition: background 0.3s;
            }
            
            .demo-btn:hover {
                background: #45a049;
            }
            
            .demo-btn.active {
                background: #f44336;
            }
            
            .animation-controls {
                margin-bottom: 15px;
            }
            
            .animation-controls label {
                display: block;
                margin-bottom: 5px;
                font-size: 12px;
            }
            
            #speed-slider {
                width: 100%;
            }
            
            .animation-info {
                border-top: 1px solid #555;
                padding-top: 10px;
                font-size: 11px;
            }
            
            .animation-info div {
                margin-bottom: 3px;
            }
        `;
        document.head.appendChild(style);
    }

    bindAnimationEvents() {
        document.getElementById('play-btn').addEventListener('click', () => this.play());
        document.getElementById('pause-btn').addEventListener('click', () => this.pause());
        document.getElementById('stop-btn').addEventListener('click', () => this.stop());
        
        const coordinatedBtn = document.getElementById('coordinated-btn');
        coordinatedBtn.addEventListener('click', () => {
            if (coordinatedBtn.classList.contains('active')) {
                this.coordinatedOperations.stopAllOperations();
                coordinatedBtn.textContent = '🏭 OSR Operations';
                coordinatedBtn.classList.remove('active');
            } else {
                this.play(); // Ensure animation system is running
                this.coordinatedOperations.startCoordinatedDemo();
                coordinatedBtn.textContent = '🛑 Stop OSR';
                coordinatedBtn.classList.add('active');
            }
        });
        
        const speedSlider = document.getElementById('speed-slider');
        const speedValue = document.getElementById('speed-value');
        
        speedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            this.setSpeed(speed);
            speedValue.textContent = `${speed.toFixed(1)}x`;
        });
    }

    updateUI() {
        // Update animation info display
        const activeCount = document.getElementById('active-count');
        const queueCount = document.getElementById('queue-count');
        
        // Count active coordinated operations
        const coordinatedOpsCount = this.coordinatedOperations.activeOperations.size;
        const totalActive = this.activeAnimations.size + coordinatedOpsCount;
        
        if (activeCount) activeCount.textContent = totalActive;
        if (queueCount) queueCount.textContent = this.operationQueue.length;
    }
}
