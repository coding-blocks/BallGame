const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// States for creating the game
let balls = [];
let pipes = [];
let particles = [];

// State Variables
let centerX = 0;
let centerY = 0;
let arenaRadius = 0;
let splitCount = 0;

let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// 2. INITIALIZATION
function init() {
    // Handle window resizing
    window.addEventListener('resize', resize);
    resize();

    pipes = [
        { x: 0, y: 0, w: 20, h: 100, dir: 1, isLeft: true },  // Left Pipe
        { x: 0, y: 0, w: 20, h: 100, dir: -1, isLeft: false } // Right Pipe
    ];

    // Start the game loop
    resetGame();
    loop();
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Center of screen
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;

    // Circle size is smaller of width/height
    arenaRadius = Math.min(canvas.width, canvas.height) / 2 - 20;
}

function resetGame() {
    // Reset Everything
    balls = [];
    particles = [];
    splitCount = 0;

    spawnBall(centerX, centerY);

    updateStats();
}

// 3. OBJECT CREATION HELPERS
function spawnBall(x, y) {
    if (balls.length >= 1500) return; // max balls set

    // Random velocity between -3 and 3
    let vx = (Math.random() - 0.5) * 6;
    let vy = (Math.random() - 0.5) * 6;

    balls.push({
        x: x,
        y: y,
        vx: vx,
        vy: vy,
        radius: 4,
        cooldown: 0 // Prevents splitting too fast
    });
}

function spawnExplosion(x, y) {
    // Create 5 little particles
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1.0
        });
    }
}

// 4. GAME LOOP 
function loop() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "gray";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, arenaRadius, 0, Math.PI * 2);
    ctx.stroke();

    updatePipes();

    updateBalls();

    updateParticles();

    requestAnimationFrame(loop);
}

// 5. UPDATE FUNCTIONS 
function updatePipes() {
    const speed = 0.002;
    const range = arenaRadius * 0.5;
    const time = Date.now();

    let gap = 100;

    pipes.forEach(pipe => {
        // Left pipe on left of center, Right pipe on right
        if (pipe.isLeft) pipe.x = centerX - gap / 2 - pipe.w;
        else pipe.x = centerX + gap / 2;

        let offset = pipe.isLeft ? 0 : Math.PI;
        pipe.y = centerY - (pipe.h / 2) + Math.sin(time * speed + offset) * range;

        ctx.fillStyle = "white";
        ctx.fillRect(pipe.x, pipe.y, pipe.w, pipe.h);
    });
}

function updateBalls() {
    for (let i = 0; i < balls.length; i++) {
        let b = balls[i];

        b.x += b.vx;
        b.y += b.vy;

        if (b.cooldown > 0) b.cooldown--;

        let dx = b.x - centerX;
        let dy = b.y - centerY;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist + b.radius > arenaRadius) {

            let nx = dx / dist;
            let ny = dy / dist;

            let overlap = (dist + b.radius) - arenaRadius;
            b.x -= nx * overlap;
            b.y -= ny * overlap;

            let dotProduct = (b.vx * nx) + (b.vy * ny);
            b.vx = b.vx - 2 * dotProduct * nx;
            b.vy = b.vy - 2 * dotProduct * ny;
        }

        pipes.forEach(p => {
            let testX = b.x;
            let testY = b.y;

            if (b.x < p.x) testX = p.x;      // Left edge
            else if (b.x > p.x + p.w) testX = p.x + p.w; // Right edge

            if (b.y < p.y) testY = p.y;      // Top edge
            else if (b.y > p.y + p.h) testY = p.y + p.h; // Bottom edge

            let distX = b.x - testX;
            let distY = b.y - testY;
            let distance = Math.sqrt(distX * distX + distY * distY);

            if (distance < b.radius) {
                // HIT!

                // TRIGGER SPLIT ON COLLISION
                if (b.cooldown <= 0) {
                    splitBall(b);
                }

                if (Math.abs(distX) > Math.abs(distY)) {
                    b.vx = -b.vx;
                    // Push out
                    if (distX > 0) b.x += (b.radius - distance);
                    else b.x -= (b.radius - distance);
                } else {
                    b.vy = -b.vy;
                    // Push out
                    if (distY > 0) b.y += (b.radius - distance);
                    else b.y -= (b.radius - distance);
                }
            }
        });

        ctx.fillStyle = "cyan";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05; // Fade out

        if (p.life <= 0) {
            particles.splice(i, 1); // Remove dead particle
        } else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = "white";
            ctx.fillRect(p.x, p.y, 3, 3);
            ctx.globalAlpha = 1.0;
        }
    }
}

// 6. GAMEPLAY LOGIC
function splitBall(parentBall) {
    if (balls.length >= 1500) return;

    // 1. Play Sound
    playSound();

    // 2. Set cooldown so this ball doesn't split again immediately
    parentBall.cooldown = 60; // 60 frames = 1 second

    // 3. Create a new ball (Clone)
    let newBall = {
        x: parentBall.x,
        y: parentBall.y,
        vx: parentBall.vx + (Math.random() - 0.5), // Slight variation
        vy: parentBall.vy + (Math.random() - 0.5),
        radius: parentBall.radius,
        cooldown: 60 // Clone also starts cool
    };
    balls.push(newBall);

    // 4. Visual Effects
    spawnExplosion(parentBall.x, parentBall.y);

    // 5. Update Stats
    splitCount++;
    updateStats();
}

function updateStats() {
    document.getElementById('ballCount').innerText = balls.length;
    document.getElementById('splitCount').innerText = splitCount;
}

// Generate beep sound
function playSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();

    osc.frequency.value = 400 + (balls.length * 2);
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

canvas.addEventListener('mousedown', (e) => {
    spawnBall(centerX, centerY);
});

init();

