import * as THREE from 'three';
import { AudioListener, Audio, PositionalAudio } from 'three';

export class SoundManager {
    constructor(loadingManager, assetLoader) {
        this.assetLoader = assetLoader;
        
        // Initialize audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Volume settings
        this.masterVolume = 0.3; // Reduced master volume overall
        this.sfxVolume = 0.5;
        this.musicVolume = 0.3;
        this.isGlobalMuted = false;
        
        // Store active sounds
        this.activeSounds = {};
        this.currentMusic = null;
        
        // Create audio listener
        this.listener = new THREE.AudioListener();
        
        console.log("SoundManager initialized");
    }
    
    attachListener(camera) {
        // Attach audio listener to camera
        if (camera && !camera.children.includes(this.listener)) {
            camera.add(this.listener);
        }
    }
    
    playSound(soundName, volume = 0.5) {
        // Skip if muted
        if (this.isGlobalMuted) return null;
        
        try {
            // Use a lower base volume for all sounds
            const reducedVolume = volume * this.sfxVolume * this.masterVolume;
            
            // Get sound buffer from assetLoader
            const buffer = this.assetLoader.getSound(soundName);
            if (!buffer) {
                console.warn(`Sound not found: ${soundName}`);
                return null;
            }
            
            // Create audio source
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = reducedVolume;
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Play sound
            source.start(0);
            
            // Keep track of active sounds for cleanup
            const id = Date.now().toString();
            this.activeSounds[id] = {
                source,
                gainNode,
                volume: reducedVolume
            };
            
            // Remove from active sounds when finished
            source.onended = () => {
                delete this.activeSounds[id];
            };
            
            return id;
        } catch (error) {
            console.error("Error playing sound:", error);
            return null;
        }
    }
    
    playPositionalSound(name, position, volume = 1.0, loop = false, refDistance = 5, maxDistance = 50) {
        // Skip if muted
        if (this.isGlobalMuted) return null;
        
        try {
            // Get buffer from asset loader
            const buffer = this.assetLoader.getSound(name);
            
            if (!buffer) {
                console.warn(`Sound not found: ${name}`);
                return null;
            }
            
            // Create positional audio object
            const sound = new PositionalAudio(this.listener);
            sound.setBuffer(buffer);
            sound.setVolume(volume * this.sfxVolume * this.masterVolume);
            sound.setRefDistance(refDistance);
            sound.setMaxDistance(maxDistance);
            sound.setLoop(loop);
            
            // Create dummy object to hold the positional audio
            const soundObj = new THREE.Object3D();
            soundObj.position.copy(position);
            soundObj.add(sound);
            
            // Add to scene - This would need to be done externally with the returned object
            
            // Store active sound
            this.activeSounds.push(sound);
            
            // Cleanup when sound is finished
            sound.onEnded = () => {
                const index = this.activeSounds.indexOf(sound);
                if (index !== -1) {
                    this.activeSounds.splice(index, 1);
                }
            };
            
            // Play sound
            sound.play();
            
            // Return the sound object
            return { sound, object: soundObj };
        } catch (error) {
            console.error(`Error playing positional sound ${name}:`, error);
            return null;
        }
    }
    
    playMusic(musicName, volume = 0.3) {
        // Skip if muted
        if (this.isGlobalMuted) return false;
        
        try {
            // Use an even lower volume for music
            const reducedVolume = volume * this.musicVolume * this.masterVolume;
            
            // Stop any existing music
            this.stopMusic();
            
            // Get music buffer from assetLoader
            const buffer = this.assetLoader.getSound(musicName);
            if (!buffer) {
                console.warn(`Music not found: ${musicName}`);
                return false;
            }
            
            // Create audio source
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            
            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = reducedVolume;
            
            // Connect nodes
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Play music
            source.start(0);
            
            // Store current music
            this.currentMusic = {
                source,
                gainNode,
                volume: reducedVolume
            };
            
            return true;
        } catch (error) {
            console.error("Error playing music:", error);
            return false;
        }
    }
    
    stopMusic() {
        if (this.currentMusic) {
            try {
                this.currentMusic.source.stop();
            } catch (e) {
                // Ignore errors from already stopped sounds
            }
            this.currentMusic = null;
        }
    }
    
    pauseMusic() {
        if (this.currentMusic && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
    }
    
    resumeMusic() {
        if (this.currentMusic && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    stopAllSounds() {
        // Stop all active sounds
        Object.values(this.activeSounds).forEach(sound => {
            try {
                sound.source.stop();
            } catch (e) {
                // Ignore errors from already stopped sounds
            }
        });
        
        this.activeSounds = {};
        
        // Stop music
        this.stopMusic();
    }
    
    pauseAll() {
        if (this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
    }
    
    resumeAll() {
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }
    
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        this.updateAllVolumes();
    }
    
    updateAllVolumes() {
        // Update volume for all active sounds
        Object.values(this.activeSounds).forEach(sound => {
            sound.gainNode.gain.value = sound.volume * this.sfxVolume * this.masterVolume;
        });
        
        // Update music volume
        if (this.currentMusic) {
            this.currentMusic.gainNode.gain.value = this.currentMusic.volume * this.musicVolume * this.masterVolume;
        }
    }
    
    mute() {
        this.isGlobalMuted = true;
        this.pauseAll();
    }
    
    unmute() {
        this.isGlobalMuted = false;
        this.resumeAll();
    }
    
    toggleMute() {
        if (this.isGlobalMuted) {
            this.unmute();
        } else {
            this.mute();
        }
        return this.isGlobalMuted;
    }
    
    update() {
        // Clean up completed sounds
        this.activeSounds = this.activeSounds.filter(sound => sound.isPlaying);
    }
} 