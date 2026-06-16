(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const hudScore = document.getElementById('score-display');
  const hudRound = document.getElementById('round-display');
  const overlay = document.getElementById('message-overlay');
  const startBtn = document.getElementById('start-btn');
  const powerBarContainer = document.getElementById('power-bar-container');
  const powerBar = document.getElementById('power-bar');

  const GOAL_WIDTH = 260;
  const GOAL_HEIGHT = 140;
  const GOAL_X = (W - GOAL_WIDTH) / 2;
  const GOAL_Y = 80;
  const POST_WIDTH = 8;
  const CROSSBAR_HEIGHT = 10;

  const KEEPER_WIDTH = 40;
  const KEEPER_HEIGHT = 80;

  const BALL_RADIUS = 8;
  const BALL_START_X = W / 2;
  const BALL_START_Y = H - 60;

  const CROSSHAIR_SIZE = 16;

  var gameMode = 'duel';
  var visualStyle = 'stick';

  const state = {
    mode: 'start',
    gameMode: 'duel',
    round: 1,
    maxRounds: 5,
    score: 0,
    goalsScored: 0,
    playerWins: 0,
    keeperWins: 0,
    mouseX: W / 2,
    mouseY: H / 2,
    crosshairX: W / 2,
    crosshairY: H / 2,
    ball: { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, active: false, scored: false, saved: false, targetX: 0, targetY: 0 },
    keeper: { x: W / 2, y: GOAL_Y + GOAL_HEIGHT - KEEPER_HEIGHT, targetX: W / 2, targetY: GOAL_Y + GOAL_HEIGHT - KEEPER_HEIGHT, diving: false, diveDir: 0, diveVY: 0, speed: 2, diveAngle: 0 },
    shootPhase: 'aim',
    shootTimer: 0,
    resultTimer: 0,
    resultMessage: '',
    difficulty: 1,
    lastTime: 0,
    particles: [],
    crosshairTargetX: W / 2,
    crosshairTargetY: H / 2,
  };

  var powerCharging = false;
  var powerLevel = 0;
  var CHARGE_SPEED = 1 / (1.5 * 60);
  var OPTIMAL_MIN = 0.6;
  var OPTIMAL_MAX = 0.8;

  document.querySelectorAll('.mode-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.mode-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      gameMode = btn.dataset.mode;
    });
  });

  document.querySelectorAll('.style-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.style-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      visualStyle = btn.dataset.style;
    });
  });

  function resetBall() {
    state.ball = { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, active: false, scored: false, saved: false, targetX: 0, targetY: 0 };
    state.shootPhase = 'aim';
    state.shootTimer = 0;
    state.resultTimer = 0;
    state.resultMessage = '';
    state.keeper.diving = false;
    state.keeper.diveDir = 0;
    state.keeper.x = W / 2;
    state.keeper.targetX = W / 2;
    state.keeper.y = GOAL_Y + GOAL_HEIGHT - KEEPER_HEIGHT;
    state.keeper.targetY = GOAL_Y + GOAL_HEIGHT - KEEPER_HEIGHT;
    state.keeper.diveAngle = 0;
    powerBarContainer.style.display = 'none';
  }

  function startGame() {
    state.mode = 'playing';
    state.gameMode = gameMode;
    state.round = 1;
    state.maxRounds = gameMode === 'duel' ? 5 : Infinity;
    state.score = 0;
    state.goalsScored = 0;
    state.playerWins = 0;
    state.keeperWins = 0;
    state.difficulty = 1;
    resetBall();
    overlay.classList.add('hidden');
    updateHud();
  }

  function updateHud() {
    hudScore.textContent = 'Score: ' + state.score;
    if (state.gameMode === 'duel') {
      hudRound.textContent = 'Round: ' + state.round + '/5';
    } else {
      hudRound.textContent = 'Streak: ' + state.goalsScored;
    }
  }

  function showOverlay(title, subtitle, details, buttonText, btnAction) {
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<h1>' + title + '</h1>' +
      (subtitle ? '<h2>' + subtitle + '</h2>' : '') +
      (details ? details.map(function (d) { return '<p>' + d + '</p>'; }).join('') : '') +
      '<div class="selector-row"><label>Mode:</label><button class="mode-btn' + (gameMode === 'duel' ? ' active' : '') + '" data-mode="duel">Duel</button><button class="mode-btn' + (gameMode === 'marathon' ? ' active' : '') + '" data-mode="marathon">Marathon</button></div>' +
      '<div class="selector-row"><label>Style:</label><button class="style-btn' + (visualStyle === 'stick' ? ' active' : '') + '" data-style="stick">Stick</button><button class="style-btn' + (visualStyle === 'glossy' ? ' active' : '') + '" data-style="glossy">Glossy</button></div>' +
      '<button id="' + (btnAction === 'start' ? 'start-btn' : 'replay-btn') + '">' + buttonText + '</button>';
    var btn = document.getElementById(btnAction === 'start' ? 'start-btn' : 'replay-btn');
    btn.addEventListener('click', startGame);
    overlay.querySelectorAll('.mode-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        overlay.querySelectorAll('.mode-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        gameMode = b.dataset.mode;
      });
    });
    overlay.querySelectorAll('.style-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        overlay.querySelectorAll('.style-btn').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        visualStyle = b.dataset.style;
      });
    });
  }

  function endRound(scored) {
    state.mode = 'result';
    if (scored) {
      state.goalsScored++;
      state.playerWins++;
      state.resultMessage = 'GOAL!';
      state.score = state.goalsScored;
    } else {
      state.keeperWins++;
      state.resultMessage = 'SAVED!';
    }
    updateHud();
    state.resultTimer = 120;
  }

  function nextRoundOrEnd() {
    if (state.gameMode === 'duel') {
      if (state.round >= 5) {
        state.mode = 'gameover';
        var msg = state.goalsScored > 2 ? 'YOU WIN!' : 'YOU LOSE!';
        var details = ['Goals: ' + state.goalsScored + ' / 5', state.goalsScored > 2 ? 'Great shooting!' : 'Better luck next time!'];
        showOverlay(msg, 'Game Over', details, 'PLAY AGAIN', 'replay');
        saveScore();
      } else {
        state.round++;
        state.difficulty = 1 + (state.round - 1) * 0.6;
        updateHud();
        showGetReady();
      }
    } else {
      if (!state.ball.scored) {
        state.mode = 'gameover';
        showOverlay('GAME OVER', 'Marathon ended', ['Score: ' + state.score, 'Streak: ' + state.goalsScored], 'PLAY AGAIN', 'replay');
        saveScore();
      } else {
        state.round++;
        state.difficulty = 1 + (state.round - 1) * 0.15;
        updateHud();
        showGetReady();
      }
    }
  }

  function showGetReady() {
    state.mode = 'getready';
    overlay.classList.remove('hidden');
    var roundText = state.gameMode === 'duel' ? 'Round ' + state.round + ' of 5' : 'Kick #' + state.round;
    overlay.innerHTML = '<h1>Get Ready</h1><h2>' + roundText + '</h2>';
    setTimeout(function () {
      resetBall();
      overlay.classList.add('hidden');
      state.mode = 'playing';
    }, 1200);
  }

  function saveScore() {
    if (typeof Leaderboard !== 'undefined') {
      var gameId = state.gameMode === 'duel' ? 'penalty-kick-duel' : 'penalty-marathon';
      Leaderboard.promptName(function (name) {
        Leaderboard.addScore(gameId, state.score, name);
        Leaderboard.renderLeaderboard(gameId, 'leaderboard-container', state.score);
      });
    }
  }

  function addParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      state.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6 - 2,
        life: 30 + Math.random() * 20,
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
      p.vy += 0.15;
      p.life--;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function drawParticles() {
    state.particles.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, p.life / 40);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  function drawPitch() {
    if (visualStyle === 'glossy') {
      var grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#1a5c2a');
      grad.addColorStop(1, '#0d3318');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (var y = 0; y < H; y += 40) {
        if ((y / 40) % 2 === 0) ctx.fillRect(0, y, W, 40);
      }
    } else {
      ctx.fillStyle = '#2d5a27';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#3a7a32';
      for (var y = 0; y < H; y += 40) {
        if ((y / 40) % 2 === 0) ctx.fillRect(0, y, W, 40);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(W / 2, H);
    ctx.lineTo(W / 2, GOAL_Y + GOAL_HEIGHT + 20);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(GOAL_X - 20, H - 30, GOAL_WIDTH + 40, 30);
  }

  function drawGoal() {
    if (visualStyle === 'glossy') {
      var postGrad = ctx.createLinearGradient(0, GOAL_Y, 0, GOAL_Y + GOAL_HEIGHT);
      postGrad.addColorStop(0, '#fff');
      postGrad.addColorStop(1, '#ccc');
      ctx.fillStyle = postGrad;
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.fillRect(GOAL_X - POST_WIDTH, GOAL_Y, POST_WIDTH, GOAL_HEIGHT + 10);
    ctx.fillRect(GOAL_X + GOAL_WIDTH, GOAL_Y, POST_WIDTH, GOAL_HEIGHT + 10);
    ctx.fillRect(GOAL_X - POST_WIDTH, GOAL_Y - CROSSBAR_HEIGHT, GOAL_WIDTH + POST_WIDTH * 2, CROSSBAR_HEIGHT);
    ctx.fillStyle = 'rgba(200,220,255,0.12)';
    ctx.fillRect(GOAL_X, GOAL_Y, GOAL_WIDTH, GOAL_HEIGHT);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    var netSpacing = 20;
    for (var x = GOAL_X; x <= GOAL_X + GOAL_WIDTH; x += netSpacing) {
      ctx.beginPath(); ctx.moveTo(x, GOAL_Y); ctx.lineTo(x, GOAL_Y + GOAL_HEIGHT); ctx.stroke();
    }
    for (var y = GOAL_Y; y <= GOAL_Y + GOAL_HEIGHT; y += netSpacing) {
      ctx.beginPath(); ctx.moveTo(GOAL_X, y); ctx.lineTo(GOAL_X + GOAL_WIDTH, y); ctx.stroke();
    }
  }

  function drawKeeperStick() {
    var kx = state.keeper.x;
    var ky = state.keeper.y;
    var diveAngle = state.keeper.diving ? (state.keeper.diveAngle || 0) * 0.4 : 0;
    var diveProgress = state.keeper.diving ? Math.min(1, Math.abs(kx - W / 2) / 80) : 0;
    var armExtend = 10 + diveProgress * 35;

    ctx.save();
    ctx.translate(kx, ky + KEEPER_HEIGHT / 2);
    ctx.rotate(diveAngle);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(0, -KEEPER_HEIGHT / 2 - 8, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -KEEPER_HEIGHT / 2 + 2);
    ctx.lineTo(0, 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(-10, 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(10, 35);
    ctx.stroke();

    ctx.strokeStyle = '#f44';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -KEEPER_HEIGHT / 2 + 8);
    ctx.lineTo(-armExtend, -5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -KEEPER_HEIGHT / 2 + 8);
    ctx.lineTo(armExtend, -5);
    ctx.stroke();

    ctx.restore();
  }

  function drawKeeperGlossy() {
    var kx = state.keeper.x;
    var ky = state.keeper.y;
    var KW = KEEPER_WIDTH;
    var KH = KEEPER_HEIGHT;
    var diveAngle = state.keeper.diving ? (state.keeper.diveAngle || 0) * 0.4 : 0;
    var diveProgress = state.keeper.diving ? Math.min(1, Math.abs(kx - W / 2) / 80) : 0;
    var armExtend = 10 + diveProgress * 35;

    ctx.save();
    ctx.translate(kx, ky + KH / 2);
    ctx.rotate(diveAngle);

    var bodyGrad = ctx.createLinearGradient(-KW / 2, -KH / 2, KW / 2, KH / 2);
    bodyGrad.addColorStop(0, '#ff6b35');
    bodyGrad.addColorStop(1, '#d32f2f');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-KW / 2, -KH / 2, KW, KH * 0.5);

    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, -KH / 2 - 8, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.fillRect(-8, -KH / 2 - 14, 16, 6);

    ctx.fillStyle = '#f44';
    ctx.fillRect(-KW / 2 - armExtend, -5, armExtend, 8);
    ctx.fillRect(KW / 2, -5, armExtend, 8);

    ctx.fillStyle = '#222';
    ctx.fillRect(-10, KH * 0.1, 9, KH * 0.4);
    ctx.fillRect(1, KH * 0.1, 9, KH * 0.4);

    ctx.restore();
  }

  function drawKeeper() {
    if (visualStyle === 'glossy') drawKeeperGlossy();
    else drawKeeperStick();
  }

  function drawBall() {
    var b = state.ball;
    if (visualStyle === 'glossy') {
      var ballGrad = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BALL_RADIUS);
      ballGrad.addColorStop(0, '#fff');
      ballGrad.addColorStop(1, '#ccc');
      ctx.fillStyle = ballGrad;
    } else {
      ctx.fillStyle = '#fff';
    }
    ctx.beginPath();
    ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(b.x - 2, b.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCrosshair() {
    var cx = state.crosshairX;
    var cy = state.crosshairY;
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - CROSSHAIR_SIZE, cy);
    ctx.lineTo(cx + CROSSHAIR_SIZE, cy);
    ctx.moveTo(cx, cy - CROSSHAIR_SIZE);
    ctx.lineTo(cx, cy + CROSSHAIR_SIZE);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,68,68,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, CROSSHAIR_SIZE - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawResultMessage() {
    if (state.resultMessage && state.resultTimer > 0) {
      var alpha = Math.min(1, state.resultTimer / 30);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = state.resultMessage === 'GOAL!' ? '#4caf50' : '#f44336';
      ctx.font = 'bold 64px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(state.resultMessage, W / 2, H / 2);
      ctx.globalAlpha = 1;
    }
  }

  function drawStartScreen() { drawPitch(); drawGoal(); drawBall(); drawCrosshair(); }
  function drawPlaying() { drawPitch(); drawGoal(); drawKeeper(); drawBall(); if (state.shootPhase === 'aim') drawCrosshair(); drawParticles(); drawResultMessage(); }
  function drawGameOver() { drawPitch(); drawGoal(); drawParticles(); }

  function updateKeeper(dt) {
    if (!state.keeper.diving) return;
    var speed = state.keeper.speed * state.difficulty;
    var dx = state.keeper.targetX - state.keeper.x;
    var dy = state.keeper.targetY - state.keeper.y;
    var ease = 0.12 + state.difficulty * 0.03;
    state.keeper.x += dx * ease * speed * dt * 60;
    state.keeper.y += dy * ease * speed * dt * 60;
    state.keeper.diveAngle = Math.atan2(dy, dx);
  }

  function updateBall(dt) {
    var b = state.ball;
    if (!b.active) return;
    b.x += b.vx * dt * 60;
    b.y += b.vy * dt * 60;

    var goalTop = GOAL_Y;
    var goalBottom = GOAL_Y + GOAL_HEIGHT;
    var inGoalX = b.x > GOAL_X + 5 && b.x < GOAL_X + GOAL_WIDTH - 5;
    var inGoalY = b.y >= goalTop - 5 && b.y <= goalBottom + 5;
    var reachedGoalArea = inGoalX && inGoalY;
    var dx = b.x - b.targetX;
    var dy = b.y - b.targetY;
    var distToTarget = Math.sqrt(dx * dx + dy * dy);

    if (distToTarget < 15 || (reachedGoalArea && b.vy < 0 && b.y <= goalTop + 20)) {
      var kx = state.keeper.x;
      var ky = state.keeper.y;
      var keeperHalfW = KEEPER_WIDTH / 2 + 12;
      var keeperHalfH = KEEPER_HEIGHT / 2 + 12;
      var distToKeeperX = Math.abs(b.x - kx);
      var distToKeeperY = Math.abs(b.y - (ky + KEEPER_HEIGHT / 2));

      if (distToKeeperX < keeperHalfW && distToKeeperY < keeperHalfH && state.keeper.diving) {
        b.active = false; b.saved = true;
        addParticles(b.x, b.y, '#ff9800', 15);
        endRound(false);
      } else if (reachedGoalArea || distToTarget < 15) {
        b.active = false; b.scored = true;
        addParticles(b.x, b.y, '#4caf50', 25);
        endRound(true);
      }
    }
    if (b.y < -30 || b.x < -30 || b.x > W + 30 || b.y > H + 30) {
      b.active = false;
      addParticles(b.x, b.y, '#f44336', 10);
      endRound(false);
    }
  }

  function getPowerMultiplier(p) {
    if (p < OPTIMAL_MIN) return 0.5 + (p / OPTIMAL_MIN) * 0.4;
    if (p <= OPTIMAL_MAX) return 0.9 + ((p - OPTIMAL_MIN) / (OPTIMAL_MAX - OPTIMAL_MIN)) * 0.2;
    return 1.0 + (p - OPTIMAL_MAX) * 0.5;
  }

  function shoot() {
    var targetX = state.crosshairX;
    var targetY = state.crosshairY;
    var powerHeightBoost = 0;
    if (powerLevel < OPTIMAL_MIN) powerHeightBoost = (1 - powerLevel / OPTIMAL_MIN) * 80;
    else if (powerLevel > OPTIMAL_MAX) powerHeightBoost = -((powerLevel - OPTIMAL_MAX) / (1 - OPTIMAL_MAX)) * 60;
    var adjustedTargetY = targetY + powerHeightBoost;

    var dx = targetX - BALL_START_X;
    var dy = adjustedTargetY - BALL_START_Y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var speed = 8 + Math.random() * 2;
    var mult = getPowerMultiplier(powerLevel);

    state.ball.vx = (dx / dist) * speed * mult;
    state.ball.vy = (dy / dist) * speed * mult;
    state.ball.targetX = targetX;
    state.ball.targetY = adjustedTargetY;

    if (powerLevel > OPTIMAL_MAX) {
      state.ball.vy -= ((powerLevel - OPTIMAL_MAX) / (1 - OPTIMAL_MAX)) * 3;
    }
    state.ball.active = true;
    state.shootPhase = 'shooting';
    state.shootTimer = 0;

    var keeperBiasX = (targetX - W / 2) / (GOAL_WIDTH / 2);
    var keeperBiasY = (targetY - (GOAL_Y + GOAL_HEIGHT / 2)) / (GOAL_HEIGHT / 2);
    var accuracy = 0.3 + state.difficulty * 0.12;
    var diveChoice = Math.random();

    if (diveChoice < 0.5) {
      state.keeper.targetX = W / 2 + keeperBiasX * 80 * accuracy + (Math.random() - 0.5) * (50 - state.difficulty * 5);
      state.keeper.targetY = (GOAL_Y + GOAL_HEIGHT / 2) + keeperBiasY * 40 * accuracy + (Math.random() - 0.5) * (30 - state.difficulty * 3);
    } else if (diveChoice < 0.8) {
      state.keeper.targetX = W / 2 + (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 30);
      state.keeper.targetY = GOAL_Y + 20 + Math.random() * (GOAL_HEIGHT - 40);
    } else {
      state.keeper.targetX = W / 2 + keeperBiasX * 30 + (Math.random() - 0.5) * 40;
      state.keeper.targetY = (GOAL_Y + GOAL_HEIGHT / 2) + keeperBiasY * 20 + (Math.random() - 0.5) * 20;
    }
    state.keeper.targetX = Math.max(GOAL_X + 20, Math.min(GOAL_X + GOAL_WIDTH - 20, state.keeper.targetX));
    state.keeper.targetY = Math.max(GOAL_Y + 5, Math.min(GOAL_Y + GOAL_HEIGHT - KEEPER_HEIGHT - 5, state.keeper.targetY));
    state.keeper.diving = true;
    state.keeper.diveDir = state.keeper.targetX > state.keeper.x ? 1 : -1;
    state.keeper.speed = 2.5 + state.difficulty * 1.0;
  }

  function update(timestamp) {
    var dt = state.lastTime ? (timestamp - state.lastTime) / 1000 : 1 / 60;
    dt = Math.min(dt, 0.05);
    state.lastTime = timestamp;

    state.crosshairX += (state.crosshairTargetX - state.crosshairX) * 0.15;
    state.crosshairY += (state.crosshairTargetY - state.crosshairY) * 0.15;

    if (powerCharging && state.shootPhase === 'aim') {
      powerLevel = Math.min(1, powerLevel + CHARGE_SPEED);
      powerBar.style.width = (powerLevel * 100) + '%';
      powerBar.style.background = powerLevel < OPTIMAL_MIN ? '#ff9800' : powerLevel <= OPTIMAL_MAX ? '#4caf50' : '#f44336';
    }

    if (state.mode === 'playing' || state.mode === 'result') {
      updateKeeper(dt);
      updateBall(dt);
      updateParticles();
      if (state.mode === 'result' && state.resultTimer > 0) {
        state.resultTimer--;
        if (state.resultTimer <= 0) nextRoundOrEnd();
      }
    } else if (state.mode === 'start' || state.mode === 'gameover') {
      updateParticles();
    }

    render();
    requestAnimationFrame(update);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (state.mode === 'start') drawStartScreen();
    else if (state.mode === 'playing' || state.mode === 'result' || state.mode === 'getready') drawPlaying();
    else if (state.mode === 'gameover') drawGameOver();
  }

  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    state.crosshairTargetX = (e.clientX - rect.left) * (W / rect.width);
    state.crosshairTargetY = (e.clientY - rect.top) * (H / rect.height);
  });

  canvas.addEventListener('mousedown', function (e) {
    if (state.mode === 'start' || state.mode === 'gameover') return;
    if (state.mode === 'playing' && state.shootPhase === 'aim') {
      var rect = canvas.getBoundingClientRect();
      state.crosshairTargetX = (e.clientX - rect.left) * (W / rect.width);
      state.crosshairTargetY = (e.clientY - rect.top) * (H / rect.height);
      powerCharging = true;
      powerLevel = 0;
      powerBarContainer.style.display = 'block';
    }
  });

  canvas.addEventListener('mouseup', function () {
    if (state.mode === 'playing' && state.shootPhase === 'aim' && powerCharging) {
      powerCharging = false;
      shoot();
      powerBarContainer.style.display = 'none';
    }
  });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (state.mode === 'start' || state.mode === 'gameover') return;
    if (state.mode === 'playing' && state.shootPhase === 'aim') {
      var rect = canvas.getBoundingClientRect();
      var touch = e.touches[0];
      state.crosshairTargetX = (touch.clientX - rect.left) * (W / rect.width);
      state.crosshairTargetY = (touch.clientY - rect.top) * (H / rect.height);
      powerCharging = true;
      powerLevel = 0;
      powerBarContainer.style.display = 'block';
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches[0];
    state.crosshairTargetX = (touch.clientX - rect.left) * (W / rect.width);
    state.crosshairTargetY = (touch.clientY - rect.top) * (H / rect.height);
  }, { passive: false });

  canvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    if (state.mode === 'playing' && state.shootPhase === 'aim' && powerCharging) {
      powerCharging = false;
      shoot();
      powerBarContainer.style.display = 'none';
    }
  }, { passive: false });

  startBtn.addEventListener('click', startGame);

  function renderGameToText() {
    return JSON.stringify({
      mode: state.mode, gameMode: state.gameMode, round: state.round,
      score: state.score, goalsScored: state.goalsScored,
      shootPhase: state.shootPhase, difficulty: Math.round(state.difficulty * 100) / 100,
      ball: { x: Math.round(state.ball.x), y: Math.round(state.ball.y), active: state.ball.active },
      keeper: { x: Math.round(state.keeper.x), y: Math.round(state.keeper.y), diving: state.keeper.diving },
      resultMessage: state.resultMessage,
    });
  }
  window.render_game_to_text = renderGameToText;

  function advanceTime(ms) {
    var steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (var i = 0; i < steps; i++) {
      var dt = 1 / 60;
      state.crosshairX += (state.crosshairTargetX - state.crosshairX) * 0.15;
      state.crosshairY += (state.crosshairTargetY - state.crosshairY) * 0.15;
      if (state.mode === 'playing') {
        updateKeeper(dt); updateBall(dt); updateParticles();
        if (state.mode === 'result' && state.resultTimer > 0) {
          state.resultTimer--;
          if (state.resultTimer <= 0) nextRoundOrEnd();
        }
      } else if (state.mode === 'start' || state.mode === 'gameover') {
        updateParticles();
      }
    }
    render();
  }
  window.advanceTime = advanceTime;

  requestAnimationFrame(update);
})();
