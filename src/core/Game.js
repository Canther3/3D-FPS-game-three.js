import * as THREE from 'three';
import { Clock } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Player } from '../core/Player.js';
import { LevelManager } from '../levels/LevelManager.js';
import { EnemyManager } from '../enemies/EnemyManager.js';
import { WeaponManager } from '../weapons/WeaponManager.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { EffectsManager } from '../effects/EffectsManager.js';
import { MultiplayerManager } from '../multiplayer/MultiplayerManager.js';
import { ScoreManager } from '../ui/ScoreManager.js';
import { ReplaySystem } from '../core/ReplaySystem.js';

export class Game {
    constructor(soundManager, assetLoader) {
        // Game state
        this.isRunning = false;
        this.isPaused = false;
        
        // Three.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        // Game clock
        this.clock = new Clock();
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        
        // Set up shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        
        this.scene.add(directionalLight);
        
        // Use asset loader
        this.assetLoader = assetLoader;
        
        // Initialize sound manager
        this.soundManager = soundManager;
        
        // Initialize physics world
        this.physics = new PhysicsWorld();
        
        // Initialize player
        this.player = new Player(this.camera, this.physics, this.soundManager, this);
        
        // Initialize managers
        this.levelManager = new LevelManager(this.scene, this.physics);
        this.enemyManager = new EnemyManager(this.scene, this.physics, this.player);
        this.weaponManager = new WeaponManager(this.scene, this.camera, this.physics, this.player, this.soundManager);
        this.effectsManager = new EffectsManager(this.scene, this.assetLoader);
        this.multiplayerManager = new MultiplayerManager(this);
        this.scoreManager = new ScoreManager();
        this.replaySystem = new ReplaySystem(this);
        
        // Set initial level
        this.currentLevel = 0;
    }
    
    // Add a method to create skybox
    createSkybox() {
        console.log("Creating skybox...");
        
        try {
            // Check if skybox textures are loaded
            const textureNames = ['skyboxPX', 'skyboxNX', 'skyboxPY', 'skyboxNY', 'skyboxPZ', 'skyboxNZ'];
            const textures = textureNames.map(name => this.assetLoader.getTexture(name));
            
            // If any texture is missing, log an error and return
            if (textures.some(texture => !texture)) {
                console.error("Missing skybox textures");
                return;
            }
            
            // Create materials array for the skybox
            const materialArray = [
                new THREE.MeshBasicMaterial({ map: textures[0], side: THREE.BackSide }), // px - right
                new THREE.MeshBasicMaterial({ map: textures[1], side: THREE.BackSide }), // nx - left
                new THREE.MeshBasicMaterial({ map: textures[2], side: THREE.BackSide }), // py - top
                new THREE.MeshBasicMaterial({ map: textures[3], side: THREE.BackSide }), // ny - bottom
                new THREE.MeshBasicMaterial({ map: textures[4], side: THREE.BackSide }), // pz - front
                new THREE.MeshBasicMaterial({ map: textures[5], side: THREE.BackSide })  // nz - back
            ];
            
            // Create skybox
            const skyboxGeometry = new THREE.BoxGeometry(500, 500, 500);
            const skybox = new THREE.Mesh(skyboxGeometry, materialArray);
            skybox.name = "skybox";
            
            // Remove any existing skybox
            const existingSkybox = this.scene.getObjectByName("skybox");
            if (existingSkybox) {
                this.scene.remove(existingSkybox);
            }
            
            // Add skybox to scene
            this.scene.add(skybox);
            console.log("Skybox created successfully");
        } catch (error) {
            console.error("Error creating skybox:", error);
        }
    }
    
