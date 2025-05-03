import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Vector3, Quaternion, AnimationMixer, AnimationClip, Object3D, Raycaster } from 'three';

// AI States
const STATES = {
    IDLE: 'idle',
    PATROL: 'patrol',
    CHASE: 'chase',
    ATTACK: 'attack',
    STUNNED: 'stunned',
    DEAD: 'dead',
    SEARCH: 'search'
};

export class Enemy {
    constructor(scene, physics, position, player, config, assetLoader, soundManager, particleSystem, ui, emissiveIntensity = 0.7) {
        this.scene = scene;
        this.physics = physics;
        this.player = player;
        this.assetLoader = assetLoader;
        this.soundManager = soundManager;
        this.particleSystem = particleSystem;
        this.ui = ui;
        this.emissiveIntensity = emissiveIntensity;
        
        // Configuration
        this.config = config || {};
        
        // Stats
        this.health = config.health || 100;
        this.maxHealth = this.health;
        this.speed = config.speed || 3;
        this.damage = config.damage || 10;
        this.attackRange = config.attackRange || 1.5;
        this.attackSpeed = config.attackSpeed || 1.0;
        this.scoreValue = config.scoreValue || 100;
        
        // Model path
        this.modelPath = config.modelPath || 'models/enemies/basic_enemy.glb';
        this.modelColor = config.color || 0xdd5500;
        
        // State
        this.state = STATES.IDLE;
        this.lastStateChange = 0;
        this.isDead = false;
        this.isAttacking = false;
        this.timeSinceDeath = 0;
        this.stunTime = 0;
        
        // Combat
        this.lastAttackTime = 0;
        this.attackCooldown = 1 / (this.attackSpeed || 1.0);
        
        // Pathfinding
        this.targetPosition = new Vector3();
        this.lastPathfindTime = 0;
        this.pathfindInterval = 0.5; // seconds
        this.currentPath = [];
        this.currentPathIndex = 0;
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;
        
        // Vision
        this.visionRange = 20;
        this.visionAngle = Math.PI / 2; // 90 degrees
        this.canSeePlayer = false;
        
        // Create the model
        this.createModel();
        
        // Create physics body
        this.createPhysics();
        
        // Initial position (must set after physics body is created)
        if (position) {
            this.setPosition(position);
        }
        
        // AI
        this.setupAI();
    }
    
    createModel() {
        // Try to load the model from the asset loader
        const modelKey = this.getModelKeyFromPath();
        const model = this.assetLoader ? this.assetLoader.getModel(modelKey) : null;
        
        if (model && model.scene) {
            // Successfully loaded model from asset loader
            this.model = model.scene.clone();
            
            // Apply material changes for better visibility
            this.model.traverse(child => {
                if (child.isMesh) {
                    // Create a new material that emits light for better visibility
                    child.material = new THREE.MeshStandardMaterial({
                        color: this.modelColor,
                        roughness: 0.5, // Reduced roughness for more shine
                        metalness: 0.3,
                        emissive: this.modelColor,
                        emissiveIntensity: this.emissiveIntensity
                    });
                    
                    // Add outline for better visibility (fake outline by scaling)
                    const outlineMesh = child.clone();
                    outlineMesh.material = new THREE.MeshBasicMaterial({
                        color: 0x000000,
                        side: THREE.BackSide
                    });
                    outlineMesh.scale.multiplyScalar(1.05);
                    child.parent.add(outlineMesh);
                }
            });
        } else {
            // Create a fallback geometric model
            console.log(`Using fallback geometric model for ${this.modelPath}`);
            this.createFallbackModel();
        }
        
        // Scale model
        this.model.scale.set(
            this.config.scale || 1.0,
            this.config.scale || 1.0,
            this.config.scale || 1.0
        );
        
        // Set up model for enemy type identification
        this.model.userData.isEnemy = true;
        this.model.userData.enemyRef = this;
        
        // Add to scene explicitly to make sure it's visible
        this.scene.add(this.model);
        
        // Initialize animations (in a real implementation these would come from the GLTF file)
        this.setupAnimations();
    }
    
