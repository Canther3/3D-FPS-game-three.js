import * as THREE from 'three';
import { Vector3, TextureLoader } from 'three';
import { ParticleSystem } from './ParticleSystem.js';

export class EffectsManager {
    constructor(scene, assetLoader) {
        this.scene = scene;
        this.assetLoader = assetLoader;
        this.effects = [];
        
        // Particle systems
        this.particleSystems = [];
        
        // Preload common geometries
        this.geometries = {
            particle: new THREE.SphereGeometry(0.05, 8, 8),
            spark: new THREE.BoxGeometry(0.08, 0.08, 0.08)
        };
        
        // Create reusable geometries
        this.particleGeometry = new THREE.PlaneGeometry(1, 1);
        
        // Arrays to track active effects
        this.bulletHoles = [];
        this.decals = [];
        
        // Maximum number of effects to keep in the scene
        this.maxBulletHoles = 50;
        this.maxDecals = 100;
        
        // Initialize materials first with fallbacks
        this.materials = {
            muzzleFlash: new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 }),
            bulletImpact: new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.6 }),
            blood: new THREE.MeshBasicMaterial({ color: 0xaa0000, transparent: true, opacity: 0.7 }),
            explosion: new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.8 }),
            smoke: new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.5 }),
            spark: new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 }),
            dust: new THREE.MeshBasicMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.4 })
        };
        
        // Load textures to enhance materials if available
        this.enhanceMaterialsWithTextures();
        
        console.log("EffectsManager initialized");
    }
    
    enhanceMaterialsWithTextures() {
        // Get textures from asset loader and enhance materials
        try {
            console.log("Enhancing materials with textures");
            
            // Fire texture (for muzzle flash and explosion)
            const fire = this.assetLoader.getTexture('fire');
            if (fire) {
                this.materials.muzzleFlash = new THREE.MeshBasicMaterial({
                    map: fire,
                    color: 0xffaa00,
                    blending: THREE.AdditiveBlending,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
                
                this.materials.explosion = new THREE.MeshBasicMaterial({
                    map: fire,
                    color: 0xff5500,
                    blending: THREE.AdditiveBlending,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
            }
            
            // Smoke texture
            const smoke = this.assetLoader.getTexture('smoke');
            if (smoke) {
                this.materials.smoke = new THREE.MeshBasicMaterial({
                    map: smoke,
                    color: 0x444444,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide
                });
            }
            
            // Spark texture
            const spark = this.assetLoader.getTexture('spark');
            if (spark) {
                this.materials.spark = new THREE.MeshBasicMaterial({
                    map: spark,
                    color: 0xffaa00,
                    blending: THREE.AdditiveBlending,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
            }
            
            // Blood texture
            const blood = this.assetLoader.getTexture('blood');
            if (blood) {
                this.materials.blood = new THREE.MeshBasicMaterial({
                    map: blood,
                    color: 0xaa0000,
                    transparent: true,
                    opacity: 0.7,
                    side: THREE.DoubleSide
                });
            }
            
            // Dust texture
            const dust = this.assetLoader.getTexture('dust');
            if (dust) {
                this.materials.dust = new THREE.MeshBasicMaterial({
                    map: dust,
                    color: 0xbbbbbb,
                    transparent: true,
                    opacity: 0.4,
                    side: THREE.DoubleSide
                });
            }
            
            // Bullet hole texture
            const bulletHole = this.assetLoader.getTexture('bulletHole');
            if (bulletHole) {
                this.materials.bulletImpact = new THREE.MeshBasicMaterial({
                    map: bulletHole,
                    color: 0xaaaaaa,
                    transparent: true,
                    opacity: 0.6,
                    side: THREE.DoubleSide
                });
            }
            
            console.log("EffectsManager: textures applied to materials");
        } catch (error) {
            console.error("Error enhancing materials with textures:", error);
            console.log("Using fallback materials");
        }
    }
    
    createMuzzleFlash(position, direction) {
        // Create a simple muzzle flash effect
        const flash = new THREE.PointLight(0xffaa00, 2, 2);
        flash.position.copy(position);
        
        // Add to scene
        this.scene.add(flash);
        
        // Auto-remove after short duration
        setTimeout(() => {
            this.scene.remove(flash);
        }, 50);
        
        // Create particles for the muzzle flash
        this.createParticles(position, {
            count: 5,
            material: this.materials.muzzleFlash,
            geometry: this.geometries.particle,
            velocity: direction,
            velocityRandomness: 0.1,
            lifetime: 0.1,
            size: 0.1
        });
    }
    
    createBulletImpact(position, normal) {
        // Create spark particles for bullet impact
        this.createParticles(position, {
            count: 8,
            material: this.materials.spark,
            geometry: this.geometries.spark,
            velocity: normal,
            velocityRandomness: 0.5,
            lifetime: 0.5,
            size: 0.05
        });
        
        // Create dust particles
        if (this.materials.dust) {
            this.createParticles(position, {
                count: 3,
                material: this.materials.dust,
                geometry: this.geometries.particle,
                velocity: normal,
                velocityRandomness: 0.3,
                lifetime: 0.7,
                size: 0.15
            });
        }
        
        // Create bullet hole decal
        this.createBulletHole(position, normal);
    }
    
    createBulletHole(position, normal) {
        // Use an oriented plane instead of sprite to avoid raycaster issues
        if (this.materials.bulletImpact) {
            // Create a plane for the decal
            const decalGeometry = new THREE.PlaneGeometry(0.2, 0.2);
            const bulletHole = new THREE.Mesh(decalGeometry, this.materials.bulletImpact);
            
            // Orient the plane to face along the normal
            bulletHole.lookAt(position.clone().add(normal));
            
            // Position slightly above surface to prevent z-fighting
            const offsetPosition = position.clone().addScaledVector(normal, 0.01);
            bulletHole.position.copy(offsetPosition);
            
            // Add to scene
            this.scene.add(bulletHole);
            
            // Add to bullet holes array for cleanup
            this.bulletHoles.push(bulletHole);
            
            // Remove oldest bullet hole if we exceed max
            if (this.bulletHoles.length > this.maxBulletHoles) {
                const oldest = this.bulletHoles.shift();
                this.scene.remove(oldest);
                if (oldest.geometry) oldest.geometry.dispose();
                if (oldest.material) oldest.material.dispose();
            }
        }
    }
    
    createBloodSplatter(position, direction) {
        // Create blood particles
        this.createParticles(position, {
            count: 12,
            material: this.materials.blood,
            geometry: this.geometries.particle,
            velocity: direction,
            velocityRandomness: 0.7,
            lifetime: 0.7,
            size: 0.08,
            gravity: 2.0
        });
    }
    
    createExplosion(position, size = 1.0) {
        // Create explosion light
        const light = new THREE.PointLight(0xff5500, 5, 10 * size);
        light.position.copy(position);
        this.scene.add(light);
        
        // Fade out and remove light
        const startTime = Date.now();
        const duration = 1000; // 1 second
        
        const fadeLight = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                const intensity = 5 * (1 - elapsed / duration);
                light.intensity = intensity;
                requestAnimationFrame(fadeLight);
            } else {
                this.scene.remove(light);
            }
        };
        
        fadeLight();
        
        // Create explosion particles
        this.createParticles(position, {
            count: 30 * size,
            material: this.materials.explosion,
            geometry: this.geometries.particle,
            velocity: new THREE.Vector3(0, 0, 0),
            velocityRandomness: 1.0,
            lifetime: 1.0,
            size: 0.2 * size,
            gravity: -0.5
        });
        
        // Create smoke particles
        if (this.materials.smoke) {
            this.createParticles(position, {
                count: 15 * size,
                material: this.materials.smoke,
                geometry: this.geometries.particle,
                velocity: new THREE.Vector3(0, 1, 0),
                velocityRandomness: 0.3,
                lifetime: 2.0,
                size: 0.3 * size,
                gravity: -0.2
            });
        }
    }
    
    createFootstepDust(position, intensity = 1.0) {
        if (this.materials.dust) {
            this.createParticles(position, {
                count: 5 * intensity,
                material: this.materials.dust,
                geometry: this.geometries.particle,
                velocity: new THREE.Vector3(0, 0.5, 0),
                velocityRandomness: 0.5,
                lifetime: 0.6,
                size: 0.1,
                gravity: 0.5
            });
        }
    }
    
    createParticles(position, options) {
        const {
            count = 10,
            material,
            geometry,
            velocity = new THREE.Vector3(0, 1, 0),
            velocityRandomness = 0.5,
            lifetime = 1.0,
            size = 0.1,
            gravity = 0
        } = options;
        
        // Create a group for particles
        const particleSystem = {
            particles: [],
            startTime: Date.now(),
            lifetime: lifetime * 1000, // Convert to milliseconds
            gravity: gravity
        };
        
        // Create particles
        for (let i = 0; i < count; i++) {
            const particle = new THREE.Mesh(geometry, material.clone());
            
            // Set initial position
            particle.position.copy(position);
            
            // Add some randomness to velocity
            const randomVel = new THREE.Vector3(
                (Math.random() - 0.5) * 2 * velocityRandomness,
                (Math.random() - 0.5) * 2 * velocityRandomness,
                (Math.random() - 0.5) * 2 * velocityRandomness
            );
            
            // Calculate particle velocity
            particle.userData.velocity = velocity.clone().add(randomVel);
            
            // Set size
            particle.scale.set(size, size, size);
            
            // Add to scene
            this.scene.add(particle);
            
            // Store in system
            particleSystem.particles.push(particle);
        }
        
        // Add to active particle systems
        this.particleSystems.push(particleSystem);
    }
    
    update(deltaTime) {
        // Update all particle systems
        for (let i = this.particleSystems.length - 1; i >= 0; i--) {
            const system = this.particleSystems[i];
            const elapsed = Date.now() - system.startTime;
            const life = Math.min(elapsed / system.lifetime, 1);
            
            // Check if system should be removed
            if (life >= 1) {
                // Remove all particles
                system.particles.forEach(particle => {
                    this.scene.remove(particle);
                    if (particle.geometry) particle.geometry.dispose();
                    if (particle.material) particle.material.dispose();
                });
                
                // Remove system
                this.particleSystems.splice(i, 1);
                continue;
            }
            
            // Update particles
            system.particles.forEach(particle => {
                // Move particle
                particle.position.add(
                    particle.userData.velocity.clone().multiplyScalar(deltaTime)
                );
                
                // Apply gravity effect
                if (system.gravity !== 0) {
                    particle.userData.velocity.y -= system.gravity * deltaTime;
                }
                
                // Fade out
                if (particle.material.opacity !== undefined) {
                    particle.material.opacity = 1 - life;
                }
                
                // Shrink
                const scale = 1 - life * 0.5;
                particle.scale.set(scale, scale, scale);
            });
        }
        
        // Update other effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.age += deltaTime;
            
            // Check if effect should be removed
            if (effect.age >= effect.lifetime) {
                this.scene.remove(effect.object);
                if (effect.object.material) effect.object.material.dispose();
                if (effect.object.geometry) effect.object.geometry.dispose();
                this.effects.splice(i, 1);
            }
        }
    }
    
    createDefaultImpact(position, normal) {
        // Skip if texture not loaded
        if (!this.materials.dust) return;
        
        // Get direction from normal
        const direction = normal.clone();
        
        // Create dust particles
        const system = new ParticleSystem({
            position: position,
            direction: direction,
            texture: this.materials.dust,
            particleCount: 10,
            particleSize: { min: 0.02, max: 0.08 },
            lifetime: { min: 0.2, max: 1.0 },
            velocity: { min: 0.5, max: 2.0 },
            color: new THREE.Color(0xcccccc),
            opacity: { start: 0.7, end: 0 },
            scale: { start: 0.5, end: 2.0 },
            blending: THREE.NormalBlending,
            spread: 0.7,
            emitRate: 0, // Emit all at once
            burst: true,
            gravity: 2
        });
        
        this.scene.add(system.container);
        this.particleSystems.push(system);
        
        return system;
    }
    
    createMetalImpact(position, normal) {
        // Skip if texture not loaded
        if (!this.materials.spark) return;
        
        // Get direction from normal
        const direction = normal.clone();
        
        // Create spark particles
        const system = new ParticleSystem({
            position: position,
            direction: direction,
            texture: this.materials.spark,
            particleCount: 15,
            particleSize: { min: 0.01, max: 0.04 },
            lifetime: { min: 0.1, max: 0.5 },
            velocity: { min: 1.0, max: 5.0 },
            color: new THREE.Color(0xffaa00),
            opacity: { start: 1, end: 0 },
            scale: { start: 1, end: 0.1 },
            blending: THREE.AdditiveBlending,
            spread: 0.8,
            emitRate: 0, // Emit all at once
            burst: true,
            gravity: 5
        });
        
        this.scene.add(system.container);
        this.particleSystems.push(system);
        
        return system;
    }
    
    createWoodImpact(position, normal) {
        // Skip if texture not loaded
        if (!this.materials.dust) return;
        
        // Get direction from normal
        const direction = normal.clone();
        
        // Create wood chip particles
        const system = new ParticleSystem({
            position: position,
            direction: direction,
            texture: this.materials.dust,
            particleCount: 20,
            particleSize: { min: 0.02, max: 0.06 },
            lifetime: { min: 0.3, max: 1.2 },
            velocity: { min: 0.8, max: 3.0 },
            color: new THREE.Color(0x8b4513), // Brown color
            opacity: { start: 0.8, end: 0 },
            scale: { start: 0.5, end: 1.5 },
            blending: THREE.NormalBlending,
            spread: 0.6,
            emitRate: 0, // Emit all at once
            burst: true,
            gravity: 4
        });
        
        this.scene.add(system.container);
        this.particleSystems.push(system);
        
        return system;
    }
    
    createConcreteImpact(position, normal) {
        // Skip if texture not loaded
        if (!this.materials.dust) return;
        
        // Get direction from normal
        const direction = normal.clone();
        
        // Create concrete dust particles
        const system = new ParticleSystem({
            position: position,
            direction: direction,
            texture: this.materials.dust,
            particleCount: 25,
            particleSize: { min: 0.02, max: 0.1 },
            lifetime: { min: 0.5, max: 1.5 },
            velocity: { min: 0.5, max: 2.5 },
            color: new THREE.Color(0xaaaaaa), // Gray color
            opacity: { start: 0.9, end: 0 },
            scale: { start: 0.5, end: 2.0 },
            blending: THREE.NormalBlending,
            spread: 0.5,
            emitRate: 0, // Emit all at once
            burst: true,
            gravity: 3
        });
        
        this.scene.add(system.container);
        this.particleSystems.push(system);
        
        return system;
    }
    
    createBloodEffect(position, normal) {
        // Skip if texture not loaded
        if (!this.materials.blood) return;
        
        // Get direction from normal
        const direction = normal.clone();
        
        // Create blood particles
        const system = new ParticleSystem({
            position: position,
            direction: direction,
            texture: this.materials.blood,
            particleCount: 15,
            particleSize: { min: 0.03, max: 0.12 },
            lifetime: { min: 0.3, max: 1.0 },
            velocity: { min: 0.5, max: 2.0 },
            color: new THREE.Color(0x8a0303), // Dark red
            opacity: { start: 0.9, end: 0 },
            scale: { start: 0.5, end: 1.5 },
            blending: THREE.NormalBlending,
            spread: 0.7,
            emitRate: 0, // Emit all at once
            burst: true,
            gravity: 3
        });
        
        this.scene.add(system.container);
        this.particleSystems.push(system);
        
        // Create blood splatter on surface
        this.createBloodSplatter(position, normal);
        
        return system;
    }
    
    clearAll() {
        // Remove all particle systems
        this.particleSystems.forEach(system => {
            system.particles.forEach(particle => {
                this.scene.remove(particle);
                if (particle.geometry) particle.geometry.dispose();
                if (particle.material) particle.material.dispose();
            });
        });
        this.particleSystems = [];
        
        // Remove all effects
        this.effects.forEach(effect => {
            this.scene.remove(effect.object);
            if (effect.object.material) effect.object.material.dispose();
            if (effect.object.geometry) effect.object.geometry.dispose();
        });
        this.effects = [];
    }
} 