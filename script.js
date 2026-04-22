const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const GRID = 20; // tile size in CSS pixels
let COLS, ROWS;   // will be computed to match canvas CSS size

let snake;
let dir;
let nextDir = null; // start with no requested direction
let apple;
let score;
let running = false; // was undefined or started true before
let loopId;
const SPEED = 100; // ms per tick

function resizeCanvasForDPR() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, Math.floor(rect.width));
  const cssH = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  // Scale so drawing units = CSS pixels
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  COLS = Math.floor(cssW / GRID);
  ROWS = Math.floor(cssH / GRID);
}

// compute readable font sizes based on canvas CSS width
function fontFor(sizePx) {
  // base design width 400 (adjust if you use 600)
  const base = 400;
  const scale = canvas.clientWidth / base;
  const px = Math.max(10, Math.round(sizePx * scale));
  return `${px}px system-ui, sans-serif`;
}

function reset() {
  // place snake in center using integer grid coords
  snake = [{ x: Math.floor(COLS / 2), y: Math.floor(ROWS / 2) }];
  dir = { x: 0, y: 0 };
  // if a direction was requested (via button / key) use it, otherwise default to right
  if (!nextDir) nextDir = { x: 1, y: 0 };
  placeApple();
  score = 0;
  running = true;
  if (loopId) clearInterval(loopId);
  loopId = setInterval(tick, SPEED);
}

function placeApple() {
  while (true) {
    apple = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };
    if (!snake.some(s => s.x === apple.x && s.y === apple.y)) break;
  }
}

function tick() {
  if ((nextDir.x !== -dir.x || nextDir.y !== -dir.y)) {
    dir = nextDir;
  }

  if (dir.x === 0 && dir.y === 0) {
    draw();
    return;
  }

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    gameOver();
    return;
  }

  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    gameOver();
    return;
  }

  snake.unshift(head);

  if (head.x === apple.x && head.y === apple.y) {
    score += 1;
    placeApple();
  } else {
    snake.pop();
  }

  draw();
}

function gameOver() {
  running = false;
  clearInterval(loopId);
  draw(true);
}

// draw faint schedule-style grid WITHOUT labels
function drawScheduleGrid() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // vertical lines
  for (let x = 0; x <= COLS; x++) {
    const px = x * GRID + 0.5;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
  }
  // horizontal lines
  for (let y = 0; y <= ROWS; y++) {
    const py = y * GRID + 0.5;
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
  }
  ctx.stroke();
  ctx.closePath();
}

function draw(showGameOver = false) {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  drawScheduleGrid();

  // draw apple as solid block (pixel-aligned)
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(apple.x * GRID, apple.y * GRID, GRID, GRID);

  // draw snake - fillRect avoids anti-alias gaps
  for (let i = 0; i < snake.length; i++) {
    const s = snake[i];
    ctx.fillStyle = i === 0 ? '#10b981' : '#f59e0b';
    ctx.fillRect(s.x * GRID, s.y * GRID, GRID, GRID);
  }

  // top score using scaled font
  ctx.fillStyle = '#ffffff';
  ctx.font = fontFor(16); // scaled
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Score: ' + score, canvas.clientWidth / 2, 8);

  // help is now a DOM element below canvas — keep canvas-only messages minimal

  if (showGameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    ctx.fillStyle = '#fff';
    ctx.font = fontFor(28);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', canvas.clientWidth / 2, canvas.clientHeight / 2 - 18);

    ctx.font = fontFor(16);
    ctx.fillText('Final score: ' + score, canvas.clientWidth / 2, canvas.clientHeight / 2 + 8);

    ctx.font = fontFor(13);
    ctx.fillText('Press Space to restart', canvas.clientWidth / 2, canvas.clientHeight / 2 + 34);
  }
}

// call resize on load/resize/orientationchange
window.addEventListener('load', () => { resizeCanvasForDPR(); draw(); });
window.addEventListener('resize', () => { resizeCanvasForDPR(); draw(); });
window.addEventListener('orientationchange', () => { setTimeout(() => { resizeCanvasForDPR(); draw(); }, 200); });

function setDirection(name) {
  const map = {
    'UP': { x: 0, y: -1 },
    'DOWN': { x: 0, y: 1 },
    'LEFT': { x: -1, y: 0 },
    'RIGHT': { x: 1, y: 0 }
  };
  const nd = map[name];
  if (!nd) return;

  // If game is not running, queue the requested direction and start
  if (!running) {
    nextDir = nd;
    reset();
    return;
  }

  // Prevent immediate 180° turn
  if (nd.x === -dir.x && nd.y === -dir.y) return;

  nextDir = nd;
}

window.addEventListener('keydown', (e) => {
  const key = e.key;
  const map = {
    'ArrowUp': { x: 0, y: -1 },
    'ArrowDown': { x: 0, y: 1 },
    'ArrowLeft': { x: -1, y: 0 },
    'ArrowRight': { x: 1, y: 0 },
  };

  if (map[key]) {
    // queue + start if needed
    if (!running) {
      nextDir = map[key];
      reset();
    } else {
      const nd = map[key];
      if (!(nd.x === -dir.x && nd.y === -dir.y)) nextDir = nd;
    }
    return;
  }

  if (key === ' ' || key === 'Spacebar') {
    if (!running) reset();
  }
});

let pointerStart = null;
const SWIPE_THRESHOLD = 24; // minimal px to count as a swipe

// pointer (mouse + touch) swipe => direction
canvas.addEventListener('pointerdown', (e) => {
  pointerStart = { x: e.clientX, y: e.clientY, id: e.pointerId };
  // capture so we still get pointerup even if finger/mouse leaves canvas
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
});

canvas.addEventListener('pointerup', (e) => {
  if (!pointerStart || pointerStart.id !== e.pointerId) {
    pointerStart = null;
    return;
  }
  const dx = e.clientX - pointerStart.x;
  const dy = e.clientY - pointerStart.y;
  pointerStart = null;
  try { canvas.releasePointerCapture(e.pointerId); } catch (err) { }

  // tap (small move) => start game (no direction change)
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
    if (!running) {
      // queue default direction (right) and start
      nextDir = { x: 1, y: 0 };
      reset();
    }
    return;
  }

  // determine primary swipe axis
  let nd;
  if (Math.abs(dx) > Math.abs(dy)) {
    nd = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  } else {
    nd = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
  }

  // if game not running, start with this direction
  if (!running) {
    nextDir = nd;
    reset();
    return;
  }

  // avoid 180° turns
  if (nd.x === -dir.x && nd.y === -dir.y) return;
  nextDir = nd;
});

canvas.addEventListener('pointercancel', (e) => {
  if (pointerStart && pointerStart.id === e.pointerId) pointerStart = null;
});

// initialize canvas for DPR and draw initial screen but do NOT start game
resizeCanvasForDPR();
draw();

