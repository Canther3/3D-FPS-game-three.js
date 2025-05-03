export function setupEventListeners(game) {
    // Set up pointer lock for mouse control
    setupPointerLock(game);
    
    // Set up keyboard controls
    setupKeyboardControls(game);
    
    // Set up mouse controls
    setupMouseControls(game);
    
    // Window resize event
    window.addEventListener('resize', () => {
        game.resize();
    });
}

function setupPointerLock(game) {
    const canvas = game.renderer.domElement;
    
    // Request pointer lock when clicking on canvas
    canvas.addEventListener('click', () => {
        if (!document.pointerLockElement) {
            canvas.requestPointerLock();
            
            // Resume game if it was paused
            if (game.isPaused) {
                game.resume();
            }
        }
    });
    
    // Handle pointer lock change
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            // Pointer is locked, game is running
            game.isPaused = false;
        } else {
            // Pointer is unlocked, pause game
            game.pause();
        }
    });
    
    // Handle pointer lock error
    document.addEventListener('pointerlockerror', () => {
        console.error('Pointer lock error');
    });
}

function setupKeyboardControls(game) {
    // Key down event
    document.addEventListener('keydown', (event) => {
        handleKeyEvent(event, game, true);
    });
    
    // Key up event
    document.addEventListener('keyup', (event) => {
        handleKeyEvent(event, game, false);
    });
}

function handleKeyEvent(event, game, isDown) {
    // Skip if game is not running
    if (!game.isRunning) return;
    
    // Skip if game is paused and not resuming
    if (game.isPaused && isDown && event.code !== 'Escape') return;
    
    switch (event.code) {
        // Movement keys
        case 'KeyW':
            game.player.setMovementKey('forward', isDown);
            break;
        case 'KeyS':
            game.player.setMovementKey('backward', isDown);
            break;
        case 'KeyA':
            game.player.setMovementKey('left', isDown);
            break;
        case 'KeyD':
            game.player.setMovementKey('right', isDown);
            break;
        case 'Space':
            game.player.setMovementKey('jump', isDown);
            break;
        case 'ShiftLeft':
            game.player.setMovementKey('run', isDown);
            break;
        case 'ControlLeft':
            game.player.setMovementKey('crouch', isDown);
            break;
            
        // Weapon switching
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
            if (isDown) {
                const weaponIndex = parseInt(event.code.replace('Digit', '')) - 1;
                game.weaponManager.switchWeapon(weaponIndex);
            }
            break;
            
        // Reload
        case 'KeyR':
            if (isDown) {
                game.weaponManager.reload();
            }
            break;
            
        // Pause/Resume
        case 'Escape':
            if (isDown) {
                if (game.isPaused) {
                    game.resume();
                    // Request pointer lock again
                    game.renderer.domElement.requestPointerLock();
                } else {
                    game.pause();
                    // Exit pointer lock
                    document.exitPointerLock();
                }
            }
            break;
            
        // Debug keys (can be removed in production)
        case 'KeyP':
            if (isDown) {
                console.log('Player position:', game.player.getPosition());
            }
            break;
    }
    
    // Prevent default actions for game keys
    if ([
        'KeyW', 'KeyS', 'KeyA', 'KeyD', 
        'Space', 'ShiftLeft', 'ControlLeft',
        'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5',
        'KeyR', 'Escape', 'KeyP'
    ].includes(event.code)) {
        event.preventDefault();
    }
}

function setupMouseControls(game) {
    const canvas = game.renderer.domElement;
    
    // Mouse move event for looking around
    document.addEventListener('mousemove', (event) => {
        // Only handle mouse move if pointer is locked
        if (document.pointerLockElement === canvas) {
            game.player.handleMouseMove(event);
        }
    });
    
    // Mouse down event for shooting
    canvas.addEventListener('mousedown', (event) => {
        // Only handle mouse if pointer is locked
        if (document.pointerLockElement === canvas) {
            // Left click for primary fire
            if (event.button === 0) {
                game.weaponManager.startFiring();
            }
            // Right click for secondary fire or aim
            else if (event.button === 2) {
                game.weaponManager.startAiming();
            }
        }
    });
    
    // Mouse up event for stop shooting
    canvas.addEventListener('mouseup', (event) => {
        // Fare tuşu bırakıldığında, hemen fonksiyonu çağır
        // Left click for primary fire
        if (event.button === 0) {
            game.weaponManager.stopFiring();
            console.log("Mouse left button released - stopFiring called");
        }
        // Right click for secondary fire or aim
        else if (event.button === 2) {
            game.weaponManager.stopAiming();
            console.log("Mouse right button released - stopAiming called");
        }
    });
    
    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });
    
    // Mouse wheel for weapon switching
    canvas.addEventListener('wheel', (event) => {
        // Only handle wheel if pointer is locked
        if (document.pointerLockElement === canvas) {
            const direction = event.deltaY > 0 ? 1 : -1;
            game.weaponManager.cycleWeapon(direction);
            event.preventDefault();
        }
    });
    
    // Fare düğmesi basılıyken pencereden çıkılırsa
    document.addEventListener('mouseout', (event) => {
        // Fare düğmesi pencere dışına çıkarsa ateşi durdur
        if (event.relatedTarget === null) {
            game.weaponManager.stopFiring();
            game.weaponManager.stopAiming();
        }
    });
} 