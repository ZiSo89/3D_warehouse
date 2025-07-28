import * as THREE from 'three';

export function createOrientationLabels(scene) {
    const labels = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
    const positions = [
        new THREE.Vector3(0, 1, -80), // North
        new THREE.Vector3(0, 1, 80),  // South
        new THREE.Vector3(80, 1, 0),  // East
        new THREE.Vector3(-80, 1, 0)  // West
    ];

    labels.forEach((text, i) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontSize = 48;
        context.font = `bold ${fontSize}px Arial`;
        const textWidth = context.measureText(text).width;

        canvas.width = textWidth;
        canvas.height = fontSize;
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = 'rgba(30, 50, 49, 0.7)';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(positions[i]);
        sprite.scale.set(canvas.width / 5, canvas.height / 5, 1.0);
        scene.add(sprite);
    });
}

export function addCompassLabels(compassGroup) {
    const labels = [
        { text: 'N', position: new THREE.Vector3(0, 1.2, -2.5), color: '#ff4444' },
        { text: 'S', position: new THREE.Vector3(0, 1.2, 2.5), color: '#4444ff' },
        { text: 'E', position: new THREE.Vector3(2.5, 1.2, 0), color: '#44ff44' },
        { text: 'W', position: new THREE.Vector3(-2.5, 1.2, 0), color: '#ffff44' }
    ];
    labels.forEach(({ text, position, color }) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontSize = 64;
        canvas.width = 80;
        canvas.height = 80;
        context.font = `bold ${fontSize}px Arial`;
        context.fillStyle = color;
        context.strokeStyle = '#000000';
        context.lineWidth = 3;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.strokeText(text, 40, 40);
        context.fillText(text, 40, 40);
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);
        sprite.scale.set(1.5, 1.5, 1.0);
        compassGroup.add(sprite);
    });
}

export function createCompass(scene) {
    const compassGroup = new THREE.Group();
    const compassGeometry = new THREE.CylinderGeometry(3, 3, 0.2, 32);
    const compassMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2d3748, 
        metalness: 0.7,
        roughness: 0.3
    });
    const compassBase = new THREE.Mesh(compassGeometry, compassMaterial);
    compassGroup.add(compassBase);
    const arrowGeometry = new THREE.ConeGeometry(0.4, 1.5, 8);
    const northArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshStandardMaterial({ color: 0xff4444 }));
    northArrow.position.set(0, 0.6, -2);
    northArrow.rotation.x = Math.PI;
    compassGroup.add(northArrow);
    const southArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshStandardMaterial({ color: 0x4444ff }));
    southArrow.position.set(0, 0.6, 2);
    compassGroup.add(southArrow);
    const eastArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshStandardMaterial({ color: 0x44ff44 }));
    eastArrow.position.set(2, 0.6, 0);
    eastArrow.rotation.z = -Math.PI / 2;
    compassGroup.add(eastArrow);
    const westArrow = new THREE.Mesh(arrowGeometry, new THREE.MeshStandardMaterial({ color: 0xffff44 }));
    westArrow.position.set(-2, 0.6, 0);
    westArrow.rotation.z = Math.PI / 2;
    compassGroup.add(westArrow);
    addCompassLabels(compassGroup);
    compassGroup.position.set(20, 2, 20);
    compassGroup.scale.setScalar(0.8);
    scene.add(compassGroup);
    return compassGroup;
}

export function updateCompassPosition(compassGroup, warehouseGroup) {
    if (!compassGroup) return;
    let posX = 20, posZ = 20;
    if (warehouseGroup && warehouseGroup.children.length > 0) {
        const box = new THREE.Box3().setFromObject(warehouseGroup);
        posX = box.max.x + 8;
        posZ = box.max.z + 8;
    }
    compassGroup.position.set(posX, 2, posZ);
}
