(function () {
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var W = canvas.width;
  var H = canvas.height;

  var hudScore = document.getElementById('score-display');
  var hudBudget = document.getElementById('budget-display');
  var hudHealth = document.getElementById('health-display');
  var overlay = document.getElementById('message-overlay');
  var startBtn = document.getElementById('start-btn');

  var COLS = 12;
  var ROWS = 10;
  var CELL_W = W / COLS;
  var CELL_H = (H - 80) / ROWS;
  var GOAL_Y = H - 60;
  var GOAL_LEFT = 180;
  var GOAL_RIGHT = 420;
  var BLOCKER_COST = 10;

  var state = {
    mode: 'start',
    grid: [],
    defenders: [],
    incomingBalls: [],
    budget: 80,
    shotsLeft: 20,
    score: 0,
    goalHealth: 3,
    nextBallTimer: 0,
    ballInterval: 120,
    particles: [],
    totalBallsSpawned: 0,
    lastTime: 0,
  };

  function initGrid() {
    state.grid = [];
    for (var r = 0; r < ROWS; r++) {
      state.grid[r] = [];
      for (var c = 0; c < COLS; c++) {
        state.grid[r][c] = 0;
      }
    }
  }

  function resetGame() {
    initGrid();
    state.defenders = [];
    state.incomingBalls = [];
    state.budget = 80;
    state.shotsLeft = 20;
    state.score = 0;
    state.goalHealth = 3;
    state.nextBallTimer = 60;
    state.ballInterval = 120;
    state.particles = [];
    state.totalBallsSpawned = 0;
  }

  function startGame() {
    state.mode = 'playing';
    resetGame();
    overlay.classList.add('hidden');
    updateHud();
  }

  function updateHud() {
    hudScore.textContent = 'Score: ' + state.score;
    hudBudget.textContent = 'Budget: $' + state.budget;
    hudHealth.textContent = 'Health: ' + state.goalHealth;
  }

  function showOverlay(title, details, buttonText) {
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<h1>' + title + '</h1>' +
      (details ? details.map(function (d) { return '<p>' + d + '</p>'; }).join('') : '') +
      '<button id="replay-btn">' + buttonText + '</button>';
    document.getElementById('replay-btn').addEventListener('click', startGame);
  }

  function addParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      state.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 20 + Math.random() * 20,
        color: color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  function updateParticles() {
    for (var i = state.particles.length - 1; i >= 0; i--) {
      var p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function drawParticles() {
    state.particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / 30);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  function spawnBall() {
    if (state.totalBallsSpawned >= 20) return;
    state.totalBallsSpawned++;
    var sx = 40 + Math.random() * (W - 80);
    var baseSpeed = 1.5 + (state.totalBallsSpawned - 1) * 0.12;
    var angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    state.incomingBalls.push({
      x: sx,
      y: 0,
      vx: Math.cos(angle) * baseSpeed * 0.3,
      vy: Math.sin(angle) * baseSpeed,
      r: 8,
      active: true,
    });
    state.shotsLeft = 20 - state.totalBallsSpawned;
  }

  function updateBalls(dt) {
    for (var i = state.incomingBalls.length - 1; i >= 0; i--) {
      var b = state.incomingBalls[i];
      if (!b.active) continue;

      b.x += b.vx * dt * 60;
      b.y += b.vy * dt * 60;

      // collision with grid defenders
      var col = Math.floor(b.x / CELL_W);
      var row = Math.floor((b.y) / CELL_H);
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS && state.grid[row][col] === 1) {
        b.vy = -Math.abs(b.vy) * 0.8;
        b.y = row * CELL_H + CELL_H;
        state.grid[row][col] = 0;
        state.defenders = state.defenders.filter(function (d) { return !(d.row === row && d.col === col); });
        state.score += 5;
        addParticles(b.x, b.y, '#22d3ee', 10);
        updateHud();
        continue;
      }

      // bounce off walls
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }

      // reached goal
      if (b.y >= GOAL_Y) {
        if (b.x > GOAL_LEFT && b.x < GOAL_RIGHT) {
          state.goalHealth--;
          addParticles(b.x, GOAL_Y, '#ef4444', 15);
        }
        b.active = false;
        updateHud();

        if (state.goalHealth <= 0) {
          state.mode = 'gameover';
          showOverlay('GAME OVER', [
            'Balls survived: ' + (20 - state.totalBallsSpawned + (b.active ? 0 : 1)),
            'Score: ' + state.score,
          ], 'PLAY AGAIN');
          return;
        }
      }
    }

    state.incomingBalls = state.incomingBalls.filter(function (b) { return b.active; });
  }

  function checkWin() {
    if (state.totalBallsSpawned >= 20 && state.incomingBalls.length === 0) {
      state.mode = 'gameover';
      var finalScore = 200 + state.score + state.goalHealth * 10;
      state.score = finalScore;
      updateHud();
      showOverlay('VICTORY!', [
        'Survived all 20 balls!',
        'Deflections: ' + Math.floor(state.score / 5),
        'Final Score: ' + finalScore,
      ], 'PLAY AGAIN');
    }
  }

  function drawGrid() {
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(0, 0, W, H - 80);

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = c * CELL_W;
        var y = r * CELL_H;
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.strokeRect(x, y, CELL_W, CELL_H);
      }
    }
  }

  function drawDefenders() {
    state.defenders.forEach(function (d) {
      var x = d.col * CELL_W + 2;
      var y = d.row * CELL_H + 2;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x, y, CELL_W - 4, CELL_H - 4);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛡', x + (CELL_W - 4) / 2, y + (CELL_H - 4) / 2);
    });
  }

  function drawGoal() {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(GOAL_LEFT, GOAL_Y, GOAL_RIGHT - GOAL_LEFT, H - GOAL_Y);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(GOAL_LEFT, GOAL_Y, GOAL_RIGHT - GOAL_LEFT, H - GOAL_Y);

    for (var x = GOAL_LEFT; x <= GOAL_RIGHT; x += 20) {
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, GOAL_Y);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (var y = GOAL_Y; y <= H; y += 20) {
      ctx.beginPath();
      ctx.moveTo(GOAL_LEFT, y);
      ctx.lineTo(GOAL_RIGHT, y);
      ctx.stroke();
    }
  }

  function drawBalls() {
    state.incomingBalls.forEach(function (b) {
      if (!b.active) return;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  function drawPreview() {
    if (state.mode !== 'playing') return;
    ctx.fillStyle = 'rgba(59,130,246,0.3)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (state.grid[r][c] === 0) {
          ctx.fillText('$' + BLOCKER_COST, c * CELL_W + CELL_W / 2, r * CELL_H + CELL_H / 2);
        }
      }
    }
  }

  function placeDefender(mx, my) {
    if (state.mode !== 'playing') return;
    if (my >= H - 80) return;
    var col = Math.floor(mx / CELL_W);
    var row = Math.floor(my / CELL_H);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (state.grid[row][col] === 1) return;
    if (state.budget < BLOCKER_COST) return;

    state.grid[row][col] = 1;
    state.defenders.push({ row: row, col: col });
    state.budget -= BLOCKER_COST;
    updateHud();
  }

  function update(dt) {
    if (state.mode === 'playing') {
      state.nextBallTimer--;
      if (state.nextBallTimer <= 0 && state.totalBallsSpawned < 20) {
        spawnBall();
        state.ballInterval = Math.max(40, 120 - state.totalBallsSpawned * 4);
        state.nextBallTimer = state.ballInterval;
      }
      updateBalls(dt);
      updateParticles();
      checkWin();
    } else {
      updateParticles();
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawGoal();
    drawPreview();
    drawDefenders();
    drawBalls();
    drawParticles();
  }

  function loop(timestamp) {
    var dt = state.lastTime ? (timestamp - state.lastTime) / 1000 : 1 / 60;
    dt = Math.min(dt, 0.05);
    state.lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    var mx = (e.clientX - rect.left) * (W / rect.width);
    var my = (e.clientY - rect.top) * (H / rect.height);
    placeDefender(mx, my);
  });

  startBtn.addEventListener('click', startGame);

  window.render_game_to_text = function () {
    return JSON.stringify({
      mode: state.mode,
      grid: state.grid,
      defenders: state.defenders,
      incomingBalls: state.incomingBalls.map(function (b) {
        return { x: Math.round(b.x), y: Math.round(b.y), active: b.active };
      }),
      budget: state.budget,
      shotsLeft: state.shotsLeft,
      score: state.score,
      goalHealth: state.goalHealth,
      nextBallTimer: state.nextBallTimer,
    });
  };

  window.advanceTime = function (ms) {
    var steps = Math.max(1, Math.round(ms / (1000 / 60)));
    var dt = 1 / 60;
    for (var i = 0; i < steps; i++) {
      update(dt);
    }
    render();
  };

  requestAnimationFrame(loop);
})();
