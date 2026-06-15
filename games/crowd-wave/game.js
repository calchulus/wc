const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ROWS = 5;
const FIGURES_PER_ROW = 12;
const FIGURE_WIDTH = 40;
const FIGURE_HEIGHT = 50;
const ROW_SPACING = 60;
const START_Y = 150;

const state = {
  mode: 'menu',
  score: 0,
  combo: 0,
  maxCombo: 0,
  multiplier: 1,
  bpm: 100,
  beatInterval: 600,
  lastBeatTime: 0,
  beatCount: 0,
  wavePosition: -1,
  waveDirection: 1,
  wavePattern: 'simple',
  waveActive: false,
  waveBreakTimer: 0,
  highScore: parseInt(localStorage.getItem('crowdWaveHighScore')) || 0,
  figures: [],
  beatIndicator: 0,
  timingWindow: 150,
  perfectWindow: 50,
  lastTapTime: 0,
  tapFeedback: [],
  crowdMood: 'neutral',
  crowdColor: { r: 100, g: 200, b: 100 },
  perfectCount: 0,
  missCount: 0,
  totalBeats: 0
};

function initFigures() {
  state.figures = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < FIGURES_PER_ROW; col++) {
      state.figures.push({
        row,
        col,
        x: 80 + col * FIGURE_WIDTH,
        y: START_Y + row * ROW_SPACING,
        phase: Math.random() * Math.PI * 2,
        raised: false,
        raisedAmount: 0,
        color: { r: 100, g: 180 + Math.random() * 75, b: 100 }
      });
    }
  }
}

function getWavePatternIndices() {
  const indices = [];
  const totalFigures = ROWS * FIGURES_PER_ROW;

  if (state.wavePattern === 'simple') {
    const waveWidth = 3;
    for (let i = 0; i < totalFigures; i++) {
      if (Math.abs(i - state.wavePosition) < waveWidth) {
        indices.push(i);
      }
    }
  } else if (state.wavePattern === 'double') {
    const waveWidth = 2;
    const pos2 = (state.wavePosition + totalFigures / 3) % totalFigures;
    const pos3 = (state.wavePosition + (totalFigures * 2) / 3) % totalFigures;
    for (let i = 0; i < totalFigures; i++) {
      const d1 = Math.abs((i - state.wavePosition + totalFigures) % totalFigures);
      const d2 = Math.abs((i - pos2 + totalFigures) % totalFigures);
      const d3 = Math.abs((i - pos3 + totalFigures) % totalFigures);
      if (d1 < waveWidth || d2 < waveWidth || d3 < waveWidth) {
        indices.push(i);
      }
    }
  } else if (state.wavePattern === 'reverse') {
    const waveWidth = 3;
    for (let i = 0; i < totalFigures; i++) {
      if (Math.abs(i - state.wavePosition) < waveWidth) {
        indices.push(i);
      }
    }
  }

  return indices;
}

function updateFigures(dt) {
  const waveIndices = getWavePatternIndices();

  state.figures.forEach((fig, i) => {
    if (state.waveActive && waveIndices.includes(i)) {
      fig.raised = true;
      fig.raisedAmount = Math.min(fig.raisedAmount + dt * 8, 1);
    } else {
      fig.raised = false;
      fig.raisedAmount = Math.max(fig.raisedAmount - dt * 4, 0);
    }
    fig.phase += dt * 2;
  });
}

function moveWave(dt) {
  if (!state.waveActive) {
    state.waveBreakTimer -= dt * 1000;
    if (state.waveBreakTimer <= 0) {
      startWave();
    }
    return;
  }

  const speed = 15 * (state.bpm / 100);
  state.wavePosition += speed * dt * state.waveDirection;

  const totalFigures = ROWS * FIGURES_PER_ROW;
  if (state.waveDirection >= 0 && state.wavePosition >= totalFigures + 5) {
    state.waveActive = false;
    state.waveBreakTimer = 500;
  } else if (state.waveDirection < 0 && state.wavePosition <= -6) {
    state.waveActive = false;
    state.waveBreakTimer = 500;
  }
}

function startWave() {
  state.waveActive = true;
  state.wavePosition = -5;

  const patterns = ['simple', 'double', 'reverse'];
  const patternIndex = Math.floor(state.beatCount / 10) % patterns.length;
  state.wavePattern = patterns[patternIndex];

  if (state.wavePattern === 'reverse') {
    state.waveDirection = -1;
    state.wavePosition = ROWS * FIGURES_PER_ROW + 5;
  } else {
    state.waveDirection = 1;
  }
}

