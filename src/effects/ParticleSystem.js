import * as THREE from 'three';

export class ParticleSystem {
    constructor(options) {
        // Default options
        const defaultOptions = {
            position: new THREE.Vector3(0, 0, 0),
            direction: new THREE.Vector3(0, 1, 0),
            texture: null,
            particleCount: 10,
            particleSize: { min: 0.1, max: 0.5 },
            lifetime: { min: 0.5, max: 2.0 },
            velocity: { min: 0.5, max: 2.0 },
            color: new THREE.Color(0xffffff),
            opacity: { start: 1.0, end: 0.0 },
            scale: { start: 1.0, end: 0.5 },
            blending: THREE.NormalBlending,
            spread: 0.5,
            emitRate: 10, // Particles per second
            burst: false,
            gravity: 0
        };
        
        // Merge options
        this.options = { ...defaultOptions, ...options };
        
        // Create container for particles
        this.container = new THREE.Group();
        this.container.position.copy(this.options.position);
        
        // Set up particle properties
        this.particles = [];
        this.active = true;
        this.emitCounter = 0;
        this.elapsedTime = 0;
        
        // Create material
        if (this.options.texture) {
            this.material = new THREE.SpriteMaterial({
                map: this.options.texture,
                color: this.options.color,
                blending: this.options.blending,
                transparent: true,
                opacity: this.options.opacity.start
            });
        } else {
            // Fallback to basic material if no texture provided
            this.material = new THREE.SpriteMaterial({
                color: this.options.color,
                blending: this.options.blending,
                transparent: true,
                opacity: this.options.opacity.start
            });
        }
        
        // Create particles immediately if burst mode
        if (this.options.burst) {
            this.emitParticles(this.options.particleCount);
        }
    }
    
    emitParticles(count) {
        for (let i = 0; i < count; i++) {
            // Create particle (sprite)
            const particle = new THREE.Sprite(this.material.clone());
            
            // Randomize particle size
            const size = THREE.MathUtils.randFloat(
                this.options.particleSize.min,
                this.options.particleSize.max
            );
            particle.scale.set(size, size, size);
            
            // Set initial position (slightly randomized around emit point)
            const randomPos = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            );
            particle.position.copy(randomPos);
            
            // Randomize velocity direction based on spread
            const spreadVector = new THREE.Vector3(
                (Math.random() - 0.5) * this.options.spread,
                (Math.random() - 0.5) * this.options.spread,
                (Math.random() - 0.5) * this.options.spread
            );
            
            // Calculate velocity
            const velocity = this.options.direction.clone().normalize().add(spreadVector).normalize();
            const speed = THREE.MathUtils.randFloat(this.options.velocity.min, this.options.velocity.max);
            velocity.multiplyScalar(speed);
            
            // Set particle lifetime
            const lifetime = THREE.MathUtils.randFloat(this.options.lifetime.min, this.options.lifetime.max);
            
            // Store particle data
            particle.userData = {
                velocity: velocity,
                lifetime: lifetime,
                age: 0,
                startScale: size,
                endScale: size * this.options.scale.end / this.options.scale.start
            };
            
            // Add to container
            this.container.add(particle);
            
            // Add to particles array
            this.particles.push(particle);
        }
    }
    
    update(deltaTime) {
        // Update emission
        if (!this.options.burst && this.active) {
            this.emitCounter += deltaTime;
            
            // Calculate particles to emit
            const emitInterval = 1 / this.options.emitRate;
            while (this.emitCounter >= emitInterval) {
                this.emitParticles(1);
                this.emitCounter -= emitInterval;
            }
        }
        
        // Update each particle
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update age
            particle.userData.age += deltaTime;
            
            // Remove if lifetime exceeded
            if (particle.userData.age >= particle.userData.lifetime) {
                this.container.remove(particle);
                this.particles.splice(i, 1);
                continue;
            }
            
            // Calculate life progress (0 to 1)
            const lifeProgress = particle.userData.age / particle.userData.lifetime;
            
            // Update position
            const velocity = particle.userData.velocity.clone();
            
            // Apply gravity
            if (this.options.gravity !== 0) {
                velocity.y -= this.options.gravity * deltaTime;
                particle.userData.velocity.y = velocity.y;
            }
            
            // Move particle
            particle.position.add(velocity.multiplyScalar(deltaTime));
            
            // Update opacity
            if (particle.material.opacity !== undefined) {
                particle.material.opacity = THREE.MathUtils.lerp(
                    this.options.opacity.start,
                    this.options.opacity.end,
                    lifeProgress
                );
            }
            
            // Update scale
            const scale = THREE.MathUtils.lerp(
                particle.userData.startScale,
                particle.userData.endScale,
                lifeProgress
            );
            particle.scale.set(scale, scale, scale);
        }
    }
    
    isComplete() {
        return !this.active && this.particles.length === 0;
    }
    
    stop() {
        this.active = false;
    }
    
    resume() {
        this.active = true;
    }
    
    dispose() {
        // Remove all particles
        this.particles.forEach(particle => {
            if (particle.material) {
                particle.material.dispose();
            }
            this.container.remove(particle);
        });
        
        this.particles = [];
        this.active = false;
    }
} 