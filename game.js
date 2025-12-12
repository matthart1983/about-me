/**
 * Fact Finder - A minimalist platformer game
 * Learn about Matthew Hartley by collecting fact orbs
 */

(function() {
    'use strict';

    // ==========================================================================
    // Configuration Constants
    // ==========================================================================
    const CONFIG = {
        CANVAS_WIDTH: 800,
        CANVAS_HEIGHT: 400,
        TARGET_FPS: 60,
        FRICTION: 0.85,
        PLAYER_WIDTH: 32,
        PLAYER_HEIGHT: 40,
        ORB_RADIUS: 16,
        ORB_PULSE_SPEED: 0.05,
        CAMERA_SMOOTHING: 0.1,
        CAMERA_LEAD: 100,
        PARALLAX_FACTOR_1: 0.1,
        PARALLAX_FACTOR_2: 0.3,
        PARALLAX_FACTOR_3: 0.5
    };

    // ==========================================================================
    // Game State
    // ==========================================================================
    const state = {
        gameData: null,
        canvas: null,
        ctx: null,
        running: false,
        paused: false,
        muted: false,
        reducedMotion: false,
        audioContext: null,
        time: 0,
        deltaTime: 0,
        lastTime: 0,
        camera: { x: 0, y: 0 },
        player: null,
        platforms: [],
        collectibles: [],
        obstacles: [],
        collectedFacts: [],
        keys: {},
        jumpHeld: false,
        jumpTime: 0,
        gameComplete: false
    };

    // ==========================================================================
    // DOM Elements
    // ==========================================================================
    let elements = {};

    // ==========================================================================
    // Initialization
    // ==========================================================================
    async function init() {
        // Check for reduced motion preference
        state.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Get DOM elements
        elements = {
            canvas: document.getElementById('game-canvas'),
            startOverlay: document.getElementById('game-start-overlay'),
            pauseOverlay: document.getElementById('game-pause-overlay'),
            completeOverlay: document.getElementById('game-complete-overlay'),
            startBtn: document.getElementById('start-game-btn'),
            resumeBtn: document.getElementById('resume-game-btn'),
            replayBtn: document.getElementById('replay-game-btn'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            factPopup: document.getElementById('fact-popup'),
            factText: document.getElementById('fact-text'),
            factCloseBtn: document.getElementById('fact-close-btn'),
            factsSummary: document.getElementById('facts-collected-summary')
        };

        state.canvas = elements.canvas;
        state.ctx = state.canvas.getContext('2d');

        // Load game data
        try {
            const response = await fetch('levels.json');
            state.gameData = await response.json();
        } catch (error) {
            console.error('Failed to load game data:', error);
            // Fallback inline data
            state.gameData = getInlineGameData();
        }

        // Set up event listeners
        setupEventListeners();

        // Initial render
        drawStartScreen();
    }

    function getInlineGameData() {
        // Fallback game data if JSON fails to load
        return {
            facts: [
                { id: 1, text: "Matt is Chief Engineer at Westpac Institutional Bank, leading engineering direction for core platforms." },
                { id: 2, text: "Matt manages technical specialists delivering high-impact initiatives across operations and infrastructure." },
                { id: 3, text: "Expert in systems architecture, risk frameworks, process automation, and performance monitoring." },
                { id: 4, text: "Skilled in AWS/Azure/GCP, CI/CD pipelines, Python, Terraform, and observability stacks." },
                { id: 5, text: "Holds an MBA in Finance (UTS) and B.Eng Software with Honours (Newcastle)." },
                { id: 6, text: "Certified in SAFe 4.0, Professional Scrum Master, PRINCE2, and Java EE Development." }
            ],
            level: {
                width: 3200,
                height: 400,
                gravity: 0.6,
                playerSpeed: 4,
                jumpForce: 12,
                platforms: [
                    { x: 0, y: 360, width: 600, height: 40, type: "ground" },
                    { x: 680, y: 300, width: 120, height: 20, type: "floating" },
                    { x: 850, y: 250, width: 100, height: 20, type: "floating" },
                    { x: 1000, y: 360, width: 400, height: 40, type: "ground" },
                    { x: 1450, y: 300, width: 150, height: 20, type: "floating" },
                    { x: 1650, y: 240, width: 120, height: 20, type: "floating" },
                    { x: 1820, y: 360, width: 500, height: 40, type: "ground" },
                    { x: 2380, y: 280, width: 140, height: 20, type: "floating" },
                    { x: 2570, y: 220, width: 100, height: 20, type: "floating" },
                    { x: 2720, y: 360, width: 480, height: 40, type: "ground" }
                ],
                collectibles: [
                    { x: 400, y: 300, factId: 4 },
                    { x: 900, y: 190, factId: 1 },
                    { x: 1550, y: 240, factId: 2 },
                    { x: 1700, y: 180, factId: 3 },
                    { x: 2420, y: 220, factId: 5 },
                    { x: 2610, y: 160, factId: 6 }
                ],
                obstacles: [
                    { x: 750, y: 330, width: 40, height: 30, type: "spike", movement: "none" },
                    { x: 1200, y: 320, width: 50, height: 40, type: "walker", movement: "horizontal", range: 150, speed: 1.5 },
                    { x: 2000, y: 320, width: 50, height: 40, type: "walker", movement: "horizontal", range: 200, speed: 2 }
                ],
                finishZone: { x: 3000, y: 280, width: 80, height: 80 },
                playerStart: { x: 50, y: 300 }
            },
            colors: {
                player: "#4a7c9b",
                playerOutline: "#3a6178",
                platform: "#2d2d44",
                platformGround: "#3d3d5c",
                orb: "#ffd700",
                orbGlow: "rgba(255, 215, 0, 0.4)",
                obstacle: "#e74c3c",
                finish: "#2ecc71",
                background1: "#1a1a2e",
                background2: "#16213e",
                background3: "#0f3460"
            }
        };
    }

    // ==========================================================================
    // Event Listeners
    // ==========================================================================
    function setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Button events
        elements.startBtn.addEventListener('click', startGame);
        elements.resumeBtn.addEventListener('click', resumeGame);
        elements.replayBtn.addEventListener('click', restartGame);
        elements.factCloseBtn.addEventListener('click', closeFact);

        // Canvas focus
        elements.canvas.addEventListener('click', () => {
            if (state.running && !state.paused) {
                elements.canvas.focus();
            }
        });

        // Visibility change (pause when tab hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && state.running && !state.paused) {
                pauseGame();
            }
        });

        // Window resize
        window.addEventListener('resize', handleResize);
    }

    function handleKeyDown(e) {
        const key = e.key.toLowerCase();
        state.keys[key] = true;

        // Prevent default for game keys
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd'].includes(key)) {
            e.preventDefault();
        }

        // Jump initiation
        if ((key === ' ' || key === 'w' || key === 'arrowup') && !state.jumpHeld) {
            state.jumpHeld = true;
            state.jumpTime = 0;
        }

        // Pause toggle
        if (key === 'p' && state.running) {
            if (state.paused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }

        // Mute toggle
        if (key === 'm') {
            state.muted = !state.muted;
        }

        // Close fact popup with Enter/E
        if ((key === 'enter' || key === 'e') && !elements.factPopup.classList.contains('hidden')) {
            closeFact();
        }
    }

    function handleKeyUp(e) {
        const key = e.key.toLowerCase();
        state.keys[key] = false;

        // Jump release
        if (key === ' ' || key === 'w' || key === 'arrowup') {
            state.jumpHeld = false;
        }
    }

    function handleResize() {
        // Maintain aspect ratio
        const container = elements.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const scale = Math.min(1, containerWidth / CONFIG.CANVAS_WIDTH);

        elements.canvas.style.width = `${CONFIG.CANVAS_WIDTH * scale}px`;
        elements.canvas.style.height = `${CONFIG.CANVAS_HEIGHT * scale}px`;
    }

    // ==========================================================================
    // Game Control Functions
    // ==========================================================================
    function startGame() {
        elements.startOverlay.classList.add('hidden');
        elements.canvas.focus();
        resetGame();
        state.running = true;
        state.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

    function pauseGame() {
        state.paused = true;
        elements.pauseOverlay.classList.remove('hidden');
    }

    function resumeGame() {
        state.paused = false;
        elements.pauseOverlay.classList.add('hidden');
        elements.canvas.focus();
        state.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

    function restartGame() {
        elements.completeOverlay.classList.add('hidden');
        resetGame();
        state.running = true;
        state.gameComplete = false;
        state.lastTime = performance.now();
        elements.canvas.focus();
        requestAnimationFrame(gameLoop);
    }

    function resetGame() {
        const level = state.gameData.level;

        // Reset player
        state.player = {
            x: level.playerStart.x,
            y: level.playerStart.y,
            vx: 0,
            vy: 0,
            width: CONFIG.PLAYER_WIDTH,
            height: CONFIG.PLAYER_HEIGHT,
            grounded: false,
            facing: 1,
            animFrame: 0,
            animTime: 0
        };

        // Reset camera
        state.camera = { x: 0, y: 0 };

        // Reset platforms
        state.platforms = level.platforms.map(p => ({ ...p }));

        // Reset collectibles
        state.collectibles = level.collectibles.map(c => ({
            ...c,
            collected: false,
            pulsePhase: Math.random() * Math.PI * 2
        }));

        // Reset obstacles
        state.obstacles = level.obstacles.map(o => ({
            ...o,
            startX: o.x,
            direction: 1
        }));

        // Reset collected facts
        state.collectedFacts = [];

        // Reset progress UI
        updateProgressUI();
    }

    function completeGame() {
        state.gameComplete = true;
        state.running = false;

        const totalFacts = state.gameData.facts.length;
        const collected = state.collectedFacts.length;

        elements.factsSummary.textContent = `You collected ${collected} of ${totalFacts} facts!`;
        elements.completeOverlay.classList.remove('hidden');

        playSound('complete');
    }

    // ==========================================================================
    // Game Loop
    // ==========================================================================
    function gameLoop(currentTime) {
        if (!state.running || state.paused) return;

        // Calculate delta time
        state.deltaTime = Math.min((currentTime - state.lastTime) / 1000, 0.1);
        state.lastTime = currentTime;
        state.time += state.deltaTime;

        // Update
        update();

        // Render
        render();

        // Continue loop
        requestAnimationFrame(gameLoop);
    }

    // ==========================================================================
    // Update Logic
    // ==========================================================================
    function update() {
        updatePlayer();
        updateObstacles();
        updateCamera();
        checkCollectibles();
        checkFinish();
    }

    function updatePlayer() {
        const player = state.player;
        const level = state.gameData.level;

        // Horizontal movement
        let moveX = 0;
        if (state.keys['arrowleft'] || state.keys['a']) moveX -= 1;
        if (state.keys['arrowright'] || state.keys['d']) moveX += 1;

        if (moveX !== 0) {
            player.vx += moveX * level.playerSpeed * 0.5;
            player.facing = moveX;
        }

        // Apply friction
        player.vx *= CONFIG.FRICTION;

        // Clamp horizontal velocity
        const maxSpeed = level.playerSpeed;
        player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));

        // Jumping (variable height)
        if (state.jumpHeld && player.grounded) {
            player.vy = -level.jumpForce;
            player.grounded = false;
            playSound('jump');
        }

        // Variable jump height - cut jump short if released early
        if (!state.jumpHeld && player.vy < -level.jumpForce * 0.5) {
            player.vy = -level.jumpForce * 0.5;
        }

        // Apply gravity
        player.vy += level.gravity;

        // Clamp vertical velocity
        player.vy = Math.min(player.vy, 15);

        // Move player
        player.x += player.vx;
        player.y += player.vy;

        // Collision detection
        player.grounded = false;

        // Platform collisions
        for (const platform of state.platforms) {
            if (checkAABBCollision(player, platform)) {
                resolveCollision(player, platform);
            }
        }

        // World bounds
        player.x = Math.max(0, Math.min(level.width - player.width, player.x));

        // Fall off bottom - reset to nearest platform
        if (player.y > level.height) {
            respawnPlayer();
        }

        // Obstacle collisions (push back)
        for (const obstacle of state.obstacles) {
            if (checkAABBCollision(player, obstacle)) {
                // Push player back
                const pushDir = player.x < obstacle.x ? -1 : 1;
                player.vx = pushDir * 8;
                player.vy = -5;
            }
        }

        // Update animation
        if (Math.abs(player.vx) > 0.5) {
            player.animTime += state.deltaTime;
            if (player.animTime > 0.1) {
                player.animTime = 0;
                player.animFrame = (player.animFrame + 1) % 4;
            }
        } else {
            player.animFrame = 0;
        }
    }

    function respawnPlayer() {
        // Find the last safe platform
        const player = state.player;
        let bestPlatform = state.platforms[0];

        for (const platform of state.platforms) {
            if (platform.x < player.x + 100 && platform.x > bestPlatform.x) {
                bestPlatform = platform;
            }
        }

        player.x = bestPlatform.x + bestPlatform.width / 2 - player.width / 2;
        player.y = bestPlatform.y - player.height - 10;
        player.vx = 0;
        player.vy = 0;
    }

    function updateObstacles() {
        for (const obstacle of state.obstacles) {
            if (obstacle.movement === 'horizontal') {
                obstacle.x += obstacle.speed * obstacle.direction;

                if (obstacle.x > obstacle.startX + obstacle.range ||
                    obstacle.x < obstacle.startX - obstacle.range) {
                    obstacle.direction *= -1;
                }
            }
        }
    }

    function updateCamera() {
        const player = state.player;
        const level = state.gameData.level;

        // Target camera position (lead the player slightly)
        const targetX = player.x - CONFIG.CANVAS_WIDTH / 2 + player.facing * CONFIG.CAMERA_LEAD;

        // Smooth camera movement
        if (!state.reducedMotion) {
            state.camera.x += (targetX - state.camera.x) * CONFIG.CAMERA_SMOOTHING;
        } else {
            state.camera.x = targetX;
        }

        // Clamp camera to level bounds
        state.camera.x = Math.max(0, Math.min(level.width - CONFIG.CANVAS_WIDTH, state.camera.x));
    }

    function checkCollectibles() {
        const player = state.player;

        for (const collectible of state.collectibles) {
            if (collectible.collected) continue;

            const dx = (player.x + player.width / 2) - collectible.x;
            const dy = (player.y + player.height / 2) - collectible.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONFIG.ORB_RADIUS + player.width / 2) {
                collectFact(collectible);
            }
        }
    }

    function collectFact(collectible) {
        collectible.collected = true;

        const fact = state.gameData.facts.find(f => f.id === collectible.factId);
        if (fact && !state.collectedFacts.includes(fact.id)) {
            state.collectedFacts.push(fact.id);
            showFact(fact.text);
            updateProgressUI();
            playSound('collect');
        }
    }

    function showFact(text) {
        state.paused = true;
        elements.factText.textContent = text;
        elements.factPopup.classList.remove('hidden');
    }

    function closeFact() {
        elements.factPopup.classList.add('hidden');
        state.paused = false;
        elements.canvas.focus();
        state.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }

    function checkFinish() {
        const player = state.player;
        const finish = state.gameData.level.finishZone;

        if (player.x + player.width > finish.x &&
            player.x < finish.x + finish.width &&
            player.y + player.height > finish.y &&
            player.y < finish.y + finish.height) {
            completeGame();
        }
    }

    function updateProgressUI() {
        const total = state.gameData.facts.length;
        const collected = state.collectedFacts.length;
        const percentage = (collected / total) * 100;

        elements.progressFill.style.width = `${percentage}%`;
        elements.progressText.textContent = `${collected} / ${total}`;
    }

    // ==========================================================================
    // Collision Detection
    // ==========================================================================
    function checkAABBCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    function resolveCollision(player, platform) {
        const overlapLeft = (player.x + player.width) - platform.x;
        const overlapRight = (platform.x + platform.width) - player.x;
        const overlapTop = (player.y + player.height) - platform.y;
        const overlapBottom = (platform.y + platform.height) - player.y;

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapY < minOverlapX) {
            // Vertical collision
            if (overlapTop < overlapBottom) {
                // Landing on top
                player.y = platform.y - player.height;
                player.vy = 0;
                player.grounded = true;
            } else {
                // Hitting from below
                player.y = platform.y + platform.height;
                player.vy = 0;
            }
        } else {
            // Horizontal collision
            if (overlapLeft < overlapRight) {
                player.x = platform.x - player.width;
            } else {
                player.x = platform.x + platform.width;
            }
            player.vx = 0;
        }
    }

    // ==========================================================================
    // Rendering
    // ==========================================================================
    function render() {
        const ctx = state.ctx;
        const colors = state.gameData.colors;

        // Clear canvas
        ctx.fillStyle = colors.background1;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Draw parallax backgrounds
        drawParallaxBackground(ctx, colors);

        // Save context and apply camera transform
        ctx.save();
        ctx.translate(-state.camera.x, -state.camera.y);

        // Draw platforms
        drawPlatforms(ctx, colors);

        // Draw collectibles
        drawCollectibles(ctx, colors);

        // Draw obstacles
        drawObstacles(ctx, colors);

        // Draw finish zone
        drawFinishZone(ctx, colors);

        // Draw player
        drawPlayer(ctx, colors);

        // Restore context
        ctx.restore();
    }

    function drawParallaxBackground(ctx, colors) {
        if (state.reducedMotion) return;

        // Layer 1 - Distant mountains
        const offset1 = state.camera.x * CONFIG.PARALLAX_FACTOR_1;
        ctx.fillStyle = colors.background3;
        for (let i = 0; i < 6; i++) {
            const x = i * 200 - (offset1 % 200);
            drawMountain(ctx, x, 300, 150, 100);
        }

        // Layer 2 - Mid hills
        const offset2 = state.camera.x * CONFIG.PARALLAX_FACTOR_2;
        ctx.fillStyle = colors.background2;
        for (let i = 0; i < 8; i++) {
            const x = i * 150 - (offset2 % 150);
            drawMountain(ctx, x, 340, 100, 60);
        }
    }

    function drawMountain(ctx, x, baseY, width, height) {
        ctx.beginPath();
        ctx.moveTo(x, baseY);
        ctx.lineTo(x + width / 2, baseY - height);
        ctx.lineTo(x + width, baseY);
        ctx.closePath();
        ctx.fill();
    }

    function drawPlatforms(ctx, colors) {
        for (const platform of state.platforms) {
            ctx.fillStyle = platform.type === 'ground' ? colors.platformGround : colors.platform;

            // Main platform
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);

            // Top highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fillRect(platform.x, platform.y, platform.width, 4);

            // Side shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(platform.x, platform.y + platform.height - 4, platform.width, 4);
        }
    }

    function drawCollectibles(ctx, colors) {
        for (const collectible of state.collectibles) {
            if (collectible.collected) continue;

            // Update pulse
            collectible.pulsePhase += CONFIG.ORB_PULSE_SPEED;
            const pulse = state.reducedMotion ? 1 : 1 + Math.sin(collectible.pulsePhase) * 0.2;

            // Glow effect
            if (!state.reducedMotion) {
                const gradient = ctx.createRadialGradient(
                    collectible.x, collectible.y, 0,
                    collectible.x, collectible.y, CONFIG.ORB_RADIUS * 2
                );
                gradient.addColorStop(0, colors.orbGlow);
                gradient.addColorStop(1, 'transparent');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(collectible.x, collectible.y, CONFIG.ORB_RADIUS * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Orb
            ctx.fillStyle = colors.orb;
            ctx.beginPath();
            ctx.arc(collectible.x, collectible.y, CONFIG.ORB_RADIUS * pulse, 0, Math.PI * 2);
            ctx.fill();

            // Inner highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(collectible.x - 4, collectible.y - 4, CONFIG.ORB_RADIUS * 0.3 * pulse, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawObstacles(ctx, colors) {
        ctx.fillStyle = colors.obstacle;

        for (const obstacle of state.obstacles) {
            if (obstacle.type === 'spike') {
                // Draw triangle spike
                ctx.beginPath();
                ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
                ctx.lineTo(obstacle.x + obstacle.width / 2, obstacle.y);
                ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                ctx.closePath();
                ctx.fill();
            } else if (obstacle.type === 'walker') {
                // Draw simple enemy
                ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

                // Eyes
                ctx.fillStyle = '#ffffff';
                const eyeY = obstacle.y + 10;
                const eyeSize = 6;
                ctx.fillRect(obstacle.x + 10, eyeY, eyeSize, eyeSize);
                ctx.fillRect(obstacle.x + obstacle.width - 16, eyeY, eyeSize, eyeSize);

                ctx.fillStyle = colors.obstacle;
            }
        }
    }

    function drawFinishZone(ctx, colors) {
        const finish = state.gameData.level.finishZone;

        // Pulsing effect
        const pulse = state.reducedMotion ? 0.3 : 0.3 + Math.sin(state.time * 3) * 0.1;

        ctx.fillStyle = `rgba(46, 204, 113, ${pulse})`;
        ctx.fillRect(finish.x, finish.y, finish.width, finish.height);

        // Border
        ctx.strokeStyle = colors.finish;
        ctx.lineWidth = 3;
        ctx.strokeRect(finish.x, finish.y, finish.width, finish.height);

        // Flag
        ctx.fillStyle = colors.finish;
        ctx.fillRect(finish.x + finish.width / 2 - 3, finish.y - 40, 6, 50);

        // Flag triangle
        ctx.beginPath();
        ctx.moveTo(finish.x + finish.width / 2 + 3, finish.y - 40);
        ctx.lineTo(finish.x + finish.width / 2 + 30, finish.y - 25);
        ctx.lineTo(finish.x + finish.width / 2 + 3, finish.y - 10);
        ctx.closePath();
        ctx.fill();
    }

    function drawPlayer(ctx, colors) {
        const player = state.player;
        const px = 2; // pixel size for retro look

        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);

        // Flip based on facing direction
        ctx.scale(player.facing, 1);

        // Animation offset for walking
        const legOffset = !player.grounded ? 0 : Math.sin(player.animFrame * Math.PI / 2) * 3;
        const armOffset = !player.grounded ? 2 : Math.sin(player.animFrame * Math.PI / 2) * 2;

        // Color palette - astronaut style
        const suitWhite = '#f0f0f0';
        const suitGray = '#c0c0c0';
        const suitDark = '#909090';
        const visorBlue = '#4fc3f7';
        const visorDark = '#0288d1';
        const visorHighlight = '#b3e5fc';
        const accentOrange = '#ff6d00';
        const accentRed = '#d32f2f';
        const backpackGray = '#757575';

        // Jetpack/life support backpack
        ctx.fillStyle = backpackGray;
        ctx.fillRect(-14, -10, px * 3, px * 12);
        ctx.fillStyle = '#616161';
        ctx.fillRect(-14, -10, px, px * 12);
        // Backpack details
        ctx.fillStyle = accentRed;
        ctx.fillRect(-13, -6, px * 2, px * 2);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(-13, 0, px * 2, px * 2);

        // Boots (chunky space boots)
        ctx.fillStyle = suitGray;
        ctx.fillRect(-8 - legOffset, 12, px * 5, px * 5);
        ctx.fillRect(3 + legOffset, 12, px * 5, px * 5);
        // Boot soles
        ctx.fillStyle = suitDark;
        ctx.fillRect(-8 - legOffset, 16, px * 5, px * 2);
        ctx.fillRect(3 + legOffset, 16, px * 5, px * 2);

        // Legs (suit)
        ctx.fillStyle = suitWhite;
        ctx.fillRect(-6 - legOffset, 2, px * 4, px * 6);
        ctx.fillRect(2 + legOffset, 2, px * 4, px * 6);
        // Leg stripes
        ctx.fillStyle = accentOrange;
        ctx.fillRect(-6 - legOffset, 4, px * 4, px);
        ctx.fillRect(2 + legOffset, 4, px * 4, px);

        // Torso (bulky suit)
        ctx.fillStyle = suitWhite;
        ctx.fillRect(-10, -12, px * 10, px * 10);
        // Chest panel
        ctx.fillStyle = suitGray;
        ctx.fillRect(-6, -8, px * 6, px * 6);
        // Chest lights/controls
        ctx.fillStyle = '#2196f3';
        ctx.fillRect(-4, -6, px * 2, px);
        ctx.fillStyle = '#f44336';
        ctx.fillRect(0, -6, px * 2, px);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(-2, -4, px * 2, px);

        // Arms (puffy suit arms)
        ctx.fillStyle = suitWhite;
        ctx.fillRect(-14, -8 - armOffset, px * 4, px * 8);
        ctx.fillRect(10, -8 + armOffset, px * 4, px * 8);
        // Arm stripes
        ctx.fillStyle = accentOrange;
        ctx.fillRect(-14, -4 - armOffset, px * 4, px);
        ctx.fillRect(10, -4 + armOffset, px * 4, px);

        // Gloves
        ctx.fillStyle = suitGray;
        ctx.fillRect(-14, 2 - armOffset, px * 4, px * 4);
        ctx.fillRect(10, 2 + armOffset, px * 4, px * 4);

        // Helmet (round bubble)
        ctx.fillStyle = suitWhite;
        // Helmet shell
        ctx.fillRect(-8, -26, px * 9, px * 10);
        ctx.fillRect(-6, -28, px * 6, px * 2);
        ctx.fillRect(-6, -16, px * 8, px * 2);

        // Visor (reflective blue)
        ctx.fillStyle = visorDark;
        ctx.fillRect(-4, -24, px * 7, px * 7);
        // Visor gradient effect
        ctx.fillStyle = visorBlue;
        ctx.fillRect(-2, -22, px * 5, px * 5);
        // Visor highlight/reflection
        ctx.fillStyle = visorHighlight;
        ctx.fillRect(-2, -22, px * 2, px * 2);
        ctx.fillRect(2, -20, px, px);

        // Helmet rim
        ctx.fillStyle = suitGray;
        ctx.fillRect(-8, -16, px * 10, px * 2);

        // Antenna on helmet
        ctx.fillStyle = suitDark;
        ctx.fillRect(6, -30, px, px * 4);
        ctx.fillStyle = accentRed;
        ctx.fillRect(5, -32, px * 2, px * 2);

        ctx.restore();
    }

    function drawStartScreen() {
        const ctx = state.ctx;
        const colors = state.gameData?.colors || {
            background1: '#1a1a2e',
            background2: '#16213e'
        };

        ctx.fillStyle = colors.background1;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Simple decoration
        ctx.fillStyle = colors.background2;
        for (let i = 0; i < 5; i++) {
            drawMountain(ctx, i * 180, 350, 160, 80);
        }
    }

    // ==========================================================================
    // Audio
    // ==========================================================================
    function initAudio() {
        if (state.audioContext) return;

        try {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    function playSound(type) {
        if (state.muted || !state.gameData?.audio?.enabled) return;

        // Lazy init audio context (requires user interaction)
        initAudio();
        if (!state.audioContext) return;

        const effects = state.gameData.audio?.effects || {
            jump: { frequency: 400, duration: 0.1, type: 'square' },
            collect: { frequency: 800, duration: 0.15, type: 'sine' },
            complete: { frequency: 600, duration: 0.3, type: 'triangle' }
        };

        const effect = effects[type];
        if (!effect) return;

        const oscillator = state.audioContext.createOscillator();
        const gainNode = state.audioContext.createGain();

        oscillator.type = effect.type;
        oscillator.frequency.setValueAtTime(effect.frequency, state.audioContext.currentTime);

        if (type === 'collect') {
            oscillator.frequency.exponentialRampToValueAtTime(
                effect.frequency * 1.5,
                state.audioContext.currentTime + effect.duration
            );
        }

        gainNode.gain.setValueAtTime(state.gameData.audio?.volume || 0.3, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + effect.duration);

        oscillator.connect(gainNode);
        gainNode.connect(state.audioContext.destination);

        oscillator.start();
        oscillator.stop(state.audioContext.currentTime + effect.duration);
    }

    // ==========================================================================
    // Initialize on DOM Ready
    // ==========================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
