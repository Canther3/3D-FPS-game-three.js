import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three';
import { Game } from './core/Game.js';
import { SoundManager } from './audio/SoundManager.js';
import { AssetLoader } from './utils/AssetLoader.js';
import { UIManager } from './ui/UIManager.js';

// Global değişkenler
let game;
let assetLoader;
let soundManager;
let loadingManager;
let controls;
let isPointerLocked = false;
let uiManager;

// Yükleme yöneticisini başlat
loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = (itemsLoaded / itemsTotal) * 100;
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
        loadingBar.style.width = progress + '%';
    }
    console.log(`Yükleme ilerlemesi: ${Math.round(progress)}%`);
};

loadingManager.onLoad = () => {
    // Yükleme ekranını gizle
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    // Başlamak için tıkla ekranını göster
    showStartOverlay();
};

loadingManager.onError = (url) => {
    console.warn(`Varlık yüklenemedi: ${url} - Bu kritik değil, oyun yedek varlıkları kullanacak.`);
};

// Fare kilidini etkinleştirmek için kullanıcının tıklamasını bekleyen bir ekran göster
function showStartOverlay() {
    // Önce varolan ekranı kaldır
    const existingOverlay = document.getElementById('start-overlay');
    if (existingOverlay) {
        document.body.removeChild(existingOverlay);
    }

    const overlay = document.createElement('div');
    overlay.id = 'start-overlay';
    overlay.style.position = 'absolute';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000'; // Üstte olması için çok yüksek z-index
    overlay.style.textAlign = 'center';
    overlay.style.cursor = 'pointer';
    overlay.style.fontFamily = 'Arial, sans-serif';
    
    overlay.innerHTML = `
        <h1>FPS OYUNU</h1>
        <p>Oynamak için tıklayın</p>
        <p style="font-size: 14px">ESC tuşu ile fare kilidini kapatabilirsiniz</p>
    `;
    
    document.body.appendChild(overlay);
    
    // Oyunu başlatmak için tıkla
    overlay.addEventListener('click', () => {
        // Oyunu başlat ve fare kilidini etkinleştir
        startGame();
        requestPointerLock();
        // Tıklamadan sonra ekranı kaldır - gerçekten kaldırıldığından emin ol
        if (overlay.parentNode) {
            document.body.removeChild(overlay);
        }
    });
}

// Oyun duraklatıldığında duraklama ekranını göster
function showPausedOverlay() {
    // Önce varolan ekranı kaldır
    const existingOverlay = document.getElementById('pause-overlay');
    if (existingOverlay) {
        document.body.removeChild(existingOverlay);
    }

    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.style.position = 'absolute';
    pauseOverlay.style.width = '100%';
    pauseOverlay.style.height = '100%';
    pauseOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    pauseOverlay.style.color = 'white';
    pauseOverlay.style.display = 'flex';
    pauseOverlay.style.flexDirection = 'column';
    pauseOverlay.style.justifyContent = 'center';
    pauseOverlay.style.alignItems = 'center';
    pauseOverlay.style.zIndex = '10000'; // Üstte olması için çok yüksek z-index
    pauseOverlay.style.cursor = 'pointer';
    pauseOverlay.style.fontFamily = 'Arial, sans-serif';
    
    pauseOverlay.innerHTML = `
        <h1>OYUN DURAKLATILDI</h1>
        <p>Devam etmek için tıklayın</p>
    `;
    
    document.body.appendChild(pauseOverlay);
    
    // Devam etmek için tıkla
    pauseOverlay.addEventListener('click', () => {
        requestPointerLock();
        if (pauseOverlay.parentNode) {
            pauseOverlay.remove();
        }
        if (game) {
            game.resume();
        }
    });
}

// Fare kilidi iste
function requestPointerLock() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
        canvas.requestPointerLock = canvas.requestPointerLock ||
                                    canvas.mozRequestPointerLock ||
                                    canvas.webkitRequestPointerLock;
        canvas.requestPointerLock();
    }
}

