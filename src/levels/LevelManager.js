import * as THREE from 'three';
import { Level } from './Level.js';

export class LevelManager {
    constructor(scene, physics) {
        this.scene = scene;
        this.physics = physics;
        this.currentLevelIndex = -1;
        this.currentLevel = null;
        this.levels = [];
        
        // Level configurations
        this.levelConfigs = [
            { 
                name: 'Training Grounds', 
                theme: 'military',
                size: 80,
                complexity: 0.8,
                objective: 'eliminate'
            },
            { 
                name: 'Abandoned Warehouse', 
                theme: 'industrial',
                size: 100,
                complexity: 1.2,
                objective: 'eliminate'
            },
            { 
                name: 'Downtown Streets', 
                theme: 'urban',
                size: 120,
                complexity: 1.5,
                objective: 'eliminate'
            },
            { 
                name: 'Secret Laboratory', 
                theme: 'laboratory',
                size: 90,
                complexity: 2.0,
                objective: 'eliminate'
            }
        ];
        
        // Initialize levels
        this.initializeLevels();
    }
    
    initializeLevels() {
        // Create level instances from configurations
        this.levelConfigs.forEach(config => {
            const level = new Level(this.scene, this.physics, config);
            this.levels.push(level);
        });
    }
    
    loadLevel(levelIndex) {
        // Clear previous level
        this.clearCurrentLevel();
        
        // Validate level index
        if (levelIndex < 0 || levelIndex >= this.levels.length) {
            levelIndex = 0;
        }
        
        // Set current level index
        this.currentLevelIndex = levelIndex;
        
        // Get level and load it
        this.currentLevel = this.levels[levelIndex];
        this.currentLevel.load();
        
        console.log(`Loaded level: ${this.currentLevel.name}`);
        
        return this.currentLevel;
    }
    
    clearCurrentLevel() {
        if (this.currentLevel) {
            this.currentLevel.unload();
            this.currentLevel = null;
        }
    }
    
    getCurrentLevel() {
        return this.currentLevel;
    }
    
    getLevelCount() {
        return this.levels.length;
    }
    
    isObjectiveCompleted(enemyManager) {
        if (!this.currentLevel) return false;
        
        return this.currentLevel.checkObjective(enemyManager);
    }
    
    update(deltaTime) {
        if (this.currentLevel) {
            this.currentLevel.update(deltaTime);
        }
    }
} 