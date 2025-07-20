import * as THREE from 'three';

export class Container {
    constructor(id, type = 'standard') {
        this.id = id;
        this.type = type;
        this.isVisible = false;
        this.isMoving = false;
        
        this.createMesh();
        this.reset(id, type);
    }

    createMesh() {
        // Container geometry based on type
        const geometry = this.getGeometryForType(this.type);
        const material = this.getMaterialForType(this.type);
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add container label
        this.createLabel();
        
        this.mesh.userData = {
            type: 'container',
            containerId: this.id,
            containerType: this.type
        };
    }

    getGeometryForType(type) {
        switch (type) {
            case 'small':
                return new THREE.BoxGeometry(0.4, 0.3, 0.6);
            case 'large':
                return new THREE.BoxGeometry(0.8, 0.4, 1.0);
            case 'standard':
            default:
                return new THREE.BoxGeometry(0.6, 0.35, 0.8);
        }
    }

    getMaterialForType(type) {
        const materials = {
            'standard': new THREE.MeshStandardMaterial({ 
                color: 0x4a90e2,
                metalness: 0.1,
                roughness: 0.8
            }),
            'small': new THREE.MeshStandardMaterial({ 
                color: 0x50c878,
                metalness: 0.1,
                roughness: 0.8
            }),
            'large': new THREE.MeshStandardMaterial({ 
                color: 0xff6b6b,
                metalness: 0.1,
                roughness: 0.8
            })
        };
        
        return materials[type] || materials['standard'];
    }

    createLabel() {
        // Create a simple text label on the container
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 64;
        
        context.fillStyle = 'white';
        context.fillRect(0, 0, 128, 64);
        context.fillStyle = 'black';
        context.font = '12px Arial';
        context.textAlign = 'center';
        context.fillText(this.id, 64, 20);
        context.fillText(this.type, 64, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true 
        });
        
        const labelGeometry = new THREE.PlaneGeometry(0.3, 0.15);
        this.label = new THREE.Mesh(labelGeometry, labelMaterial);
        this.label.position.y = 0.25; // Above container
        this.label.lookAt(0, 0, 1); // Face camera initially
        
        this.mesh.add(this.label);
    }

    reset(id, type) {
        this.id = id;
        this.type = type;
        this.isVisible = false;
        this.isMoving = false;
        
        // Update mesh properties
        this.mesh.userData.containerId = id;
        this.mesh.userData.containerType = type;
        
        // Update label
        this.updateLabel();
        
        // Reset position and hide
        this.mesh.position.set(0, -10, 0); // Hidden position
        this.mesh.visible = false;
    }

    updateLabel() {
        if (this.label) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 128;
            canvas.height = 64;
            
            context.fillStyle = 'white';
            context.fillRect(0, 0, 128, 64);
            context.fillStyle = 'black';
            context.font = '12px Arial';
            context.textAlign = 'center';
            context.fillText(this.id, 64, 20);
            context.fillText(this.type, 64, 40);
            
            this.label.material.map.image = canvas;
            this.label.material.map.needsUpdate = true;
        }
    }

    show(position) {
        this.isVisible = true;
        this.mesh.visible = true;
        
        if (position) {
            this.mesh.position.copy(position);
        }
    }

    hide() {
        this.isVisible = false;
        this.mesh.visible = false;
        this.mesh.position.set(0, -10, 0);
        this.isMoving = false;
    }

    moveTo(targetPosition, duration = 2.0, onComplete = null) {
        if (!this.isVisible) return;
        
        this.isMoving = true;
        this.startPosition = this.mesh.position.clone();
        this.targetPosition = targetPosition.clone();
        this.moveDuration = duration;
        this.moveStartTime = Date.now();
        this.moveOnComplete = onComplete;
    }

    update(deltaTime) {
        if (!this.isMoving || !this.isVisible) return;
        
        const elapsed = (Date.now() - this.moveStartTime) / 1000;
        const progress = Math.min(elapsed / this.moveDuration, 1);
        
        // Smooth easing
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate position
        this.mesh.position.lerpVectors(this.startPosition, this.targetPosition, easeProgress);
        
        // Update label to face camera (basic billboard effect)
        if (this.label) {
            this.label.lookAt(this.mesh.position.x, this.mesh.position.y + 5, this.mesh.position.z + 5);
        }
        
        // Check if movement is complete
        if (progress >= 1) {
            this.isMoving = false;
            this.mesh.position.copy(this.targetPosition);
            
            if (this.moveOnComplete) {
                this.moveOnComplete();
                this.moveOnComplete = null;
            }
        }
    }

    getPosition() {
        return this.mesh.position.clone();
    }

    setPosition(position) {
        this.mesh.position.copy(position);
    }

    getType() {
        return this.type;
    }

    getId() {
        return this.id;
    }

    isMovingNow() {
        return this.isMoving;
    }

    isVisibleNow() {
        return this.isVisible;
    }
}
