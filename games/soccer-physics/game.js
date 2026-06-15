(function () {
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var W = canvas.width;
  var H = canvas.height;

  var hudScore = document.getElementById('score-display');
  var hudRound = document.getElementById('round-display');
  var overlay = document.getElementById('message-overlay');
  var startBtn = document.getElementById('start-btn');

  var GRAVITY = 0.2;
  var RESTITUTION = 0.7;
  var PLAYER_R = 12;
  var BALL_R = 8;
  var GOAL_HEIGHT = 50;
  var GOAL_Y = 10;
  var GOAL_LEFT = 180;
  var GOAL_RIGHT = 420;

  var state = {
    mode: 'start',
    player: { x: 300, y: 340, vx: 0, vy: 0, r: PLAYER_R },
    ball: { x: 300, y: 330, r: BALL_R },
    obstacles: [],
    goal: { y: GOAL_Y, left: GOAL_LEFT, right: GOAL_RIGHT, height: GOAL_HEIGHT },
    score: 0,
    round: 1,
    launched: false,
    bounceCount: 0,
    lastTime: 0,
    dragStartX: 0,
    dragStartY: 0,
    dragging: false,
    dragEndX: 0,
    dragEndY: 0,
    settleTimer: 0,
    resultMsg: '',
    resultTimer: 0,
    trail: []
  };

  function generateObstacles(round) {
    var obs = [];
    var count = 2 + round;
    for (var i = 0; i < count; i++) {
      var w = 40 + Math.random() * 60;
      var h = 15 + Math.random() * 25;
      var x = 40 + Math.random() * (W - 80 - w);
      var y = 80 + Math.random() * 200;
      obs.push({ x: x, y: y, w: w, h: h });
    }
    return obs;
  }

  function resetRound() {
    state.player = { x: 300, y: 340, vx: 0, vy: 0, r: PLAYER_R };
    state.ball = { x: 300, y: 330, r: BALL_R };
    state.launched = false;
    state.bounceCount = 0;
    state.dragging = false;
    state.settleTimer = 0;
    state.resultMsg = '';
    state.resultTimer = 0;
    state.trail = [];
    state.obstacles = generateObstacles(state.round);
  }

  function startGame() {
    state.mode = 'playing';
    state.score = 0;
    state.round = 1;
    resetRound();
    overlay.classList.add('hidden');
    updateHud();
  }

  function updateHud() {
    hudScore.textContent = 'Score: ' + state.score;
    hudRound.textContent = 'Round: ' + state.round + '/5';
  }

  function showOverlay(title, subtitle, details, buttonText) {
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<h1>' + title + '</h1>' +
      (subtitle ? '<h2>' + subtitle + '</h2>' : '') +
      (details ? details.map(function (d) { return '<p>' + d + '</p>'; }).join('') : '') +
      '<button id="replay-btn">' + buttonText + '</button>';
    document.getElementById('replay-btn').addEventListener('click', startGame);
  }

  function scored() {
    var pts = 20 + Math.max(0, 10 - state.bounceCount * 2);
    state.score += pts;
    state.resultMsg = 'GOAL! +' + pts;
    state.resultTimer = 90;
    state.mode = 'result';
    updateHud();
  }

  function missed() {
    state.resultMsg = 'MISS!';
    state.resultTimer = 90;
    state.mode = 'result';
  }

  function nextRoundOrEnd() {
    if (state.round >= 5) {
      state.mode = 'gameover';
      showOverlay('GAME OVER', 'Final Score: ' + state.score, ['Rounds: 5/5'], 'PLAY AGAIN');
      if (typeof Leaderboard !== 'undefined') {
        Leaderboard.promptName(function (name) {
          Leaderboard.addScore('soccer-physics', state.score, name);
          Leaderboard.renderLeaderboard('soccer-physics', 'leaderboard-container', state.score);
        });
      }
    } else {
      state.round++;
      resetRound();
      state.mode = 'playing';
      updateHud();
    }
  }

  function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
    var closestX = Math.max(rx, Math.min(cx, rx + rw));
    var closestY = Math.max(ry, Math.min(cy, ry + rh));
    var dx = cx - closestX;
    var dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
  }

  function resolveCircleRect(p, rect, isBounce) {
    var closestX = Math.max(rect.x, Math.min(p.x, rect.x + rect.w));
    var closestY = Math.max(rect.y, Math.min(p.y, rect.y + rect.h));
    var dx = p.x - closestX;
    var dy = p.y - closestY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < p.r && dist > 0) {
      var nx = dx / dist;
      var ny = dy / dist;
      p.x = closestX + nx * p.r;
      p.y = closestY + ny * p.r;
      var dot = p.vx * nx + p.vy * ny;
      if (isBounce) {
        p.vx -= (1 + RESTITUTION) * dot * nx;
        p.vy -= (1 + RESTITUTION) * dot * ny;
        state.bounceCount++;
      } else {
        p.vx = 0;
        p.vy = 0;
      }
      return true;
    }
    return false;
  }

  function physicsStep(dt) {
    if (!state.launched) return;

    var p = state.player;
    var b = state.ball;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += GRAVITY;

    b.x += p.vx * dt * 0.3;
    b.y += p.vy * dt * 0.3;

    if (state.trail.length === 0 || Math.abs(p.x - state.trail[state.trail.length - 1].x) > 3 || Math.abs(p.y - state.trail[state.trail.length - 1].y) > 3) {
      state.trail.push({ x: p.x, y: p.y });
      if (state.trail.length > 50) state.trail.shift();
    }

    if (p.x - p.r < 0) { p.x = p.r; p.vx = Math.abs(p.vx) * RESTITUTION; state.bounceCount++; }
    if (p.x + p.r > W) { p.x = W - p.r; p.vx = -Math.abs(p.vx) * RESTITUTION; state.bounceCount++; }
    if (p.y + p.r > H) { p.y = H - p.r; p.vy = -Math.abs(p.vy) * RESTITUTION; state.bounceCount++; }
    if (p.y - p.r < 0) { p.y = p.r; p.vy = Math.abs(p.vy) * RESTITUTION; state.bounceCount++; }

    for (var i = 0; i < state.obstacles.length; i++) {
      resolveCircleRect(p, state.obstacles[i], true);
    }

    var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed < 0.5) {
      state.settleTimer++;
      if (state.settleTimer > 60) {
        missed();
        return;
      }
    } else {
      state.settleTimer = 0;
    }

    if (p.y < state.goal.y + state.goal.height && p.x > state.goal.left && p.x < state.goal.right) {
      scored();
    }

    if (p.y > H + 50 || p.x < -50 || p.x > W + 50) {
      missed();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#3a7a32';
    for (var y = 0; y < H; y += 40) {
      if ((y / 40) % 2 === 0) ctx.fillRect(0, y, W, 40);
    }

    ctx.fillStyle = 'rgba(100,255,100,0.3)';
    ctx.fillRect(state.goal.left, state.goal.y, state.goal.right - state.goal.left, state.goal.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeRect(state.goal.left, state.goal.y, state.goal.right - state.goal.left, state.goal.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL', W / 2, state.goal.y + 30);

    ctx.fillStyle = '#8B4513';
    for (var i = 0; i < state.obstacles.length; i++) {
      var o = state.obstacles[i];
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
    }

    ctx.strokeStyle = 'rgba(255,200,0,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    for (var j = 0; j < state.trail.length - 1; j++) {
      ctx.beginPath();
      ctx.moveTo(state.trail[j].x, state.trail[j].y);
      ctx.lineTo(state.trail[j + 1].x, state.trail[j + 1].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    if (state.dragging && !state.launched) {
      var dx = state.dragEndX - state.dragStartX;
      var dy = state.dragEndY - state.dragStartY;
      ctx.strokeStyle = 'rgba(255,100,100,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(state.dragStartX, state.dragStartY);
      ctx.lineTo(state.dragEndX, state.dragEndY);
      ctx.stroke();

      var power = Math.min(20, Math.sqrt(dx * dx + dy * dy) / 10);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('Power: ' + power.toFixed(1), (state.dragStartX + state.dragEndX) / 2, (state.dragStartY + state.dragEndY) / 2 - 10);
    }

    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#2196f3';
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚽', state.player.x, state.player.y);

    if (state.resultMsg && state.resultTimer > 0) {
      var alpha = Math.min(1, state.resultTimer / 30);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = state.resultMsg.indexOf('GOAL') >= 0 ? '#4caf50' : '#f44336';
      ctx.font = 'bold 48px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.resultMsg, W / 2, H / 2);
      ctx.globalAlpha = 1;
    }
  }

  function update(timestamp) {
    var dt = state.lastTime ? (timestamp - state.lastTime) / 16.67 : 1;
    dt = Math.min(dt, 3);
    state.lastTime = timestamp;

    if (state.mode === 'playing' && state.launched) {
      physicsStep(dt);
    }

    if (state.mode === 'result') {
      state.resultTimer--;
      if (state.resultTimer <= 0) {
        nextRoundOrEnd();
      }
    }

    draw();
    requestAnimationFrame(update);
  }

  canvas.addEventListener('mousedown', function (e) {
    if (state.mode !== 'playing' || state.launched) return;
    var rect = canvas.getBoundingClientRect();
    state.dragStartX = (e.clientX - rect.left) * (W / rect.width);
    state.dragStartY = (e.clientY - rect.top) * (H / rect.height);
    state.dragEndX = state.dragStartX;
    state.dragEndY = state.dragStartY;
    state.dragging = true;
  });

  canvas.addEventListener('mousemove', function (e) {
    if (!state.dragging) return;
    var rect = canvas.getBoundingClientRect();
    state.dragEndX = (e.clientX - rect.left) * (W / rect.width);
    state.dragEndY = (e.clientY - rect.top) * (H / rect.height);
  });

  canvas.addEventListener('mouseup', function () {
    if (!state.dragging) return;
    state.dragging = false;

    var dx = state.dragEndX - state.dragStartX;
    var dy = state.dragEndY - state.dragStartY;
    var power = Math.min(20, Math.sqrt(dx * dx + dy * dy) / 10);

    if (power < 1) return;

    var angle = Math.atan2(-dy, -dx);
    state.player.vx = Math.cos(angle) * power;
    state.player.vy = Math.sin(angle) * power;
    state.launched = true;
  });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (state.mode !== 'playing' || state.launched) return;
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches[0];
    state.dragStartX = (touch.clientX - rect.left) * (W / rect.width);
    state.dragStartY = (touch.clientY - rect.top) * (H / rect.height);
    state.dragEndX = state.dragStartX;
    state.dragEndY = state.dragStartY;
    state.dragging = true;
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (!state.dragging) return;
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches[0];
    state.dragEndX = (touch.clientX - rect.left) * (W / rect.width);
    state.dragEndY = (touch.clientY - rect.top) * (H / rect.height);
  }, { passive: false });

  canvas.addEventListener('touchend', function () {
    if (!state.dragging) return;
    state.dragging = false;

    var dx = state.dragEndX - state.dragStartX;
    var dy = state.dragEndY - state.dragStartY;
    var power = Math.min(20, Math.sqrt(dx * dx + dy * dy) / 10);

    if (power < 1) return;

    var angle = Math.atan2(-dy, -dx);
    state.player.vx = Math.cos(angle) * power;
    state.player.vy = Math.sin(angle) * power;
    state.launched = true;
  });

  startBtn.addEventListener('click', startGame);

  function renderGameToText() {
    return JSON.stringify({
      mode: state.mode,
      player: {
        x: Math.round(state.player.x),
        y: Math.round(state.player.y),
        vx: Math.round(state.player.vx * 100) / 100,
        vy: Math.round(state.player.vy * 100) / 100,
        r: state.player.r
      },
      ball: {
        x: Math.round(state.ball.x),
        y: Math.round(state.ball.y),
        r: state.ball.r
      },
      obstacles: state.obstacles.map(function (o) {
        return { x: Math.round(o.x), y: Math.round(o.y), w: Math.round(o.w), h: Math.round(o.h) };
      }),
      goal: state.goal,
      score: state.score,
      round: state.round,
      launched: state.launched,
      bounceCount: state.bounceCount,
      resultMsg: state.resultMsg
    });
  }
  window.render_game_to_text = renderGameToText;

  function advanceTime(ms) {
    var steps = Math.max(1, Math.round(ms / 16.67));
    for (var i = 0; i < steps; i++) {
      if (state.mode === 'playing' && state.launched) {
        physicsStep(1);
      }
      if (state.mode === 'result') {
        state.resultTimer--;
        if (state.resultTimer <= 0) {
          nextRoundOrEnd();
        }
      }
    }
    draw();
  }
  window.advanceTime = advanceTime;

  requestAnimationFrame(update);
})();
