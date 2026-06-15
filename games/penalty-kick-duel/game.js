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

  const state = {
    mode: 'start',
    round: 1,
    score: 0,
    goalsScored: 0,
    playerWins: 0,
    keeperWins: 0,
    mouseX: W / 2,
    mouseY: H / 2,
    crosshairX: W / 2,
    crosshairY: H / 2,
    ball: { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, active: false, scored: false, saved: false },
    keeper: { x: W / 2, y: GOAL_Y + GOAL_HEIGHT - KEEPER_HEIGHT, targetX: W / 2, diving: false, diveDir: 0, speed: 2 },
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

  function resetBall() {
    state.ball = { x: BALL_START_X, y: BALL_START_Y, vx: 0, vy: 0, active: false, scored: false, saved: false };
    state.shootPhase = 'aim';
    state.shootTimer = 0;
    state.resultTimer = 0;
    state.resultMessage = '';
    state.keeper.diving = false;
    state.keeper.diveDir = 0;
    state.keeper.x = W / 2;
    state.keeper.targetX = W / 2;
    powerBarContainer.style.display = 'none';
  }

  function startGame() {
    state.mode = 'playing';
    state.round = 1;
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
    hudRound.textContent = 'Round: ' + state.round + '/5';
  }

  function showOverlay(title, subtitle, details, buttonText, btnAction) {
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<h1>' + title + '</h1>' +
      (subtitle ? '<h2>' + subtitle + '</h2>' : '') +
      (details ? details.map(function (d) { return '<p>' + d + '</p>'; }).join('') : '') +
      '<button id="' + (btnAction === 'start' ? 'start-btn' : 'replay-btn') + '">' + buttonText + '</button>';
    var btn = document.getElementById(btnAction === 'start' ? 'start-btn' : 'replay-btn');
    btn.addEventListener('click', btnAction === 'start' ? startGame : startGame);
  }

  function endRound(scored) {
    state.mode = 'result';
    if (scored) {
      state.goalsScored++;
      state.playerWins++;
      state.resultMessage = 'GOAL!';
    } else {
      state.keeperWins++;
      state.resultMessage = 'SAVED!';
    }
    state.score = state.goalsScored;
    updateHud();

    state.resultTimer = 120;
  }

  function nextRoundOrEnd() {
    if (state.round >= 5) {
      state.mode = 'gameover';
      var msg = state.goalsScored > 2 ? 'YOU WIN!' : 'YOU LOSE!';
      var details = [
        'Goals: ' + state.goalsScored + ' / 5',
        state.goalsScored > 2 ? 'Great shooting!' : 'Better luck next time!'
      ];
      showOverlay(msg, 'Game Over', details, 'PLAY AGAIN', 'replay');
    } else {
      state.round++;
      state.difficulty = 1 + (state.round - 1) * 0.4;
      updateHud();
      showGetReady();
    }
  }

  function showGetReady() {
    state.mode = 'getready';
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<h1>Get Ready</h1><h2>Round ' + state.round + ' of 5</h2>';
    setTimeout(function () {
      resetBall();
      overlay.classList.add('hidden');
      state.mode = 'playing';
    }, 1200);
  }

  function addParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      state.particles.push({
        x: x,
        y: y,
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
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
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
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#3a7a32';
    for (var y = 0; y < H; y += 40) {
      if ((y / 40) % 2 === 0) {
        ctx.fillRect(0, y, W, 40);
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(GOAL_X - POST_WIDTH, GOAL_Y, POST_WIDTH, GOAL_HEIGHT + 10);
    ctx.fillRect(GOAL_X + GOAL_WIDTH, GOAL_Y, POST_WIDTH, GOAL_HEIGHT + 10);
    ctx.fillRect(GOAL_X - POST_WIDTH, GOAL_Y - CROSSBAR_HEIGHT, GOAL_WIDTH + POST_WIDTH * 2, CROSSBAR_HEIGHT);

    ctx.fillStyle = 'rgba(200,220,255,0.12)';
    ctx.fillRect(GOAL_X, GOAL_Y, GOAL_WIDTH, GOAL_HEIGHT);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    var netSpacing = 20;
    for (var x = GOAL_X; x <= GOAL_X + GOAL_WIDTH; x += netSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, GOAL_Y);
      ctx.lineTo(x, GOAL_Y + GOAL_HEIGHT);
      ctx.stroke();
    }
    for (var y = GOAL_Y; y <= GOAL_Y + GOAL_HEIGHT; y += netSpacing) {
      ctx.beginPath();
      ctx.moveTo(GOAL_X, y);
      ctx.lineTo(GOAL_X + GOAL_WIDTH, y);
      ctx.stroke();
    }
  }

  function drawKeeper() {
    var kx = state.keeper.x;
    var ky = state.keeper.y;
    var KW = KEEPER_WIDTH;
    var KH = KEEPER_HEIGHT;

    ctx.fillStyle = '#ff9800';
    ctx.fillRect(kx - KW / 2, ky, KW, KH * 0.45);

    ctx.fillStyle = '#ffcc80';
    ctx.fillRect(kx - 8, ky - 14, 16, 16);

    ctx.fillStyle = '#333';
    ctx.fillRect(kx - 10, ky - 18, 20, 6);

    ctx.fillStyle = '#ff9800';
    var armSpread = state.keeper.diving ? 25 : 8;
    var armAngle = state.keeper.diving ? (state.keeper.diveDir > 0 ? 0.5 : -0.5) : 0;
    ctx.save();
    ctx.translate(kx - KW / 2, ky + 10);
    ctx.rotate(armAngle);
    ctx.fillRect(-armSpread, -4, armSpread, 8);
    ctx.restore();
    ctx.save();
    ctx.translate(kx + KW / 2, ky + 10);
    ctx.rotate(-armAngle);
    ctx.fillRect(0, -4, armSpread, 8);
    ctx.restore();

    ctx.fillStyle = '#222';
    ctx.fillRect(kx - 10, ky + KH * 0.45, 9, KH * 0.55);
    ctx.fillRect(kx + 1, ky + KH * 0.45, 9, KH * 0.55);
  }

  function drawBall() {
    var b = state.ball;
    ctx.fillStyle = '#fff';
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

  function drawStartScreen() {
    drawPitch();
    drawGoal();
    drawBall();
    drawCrosshair();
  }

  function drawPlaying() {
    drawPitch();
    drawGoal();
    drawKeeper();
    drawBall();
    if (state.shootPhase === 'aim') {
      drawCrosshair();
    }
    drawParticles();
    drawResultMessage();
  }

  function drawGameOver() {
    drawPitch();
    drawGoal();
    drawParticles();
  }

  function updateKeeper(dt) {
    if (!state.keeper.diving) return;
    var speed = state.keeper.speed * state.difficulty;
    var dx = state.keeper.targetX - state.keeper.x;
    if (Math.abs(dx) > 1) {
      state.keeper.x += Math.sign(dx) * speed * dt * 60;
    }
  }

  function updateBall(dt) {
    var b = state.ball;
    if (!b.active) return;

    b.x += b.vx * dt * 60;
    b.y += b.vy * dt * 60;

    var goalCenterX = GOAL_X + GOAL_WIDTH / 2;
    var goalBottom = GOAL_Y + GOAL_HEIGHT;
    var inGoalX = b.x > GOAL_X + 10 && b.x < GOAL_X + GOAL_WIDTH - 10;
    var reachedGoalLine = b.y <= goalBottom + 5;

    if (reachedGoalLine && inGoalX) {
      var kx = state.keeper.x;
      var keeperLeft = kx - KEEPER_WIDTH / 2 - 10;
      var keeperRight = kx + KEEPER_WIDTH / 2 + 10;
      var keeperTop = state.keeper.y - 10;
      var keeperBottom = state.keeper.y + KEEPER_HEIGHT + 10;

      if (b.x > keeperLeft && b.x < keeperRight && b.y > keeperTop && b.y < keeperBottom && state.keeper.diving) {
        b.active = false;
        b.saved = true;
        addParticles(b.x, b.y, '#ff9800', 15);
        endRound(false);
      } else {
        b.active = false;
        b.scored = true;
        addParticles(b.x, b.y, '#4caf50', 25);
        endRound(true);
      }
    }

    if (b.y < -20 || b.x < -20 || b.x > W + 20) {
      b.active = false;
      addParticles(b.x, b.y, '#f44336', 10);
      endRound(false);
    }
  }

  function shoot() {
    var targetX = state.crosshairX;
    var targetY = state.crosshairY;

    var dx = targetX - BALL_START_X;
    var dy = targetY - BALL_START_Y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var speed = 8 + Math.random() * 2;

    state.ball.vx = (dx / dist) * speed;
    state.ball.vy = (dy / dist) * speed;
    state.ball.active = true;

    state.shootPhase = 'shooting';
    state.shootTimer = 0;

    var keeperBias = (targetX - W / 2) / (GOAL_WIDTH / 2);
    var diveChoice = Math.random();
    if (diveChoice < 0.35) {
      state.keeper.targetX = W / 2 + keeperBias * 80 + (Math.random() - 0.5) * 60;
    } else if (diveChoice < 0.65) {
      state.keeper.targetX = W / 2 + (Math.random() > 0.5 ? 1 : -1) * (60 + Math.random() * 40);
    } else {
      state.keeper.targetX = W / 2 + (Math.random() - 0.5) * 40;
    }

    state.keeper.targetX = Math.max(GOAL_X + 30, Math.min(GOAL_X + GOAL_WIDTH - 30, state.keeper.targetX));
    state.keeper.diving = true;
    state.keeper.diveDir = state.keeper.targetX > state.keeper.x ? 1 : -1;
    state.keeper.speed = 2 + state.difficulty * 0.8;
  }

  var powerCharging = false;
  var powerDir = 1;

  function update(timestamp) {
    var dt = state.lastTime ? (timestamp - state.lastTime) / 1000 : 1 / 60;
    dt = Math.min(dt, 0.05);
    state.lastTime = timestamp;

    state.crosshairX += (state.crosshairTargetX - state.crosshairX) * 0.15;
    state.crosshairY += (state.crosshairTargetY - state.crosshairY) * 0.15;

    if (state.mode === 'playing' || state.mode === 'result') {
      updateKeeper(dt);
      updateBall(dt);
      updateParticles();

      if (state.mode === 'result' && state.resultTimer > 0) {
        state.resultTimer--;
        if (state.resultTimer <= 0) {
          nextRoundOrEnd();
        }
      }
    } else if (state.mode === 'start' || state.mode === 'gameover') {
      updateParticles();
    }

    render();
    requestAnimationFrame(update);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    if (state.mode === 'start') {
      drawStartScreen();
    } else if (state.mode === 'playing' || state.mode === 'result' || state.mode === 'getready') {
      drawPlaying();
    } else if (state.mode === 'gameover') {
      drawGameOver();
    }
  }

  canvas.addEventListener('mousemove', function (e) {
    var rect = canvas.getBoundingClientRect();
    state.crosshairTargetX = (e.clientX - rect.left) * (W / rect.width);
    state.crosshairTargetY = (e.clientY - rect.top) * (H / rect.height);
  });

  canvas.addEventListener('click', function (e) {
    if (state.mode === 'start' || state.mode === 'gameover') return;

    if (state.mode === 'playing' && state.shootPhase === 'aim') {
      var rect = canvas.getBoundingClientRect();
      state.crosshairTargetX = (e.clientX - rect.left) * (W / rect.width);
      state.crosshairTargetY = (e.clientY - rect.top) * (H / rect.height);
      shoot();
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
      shoot();
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches[0];
    state.crosshairTargetX = (touch.clientX - rect.left) * (W / rect.width);
    state.crosshairTargetY = (touch.clientY - rect.top) * (H / rect.height);
  }, { passive: false });

  startBtn.addEventListener('click', startGame);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) {
        canvas.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen();
      }
    }
  });

  function renderGameToText() {
    var keeperZone = 'center';
    if (state.keeper.x < W / 2 - 30) keeperZone = 'left';
    else if (state.keeper.x > W / 2 + 30) keeperZone = 'right';

    var ballZone = 'center';
    if (state.ball.x < GOAL_X + GOAL_WIDTH * 0.33) ballZone = 'left';
    else if (state.ball.x > GOAL_X + GOAL_WIDTH * 0.67) ballZone = 'right';

    return JSON.stringify({
      mode: state.mode,
      round: state.round,
      score: state.score,
      goalsScored: state.goalsScored,
      shootPhase: state.shootPhase,
      ball: {
        x: Math.round(state.ball.x),
        y: Math.round(state.ball.y),
        active: state.ball.active,
        scored: state.ball.scored,
        saved: state.ball.saved,
        zone: ballZone,
      },
      crosshair: {
        x: Math.round(state.crosshairX),
        y: Math.round(state.crosshairY),
      },
      keeper: {
        x: Math.round(state.keeper.x),
        y: Math.round(state.keeper.y),
        diving: state.keeper.diving,
        zone: keeperZone,
        speed: Math.round(state.keeper.speed * 100) / 100,
      },
      difficulty: Math.round(state.difficulty * 100) / 100,
      resultMessage: state.resultMessage,
    });
  }
  window.render_game_to_text = renderGameToText;

  function advanceTime(ms) {
    var steps = Math.max(1, Math.round(ms / (1000 / 60)));
    var fakeTimestamp = performance.now();
    for (var i = 0; i < steps; i++) {
      fakeTimestamp += 1000 / 60;
      var dt = 1 / 60;

      state.crosshairX += (state.crosshairTargetX - state.crosshairX) * 0.15;
      state.crosshairY += (state.crosshairTargetY - state.crosshairY) * 0.15;

      if (state.mode === 'playing') {
        updateKeeper(dt);
        updateBall(dt);
        updateParticles();

        if (state.mode === 'result' && state.resultTimer > 0) {
          state.resultTimer--;
          if (state.resultTimer <= 0) {
            nextRoundOrEnd();
          }
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
