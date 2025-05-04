import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three';

export class AssetLoader {
    constructor(loadingManager) {
        this.loadingManager = loadingManager || new THREE.LoadingManager();
        
        // Yükleyicileri başlat
        this.textureLoader = new TextureLoader(this.loadingManager);
        this.gltfLoader = new GLTFLoader(this.loadingManager);
        this.audioLoader = new THREE.AudioLoader(this.loadingManager);
        
        // Varlık depolama
        this.textures = {};
        this.models = {};
        this.sounds = {};
        
        // Başlatma durumunu izleyen bayrak
        this.initialized = false;
        
        // Varsayılan dokuları hemen oluştur
        this.createDefaultTextures();
        
        // Varsayılan modelleri hemen oluştur
        this.createDefaultModels();
        
        console.log("AssetLoader başlatıldı");
        this.initialized = true;
    }
    
    createDefaultTextures() {
        console.log("Varsayılan dokular oluşturuluyor");
        // Her doku türü için küçük bir tuval oluştur
        const createCanvas = (color) => {
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 16, 16);
            return canvas;
        };
        
        // Farklı renklerle varsayılan dokular oluştur
        const defaultTextureColors = {
            fire: '#ff5500',
            smoke: '#777777',
            spark: '#ffaa00',
            dust: '#bbbbbb',
            blood: '#aa0000',
            bulletHole: '#444444',
            floorMilitary: '#556b2f',
            floorIndustrial: '#696969',
            floorUrban: '#a9a9a9',
            floorLaboratory: '#f0f8ff',
            wallMilitary: '#556b2f',
            wallIndustrial: '#696969',
            wallUrban: '#a9a9a9',
            wallLaboratory: '#f0f8ff',
            crosshair: '#ffffff',
            healthIcon: '#ff0000',
            ammoIcon: '#ffff00'
        };
        
