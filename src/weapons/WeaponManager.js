import * as THREE from 'three';
import { Vector3, Quaternion, Raycaster } from 'three';
import { Weapon } from './Weapon.js';

// Sabitler
const WEAPONS = {
    pistol: {
        name: 'Pistol',
        modelPath: 'models/weapons/pistol.glb',
        damage: 25,
        fireRate: 5, // saniyedeki mermi sayısı
        reloadTime: 1.0, // saniye
        magazineSize: 12,
        totalAmmo: 48,
        automatic: false,
        spread: 0.02,
        recoil: 0.3,
        aimRecoil: 0.1,
        soundEffects: {
            fire: 'pistolShot',
            reload: 'reload',
            empty: 'empty'
        },
        position: new Vector3(0.2, -0.2, -0.35),
        scale: new Vector3(1, 1, 1),
        muzzleFlash: {
            scale: 0.05,
            duration: 0.05
        }
    },
    rifle: {
        name: 'Assault Rifle',
        modelPath: 'models/weapons/rifle.glb',
        damage: 20,
        fireRate: 10, // saniyedeki mermi sayısı
        reloadTime: 2.0, // saniye
        magazineSize: 30,
        totalAmmo: 90,
        automatic: true,
        spread: 0.03,
        recoil: 0.5,
        aimRecoil: 0.2,
        soundEffects: {
            fire: 'rifleShot',
            reload: 'reload',
            empty: 'empty'
        },
        position: new Vector3(0.2, -0.15, -0.4),
        scale: new Vector3(1, 1, 1),
        muzzleFlash: {
            scale: 0.08,
            duration: 0.05
        }
    },
    shotgun: {
        name: 'Shotgun',
        modelPath: 'models/weapons/shotgun.glb',
        damage: 15, // saçma başına
        fireRate: 1.2, // saniyedeki atış sayısı
        reloadTime: 2.5, // saniye
        magazineSize: 8,
        totalAmmo: 24,
        automatic: false,
        spread: 0.08,
        pellets: 8, // her atıştaki saçma sayısı
        recoil: 1.0,
        aimRecoil: 0.6,
        soundEffects: {
            fire: 'shotgunShot',
            reload: 'reload',
            empty: 'empty'
        },
        position: new Vector3(0.2, -0.1, -0.5),
        scale: new Vector3(1, 1, 1),
        muzzleFlash: {
            scale: 0.12,
            duration: 0.08
        }
    }
};

export class WeaponManager {
    constructor(scene, camera, physics, player, soundManager) {
        this.scene = scene;
        this.camera = camera;
        this.physics = physics;
        this.player = player;
        this.soundManager = soundManager;
        
        // Silah özellikleri
        this.weapons = [];
        this.currentWeaponIndex = -1;
        this.currentWeapon = null;
        
        // Ateşleme durumu
        this.isFiring = false;
        this.isAiming = false;
        this.lastFireTime = 0;
        this.isPaused = false;
        
        // İsabet tespiti için ışın izleyici
        this.raycaster = new Raycaster();
        // Sprite'ları düzgün işlemek için ışın izleyiciye kamera ata
        this.raycaster.camera = this.camera;
        
        // Silah modelleri için konteyner
        this.weaponContainer = new THREE.Group();
        this.scene.add(this.weaponContainer);
        
        // Metotları bağla
        this.update = this.update.bind(this);
        this.startFiring = this.startFiring.bind(this);
        this.stopFiring = this.stopFiring.bind(this);
        this.fire = this.fire.bind(this);
        this.reload = this.reload.bind(this);
        
        // Silahları başlat
        this.initializeWeapons();
    }
    
    initializeWeapons() {
        // Tüm silahları oluştur
        Object.keys(WEAPONS).forEach(weaponType => {
            const weaponConfig = WEAPONS[weaponType];
            const weapon = new Weapon(weaponType, weaponConfig);
            this.weapons.push(weapon);
        });
    }
    
