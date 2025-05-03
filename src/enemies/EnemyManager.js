import * as THREE from 'three';
import { Enemy } from './Enemy.js';
import { Vector3 } from 'three';

export class EnemyManager {
    constructor(scene, physics, player, currentLevel, difficulty, assetLoader, soundManager, particleSystem, ui) {
        this.scene = scene;
        this.physics = physics;
        this.player = player;
        this.currentLevelIndex = currentLevel || 0;
        this.difficulty = difficulty || 1.0;
        this.assetLoader = assetLoader;
        this.soundManager = soundManager;
        this.particleSystem = particleSystem;
        this.ui = ui;
        
        // Enemy storage
        this.enemies = [];
        this.deadEnemies = [];
        
        // Spawn configurations for different levels
        this.spawnConfigs = {
            0: [
                { type: 'basic', count: 5, difficulty: 'easy' },
            ],
            1: [
                { type: 'basic', count: 8, difficulty: 'easy' },
                { type: 'ranged', count: 3, difficulty: 'medium' }
            ],
            2: [
                { type: 'basic', count: 10, difficulty: 'medium' },
                { type: 'ranged', count: 5, difficulty: 'medium' },
                { type: 'heavy', count: 2, difficulty: 'hard' }
            ],
            3: [
                { type: 'basic', count: 12, difficulty: 'hard' },
                { type: 'ranged', count: 8, difficulty: 'hard' },
                { type: 'heavy', count: 4, difficulty: 'hard' },
                { type: 'boss', count: 1, difficulty: 'boss' }
            ]
        };
        
        // Enemy prototypes with default settings
        this.enemyTypes = {
            basic: {
                health: 100,
                speed: 3,
                damage: 10,
                scoreValue: 100,
                modelPath: 'models/enemies/basic_enemy.glb',
                scale: 1.0,
                color: 0xdd5500,  // Bright orange for visibility
                spawnDistance: { min: 10, max: 30 }  // Daha yakına spawn et
            },
            ranged: {
                health: 80,
                speed: 2,
                damage: 15,
                projectileSpeed: 15,
                scoreValue: 150,
                modelPath: 'models/enemies/ranged_enemy.glb',
                scale: 1.0,
                color: 0x00cc00,  // Bright green for visibility
                spawnDistance: { min: 15, max: 40 }  // Daha yakına spawn et
            },
            heavy: {
                health: 200,
                speed: 1.5,
                damage: 20,
                scoreValue: 200,
                modelPath: 'models/enemies/heavy_enemy.glb',
                scale: 1.5,  // Increased size for better visibility
                color: 0xcc0000,  // Bright red for visibility
                spawnDistance: { min: 10, max: 30 }  // Daha yakına spawn et
            },
            boss: {
                health: 500,
                speed: 1,
                damage: 30,
                scoreValue: 500,
                modelPath: 'models/enemies/boss_enemy.glb',
                scale: 2.0,  // Significantly larger to indicate boss status
                color: 0xcc00cc,  // Purple for visibility
                spawnDistance: { min: 20, max: 40 }  // Daha yakına spawn et
            }
        };
        
        // Difficulty multipliers
        this.difficultySettings = {
            easy: {
                healthMult: 0.8,
                damageMult: 0.8,
                speedMult: 0.9
            },
            medium: {
                healthMult: 1.0,
                damageMult: 1.0,
                speedMult: 1.0
            },
            hard: {
                healthMult: 1.3,
                damageMult: 1.2,
                speedMult: 1.1
            },
            boss: {
                healthMult: 1.5,
                damageMult: 1.3,
                speedMult: 1.2
            }
        };
        
        this.isPaused = false;
    }
    
    spawnEnemies(levelNumber) {
        // Clear existing enemies
        this.clearEnemies();
        
        // Get spawn config for this level
        const spawnConfig = this.spawnConfigs[levelNumber] || this.spawnConfigs[0];
        
        // Spawn each type of enemy
        spawnConfig.forEach(config => {
            this.spawnEnemyGroup(config.type, config.count, config.difficulty);
        });
    }
    
    spawnEnemyGroup(type, count, difficulty) {
        // Get enemy prototype
        const enemyProto = this.enemyTypes[type];
        if (!enemyProto) {
            console.error(`Enemy type not found: ${type}`);
            return;
        }
        
        // Get difficulty settings
        const diffSettings = this.difficultySettings[difficulty] || this.difficultySettings.medium;
        
        // Create enemies
        for (let i = 0; i < count; i++) {
            // Create enemy with prototype and difficulty settings
            const enemy = this.createEnemy(type, enemyProto, diffSettings);
            
            // Add to scene (in case it's not already added)
            if (enemy && enemy.model && !enemy.model.parent) {
                this.scene.add(enemy.model);
            }
            
            // Add to enemies list if not already added
            if (enemy && !this.enemies.includes(enemy)) {
                this.enemies.push(enemy);
            }
        }
    }
    