        // Tuvallerden dokular oluştur
        for (const [name, color] of Object.entries(defaultTextureColors)) {
            const canvas = createCanvas(color);
            const texture = new THREE.CanvasTexture(canvas);
            this.textures[name] = texture;
        }
    }
    
    createDefaultModels() {
        console.log("Yedek olarak varsayılan modeller oluşturuluyor...");
        
        // Varsayılan silah modellerini oluştur
        this.createDefaultWeaponModels();
        
        // Varsayılan düşman modellerini oluştur
        this.createDefaultEnemyModels();
        
        // Varsayılan prop modellerini oluştur
        this.createDefaultPropModels();
    }
    
    createDefaultWeaponModels() {
        // Basit bir tabanca modeli oluştur
        const pistolGroup = new THREE.Group();
        
        // Tabanca gövdesi
        const pistolBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.15, 0.35),
            new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 })
        );
        
        // Tabanca namlusu
        const pistolBarrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.9 })
        );
        pistolBarrel.rotation.x = Math.PI / 2;
        pistolBarrel.position.z = -0.2;
        pistolBarrel.position.y = 0.03;
        
        // Tabanca kabzası
        const pistolHandle = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.2, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8, metalness: 0.2 })
        );
        pistolHandle.position.y = -0.15;
        
        // Parçaları tabancaya ekle
        pistolGroup.add(pistolBody);
        pistolGroup.add(pistolBarrel);
        pistolGroup.add(pistolHandle);
        
        // Basit bir tüfek modeli oluştur
        const rifleGroup = new THREE.Group();
        
        // Tüfek gövdesi
        const rifleBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, 0.8),
            new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 })
        );
        
        // Tüfek namlusu
        const rifleBarrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.9 })
        );
        rifleBarrel.rotation.x = Math.PI / 2;
        rifleBarrel.position.z = -0.5;
        rifleBarrel.position.y = 0.03;
        
        // Tüfek kabzası
        const rifleHandle = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.2, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8, metalness: 0.2 })
        );
        rifleHandle.position.y = -0.15;
        rifleHandle.position.z = 0.1;
        
        // Tüfek dipçiği
        const rifleStock = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.15, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8, metalness: 0.1 })
        );
        rifleStock.position.z = 0.4;
        
        // Parçaları tüfeğe ekle
        rifleGroup.add(rifleBody);
        rifleGroup.add(rifleBarrel);
        rifleGroup.add(rifleHandle);
        rifleGroup.add(rifleStock);
        
        // Basit bir pompalı tüfek modeli oluştur
        const shotgunGroup = new THREE.Group();
        
        // Pompalı tüfek gövdesi
        const shotgunBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.7),
            new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 })
        );
        
        // Pompalı tüfek namlusu
        const shotgunBarrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3, metalness: 0.9 })
        );
        shotgunBarrel.rotation.x = Math.PI / 2;
        shotgunBarrel.position.z = -0.4;
        shotgunBarrel.position.y = 0.03;
        
        // Pompalı tüfek kabzası
        const shotgunHandle = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.25, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8, metalness: 0.1 })
        );
        shotgunHandle.position.y = -0.2;
        
        // Pompalı tüfek dipçiği
        const shotgunStock = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.18, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8, metalness: 0.1 })
        );
        shotgunStock.position.z = 0.4;
        
        // Parçaları pompalı tüfeğe ekle
        shotgunGroup.add(shotgunBody);
        shotgunGroup.add(shotgunBarrel);
        shotgunGroup.add(shotgunHandle);
        shotgunGroup.add(shotgunStock);
        
        // Silah modellerini depola
        this.models.pistol = { scene: pistolGroup };
        this.models.rifle = { scene: rifleGroup };
        this.models.shotgun = { scene: shotgunGroup };
    }
    
    createDefaultEnemyModels() {
        // Basic enemy (simple robot)
        const basicEnemyGroup = new THREE.Group();
        
        // Body
        const basicEnemyBody = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.5, 1.0, 4, 8),
            new THREE.MeshStandardMaterial({ color: 0xdd5500, roughness: 0.7, metalness: 0.3 })
        );
        
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 0.7, 0.4);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 0.7, 0.4);
        
        // Pupils
        const pupilGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(0, 0, 0.05);
        leftEye.add(leftPupil);
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0, 0, 0.05);
        rightEye.add(rightPupil);
        
        basicEnemyGroup.add(basicEnemyBody);
        basicEnemyGroup.add(leftEye);
        basicEnemyGroup.add(rightEye);
        
        // Ranged enemy (cone-shaped robot)
        const rangedEnemyGroup = new THREE.Group();
        
        // Body
        const rangedEnemyBody = new THREE.Mesh(
            new THREE.ConeGeometry(0.5, 2.0, 8),
            new THREE.MeshStandardMaterial({ color: 0x00cc00, roughness: 0.7, metalness: 0.3 })
        );
        
        // Eyes
        const rangedEyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rangedEyeLeft.position.set(-0.2, 0.3, 0.4);
        const rangedEyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rangedEyeRight.position.set(0.2, 0.3, 0.4);
        
        // Pupils
        const rangedPupilLeft = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rangedPupilLeft.position.set(0, 0, 0.05);
        rangedEyeLeft.add(rangedPupilLeft);
        const rangedPupilRight = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rangedPupilRight.position.set(0, 0, 0.05);
        rangedEyeRight.add(rangedPupilRight);
        
        rangedEnemyGroup.add(rangedEnemyBody);
        rangedEnemyGroup.add(rangedEyeLeft);
        rangedEnemyGroup.add(rangedEyeRight);
        
        // Heavy enemy (box-shaped robot)
        const heavyEnemyGroup = new THREE.Group();
        
        // Body
        const heavyEnemyBody = new THREE.Mesh(
            new THREE.BoxGeometry(1.1, 2.0, 1.1),
            new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.7, metalness: 0.5 })
        );
        
        // Eyes
        const heavyEyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
        heavyEyeLeft.position.set(-0.3, 0.5, 0.6);
        const heavyEyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
        heavyEyeRight.position.set(0.3, 0.5, 0.6);
        
        // Pupils
        const heavyPupilLeft = new THREE.Mesh(pupilGeometry, pupilMaterial);
        heavyPupilLeft.position.set(0, 0, 0.05);
        heavyEyeLeft.add(heavyPupilLeft);
        const heavyPupilRight = new THREE.Mesh(pupilGeometry, pupilMaterial);
        heavyPupilRight.position.set(0, 0, 0.05);
        heavyEyeRight.add(heavyPupilRight);
        
        heavyEnemyGroup.add(heavyEnemyBody);
        heavyEnemyGroup.add(heavyEyeLeft);
        heavyEnemyGroup.add(heavyEyeRight);
        
        // Boss enemy (large sphere-shaped robot)
        const bossEnemyGroup = new THREE.Group();
        
        // Body
        const bossEnemyBody = new THREE.Mesh(
            new THREE.SphereGeometry(1.5, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0xcc00cc, roughness: 0.7, metalness: 0.6 })
        );
        
        // Eyes
        const bossEyeGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const bossEyeLeft = new THREE.Mesh(bossEyeGeometry, eyeMaterial);
        bossEyeLeft.position.set(-0.4, 0.4, 1.2);
        const bossEyeRight = new THREE.Mesh(bossEyeGeometry, eyeMaterial);
        bossEyeRight.position.set(0.4, 0.4, 1.2);
        
        // Pupils
        const bossPupilGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bossPupilLeft = new THREE.Mesh(bossPupilGeometry, pupilMaterial);
        bossPupilLeft.position.set(0, 0, 0.1);
        bossEyeLeft.add(bossPupilLeft);
        const bossPupilRight = new THREE.Mesh(bossPupilGeometry, pupilMaterial);
        bossPupilRight.position.set(0, 0, 0.1);
        bossEyeRight.add(bossPupilRight);
        
        bossEnemyGroup.add(bossEnemyBody);
        bossEnemyGroup.add(bossEyeLeft);
        bossEnemyGroup.add(bossEyeRight);
        
        // Store the enemy models
        this.models.basicEnemy = { scene: basicEnemyGroup };
        this.models.rangedEnemy = { scene: rangedEnemyGroup };
        this.models.heavyEnemy = { scene: heavyEnemyGroup };
        this.models.bossEnemy = { scene: bossEnemyGroup };
    }
    
    createDefaultPropModels() {
        // Barrel
        const barrelGroup = new THREE.Group();
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.5, 1.0, 12),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
        );
        barrelGroup.add(barrel);
        
        // Crate
        const crateGroup = new THREE.Group();
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 1.0, 1.0),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
        );
        crateGroup.add(crate);
        
        // Chair
        const chairGroup = new THREE.Group();
        const chairSeat = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.1, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
        );
        chairSeat.position.y = 0.5;
        
        const chairBack = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.6, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
        );
        chairBack.position.set(0, 0.8, -0.25);
        
        // Chair legs
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 });
        
        const leg1 = new THREE.Mesh(legGeometry, legMaterial);
        leg1.position.set(0.25, 0.25, 0.25);
        
        const leg2 = new THREE.Mesh(legGeometry, legMaterial);
        leg2.position.set(-0.25, 0.25, 0.25);
        
        const leg3 = new THREE.Mesh(legGeometry, legMaterial);
        leg3.position.set(0.25, 0.25, -0.25);
        
        const leg4 = new THREE.Mesh(legGeometry, legMaterial);
        leg4.position.set(-0.25, 0.25, -0.25);
        
        chairGroup.add(chairSeat);
        chairGroup.add(chairBack);
        chairGroup.add(leg1);
        chairGroup.add(leg2);
        chairGroup.add(leg3);
        chairGroup.add(leg4);
        
        // Table
        const tableGroup = new THREE.Group();
        const tableTop = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.1, 1.0),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
        );
        tableTop.position.y = 0.7;
        
        // Table legs
        const tableLeg1 = new THREE.Mesh(legGeometry, legMaterial);
        tableLeg1.position.set(0.65, 0.35, 0.4);
        tableLeg1.scale.y = 1.4;
        
        const tableLeg2 = new THREE.Mesh(legGeometry, legMaterial);
        tableLeg2.position.set(-0.65, 0.35, 0.4);
        tableLeg2.scale.y = 1.4;
        
        const tableLeg3 = new THREE.Mesh(legGeometry, legMaterial);
        tableLeg3.position.set(0.65, 0.35, -0.4);
        tableLeg3.scale.y = 1.4;
        
        const tableLeg4 = new THREE.Mesh(legGeometry, legMaterial);
        tableLeg4.position.set(-0.65, 0.35, -0.4);
        tableLeg4.scale.y = 1.4;
        
        tableGroup.add(tableTop);
        tableGroup.add(tableLeg1);
        tableGroup.add(tableLeg2);
        tableGroup.add(tableLeg3);
        tableGroup.add(tableLeg4);
        
        // Store the prop models
        this.models.barrel = { scene: barrelGroup };
        this.models.crate = { scene: crateGroup };
        this.models.chair = { scene: chairGroup };
        this.models.table = { scene: tableGroup };
    }
    
    async preloadAssets() {
        // Initialize loading data
        console.log("%c*** ASSET LOADER: Starting asset preloading...", "color: green; font-weight: bold");
        console.log("%c*** IMPORTANT: Checking if asset folders exist", "color: red; font-weight: bold");
        
        try {
            // Create default assets first
            this.createDefaultTextures();
            this.createDefaultModels();
            
            // Log the current URL to see our base path
            console.log("Current URL base:", window.location.origin + window.location.pathname);
            
            // First check if basic folders exist with fetch requests
            const checkPaths = [
                'textures/',
                'models/',
                'audio/'
            ];
            
            for (const path of checkPaths) {
                try {
                    console.log(`Checking if path exists: ${path}`);
                    // This won't work directly due to directory listing restrictions,
                    // but we'll get a 404 if the folder doesn't exist at all
                    await fetch(path, { method: 'HEAD' })
                        .then(response => {
                            if (response.ok) {
                                console.log(`%c✓ Path ${path} appears to exist`, "color: green");
                            } else {
                                console.warn(`%c✗ Path ${path} returns status: ${response.status}`, "color: orange");
                            }
                        });
                } catch (error) {
                    console.error(`Cannot check path ${path}:`, error);
                }
            }
        
            // Force browser to reload the directories
            const cacheBuster = `?cache=${Date.now()}`;
            
            // Check for a specific known texture file to see if textures are accessible
            console.log("Checking for example texture file...");
            const testImgResponse = await fetch(`textures/effects/smoke.png${cacheBuster}`, { method: 'HEAD' })
                .catch(err => {
                    console.error("Error checking example texture:", err);
                    return { ok: false };
                });
            
            if (testImgResponse.ok) {
                console.log("%c✓ Example texture is accessible - textures should load", "color: green; font-weight: bold");
            } else {
                console.warn("%c✗ Example texture is NOT accessible - check your folder structure!", "color: red; font-weight: bold");
                console.warn("Make sure textures/effects/smoke.png exists and is accessible");
            }
            
            // Now proceed with normal asset loading
            console.log("Beginning normal asset loading...");
            
            // Preload textures first
            await this.preloadTextures();
            
            // Then preload models
            await this.preloadModels();
            
            // Finally preload sounds
            await this.preloadSounds();
            
            // Check how many assets were successfully loaded vs fallbacks
            const textureKeys = Object.keys(this.textures);
            const modelKeys = Object.keys(this.models);
            const soundKeys = Object.keys(this.sounds);
            
            console.log(`Texture loading: ${textureKeys.length} available (includes default textures)`);
            console.log(`Model loading: ${modelKeys.length} available (includes default models)`);
            console.log(`Sound loading: ${soundKeys.length} available`);
            
            this.initialized = true;
            console.log("%c*** ASSET LOADER: Asset preloading complete", "color: green; font-weight: bold");
            
            return true;
        } catch (error) {
            console.error("Error in preloadAssets:", error);
            this.initialized = true; // Mark as initialized anyway so we can use fallbacks
            return false;
        }
    }
    
    async preloadTextures() {
        console.log("*** ASSET LOADER: Starting texture preloading");
        const texturesToLoad = [
            // Effects
            { path: 'textures/effects/smoke.png', key: 'smoke' },
            { path: 'textures/effects/fire.png', key: 'fire' },
            { path: 'textures/effects/spark.png', key: 'spark' },
            { path: 'textures/effects/dust.png', key: 'dust' },
            { path: 'textures/effects/blood_splatter.png', key: 'blood' },
            { path: 'textures/effects/bullet_hole.png', key: 'bulletHole' },
            
            // Floor textures - corrected paths
            { path: 'textures/floors/concrete.jpg', key: 'floorConcrete' },
            { path: 'textures/floors/metal.jpg', key: 'floorMetal' },
            { path: 'textures/floors/wood.jpg', key: 'floorWood' },
            
            // Wall textures
            { path: 'textures/walls/brick.jpg', key: 'wallBrick' },
            { path: 'textures/walls/concrete.jpg', key: 'wallConcrete' },
            { path: 'textures/walls/metal.jpg', key: 'wallMetal' },
            { path: 'textures/walls/wood.jpg', key: 'wallWood' },
            
            // Skybox textures - added back
            { path: 'textures/skybox/px.jpg', key: 'skyboxPX' },
            { path: 'textures/skybox/nx.jpg', key: 'skyboxNX' },
            { path: 'textures/skybox/py.jpg', key: 'skyboxPY' },
            { path: 'textures/skybox/ny.jpg', key: 'skyboxNY' },
            { path: 'textures/skybox/pz.jpg', key: 'skyboxPZ' },
            { path: 'textures/skybox/nz.jpg', key: 'skyboxNZ' }
        ];

        console.log(`*** ASSET LOADER: Attempting to load ${texturesToLoad.length} textures`);
        
        let loadedCount = 0;
        let errorCount = 0;
        
        // Create promises for each texture
        const promises = texturesToLoad.map(textureInfo => {
            return new Promise((resolve) => {
                console.log(`Trying to load texture: ${textureInfo.path}`);
                
                try {
                    this.textureLoader.load(
                        textureInfo.path,
                        // Success callback
                        (loadedTexture) => {
                            console.log(`✓ Successfully loaded texture: ${textureInfo.path}`);
                            this.textures[textureInfo.key] = loadedTexture;
                            loadedCount++;
                            resolve(true);
                        },
                        // Progress callback
                        undefined,
                        // Error callback
                        (error) => {
                            console.warn(`✗ Failed to load texture: ${textureInfo.path}`, error);
                            errorCount++;
                            // Ensure we have a default texture as fallback
                            if (!this.textures[textureInfo.key]) {
                                console.log(`Using default texture for ${textureInfo.key}`);
                                // Already created in createDefaultTextures()
                            }
                            resolve(false);
                        }
                    );
                } catch (error) {
                    console.error(`Error setting up texture load for ${textureInfo.path}:`, error);
                    errorCount++;
                    resolve(false);
                }
            });
        });
        
        // Wait for all textures to either load or fail
        await Promise.all(promises);
        
        console.log(`*** ASSET LOADER: Texture preloading complete. Loaded: ${loadedCount}, Errors: ${errorCount}`);
    }
    
    async preloadModels() {
        console.log("*** ASSET LOADER: Starting model preloading");
        const modelsToLoad = [
            // Weapons
            { path: 'models/weapons/pistol.glb', key: 'pistol' },
            { path: 'models/weapons/rifle.glb', key: 'rifle' },
            { path: 'models/weapons/shotgun.glb', key: 'shotgun' },
            
            // Enemies
            { path: 'models/enemies/basic_enemy.glb', key: 'basicEnemy' },
            { path: 'models/enemies/ranged_enemy.glb', key: 'rangedEnemy' },
            { path: 'models/enemies/heavy_enemy.glb', key: 'heavyEnemy' },
            { path: 'models/enemies/boss_enemy.glb', key: 'bossEnemy' },
            
            // Props
            { path: 'models/props/barrel.glb', key: 'barrel', optional: true },
            { path: 'models/props/crate.glb', key: 'crate', optional: true },
            { path: 'models/props/chair.glb', key: 'chair', optional: true },
            { path: 'models/props/table.glb', key: 'table', optional: true }
        ];

        console.log(`*** ASSET LOADER: Attempting to load ${modelsToLoad.length} models`);
        
        let loadedCount = 0;
        let errorCount = 0;

        // Process models one at a time to avoid overwhelming the loader
        for (const modelInfo of modelsToLoad) {
            try {
                console.log(`Trying to load model: ${modelInfo.path}`);
                
                await new Promise((resolve) => {
                    this.gltfLoader.load(
                        modelInfo.path,
                        // Success callback
                        (loadedModel) => {
                            console.log(`✓ Successfully loaded model: ${modelInfo.path}`);
                            // Store the loaded model
                            this.models[modelInfo.key] = loadedModel;
                            loadedCount++;
                            resolve(true);
                        },
                        // Progress callback
                        (xhr) => {
                            const percentComplete = xhr.loaded / xhr.total * 100;
                            if (xhr.total > 1000000) { // Only log progress for models > 1MB
                                console.log(`${modelInfo.path}: ${Math.round(percentComplete)}% loaded`);
                            }
                        },
                        // Error callback
                        (error) => {
                            if (modelInfo.optional) {
                                console.warn(`⚠ Failed to load optional model: ${modelInfo.path}`, error);
                            } else {
                                console.error(`✗ Failed to load model: ${modelInfo.path}`, error);
                            }
                            errorCount++;
                            resolve(false);
                        }
                    );
                });
                
            } catch (error) {
                console.error(`Error setting up model load for ${modelInfo.path}:`, error);
                errorCount++;
            }
        }
        
        console.log(`*** ASSET LOADER: Model preloading complete. Loaded: ${loadedCount}, Errors: ${errorCount}`);
    }
    
    async preloadSounds() {
        console.log("*** ASSET LOADER: Starting sound preloading");
        const soundsToLoad = [
            // Weapon sounds with correct paths
            { path: 'audio/weapons/pistol_shot.mp3', key: 'pistolShot' },
            { path: 'audio/weapons/rifle_shot.mp3', key: 'rifleShot' },
            { path: 'audio/weapons/shotgun_shot.mp3', key: 'shotgunShot' },
            { path: 'audio/weapons/reload.mp3', key: 'reload', optional: true },
            { path: 'audio/weapons/empty.mp3', key: 'empty', optional: true },
            
            // Player sounds
            { path: 'audio/player/footstep.mp3', key: 'footstep', optional: true },
            { path: 'audio/player/jump.mp3', key: 'jump', optional: true },
            { path: 'audio/player/land.mp3', key: 'land', optional: true },
            { path: 'audio/player/hurt.mp3', key: 'playerHurt', optional: true },
            
            // Enemy sounds
            { path: 'audio/enemies/attack.mp3', key: 'enemyAttack', optional: true },
            { path: 'audio/enemies/hit.mp3', key: 'hit', optional: true },
            { path: 'audio/enemies/death.mp3', key: 'enemyDeath', optional: true }
        ];

        console.log(`*** ASSET LOADER: Attempting to load ${soundsToLoad.length} sounds`);
        
        let loadedCount = 0;
        let errorCount = 0;
        
        // Process sounds
        for (const soundInfo of soundsToLoad) {
            try {
                console.log(`Trying to load sound: ${soundInfo.path}`);
                
                await new Promise((resolve) => {
                    this.audioLoader.load(
                        soundInfo.path,
                        // Success callback
                        (audioBuffer) => {
                            console.log(`✓ Successfully loaded sound: ${soundInfo.path}`);
                            this.sounds[soundInfo.key] = audioBuffer;
                            loadedCount++;
                            resolve(true);
                        },
                        // Progress callback
                        undefined,
                        // Error callback
                        (error) => {
                            if (soundInfo.optional) {
                                console.warn(`⚠ Failed to load optional sound: ${soundInfo.path}`, error);
                            } else {
                                console.error(`✗ Failed to load sound: ${soundInfo.path}`, error);
                            }
                            errorCount++;
                            resolve(false);
                        }
                    );
                });
                
            } catch (error) {
                console.error(`Error setting up sound load for ${soundInfo.path}:`, error);
                if (!soundInfo.optional) errorCount++;
            }
        }
        
        // Add empty placeholder for any missing required sounds
        const requiredSoundKeys = ['pistolShot', 'rifleShot', 'shotgunShot'];
        for (const key of requiredSoundKeys) {
            if (!this.sounds[key]) {
                console.warn(`Creating empty sound for missing required sound: ${key}`);
                // Create a placeholder empty sound (1 second of silence)
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const emptyBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 1, audioContext.sampleRate);
                this.sounds[key] = emptyBuffer;
            }
        }
        
        console.log(`*** ASSET LOADER: Sound preloading complete. Loaded: ${loadedCount}, Errors: ${errorCount}`);
    }
    
    getTexture(name) {
        // If we don't have the requested texture, return a default
        if (!this.textures[name]) {
            console.warn(`Texture ${name} not found, using fallback`);
            return this.textures['bulletHole'] || this.textures[Object.keys(this.textures)[0]];
        }
        return this.textures[name];
    }
    
    getModel(name) {
        // If we don't have the requested model, return a default
        if (!this.models[name]) {
            console.warn(`Model ${name} not found, using fallback`);
            return this.models['pistol'] || this.models[Object.keys(this.models)[0]];
        }
        return this.models[name];
    }
    
    getSound(name) {
        // Sounds can be null, SoundManager handles this case
        return this.sounds[name] || null;
    }
} 