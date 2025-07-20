import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createRacks } from '../components/createRacks.js';
import { createPrezone } from '../components/createPrezone.js';
import { createTransporters } from '../components/createTransporters.js';
import { constants } from './constants.js';

export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null;
        this.warehouseGroup = new THREE.Group();
        this.scene.add(this.warehouseGroup);
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limited pixel ratio
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap; // Faster shadow type
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.antialias = false; // Disabled for performance
        document.body.appendChild(this.renderer.domElement);

        this.camera.position.set(15, 15, 30);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;

        this.scene.background = new THREE.Color(0xf1faee); // Light cream from palette
        this.scene.fog = new THREE.Fog(0xf1faee, 50, 100); // Matching fog color

        this.setupLighting();

        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        this.animate();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        
        // Update TWEEN animations if available
        if (typeof TWEEN !== 'undefined') {
            TWEEN.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    setupLighting() {
        // Optimized ambient light for better performance
        const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
        this.scene.add(ambientLight);

        // Main directional light with optimized shadow settings
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(30, 40, 30);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;  // Reduced from 4096
        mainLight.shadow.mapSize.height = 2048; // Reduced from 4096
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 100;
        mainLight.shadow.camera.left = -60;
        mainLight.shadow.camera.right = 60;
        mainLight.shadow.camera.top = 60;
        mainLight.shadow.camera.bottom = -60;
        mainLight.shadow.bias = -0.0001;
        this.scene.add(mainLight);

        // Simplified secondary light (no shadows for performance)
        const fillLight = new THREE.DirectionalLight(0xfff8dc, 0.5);
        fillLight.position.set(-25, 35, -25);
        fillLight.castShadow = false; // Disabled for performance
        this.scene.add(fillLight);

        // Reduced number of point lights
        const pointLight1 = new THREE.PointLight(0xffffff, 0.8, 30, 2);
        pointLight1.position.set(15, 20, 15);
        pointLight1.castShadow = false; // Disabled for performance
        this.scene.add(pointLight1);

        // Ground plane for shadows
        this.createGroundPlane();
    }

    createGroundPlane() {
        const groundGeometry = new THREE.PlaneGeometry(300, 300);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf5f5f0,  // Ανοιχτό κιτρινωπό (ivory/cream)
            metalness: 0.0,   // Καθόλου μεταλλικό
            roughness: 0.8,   // Τραχύ για βιομηχανικό look
            transparent: false,
            envMapIntensity: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1; // Λίγο κάτω από τη βάση
        ground.receiveShadow = true;
        
        // Add grid lines for industrial warehouse look
        const gridHelper = new THREE.GridHelper(300, 50, 0xdddddd, 0xeeeeee);
        gridHelper.position.y = -0.05;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        
        this.scene.add(ground);
        this.scene.add(gridHelper);
    }

    buildWarehouse(uiConfig) {
        // Clear previous warehouse completely
        while (this.warehouseGroup.children.length > 0) {
            this.warehouseGroup.remove(this.warehouseGroup.children[0]);
        }

        const racks = createRacks(uiConfig, constants);
        this.warehouseGroup.add(racks);

        const prezone = createPrezone(uiConfig, constants);
        prezone.position.z = - (uiConfig.storage_depth * constants.locationDepth) - 5;
        this.warehouseGroup.add(prezone);

        const transporters = createTransporters(uiConfig, constants);
        this.warehouseGroup.add(transporters);

        // Center the warehouse (only X and Z, keep Y at ground level)
        const box = new THREE.Box3().setFromObject(this.warehouseGroup);
        const center = box.getCenter(new THREE.Vector3());
        this.warehouseGroup.position.x += (this.warehouseGroup.position.x - center.x);
        this.warehouseGroup.position.z += (this.warehouseGroup.position.z - center.z);
        
        console.log('Warehouse built successfully');
        console.log('Warehouse group position:', this.warehouseGroup.position);
    }

    updateTheme(isDark) {
        if (isDark) {
            // Dark theme
            this.scene.background = new THREE.Color(0x111827); // Dark blue-grey
            this.scene.fog = new THREE.Fog(0x111827, 50, 100);
        } else {
            // Light theme  
            this.scene.background = new THREE.Color(0xf1faee); // Light cream
            this.scene.fog = new THREE.Fog(0xf1faee, 50, 100);
        }
    }
}
