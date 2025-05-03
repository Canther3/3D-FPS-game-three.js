// Basic UI Manager for the FPS game

export class UIManager {
    constructor(game) {
        this.game = game;
        console.log("Initializing UI Manager");
        
        // Setup UI elements
        this.setupHealthBar();
        this.setupAmmoDisplay();
        this.setupCrosshair();
    }
    
    setupHealthBar() {
        // Health bar is already in HTML
        const healthBar = document.getElementById('health-indicator');
        
        // Make sure it's initially full
        if (healthBar) {
            healthBar.style.width = '100%';
        }
    }
    
    setupAmmoDisplay() {
        // Ammo display is already in HTML
        const ammoDisplay = document.getElementById('ammo-display');
        
        // Initialize with default text
        if (ammoDisplay) {
            ammoDisplay.textContent = '30/90';
        }
    }
    
    setupCrosshair() {
        // Crosshair is already in HTML
        const crosshair = document.getElementById('crosshair');
        
        // Make sure it's visible
        if (crosshair) {
            crosshair.style.display = 'block';
        }
    }
    
    updateAmmoDisplay(current, total) {
        const ammoDisplay = document.getElementById('ammo-display');
        if (ammoDisplay) {
            ammoDisplay.textContent = `${current}/${total}`;
        }
    }
    
    updateHealthBar(currentHealth, maxHealth) {
        const healthIndicator = document.getElementById('health-indicator');
        if (healthIndicator) {
            const healthPercent = (currentHealth / maxHealth) * 100;
            healthIndicator.style.width = `${healthPercent}%`;
        }
    }
    
    showGameOverScreen() {
        // Create game over screen if it doesn't exist
        let gameOverScreen = document.getElementById('game-over-screen');
        
        if (!gameOverScreen) {
            gameOverScreen = document.createElement('div');
            gameOverScreen.id = 'game-over-screen';
            gameOverScreen.style.position = 'absolute';
            gameOverScreen.style.top = '0';
            gameOverScreen.style.left = '0';
            gameOverScreen.style.width = '100%';
            gameOverScreen.style.height = '100%';
            gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            gameOverScreen.style.display = 'flex';
            gameOverScreen.style.flexDirection = 'column';
            gameOverScreen.style.justifyContent = 'center';
            gameOverScreen.style.alignItems = 'center';
            gameOverScreen.style.color = 'white';
            gameOverScreen.style.fontFamily = 'Arial, sans-serif';
            gameOverScreen.style.zIndex = '1000';
            
            const title = document.createElement('h1');
            title.textContent = 'GAME OVER';
            title.style.fontSize = '48px';
            title.style.marginBottom = '20px';
            
            const restartButton = document.createElement('button');
            restartButton.textContent = 'Restart Level';
            restartButton.style.padding = '10px 20px';
            restartButton.style.fontSize = '18px';
            restartButton.style.backgroundColor = '#4CAF50';
            restartButton.style.border = 'none';
            restartButton.style.borderRadius = '5px';
            restartButton.style.cursor = 'pointer';
            restartButton.style.marginTop = '20px';
            restartButton.onclick = () => {
                // Will be connected to the game's restart function
                if (this.game) {
                    this.game.restartLevel();
                    this.hideGameOverScreen();
                }
            };
            
            gameOverScreen.appendChild(title);
            gameOverScreen.appendChild(restartButton);
            document.body.appendChild(gameOverScreen);
        }
        
        gameOverScreen.style.display = 'flex';
    }
    
