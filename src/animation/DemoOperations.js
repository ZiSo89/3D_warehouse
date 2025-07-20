import * as THREE from 'three';
import { AnimationManager } from './AnimationManager.js';

export class DemoOperations {
    constructor(animationManager) {
        this.animationManager = animationManager;
        this.demoInterval = null;
        this.operationCounter = 0;
    }

    startDemo() {
        if (this.demoInterval) {
            this.stopDemo();
        }

        console.log('Starting warehouse operations demo...');
        this.animationManager.play();
        
        // Start with an immediate operation
        this.executeRandomOperation();
        
        // Schedule regular operations
        this.demoInterval = setInterval(() => {
            this.executeRandomOperation();
        }, 5000); // Every 5 seconds
    }

    stopDemo() {
        if (this.demoInterval) {
            clearInterval(this.demoInterval);
            this.demoInterval = null;
        }
        console.log('Demo operations stopped');
    }

    executeRandomOperation() {
        const operations = [
            () => this.storageOperation(),
            () => this.retrievalOperation(),
            () => this.shuttleMovement(),
            () => this.liftMovement()
        ];

        const randomOp = operations[Math.floor(Math.random() * operations.length)];
        randomOp();
        this.operationCounter++;
    }

    storageOperation() {
        console.log(`Demo Operation ${this.operationCounter}: Storage Operation`);
        
        // Create a container
        const containerId = `DEMO-${Date.now()}`;
        const containerType = ['standard', 'small', 'large'][Math.floor(Math.random() * 3)];
        const container = this.animationManager.createContainer(containerId, containerType);
        
        // Start at prezone conveyor
        const startPosition = new THREE.Vector3(-2, 0.5, -8);
        container.show(startPosition);
        
        // Move to random storage location
        const targetAisle = Math.floor(Math.random() * this.animationManager.warehouseConfig.aisles);
        const targetLevel = Math.floor(Math.random() * this.animationManager.warehouseConfig.levels_per_aisle[targetAisle]);
        const targetDepth = Math.floor(Math.random() * this.animationManager.warehouseConfig.storage_depth);
        const targetModule = Math.floor(Math.random() * this.animationManager.warehouseConfig.modules_per_aisle);
        const targetLocation = Math.floor(Math.random() * this.animationManager.warehouseConfig.locations_per_module);
        
        this.executeStorageSequence(container, targetAisle, targetLevel, targetDepth, targetModule, targetLocation);
    }

    retrievalOperation() {
        console.log(`Demo Operation ${this.operationCounter}: Retrieval Operation`);
        
        // Pick a random existing container location and simulate retrieval
        const sourceAisle = Math.floor(Math.random() * this.animationManager.warehouseConfig.aisles);
        const sourceLevel = Math.floor(Math.random() * this.animationManager.warehouseConfig.levels_per_aisle[sourceAisle]);
        
        this.executeRetrievalSequence(sourceAisle, sourceLevel);
    }

    shuttleMovement() {
        console.log(`Demo Operation ${this.operationCounter}: Shuttle Movement`);
        
        // Move a random shuttle
        const shuttles = Array.from(this.animationManager.shuttles.values());
        if (shuttles.length > 0) {
            const randomShuttle = shuttles[Math.floor(Math.random() * shuttles.length)];
            this.moveShuttleToRandomLocation(randomShuttle);
        }
    }

    liftMovement() {
        console.log(`Demo Operation ${this.operationCounter}: Lift Movement`);
        
        // Move a random lift
        const lifts = Array.from(this.animationManager.lifts.values());
        if (lifts.length > 0) {
            const randomLift = lifts[Math.floor(Math.random() * lifts.length)];
            this.moveLiftToRandomLevel(randomLift);
        }
    }

    executeStorageSequence(container, aisleId, level, depth, module, location) {
        // Calculate target position
        const totalRackDepth = this.animationManager.warehouseConfig.storage_depth * 2;
        const aisleWidth = 3;
        const rackAndAisleWidth = totalRackDepth + aisleWidth;
        
        const targetX = (aisleId * rackAndAisleWidth) + (depth * 0.8) + 0.4;
        const targetY = (level * 2.5) + 1.25;
        const targetZ = (module * (this.animationManager.warehouseConfig.locations_per_module * 0.8)) + (location * 0.8) + 0.4;
        
        const targetPosition = new THREE.Vector3(targetX, targetY, targetZ);
        
        // Move container to target over 3 seconds
        container.moveTo(targetPosition, 3.0, () => {
            console.log(`Container ${container.getId()} stored at position (${targetX.toFixed(1)}, ${targetY.toFixed(1)}, ${targetZ.toFixed(1)})`);
            
            // Hide container after 2 seconds
            setTimeout(() => {
                this.animationManager.removeContainer(container.getId());
            }, 2000);
        });
    }

    executeRetrievalSequence(aisleId, level) {
        // Create container at storage location
        const containerId = `RETR-${Date.now()}`;
        const container = this.animationManager.createContainer(containerId, 'standard');
        
        // Random storage position
        const totalRackDepth = this.animationManager.warehouseConfig.storage_depth * 2;
        const aisleWidth = 3;
        const rackAndAisleWidth = totalRackDepth + aisleWidth;
        
        const startX = (aisleId * rackAndAisleWidth) + Math.random() * totalRackDepth;
        const startY = (level * 2.5) + 1.25;
        const startZ = Math.random() * 10;
        
        const startPosition = new THREE.Vector3(startX, startY, startZ);
        container.show(startPosition);
        
        // Move to prezone
        const prezonePosition = new THREE.Vector3(-2, 0.5, -8);
        container.moveTo(prezonePosition, 3.0, () => {
            console.log(`Container ${container.getId()} retrieved to prezone`);
            
            // Remove after delivery
            setTimeout(() => {
                this.animationManager.removeContainer(container.getId());
            }, 2000);
        });
    }

    moveShuttleToRandomLocation(shuttle) {
        if (shuttle.userData.isMoving) return;
        
        const aisleId = shuttle.userData.aisleId;
        const level = shuttle.userData.level;
        
        // Random Z position within the aisle
        const maxZ = this.animationManager.warehouseConfig.modules_per_aisle * 
                   this.animationManager.warehouseConfig.locations_per_module * 0.8;
        const targetZ = Math.random() * maxZ;
        
        const targetPosition = shuttle.userData.homePosition.clone();
        targetPosition.z = targetZ;
        
        shuttle.userData.isMoving = true;
        shuttle.userData.targetPosition = targetPosition;
        
        console.log(`Moving shuttle ${shuttle.userData.id} to position Z=${targetZ.toFixed(1)}`);
    }

    moveLiftToRandomLevel(lift) {
        if (lift.userData.isMoving) return;
        
        const aisleId = lift.userData.aisleId;
        const maxLevels = this.animationManager.warehouseConfig.levels_per_aisle[aisleId];
        const targetLevel = Math.floor(Math.random() * maxLevels);
        
        const targetPosition = lift.userData.homePosition.clone();
        targetPosition.y = (targetLevel * 2.5) + 1.25;
        
        lift.userData.isMoving = true;
        lift.userData.targetPosition = targetPosition;
        lift.userData.currentLevel = targetLevel;
        
        console.log(`Moving lift ${lift.userData.id} to level ${targetLevel}`);
    }
}
