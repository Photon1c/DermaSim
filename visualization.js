// Acne Inflammation & Healing Visualization
// This file contains the 3D visualization using Three.js

// Import Three.js and required modules
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import TWEEN from '@tweenjs/tween.js';

export class AcneVisualization {
    constructor(containerId) {
        // Create debug overlay for error reporting
        this.createDebugOverlay();
        
        // Store the container ID
        this.containerId = containerId;
        
        // Container for the 3D scene
        this.container = document.getElementById(containerId);
        if (!this.container) {
            this.showError(`Container with ID ${containerId} not found.`);
            throw new Error(`Container with ID ${containerId} not found.`);
        }
        
        try {
            // Initialize animation properties
            this.mixer = null;
            this.animations = {};
            this.hairMeshes = [];
            this.effectMeshes = {};
            this.clock = new THREE.Clock();
            this.currentStage = 'incubation';
            this.stageLabelsCreated = false;  // Flag to prevent duplicate labels
            this.shouldRotateModel = false;
            this.modelRotationSpeed = 0.005;
            this.showBacteria = true;
            this.showNeutrophils = true;
            this.showInflammation = true;
            this.showPus = true;
            this.showEffects = true;
            this.animatedObjects = [];
            
            // Create basic Three.js scene components
            this.initThreeJS();
            
            // Create the skin base model
            this.createSkinModel();
            
            // Create objects for visualizing simulation components
            this.createSimulationObjects();
            
            // Add lighting to the scene
            this.setupLighting();
            
            // Set up camera controls
            this.setupCameraControls();
            
            // Set up initial camera position (removed default position here)
            this.controls.update();
            
            // Resize handler
            window.addEventListener('resize', this.onWindowResize.bind(this));
            this.onWindowResize();
            
            // Labels for the stages
            this.stageLabels = {};
            this.createStageLabels();
            
            // Initialize stageSpecificEffects array
            this.stageSpecificEffects = [];
            
            // Hide debug overlay if everything initialized correctly
            this.hideDebugOverlay();
            
        } catch (error) {
            this.showError(`Initialization error: ${error.message}`);
            console.error('Visualization initialization error:', error);
        }
    }

