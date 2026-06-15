(function () {
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var W = canvas.width;
  var H = canvas.height;

  var hudScore = document.getElementById('score-display');
  var hudLevel = document.getElementById('level-display');
  var hudItems = document.getElementById('items-display');
  var overlay = document.getElementById('message-overlay');
  var startBtn = document.getElementById('start-btn');

  var COLS = 12;
  var ROWS = 8;
  var CELL_W = W / COLS;
  var CELL_H = H / ROWS;

  var ITEM_TYPES = ['👕', '⚽', '🧣'];

  var state = {
    mode: 'start',
    playerX: 0,
    playerY: 7,
    guards: [],
    items: [],
    exitX: 11,
    exitY: 0,
    level: 1,
    score: 0,
    spotted: false,
    itemsCollected: 0,
    totalItems: 0,
    timeSteps: 0,
    lastTime: 0
  };

  function createGuards(level) {
    var guards = [];
    var count = 1 + level;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < count; i++) {
      var x = 2 + Math.floor(Math.random() * (COLS - 4));
      var y = 1 + Math.floor(Math.random() * (ROWS - 2));
      var d = dirs[i % dirs.length];
      guards.push({ x: x, y: y, dx: d[0], dy: d[1], vision: 3 });
    }
    return guards;
  }

  function createItems(level) {
    var items = [];
    var count = 2 + level;
    for (var i = 0; i < count; i++) {
      var x = 1 + Math.floor(Math.random() * (COLS - 2));
      var y = 1 + Math.floor(Math.random() * (ROWS - 2));
      items.push({ x: x, y: y, type: ITEM_TYPES[i % ITEM_TYPES.length], collected: false });
    }
    return items;
  }

  function startGame() {
    state.mode = 'playing';
    state.level = 1;
    state.score = 0;
    state.timeSteps = 0;
    loadLevel();
    overlay.classList.add('hidden');
    updateHud();
  }

  function loadLevel() {
    state.playerX = 0;
    state.playerY = ROWS - 1;
    state.guards = createGuards(state.level);
    state.items = createItems(state.level);
    state.exitX = COLS - 1;
    state.exitY = 0;
    state.spotted = false;
    state.itemsCollected = 0;
    state.totalItems = state.items.length;
    updateHud();
  }

  function updateHud() {
    hudScore.textContent = 'Score: ' + state.score;
    hudLevel.textContent = 'Level: ' + state.level;
    hudItems.textContent = 'Items: ' + state.itemsCollected + '/' + state.totalItems;
  }

  function showOverlay(title, subtitle, details, buttonText) {
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<h1>' + title + '</h1>' +
      (subtitle ? '<h2>' + subtitle + '</h2>' : '') +
      (details ? details.map(function (d) { return '<p>' + d + '</p>'; }).join('') : '') +
      '<button id="replay-btn">' + buttonText + '</button>';
    document.getElementById('replay-btn').addEventListener('click', startGame);
  }

  function isInVision(gx, gy, dx, dy, vision, px, py) {
    for (var v = 1; v <= vision; v++) {
      var vx = gx + dx * v;
      var vy = gy + dy * v;
      if (vx === px && vy === py) return true;
      if (vx < 0 || vx >= COLS || vy < 0 || vy >= ROWS) return false;
    }
    return false;
  }

  function checkSpotted() {
    for (var i = 0; i < state.guards.length; i++) {
      var g = state.guards[i];
      if (isInVision(g.x, g.y, g.dx, g.dy, g.vision, state.playerX, state.playerY)) {
        return true;
      }
    }
    return false;
  }

  function movePlayer(dx, dy) {
    if (state.mode !== 'playing') return;
    var nx = state.playerX + dx;
    var ny = state.playerY + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;

    state.playerX = nx;
    state.playerY = ny;

    for (var i = 0; i < state.items.length; i++) {
      var item = state.items[i];
      if (!item.collected && item.x === nx && item.y === ny) {
        item.collected = true;
        state.itemsCollected++;
        state.score += 15;
        updateHud();
      }
    }

    if (nx === state.exitX && ny === state.exitY) {
      state.score += state.level * 100;
      var timeBonus = Math.max(0, 200 - state.timeSteps);
      state.score += timeBonus;
      updateHud();
      if (state.level >= 5) {
        state.mode = 'gameover';
        showOverlay('YOU WIN!', 'Final Score: ' + state.score, ['Levels: 5/5'], 'PLAY AGAIN');
        if (typeof Leaderboard !== 'undefined') {
          Leaderboard.promptName(function (name) {
            Leaderboard.addScore('hide-seek', state.score, name);
            Leaderboard.renderLeaderboard('hide-seek', 'leaderboard-container', state.score);
          });
        }
      } else {
        state.level++;
        loadLevel();
      }
      return;
    }

    if (checkSpotted()) {
      state.spotted = true;
      state.score = Math.max(0, state.score - 50);
      updateHud();
      loadLevel();
    }
  }

  function moveGuards() {
    for (var i = 0; i < state.guards.length; i++) {
      var g = state.guards[i];
      var nx = g.x + g.dx;
      var ny = g.y + g.dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
        g.dx = -g.dx;
        g.dy = -g.dy;
      } else {
        g.x = nx;
        g.y = ny;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(100,200,100,0.3)';
    ctx.lineWidth = 1;
    for (var x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_W, 0);
      ctx.lineTo(x * CELL_W, H);
      ctx.stroke();
    }
    for (var y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_H);
      ctx.lineTo(W, y * CELL_H);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0,255,0,0.2)';
    ctx.fillRect(state.exitX * CELL_W, state.exitY * CELL_H, CELL_W, CELL_H);
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚪', state.exitX * CELL_W + CELL_W / 2, state.exitY * CELL_H + CELL_H / 2);

    for (var i = 0; i < state.guards.length; i++) {
      var g = state.guards[i];
      var gx = g.x * CELL_W + CELL_W / 2;
      var gy = g.y * CELL_H + CELL_H / 2;

      var visionEndX = g.x + g.dx * g.vision;
      var visionEndY = g.y + g.dy * g.vision;
      ctx.fillStyle = 'rgba(255,0,0,0.15)';
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      var vx1 = (visionEndX - g.x + (g.dy !== 0 ? 0.5 : 0)) * CELL_W;
      var vy1 = (visionEndY - g.y + (g.dx !== 0 ? 0.5 : 0)) * CELL_H;
      var vx2 = (visionEndX - g.x - (g.dy !== 0 ? 0.5 : 0)) * CELL_W;
      var vy2 = (visionEndY - g.y - (g.dx !== 0 ? 0.5 : 0)) * CELL_H;
      ctx.lineTo(gx + vx1, gy + vy1);
      ctx.lineTo(gx + vx2, gy + vy2);
      ctx.closePath();
      ctx.fill();

      ctx.font = '28px serif';
      ctx.fillText('👮', gx, gy);
    }

    for (var j = 0; j < state.items.length; j++) {
      var item = state.items[j];
      if (!item.collected) {
        ctx.font = '24px serif';
        ctx.fillText(item.type, item.x * CELL_W + CELL_W / 2, item.y * CELL_H + CELL_H / 2);
      }
    }

    ctx.font = '32px serif';
    ctx.fillText('🧑', state.playerX * CELL_W + CELL_W / 2, state.playerY * CELL_H + CELL_H / 2);

    if (state.spotted) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#f00';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('SPOTTED! -50pts', W / 2, H / 2);
    }
  }

  function update(timestamp) {
    var dt = state.lastTime ? (timestamp - state.lastTime) / 1000 : 1 / 60;
    state.lastTime = timestamp;

    if (state.mode === 'playing') {
      moveGuards();
      if (checkSpotted()) {
        state.spotted = true;
        state.score = Math.max(0, state.score - 50);
        updateHud();
        loadLevel();
      }
    }

    draw();
    requestAnimationFrame(update);
  }

  document.addEventListener('keydown', function (e) {
    if (state.mode !== 'playing') return;
    switch (e.key) {
      case 'ArrowUp': movePlayer(0, -1); break;
      case 'ArrowDown': movePlayer(0, 1); break;
      case 'ArrowLeft': movePlayer(-1, 0); break;
      case 'ArrowRight': movePlayer(1, 0); break;
    }
    e.preventDefault();
  });

  startBtn.addEventListener('click', startGame);

  function renderGameToText() {
    return JSON.stringify({
      mode: state.mode,
      playerX: state.playerX,
      playerY: state.playerY,
      guards: state.guards.map(function (g) {
        return { x: g.x, y: g.y, dx: g.dx, dy: g.dy, vision: g.vision };
      }),
      items: state.items.map(function (it) {
        return { x: it.x, y: it.y, type: it.type, collected: it.collected };
      }),
      exitX: state.exitX,
      exitY: state.exitY,
      level: state.level,
      score: state.score,
      spotted: state.spotted
    });
  }
  window.render_game_to_text = renderGameToText;

  function advanceTime(ms) {
    var steps = Math.max(1, Math.round(ms / 200));
    for (var i = 0; i < steps; i++) {
      if (state.mode === 'playing') {
        moveGuards();
        state.timeSteps++;
        if (checkSpotted()) {
          state.spotted = true;
          state.score = Math.max(0, state.score - 50);
          updateHud();
          loadLevel();
        }
      }
    }
    draw();
  }
  window.advanceTime = advanceTime;

  requestAnimationFrame(update);
})();
