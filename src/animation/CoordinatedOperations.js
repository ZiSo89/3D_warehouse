import * as THREE from 'three';

export class CoordinatedOperations {
    constructor(animationManager) {
        this.animationManager = animationManager;
        this.activeOperations = new Map();
        this.operationCounter = 0;
        this.testContainer = null; // Keep track of the test container
    }

    // Public method to start a demo sequence
    startCoordinatedDemo() {
        console.log('🎭 Starting coordinated demo...');
        this.startTestSequence();
    }

    // Full test sequence from picking station to shuttle
    async startTestSequence() {
        // Start sequence (minimal logs)
        this.animationManager.play();
        
        // Force rebuild warehouse to apply position fixes
        console.log('🔧 Rebuilding warehouse with correct positioning...');
        const config = this.animationManager.warehouseConfig || {
            aisles: 3,
            levels_per_aisle: [5, 6, 4],
            modules_per_aisle: 8,
            locations_per_module: 4,
            storage_depth: 2,
            picking_stations: 3
        };
        this.animationManager.sceneManager.buildWarehouse(config);

        // Helper function to wrap moveTo in a Promise
        const moveContainer = (container, position, duration) => {
            return new Promise(resolve => {
                container.moveTo(position, duration, resolve);
            });
        };

        // Clean up previous test container if it exists
        if (this.testContainer) {
            this.animationManager.removeContainer(this.testContainer.getId());
            this.testContainer = null;
        }

        // Find the prezone group to get the picking station's world position
        const warehouseGroup = this.animationManager.warehouseGroup;
        const prezoneGroup = warehouseGroup.children.find(child => child.name === 'PreZone');
        if (!prezoneGroup) {
            console.error('Prezone group not found!');
            return;
        }

        const firstStation = prezoneGroup.children.find(child => child.name.startsWith('picking_station'));
        if (!firstStation) {
            console.error('Picking station not found!');
            return;
        }

        const worldPosition = new THREE.Vector3();
        firstStation.getWorldPosition(worldPosition);

        // Step 1: Create and place container at the picking station
        const containerId = 'TEST_CONTAINER_001';
        const container = this.animationManager.createContainer(containerId, 'standard');
        this.testContainer = container; // Store reference to the test container

        const pickingStationPosition = new THREE.Vector3(
            worldPosition.x,
            worldPosition.y + 1.0, // Place on top of the station
            worldPosition.z
        );
        container.show(pickingStationPosition);
        console.log('📍 Step 1: Container placed at picking station:', pickingStationPosition);

        try {
            // Step 2A: Move to the conveyor entrance
            const conveyorEntrancePosition = new THREE.Vector3(worldPosition.x, 0.5, worldPosition.z + 5);
            await moveContainer(container, conveyorEntrancePosition, 2.0);

            // Step 2B: Move along the prezone conveyor
            const prezoneConveyorPosition = new THREE.Vector3(worldPosition.x, 0.5, -18);
            await moveContainer(container, prezoneConveyorPosition, 3.0);

            // Step 3: Align with the lift on the X-axis
            const firstLift = this.animationManager.lifts.get('lift_0');
            if (!firstLift) {
                console.error('Lift lift_0 not found!');
                return;
            }
            const prezoneAlignPosition = new THREE.Vector3(firstLift.position.x, 0.5, -18);
            await moveContainer(container, prezoneAlignPosition, 2.0);

            // Step 4: Approach the lift
            const liftApproachPosition = new THREE.Vector3(firstLift.position.x, 0.5, -16.5);
            await moveContainer(container, liftApproachPosition, 2.0);

            // Step 5: Move onto the lift platform
            const liftPosition = new THREE.Vector3(firstLift.position.x, firstLift.position.y + 1.0, firstLift.position.z);
            await moveContainer(container, liftPosition, 1.5);

            // Step 6: Lift moves up to level 1
            const targetLevel = 1;
            const targetY = (targetLevel * 2.5) + 1.25;
            const liftTargetPosition = firstLift.userData.homePosition.clone();
            liftTargetPosition.y = targetY;

            firstLift.userData.isMoving = true;
            firstLift.userData.targetPosition = liftTargetPosition;
            firstLift.userData.currentLevel = targetLevel;

            // Wait for lift to finish moving, updating container position each frame
            while (firstLift.userData.isMoving) {
                container.setPosition(new THREE.Vector3(firstLift.position.x, firstLift.position.y + 1.0, firstLift.position.z));
                await new Promise(requestAnimationFrame);
            }
            container.setPosition(new THREE.Vector3(firstLift.position.x, firstLift.position.y + 1.0, firstLift.position.z));
            // Debug: print actual lift mesh position and parent
            console.log('Lift mesh position:', firstLift.position);
            console.log('Lift parent:', firstLift.parent?.name || firstLift.parent);

            // Step 7: Shuttle approaches the lift
            const shuttleId = '0_1'; // Aisle 0, Level 1
            const shuttle = this.animationManager.shuttles.get(shuttleId);
            if (!shuttle) {
                console.error(`Shuttle ${shuttleId} not found!`);
                return;
            }
            const shuttleTargetPosition = shuttle.userData.homePosition.clone();
            shuttleTargetPosition.z = firstLift.position.z;

            shuttle.userData.isMoving = true;
            shuttle.userData.targetPosition = shuttleTargetPosition;

            // Wait for shuttle to finish moving
            while (shuttle.userData.isMoving) {
                await new Promise(requestAnimationFrame);
            }
            // Debug: print actual shuttle mesh position and parent
            console.log('Shuttle mesh position:', shuttle.position);
            console.log('Shuttle parent:', shuttle.parent?.name || shuttle.parent);

            // Step 8: Transfer container from lift to shuttle
            const shuttlePosition = new THREE.Vector3(shuttle.position.x, shuttle.position.y + 0.2, shuttle.position.z);
            await moveContainer(container, shuttlePosition, 2.0);

        } catch (error) {
            console.error('An error occurred during the test sequence:', error);
        }
    }



    // Stop all operations and clean up
    stopAllOperations() {
        console.log('🛑 Stopping all coordinated operations...');
        if (this.testContainer) {
            this.animationManager.removeContainer(this.testContainer.getId());
            this.testContainer = null;
        }
        // Add logic to stop any other active operations if necessary
    }
}