    createEnemy(type, prototype, difficultySettings) {
        if (!this.enemyTypes[type]) {
            console.error(`Enemy type ${type} not found!`);
            return null;
        }

        // Apply difficulty multipliers
        const health = Math.round(prototype.health * difficultySettings.healthMult);
        const damage = Math.round(prototype.damage * difficultySettings.damageMult);
        const speed = prototype.speed * difficultySettings.speedMult;
        
        // Make the enemies more visible with emissive materials
        const emissiveIntensity = 0.3;
        
        // Get initial spawn position
        const spawnPos = this.getRandomSpawnPosition();
        
        // Create the enemy with all required parameters
        const enemy = new Enemy(
            this.scene,
            this.physics,
            spawnPos, // Pass position as 3rd parameter
            this.player,
            {
                health,
                maxHealth: health,
                speed,
                damage,
                attackRange: prototype.attackRange,
                attackSpeed: prototype.attackSpeed,
                modelPath: prototype.modelPath,
                scale: prototype.scale,
                scoreValue: prototype.scoreValue,
                color: prototype.color,
                spawnDistance: prototype.spawnDistance
            },
            this.assetLoader,
            this.soundManager,
            this.particleSystem,
            this.ui,
            emissiveIntensity
        );
        
        return enemy;
    }
    
    getRandomSpawnPosition() {
        // Get player position
        const playerPos = this.player.getPosition();
        
        // Spawn distance from player (min and max)
        const minDist = 10;
        const maxDist = 20;
        
        // Random angle - Spawn in front of player
        const angle = Math.random() * Math.PI - Math.PI/2; // -90 to 90 degrees
        
        // Random distance
        const distance = minDist + Math.random() * (maxDist - minDist);
        
        // Calculate spawn position
        const spawnX = playerPos.x + Math.cos(angle) * distance;
        const spawnZ = playerPos.z + Math.sin(angle) * distance;
        
        // Set y position (ground level + half height)
        const spawnY = 1.0; // Assuming enemy height is about 2 units
        
        return new Vector3(spawnX, spawnY, spawnZ);
    }
    
    update(deltaTime) {
        // Skip update if paused
        if (this.isPaused) return;
        
        // Update all enemies
        this.enemies.forEach(enemy => {
            enemy.update(deltaTime);
        });
        
        // Remove dead enemies that have finished their death animation
        this.cleanupDeadEnemies();
    }
    
    cleanupDeadEnemies() {
        // Filter out null or undefined enemies and those marked for removal
        const initialCount = this.enemies.length;
        this.enemies = this.enemies.filter(enemy => {
            return enemy && !enemy.body?.userData?.markedForRemoval;
        });
        
        // Log if enemies were removed
        const removedCount = initialCount - this.enemies.length;
        if (removedCount > 0) {
            console.log(`Removed ${removedCount} dead enemies from the manager`);
        }
    }
    
    clearEnemies() {
        // Remove all enemies from scene
        for (const enemy of this.enemies) {
            this.scene.remove(enemy.model);
            enemy.dispose();
        }
        
        // Clear enemies list
        this.enemies = [];
        
        // Also clean up dead enemies
        for (const enemy of this.deadEnemies) {
            enemy.dispose();
        }
        
        // Clear dead enemies list
        this.deadEnemies = [];
    }
    
    getEnemyCount() {
        return this.enemies.length;
    }
    
    getActiveEnemies() {
        return this.enemies;
    }
    
    getNearestEnemy(position, maxDistance = Infinity) {
        let nearestEnemy = null;
        let nearestDistance = maxDistance;
        
        for (const enemy of this.enemies) {
            const distance = position.distanceTo(enemy.getPosition());
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        }
        
        return nearestEnemy;
    }
    
    areAllEnemiesDead() {
        return this.enemies.length === 0;
    }
    
    spawnEnemiesAtPoints(spawnPoints) {
        // Clear existing enemies
        this.clearEnemies();
        
        // Spawn an enemy at each spawn point
        spawnPoints.forEach(spawnPoint => {
            // Get enemy type and difficulty based on spawn point data
            const enemyType = spawnPoint.enemyType || 'basic';
            const difficulty = this.getDifficultyForLevel(this.currentLevelIndex || 0);
            
            // Get enemy prototype
            const enemyProto = this.enemyTypes[enemyType];
            if (!enemyProto) {
                console.error(`Enemy type not found: ${enemyType}`);
                return;
            }
            
            // Get difficulty settings
            const diffSettings = this.difficultySettings[difficulty] || this.difficultySettings.medium;
            
            // Create enemy
            const enemy = this.createEnemy(enemyType, enemyProto, diffSettings);
            
            // Set spawn position
            enemy.setPosition(spawnPoint.position);
            
            // Add to scene
            this.scene.add(enemy.model);
            
            // Add to enemies list
            this.enemies.push(enemy);
        });
    }
    
    getDifficultyForLevel(levelIndex) {
        // Define difficulty progression by level
        if (levelIndex === 0) return 'easy';
        if (levelIndex === 1) return 'medium';
        if (levelIndex === 2) return 'hard';
        if (levelIndex >= 3) return 'boss';
        return 'medium';
    }
    
    getEnemyStates() {
        // Get current state of all enemies for recording/replay
        return this.enemies.map(enemy => {
            return {
                id: enemy.id || Math.random().toString(36).substr(2, 9),
                type: enemy.type || 'basic',
                position: enemy.getPosition(),
                rotation: enemy.model ? enemy.model.rotation.clone() : new THREE.Euler(),
                health: enemy.health,
                state: enemy.state,
                isDead: enemy.isDead
            };
        });
    }
    
    getAliveEnemyCount() {
        // Return count of living enemies (not dead/destroyed)
        return this.enemies.filter(enemy => !enemy.isDead).length;
    }
    
    pauseAll() {
        console.log("Pausing all enemies");
        // Mark enemies as paused to prevent any updates
        this.isPaused = true;
    }
    
    resumeAll() {
        console.log("Resuming all enemies");
        this.isPaused = false;
    }
} 