    start() {
        if (this.isRunning) return;
        
        // Mark game as running
        this.isRunning = true;
        
        // Reset the clock
        this.clock.start();
        
        try {
            console.log("Game starting...");
            
            // Create skybox
            this.createSkybox();
            
            // Make sure we have an active level
            if (!this.levelManager.getCurrentLevel()) {
                console.log("Loading initial level");
                const level = this.levelManager.loadLevel(0);
                if (level) {
                    // Update player position - already set to (0, y, 10) in Player constructor
                    
                    // Set current level in EnemyManager
                    this.enemyManager.currentLevelIndex = 0;
                    
                    // Spawn enemies based on level - do it with a small delay to ensure everything is loaded
                    console.log("Spawning initial enemies with delay...");
                    setTimeout(() => {
                        this.enemyManager.spawnEnemies(0);
                        console.log("Enemies spawned");
                    }, 1000);
                } else {
                    console.error("Failed to load initial level");
                }
            }
            
            // Give player initial weapon
            console.log("Equipping initial weapon");
            this.weaponManager.equipWeapon('pistol');
            
            // Set up event listeners if needed
            window.addEventListener('resize', () => this.resize());
            
            // Start the game loop
            this.gameLoop();
            
            console.log("Game started successfully");
        } catch (error) {
            console.error("Error starting game:", error);
            this.isRunning = false;
        }
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        // Request next frame
        requestAnimationFrame(() => this.gameLoop());
        
        // Skip update if game is paused
        if (this.isPaused) return;
        
        // Calculate delta time
        const deltaTime = this.clock.getDelta();
        
        // Update physics
        this.physics.update(deltaTime);
        
        // Update player
        this.player.update(deltaTime);
        
        // Update enemies
        this.enemyManager.update(deltaTime);
        
        // Update weapons
        this.weaponManager.update(deltaTime);
        
        // Update effects
        this.effectsManager.update(deltaTime);
        
        // Update multiplayer
        this.multiplayerManager.update(deltaTime);
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
    
    pause() {
        console.log("Pausing game...");
        this.isPaused = true;
        
        // Pause all sounds
        if (this.soundManager) {
            try {
                this.soundManager.pauseAll();
            } catch (error) {
                console.warn("Error pausing sounds:", error);
            }
        }
        
        // Notify components that game is paused
        if (this.enemyManager) {
            this.enemyManager.pauseAll();
        }
        
        // Pause weapon system
        if (this.weaponManager) {
            this.weaponManager.pause();
        }
    }
    
    resume() {
        console.log("Resuming game...");
        // Reset delta time to prevent huge jumps
        this.clock.getDelta();
        
        // Resume all sounds
        if (this.soundManager) {
            try {
                this.soundManager.resumeAll();
            } catch (error) {
                console.warn("Error resuming sounds:", error);
            }
        }
        
        // Notify components that game is resumed
        if (this.enemyManager) {
            this.enemyManager.resumeAll();
        }
        
        // Resume weapon system
        if (this.weaponManager) {
            this.weaponManager.resume();
        }
        
        // Set game to resumed state
        this.isPaused = false;
    }
    
    nextLevel() {
        this.currentLevel++;
        
        // Check if we've completed all levels
        if (this.currentLevel >= this.levelManager.getLevelCount()) {
            // Game completed, handle victory
            console.log("Game completed!");
            // Here you would trigger a victory screen or other end-game content
            return;
        }
        
        // Set current level in EnemyManager
        this.enemyManager.currentLevelIndex = this.currentLevel;
        
        // Load the next level
        const level = this.levelManager.loadLevel(this.currentLevel);
        
        // Update player position to spawn point
        const playerSpawn = level.getPlayerSpawnPoint();
        this.player.body.position.set(playerSpawn.x, playerSpawn.y + this.player.height / 2, playerSpawn.z);
        
        // Spawn enemies based on level spawn points
        this.enemyManager.spawnEnemiesAtPoints(level.getEnemySpawnPoints());
        
        // Reset player state (health, ammo, etc.)
        this.player.reset();
    }
    
    restartLevel() {
        // Set current level in EnemyManager
        this.enemyManager.currentLevelIndex = this.currentLevel;
        
        // Reload current level
        const level = this.levelManager.loadLevel(this.currentLevel);
        
        // Update player position to spawn point
        const playerSpawn = level.getPlayerSpawnPoint();
        this.player.body.position.set(playerSpawn.x, playerSpawn.y + this.player.height / 2, playerSpawn.z);
        
        // Spawn enemies based on level spawn points
        this.enemyManager.spawnEnemiesAtPoints(level.getEnemySpawnPoints());
        
        // Reset player
        this.player.reset();
    }
    
    checkObjective() {
        // Check if current level objective is completed
        return this.levelManager.isObjectiveCompleted(this.enemyManager);
    }
    
    resize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
} 