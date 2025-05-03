import * as THREE from 'three';

export class Level {
    constructor(scene, physics, config) {
        this.scene = scene;
        this.physics = physics;
        this.config = config || {};
        
        // Default config values
        this.name = config.name || "Unnamed Level";
        this.theme = config.theme || "default";
        this.size = config.size || 100;
        this.complexity = config.complexity || 1;
        this.objective = config.objective || "eliminate";
        
        // Level objects
        this.objects = [];
        this.spawnPoints = [];
        this.enemies = [];
        this.pickups = [];
        
        // Level state
        this.isLoaded = false;
    }
    
    load() {
        // Build the level
        this.createFloor();
        this.createWalls();
        this.createObstacles();
        this.createSpawnPoints();
        
        // Create pickups if the objective is to collect
        if (this.objective === 'collect') {
            this.createPickups();
        }
        
        this.isLoaded = true;
        return this;
    }
    
    unload() {
        // Remove all level objects from scene
        this.objects.forEach(obj => {
            this.scene.remove(obj);
            
            // Dispose geometries and materials
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        
        // Clear arrays
        this.objects = [];
        this.spawnPoints = [];
        this.enemies = [];
        this.pickups = [];
        
        this.isLoaded = false;
    }
    
    createFloor() {
        // Create floor based on level size
        const floorSize = this.size;
        const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
        
        // Use textures based on theme
        let textureKey;
        switch (this.theme) {
            case 'military':
                textureKey = 'floorConcrete';
                break;
            case 'industrial':
                textureKey = 'floorMetal';
                break;
            case 'urban':
            case 'laboratory':
                textureKey = 'floorWood';
                break;
            default:
                textureKey = 'floorConcrete';
        }
        
        // Get appropriate texture from asset loader
        let floorTexture = null;
        let floorMaterial;
        
        try {
            // Attempt to get texture from global asset loader
            if (window.gameAssetLoader) {
                floorTexture = window.gameAssetLoader.getTexture(textureKey);
            }
            
            if (floorTexture) {
                // Set texture repeat based on floor size
                floorTexture.wrapS = THREE.RepeatWrapping;
                floorTexture.wrapT = THREE.RepeatWrapping;
                floorTexture.repeat.set(floorSize/10, floorSize/10);
                
                // Create material with texture
                floorMaterial = new THREE.MeshStandardMaterial({
                    map: floorTexture,
                    roughness: 0.8
                });
                
                console.log(`Loaded floor texture: ${textureKey}`);
            } else {
                // Fallback to colored material
                floorMaterial = new THREE.MeshStandardMaterial({ 
                    color: this.getThemeColor(this.theme),
                    roughness: 0.8
                });
                console.log(`Using fallback colored floor for theme: ${this.theme}`);
            }
        } catch (error) {
            console.error("Error loading floor texture:", error);
            // Fallback to colored material
            floorMaterial = new THREE.MeshStandardMaterial({ 
                color: this.getThemeColor(this.theme),
                roughness: 0.8
            });
        }
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        floor.userData.levelObject = true;
        
        this.scene.add(floor);
        this.objects.push(floor);
    }
    
    createWalls() {
        // Create walls around the level
        const wallHeight = 10;
        const wallThickness = 1;
        const floorSize = this.size;
        
        // Use textures based on theme
        let textureKey;
        switch (this.theme) {
            case 'military':
                textureKey = 'wallConcrete';
                break;
            case 'industrial':
                textureKey = 'wallMetal';
                break;
            case 'urban':
                textureKey = 'wallBrick';
                break;
            case 'laboratory':
                textureKey = 'wallWood';
                break;
            default:
                textureKey = 'wallConcrete';
        }
        
        // Get appropriate texture from asset loader
        let wallTexture = null;
        let wallMaterial;
        
        try {
            // Attempt to get texture from global asset loader
            if (window.gameAssetLoader) {
                wallTexture = window.gameAssetLoader.getTexture(textureKey);
            }
            
            if (wallTexture) {
                // Set texture repeat
                wallTexture.wrapS = THREE.RepeatWrapping;
                wallTexture.wrapT = THREE.RepeatWrapping;
                
                // Create material with texture
                wallMaterial = new THREE.MeshStandardMaterial({
                    map: wallTexture,
                    roughness: 0.7
                });
                
                console.log(`Loaded wall texture: ${textureKey}`);
            } else {
                // Fallback to colored material
                wallMaterial = new THREE.MeshStandardMaterial({
                    color: this.getThemeColor(this.theme, 0.7),
                    roughness: 0.7
                });
                console.log(`Using fallback colored wall for theme: ${this.theme}`);
            }
        } catch (error) {
            console.error("Error loading wall texture:", error);
            // Fallback to colored material
            wallMaterial = new THREE.MeshStandardMaterial({
                color: this.getThemeColor(this.theme, 0.7),
                roughness: 0.7
            });
        }
        
        for (let i = 0; i < 4; i++) {
            const isHorizontal = i % 2 === 0;
            const wallGeometry = new THREE.BoxGeometry(
                isHorizontal ? floorSize + wallThickness * 2 : wallThickness,
                wallHeight,
                isHorizontal ? wallThickness : floorSize + wallThickness * 2
            );
            
            // Clone the material for each wall to avoid shared texture offsets
            const thisWallMaterial = wallMaterial.clone();
            
            // Set texture repeat for proper tiling
            if (wallTexture) {
                thisWallMaterial.map = wallTexture.clone();
                const textureScale = 0.2; // Adjust this for texture density
                
                // Set different repeat values based on wall dimensions
                if (isHorizontal) {
                    thisWallMaterial.map.repeat.set(floorSize * textureScale, wallHeight * textureScale);
                } else {
                    thisWallMaterial.map.repeat.set(wallThickness * textureScale, wallHeight * textureScale);
                }
            }
            
            const wall = new THREE.Mesh(wallGeometry, thisWallMaterial);
            
            // Position walls on the edges
            switch (i) {
                case 0: // Front
                    wall.position.set(0, wallHeight / 2, floorSize / 2 + wallThickness / 2);
                    break;
                case 1: // Right
                    wall.position.set(floorSize / 2 + wallThickness / 2, wallHeight / 2, 0);
                    break;
                case 2: // Back
                    wall.position.set(0, wallHeight / 2, -floorSize / 2 - wallThickness / 2);
                    break;
                case 3: // Left
                    wall.position.set(-floorSize / 2 - wallThickness / 2, wallHeight / 2, 0);
                    break;
            }
            
            wall.castShadow = true;
            wall.receiveShadow = true;
            wall.userData.levelObject = true;
            
            this.scene.add(wall);
            this.objects.push(wall);
            
            // Add wall to physics
            const wallSize = new THREE.Vector3();
            wallGeometry.computeBoundingBox();
            wallGeometry.boundingBox.getSize(wallSize);
            
            this.physics.addBox(
                wall.position,
                wallSize,
                0 // Static body
            );
        }
    }
    
    createObstacles() {
        // Create obstacles based on level complexity
        const obstacleCount = 10 * this.complexity;
        const floorSize = this.size;
        
        for (let i = 0; i < obstacleCount; i++) {
            // Randomize obstacle type (box, cylinder, etc.)
            const obstacleType = Math.floor(Math.random() * 3);
            let obstacle;
            
            switch (obstacleType) {
                case 0: // Box
                    const boxSize = 1 + Math.random() * 3;
                    obstacle = new THREE.Mesh(
                        new THREE.BoxGeometry(boxSize, boxSize, boxSize),
                        new THREE.MeshStandardMaterial({
                            color: this.getThemeColor(this.theme, 0.5 + Math.random() * 0.5),
                            roughness: 0.7 + Math.random() * 0.3
                        })
                    );
                    
                    // Random position within level bounds
                    const boxMargin = 5;
                    obstacle.position.set(
                        (Math.random() - 0.5) * (floorSize - boxMargin * 2),
                        boxSize / 2,
                        (Math.random() - 0.5) * (floorSize - boxMargin * 2)
                    );
                    
                    // Add to physics
                    obstacle.userData.physicsBody = this.physics.addBox(
                        obstacle.position,
                        new THREE.Vector3(boxSize, boxSize, boxSize),
                        0 // Static body
                    );
                    break;
                    
                case 1: // Cylinder
                    const radius = 0.5 + Math.random() * 1.5;
                    const height = 1 + Math.random() * 4;
                    obstacle = new THREE.Mesh(
                        new THREE.CylinderGeometry(radius, radius, height, 16),
                        new THREE.MeshStandardMaterial({
                            color: this.getThemeColor(this.theme, 0.5 + Math.random() * 0.5),
                            roughness: 0.7 + Math.random() * 0.3
                        })
                    );
                    
                    // Random position within level bounds
                    const cylinderMargin = 5;
                    obstacle.position.set(
                        (Math.random() - 0.5) * (floorSize - cylinderMargin * 2),
                        height / 2,
                        (Math.random() - 0.5) * (floorSize - cylinderMargin * 2)
                    );
                    
                    // Add to physics
                    obstacle.userData.physicsBody = this.physics.addCylinder(
                        obstacle.position,
                        radius,
                        height,
                        0 // Static body
                    );
                    break;
                    
                case 2: // Platform
                    const width = 3 + Math.random() * 7;
                    const depth = 3 + Math.random() * 7;
                    const platformHeight = 0.5;
                    obstacle = new THREE.Mesh(
                        new THREE.BoxGeometry(width, platformHeight, depth),
                        new THREE.MeshStandardMaterial({
                            color: this.getThemeColor(this.theme, 0.6 + Math.random() * 0.4),
                            roughness: 0.6
                        })
                    );
                    
                    // Random position within level bounds
                    const platformMargin = 5;
                    obstacle.position.set(
                        (Math.random() - 0.5) * (floorSize - platformMargin * 2),
                        platformHeight / 2,
                        (Math.random() - 0.5) * (floorSize - platformMargin * 2)
                    );
                    
                    // Add to physics
                    obstacle.userData.physicsBody = this.physics.addBox(
                        obstacle.position,
                        new THREE.Vector3(width, platformHeight, depth),
                        0 // Static body
                    );
                    break;
            }
            
            obstacle.castShadow = true;
            obstacle.receiveShadow = true;
            obstacle.userData.levelObject = true;
            
            this.scene.add(obstacle);
            this.objects.push(obstacle);
        }
    }
    
    createSpawnPoints() {
        // Create player spawn point
        const playerSpawn = new THREE.Vector3(0, 1, 0);
        this.spawnPoints.push({
            type: 'player',
            position: playerSpawn
        });
        
        // Create enemy spawn points based on level size and complexity
        const enemyCount = Math.floor(5 * this.complexity);
        const floorSize = this.size;
        
        for (let i = 0; i < enemyCount; i++) {
            // Ensure enemies spawn at a minimum distance from player
            const minDistanceFromPlayer = 15;
            let enemyPos;
            let distanceFromPlayer;
            
            do {
                enemyPos = new THREE.Vector3(
                    (Math.random() - 0.5) * (floorSize - 10),
                    1,
                    (Math.random() - 0.5) * (floorSize - 10)
                );
                distanceFromPlayer = enemyPos.distanceTo(playerSpawn);
            } while (distanceFromPlayer < minDistanceFromPlayer);
            
            this.spawnPoints.push({
                type: 'enemy',
                enemyType: this.getRandomEnemyType(),
                position: enemyPos
            });
        }
    }
    
    getRandomEnemyType() {
        const types = ['basic', 'heavy', 'ranged'];
        let weights = [0.6, 0.3, 0.1]; // Default weights
        
        // Adjust weights based on level complexity
        if (this.complexity > 1.5) {
            weights = [0.4, 0.4, 0.2]; // More difficult enemies
        }
        
        // Boss on last level
        if (this.name.includes('Laboratory')) {
            return Math.random() < 0.2 ? 'boss' : types[0];
        }
        
        // Select random type based on weights
        const random = Math.random();
        let sum = 0;
        
        for (let i = 0; i < types.length; i++) {
            sum += weights[i];
            if (random < sum) return types[i];
        }
        
        return types[0]; // Fallback
    }
    
    getThemeColor(theme, multiplier = 1) {
        const themeColors = {
            'military': 0x4d5e4a, // Olive green
            'industrial': 0x5a5c69, // Steel gray
            'urban': 0x636363, // Concrete gray
            'laboratory': 0x0c7a99, // Sci-fi blue
            'default': 0x666666  // Default gray
        };
        
        const color = themeColors[theme] || themeColors.default;
        return color * multiplier;
    }
    
    getPlayerSpawnPoint() {
        const playerSpawn = this.spawnPoints.find(sp => sp.type === 'player');
        return playerSpawn ? playerSpawn.position : new THREE.Vector3(0, 1, 0);
    }
    
    getEnemySpawnPoints() {
        return this.spawnPoints.filter(sp => sp.type === 'enemy');
    }
    
    createPickups() {
        if (this.objective !== 'collect') return;
        
        const pickupCount = Math.floor(5 + this.complexity * 3);
        const floorSize = this.size;
        
        for (let i = 0; i < pickupCount; i++) {
            // Create pickup geometry
            const pickupGeometry = new THREE.SphereGeometry(0.5, 8, 8);
            const pickupMaterial = new THREE.MeshStandardMaterial({
                color: 0xffdd00,
                emissive: 0xffdd00,
                emissiveIntensity: 0.5,
                roughness: 0.1,
                metalness: 0.8
            });
            
            const pickup = new THREE.Mesh(pickupGeometry, pickupMaterial);
            
            // Random position within level bounds
            const pickupMargin = 10;
            pickup.position.set(
                (Math.random() - 0.5) * (floorSize - pickupMargin),
                1.2, // Floating slightly above ground
                (Math.random() - 0.5) * (floorSize - pickupMargin)
            );
            
            // Add pickup data
            pickup.userData.isPickup = true;
            pickup.userData.collected = false;
            pickup.userData.value = Math.floor(Math.random() * 5) + 1;
            pickup.userData.id = `pickup-${i}`;
            
            // Add to scene and tracking arrays
            this.scene.add(pickup);
            this.objects.push(pickup);
            this.pickups.push(pickup);
            
            // Create glow effect
            const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.3,
                side: THREE.BackSide
            });
            
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            pickup.add(glow);
            pickup.userData.glow = glow;
        }
    }
    