function handleBeat() {
  state.totalBeats++;
  state.beatCount++;
  state.beatIndicator = 1;

  if (state.beatCount % 20 === 0) {
    state.bpm = Math.min(state.bpm + 5, 200);
    state.beatInterval = 60000 / state.bpm;
  }
}

function handleTap() {
  if (state.mode !== 'playing') return;

  const now = performance.now();
  const timeSinceLastBeat = now - state.lastBeatTime;
  const timeToNextBeat = state.beatInterval - timeSinceLastBeat;
  const closestBeatDistance = Math.min(timeSinceLastBeat, timeToNextBeat);

  if (closestBeatDistance < state.perfectWindow) {
    state.combo++;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.multiplier = 1 + Math.floor(state.combo / 5);
    state.score += 100 * state.multiplier;
    state.perfectCount++;
    state.crowdMood = 'cheer';
    addTapFeedback('PERFECT!', '#ffd700');
  } else if (closestBeatDistance < state.timingWindow) {
    state.combo++;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.multiplier = 1 + Math.floor(state.combo / 5);
    state.score += 50 * state.multiplier;
    state.crowdMood = 'happy';
    addTapFeedback('GOOD', '#4ecdc4');
  } else {
    state.combo = 0;
    state.multiplier = 1;
    state.missCount++;
    state.crowdMood = 'boo';
    addTapFeedback('MISS', '#ff6b6b');
  }

  updateCrowdColor();
  state.lastTapTime = now;

  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem('crowdWaveHighScore', state.highScore);
  }
}

function addTapFeedback(text, color) {
  state.tapFeedback.push({
    text,
    color,
    x: canvas.width / 2,
    y: canvas.height / 2 - 50,
    alpha: 1,
    vy: -2
  });
}

function updateCrowdColor() {
  const t = Math.min(state.score / 10000, 1);
  state.crowdColor = {
    r: Math.floor(100 + t * 155),
    g: Math.floor(200 - t * 50),
    b: Math.floor(100 + t * 50)
  };
}

function updateFeedback(dt) {
  state.tapFeedback = state.tapFeedback.filter(fb => {
    fb.y += fb.vy;
    fb.alpha -= dt * 1.5;
    return fb.alpha > 0;
  });

  state.beatIndicator = Math.max(0, state.beatIndicator - dt * 3);
}

function renderCrowd() {
  ctx.fillStyle = '#2d5016';
  ctx.fillRect(0, START_Y - 20, canvas.width, ROWS * ROW_SPACING + 40);

  state.figures.forEach((fig, i) => {
    const baseX = fig.x;
    const baseY = fig.y;
    const sway = Math.sin(fig.phase) * (fig.raised ? 5 : 2);
    const armRaise = fig.raisedAmount * 15;

    const rowTint = 1 - (fig.row / ROWS) * 0.3;
    const cr = Math.floor(state.crowdColor.r * rowTint);
    const cg = Math.floor(state.crowdColor.g * rowTint);
    const cb = Math.floor(state.crowdColor.b * rowTint);

    ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(baseX + sway, baseY, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(baseX + sway, baseY + 8);
    ctx.lineTo(baseX + sway, baseY + 25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(baseX + sway - 10, baseY + 15 - armRaise);
    ctx.lineTo(baseX + sway, baseY + 12);
    ctx.lineTo(baseX + sway + 10, baseY + 15 - armRaise);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(baseX + sway, baseY + 25);
    ctx.lineTo(baseX + sway - 8, baseY + 40);
    ctx.moveTo(baseX + sway, baseY + 25);
    ctx.lineTo(baseX + sway + 8, baseY + 40);
    ctx.stroke();
  });
}

function renderBeatIndicator() {
  const barY = 520;
  const barWidth = canvas.width - 40;
  const barX = 20;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(barX, barY, barWidth, 30);

  ctx.fillStyle = '#333';
  ctx.fillRect(barX, barY, barWidth, 30);

  for (let i = 0; i < 10; i++) {
    const x = barX + (i / 9) * barWidth;
    ctx.fillStyle = '#666';
    ctx.fillRect(x - 1, barY, 2, 30);
  }

  const now = performance.now();
  const timeSinceLastBeat = now - state.lastBeatTime;
  const beatProgress = timeSinceLastBeat / state.beatInterval;
  const indicatorX = barX + (beatProgress % 1) * barWidth;

  ctx.fillStyle = state.beatIndicator > 0.5 ? '#ffd700' : '#ff6b6b';
  ctx.beginPath();
  ctx.arc(indicatorX, barY + 15, 12, 0, Math.PI * 2);
  ctx.fill();

  const hitZoneX = barX + barWidth * 0.5;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(hitZoneX - 20, barY, 40, 30);

  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('TAP', hitZoneX, barY + 20);
}

function renderUI() {
  document.getElementById('score-display').textContent = `Score: ${state.score}`;
  document.getElementById('combo-display').textContent = state.combo > 0 ? `${state.combo}x Combo (x${state.multiplier})` : '';
  document.getElementById('bpm-display').textContent = `BPM: ${state.bpm}`;
  document.getElementById('wave-pattern').textContent = `Pattern: ${state.wavePattern.toUpperCase()}`;
}

function renderFeedback() {
  state.tapFeedback.forEach(fb => {
    ctx.globalAlpha = fb.alpha;
    ctx.fillStyle = fb.color;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(fb.text, fb.x, fb.y);
    ctx.globalAlpha = 1;
  });
}

function renderBackground() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f3460';
  ctx.fillRect(0, 0, canvas.width, START_Y - 30);

  ctx.fillStyle = '#16213e';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('STADIUM', canvas.width / 2, 30);

  const stadiumColor = state.crowdMood === 'cheer' ? '#ffd700' :
    state.crowdMood === 'happy' ? '#4ecdc4' :
    state.crowdMood === 'boo' ? '#ff6b6b' : '#666';

  ctx.strokeStyle = stadiumColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, START_Y - 20);
  ctx.lineTo(canvas.width, START_Y - 20);
  ctx.stroke();
}

