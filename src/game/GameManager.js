import { EnemyManager } from '../enemies/EnemyManager.js';

export class GameManager {
    constructor(scene, physics, player, ui, levelGenerator, assetLoader, soundManager, particleSystem, weaponSystem) {
        this.scene = scene;
        this.physics = physics;
        this.player = player;
        this.ui = ui;
        this.levelGenerator = levelGenerator;
        this.assetLoader = assetLoader;
        this.soundManager = soundManager;
        this.particleSystem = particleSystem;
        this.weaponSystem = weaponSystem;
        
        // Game state
        this.isPaused = false;
        this.currentLevel = 1;
        this.difficulty = 1.0;
        this.score = 0;
        this.levelTime = 0;
        this.levelStartTime = 0;
        this.levelInProgress = false;
        
        // Setup enemy system
        this.setupEnemySystem();
    }

    setupEnemySystem() {
        console.log("Setting up enemy system with enhanced visibility");
        this.enemyManager = new EnemyManager(
            this.scene, 
            this.physics, 
            this.player,
            this.currentLevel,
            this.difficulty,
            this.assetLoader,
            this.soundManager,
            this.particleSystem,
            this.ui
        );
    }

    startLevel(level) {
        // Clear existing level
        this.clearLevel();
        
        console.log(`Starting level ${level} with difficulty ${this.difficulty}`);
        
        // Update current level
        this.currentLevel = level;
        
        // Generate new level
        this.levelGenerator.generateLevel(level, this.difficulty);
        
        // Spawn enemies for this level with enhanced visibility
        this.enemyManager.spawnEnemies(level, this.difficulty);
        
        // Update UI
        this.ui.updateLevel(level);
        
        // Reset player position
        const spawnPoint = this.levelGenerator.getPlayerSpawnPoint();
        if (spawnPoint) {
            this.player.setPosition(spawnPoint);
        }
        
        // Reset gameplay stats for the level
        this.resetLevelStats();
        
        // Start level timer
        this.levelStartTime = performance.now();
        this.levelInProgress = true;
    }

    updateEnemiesToPlayerDistance() {
        // Skip if no enemy manager or enemies not initialized
        if (!this.enemyManager || !this.enemyManager.enemies) return;
        
        // Get player position
        const playerPosition = this.player.getPosition();
        
        // Check each enemy's distance to player and manage visibility/behavior
        for (const enemy of this.enemyManager.enemies) {
            const enemyPosition = enemy.getPosition();
            const distance = enemyPosition.distanceTo(playerPosition);
            
            // Improve visibility for enemies that are further away
            if (enemy.model) {
                enemy.model.traverse(child => {
                    if (child.isMesh && child.material) {
                        // Increase emissive intensity for distant enemies to make them more visible
                        const baseEmissive = 0.3;
                        const distanceFactor = Math.max(0, Math.min(1, (distance - 10) / 30));
                        const emissiveBoost = baseEmissive + (distanceFactor * 0.7);
                        
                        // Only update if significantly different
                        if (Math.abs(child.material.emissiveIntensity - emissiveBoost) > 0.05) {
                            child.material.emissiveIntensity = emissiveBoost;
                        }
                    }
                });
            }
        }
    }

    update(deltaTime) {
        // Skip if game is paused
        if (this.isPaused) return;
        
        // Update systems
        this.physics.update(deltaTime);
        this.player.update(deltaTime);
        this.weaponSystem.update(deltaTime);
        this.enemyManager.update(deltaTime);
        this.particleSystem.update(deltaTime);
        
        // Update enemy visibility based on distance
        this.updateEnemiesToPlayerDistance();
        
        // Check for level completion
        this.checkLevelStatus();
        
        // Update UI elements
        this.ui.update(deltaTime);
        
        // Update level time
        if (this.levelInProgress) {
            const currentTime = performance.now();
            this.levelTime = (currentTime - this.levelStartTime) / 1000; // in seconds
            this.ui.updateTimer(this.levelTime);
        }
    }
    
    clearLevel() {
        // Clear existing level objects
        if (this.enemyManager) {
            this.enemyManager.clearEnemies();
        }
        
        // Clear level geometry
        this.levelGenerator.clearLevel();
    }
    
    resetLevelStats() {
        this.levelTime = 0;
        this.player.resetHealth();
        this.weaponSystem.resetAmmo();
    }
    
    checkLevelStatus() {
        // Check if all enemies are defeated
        if (this.enemyManager && this.enemyManager.enemies.length === 0) {
            this.completeLevel();
        }
        
        // Check if player is dead
        if (this.player.isDead) {
            this.gameOver();
        }
    }
    
    completeLevel() {
        if (!this.levelInProgress) return;
        
        this.levelInProgress = false;
        console.log(`Level ${this.currentLevel} completed!`);
        
        // Calculate score bonus based on time
        const timeBonus = Math.max(0, 1000 - Math.floor(this.levelTime) * 10);
        this.score += timeBonus;
        
        // Update UI
        this.ui.showLevelComplete(this.currentLevel, timeBonus);
        
        // Increase difficulty
        this.difficulty += 0.2;
        
        // Prepare for next level
        setTimeout(() => {
            this.startLevel(this.currentLevel + 1);
        }, 3000);
    }
    
    gameOver() {
        if (!this.levelInProgress) return;
        
        this.levelInProgress = false;
        console.log('Game Over!');
        
        // Update UI
        this.ui.showGameOver(this.score);
        
        // Reset game state
        setTimeout(() => {
            this.resetGame();
        }, 5000);
    }
    
    resetGame() {
        // Reset game state
        this.currentLevel = 1;
        this.difficulty = 1.0;
        this.score = 0;
        
        // Start from level 1
        this.startLevel(1);
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        this.ui.togglePauseMenu(this.isPaused);
    }
    
    addScore(points) {
        this.score += points;
        this.ui.updateScore(this.score);
    }
} 