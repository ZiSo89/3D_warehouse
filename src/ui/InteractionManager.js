import * as THREE from 'three';

export class InteractionManager {
    constructor(sceneManager, uiManager) {
        this.sceneManager = sceneManager;
        this.uiManager = uiManager;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedObject = null;
        this.originalMaterial = null;
        this.highlightMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.5 
        });
        
        this.init();
        this.createCameraPresets();
    }

    init() {
        // Mouse events
        this.sceneManager.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
        this.sceneManager.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        
        // Keyboard events
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        
        // Create interaction UI
        this.createInteractionUI();
    }

    createCameraPresets() {
        this.cameraPresets = {
            overview: {
                position: new THREE.Vector3(25, 20, 25),
                target: new THREE.Vector3(0, 0, 0),
                name: "Overview"
            },
            topView: {
                position: new THREE.Vector3(0, 50, 0),
                target: new THREE.Vector3(0, 0, 0),
                name: "Top View"
            },
            sideView: {
                position: new THREE.Vector3(40, 10, 0),
                target: new THREE.Vector3(0, 0, 0),
                name: "Side View"
            },
            prezoneView: {
                position: new THREE.Vector3(0, 12, -25),
                target: new THREE.Vector3(0, 0, -8),
                name: "Prezone View"
            },
            aisleView: {
                position: new THREE.Vector3(5, 8, 15),
                target: new THREE.Vector3(5, 0, 10),
                name: "Aisle View"
            }
        };
    }

    createInteractionUI() {
        const interactionPanel = document.createElement('div');
        interactionPanel.id = 'interaction-panel';
        interactionPanel.innerHTML = `
            <div class="interaction-header">
                <h3>Camera Views</h3>
            </div>
            
            <div class="camera-buttons">
                <button class="camera-btn" data-preset="overview">📊 Overview</button>
                <button class="camera-btn" data-preset="topView">⬆️ Top View</button>
                <button class="camera-btn" data-preset="sideView">↔️ Side View</button>
                <button class="camera-btn" data-preset="prezoneView">📦 Prezone</button>
            </div>

            <div class="object-info" id="object-info" style="display: none;">
                <h4>Selected Object:</h4>
                <div id="object-details"></div>
            </div>
        `;
        
        document.body.appendChild(interactionPanel);
        this.addInteractionStyles();
        this.bindCameraEvents();
    }

    addInteractionStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #interaction-panel {
                position: fixed;
                top: 20px;
                left: 20px;
                width: 280px;
                background: rgba(30, 50, 49, 0.95);
                color: #f1faee;
                border: 2px solid #6e9075;
                border-radius: 10px;
                padding: 15px;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                z-index: 1000;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .interaction-header h3 {
                margin: 0 0 15px 0;
                color: #f1faee;
                text-align: center;
                font-size: 16px;
                border-bottom: 1px solid #6e9075;
                padding-bottom: 8px;
            }
            
            .camera-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 15px;
            }
            
            .camera-btn {
                padding: 8px 6px;
                background: #6e9075;
                color: #f1faee;
                border: none;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .camera-btn:hover {
                background: #93032e;
            }
            
            .interaction-info {
                margin-bottom: 15px;
                padding: 10px;
                background: rgba(229, 209, 208, 0.1);
                border-radius: 5px;
            }
            
            .interaction-info h4 {
                margin: 0 0 8px 0;
                color: #e5d1d0;
                font-size: 14px;
            }
            
            .control-item {
                font-size: 12px;
                margin-bottom: 4px;
                color: #f1faee;
            }
            
            .object-info {
                background: rgba(147, 3, 46, 0.1);
                border: 1px solid #93032e;
                border-radius: 5px;
                padding: 12px;
                margin-top: 10px;
            }
            
            .object-info h4 {
                margin: 0 0 10px 0;
                color: #93032e;
                font-size: 14px;
                border-bottom: 1px solid #93032e;
                padding-bottom: 5px;
            }
            
            .object-info h3 {
                margin: 0 0 10px 0;
                color: #93032e;
                font-size: 16px;
                text-align: center;
            }
            
            .object-details-content {
                font-size: 12px;
                line-height: 1.4;
                color: #f1faee;
            }
            
            .object-details-content strong {
                color: #e5d1d0;
            }
            
            #interaction-panel::-webkit-scrollbar {
                width: 6px;
            }
            
            #interaction-panel::-webkit-scrollbar-track {
                background: rgba(110, 144, 117, 0.2);
                border-radius: 3px;
            }
            
            #interaction-panel::-webkit-scrollbar-thumb {
                background: #6e9075;
                border-radius: 3px;
            }
            
            #interaction-panel::-webkit-scrollbar-thumb:hover {
                background: #93032e;
            }
        `;
        document.head.appendChild(style);
    }

    bindCameraEvents() {
        const cameraButtons = document.querySelectorAll('.camera-btn');
        cameraButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const presetName = e.target.getAttribute('data-preset');
                this.setCameraPreset(presetName);
            });
        });
    }

    setCameraPreset(presetName) {
        const preset = this.cameraPresets[presetName];
        if (!preset) return;

        // Smooth camera transition
        this.animateCamera(preset.position, preset.target);
    }

    animateCamera(targetPosition, targetLookAt, duration = 1000) {
        const startPosition = this.sceneManager.camera.position.clone();
        const startTarget = this.sceneManager.controls.target.clone();
        
        let startTime = null;
        
        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // Interpolate camera position
            this.sceneManager.camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            
            // Interpolate target
            this.sceneManager.controls.target.lerpVectors(startTarget, targetLookAt, easeProgress);
            this.sceneManager.controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        const intersects = this.raycaster.intersectObjects(this.sceneManager.warehouseGroup.children, true);

        if (intersects.length > 0) {
            this.selectObject(intersects[0].object);
        } else {
            this.deselectObject();
        }
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Optional: Add hover effects here
    }

    onKeyDown(event) {
        switch(event.key) {
            case '1':
                this.setCameraPreset('overview');
                break;
            case '2':
                this.setCameraPreset('topView');
                break;
            case '3':
                this.setCameraPreset('sideView');
                break;
            case '4':
                this.setCameraPreset('prezoneView');
                break;
            case 'Escape':
                this.deselectObject();
                break;
        }
    }

    selectObject(object) {
        // Deselect previous object
        this.deselectObject();

        // Select new object
        this.selectedObject = object;
        this.originalMaterial = object.material;
        
        // Apply highlight effect
        if (object.material.type !== 'MeshBasicMaterial' || !object.material.wireframe) {
            object.material = this.highlightMaterial;
        }

        // Show object info
        this.showObjectInfo(object);
    }

    deselectObject() {
        if (this.selectedObject && this.originalMaterial) {
            this.selectedObject.material = this.originalMaterial;
            this.selectedObject = null;
            this.originalMaterial = null;
        }
        
        // Hide object info
        document.getElementById('object-info').style.display = 'none';
    }

    showObjectInfo(object) {
        const infoPanel = document.getElementById('object-info');
        const detailsDiv = document.getElementById('object-details');
        
        let objectType = 'Unknown Component';
        let objectDetails = 'Component information not available';

        // Determine object type based on position and properties
        const worldPosition = new THREE.Vector3();
        object.getWorldPosition(worldPosition);

        // First check userData for detailed object information
        if (object.userData && Object.keys(object.userData).length > 0) {
            const userData = object.userData;
            
            // Storage Location with detailed info
            if (userData.type && userData.aisle !== undefined) {
                objectType = `${userData.type} Location`;
                objectDetails = `<strong>Type:</strong> ${userData.type}<br><strong>Coordinates:</strong> Aisle ${userData.aisle + 1}, Level ${userData.level + 1}, Module ${userData.module + 1}<br><strong>Position:</strong> Depth ${userData.depth + 1}, Slot ${userData.position + 1}`;
                
                // Add Buffer location specific info
                if (userData.type === 'Buffer') {
                    objectDetails += `<br><strong>Function:</strong> Buffer zone near lift operations`;
                }
            }
            // Animated equipment (shuttles, lifts, etc.)
            else if (userData.type) {
                switch (userData.type) {
                    case 'shuttle':
                        objectType = 'OSR Shuttle';
                        objectDetails = `<strong>Type:</strong> Autonomous Shuttle Vehicle<br><strong>Aisle:</strong> ${userData.aisleId ? userData.aisleId + 1 : 'Unknown'}<br><strong>Level:</strong> ${userData.level !== undefined ? userData.level + 1 : 'Unknown'}<br><strong>Status:</strong> ${userData.status || 'Operational'}`;
                        break;
                    case 'lift':
                        objectType = 'Container Lift';
                        objectDetails = `<strong>Type:</strong> Vertical Transporter<br><strong>Aisle:</strong> ${userData.aisleId ? userData.aisleId + 1 : 'Unknown'}<br><strong>Function:</strong> Moves containers between levels<br><strong>Status:</strong> ${userData.status || 'Operational'}`;
                        break;
                    case 'container':
                        objectType = 'Storage Container';
                        objectDetails = `<strong>Type:</strong> ${userData.containerType || 'Standard Container'}<br><strong>Status:</strong> ${userData.status || 'In transit'}`;
                        break;
                }
            }
        }
        // Check for missing location obstacles (red columns)
        else if (object.material && object.material.color) {
            const colorHex = object.material.color.getHex();
            
            if (colorHex === 0x8b0000) { // Dark red - Missing location obstacle
                objectType = 'Missing Location';
                objectDetails = `<strong>Type:</strong> Blocked/Unavailable Location<br><strong>Reason:</strong> Building obstacle (column, lift shaft, etc.)<br><strong>Status:</strong> Permanently unavailable for storage`;
            }
            // Check other object types by color
            else if (colorHex === 0xffd700 || colorHex === 0xffff00) { // Gold/Yellow - Lift
                objectType = 'Container Lift';
                objectDetails = `<strong>Type:</strong> Vertical Transporter<br><strong>Function:</strong> Moves containers between levels`;
            } else if (colorHex === 0xdc143c || colorHex === 0xff0000) { // Red - Shuttle
                objectType = 'OSR Shuttle';
                objectDetails = `<strong>Type:</strong> Autonomous Rail Vehicle<br><strong>Function:</strong> Horizontal transport within aisles`;
            } else if (colorHex === 0xff8500) { // Bright orange - Buffer locations
                objectType = 'Buffer Location';
                objectDetails = `<strong>Type:</strong> Buffer Storage Location<br><strong>Function:</strong> Temporary storage near lift operations<br><strong>Priority:</strong> High-speed access for lift operations`;
            } else if (colorHex === 0x8b4513 || (colorHex >= 0x800000 && colorHex <= 0x8b7355)) { // Brown range - Picking Station
                objectType = 'Picking Station';
                objectDetails = `<strong>Type:</strong> Ergonomic Workstation<br><strong>Function:</strong> Goods-to-person picking operations`;
            } else if (colorHex === 0x2c2c2c || colorHex === 0x404040 || (colorHex >= 0x1a1a1a && colorHex <= 0x404040)) { // Dark grey range - Conveyor
                objectType = 'Prezone Conveyor';
                objectDetails = `<strong>Type:</strong> Material Handling System<br><strong>Function:</strong> Connects OSR to external areas`;
            } else if ((colorHex === 0x6e9075 || colorHex === 0xf1faee) && !object.material.wireframe) { // Green/Cream - Regular Storage Location
                objectType = 'Storage Location';
                objectDetails = `<strong>Type:</strong> Standard Storage Location<br><strong>Function:</strong> Regular container storage`;
            } else if (colorHex === 0x4a90e2 || colorHex === 0x50c878 || colorHex === 0xff6b6b) { // Container colors
                objectType = 'Storage Container';
                objectDetails = `<strong>Type:</strong> Storage Container<br><strong>Container Type:</strong> ${object.userData?.containerType || 'Standard'}`;
            }
            // Check for rack frame components
            else if (colorHex === 0x1e3231 || colorHex === 0xe5d1d0) { // Dark steel or aluminum frame
                objectType = 'Rack Structure';
                objectDetails = `<strong>Type:</strong> ${colorHex === 0x1e3231 ? 'Steel' : 'Aluminum'} Frame Component<br><strong>Function:</strong> Structural support for storage racks`;
            }
        }
        
        // Check by material properties and geometry size for frame components and modules
        if (object.material && !object.material.wireframe && object.geometry) {
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            
            // Check if it's a thin frame element (post, bottom frame, or side frame)
            if (size.x <= 0.15 || size.y <= 0.15 || size.z <= 0.15) {
                objectType = 'Rack Module Frame';
                objectDetails = `<strong>Type:</strong> Module Frame Component<br><strong>Function:</strong> Vertical posts and structural elements<br><strong>Module:</strong> Contains storage locations`;
            }
            // Check for larger module components
            else if (size.x > 0.8 && size.y > 2.0 && size.z > 0.8) {
                objectType = 'Storage Module';
                objectDetails = `<strong>Type:</strong> Complete Storage Module<br><strong>Function:</strong> Houses multiple storage locations<br><strong>Dimensions:</strong> ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} units`;
            }
        }

        // Check by geometry type and size as fallback for equipment detection
        if (objectType === 'Unknown Component' && object.geometry) {
            if (object.geometry.type === 'BoxGeometry') {
                const box = new THREE.Box3().setFromObject(object);
                const size = box.getSize(new THREE.Vector3());
                
                if (size.y > 0.7 && size.x < 0.6) { // Tall and narrow - likely lift
                    objectType = 'Container Lift';
                    objectDetails = `<strong>Type:</strong> Vertical Transporter<br><strong>Function:</strong> Moves containers between levels<br><strong>Dimensions:</strong> ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} units`;
                } else if (size.z > 0.8 && size.y < 0.4) { // Long and low - likely shuttle
                    objectType = 'OSR Shuttle';
                    objectDetails = `<strong>Type:</strong> Autonomous Rail Vehicle<br><strong>Function:</strong> Horizontal transport within aisles<br><strong>Dimensions:</strong> ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} units`;
                } else if (size.x > 2 && size.y > 1) { // Large - likely picking station
                    objectType = 'Picking Station';
                    objectDetails = `<strong>Type:</strong> Ergonomic Workstation<br><strong>Function:</strong> Goods-to-person picking operations<br><strong>Dimensions:</strong> ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} units`;
                } else if (size.y < 0.5) { // Low height - likely conveyor
                    objectType = 'Prezone Conveyor';
                    objectDetails = `<strong>Type:</strong> Material Handling System<br><strong>Function:</strong> Connects OSR to external areas<br><strong>Dimensions:</strong> ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} units`;
                } else {
                    objectType = 'Storage Location';
                    objectDetails = `<strong>Type:</strong> Single Container Position<br><strong>Function:</strong> Stores one container in the rack<br><strong>Dimensions:</strong> ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} units`;
                }
            }
        }

        // Display the information
        detailsDiv.innerHTML = `<h3>${objectType}</h3><div class="object-details-content">${objectDetails}</div>`;
        
        infoPanel.style.display = 'block';
        console.log(`Selected: ${objectType}`, object);
    }
}
