// Replay System for the FPS game
// Records gameplay and allows playback

export class ReplaySystem {
    constructor(game) {
        this.game = game;
        this.isRecording = false;
        this.isPlaying = false;
        this.recordingData = [];
        this.currentFrame = 0;
        this.recordingInterval = 0.05; // seconds between frames
        this.recordingTimer = 0;
        this.maxRecordingLength = 600; // 10 minutes at 60fps
        
        console.log("Replay System initialized");
    }
    
    startRecording() {
        if (this.isPlaying) return;
        
        console.log("Started recording gameplay");
        this.recordingData = [];
        this.isRecording = true;
        this.recordingTimer = 0;
    }
    
    stopRecording() {
        if (!this.isRecording) return;
        
        console.log("Stopped recording gameplay");
        this.isRecording = false;
    }
    
    saveReplay(name = "replay") {
        if (this.recordingData.length === 0) {
            console.log("No replay data to save");
            return false;
        }
        
        // In a real implementation, this would save to file or localStorage
        console.log(`Replay saved with ${this.recordingData.length} frames`);
        
        // Save replay data to localStorage (simplified)
        try {
            const replayData = JSON.stringify({
                name: name,
                date: new Date().toISOString(),
                frames: this.recordingData
            });
            
            localStorage.setItem(`fps_replay_${Date.now()}`, replayData);
            return true;
        } catch (e) {
            console.error("Failed to save replay:", e);
            return false;
        }
    }
    
    loadReplay(replayId) {
        // In a real implementation, this would load from file or localStorage
        try {
            const replayData = localStorage.getItem(replayId);
            if (!replayData) {
                console.log("Replay not found");
                return false;
            }
            
            const replay = JSON.parse(replayData);
            this.recordingData = replay.frames;
            console.log(`Loaded replay with ${this.recordingData.length} frames`);
            return true;
        } catch (e) {
            console.error("Failed to load replay:", e);
            return false;
        }
    }
    
    startPlayback() {
        if (this.recordingData.length === 0) {
            console.log("No replay data to play");
            return false;
        }
        
        console.log("Started replay playback");
        this.isPlaying = true;
        this.currentFrame = 0;
        
        // In a full implementation, this would set up the game to show the replay
        return true;
    }
    
    stopPlayback() {
        if (!this.isPlaying) return;
        
        console.log("Stopped replay playback");
        this.isPlaying = false;
    }
    
    recordFrame() {
        if (!this.isRecording) return;
        
        // Record current game state
        const frame = {
            timestamp: performance.now(),
            playerPosition: this.game.player.getPosition(),
            playerRotation: this.game.camera.rotation.clone(),
            enemies: this.game.enemyManager.getEnemyStates(),
            // Other relevant state to record
        };
        
        this.recordingData.push(frame);
        
        // Limit recording length by removing oldest frames if needed
        if (this.recordingData.length > this.maxRecordingLength) {
            this.recordingData.shift();
        }
    }
    
    playFrame() {
        if (!this.isPlaying || this.recordingData.length === 0) return;
        
        // Get current frame data
        const frame = this.recordingData[this.currentFrame];
        
        // Apply frame data to game (simplified)
        // This would position the camera, show enemies, etc.
        
        // Move to next frame
        this.currentFrame++;
        
        // Loop or stop at end
        if (this.currentFrame >= this.recordingData.length) {
            this.currentFrame = 0;
            // Optionally stop playback
            // this.stopPlayback();
        }
    }
    
    update(deltaTime) {
        // Handle recording
        if (this.isRecording) {
            this.recordingTimer += deltaTime;
            
            // Record at specified interval
            if (this.recordingTimer >= this.recordingInterval) {
                this.recordingTimer = 0;
                this.recordFrame();
            }
        }
        
        // Handle playback
        if (this.isPlaying) {
            this.playFrame();
        }
    }
} 