    collectPickup(pickup) {
        if (!pickup || !pickup.userData || pickup.userData.collected) {
            return 0;
        }
        
        pickup.userData.collected = true;
        this.startPickupCollectAnimation(pickup);
        
        // Return pickup value
        return pickup.userData.value || 1;
    }
    
    startPickupCollectAnimation(pickup) {
        // Animate pickup collection
        const startScale = pickup.scale.clone();
        const startPos = pickup.position.clone();
        
        // Animate over 1 second
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Scale down and move up
            pickup.scale.copy(startScale).multiplyScalar(1 - progress);
            pickup.position.y = startPos.y + progress * 2;
            
            // Fade out glow
            if (pickup.userData.glow) {
                pickup.userData.glow.material.opacity = 0.3 * (1 - progress);
            }
            
            // Once complete, remove from scene
            if (progress >= 1) {
                this.scene.remove(pickup);
                const index = this.pickups.indexOf(pickup);
                if (index !== -1) {
                    this.pickups.splice(index, 1);
                }
                return;
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    update(deltaTime) {
        // Update pickups rotation and bobbing
        this.pickups.forEach(pickup => {
            if (pickup.userData.collected) return;
            
            // Rotate pickup
            pickup.rotation.y += deltaTime * 2;
            
            // Bob up and down
            const bobHeight = 0.2;
            const bobSpeed = 1.5;
            const time = performance.now() * 0.001 * bobSpeed;
            const yPos = Math.sin(time) * bobHeight;
            
            // Get the base position (where pickup was created)
            const baseY = pickup.userData.baseY || 1.2;
            pickup.userData.baseY = baseY;
            
            // Apply bobbing
            pickup.position.y = baseY + yPos;
            
            // Pulse glow
            if (pickup.userData.glow) {
                const glow = pickup.userData.glow;
                glow.material.opacity = 0.2 + Math.sin(time * 2) * 0.1;
                
                // Slight scale variation
                const glowScale = 1 + Math.sin(time * 1.5) * 0.1;
                glow.scale.set(glowScale, glowScale, glowScale);
            }
        });
        
        // Update other level elements as needed
        this.objects.forEach(obj => {
            if (obj.userData.update) {
                obj.userData.update(deltaTime);
            }
        });
    }
    
    getCollectedPickupCount() {
        return this.pickups.filter(p => p.userData.collected).length;
    }
    
    getTotalPickupCount() {
        return this.pickups.length + this.getCollectedPickupCount();
    }
    
    checkObjective(enemyManager) {
        // Check if the level objective is completed
        switch (this.objective) {
            case 'eliminate':
                // Check if all enemies are eliminated
                return !enemyManager || enemyManager.getAliveEnemyCount() === 0;
                
            case 'collect':
                // Check if all pickups are collected
                return this.pickups.length === 0;
                
            case 'survive':
                // Time-based objective is handled in Game.js
                return false;
                
            case 'boss':
                // Check if boss is defeated
                if (!enemyManager) return false;
                const boss = enemyManager.enemies.find(e => e.type === 'boss');
                return !boss || boss.health <= 0;
                
            default:
                return false;
        }
    }
} 