import * as THREE from 'three';
import { Vector3, TextureLoader } from 'three';
import { ParticleSystem } from './ParticleSystem.js';

export class EffectsManager {
    constructor(scene, assetLoader) {
        this.scene = scene;
        this.assetLoader = assetLoader;
        this.effects = [];
        
        // Parçacık sistemleri
        this.particleSystems = [];
        
        // Sık kullanılan geometrileri önceden yükle
        this.geometries = {
            particle: new THREE.SphereGeometry(0.05, 8, 8),
            spark: new THREE.BoxGeometry(0.08, 0.08, 0.08)
        };
        
        // Yeniden kullanılabilir geometriler oluştur
        this.particleGeometry = new THREE.PlaneGeometry(1, 1);
        
        // Aktif efektleri izlemek için diziler
        this.bulletHoles = [];
        this.decals = [];
        
        // Sahnede tutulacak maksimum efekt sayısı
        this.maxBulletHoles = 50;
        this.maxDecals = 100;
        
        // Önce yedek materyallerle başlat
        this.materials = {
            muzzleFlash: new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 }),
            bulletImpact: new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.6 }),
            blood: new THREE.MeshBasicMaterial({ color: 0xaa0000, transparent: true, opacity: 0.7 }),
            explosion: new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.8 }),
            smoke: new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.5 }),
            spark: new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 }),
            dust: new THREE.MeshBasicMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.4 })
        };
        
        // Eğer varsa, materyalleri dokularla geliştir
        this.enhanceMaterialsWithTextures();
        
        console.log("EffectsManager başlatıldı");
    }
    
    enhanceMaterialsWithTextures() {
        // Varlık yükleyiciden dokuları al ve materyalleri geliştir
        try {
            console.log("Materyaller dokularla geliştiriliyor");
            
            // Ateş dokusu (namlu parlaması ve patlama için)
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
            
            // Duman dokusu
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
            
            // Kıvılcım dokusu
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
            
            // Kan dokusu
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
            
            // Toz dokusu
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
            
            // Mermi deliği dokusu
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
            
            console.log("EffectsManager: dokular materyallere uygulandı");
        } catch (error) {
            console.error("Materyalleri dokularla geliştirirken hata:", error);
            console.log("Yedek materyaller kullanılıyor");
        }
    }
    
    createMuzzleFlash(position, direction) {
        // Basit bir namlu parlaması efekti oluştur
        const flash = new THREE.PointLight(0xffaa00, 2, 2);
        flash.position.copy(position);
        
        // Sahneye ekle
        this.scene.add(flash);
        
        // Kısa süre sonra otomatik olarak kaldır
        setTimeout(() => {
            this.scene.remove(flash);
        }, 50);
        
        // Namlu parlaması için parçacıklar oluştur
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
        // Mermi etkisi için kıvılcım parçacıkları oluştur
        this.createParticles(position, {
            count: 8,
            material: this.materials.spark,
            geometry: this.geometries.spark,
            velocity: normal,
            velocityRandomness: 0.5,
            lifetime: 0.5,
            size: 0.05
        });
        
        // Toz parçacıkları oluştur
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
        
        // Mermi deliği çıkartması oluştur
        this.createBulletHole(position, normal);
    }
    
    createBulletHole(position, normal) {
        // Işın izleyici sorunlarını önlemek için sprite yerine yönlendirilmiş düzlem kullan
        if (this.materials.bulletImpact) {
            // Çıkartma için bir düzlem oluştur
            const decalGeometry = new THREE.PlaneGeometry(0.2, 0.2);
            const bulletHole = new THREE.Mesh(decalGeometry, this.materials.bulletImpact);
            
            // Düzlemi normal yönüne yönlendir
            bulletHole.lookAt(position.clone().add(normal));
            
            // Yüzeye yakın konumda tutmak için biraz öteleme
            const offsetPosition = position.clone().addScaledVector(normal, 0.01);
            bulletHole.position.copy(offsetPosition);
            
            // Sahneye ekle
            this.scene.add(bulletHole);
            
            // Aktif mermi delikleri dizisine ekle
            this.bulletHoles.push(bulletHole);
            
            // Eğer maksimum sayıyı aşarsak en eskiyi kaldır
            if (this.bulletHoles.length > this.maxBulletHoles) {
                const oldest = this.bulletHoles.shift();
                this.scene.remove(oldest);
                if (oldest.geometry) oldest.geometry.dispose();
                if (oldest.material) oldest.material.dispose();
            }
        }
    }
    
    createBloodSplatter(position, direction) {
        // Kan parçacıkları oluştur
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
        // Patlama ışığı oluştur
        const light = new THREE.PointLight(0xff5500, 5, 10 * size);
        light.position.copy(position);
        this.scene.add(light);
        
        // Işığı azaltıp kaldır
        const startTime = Date.now();
        const duration = 1000; // 1 saniye
        
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
        
        // Patlama parçacıkları oluştur
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
        
        // Duman parçacıkları oluştur
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
        
        // Bir parçacık sistemi oluştur
        const particleSystem = {
            particles: [],
            startTime: Date.now(),
            lifetime: lifetime * 1000, // Milisaniye cinsinden
            gravity: gravity
        };
        
        // Parçacıklar oluştur
        for (let i = 0; i < count; i++) {
            const particle = new THREE.Mesh(geometry, material.clone());
            
            // Başlangıç konumu ayarla
            particle.position.copy(position);
            
            // Hızınıza biraz rastgelelik ekleyin
            const randomVel = new THREE.Vector3(
                (Math.random() - 0.5) * 2 * velocityRandomness,
                (Math.random() - 0.5) * 2 * velocityRandomness,
                (Math.random() - 0.5) * 2 * velocityRandomness
            );
            
            // Parçacık hızını hesapla
            particle.userData.velocity = velocity.clone().add(randomVel);
            
            // Boyutu ayarla
            particle.scale.set(size, size, size);
            
            // Sahneye ekle
            this.scene.add(particle);
            
            // Sisteme ekle
            particleSystem.particles.push(particle);
        }
        
        // Aktif parçacık sistemlerine ekle
        this.particleSystems.push(particleSystem);
    }
    
    update(deltaTime) {
        // Tüm parçacık sistemlerini güncelle
        for (let i = this.particleSystems.length - 1; i >= 0; i--) {
            const system = this.particleSystems[i];
            const elapsed = Date.now() - system.startTime;
            const life = Math.min(elapsed / system.lifetime, 1);
            
            // Sistemin kaldırılıp kaldırılmayacağını kontrol et
            if (life >= 1) {
                // Tüm parçacıkları kaldır
                system.particles.forEach(particle => {
                    this.scene.remove(particle);
                    if (particle.geometry) particle.geometry.dispose();
                    if (particle.material) particle.material.dispose();
                });
                
                // Sistemi kaldır
                this.particleSystems.splice(i, 1);
                continue;
            }
            
            // Parçacıkları güncelle
            system.particles.forEach(particle => {
                // Parçacıkı hareket ettir
                particle.position.add(
                    particle.userData.velocity.clone().multiplyScalar(deltaTime)
                );
                
                // Yerçekimi etkisini uygula
                if (system.gravity !== 0) {
                    particle.userData.velocity.y -= system.gravity * deltaTime;
                }
                
                // Işını azalt
                if (particle.material.opacity !== undefined) {
                    particle.material.opacity = 1 - life;
                }
                
                // Boyutu azalt
                const scale = 1 - life * 0.5;
                particle.scale.set(scale, scale, scale);
            });
        }
        
        // Diğer efektleri güncelle
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.age += deltaTime;
            
            // Efektin kaldırılıp kaldırılmayacağını kontrol et
            if (effect.age >= effect.lifetime) {
                this.scene.remove(effect.object);
                if (effect.object.material) effect.object.material.dispose();
                if (effect.object.geometry) effect.object.geometry.dispose();
                this.effects.splice(i, 1);
            }
        }
    }
    
    createDefaultImpact(position, normal) {
        // Eğer doküman yüklenmediyse atla
        if (!this.materials.dust) return;
        
        // Normaldan yön al
        const direction = normal.clone();
        
        // Toz parçacıkları oluştur
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
            emitRate: 0, // Hepsini birden yayınla
            burst: true,
            gravity: 2
        });
        
        this.scene.add(system.container);
        this.particleSystems.push(system);
        
        return system;
    }
    
    createMetalImpact(position, normal) {
        // Eğer doküman yüklenmediyse atla
        if (!this.materials.spark) return;
        
        // Normaldan yön al
        const direction = normal.clone();
        
        // Kıvılcım parçacıkları oluştur
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
            emitRate: 0, // Hepsini birden yayınla
            burst: true,
            gravity: 5
        });
        
        this.scene.add(system.container);
        this.particleSystems.push(system);
        
        return system;
    }
    
    createWoodImpact(position, normal) {
        // Eğer doküman yüklenmediyse atla
        if (!this.materials.dust) return;
        
        // Normaldan yön al
        const direction = normal.clone();
        
        // Odun kırıntıları parçacıkları oluştur
        const system = new ParticleSystem({
            position: position,
            direction: direction,
            texture: this.materials.dust,
            particleCount: 20,
            particleSize: { min: 0.02, max: 0.06 },
            lifetime: { min: 0.3, max: 1.2 },
            velocity: { min: 0.8, max: 3.0 },
            color: new THREE.Color(0x8b4513), // Koyu renk
            opacity: { start: 0.8, end: 0 },
            scale: { start: 0.5, end: 1.5 },
            blending: THREE.NormalBlending,
            spread: 0.6,
            emitRate: 0, // Hepsini birden yayınla
            burst: true,
            gravity: 4
        });
        
        this.scene.add(system.container);
        this.particleSystems.push(system);
        
        return system;
    }
    
    createConcreteImpact(position, normal) {
        // Eğer doküman yüklenmediyse atla
        if (!this.materials.dust) return;
        
        // Normaldan yön al
        const direction = normal.clone();
        
        // Beton toz parçacıkları oluştur
        const system = new ParticleSystem({
            position: position,
            direction: direction,
            texture: this.materials.dust,
            particleCount: 25,
            particleSize: { min: 0.02, max: 0.1 },
            lifetime: { min: 0.5, max: 1.5 },
            velocity: { min: 0.5, max: 2.5 },
            color: new THREE.Color(0xaaaaaa), // Gri renk
            opacity: { start: 0.9, end: 0 },
            scale: { start: 0.5, end: 2.0 },
            blending: THREE.NormalBlending,
            spread: 0.5,
            emitRate: 0, // Hepsini birden yayınla
            burst: true,
            gravity: 3
        });
        
        this.scene.add(system.container);
        this.particleSystems.push(system);
        
        return system;
    }
    
    createBloodEffect(position, normal) {
        // Eğer doküman yüklenmediyse atla
        if (!this.materials.blood) return;
        
        // Normaldan yön al
        const direction = normal.clone();
        
        // Kan parçacıkları oluştur
        const system = new ParticleSystem({
            position: position,
            direction: direction,
            texture: this.materials.blood,
            particleCount: 15,
            particleSize: { min: 0.03, max: 0.12 },
            lifetime: { min: 0.3, max: 1.0 },
            velocity: { min: 0.5, max: 2.0 },
            color: new THREE.Color(0x8a0303), // Koyu kırmızı
            opacity: { start: 0.9, end: 0 },
            scale: { start: 0.5, end: 1.5 },
            blending: THREE.NormalBlending,
            spread: 0.7,
            emitRate: 0, // Hepsini birden yayınla
            burst: true,
            gravity: 3
        });
        
        this.scene.add(system.container);
        this.particleSystems.push(system);
        
        // Yüzeye kan dök
        this.createBloodSplatter(position, normal);
        
        return system;
    }
    
    clearAll() {
        // Tüm parçacık sistemlerini kaldır
        this.particleSystems.forEach(system => {
            system.particles.forEach(particle => {
                this.scene.remove(particle);
                if (particle.geometry) particle.geometry.dispose();
                if (particle.material) particle.material.dispose();
            });
        });
        this.particleSystems = [];
        
        // Tüm efektleri kaldır
        this.effects.forEach(effect => {
            this.scene.remove(effect.object);
            if (effect.object.material) effect.object.material.dispose();
            if (effect.object.geometry) effect.object.geometry.dispose();
        });
        this.effects = [];
    }
} 