    equipWeapon(weaponType) {
        // Türüne göre silahı bul
        const weaponIndex = this.weapons.findIndex(w => w.type === weaponType);
        
        if (weaponIndex === -1) {
            console.error(`Silah türü bulunamadı: ${weaponType}`);
            return;
        }
        
        this.switchWeapon(weaponIndex);
    }
    
    switchWeapon(index) {
        // İndeksi doğrula
        if (index < 0 || index >= this.weapons.length) {
            return;
        }
        
        // Aynı silahsa atla
        if (index === this.currentWeaponIndex) {
            return;
        }
        
        // Mevcut silahı gizle
        if (this.currentWeapon) {
            this.currentWeapon.hide();
            this.weaponContainer.remove(this.currentWeapon.model);
        }
        
        // Yeni silahı ayarla
        this.currentWeaponIndex = index;
        this.currentWeapon = this.weapons[index];
        
        // Yeni silahı göster
        this.weaponContainer.add(this.currentWeapon.model);
        this.currentWeapon.show();
        
        // Silah değiştirme sesini çal
        this.soundManager.playSound('reload', 0.5);
        
        // Mermi göstergesini güncelle
        this.updateAmmoDisplay();
    }
    
    cycleWeapon(direction) {
        let newIndex = this.currentWeaponIndex + direction;
        
        // Sınırları aştığında başa/sona dön
        if (newIndex < 0) {
            newIndex = this.weapons.length - 1;
        } else if (newIndex >= this.weapons.length) {
            newIndex = 0;
        }
        
        this.switchWeapon(newIndex);
    }
    
    startFiring() {
        if (!this.currentWeapon || this.player.isDead) return;
        
        console.log(`${this.currentWeapon.type} ile ateşleme başlatılıyor`, this.currentWeapon.config.automatic ? "(otomatik)" : "(manuel)");
        this.isFiring = true;
        
        // Tüm silahlar için hemen ateş et (otomatik olsun olmasın)
        // Bu, tüm silahların ilk atışı anında yapmasını sağlar
        this.fire();
    }
    
    stopFiring() {
        console.log("Ateşleme durduruluyor - isFiring değeri: " + this.isFiring);
        const wasFiring = this.isFiring;
        this.isFiring = false;
        
        // Otomatik silahlar için, çağrıları temizle
        if (wasFiring && this.currentWeapon && this.currentWeapon.config.automatic) {
            // Bekleyen fire çağrıları otomatik olarak duracak (isFiring şimdi false)
            
            // Son ateş etme zamanını sıfırla
            this.lastFireTime = 0;
            
            console.log("Otomatik silah ateşlemesi temizlendi");
        }
    }
    
    startAiming() {
        if (!this.currentWeapon || this.player.isDead) return;
        
        this.isAiming = true;
        console.log("Starting aiming");
        
        // Move weapon to aim position
        this.currentWeapon.aim();
    }
    
    stopAiming() {
        if (!this.currentWeapon) return;
        
        this.isAiming = false;
        console.log("Stopping aiming");
        
        // Move weapon back to hip position
        this.currentWeapon.stopAim();
    }
    