    hideGameOverScreen() {
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.style.display = 'none';
        }
    }
    
    showLevelComplete(levelNumber, score) {
        let levelCompleteScreen = document.getElementById('level-complete-screen');
        
        if (!levelCompleteScreen) {
            levelCompleteScreen = document.createElement('div');
            levelCompleteScreen.id = 'level-complete-screen';
            levelCompleteScreen.style.position = 'absolute';
            levelCompleteScreen.style.top = '0';
            levelCompleteScreen.style.left = '0';
            levelCompleteScreen.style.width = '100%';
            levelCompleteScreen.style.height = '100%';
            levelCompleteScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            levelCompleteScreen.style.display = 'flex';
            levelCompleteScreen.style.flexDirection = 'column';
            levelCompleteScreen.style.justifyContent = 'center';
            levelCompleteScreen.style.alignItems = 'center';
            levelCompleteScreen.style.color = 'white';
            levelCompleteScreen.style.fontFamily = 'Arial, sans-serif';
            levelCompleteScreen.style.zIndex = '1000';
            
            document.body.appendChild(levelCompleteScreen);
        } else {
            // Clear existing content
            levelCompleteScreen.innerHTML = '';
        }
        
        const title = document.createElement('h1');
        title.textContent = 'LEVEL COMPLETE!';
        title.style.fontSize = '48px';
        title.style.marginBottom = '20px';
        
        const levelInfo = document.createElement('h2');
        levelInfo.textContent = `Level ${levelNumber} Cleared`;
        levelInfo.style.fontSize = '28px';
        levelInfo.style.marginBottom = '10px';
        
        const scoreInfo = document.createElement('h3');
        scoreInfo.textContent = `Score: ${score}`;
        scoreInfo.style.fontSize = '24px';
        scoreInfo.style.marginBottom = '30px';
        
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next Level';
        nextButton.style.padding = '10px 20px';
        nextButton.style.fontSize = '18px';
        nextButton.style.backgroundColor = '#4CAF50';
        nextButton.style.border = 'none';
        nextButton.style.borderRadius = '5px';
        nextButton.style.cursor = 'pointer';
        nextButton.style.marginTop = '20px';
        nextButton.onclick = () => {
            if (this.game) {
                this.game.nextLevel();
                this.hideLevelComplete();
            }
        };
        
        levelCompleteScreen.appendChild(title);
        levelCompleteScreen.appendChild(levelInfo);
        levelCompleteScreen.appendChild(scoreInfo);
        levelCompleteScreen.appendChild(nextButton);
        
        levelCompleteScreen.style.display = 'flex';
    }
    
    hideLevelComplete() {
        const levelCompleteScreen = document.getElementById('level-complete-screen');
        if (levelCompleteScreen) {
            levelCompleteScreen.style.display = 'none';
        }
    }
}

// Keep these functions for backward compatibility
export function initUI() {
    console.log("Initializing UI (Legacy method)");
    setupHealthBar();
    setupAmmoDisplay();
    setupCrosshair();
}

function setupHealthBar() {
    const healthBar = document.getElementById('health-indicator');
    if (healthBar) {
        healthBar.style.width = '100%';
    }
}

function setupAmmoDisplay() {
    const ammoDisplay = document.getElementById('ammo-display');
    if (ammoDisplay) {
        ammoDisplay.textContent = '30/90';
    }
}

function setupCrosshair() {
    const crosshair = document.getElementById('crosshair');
    if (crosshair) {
        crosshair.style.display = 'block';
    }
}

export function updateAmmoDisplay(current, total) {
    const ammoDisplay = document.getElementById('ammo-display');
    if (ammoDisplay) {
        ammoDisplay.textContent = `${current}/${total}`;
    }
}

export function updateHealthBar(currentHealth, maxHealth) {
    const healthIndicator = document.getElementById('health-indicator');
    if (healthIndicator) {
        const healthPercent = (currentHealth / maxHealth) * 100;
        healthIndicator.style.width = `${healthPercent}%`;
    }
}

export function showGameOverScreen() {
    if (window.uiManager) {
        window.uiManager.showGameOverScreen();
    }
}

export function hideGameOverScreen() {
    if (window.uiManager) {
        window.uiManager.hideGameOverScreen();
    }
}

export function showLevelComplete(levelNumber, score) {
    if (window.uiManager) {
        window.uiManager.showLevelComplete(levelNumber, score);
    }
}

export function hideLevelComplete() {
    if (window.uiManager) {
        window.uiManager.hideLevelComplete();
    }
} 