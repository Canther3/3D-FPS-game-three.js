import * as THREE from 'three';
import { Vector3, Euler, Raycaster } from 'three';
import * as CANNON from 'cannon-es';

export class Player {
    constructor(camera, physics, soundManager, game = null) {
        // Oyuncu özellikleri
        this.camera = camera;
        this.physics = physics;
        this.soundManager = soundManager;
        this.game = game;
        
        this.health = 100;
        this.maxHealth = 100;
        this.isDead = false;
        
        // Hareket ayarları - artırılmış hızlar
        this.moveSpeed = 12;
        this.runSpeed = 20;
        this.jumpForce = 8;
        this.isRunning = false;
        this.isJumping = false;
        this.canJump = true;
        this.footstepTimer = 0;
        this.footstepInterval = 0.4; // Adım sesleri arasındaki süre (saniye cinsinden)
        
        // Bakış ayarları
        this.lookSensitivity = 0.15;
        this.maxLookUp = Math.PI / 2 - 0.1; // 90 derecenin hemen altında
        this.maxLookDown = -Math.PI / 2 + 0.1; // -90 derecenin hemen üstünde
        
        // Hareket vektörleri
        this.moveDirection = new Vector3();
        this.velocity = new Vector3();
        
        // Kamera kurulumu - ayarlanmış başlangıç pozisyonu
        this.camera.position.set(0, 1.8, 10);
        this.cameraRotation = new Euler(0, 0, 0, 'YXZ');
        
        // Fizik gövdesi
        this.radius = 0.4;
        this.height = 1.8;
        
        // Fizik gövdesini oluştur (silindir şekli)
        const shape = new CANNON.Cylinder(
            this.radius, 
            this.radius, 
            this.height, 
            16
        );
        
        this.body = new CANNON.Body({
            mass: 70, // kg
            position: new CANNON.Vec3(0, this.height / 2 + 1, 10),
            shape: shape,
            material: physics.playerMaterial,
            fixedRotation: true, // Oyuncunun devrilmesini engelle
            linearDamping: 0.02
        });
        
        // Oyuncu gövdesini fizik dünyasına ekle
        this.physics.world.addBody(this.body);
        
        // Zemin kontrolü için ışın izleme ayarla
        this.raycaster = new Raycaster(
            new Vector3(), 
            new Vector3(0, -1, 0), 
            0, 
            this.height / 2 + 0.1
        );
        
        // Hareket durumu
        this.movementKeys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            run: false,
            crouch: false
        };
        