    fire() {
        if (!this.currentWeapon || this.isPaused || this.player.isDead) {
            return;
        }

        // Check fire rate cooldown
        const now = performance.now();
        const timeSinceLastFire = now - this.lastFireTime;
        const minTimeBetweenShots = 1000 / this.currentWeapon.config.fireRate;
        
        if (timeSinceLastFire < minTimeBetweenShots) {
            // Eğer otomatik ateşleme modu ve hala ateşleme yapılıyorsa, bir sonraki frame'de tekrar deneyin
            if (this.currentWeapon.config.automatic && this.isFiring) {
                requestAnimationFrame(() => {
                    if (this.isFiring) {
                        this.fire();
                    }
                });
            }
            return;
        }
        
        // Check if weapon has ammo
        if (this.currentWeapon.currentAmmo <= 0) {
            this.soundManager.playSound(this.currentWeapon.config.soundEffects.empty, 0.5);
            this.lastFireTime = now; // Prevent spamming empty sound
            
            // Auto-reload when empty
            if (this.currentWeapon.reserveAmmo > 0 && !this.currentWeapon.isReloading) {
                this.reload();
            }
            
            return;
        }
        
        // Check if weapon is reloading
        if (this.currentWeapon.isReloading) {
            return;
        }
        
        // Update last fire time
        this.lastFireTime = now;
        
        // Decrease ammo
        this.currentWeapon.currentAmmo--;
        
        // Show muzzle flash
        this.currentWeapon.showMuzzleFlash();
        
        // Play fire animation
        this.currentWeapon.playFireAnimation();
        
        // Play fire sound
        this.soundManager.playSound(this.currentWeapon.config.soundEffects.fire, 0.8);
        
        // Apply recoil
        const recoilAmount = this.isAiming ? 
            this.currentWeapon.config.aimRecoil : 
            this.currentWeapon.config.recoil;
        this.applyRecoil(recoilAmount);
        
        // Perform hit detection
        this.performHitDetection();
        
        // Update ammo display
        this.updateAmmoDisplay();

        // Schedule next automatic fire if weapon is automatic
        if (this.currentWeapon.config.automatic && this.isFiring) {
            requestAnimationFrame(() => {
                if (this.isFiring) {
                    this.fire();
                }
            });
        }
    }
    
    reload() {
        if (!this.currentWeapon || this.player.isDead) return;
        
        // Skip if already reloading or no need to reload
        if (this.currentWeapon.isReloading || 
            this.currentWeapon.currentAmmo === this.currentWeapon.config.magazineSize || 
            this.currentWeapon.reserveAmmo <= 0) {
            return;
        }
        
        // Play reload sound
        this.soundManager.playSound(this.currentWeapon.config.soundEffects.reload, 0.7);
        
        // Start reload
        this.currentWeapon.reload();
        
        // Update ammo display
        this.updateAmmoDisplay();
    }
    
    performHitDetection() {
        // Get direction with spread
        const direction = this.getShootDirection();
        
        // Set raycaster
        this.raycaster.set(this.camera.position, direction);
        
        // Make sure camera is set for sprite detection
        this.raycaster.camera = this.camera;
        
        // Filter out problematic objects and sprites without causing errors
        const objectsToTest = this.scene.children.filter(obj => {
            // Skip invisible objects
            if (!obj.visible) return false;
            
            return true;
        });
        
        try {
            // Get intersections with filtered scene objects
            const intersects = this.raycaster.intersectObjects(objectsToTest, true);
            
            if (intersects.length > 0) {
                const hit = intersects[0];
                
                // Check if we hit an enemy
                const enemy = this.findEnemyFromObject(hit.object);
                
                if (enemy) {
                    // Apply damage
                    enemy.takeDamage(this.currentWeapon.config.damage);
                    
                    // Create blood particles
                    this.createBloodEffect(hit.point, hit.face.normal);
                    
                    // Play hit sound
                    this.soundManager.playSound('hit', 0.5);
                } else {
                    // Hit environment - create bullet hole and impact particles
                    this.createBulletHole(hit.point, hit.face.normal, hit.object);
                }
            }
        } catch (error) {
            console.warn("Error in hit detection:", error.message);
        }
    }
    
    findEnemyFromObject(object) {
        // This would be implemented to find the enemy entity from a hit mesh
        // It depends on how enemies are structured in your game
        
        // Placeholder implementation
        let current = object;
        
        // Traverse up the parent chain to find an object with enemy data
        while (current) {
            if (current.userData && current.userData.isEnemy) {
                return current.userData.enemyRef;
            }
            current = current.parent;
        }
        
        return null;
    }
    
    getShootDirection() {
        // Get base direction from camera
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        // Apply spread
        const spread = this.isAiming ? 
            this.currentWeapon.config.spread / 3 : // Reduced spread when aiming
            this.currentWeapon.config.spread;
        
        // Add random spread
        direction.x += (Math.random() - 0.5) * spread;
        direction.y += (Math.random() - 0.5) * spread;
        direction.z += (Math.random() - 0.5) * spread;
        
        // Normalize direction
        direction.normalize();
        
        return direction;
    }
    