function render() {
  renderBackground();
  renderCrowd();
  renderBeatIndicator();
  renderFeedback();
  renderUI();
}

function update(dt) {
  if (state.mode !== 'playing') return;

  const now = performance.now();
  if (now - state.lastBeatTime >= state.beatInterval) {
    handleBeat();
    state.lastBeatTime = now;
    if (state.totalBeats >= 60) {
      endGame();
      return;
    }
  }

  moveWave(dt);
  updateFigures(dt);
  updateFeedback(dt);
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - (gameLoop.lastTime || timestamp)) / 1000, 0.05);
  gameLoop.lastTime = timestamp;

  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  state.mode = 'playing';
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.multiplier = 1;
  state.bpm = 100;
  state.beatInterval = 600;
  state.beatCount = 0;
  state.waveActive = false;
  state.waveBreakTimer = 500;
  state.crowdMood = 'neutral';
  state.crowdColor = { r: 100, g: 200, b: 100 };
  state.perfectCount = 0;
  state.missCount = 0;
  state.totalBeats = 0;
  state.tapFeedback = [];
  state.lastBeatTime = performance.now();

  initFigures();

  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('game-over-screen').style.display = 'none';
}

function endGame() {
  state.mode = 'gameover';
  document.getElementById('game-over-screen').style.display = 'flex';
  document.getElementById('final-score').textContent = state.score;
  document.getElementById('high-score-text').textContent = `High Score: ${state.highScore}`;
}

function renderGameToText() {
  const payload = {
    mode: state.mode,
    score: state.score,
    combo: state.combo,
    maxCombo: state.maxCombo,
    multiplier: state.multiplier,
    bpm: state.bpm,
    beatProgress: ((performance.now() - state.lastBeatTime) / state.beatInterval) % 1,
    wavePosition: state.wavePosition,
    waveActive: state.waveActive,
    wavePattern: state.wavePattern,
    crowdMood: state.crowdMood,
    figuresRaised: state.figures.filter(f => f.raised).length,
    totalFigures: state.figures.length,
    perfectCount: state.perfectCount,
    missCount: state.missCount,
    totalBeats: state.totalBeats,
    highScore: state.highScore
  };
  return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) update(1 / 60);
  render();
};

canvas.addEventListener('click', () => {
  if (state.mode === 'playing') {
    handleTap();
  }
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (state.mode === 'playing') {
    handleTap();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    if (state.mode === 'playing') {
      handleTap();
    }
  }
  if (e.key === 'f' || e.key === 'F') {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
  if (e.key === 'Escape' && document.fullscreenElement) {
    document.exitFullscreen();
  }
});

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

initFigures();
requestAnimationFrame(gameLoop);