// Fare kilidi olay dinleyicilerini ayarla
function setupPointerLock() {
    // Fare kilidi değişim olayı
    document.addEventListener('pointerlockchange', pointerLockChange, false);
    document.addEventListener('mozpointerlockchange', pointerLockChange, false);
    document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
    
    // Fare kilidi hata olayı
    document.addEventListener('pointerlockerror', pointerLockError, false);
    document.addEventListener('mozpointerlockerror', pointerLockError, false);
    document.addEventListener('webkitpointerlockerror', pointerLockError, false);
    
    // Fare kilidi için ilk tıklama
    document.addEventListener('click', function(event) {
        if (!isPointerLocked) {
            const canvas = document.querySelector('canvas');
            if (canvas && event.target === canvas) {
                requestPointerLock();
            }
        }
    });
}

// Fare kilidi değişimini işle
function pointerLockChange() {
    const canvas = document.querySelector('canvas');
    if (document.pointerLockElement === canvas ||
        document.mozPointerLockElement === canvas ||
        document.webkitPointerLockElement === canvas) {
        
        console.log('Fare kilidi aktif');
        isPointerLocked = true;
        
        // Kamera kontrolü için fare hareketini etkinleştir
        document.addEventListener('mousemove', onMouseMove, false);
        
        // Eğer oyun duraklatılmışsa, devam ettir
        if (game && game.isPaused) {
            try {
                game.resume();
                console.log('Oyun başarıyla devam ediyor');
            } catch (error) {
                console.error('Oyun devam ederken hata:', error);
                // Devam etme başarısız olursa oyunu yenile
                location.reload();
            }
        }
        
        // Duraklama ekranını kaldır (varsa)
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay) {
            pauseOverlay.remove();
        }
    } else {
        console.log('Fare kilidi devre dışı');
        isPointerLocked = false;
        
        // Kamera kontrolü için fare hareketini devre dışı bırak
        document.removeEventListener('mousemove', onMouseMove, false);
        
        // Oyunu duraklat
        if (game && !game.isPaused && game.isRunning) {
            try {
                game.pause();
                console.log('Oyun başarıyla duraklatıldı');
            } catch (error) {
                console.error('Oyun duraklatılırken hata:', error);
            }
            showPausedOverlay();
        }
    }
}

// Fare kilidi hatalarını işle
function pointerLockError() {
    console.error('Fare kilidi hatası');
}

// Fare hareketini işle
function onMouseMove(event) {
    if (isPointerLocked && game && game.player) {
        game.player.handleMouseMove(event);
    }
}

// Klavye kontrollerini ayarla
function setupKeyboardControls() {
    document.addEventListener('keydown', (event) => {
        if (!game || !game.player) return;
        
        switch (event.code) {
            case 'KeyW':
                game.player.setMovementKey('forward', true);
                break;
            case 'KeyS':
                game.player.setMovementKey('backward', true);
                break;
            case 'KeyA':
                game.player.setMovementKey('left', true);
                break;
            case 'KeyD':
                game.player.setMovementKey('right', true);
                break;
            case 'Space':
                game.player.setMovementKey('jump', true);
                break;
            case 'ShiftLeft':
                game.player.setMovementKey('run', true);
                break;
            case 'KeyR':
                if (game.weaponManager) {
                    game.weaponManager.reload();
                }
                break;
            case 'Digit1':
                if (game.weaponManager) {
                    game.weaponManager.equipWeapon('pistol');
                }
                break;
            case 'Digit2':
                if (game.weaponManager) {
                    game.weaponManager.equipWeapon('rifle');
                }
                break;
            case 'Digit3':
                if (game.weaponManager) {
                    game.weaponManager.equipWeapon('shotgun');
                }
                break;
        }
    });
    
    document.addEventListener('keyup', (event) => {
        if (!game || !game.player) return;
        
        switch (event.code) {
            case 'KeyW':
                game.player.setMovementKey('forward', false);
                break;
            case 'KeyS':
                game.player.setMovementKey('backward', false);
                break;
            case 'KeyA':
                game.player.setMovementKey('left', false);
                break;
            case 'KeyD':
                game.player.setMovementKey('right', false);
                break;
            case 'Space':
                game.player.setMovementKey('jump', false);
                break;
            case 'ShiftLeft':
                game.player.setMovementKey('run', false);
                break;
        }
    });
    
    // Mouse button events for shooting
    document.addEventListener('mousedown', (event) => {
        if (isPointerLocked && game && game.weaponManager) {
            if (event.button === 0) { // Left mouse button
                console.log("Mouse down - starting firing");
                game.weaponManager.startFiring();
            }
        }
    });
    
    document.addEventListener('mouseup', (event) => {
        if (game && game.weaponManager) {
            if (event.button === 0) { // Left mouse button
                console.log("Mouse up - stopping firing");
                game.weaponManager.stopFiring();
            }
        }
    });
    
    // Right click for aiming
    document.addEventListener('contextmenu', (event) => {
        // Prevent default right-click menu
        event.preventDefault();
        
        if (isPointerLocked && game && game.weaponManager) {
            // Toggle aiming
            if (game.weaponManager.isAiming) {
                game.weaponManager.stopAiming();
            } else {
                game.weaponManager.startAiming();
            }
        }
    });
}

