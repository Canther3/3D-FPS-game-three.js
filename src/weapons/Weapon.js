import * as THREE from 'three';
import { Vector3, Quaternion, AnimationMixer } from 'three';

export class Weapon {
    constructor(type, config) {
        this.type = type;
        this.config = config;
        
        // Weapon state
        this.currentAmmo = config.magazineSize;
        this.reserveAmmo = config.totalAmmo;
        this.isReloading = false;
        
        // Create weapon model
        this.model = new THREE.Group();
        this.createModel();
        
        // Animation properties
        this.mixer = null;
        this.animations = {};
        this.reloadTimeout = null;
        
        // Muzzle flash
        this.muzzleFlash = this.createMuzzleFlash();
        this.muzzleFlashVisible = false;
        this.muzzleFlashTimeout = null;
        
        // Position state
        this.defaultPosition = config.position.clone();
        this.aimPosition = new Vector3(0, -0.05, -0.2); // Centered and forward for aiming
        this.currentPosition = this.defaultPosition.clone();
        this.targetPosition = this.defaultPosition.clone();
        
        // Animation state
        this.aimTransitionSpeed = 10; // Speed of transitioning to aim position
    }
    
    createModel() {
        // In a real implementation, this would load the model from glTF file
        // For now, we'll create a simple placeholder model
        
        // Create weapon body
        const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
        const material = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.5,
            metalness: 0.7
        });
        
        const weaponBody = new THREE.Mesh(geometry, material);
        
        // Create barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const barrelMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.3,
            metalness: 0.9
        });
        
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = -0.2;
        barrel.position.y = 0.02;
        
        // Add muzzle flash point
        this.muzzlePoint = new THREE.Object3D();
        this.muzzlePoint.position.set(0, 0, -0.4);
        
        // Add parts to weapon model
        this.model.add(weaponBody);
        this.model.add(barrel);
        this.model.add(this.muzzlePoint);
        
        // Set initial position
        this.model.position.copy(this.config.position);
        
        // Set scale
        this.model.scale.copy(this.config.scale);
        
        // Hide initially
        this.model.visible = false;
    }
    
    createMuzzleFlash() {
        try {
            // Create muzzle flash sprite with a simple texture or fallback
            // Fallback to a simple white sprite if texture can't be loaded
            const muzzleFlashMaterial = new THREE.SpriteMaterial({
                color: 0xffff80,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.8
            });
            
            const muzzleFlash = new THREE.Sprite(muzzleFlashMaterial);
            muzzleFlash.scale.set(
                this.config.muzzleFlash.scale,
                this.config.muzzleFlash.scale,
                this.config.muzzleFlash.scale
            );
            
            // Add to muzzle point
            this.muzzlePoint.add(muzzleFlash);
            
            // Hide initially
            muzzleFlash.visible = false;
            
            return muzzleFlash;
        } catch (error) {
            console.error("Failed to create muzzle flash:", error);
            return new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff }));
        }
    }
    
    setupAnimations(gltf) {
        // When using actual loaded models, we would set up animations here
        if (!gltf || !gltf.animations || gltf.animations.length === 0) {
            return;
        }
        
        // Create animation mixer
        this.mixer = new AnimationMixer(this.model);
        
        // Store animations by name
        gltf.animations.forEach(clip => {
            const action = this.mixer.clipAction(clip);
            this.animations[clip.name] = action;
        });
    }
    
    update(deltaTime) {
        // Update animations
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
        
        // Interpolate position for smooth transitions
        this.updatePosition(deltaTime);
    }
    
    updatePosition(deltaTime) {
        // Interpolate current position towards target position
        this.currentPosition.lerp(this.targetPosition, this.aimTransitionSpeed * deltaTime);
        this.model.position.copy(this.currentPosition);
    }
    
    show() {
        this.model.visible = true;
    }
    
    hide() {
        this.model.visible = false;
        
        // Clear any active timeouts
        if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout);
            this.reloadTimeout = null;
        }
        
        if (this.muzzleFlashTimeout) {
            clearTimeout(this.muzzleFlashTimeout);
            this.muzzleFlashTimeout = null;
            this.muzzleFlash.visible = false;
        }
        
        this.isReloading = false;
    }
    
    aim() {
        // Set target position to aim position
        this.targetPosition.copy(this.aimPosition);
    }
    
    stopAim() {
        // Set target position back to default
        this.targetPosition.copy(this.defaultPosition);
    }
    
    playFireAnimation() {
        // Play fire animation if available
        if (this.animations && this.animations.fire) {
            const fireAction = this.animations.fire;
            fireAction.setLoop(THREE.LoopOnce);
            fireAction.reset().play();
        } else {
            // Simple recoil animation if no animations available
            this.playRecoilAnimation();
        }
    }
    
    playRecoilAnimation() {
        // Apply a quick backwards and upwards movement to simulate recoil
        const originalPosition = this.model.position.clone();
        
        // Apply recoil offset
        this.model.position.z += 0.03;
        this.model.position.y -= 0.01;
        
        // Return to original position
        setTimeout(() => {
            // Tween back to original position
            const duration = 0.1; // seconds
            const startTime = performance.now();
            
            const animate = () => {
                const now = performance.now();
                const elapsed = (now - startTime) / 1000; // seconds
                
                if (elapsed < duration) {
                    const t = elapsed / duration;
                    this.model.position.lerp(originalPosition, t);
                    requestAnimationFrame(animate);
                } else {
                    this.model.position.copy(originalPosition);
                }
            };
            
            animate();
        }, 50);
    }
    
    showMuzzleFlash() {
        // Clear any existing timeout
        if (this.muzzleFlashTimeout) {
            clearTimeout(this.muzzleFlashTimeout);
        }
        
        // Show muzzle flash
        this.muzzleFlash.visible = true;
        
        // Randomize rotation for variety
        this.muzzleFlash.material.rotation = Math.random() * Math.PI * 2;
        
        // Randomize scale slightly
        const scale = this.config.muzzleFlash.scale * (0.8 + Math.random() * 0.4);
        this.muzzleFlash.scale.set(scale, scale, scale);
        
        // Hide after duration
        this.muzzleFlashTimeout = setTimeout(() => {
            this.muzzleFlash.visible = false;
            this.muzzleFlashTimeout = null;
        }, this.config.muzzleFlash.duration * 1000);
    }
    
    reload() {
        if (this.isReloading || this.reserveAmmo <= 0) return;
        
        this.isReloading = true;
        
        // Play reload animation if available
        if (this.animations && this.animations.reload) {
            const reloadAction = this.animations.reload;
            reloadAction.setLoop(THREE.LoopOnce);
            reloadAction.reset().play();
        }
        
        // Set timeout for reload completion
        this.reloadTimeout = setTimeout(() => {
            this.completeReload();
        }, this.config.reloadTime * 1000);
    }
    
    completeReload() {
        if (!this.isReloading) return;
        
        // Calculate how many rounds to reload
        const neededAmmo = this.config.magazineSize - this.currentAmmo;
        let reloadAmount = Math.min(neededAmmo, this.reserveAmmo);
        
        // Update ammo counts
        this.currentAmmo += reloadAmount;
        this.reserveAmmo -= reloadAmount;
        
        // Reset reloading state
        this.isReloading = false;
        this.reloadTimeout = null;
    }
    
    cancelReload() {
        if (!this.isReloading) return;
        
        // Clear reload timeout
        if (this.reloadTimeout) {
            clearTimeout(this.reloadTimeout);
            this.reloadTimeout = null;
        }
        
        // Reset reloading state
        this.isReloading = false;
    }
} 