    // Initialize Three.js scene, camera, and renderer
    initThreeJS() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            45, window.innerWidth / window.innerHeight, 0.1, 1000
        );
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        
        // Add renderer to container
        this.container.appendChild(this.renderer.domElement);
    }

    // Create debug overlay for error reporting
    createDebugOverlay() {
        this.debugOverlay = document.createElement('div');
        this.debugOverlay.style.position = 'fixed';
        this.debugOverlay.style.top = '50%';
        this.debugOverlay.style.left = '50%';
        this.debugOverlay.style.transform = 'translate(-50%, -50%)';
        this.debugOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        this.debugOverlay.style.padding = '20px';
        this.debugOverlay.style.borderRadius = '10px';
        this.debugOverlay.style.display = 'none';
        this.debugOverlay.style.zIndex = '1000';
        document.body.appendChild(this.debugOverlay);
    }

    // Show error message in debug overlay
    showError(message) {
        this.debugOverlay.textContent = message;
        this.debugOverlay.style.display = 'block';
    }

    // Hide debug overlay
    hideDebugOverlay() {
        this.debugOverlay.style.display = 'none';
    }

    // Handle window resize
    onWindowResize() {
        if (!this.camera || !this.renderer) return;

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        if (this.controls) {
            this.controls.update();
        }
    }

    // Set up camera controls
    setupCameraControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1; // Increased from 0.05 for more responsive damping
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.rotateSpeed = 1.0; // Default rotation speed
        this.controls.zoomSpeed = 1.2; // Slightly increased zoom speed
        this.controls.panSpeed = 1.0; // Default pan speed
        
        // Set initial camera position and target
        this.camera.position.set(-1.00, 0.88, -8.91);
        this.controls.target.set(-1.21, 0.58, -0.01);
        
        this.controls.update();
    }

    // Animation loop
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = this.clock.getDelta();
        
        // Update TWEEN animations first
        TWEEN.update();
        
        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(delta);
        }
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Rotate model if enabled - only rotate the main model, not clones
        if (this.shouldRotateModel && this.model && this.model.parent === this.scene && this.model === this.scene.getObjectByName("FollicleSystem")) {
            this.model.rotation.y += this.modelRotationSpeed;
        }
        
        // Update effects
        if (this.effects) {
            this.effects.forEach(effect => {
                if (effect.update) {
                    effect.update(delta);
                }
            });
        }
        
        // Render
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    // Update visualization based on simulation state
    update(state) {
        if (!state) return;
        
        // Store current rotation if model exists
        const currentRotation = this.model ? this.model.rotation.clone() : null;
        
        // Update component visibility
        this.showBacteria = state.showBacteria !== false;
        this.showNeutrophils = state.showNeutrophils !== false;
        this.showInflammation = state.showInflammation !== false;
        this.showPus = state.showPus !== false;
        this.showEffects = state.showEffects !== false;
        
        // Update rotation state without changing current rotation
        if (this.model && state.rotateModel !== undefined) {
            this.shouldRotateModel = state.rotateModel;
            if (currentRotation) {
                this.model.rotation.copy(currentRotation);
            }
        }
        
        // Update stage-specific visuals
        if (state.stage && state.stage !== this.currentStage) {
            console.log('Stage changed from', this.currentStage, 'to', state.stage);  // Debug log
            this.currentStage = state.stage;
            this.updateStageVisuals(state.stage);
        }
        
        // Update effect intensities based on simulation values
        if (this.effectMeshes.inflammation && state.inflammationLevel !== undefined) {
            this.effectMeshes.inflammation.material.opacity = 
                Math.min(0.8, state.inflammationLevel / 100 * 0.8);
            this.effectMeshes.inflammation.scale.setScalar(
                1.0 + (state.inflammationLevel / 100 * 0.5));
        }
        
        if (this.effectMeshes.pus && state.pusLevel !== undefined) {
            this.effectMeshes.pus.material.opacity = 
                Math.min(1.0, state.pusLevel / 100);
            this.effectMeshes.pus.scale.setScalar(
                1.0 + (state.pusLevel / 100 * 0.3));
        }
    }

    // Load all required models
    createSkinModel() {
        try {
            const loadingManager = new THREE.LoadingManager();
            loadingManager.onError = (url) => {
                console.error('Error loading:', url);
                this.showError(`Error loading model: ${url}`);
            };

            // Create a GLTFLoader instance
            const loader = new GLTFLoader(loadingManager);
            
            // Load both models
            Promise.all([
                this.loadModel(loader, 'models/follicle_system.glb'),
                this.loadModel(loader, 'models/condition.glb')
            ]).then(([follicleModel, conditionModel]) => {
                // Process follicle system
                this.processFolicleModel(follicleModel);
                
                // Process condition model with animations
                this.processConditionModel(conditionModel);
                
                // Create floor
                this.createFloor();
                
                // Hide loading overlay
                this.hideDebugOverlay();
            }).catch(error => {
                console.error('Error loading models:', error);
                this.showError(`Error loading models: ${error.message}`);
            });

        } catch (error) {
            console.error('Error in createSkinModel:', error);
            this.showError(`Error creating skin model: ${error.message}`);
        }
    }

    // Promise wrapper for model loading
    loadModel(loader, url) {
        return new Promise((resolve, reject) => {
            const tryLoad = (currentUrl) => {
                // First, clean up any existing models
                if (this.model) {
                    this.scene.remove(this.model);
                    this.model = null;
                }
                
                // Remove any existing models with the same name
                this.scene.traverse((object) => {
                    if (object.name === "FollicleSystem") {
                        this.scene.remove(object);
                    }
                });
                
                loader.load(
                    currentUrl,
                    (gltf) => {
                        try {
                            // Process the model based on its type
                            if (currentUrl.includes('follicle')) {
                                this.processFolicleModel(gltf);
                            } else {
                                this.processConditionModel(gltf);
                            }
                            
                            // Store the model reference
                            this.model = gltf.scene;
                            
                            // Add to scene
                            this.scene.add(this.model);
                            
                            resolve(gltf);
                        } catch (error) {
                            console.error('Error processing model:', error);
                            reject(error);
                        }
                    },
                    undefined,
                    (error) => {
                        console.error('Error loading model:', error);
                        reject(error);
                    }
                );
            };
            
            tryLoad(url);
        });
    }

    // Process the follicle system model
    processFolicleModel(gltf) {
        this.model = gltf.scene;
        this.model.scale.set(1, 1, 1);
        this.model.position.set(0, 0, 0);
        
        this.model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Clone and store original materials
                child.userData.originalMaterial = child.material.clone();
                child.material = child.material.clone();
                
                if (child.name.includes('Follicle')) {
                    this.follicleMesh = child;
                    child.material.roughness = 0.7;
                    child.material.metalness = 0.2;
                }
                else if (child.name.includes('Skin')) {
                    this.skinMesh = child;
                    child.material.roughness = 0.8;
                    child.material.metalness = 0.1;
                    child.material.color.setHex(0xffdddd);
                }
                else if (child.name.includes('Hair')) {
                    this.hairMeshes.push(child);
                    child.visible = true;
                    child.material.roughness = 0.4;
                    child.material.metalness = 0.6;
                }
            }
        });
        
        this.scene.add(this.model);
    }

    // Process the condition model with animations
    processConditionModel(gltf) {
        console.log('Processing condition model...');
        
        try {
            // Store condition meshes
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    console.log('Found mesh:', child.name);
                    
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Clone materials to avoid shared state
                    child.material = child.material.clone();
                    child.userData.originalMaterial = child.material.clone();
                    
                    // Store meshes by their purpose
                    if (child.name.includes('Plug_Sebum')) {
                        this.effectMeshes.sebum = child;
                        child.material.transparent = true;
                        child.material.opacity = 0.6;
                        child.material.color.setHex(0xffffcc);
                        child.visible = false;
                    }
                    else if (child.name.includes('Cloud_Bacteria')) {
                        this.effectMeshes.bacteria = child;
                        child.material.transparent = true;
                        child.material.opacity = 0.7;
                        child.material.color.setHex(0x88ff88);
                        child.material.emissive.setHex(0x448844);
                        child.visible = false;
                    }
                    else if (child.name.includes('Cluster_Neutrophils')) {
                        this.effectMeshes.neutrophils = child;
                        child.material.transparent = true;
                        child.material.opacity = 0.8;
                        child.material.color.setHex(0xffffff);
                        child.visible = false;
                    }
                    else if (child.name.includes('Cluster_Macrophages')) {
                        this.effectMeshes.macrophages = child;
                        child.material.transparent = true;
                        child.material.opacity = 0.8;
                        child.material.color.setHex(0xeeeeff);
                        child.visible = false;
                    }
                    else if (child.name.includes('CTLs')) {
                        this.effectMeshes.ctls = child;
                        child.material.transparent = true;
                        child.material.opacity = 0.7;
                        child.material.color.setHex(0xff8888);
                        child.material.emissive.setHex(0x884444);
                        child.visible = false;
                    }
                    else if (child.name.includes('TRegs')) {
                        this.effectMeshes.tregs = child;
                        child.material.transparent = true;
                        child.material.opacity = 0.7;
                        child.material.color.setHex(0xffaa44);
                        child.material.emissive.setHex(0x884422);
                        child.visible = false;
                    }
                    else if (child.name.includes('RedHalo_Inflammation')) {
                        this.effectMeshes.inflammation = child;
                        child.material.transparent = true;
                        child.material.opacity = 0.4;
                        child.material.color.setHex(0xff6666);
                        child.visible = false;
                    }
                    else if (child.name.includes('Blob_Pus')) {
                        this.effectMeshes.pus = child;
                        child.material.transparent = true;
                        child.material.opacity = 0.8;
                        child.material.color.setHex(0xffffcc);
                        child.material.emissive.setHex(0x666600);
                        child.visible = false;
                    }
                    else if (child.name.includes('Mesh_Scar')) {
                        this.effectMeshes.scar = child;
                        child.material.transparent = true;
                        child.material.opacity = 0.7;
                        child.material.color.setHex(0x884444);
                        child.visible = false;
                    }
                    else if (child.name.includes('SkinLayer_')) {
                        // Handle skin layers
                        if (child.name.includes('Epidermis')) {
                            this.skinMesh = child;
                            child.material.transparent = true;
                            child.material.opacity = 0.9;
                            child.material.color.setHex(0xffdddd);
                        } else if (child.name.includes('Dermis')) {
                            child.material.color.setHex(0xffcccc);
                        }
                        child.material.roughness = 0.8;
                        child.material.metalness = 0.1;
                    }
                    else if (child.name.includes('Follicle_')) {
                        // Handle follicles
                        if (child.name.includes('Left')) {
                            this.follicleMesh = child;
                        }
                        child.material.roughness = 0.7;
                        child.material.metalness = 0.2;
                        child.material.color.setHex(0xcc8866);
                    }
                    else if (child.name.includes('HairStrand')) {
                        this.hairMeshes.push(child);
                        child.material.roughness = 0.4;
                        child.material.metalness = 0.6;
                        child.material.color.setHex(0x221100);
                    }
                }
            });
            
            // Add condition model to scene
            this.scene.add(gltf.scene);
            
            // Set up animation mixer if not already created
            if (!this.mixer) {
                console.log('Creating animation mixer');
                this.mixer = new THREE.AnimationMixer(gltf.scene);
            }
            
            // Process and store animations
            this.processAnimations(gltf);
            
            // Force an update of stage visuals
            if (this.currentStage) {
                console.log('Updating stage visuals after model processing');
                this.updateStageVisuals(this.currentStage);
            }
        } catch (error) {
            console.error('Error processing condition model:', error);
            this.showError(`Error processing condition model: ${error.message}`);
        }
    }

    // Create floor plane
    createFloor() {
        const floorGeometry = new THREE.PlaneGeometry(30, 30);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0xeeeeee,
            roughness: 0.8,
            metalness: 0.1,
            transparent: true,
            opacity: 0.3
        });
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -5;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);
    }

    // Set up scene lighting
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(5, 5, 5);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 3, -5);
        this.scene.add(fillLight);
    }

    // Create objects for simulation components
    createSimulationObjects() {
        // This will be implemented based on specific visualization needs
    }

    // Update stage-specific visuals
    updateStageVisuals(stage) {
        if (!this.model || !this.skinMesh) return;
        
        console.log('Updating visuals for stage:', stage);
        
        // Store current rotation and position
        const currentRotation = this.model.rotation.clone();
        const currentPosition = this.model.position.clone();
        
        // Remove any duplicate models and cleanup old effects first
        this.resetEffects();
        
        // Check if the model is already in the scene
        const modelInScene = this.model.parent === this.scene;
        
        // If the model is already in the scene, we don't need to add it again
        if (!modelInScene) {
            // Clean up any existing models in the scene with the same name
            this.scene.traverse((object) => {
                if (object.name === "FollicleSystem" && object !== this.model) {
                    console.log('Removing duplicate model:', object.uuid);
                    object.traverse((child) => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                    object.parent.remove(object);
                }
            });
            
            // Add the model to the scene
            this.scene.add(this.model);
        }
        
        const previousStage = this.currentStage;
        this.currentStage = stage;
        
        // Update stage labels
        this.updateStageLabels(stage);
        
        try {
            // Stop all previous animations and reset mixer
            if (this.mixer) {
                this.mixer.stopAllAction();
                if (this.animations[stage]) {
                    console.log(`Playing ${this.animations[stage].length} animations for stage:`, stage);
                    this.animations[stage].forEach(action => {
                        action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
                        action.play();
                    });
                }
            }
            
            // Restore rotation and position
            if (this.model) {
                this.model.rotation.copy(currentRotation);
                this.model.position.copy(currentPosition);
            }
            
            // Call stage-specific update function
            switch(stage.toLowerCase()) {
                case 'incubation':
                    this.updateIncubationVisuals();
                    break;
                    
                case 'comedone':
                    this.updateComedoneVisuals();
                    break;
                    
                case 'papule':
                    this.updatePapuleVisuals();
                    break;
                    
                case 'pustule':
                    this.updatePustuleVisuals();
                    break;
                    
                case 'rupture':
                    this.updateRuptureVisuals();
                    break;
                    
                case 'healing':
                    this.updateHealingVisuals();
                    break;
                    
                case 'resolved':
                    // Return to normal state
                    if (this.skinMesh && this.skinMesh.userData.originalMaterial) {
                        this.skinMesh.material.color.copy(this.skinMesh.userData.originalMaterial.color);
                        this.skinMesh.material.emissive.setHex(0x000000);
                        this.skinMesh.material.opacity = this.skinMesh.userData.originalMaterial.opacity;
                    }
                    if (this.follicleMesh && this.follicleMesh.userData.originalMaterial) {
                        this.follicleMesh.material.color.copy(this.follicleMesh.userData.originalMaterial.color);
                        this.follicleMesh.scale.set(1.0, 1.0, 1.0);
                        this.follicleMesh.material.emissive.setHex(0x000000);
                    }
                    // Hide all effect meshes
                    Object.values(this.effectMeshes).forEach(mesh => {
                        if (mesh) mesh.visible = false;
                    });
                    break;
                    
                case 'worsening':
                    this.updateWorseningVisuals();
                    break;
                    
                default:
                    console.warn('Unknown stage:', stage);
            }
            
        } catch (error) {
            console.error('Error updating stage visuals:', error);
            this.showError(`Error updating stage visuals: ${error.message}`);
        }
    }

    // Reset all effects before transitioning to new stage
    resetEffects() {
        console.log("Resetting effects..."); // Debug log

        // Stop any ongoing TWEEN animations
        TWEEN.removeAll();
        
        // Remove stage-specific effects
        while (this.stageSpecificEffects.length > 0) {
            const effect = this.stageSpecificEffects.pop();
            if (effect.parent) {
                effect.parent.remove(effect);
                // Properly dispose of geometries and materials
                effect.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
        }
        
        // Reset skin mesh
        if (this.skinMesh && this.skinMesh.userData.originalMaterial) {
            this.skinMesh.material.color.copy(this.skinMesh.userData.originalMaterial.color);
            this.skinMesh.material.emissive.setHex(0x000000);
            this.skinMesh.material.roughness = this.skinMesh.userData.originalMaterial.roughness;
            this.skinMesh.material.metalness = this.skinMesh.userData.originalMaterial.metalness;
            this.skinMesh.material.opacity = this.skinMesh.userData.originalMaterial.opacity;
            this.skinMesh.material.transparent = this.skinMesh.userData.originalMaterial.transparent;
            
            // Reset morphTargets
            if (this.skinMesh.morphTargetInfluences) {
                for (let i = 0; i < this.skinMesh.morphTargetInfluences.length; i++) {
                    this.skinMesh.morphTargetInfluences[i] = 0;
                }
            }
        } else if (this.skinMesh) {
             // Fallback reset if original material wasn't stored
            this.skinMesh.material.color.setHex(0xffdddd);
            this.skinMesh.material.emissive.setHex(0x000000);
        }
        
        // Reset follicle mesh
        if (this.follicleMesh && this.follicleMesh.userData.originalMaterial) {
            this.follicleMesh.material.color.copy(this.follicleMesh.userData.originalMaterial.color);
            this.follicleMesh.material.emissive.setHex(0x000000);
            this.follicleMesh.material.roughness = this.follicleMesh.userData.originalMaterial.roughness;
            this.follicleMesh.material.metalness = this.follicleMesh.userData.originalMaterial.metalness;
            this.follicleMesh.material.opacity = this.follicleMesh.userData.originalMaterial.opacity;
            this.follicleMesh.material.transparent = this.follicleMesh.userData.originalMaterial.transparent;
            this.follicleMesh.position.copy(this.follicleMesh.userData.originalPosition || new THREE.Vector3(0,0,0));
            this.follicleMesh.scale.set(1, 1, 1);
        } else if (this.follicleMesh) {
            // Fallback reset
            this.follicleMesh.material.color.setHex(0x553322);
            this.follicleMesh.scale.set(1, 1, 1);
            this.follicleMesh.position.set(0,0,0);
        }
        
        // Reset effect meshes
        Object.values(this.effectMeshes).forEach(mesh => {
            if (mesh) {
                mesh.visible = false;
                mesh.scale.set(1, 1, 1);
                mesh.position.set(0, 0, 0);
                mesh.rotation.set(0, 0, 0);
                if (mesh.material && mesh.userData.originalMaterial) {
                    mesh.material.opacity = mesh.userData.originalMaterial.opacity;
                    mesh.material.emissive.setHex(0x000000);
                    mesh.material.color.copy(mesh.userData.originalMaterial.color);
                } else if (mesh.material) {
                    // Fallback material reset
                    mesh.material.opacity = 1.0;
                    mesh.material.emissive.setHex(0x000000);
                }
            }
        });

        // Reset floor opacity
        if (this.floor) {
            this.floor.material.opacity = 0.3; // Reset to default
        }
    }

    // Process animations in the model
    processAnimations(gltf) {
        if (!gltf.animations || gltf.animations.length === 0) {
            console.warn('No model animations found, TWEEN animations will be used.');
            return;
        }

        if (!this.mixer) {
            this.mixer = new THREE.AnimationMixer(gltf.scene);
        }

        // Map animation names to stages
        const animationStageMap = {
            'StartClogging': 'comedone',
            'BacterialGrowth': 'comedone',
            'ImmuneRecruitment': 'papule',
            'InflammationExpand': 'papule',
            'PusFormation': 'pustule',
            'FollicleRupture': 'rupture',
            'CTL_AttackCycle': 'rupture',
            'HealingPhase': 'healing',
            'ScarFormation': 'worsening'
        };

        // Process each animation
        gltf.animations.forEach(clip => {
            console.log('Processing animation:', clip.name);
            const action = this.mixer.clipAction(clip);
            
            // Store animation by its stage name
            const stageName = animationStageMap[clip.name];
            if (stageName) {
                if (!this.animations[stageName]) {
                    this.animations[stageName] = [];
                }
                this.animations[stageName].push(action);
                
                // Configure animation properties
                action.clampWhenFinished = true;
                action.loop = clip.name.includes('Phase') ? THREE.LoopRepeat : THREE.LoopOnce;
                action.timeScale = 1.0;
                action.weight = 1.0;
            }
        });
        
        this.hasGltfAnimations = true;
    }

    // Update stage labels
    updateStageLabels(currentStage) {
        if (!this.stageLabels) return;
        
        Object.entries(this.stageLabels).forEach(([stage, label]) => {
            if (stage === currentStage) {
                label.style.opacity = '1';
                label.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                label.style.fontWeight = 'bold';
            } else {
                label.style.opacity = '0.5';
                label.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                label.style.fontWeight = 'normal';
            }
        });
    }

    // Set camera position with smooth transition
    setCameraPosition(position, target) {
        if (!this.camera || !this.controls) return;
        
        // Set position immediately first
        this.camera.position.set(position.x, position.y, position.z);
        this.controls.target.set(target.x, target.y, target.z);
        this.controls.update();
        
        // Then animate to ensure smooth transitions for subsequent moves
        new TWEEN.Tween(this.camera.position)
            .to({ x: position.x, y: position.y, z: position.z }, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
            
        new TWEEN.Tween(this.controls.target)
            .to({ x: target.x, y: target.y, z: target.z }, 1000)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => this.controls.update())
            .start();
    }

    // Create labels for different stages
    createStageLabels() {
        // Remove any existing labels
        Object.values(this.stageLabels || {}).forEach(label => {
            if (label && label.parentNode) {
                label.parentNode.removeChild(label);
            }
        });
        
        // Initialize stageLabels object
        this.stageLabels = {};
        
        // Define stages in correct order
        const stages = [
            { id: 'incubation', name: 'Incubation' },
            { id: 'comedone', name: 'Comedone' },
            { id: 'papule', name: 'Papule' },
            { id: 'pustule', name: 'Pustule' },
            { id: 'rupture', name: 'Rupture' },
            { id: 'healing', name: 'Healing' },
            { id: 'worsening', name: 'Worsening' }
        ];
        
        // Create container for labels if it doesn't exist
        let labelContainer = document.getElementById('stageLabelsContainer');
        if (!labelContainer) {
            labelContainer = document.createElement('div');
            labelContainer.id = 'stageLabelsContainer';
            labelContainer.style.position = 'absolute';
            labelContainer.style.top = '10px';
            labelContainer.style.left = '10px';
            labelContainer.style.zIndex = '1000';
            labelContainer.style.display = 'flex';
            labelContainer.style.flexDirection = 'column';
            labelContainer.style.gap = '5px';
            document.body.appendChild(labelContainer);
        }
        
        // Create labels for each stage
        stages.forEach((stage, index) => {
            const label = document.createElement('div');
            label.textContent = stage.name;
            label.style.padding = '5px 10px';
            label.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            label.style.borderRadius = '5px';
            label.style.color = '#333';
            label.style.fontFamily = 'Arial, sans-serif';
            label.style.fontSize = '14px';
            label.style.opacity = '0.5';
            label.style.transition = 'all 0.3s ease';
            label.style.cursor = 'pointer';
            
            // Add hover effect
            label.addEventListener('mouseover', () => {
                if (label.style.opacity !== '1') {
                    label.style.backgroundColor = 'rgba(220, 220, 220, 0.7)';
                }
            });
            
            label.addEventListener('mouseout', () => {
                if (label.style.opacity !== '1') {
                    label.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }
            });
            
            // Store reference to label
            this.stageLabels[stage.id] = label;
            
            // Add to container
            labelContainer.appendChild(label);
        });
    }

    // --- Enhanced Stage-Specific Visual Update Methods --- 

    updateIncubationVisuals() {
        console.log("Applying Incubation visuals - Enhanced");
        
        // Subtle skin color variation
        if (this.skinMesh) {
            const skinColorPulse = { value: 0 };
            new TWEEN.Tween(skinColorPulse)
                .to({ value: 1 }, 3000)
                .easing(TWEEN.Easing.Sinusoidal.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .onUpdate(() => {
                    if (this.skinMesh) {
                        this.skinMesh.material.color.lerpColors(
                            new THREE.Color(0xffdddd), // Base skin color
                            new THREE.Color(0xffd0d0), // Slightly pinker
                            skinColorPulse.value
                        );
                    }
                })
                .start();
        }

        // Subtle follicle movement
        if (this.follicleMesh) {
            // Gentle breathing motion
            new TWEEN.Tween(this.follicleMesh.scale)
                .to({ x: 1.05, y: 1.05, z: 1.05 }, 2000)
                .easing(TWEEN.Easing.Sinusoidal.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .start();
                
            // Very subtle up/down motion
            new TWEEN.Tween(this.follicleMesh.position)
                .to({ y: 0.02 }, 2500)
                .easing(TWEEN.Easing.Sinusoidal.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .start();
        }

        // Add subtle vein pulsing for more visibility
        this.createPulsingVeins({
            count: 5, // Fewer veins for incubation
            color: 0xff9999, // Light pink
            opacity: 0.3, // Very subtle
            thickness: 0.015,
            pulseScale: 1.2,
            pulseDuration: 3000,
            areaRadius: 1.0,
            verticalSpread: 0.3
        });

        // Subtle glow effect
        if (this.skinMesh) {
            const glowPulse = { value: 0 };
            new TWEEN.Tween(glowPulse)
                .to({ value: 1 }, 3000)
                .easing(TWEEN.Easing.Sinusoidal.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .onUpdate(() => {
                    if (this.skinMesh) {
                        this.skinMesh.material.emissive.setHex(
                            glowPulse.value < 0.5 ? 0x110000 : 0x220000
                        );
                    }
                })
                .start();
        }

        // Add subtle hair movement if present
        this.hairMeshes.forEach(hair => {
            if (hair) {
                new TWEEN.Tween(hair.rotation)
                    .to({ z: 0.02 }, 2000)
                    .easing(TWEEN.Easing.Sinusoidal.InOut)
                    .yoyo(true)
                    .repeat(Infinity)
                    .start();
            }
        });
    }

    updateComedoneVisuals() {
        console.log("Applying Comedone visuals");
        if (this.skinMesh) {
            // Slight darkening/reddening
            new TWEEN.Tween(this.skinMesh.material.color)
                .to({ r: 0.95, g: 0.8, b: 0.8 }, 500) // Target color ffd0d0
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }

        if (this.follicleMesh) {
            // Slight swelling
             new TWEEN.Tween(this.follicleMesh.scale)
                .to({ x: 1.1, y: 1.1, z: 1.1 }, 500)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
             // Darken follicle color
            new TWEEN.Tween(this.follicleMesh.material.color)
                .to({ r: 0.26, g: 0.13, b: 0.06 }, 500) // Target color 442211
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }

        // Slight inflammation visible
        if (this.effectMeshes.inflammation) {
            this.effectMeshes.inflammation.visible = true;
            this.effectMeshes.inflammation.scale.set(1.05, 1.05, 1.05);
            this.effectMeshes.inflammation.material.color.setHex(0xffaaaa);
            new TWEEN.Tween(this.effectMeshes.inflammation.material)
                .to({ opacity: 0.3 }, 500)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
    }

    updatePapuleVisuals() {
        console.log("Applying Papule visuals - Enhanced Intensity");
        if (this.skinMesh) {
            // More pronounced redness
            new TWEEN.Tween(this.skinMesh.material.color)
                .to({ r: 1.0, g: 0.5, b: 0.5 }, 400) // Brighter red ff8080
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
             // Stronger pulsing emissive glow
             new TWEEN.Tween(this.skinMesh.material.emissive)
                .to({ r: 0.15, g: 0.0, b: 0.0 }, 1200) // Target color 260000
                .easing(TWEEN.Easing.Quadratic.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .start(); 
        }

        if (this.follicleMesh) {
            // Significant swelling
            new TWEEN.Tween(this.follicleMesh.scale)
                .to({ x: 1.35, y: 1.35, z: 1.35 }, 400)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
            // Angry red color
             new TWEEN.Tween(this.follicleMesh.material.color)
                .to({ r: 1.0, g: 0.3, b: 0.15 }, 400) // Target color ff4d26
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
            // More noticeable upward movement oscillation
             new TWEEN.Tween(this.follicleMesh.position)
                .to({ y: 0.1 }, 1800)
                .easing(TWEEN.Easing.Sinusoidal.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .start();
        }

        // Inflammation more visible and active
        if (this.effectMeshes.inflammation) {
            this.effectMeshes.inflammation.visible = true;
            this.effectMeshes.inflammation.material.color.setHex(0xff4444); // Intense red
             // Grow inflammation mesh size
             new TWEEN.Tween(this.effectMeshes.inflammation.scale)
                .to({ x: 1.6, y: 1.6, z: 1.6 }, 400) 
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
             // Set opacity
            new TWEEN.Tween(this.effectMeshes.inflammation.material)
                .to({ opacity: 0.75 }, 400)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
            // Stronger pulsing scale for inflammation
             new TWEEN.Tween(this.effectMeshes.inflammation.scale)
                .to({ x: 1.7, y: 1.7, z: 1.7 }, 1500)
                .easing(TWEEN.Easing.Sinusoidal.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .delay(400) 
                .start();
        }
        
        // Add subtle veins for Papule stage
        this.createPulsingVeins({
            count: 8,
            color: 0xcc0000, // Slightly darker red
            opacity: 0.5,
            thickness: 0.02,
            pulseScale: 1.3,
            pulseDuration: 1000,
            areaRadius: 1.2
        });
    }

    updatePustuleVisuals() {
        console.log("Applying Pustule visuals - Enhanced Intensity");
        // Setup initial state immediately
        if (this.effectMeshes.inflammation) {
            this.effectMeshes.inflammation.visible = true;
            this.effectMeshes.inflammation.material.opacity = 0.9; // More opaque
            this.effectMeshes.inflammation.material.color.setHex(0xff3311); // Angry red
            this.effectMeshes.inflammation.scale.set(1.8, 1.8, 1.8); // Larger
            this.effectMeshes.inflammation.position.y = 0;
        }
        if (this.effectMeshes.pus) {
            this.effectMeshes.pus.visible = true;
            this.effectMeshes.pus.material.opacity = 0.95; // Almost opaque
            this.effectMeshes.pus.material.color.setHex(0xffffe0); // Brighter yellow
            this.effectMeshes.pus.material.emissive.setHex(0x555500); // Stronger glow
            this.effectMeshes.pus.scale.set(1.5, 1.5, 1.5); // Larger pus volume
            this.effectMeshes.pus.position.y = 0.05; // Slightly raised
        }
        if (this.skinMesh) {
            this.skinMesh.material.color.setHex(0xff7755); // More inflamed color
            this.skinMesh.material.emissive.setHex(0x441100); // Higher base emissive
        }
        if (this.follicleMesh) {
            this.follicleMesh.material.color.setHex(0xff6633); // Brighter inflamed follicle
            this.follicleMesh.material.emissive.setHex(0x331100);
            this.follicleMesh.scale.set(1.6, 1.6, 1.6); // Significantly swollen
        }
         if (this.floor) {
            this.floor.material.opacity = 0.15; // More transparent
        }

        // Apply TWEEN animations
        if (this.skinMesh) {
            // Very intense pulsing skin emissive
            const skinPulse = { value: 0 };
            new TWEEN.Tween(skinPulse)
                .to({ value: 0.6 }, 800) // Faster, stronger pulse
                .easing(TWEEN.Easing.Quadratic.InOut).yoyo(true).repeat(Infinity)
                .onUpdate(() => { if (this.skinMesh) this.skinMesh.material.emissive.lerpColors(new THREE.Color(0x441100), new THREE.Color(0x883300), skinPulse.value); })
                .start();
        }
        if (this.follicleMesh) {
            // Stronger follicle pulsing scale
             new TWEEN.Tween(this.follicleMesh.scale)
                .to({ x: 1.7, y: 1.7, z: 1.7 }, 1200)
                .easing(TWEEN.Easing.Sinusoidal.InOut).yoyo(true).repeat(Infinity)
                .start();
        }
        if (this.effectMeshes.inflammation) {
             // More pronounced floating inflammation motion
            new TWEEN.Tween(this.effectMeshes.inflammation.position)
                .to({ y: 0.25 }, 1800)
                .easing(TWEEN.Easing.Sinusoidal.InOut).yoyo(true).repeat(Infinity)
                .start();
        }
        if (this.effectMeshes.pus) {
            // Pus intense pulsing scale and glistening/opacity fluctuation
            const pusEffects = { scale: 1.5, opacity: 0.95 };
            new TWEEN.Tween(pusEffects)
                .to({ scale: 1.8, opacity: 1.0 }, 900)
                .easing(TWEEN.Easing.Sinusoidal.InOut).yoyo(true).repeat(Infinity)
                .onUpdate(() => {
                    if (this.effectMeshes.pus) {
                        this.effectMeshes.pus.scale.setScalar(pusEffects.scale);
                        this.effectMeshes.pus.material.opacity = pusEffects.opacity;
                    }
                })
                .start();
             // Pus color shift towards brighter/sicklier yellow
             new TWEEN.Tween(this.effectMeshes.pus.material.color)
                .to({ r: 1.0, g: 1.0, b: 0.85 }, 900) // Target ffffd9
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
        
        // Add prominent pulsing veins for Pustule stage
        this.createPulsingVeins({
            count: 20,
            color: 0xff0000, 
            opacity: 0.7,
            thickness: 0.04,
            pulseScale: 1.7,
            pulseDuration: 700, // Faster pulse
            areaRadius: 1.8,
            verticalSpread: 0.7
        });
    }

    updateRuptureVisuals() {
        console.log("Applying Rupture visuals - Enhanced Intensity");
        // Setup initial state
        if (this.skinMesh) {
            this.skinMesh.material.color.setHex(0xcc0000); // Deep angry red
            this.skinMesh.material.emissive.setHex(0x550000); // Strongest emissive
        }
        if (this.follicleMesh) {
            this.follicleMesh.material.color.setHex(0xdd4422); // Damaged look
            this.follicleMesh.material.emissive.setHex(0x441100);
            this.follicleMesh.scale.set(1.7, 1.7, 1.7); // Max swelling before potential collapse
        }
        if (this.effectMeshes.inflammation) {
            // Keep inflammation visible but maybe slightly receded compared to pustule peak
            this.effectMeshes.inflammation.visible = true;
            this.effectMeshes.inflammation.material.opacity = 0.8;
            this.effectMeshes.inflammation.material.color.setHex(0xff2222);
            this.effectMeshes.inflammation.scale.set(1.9, 1.9, 1.9);
        }
        if (this.effectMeshes.rupture) {
            this.effectMeshes.rupture.visible = true;
            this.effectMeshes.rupture.material.opacity = 1.0;
            this.effectMeshes.rupture.material.color.setHex(0xaa0000); // Dark blood red
            this.effectMeshes.rupture.scale.set(1.0, 1.0, 1.0); // Starts small for burst animation
            this.effectMeshes.rupture.position.y = 0.1;
        }

        // Apply animations
        if (this.skinMesh) {
            // Extremely intense skin pulsing/throbbing
            const skinPulse = { value: 0 };
            new TWEEN.Tween(skinPulse)
                .to({ value: 0.8 }, 600) // Very fast, strong pulse
                .easing(TWEEN.Easing.Quadratic.InOut).yoyo(true).repeat(Infinity)
                .onUpdate(() => { if (this.skinMesh) this.skinMesh.material.emissive.lerpColors(new THREE.Color(0x550000), new THREE.Color(0xaa0000), skinPulse.value); })
                .start();
        }
        
        // Trigger Particle Burst - Enhanced for more surface-level effect
        this.createRuptureParticles({
            count: 200, // More particles
            color: 0xaa0000,
            size: 0.18, // Larger particles
            duration: 2500, // Longer duration
            burstRadius: 1.2, // Wider burst
            upwardVelocity: 1.8, // Less upward, more outward
            spreadVelocity: 2.5, // More horizontal spread
            gravity: 0.05 // Less gravity for more surface-level effect
        });
        
        // Create a second burst for more dramatic effect
        setTimeout(() => {
            this.createRuptureParticles({
                count: 150,
                color: 0x880000,
                size: 0.15,
                duration: 2000,
                burstRadius: 1.5,
                upwardVelocity: 1.5,
                spreadVelocity: 2.0,
                gravity: 0.04
            });
        }, 300);
        
        // Animate the rupture mesh itself (less critical now with particles)
        if (this.effectMeshes.rupture) {
            // Quick expansion of the rupture mesh
            const ruptureEffects = { scale: 1.0, y: 0.1 };
            new TWEEN.Tween(ruptureEffects)
                .to({ scale: 2.0, y: 0.2 }, 400) // Faster expansion, more surface-level
                .easing(TWEEN.Easing.Exponential.Out) 
                .onUpdate(() => {
                    if (this.effectMeshes.rupture) {
                        this.effectMeshes.rupture.scale.setScalar(ruptureEffects.scale);
                        this.effectMeshes.rupture.position.y = ruptureEffects.y;
                    }
                })
                .start();
                
            // Fade the rupture mesh more quickly
            new TWEEN.Tween(this.effectMeshes.rupture.material)
                .to({ opacity: 0.5 }, 800)
                .easing(TWEEN.Easing.Quadratic.Out)
                .delay(400) 
                .yoyo(true)
                .repeat(Infinity)
                .start();
        }
        
        // Add damaged/ruptured veins effect (optional, could reuse pulsing veins with different color/intensity)
         this.createPulsingVeins({
            count: 25,
            color: 0x990000, // Darker, damaged red
            opacity: 0.8,
            thickness: 0.05,
            pulseScale: 1.2, // Less intense pulse, more static damage
            pulseDuration: 1200,
            areaRadius: 2.0,
            verticalSpread: 0.8
        });
    }

    updateHealingVisuals() {
        console.log("Applying Healing visuals - Reinstated");
        // Setup initial state (less intense than rupture)
        if (this.skinMesh) {
            this.skinMesh.material.color.setHex(0xffaaaa); // Start pinkish from rupture
            this.skinMesh.material.emissive.setHex(0x110000); // Still slightly emissive
        }
        if (this.follicleMesh) {
            this.follicleMesh.material.color.setHex(0x886655); // Dull color
            this.follicleMesh.scale.set(1.3, 1.3, 1.3); // Start swollen from previous stage
            this.follicleMesh.material.emissive.setHex(0x050000); // Very low emissive
        }
        if (this.effectMeshes.inflammation) {
            this.effectMeshes.inflammation.visible = true;
            this.effectMeshes.inflammation.material.opacity = 0.6; // Start fading
            this.effectMeshes.inflammation.material.color.setHex(0xff8888); // Less intense red
            this.effectMeshes.inflammation.scale.set(1.5, 1.5, 1.5); // Start large from previous stage
        }

        // Apply healing animations (gradual return to normal)
        if (this.skinMesh && this.skinMesh.userData.originalMaterial) {
            // Gradual color transition back to normal
            new TWEEN.Tween(this.skinMesh.material.color)
                .to({ r: this.skinMesh.userData.originalMaterial.color.r,
                      g: this.skinMesh.userData.originalMaterial.color.g,
                      b: this.skinMesh.userData.originalMaterial.color.b }, 3500)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .start();
            // Fade out emissive completely
            new TWEEN.Tween(this.skinMesh.material.emissive)
                .to({ r: 0, g: 0, b: 0 }, 2500)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
        if (this.follicleMesh && this.follicleMesh.userData.originalMaterial) {
            // Gradual scale reduction back to normal
            new TWEEN.Tween(this.follicleMesh.scale)
                .to({ x: 1.0, y: 1.0, z: 1.0 }, 3500)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .start();
            // Gradual color return
            const originalFollicleColor = this.follicleMesh.userData.originalMaterial.color;
            new TWEEN.Tween(this.follicleMesh.material.color)
                .to({ r: originalFollicleColor.r, g: originalFollicleColor.g, b: originalFollicleColor.b }, 3500)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .start();
             // Fade out emissive
            new TWEEN.Tween(this.follicleMesh.material.emissive)
                .to({ r: 0, g: 0, b: 0 }, 2500)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
        if (this.effectMeshes.inflammation) {
            // Inflammation fade out completely
            new TWEEN.Tween(this.effectMeshes.inflammation.material)
                .to({ opacity: 0.0 }, 3000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onComplete(() => { if (this.effectMeshes.inflammation) this.effectMeshes.inflammation.visible = false; })
                .start();
            // Inflammation scale reduction
            new TWEEN.Tween(this.effectMeshes.inflammation.scale)
                .to({ x: 1.0, y: 1.0, z: 1.0 }, 3000) // Shrink back to base scale
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
        
        // Fade out any remaining veins from rupture stage
        this.stageSpecificEffects.forEach(effect => {
             if (effect.name === "PulsingVeinsEffect" && effect.children.length > 0) {
                 effect.children.forEach(veinMesh => {
                    if (veinMesh.material) {
                         new TWEEN.Tween(veinMesh.material)
                            .to({ opacity: 0.0 }, 2000)
                            .easing(TWEEN.Easing.Quadratic.Out)
                            .start();
                    }
                 });
             }
        });
    }

    updateWorseningVisuals() {
        console.log("Applying Worsening visuals - Enhanced with combined animations");
        
        // Intensify inflammation and damage
        if (this.skinMesh) {
            this.skinMesh.material.color.setHex(0xbb0000); // Deep angry red
            this.skinMesh.material.emissive.setHex(0x660000); // Strong emissive
            
            // Intense pulsing
            const skinPulse = { value: 0 };
            new TWEEN.Tween(skinPulse)
                .to({ value: 1.0 }, 500)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .onUpdate(() => {
                    if (this.skinMesh) {
                        this.skinMesh.material.emissive.lerpColors(
                            new THREE.Color(0x660000),
                            new THREE.Color(0xaa0000),
                            skinPulse.value
                        );
                    }
                })
                .start();
        }

        if (this.follicleMesh) {
            this.follicleMesh.material.color.setHex(0x990000); // Dark damaged red
            this.follicleMesh.scale.set(2.0, 2.0, 2.0); // Extreme swelling
            this.follicleMesh.material.emissive.setHex(0x330000);
            
            // Erratic movement
            new TWEEN.Tween(this.follicleMesh.position)
                .to({ y: 0.3 }, 600)
                .easing(TWEEN.Easing.Sinusoidal.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .start();
        }

        // Show intense inflammation
        if (this.effectMeshes.inflammation) {
            this.effectMeshes.inflammation.visible = true;
            this.effectMeshes.inflammation.material.opacity = 0.9;
            this.effectMeshes.inflammation.material.color.setHex(0xff1111);
            this.effectMeshes.inflammation.scale.set(2.2, 2.2, 2.2);
            
            // Pulsing scale animation
            new TWEEN.Tween(this.effectMeshes.inflammation.scale)
                .to({ x: 2.4, y: 2.4, z: 2.4 }, 800)
                .easing(TWEEN.Easing.Sinusoidal.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .start();
        }

        // Show multiple rupture points
        if (this.effectMeshes.rupture) {
            this.effectMeshes.rupture.visible = true;
            this.effectMeshes.rupture.material.opacity = 1.0;
            this.effectMeshes.rupture.material.color.setHex(0x880000);
            this.effectMeshes.rupture.scale.set(2.0, 2.0, 2.0);
        }

        // Show scar tissue forming
        if (this.effectMeshes.scar) {
            this.effectMeshes.scar.visible = true;
            this.effectMeshes.scar.material.opacity = 0.8;
            this.effectMeshes.scar.material.color.setHex(0x663333);
            this.effectMeshes.scar.scale.set(1.5, 1.5, 1.5);
        }

        // Create intense vein effects
        this.createPulsingVeins({
            count: 30,
            color: 0x880000,
            opacity: 0.8,
            thickness: 0.06,
            pulseScale: 1.8,
            pulseDuration: 600,
            areaRadius: 2.5,
            verticalSpread: 1.0
        });

        // Create multiple rupture particle effects - staggered for dramatic effect
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.createRuptureParticles({
                    count: 100,
                    color: 0x990000,
                    size: 0.12,
                    duration: 2000,
                    burstRadius: 0.8,
                    upwardVelocity: 2.0,
                    spreadVelocity: 1.5
                });
            }, i * 500); // Stagger the effects
        }

        // Make floor more transparent to emphasize the severity
        if (this.floor) {
            this.floor.material.opacity = 0.1;
        }
        
        // Add papule-like swelling animation
        if (this.follicleMesh) {
            // More pronounced swelling
            new TWEEN.Tween(this.follicleMesh.scale)
                .to({ x: 2.2, y: 2.2, z: 2.2 }, 800)
                .easing(TWEEN.Easing.Quadratic.Out)
                .yoyo(true)
                .repeat(Infinity)
                .start();
                
            // Angry red color pulsing
            new TWEEN.Tween(this.follicleMesh.material.color)
                .to({ r: 1.0, g: 0.2, b: 0.1 }, 1000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .start();
        }
        
        // Add pustule-like pus formation
        if (this.effectMeshes.pus) {
            this.effectMeshes.pus.visible = true;
            this.effectMeshes.pus.material.opacity = 0.9;
            this.effectMeshes.pus.material.color.setHex(0xffffcc);
            this.effectMeshes.pus.material.emissive.setHex(0x666600);
            this.effectMeshes.pus.scale.set(1.8, 1.8, 1.8);
            
            // Pus pulsing animation
            new TWEEN.Tween(this.effectMeshes.pus.scale)
                .to({ x: 2.0, y: 2.0, z: 2.0 }, 700)
                .easing(TWEEN.Easing.Sinusoidal.InOut)
                .yoyo(true)
                .repeat(Infinity)
                .start();
        }
    }

    // --- Helper function to create pulsing veins ---
    createPulsingVeins(options = {}) {
        const {
            count = 15,
            color = 0xff0000,
            opacity = 0.6,
            thickness = 0.03,
            pulseScale = 1.5,
            pulseDuration = 800,
            areaRadius = 1.5, // Radius around the follicle where veins appear
            verticalSpread = 0.5 // How far up/down the veins can go
        } = options;

        const veinGroup = new THREE.Group();
        veinGroup.name = "PulsingVeinsEffect";
        this.stageSpecificEffects.push(veinGroup); // Track for removal

        const veinMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < count; i++) {
            // Create random curve points on a disk, slightly offset vertically
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * areaRadius;
            const startPoint = new THREE.Vector3(
                Math.cos(angle) * radius,
                (Math.random() - 0.5) * verticalSpread,
                Math.sin(angle) * radius
            );

            const endAngle = angle + (Math.random() - 0.5) * Math.PI / 2; // Slightly different angle for end
            const endRadius = radius + Math.random() * 0.5; // Extend further out
             const endPoint = new THREE.Vector3(
                Math.cos(endAngle) * endRadius,
                (Math.random() - 0.5) * verticalSpread,
                Math.sin(endAngle) * endRadius
            );
            
            // Add control points for curvature
            const midPoint1 = startPoint.clone().lerp(endPoint, 0.3).add(new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(0.5));
            const midPoint2 = startPoint.clone().lerp(endPoint, 0.7).add(new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(0.5));

            const curve = new THREE.CubicBezierCurve3(startPoint, midPoint1, midPoint2, endPoint);
            const veinGeometry = new THREE.TubeGeometry(curve, 20, thickness, 8, false);
            const veinMesh = new THREE.Mesh(veinGeometry, veinMaterial.clone()); // Clone material for individual control if needed
            
            veinGroup.add(veinMesh);

            // Add pulsing animation
            const pulse = { scale: 1.0 };
            new TWEEN.Tween(pulse)
                .to({ scale: pulseScale }, pulseDuration * (0.8 + Math.random() * 0.4)) // Vary duration slightly
                .easing(TWEEN.Easing.Sinusoidal.InOut)
                .yoyo(true)
                .delay(Math.random() * pulseDuration) // Stagger start times
                .onUpdate(() => {
                    veinMesh.scale.set(pulse.scale, 1, pulse.scale); // Pulse width/depth
                })
                .start();
        }

        this.scene.add(veinGroup);
        return veinGroup;
    }
    
    // --- Helper function for rupture particle effect ---
    createRuptureParticles(options = {}) {
        const {
            count = 150,
            color = 0xaa0000,
            size = 0.15,
            duration = 2000,
            burstRadius = 1.2,
            upwardVelocity = 2.5,  // Increased upward velocity
            spreadVelocity = 0.8,  // Reduced spread velocity
            gravity = 0.15  // Increased gravity to compensate for higher upward velocity
        } = options;

        const particles = new THREE.Group();
        this.scene.add(particles);

        // Create particles
        for (let i = 0; i < count; i++) {
            const geometry = new THREE.SphereGeometry(size * (0.5 + Math.random() * 0.5), 4, 4);
            const material = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(geometry, material);
            
            // Initial position - start at rupture point
            particle.position.set(0, 0.1, 0);
            
            // Initial velocity - more upward focused
            const angle = Math.random() * Math.PI * 2;
            const upwardBias = 0.7 + Math.random() * 0.3; // 70-100% upward bias
            particle.userData.velocity = new THREE.Vector3(
                Math.cos(angle) * spreadVelocity * (1 - upwardBias),
                upwardVelocity * upwardBias,
                Math.sin(angle) * spreadVelocity * (1 - upwardBias)
            );
            
            particles.add(particle);
        }

        // Animate particles
        const startTime = Date.now();
        const animate = () => {
            const elapsedTime = Date.now() - startTime;
            
            if (elapsedTime < duration) {
                particles.children.forEach(particle => {
                    // Update position based on velocity
                    particle.position.add(particle.userData.velocity);
                    
                    // Apply gravity
                    particle.userData.velocity.y -= gravity;
                    
                    // Fade out
                    particle.material.opacity = 0.8 * (1 - elapsedTime / duration);
                });
                
                requestAnimationFrame(animate);
            } else {
                // Clean up
                this.scene.remove(particles);
                particles.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
        };
        
        animate();
    }
}