        // Silah durumu
        this.currentWeapon = null;
        this.inventory = [];
    }
    
    update(deltaTime) {
        if (this.isDead) return;
        
        // Oyuncu hareketini güncelle
        this.updateMovement(deltaTime);
        
        // Kamera pozisyonunu güncelle
        this.updateCamera();
        
        // Adım seslerini çal
        this.updateFootsteps(deltaTime);
        
        // Arayüzü güncelle
        this.updateUI();
        
        // Toplanabilir öğeleri kontrol et
        this.checkPickups();
    }
    
    updateMovement(deltaTime) {
        // Hareket yönünü sıfırla
        this.moveDirection.set(0, 0, 0);
        
        // Basılan tuşlara göre hareket yönünü hesapla
        if (this.movementKeys.forward) {
            this.moveDirection.z -= 1;
        }
        if (this.movementKeys.backward) {
            this.moveDirection.z += 1;
        }
        if (this.movementKeys.left) {
            this.moveDirection.x -= 1;
        }
        if (this.movementKeys.right) {
            this.moveDirection.x += 1;
        }
        
        // Çapraz hareket ediyorsa hareket yönünü normalleştir
        if (this.moveDirection.length() > 1) {
            this.moveDirection.normalize();
        }
        
        // Kamera döndürmesini harekete uygula
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationY(this.cameraRotation.y);
        this.moveDirection.applyMatrix4(rotationMatrix);
        
        // Koşu durumuna göre mevcut hızı ayarla
        const currentSpeed = this.movementKeys.run ? this.runSpeed : this.moveSpeed;
        
        // Hareketi hıza uygula - doğrudan kontrol ile
        if (this.moveDirection.length() > 0) {
            // Daha yumuşak hızlanma için hedef hızı kullan
            const targetVelocityX = this.moveDirection.x * currentSpeed;
            const targetVelocityZ = this.moveDirection.z * currentSpeed;
            
            // Hızlanma faktörü - hareketi daha çabuk yanıt verir hale getirmek için artırıldı
            const accelFactor = 0.3; // 0.2'den 0.3'e çıkartıldı
            
            // Mevcut hızı hedef hıza doğru yumuşak şekilde değiştir (hızlanma)
            this.body.velocity.x = THREE.MathUtils.lerp(this.body.velocity.x, targetVelocityX, accelFactor);
            this.body.velocity.z = THREE.MathUtils.lerp(this.body.velocity.z, targetVelocityZ, accelFactor);
        } else {
            // Hareket tuşlarına basılmadığında daha küçük bir sönümleme uygula
            const dampingFactor = 0.9; // 0.95'den 0.9'a düşürüldü - daha hızlı durmak için
            this.body.velocity.x *= dampingFactor;
            this.body.velocity.z *= dampingFactor;
            
            // Çok yavaşsa tamamen durdur (sürüklenmeyi engelle)
            const stopThreshold = 0.1; // 0.05'den 0.1'e artırıldı
            if (Math.abs(this.body.velocity.x) < stopThreshold) this.body.velocity.x = 0;
            if (Math.abs(this.body.velocity.z) < stopThreshold) this.body.velocity.z = 0;
        }
        
        // Belirli aralıklarla hız bilgilerini konsola yaz
        if (this.moveDirection.length() > 0 && Math.random() < 0.01) { // Her 100 karede bir
            console.log(`Hareket: tuşlar=${JSON.stringify(this.movementKeys)}, hız=${this.body.velocity.x.toFixed(2)},${this.body.velocity.z.toFixed(2)}`);
        }
        
        // Oyuncunun zeminde olup olmadığını kontrol et
        this.checkGrounded();
        
        // Zıplamayı işle
        if (this.movementKeys.jump && this.canJump && !this.isJumping) {
            this.jump();
        }
    }
    
    checkGrounded() {
        // Işın izleyici pozisyonunu güncelle
        this.raycaster.ray.origin.copy(this.camera.position);
        this.raycaster.ray.origin.y -= 1.5; // Ayaklardan kontrol için ofset
        
        // Fizik dünyasından çarpışmaları al
        const result = this.physics.raycastFirst(
            new CANNON.Vec3(this.raycaster.ray.origin.x, this.raycaster.ray.origin.y, this.raycaster.ray.origin.z),
            new CANNON.Vec3(0, -1, 0),
            0.2
        );
        
        this.canJump = result !== null;
        
        if (this.canJump && this.isJumping && this.body.velocity.y < 0.1) {
            this.isJumping = false;
            this.soundManager.playSound('land', 0.5);
        }
    }
    
    jump() {
        // Yukarı doğru kuvvet uygula
        this.body.velocity.y = this.jumpForce;
        this.isJumping = true;
        this.canJump = false;
        
        // Play jump sound
        this.soundManager.playSound('jump', 0.5);
    }
    
    updateCamera() {
        // Update camera position to match physics body
        this.camera.position.x = this.body.position.x;
        this.camera.position.z = this.body.position.z;
        this.camera.position.y = this.body.position.y + this.height / 2 - 0.1; // Eye height
        
        // Apply camera rotation
        this.camera.rotation.copy(this.cameraRotation);
    }
    
    updateFootsteps(deltaTime) {
        // Only play footsteps if moving and on ground
        if ((this.moveDirection.x !== 0 || this.moveDirection.z !== 0) && !this.isJumping) {
            this.footstepTimer += deltaTime;
            
            // Adjust step interval based on run state
            const stepInterval = this.movementKeys.run ? 
                this.footstepInterval / 2 : this.footstepInterval;
            
            if (this.footstepTimer >= stepInterval) {
                this.footstepTimer = 0;
                this.soundManager.playSound('footstep', 0.3);
            }
        }
    }
    
    updateUI() {
        // Update health display
        const healthPercent = (this.health / this.maxHealth) * 100;
        document.getElementById('health-indicator').style.width = healthPercent + '%';
    }
    
    takeDamage(amount) {
        if (this.isDead) return;
        
        this.health -= amount;
        
        // Play hurt sound
        this.soundManager.playSound('hurt', 0.5);
        
        // Check if player is dead
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }
    
    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
    
    die() {
        this.isDead = true;
        this.health = 0;
        
        // Play death sound
        this.soundManager.playSound('death', 0.7);
        
        // Trigger game over state
        // This will be handled by the Game class
    }
    
    reset() {
        // Reset health
        this.health = this.maxHealth;
        this.isDead = false;
        
        // Reset position to z=10 instead of z=0
        this.body.position.set(0, this.height / 2 + 1, 10);
        this.body.velocity.set(0, 0, 0);
        
        // Reset camera
        this.cameraRotation.set(0, 0, 0, 'YXZ');
        this.camera.rotation.copy(this.cameraRotation);
        
        // Reset movement keys
        for (const key in this.movementKeys) {
            this.movementKeys[key] = false;
        }
        
        // Reset jumping state
        this.isJumping = false;
        this.canJump = true;
    }
    
    handleMouseMove(event) {
        // Calculate mouse movement
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        // Update camera rotation based on mouse movement
        this.cameraRotation.y -= movementX * 0.002 * this.lookSensitivity;
        this.cameraRotation.x -= movementY * 0.002 * this.lookSensitivity;
        
        // Clamp vertical rotation to prevent over-rotation
        this.cameraRotation.x = Math.max(
            this.maxLookDown,
            Math.min(this.maxLookUp, this.cameraRotation.x)
        );
    }
    
    setMovementKey(key, value) {
        if (key in this.movementKeys) {
            this.movementKeys[key] = value;
        }
    }
    
    getPosition() {
        return new Vector3(
            this.body.position.x,
            this.body.position.y,
            this.body.position.z
        );
    }
    
    getDirection() {
        // Get direction vector from camera
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        return direction;
    }
    
    checkPickups() {
        // Check for pickups within collection range
        const currentLevel = this.getCurrentLevel();
        if (!currentLevel) return;
        
        const pickupRange = 2.0; // Collection range in units
        const playerPosition = this.getPosition();
        
        currentLevel.pickups.forEach(pickup => {
            if (!pickup.userData.isCollected && pickup.visible) {
                const distance = playerPosition.distanceTo(pickup.position);
                
                if (distance < pickupRange) {
                    // Collect pickup
                    const collected = currentLevel.collectPickup(pickup);
                    
                    if (collected) {
                        // Play pickup sound
                        if (this.soundManager) {
                            this.soundManager.playSound('pickup', 0.5);
                        }
                        
                        // Add score or other effects
                        this.score += 100;
                    }
                }
            }
        });
    }
    
    getCurrentLevel() {
        // Get current level from game
        if (this.game && this.game.levelManager) {
            return this.game.levelManager.getCurrentLevel();
        }
        return null;
    }
} 