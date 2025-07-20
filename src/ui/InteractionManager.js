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

            <div class="interaction-info">
                <h4>Controls:</h4>
                <div class="control-item">🖱️ Click: Select object</div>
                <div class="control-item">1-4: Quick camera views</div>
                <div class="control-item">ESC: Deselect</div>
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
                width: 220px;
                background: rgba(50, 50, 50, 0.9);
                color: white;
                border: 2px solid #666;
                border-radius: 10px;
                padding: 15px;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                z-index: 1000;
            }
            
            .interaction-header h3 {
                margin: 0 0 15px 0;
                color: #fff;
                text-align: center;
                font-size: 16px;
            }
            
            .camera-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 15px;
            }
            
            .camera-btn {
                padding: 8px 4px;
                background: #444;
                color: white;
                border: 1px solid #666;
                border-radius: 5px;
                cursor: pointer;
                font-size: 11px;
                transition: background 0.3s;
            }
            
            .camera-btn:hover {
                background: #007acc;
            }
            
            .interaction-info {
                border-top: 1px solid #666;
                padding-top: 10px;
                margin-bottom: 10px;
            }
            
            .interaction-info h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: #ccc;
            }
            
            .control-item {
                font-size: 11px;
                color: #aaa;
                margin-bottom: 4px;
            }
            
            .object-info {
                border-top: 1px solid #666;
                padding-top: 10px;
            }
            
            .object-info h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: #4CAF50;
            }
            
            #object-details {
                font-size: 12px;
                color: #ddd;
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

        // Debug: Log object properties
        console.log('Selected object:', object);
        console.log('Material:', object.material);
        console.log('Geometry:', object.geometry);
        console.log('Position:', worldPosition);

        // Check by material color (with more flexible matching)
        if (object.material && object.material.color) {
            const colorHex = object.material.color.getHex();
            console.log('Color hex:', colorHex.toString(16));

            if (colorHex === 0xffd700 || colorHex === 0xffff00) { // Gold/Yellow - Lift
                objectType = 'Container Lift';
                objectDetails = `Vertical transporter that moves containers between levels`;
            } else if (colorHex === 0xdc143c || colorHex === 0xff0000) { // Red - Shuttle
                objectType = 'OSR Shuttle';
                objectDetails = `Autonomous vehicle that travels on rails within aisles`;
            } else if (colorHex === 0x8b4513 || (colorHex >= 0x800000 && colorHex <= 0x8b7355)) { // Brown range - Picking Station
                objectType = 'Picking Station';
                objectDetails = `Ergonomic workstation for "goods-to-person" procedures`;
            } else if (colorHex === 0x2c2c2c || colorHex === 0x404040 || (colorHex >= 0x1a1a1a && colorHex <= 0x404040)) { // Dark grey range - Conveyor
                objectType = 'Prezone Conveyor';
                objectDetails = `Conveyor system that connects the OSR to other areas`;
            } else if ((colorHex === 0x444444 || colorHex === 0x888888) && !object.material.wireframe) { // Grey - Storage Location
                objectType = 'Storage Location';
                objectDetails = `Single position in the rack for storing containers`;
            } else if (colorHex === 0x4a90e2 || colorHex === 0x50c878 || colorHex === 0xff6b6b) { // Container colors
                objectType = 'Container';
                objectDetails = `Storage container (${object.userData.containerType || 'unknown type'})`;
            }
        }

        // Check by userData type (for animated objects)
        if (object.userData && object.userData.type) {
            switch (object.userData.type) {
                case 'shuttle':
                    objectType = 'OSR Shuttle';
                    objectDetails = `Autonomous vehicle - Aisle ${object.userData.aisleId}, Level ${object.userData.level}`;
                    break;
                case 'lift':
                    objectType = 'Container Lift';
                    objectDetails = `Vertical transporter - Aisle ${object.userData.aisleId}`;
                    break;
                case 'container':
                    objectType = 'Container';
                    objectDetails = `Storage container (${object.userData.containerType}) - ID: ${object.userData.containerId}`;
                    break;
            }
        }

        // Check by material properties and geometry size for frame components
        if (object.material && !object.material.wireframe && object.geometry) {
            const box = new THREE.Box3().setFromObject(object);
            const size = box.getSize(new THREE.Vector3());
            
            // Check if it's a thin frame element (post, bottom frame, or side frame)
            if (size.x <= 0.15 || size.y <= 0.15 || size.z <= 0.15) {
                objectType = 'Module Frame';
                objectDetails = `Section of the rack with vertical posts that contains locations`;
            }
        }

        // Check by geometry type and size as fallback
        if (objectType === 'Unknown Component' && object.geometry) {
            if (object.geometry.type === 'BoxGeometry') {
                const box = new THREE.Box3().setFromObject(object);
                const size = box.getSize(new THREE.Vector3());
                
                if (size.y > 0.7 && size.x < 0.6) { // Tall and narrow - likely lift
                    objectType = 'Container Lift';
                    objectDetails = `Vertical transporter that moves containers between levels`;
                } else if (size.z > 0.8 && size.y < 0.4) { // Long and low - likely shuttle
                    objectType = 'OSR Shuttle';
                    objectDetails = `Autonomous vehicle that travels on rails within aisles`;
                } else if (size.x > 2 && size.y > 1) { // Large - likely picking station
                    objectType = 'Picking Station';
                    objectDetails = `Ergonomic workstation for "goods-to-person" procedures`;
                } else if (size.y < 0.5) { // Low height - likely conveyor
                    objectType = 'Prezone Conveyor';
                    objectDetails = `Conveyor system that connects the OSR to other areas`;
                } else {
                    objectType = 'Storage Location';
                    objectDetails = `Single position in the rack for storing containers`;
                }
            }
        }

        detailsDiv.innerHTML = `
            <div><strong>Type:</strong> ${objectType}</div>
            <div><strong>Details:</strong> ${objectDetails}</div>
        `;
        
        infoPanel.style.display = 'block';
    }
}