    applyRecoil(amount) {
        // Apply recoil to camera rotation - REDUCED significantly to fix looking down problem
        this.player.cameraRotation.x -= amount * 0.1; // Reduced from 0.5 to 0.1
        this.player.cameraRotation.y += (Math.random() - 0.5) * amount * 0.1; // Reduced from 0.5 to 0.1
        
        // Clamp vertical rotation
        this.player.cameraRotation.x = Math.max(
            this.player.maxLookDown,
            Math.min(this.player.maxLookUp, this.player.cameraRotation.x)
        );
    }
    
    createBulletHole(position, normal, targetObject) {
        // Create bullet hole decal
        // This would be implemented with a DecalGeometry
        
        // For now we'll create a simple placeholder
        // In a real implementation, this would use ThreeJS Decals or a custom solution
        
        // Notify effects manager to create bullet impact
        // this.game.effectsManager.createBulletImpact(position, normal);
    }
    
    createBloodEffect(position, normal) {
        // Create blood particle effect
        // This would be implemented with the ParticleSystem
        
        // Notify effects manager to create blood effect
        // this.game.effectsManager.createBloodEffect(position, normal);
    }
    
    updateAmmoDisplay() {
        if (!this.currentWeapon) return;
        
        // Check if ammo display element exists, create it if not
        let ammoDisplay = document.getElementById('ammo-display');
        
        if (!ammoDisplay) {
            // Create ammo display if it doesn't exist
            ammoDisplay = document.createElement('div');
            ammoDisplay.id = 'ammo-display';
            ammoDisplay.style.position = 'absolute';
            ammoDisplay.style.bottom = '30px';
            ammoDisplay.style.right = '30px';
            ammoDisplay.style.color = 'white';
            ammoDisplay.style.fontSize = '24px';
            ammoDisplay.style.fontFamily = 'Arial, sans-serif';
            ammoDisplay.style.textShadow = '2px 2px 2px rgba(0, 0, 0, 0.5)';
            document.body.appendChild(ammoDisplay);
        }
        
        // Update ammo text
        const ammoText = `${this.currentWeapon.currentAmmo}/${this.currentWeapon.reserveAmmo}`;
        ammoDisplay.textContent = ammoText;
    }
    
    update(deltaTime) {
        // Skip if no weapon or paused
        if (!this.currentWeapon || this.isPaused) return;
        
        // Update weapon position to follow camera
        this.updateWeaponPosition();
        
        // Update current weapon
        this.currentWeapon.update(deltaTime);
        
        // Otomatik silahlar için ateşleme update'i artık burada değil,
        // requestAnimationFrame kullanılarak fire() içinde yapılıyor
    }
    
    updateWeaponPosition() {
        // Position weapon relative to camera
        this.weaponContainer.position.copy(this.camera.position);
        this.weaponContainer.rotation.copy(this.camera.rotation);
        
        // Apply weapon sway based on movement
        const swayAmount = 0.003;
        const movementX = this.player.velocity.x;
        const movementZ = this.player.velocity.z;
        
        if (Math.abs(movementX) > 0.1 || Math.abs(movementZ) > 0.1) {
            const time = performance.now() * 0.002;
            this.weaponContainer.position.y += Math.sin(time * 5) * swayAmount;
            this.weaponContainer.position.x += Math.cos(time * 4) * swayAmount * 0.5;
            
            // Add slight rotation sway
            this.weaponContainer.rotation.z = Math.sin(time * 4) * swayAmount * 0.2;
        }
    }
    
    addAmmo(weaponType, amount) {
        // Find weapon by type
        const weapon = this.weapons.find(w => w.type === weaponType);
        
        if (weapon) {
            weapon.reserveAmmo += amount;
            
            // Update ammo display if it's the current weapon
            if (this.currentWeapon === weapon) {
                this.updateAmmoDisplay();
            }
        }
    }
    
    // Methods to handle pausing and resuming
    pause() {
        this.isPaused = true;
        this.isFiring = false; // Cancel firing when paused
    }
    
    resume() {
        this.isPaused = false;
        // Don't auto-resume firing
    }
} 