    getModelKeyFromPath() {
        // Extract the model key from the path (e.g., 'models/enemies/basic_enemy.glb' -> 'basicEnemy')
        const fileName = this.modelPath.split('/').pop().split('.')[0];
        return fileName.replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
    }
    
    createFallbackModel() {
        // Create a fallback geometric model based on enemy type
        let geometry;
        const type = this.getModelKeyFromPath().replace('Enemy', '');
        
        if (type === 'heavy') {
            geometry = new THREE.BoxGeometry(1.1, 2.0, 1.1);
        } else if (type === 'ranged') {
            geometry = new THREE.ConeGeometry(0.5, 2.0, 8);
        } else if (type === 'boss') {
            geometry = new THREE.SphereGeometry(1.5, 12, 12);
        } else {
            // Basic enemy
            geometry = new THREE.CapsuleGeometry(0.5, 1.0, 4, 8);
        }
        
        const material = new THREE.MeshStandardMaterial({ 
            color: this.modelColor,
            roughness: 0.7,
            metalness: 0.3,
            emissive: this.modelColor,
            emissiveIntensity: this.emissiveIntensity
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Group for all enemy parts
        this.model = new THREE.Group();
        this.model.add(this.mesh);
        
        // Add eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xaaaaaa,
            emissiveIntensity: 0.5
        });
        
        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        
        // Set eye positions based on enemy type
        if (type === 'heavy') {
            this.leftEye.position.set(-0.3, 0.5, 0.6);
            this.rightEye.position.set(0.3, 0.5, 0.6);
        } else if (type === 'ranged') {
            this.leftEye.position.set(-0.2, 0.3, 0.4);
            this.rightEye.position.set(0.2, 0.3, 0.4);
        } else if (type === 'boss') {
            this.leftEye.position.set(-0.4, 0.4, 1.4);
            this.rightEye.position.set(0.4, 0.4, 1.4);
        } else {
            // Basic enemy
            this.leftEye.position.set(-0.2, 0.7, 0.5);
            this.rightEye.position.set(0.2, 0.7, 0.5);
        }
        
        const pupilGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const pupilMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            emissive: 0x222222,
            emissiveIntensity: 0.5
        });
        
        this.leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        this.leftPupil.position.set(0, 0, 0.05);
        this.leftEye.add(this.leftPupil);
        
        this.rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        this.rightPupil.position.set(0, 0, 0.05);
        this.rightEye.add(this.rightPupil);
        
        this.model.add(this.leftEye);
        this.model.add(this.rightEye);
    }
    
    setupAnimations() {
        // In a real implementation, we would set up animations from the loaded model
        // For now, we'll just create placeholder animation properties
        
        this.animationMixer = null;
        this.animations = {
            idle: null,
            walk: null,
            run: null,
            attack: null,
            hit: null,
            death: null
        };
    }
    
    createPhysics() {
        // Create physics body for collision
        const radius = 0.5 * (this.config.scale || 1.0);
        const height = 1.0 * (this.config.scale || 1.0);
        
        const shape = new CANNON.Cylinder(radius, radius, height, 8);
        
        this.body = new CANNON.Body({
            mass: 70, // kg
            position: new CANNON.Vec3(0, height / 2, 0),
            shape: shape,
            material: this.physics.defaultMaterial,
            fixedRotation: true,
            collisionFilterGroup: 2, // Enemy group
            collisionFilterMask: 1 | 2 | 4 // Player, Enemy, Environment groups
        });
        
        // Add body to world
        this.physics.world.addBody(this.body);
    }
    
    setupAI() {
        // Create patrol points in a circle
        this.generatePatrolPoints();
        
        // Initial state
        this.changeState(STATES.PATROL);
    }
    
    generatePatrolPoints() {
        // Create a circle of points around current position
        const centerX = this.body.position.x;
        const centerZ = this.body.position.z;
        const radius = 10 + Math.random() * 5;
        const pointCount = 4 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < pointCount; i++) {
            const angle = (i / pointCount) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const z = centerZ + Math.sin(angle) * radius;
            
            this.patrolPoints.push(new Vector3(x, this.body.position.y, z));
        }
    }
    
    update(deltaTime) {
        if (this.isDead) {
            this.timeSinceDeath += deltaTime;
            this.updateDeathAnimation(deltaTime);
            return;
        }
        
        // Update animations
        if (this.animationMixer) {
            this.animationMixer.update(deltaTime);
        }
        
        // Update stunned state
        if (this.state === STATES.STUNNED) {
            this.stunTime -= deltaTime;
            if (this.stunTime <= 0) {
                this.changeState(STATES.CHASE);
            }
            return;
        }
        
        // Check vision to player
        this.checkVision();
        
        // Update AI state
        this.updateMovement(deltaTime);
        
        // Update model position from physics
        this.updateModelFromPhysics();
    }
    
    updateMovement(deltaTime) {
        if (this.isDead || this.state === STATES.STUNNED) return;
        
        // Different movement behavior based on state
        switch (this.state) {
            case STATES.IDLE:
                // In idle state, enemy should stay put or patrol
                if (this.canSeePlayer) {
                    this.changeState(STATES.CHASE);
                } else {
                    this.updateIdleMovement(deltaTime);
                }
                break;
                
            case STATES.CHASE:
                // In chase state, enemy should move towards player
                if (!this.canSeePlayer) {
                    // Lost sight of player, go to search state
                    this.changeState(STATES.SEARCH);
                    this.lastPlayerPosition.copy(this.player.getPosition());
                } else {
                    // Move towards player
                    this.updateChaseMovement(deltaTime);
                }
                break;
                
            case STATES.ATTACK:
                // In attack state, enemy should attack player
                if (!this.canSeePlayer || this.distanceToPlayer > this.attackRange * 1.5) {
                    // Player moved out of attack range, chase again
                    this.changeState(STATES.CHASE);
                } else {
                    // Face the player
                    this.lookAtPlayer();
                }
                break;
                
            case STATES.SEARCH:
                // In search state, enemy should move to last known player position
                this.updateSearchMovement(deltaTime);
                
                // If sees player again, chase
                if (this.canSeePlayer) {
                    this.changeState(STATES.CHASE);
                }
                break;
        }
    }
    
    updateIdleMovement(deltaTime) {
        // Stay in idle for a while
        const idleDuration = 2.0; // seconds
        
        if (this.canSeePlayer) {
            this.changeState(STATES.CHASE);
            return;
        }
        
        if (performance.now() - this.lastStateChange > idleDuration * 1000) {
            this.changeState(STATES.PATROL);
        }
    }
    
    updateChaseMovement(deltaTime) {
        // Slow down the enemy to make the game easier
        const moveSpeed = this.speed * 0.7; // Reduced to 70% of original speed
        
        // Get direction to player
        const playerPos = this.player.getPosition();
        const enemyPos = this.getPosition();
        
        const dirToPlayer = new Vector3(
            playerPos.x - enemyPos.x,
            0, // Keep on same y plane
            playerPos.z - enemyPos.z
        );
        
        // Normalize direction and multiply by speed
        dirToPlayer.normalize();
        dirToPlayer.multiplyScalar(moveSpeed * deltaTime);
        
        // Move towards player
        this.model.position.x += dirToPlayer.x;
        this.model.position.z += dirToPlayer.z;
        
        // Rotate to face player
        this.lookAtPlayer();
        
        // Check distance to player
        this.distanceToPlayer = enemyPos.distanceTo(playerPos);
        
        // If within attack range, change to attack state
        if (this.distanceToPlayer <= this.attackRange) {
            this.changeState(STATES.ATTACK);
        }
    }
    
    updateSearchMovement(deltaTime) {
        // Move toward last known player position
        const moveSpeed = this.speed * 0.5; // Even slower in search mode

        // Ensure last player position exists
        if (!this.lastPlayerPosition) {
            this.changeState(STATES.IDLE);
            return;
        }
        
        // Calculate direction to last known position
        const enemyPos = this.getPosition();
        const dirToLastPos = new Vector3(
            this.lastPlayerPosition.x - enemyPos.x,
            0, // Keep on same y plane
            this.lastPlayerPosition.z - enemyPos.z
        );
        
        // Check if we're close enough to last known position
        if (dirToLastPos.length() < 2.0) {
            // Reached the last known position, go back to idle
            this.changeState(STATES.IDLE);
            return;
        }
        
        // Normalize direction and multiply by speed
        dirToLastPos.normalize();
        dirToLastPos.multiplyScalar(moveSpeed * deltaTime);
        
        // Move towards last known position
        this.model.position.x += dirToLastPos.x;
        this.model.position.z += dirToLastPos.z;
        
        // Rotate to face movement direction
        this.model.lookAt(
            new Vector3(
                this.model.position.x + dirToLastPos.x,
                this.model.position.y,
                this.model.position.z + dirToLastPos.z
            )
        );
    }
    
    lookAtPlayer() {
        const playerPos = this.player.getPosition();
        const enemyPos = this.getPosition();
        
        // Create a target position at same height as enemy
        const targetPos = new Vector3(
            playerPos.x,
            enemyPos.y,
            playerPos.z
        );
        
        // Make enemy look at player
        this.model.lookAt(targetPos);
    }
    
    attack() {
        // Perform attack
        this.isAttacking = true;
        
        // Play attack animation
        if (this.animations.attack) {
            const action = this.animations.attack;
            action.reset().setLoop(THREE.LoopOnce).play();
        }
        
        // Check if player is still in range
        const playerPos = this.player.getPosition();
        const distToPlayer = this.distanceTo(playerPos);
        
        if (distToPlayer <= this.attackRange) {
            // Deal damage to player
            this.player.takeDamage(this.damage);
        }
        
        // Reset attack flag after animation
        setTimeout(() => {
            this.isAttacking = false;
        }, 500); // Assume attack animation is 0.5 seconds
    }
    
    takeDamage(amount) {
        if (this.isDead) return;
        
        // Reduce health
        this.health -= amount;
        
        // Play hit animation
        if (this.animations.hit) {
            const action = this.animations.hit;
            action.reset().setLoop(THREE.LoopOnce).play();
        }
        
        // Flash enemy red when hit
        this.mesh.material.color.set(0xff0000);
        setTimeout(() => {
            this.mesh.material.color.set(this.modelColor);
        }, 100);
        
        // Check if dead
        if (this.health <= 0) {
            this.die();
            return;
        }
        
        // Become aware of player
        this.canSeePlayer = true;
        
        // If not already chasing or attacking, chase player
        if (this.state !== STATES.CHASE && this.state !== STATES.ATTACK) {
            this.changeState(STATES.CHASE);
        }
        
        // Chance to get stunned based on damage
        const stunChance = amount / this.maxHealth * 0.5; // 50% chance at full damage
        if (Math.random() < stunChance) {
            this.stun(0.5); // Stun for 0.5 seconds
        }
    }
    
    stun(duration) {
        this.changeState(STATES.STUNNED);
        this.stunTime = duration;
        
        // Stop movement
        this.body.velocity.set(0, 0, 0);
    }
    
    die() {
        this.isDead = true;
        this.health = 0;
        this.state = STATES.DEAD;
        this.timeSinceDeath = 0;
        
        // Stop movement
        this.body.velocity.set(0, 0, 0);
        
        // Play death animation
        if (this.animations.death) {
            const action = this.animations.death;
            action.reset().setLoop(THREE.LoopOnce).play();
        }
        
        // Mark body as dead to prevent interactions
        this.body.collisionFilterGroup = 0;
        
        // Schedule for removal after death animation
        setTimeout(() => {
            if (this.scene && this.model) {
                // Remove from scene
                this.scene.remove(this.model);
                
                // Dispose of geometries and materials
                this.dispose();
                
                // Mark for removal from EnemyManager
                if (this.body) {
                    this.body.userData = this.body.userData || {};
                    this.body.userData.markedForRemoval = true;
                }
                
                // Remove physics body
                if (this.physics && this.body) {
                    this.physics.world.removeBody(this.body);
                    this.body = null;
                }
            }
        }, 3500); // Remove after 3.5 seconds (after sink animation)
        
        // Reward score (would be handled by game score manager)
        // this.game.scoreManager.addScore(this.scoreValue);
    }
    
    updateDeathAnimation(deltaTime) {
        if (!this.model) return;
        
        this.timeSinceDeath += deltaTime;
        
        // Sink into ground over time
        if (this.timeSinceDeath < 3.0) {
            const sinkSpeed = 0.3 * deltaTime;
            this.model.position.y -= sinkSpeed;
            
            // Fade out
            if (this.mesh && this.mesh.material) {
                this.mesh.material.transparent = true;
                this.mesh.material.opacity -= 0.3 * deltaTime;
                
                // Fade out eyes and pupils if they exist
                if (this.leftEye && this.leftEye.material) this.leftEye.material.opacity -= 0.3 * deltaTime;
                if (this.rightEye && this.rightEye.material) this.rightEye.material.opacity -= 0.3 * deltaTime;
                if (this.leftPupil && this.leftPupil.material) this.leftPupil.material.opacity -= 0.3 * deltaTime;
                if (this.rightPupil && this.rightPupil.material) this.rightPupil.material.opacity -= 0.3 * deltaTime;
                
                // Reduce emissive intensity if it's an emissive material
                if (this.mesh.material.emissiveIntensity !== undefined) {
                    this.mesh.material.emissiveIntensity *= (1 - 0.3 * deltaTime);
                }
            }
        }
    }
    
    checkVision() {
        // Skip if dead or stunned
        if (this.isDead || this.state === STATES.STUNNED) {
            this.canSeePlayer = false;
            return;
        }
        
        const playerPos = this.player.getPosition();
        const enemyPos = this.getPosition();
        
        // Check if player is in vision range
        const distToPlayer = enemyPos.distanceTo(playerPos);
        
        if (distToPlayer > this.visionRange) {
            this.canSeePlayer = false;
            return;
        }
        
        // Get direction vectors
        const dirToPlayer = new Vector3(
            playerPos.x - enemyPos.x,
            0,
            playerPos.z - enemyPos.z
        ).normalize();
        
        const forward = new Vector3(0, 0, 1).applyQuaternion(this.model.quaternion).normalize();
        
        // Calculate angle between forward and dirToPlayer
        const angle = forward.angleTo(dirToPlayer);
        
        // Check if player is within vision angle
        if (angle > this.visionAngle / 2) {
            this.canSeePlayer = false;
            return;
        }
        
        try {
            // Cast ray to check for obstacles
            const raycaster = new Raycaster(
                enemyPos,
                dirToPlayer,
                0,
                distToPlayer
            );
            
            // Filter objects to avoid sprites and problematic objects
            const objectsToCheck = this.scene.children.filter(obj => {
                // Skip invisible objects
                if (!obj.visible) return false;
                
                // Skip non-mesh objects like lights, cameras, etc.
                if (!(obj instanceof THREE.Mesh)) return false;
                
                // Skip sprites which cause the raycasting error
                if (obj instanceof THREE.Sprite) return false;
                
                // Skip enemy parts
                if (obj === this.mesh || obj === this.leftEye || obj === this.rightEye || 
                    obj === this.leftPupil || obj === this.rightPupil) {
                    return false;
                }
                
                // Skip other enemies
                if (obj.parent && obj.parent.userData && obj.parent.userData.isEnemy) {
                    return false;
                }
                
                return true;
            });
            
            // Perform the intersection check with filtered objects
            const intersects = raycaster.intersectObjects(objectsToCheck, false);
            
            // Check if something blocks vision to player
            if (intersects.length > 0) {
                // Something is blocking vision
                this.canSeePlayer = false;
                return;
            }
            
            // No obstacles, can see player
            this.canSeePlayer = true;
        } catch (error) {
            // Raycasting hatası oluşursa, basitçe oyuncuyu görebildiğini varsayalım
            console.warn("Raycasting error in enemy vision check:", error);
            this.canSeePlayer = true;
        }
    }
    
    updateModelFromPhysics() {
        // Update model position and rotation from physics body
        if (!this.model || !this.body) {
            console.warn("Cannot update model from physics: missing model or body");
            return;
        }

        try {
            // Update position
            this.model.position.set(
                this.body.position.x,
                this.body.position.y - (this.body.shapes[0].height / 2), // Place bottom of cylinder at ground level
                this.body.position.z
            );
            
            // Apply rotation from physics body - only if needed
            if (!this.isDead) {
                this.model.quaternion.set(
                    this.body.quaternion.x,
                    this.body.quaternion.y,
                    this.body.quaternion.z,
                    this.body.quaternion.w
                );
            }
        } catch (error) {
            console.error("Error updating model from physics:", error);
        }
    }
    
    changeState(newState) {
        if (this.state === newState) return;
        
        this.state = newState;
        this.lastStateChange = performance.now();
        
        // Handle state entry actions
        switch (newState) {
            case STATES.IDLE:
                this.body.velocity.set(0, 0, 0);
                
                if (this.animations.idle) {
                    const action = this.animations.idle;
                    action.reset().setLoop(THREE.LoopRepeat).play();
                }
                break;
                
            case STATES.PATROL:
                if (this.animations.walk) {
                    const action = this.animations.walk;
                    action.reset().setLoop(THREE.LoopRepeat).play();
                }
                break;
                
            case STATES.CHASE:
                if (this.animations.run) {
                    const action = this.animations.run;
                    action.reset().setLoop(THREE.LoopRepeat).play();
                }
                break;
                
            case STATES.ATTACK:
                this.body.velocity.set(0, 0, 0);
                // Animation handled in attack() method
                break;
                
            case STATES.STUNNED:
                this.body.velocity.set(0, 0, 0);
                break;
        }
    }
    
    distanceTo(position) {
        return new Vector3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        ).distanceTo(position);
    }
    
    getPosition() {
        return new Vector3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
    }
    
    setPosition(position) {
        this.body.position.x = position.x;
        this.body.position.y = position.y;
        this.body.position.z = position.z;
        this.updateModelFromPhysics();
        
        // Regenerate patrol points around new position
        this.patrolPoints = [];
        this.generatePatrolPoints();
    }
    
    dispose() {
        // Remove physics body
        if (this.body) {
            this.physics.removeBody(this.body);
            this.body = null;
        }
        
        // Dispose of model resources
        if (this.model) {
            // Cleanup materials and geometries
            if (this.mesh) {
                this.mesh.geometry.dispose();
                this.mesh.material.dispose();
            }
            
            if (this.leftEye) {
                this.leftEye.geometry.dispose();
                this.leftEye.material.dispose();
            }
            
            if (this.rightEye) {
                this.rightEye.geometry.dispose();
                this.rightEye.material.dispose();
            }
            
            if (this.leftPupil) {
                this.leftPupil.geometry.dispose();
                this.leftPupil.material.dispose();
            }
            
            if (this.rightPupil) {
                this.rightPupil.geometry.dispose();
                this.rightPupil.material.dispose();
            }
        }
    }
} 