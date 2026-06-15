(function () {
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var W = canvas.width;
  var H = canvas.height;

  var hudScore = document.getElementById('score-display');
  var hudRound = document.getElementById('round-display');
  var scenarioEl = document.getElementById('scenario-text');
  var ratingEl = document.getElementById('rating-display');
  var overlay = document.getElementById('message-overlay');
  var startBtn = document.getElementById('start-btn');
  var clearBtn = document.getElementById('clear-btn');
  var submitBtn = document.getElementById('submit-btn');

  var SCENARIOS = [
    "2v1 counter-attack — draw your approach to goal",
    "Corner kick — plan your near-post or far-post run",
    "Defending a through ball — show your interception path",
    "Build-up from the back — trace the passing lanes",
    "Wing play — draw the overlapping run and cross",
  ];

  var state = {
    mode: 'start',
    round: 0,
    scenario: '',
    drawnPaths: [],
    currentPath: null,
    aiRating: 0,
    score: 0,
    isDrawing: false,
    lastTime: 0,
  };

  function startGame() {
    state.mode = 'playing';
    state.round = 0;
    state.score = 0;
    state.drawnPaths = [];
    state.currentPath = null;
    overlay.classList.add('hidden');
    loadScenario();
    updateHud();
  }

  function loadScenario() {
    state.scenario = SCENARIOS[state.round] || SCENARIOS[SCENARIOS.length - 1];
    state.drawnPaths = [];
    state.currentPath = null;
    state.aiRating = 0;
    ratingEl.textContent = '';
    scenarioEl.textContent = state.scenario;
    updateHud();
  }

  function updateHud() {
    hudScore.textContent = 'Score: ' + state.score;
    hudRound.textContent = 'Round: ' + (state.round + 1) + '/5';
  }

  function drawPitch() {
    ctx.fillStyle = '#1a3320';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;

    // center line
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // center circle
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    // penalty areas
    ctx.strokeRect(0, H / 2 - 80, 120, 160);
    ctx.strokeRect(W - 120, H / 2 - 80, 120, 160);

    // goals
    ctx.strokeRect(0, H / 2 - 40, 20, 80);
    ctx.strokeRect(W - 20, H / 2 - 40, 20, 80);
  }

  function drawPaths() {
    var colors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
    state.drawnPaths.forEach(function (path, idx) {
      if (path.length < 2) return;
      ctx.strokeStyle = colors[idx % colors.length];
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (var i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.stroke();

      // arrowhead
      if (path.length >= 2) {
        var last = path[path.length - 1];
        var prev = path[path.length - 2];
        var angle = Math.atan2(last.y - prev.y, last.x - prev.x);
        ctx.fillStyle = colors[idx % colors.length];
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(last.x - 10 * Math.cos(angle - 0.4), last.y - 10 * Math.sin(angle - 0.4));
        ctx.lineTo(last.x - 10 * Math.cos(angle + 0.4), last.y - 10 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
      }
    });

    // draw current path
    if (state.currentPath && state.currentPath.length >= 2) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(state.currentPath[0].x, state.currentPath[0].y);
      for (var i = 1; i < state.currentPath.length; i++) {
        ctx.lineTo(state.currentPath[i].x, state.currentPath[i].y);
      }
      ctx.stroke();
    }
  }

  function drawPlayers() {
    // simple player dots
    var players = [
      { x: 80, y: H / 2, c: '#3b82f6' },
      { x: 180, y: H / 3, c: '#3b82f6' },
      { x: 180, y: H * 2 / 3, c: '#3b82f6' },
      { x: W - 80, y: H / 2, c: '#ef4444' },
      { x: W - 180, y: H / 3, c: '#ef4444' },
      { x: W - 180, y: H * 2 / 3, c: '#ef4444' },
      { x: W - 40, y: H / 2, c: '#ef4444' },
      { x: 40, y: H / 2, c: '#3b82f6' },
    ];
    players.forEach(function (p) {
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawPitch();
    drawPlayers();
    drawPaths();
  }

  function getCanvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top) * (H / rect.height),
    };
  }

  canvas.addEventListener('mousedown', function (e) {
    if (state.mode !== 'playing') return;
    state.isDrawing = true;
    var pos = getCanvasPos(e);
    state.currentPath = [pos];
  });

  canvas.addEventListener('mousemove', function (e) {
    if (!state.isDrawing || !state.currentPath) return;
    var pos = getCanvasPos(e);
    state.currentPath.push(pos);
  });

  canvas.addEventListener('mouseup', function () {
    if (!state.isDrawing || !state.currentPath) return;
    state.isDrawing = false;
    if (state.currentPath.length > 1) {
      state.drawnPaths.push(state.currentPath);
    }
    state.currentPath = null;
  });

  canvas.addEventListener('mouseleave', function () {
    if (state.isDrawing && state.currentPath && state.currentPath.length > 1) {
      state.drawnPaths.push(state.currentPath);
    }
    state.isDrawing = false;
    state.currentPath = null;
  });

  // touch support
  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (state.mode !== 'playing') return;
    state.isDrawing = true;
    var pos = getCanvasPos(e);
    state.currentPath = [pos];
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (!state.isDrawing || !state.currentPath) return;
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches[0];
    state.currentPath.push({
      x: (touch.clientX - rect.left) * (W / rect.width),
      y: (touch.clientY - rect.top) * (H / rect.height),
    });
  }, { passive: false });

  canvas.addEventListener('touchend', function () {
    if (!state.isDrawing || !state.currentPath) return;
    state.isDrawing = false;
    if (state.currentPath.length > 1) {
      state.drawnPaths.push(state.currentPath);
    }
    state.currentPath = null;
  });

  clearBtn.addEventListener('click', function () {
    state.drawnPaths = [];
    state.currentPath = null;
    ratingEl.textContent = '';
  });

  submitBtn.addEventListener('click', function () {
    if (state.mode !== 'playing') return;

    // simulated AI rating based on drawing complexity
    var totalPoints = 0;
    var pathCount = state.drawnPaths.length;
    state.drawnPaths.forEach(function (p) { totalPoints += p.length; });

    var baseRating = Math.min(100, pathCount * 15 + totalPoints * 0.5);
    baseRating += (Math.random() - 0.5) * 20;
    baseRating = Math.max(10, Math.min(100, Math.round(baseRating)));

    state.aiRating = baseRating;
    state.score += baseRating;
    ratingEl.textContent = 'AI Rating: ' + baseRating + '/100 — ' +
      (baseRating >= 80 ? 'Brilliant tactic!' : baseRating >= 50 ? 'Decent play' : 'Needs work');

    updateHud();

    state.mode = 'result';
    setTimeout(function () {
      state.round++;
      if (state.round >= 5) {
        endGame();
      } else {
        state.mode = 'playing';
        loadScenario();
      }
    }, 2000);
  });

  function endGame() {
    state.mode = 'gameover';
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<h1>TACTICAL GENIUS!</h1>' +
      '<p>Total Score: ' + state.score + '</p>' +
      '<p>Average Rating: ' + Math.round(state.score / 5) + '/100</p>' +
      '<button id="replay-btn">DRAW AGAIN</button>';
    document.getElementById('replay-btn').addEventListener('click', startGame);
    if (typeof Leaderboard !== 'undefined') {
      Leaderboard.promptName(function (name) {
        Leaderboard.addScore('draw-play', state.score, name);
        Leaderboard.renderLeaderboard('draw-play', 'leaderboard-container', state.score);
      });
    }
  }

  startBtn.addEventListener('click', startGame);

  function loop() {
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.render_game_to_text = function () {
    return JSON.stringify({
      mode: state.mode,
      round: state.round + 1,
      scenario: state.scenario,
      drawnPaths: state.drawnPaths.map(function (p) {
        return p.map(function (pt) { return { x: Math.round(pt.x), y: Math.round(pt.y) }; });
      }),
      currentPath: state.currentPath ? state.currentPath.map(function (pt) {
        return { x: Math.round(pt.x), y: Math.round(pt.y) };
      }) : null,
      aiRating: state.aiRating,
      score: state.score,
      scenarios: SCENARIOS,
    });
  };

  window.advanceTime = function (ms) {
    render();
  };
})();
