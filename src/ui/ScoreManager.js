// Score Manager for the FPS game

export class ScoreManager {
    constructor() {
        this.score = 0;
        this.highScore = this.loadHighScore();
        
        // Bonus multipliers
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;
        this.comboTimeout = 3; // seconds
        
        // UI element for score display (can be created later)
        this.scoreElement = null;
        this.createScoreDisplay();
    }
    
    createScoreDisplay() {
        // Create score display if it doesn't exist yet
        if (!document.getElementById('score-display')) {
            const scoreDisplay = document.createElement('div');
            scoreDisplay.id = 'score-display';
            scoreDisplay.style.position = 'absolute';
            scoreDisplay.style.top = '20px';
            scoreDisplay.style.right = '20px';
            scoreDisplay.style.color = 'white';
            scoreDisplay.style.fontFamily = 'monospace';
            scoreDisplay.style.fontSize = '24px';
            scoreDisplay.style.padding = '5px';
            scoreDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            scoreDisplay.style.borderRadius = '5px';
            
            document.getElementById('ui-container').appendChild(scoreDisplay);
            this.scoreElement = scoreDisplay;
            
            // Initial score display
            this.updateScoreDisplay();
        }
    }
    
    addScore(points, type = 'normal') {
        // Apply multipliers based on type
        let multiplier = 1;
        
        switch (type) {
            case 'headshot':
                multiplier = 2.5;
                break;
            case 'longshot':
                multiplier = 1.5;
                break;
            case 'combo':
                // Combo increases multiplier
                this.combo++;
                this.comboTimer = 0;
                if (this.combo > this.maxCombo) {
                    this.maxCombo = this.combo;
                }
                multiplier = 1 + (this.combo * 0.1);
                break;
            default:
                // Regular score
                multiplier = 1;
        }
        
        // Add score
        const scoreAdded = Math.round(points * multiplier);
        this.score += scoreAdded;
        
        // Update UI
        this.updateScoreDisplay();
        
        // Check for high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveHighScore();
        }
        
        return scoreAdded;
    }
    
    updateCombo(deltaTime) {
        // Update combo timer
        if (this.combo > 0) {
            this.comboTimer += deltaTime;
            
            // Reset combo if timeout
            if (this.comboTimer >= this.comboTimeout) {
                this.combo = 0;
                this.comboTimer = 0;
                this.updateScoreDisplay();
            }
        }
    }
    
    updateScoreDisplay() {
        if (this.scoreElement) {
            let displayText = `SCORE: ${this.score}`;
            
            // Show combo if active
            if (this.combo > 1) {
                displayText += `<br>COMBO: x${this.combo}`;
            }
            
            this.scoreElement.innerHTML = displayText;
        }
    }
    
    resetScore() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboTimer = 0;
        this.updateScoreDisplay();
    }
    
    getScore() {
        return this.score;
    }
    
    getHighScore() {
        return this.highScore;
    }
    
    getCombo() {
        return this.combo;
    }
    
    getMaxCombo() {
        return this.maxCombo;
    }
    
    loadHighScore() {
        const savedScore = localStorage.getItem('fps_highscore');
        return savedScore ? parseInt(savedScore) : 0;
    }
    
    saveHighScore() {
        localStorage.setItem('fps_highscore', this.highScore.toString());
    }
    
    update(deltaTime) {
        // Update combo timer
        this.updateCombo(deltaTime);
    }
} 