// Initialize the game
async function init() {
    console.log("Initializing game...");
    
    // Show loading screen
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
    
    // Add verbose logging to help debug asset loading
    console.log("**** FPS GAME INITIALIZATION START ****");
    console.log("Current URL:", window.location.href);
    console.log("Asset paths should be relative to:", window.location.origin + window.location.pathname);
    
    try {
        // Create asset loader with loading manager
        assetLoader = new AssetLoader(loadingManager);
        window.gameAssetLoader = assetLoader; // Make it globally accessible
        
        // Initialize sound manager with asset loader
        soundManager = new SoundManager(loadingManager, assetLoader);
        
        // Setup pointer lock and keyboard controls
        setupPointerLock();
        setupKeyboardControls();
        
        // Preload assets
        console.log("***** ASSET PRELOADING STARTING *****");
        await assetLoader.preloadAssets();
        
        console.log("***** ASSET PRELOADING COMPLETE *****");
        console.log("Assets loaded successfully (some may be using fallbacks)");
        
        // Signal loading manager that loading is complete
        loadingManager.onLoad();
    } catch (error) {
        console.error("Error initializing game:", error);
        console.log("Attempting to start game with fallback assets...");
        showStartOverlay();
    }
}

// Start the game
function startGame() {
    try {
        // Create the game
        game = new Game(soundManager, assetLoader);
        
        // Activate pointer lock immediately to enable controls
        requestPointerLock();
        
        // Start the game loop
        game.start();
        
        // Hide the start overlay
        const startOverlay = document.getElementById('start-overlay');
        if (startOverlay) {
            startOverlay.remove();
        }
        
        console.log('Game started successfully');
        
        // Create a crosshair in the center of the screen
        createCrosshair();
        
        game.isRunning = true;
    } catch (error) {
        console.error('Error starting game:', error);
        displayErrorScreen('Oyun başlatılamadı. Lütfen sayfayı yenileyin ve tekrar deneyin.');
    }
}

// Display error screen
function displayErrorScreen(message) {
    // Remove loading screen if it exists
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.color = 'white';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.fontFamily = 'Arial, sans-serif';
    errorDiv.style.zIndex = '1000';
    
    errorDiv.innerHTML = `
        <h1>Error</h1>
        <p>${message}</p>
        <p>Please check that you have created all required asset directories:</p>
        <ul style="text-align: left;">
            <li>textures/effects/</li>
            <li>textures/floor/</li>
            <li>textures/walls/</li>
            <li>textures/ui/</li>
            <li>models/weapons/</li>
            <li>models/enemies/</li>
            <li>audio/weapons/</li>
            <li>audio/footsteps/</li>
            <li>audio/player/</li>
            <li>audio/enemies/</li>
            <li>audio/impacts/</li>
            <li>audio/ui/</li>
            <li>audio/ambient/</li>
        </ul>
        <button id="retry-button" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; cursor: pointer;">
            Retry
        </button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Add retry button functionality
    document.getElementById('retry-button').addEventListener('click', () => {
        location.reload();
    });
}

// Create a crosshair element
function createCrosshair() {
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    crosshair.style.position = 'absolute';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.width = '20px';
    crosshair.style.height = '20px';
    crosshair.style.backgroundColor = 'transparent';
    crosshair.style.zIndex = '100';
    crosshair.style.pointerEvents = 'none';
    
    crosshair.innerHTML = `
        <div style="position: absolute; width: 2px; height: 10px; background-color: white; left: 9px; top: 5px;"></div>
        <div style="position: absolute; width: 10px; height: 2px; background-color: white; left: 5px; top: 9px;"></div>
    `;
    
    document.body.appendChild(crosshair);
}

// Call init to start the loading process
init();

// Create crosshair
createCrosshair();

// Initialize UI manager and make it accessible globally
uiManager = new UIManager(game);
window.uiManager = uiManager; 