(function () {
  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');
  var W = canvas.width;
  var H = canvas.height;

  var hudScore = document.getElementById('score-display');
  var hudMoves = document.getElementById('moves-display');
  var hudPairs = document.getElementById('pairs-display');
  var overlay = document.getElementById('message-overlay');
  var startBtn = document.getElementById('start-btn');

  var GRID_COLS = 4;
  var GRID_ROWS = 4;
  var CARD_W = 120;
  var CARD_H = 120;
  var GAP = 10;
  var OFFSET_X = (W - (GRID_COLS * CARD_W + (GRID_COLS - 1) * GAP)) / 2;
  var OFFSET_Y = (H - (GRID_ROWS * CARD_H + (GRID_ROWS - 1) * GAP)) / 2;

  var PATTERN_DEFS = [
    { color: '#e91e63', shape: 'circle' },
    { color: '#2196f3', shape: 'square' },
    { color: '#4caf50', shape: 'triangle' },
    { color: '#ff9800', shape: 'diamond' },
    { color: '#9c27b0', shape: 'star' },
    { color: '#00bcd4', shape: 'hexagon' },
    { color: '#ff5722', shape: 'cross' },
    { color: '#795548', shape: 'heart' }
  ];

  var state = {
    mode: 'start',
    cards: [],
    flipped: [],
    matchedCount: 0,
    moveCount: 0,
    round: 1,
    timer: 0,
    totalPairs: 8,
    lockBoard: false,
    lastTime: 0,
    startTime: 0
  };

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function createCards() {
    var cards = [];
    for (var i = 0; i < 8; i++) {
      cards.push({ id: i * 2, pattern: PATTERN_DEFS[i], matched: false, faceUp: false });
      cards.push({ id: i * 2 + 1, pattern: PATTERN_DEFS[i], matched: false, faceUp: false });
    }
    shuffle(cards);
    return cards;
  }

  function startGame() {
    state.mode = 'playing';
    state.cards = createCards();
    state.flipped = [];
    state.matchedCount = 0;
    state.moveCount = 0;
    state.round = 1;
    state.timer = 0;
    state.lockBoard = false;
    state.startTime = Date.now();
    overlay.classList.add('hidden');
    updateHud();
  }

  function updateHud() {
    hudScore.textContent = 'Score: ' + state.score;
    hudMoves.textContent = 'Moves: ' + state.moveCount;
    hudPairs.textContent = 'Pairs: ' + state.matchedCount + '/' + state.totalPairs;
  }

  function getScore() {
    var base = 200;
    var penalty = state.moveCount * 3;
    var timeBonus = state.timer < 30 ? 100 : 0;
    return Math.max(0, base - penalty + timeBonus);
  }

  function showOverlay(title, subtitle, details, buttonText) {
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<h1>' + title + '</h1>' +
      (subtitle ? '<h2>' + subtitle + '</h2>' : '') +
      (details ? details.map(function (d) { return '<p>' + d + '</p>'; }).join('') : '') +
      '<button id="replay-btn">' + buttonText + '</button>';
    document.getElementById('replay-btn').addEventListener('click', startGame);
  }

  function drawPattern(x, y, w, h, pattern) {
    var cx = x + w / 2;
    var cy = y + h / 2;
    var size = Math.min(w, h) * 0.3;
    ctx.fillStyle = pattern.color;

    switch (pattern.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy + size);
        ctx.lineTo(cx - size, cy + size);
        ctx.closePath();
        ctx.fill();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.closePath();
        ctx.fill();
        break;
      case 'star':
        ctx.beginPath();
        for (var i = 0; i < 5; i++) {
          var angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
          var r = i === 0 ? size : size;
          ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
          angle = angle + 2 * Math.PI / 5;
          ctx.lineTo(cx + Math.cos(angle) * size * 0.4, cy + Math.sin(angle) * size * 0.4);
        }
        ctx.closePath();
        ctx.fill();
        break;
      case 'hexagon':
        ctx.beginPath();
        for (var j = 0; j < 6; j++) {
          var a = (j * Math.PI / 3) - Math.PI / 6;
          ctx.lineTo(cx + Math.cos(a) * size, cy + Math.sin(a) * size);
        }
        ctx.closePath();
        ctx.fill();
        break;
      case 'cross':
        var t = size * 0.3;
        ctx.fillRect(cx - t, cy - size, t * 2, size * 2);
        ctx.fillRect(cx - size, cy - t, size * 2, t * 2);
        break;
      case 'heart':
        ctx.beginPath();
        ctx.moveTo(cx, cy + size * 0.6);
        ctx.bezierCurveTo(cx - size, cy - size * 0.2, cx - size * 0.5, cy - size, cx, cy - size * 0.4);
        ctx.bezierCurveTo(cx + size * 0.5, cy - size, cx + size, cy - size * 0.2, cx, cy + size * 0.6);
        ctx.fill();
        break;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = '#1a2a2a';
    ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < state.cards.length; i++) {
      var card = state.cards[i];
      var col = i % GRID_COLS;
      var row = Math.floor(i / GRID_COLS);
      var x = OFFSET_X + col * (CARD_W + GAP);
      var y = OFFSET_Y + row * (CARD_H + GAP);

      if (card.matched || card.faceUp) {
        ctx.fillStyle = '#2a3a3a';
        ctx.fillRect(x, y, CARD_W, CARD_H);
        ctx.strokeStyle = card.matched ? '#4caf50' : '#ffd700';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, CARD_W, CARD_H);
        drawPattern(x, y, CARD_W, CARD_H, card.pattern);
      } else {
        ctx.fillStyle = '#3a4a5a';
        ctx.fillRect(x, y, CARD_W, CARD_H);
        ctx.strokeStyle = '#5a6a7a';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, CARD_W, CARD_H);
        ctx.fillStyle = '#6a7a8a';
        ctx.font = '32px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❓', x + CARD_W / 2, y + CARD_H / 2);
      }
    }

    if (state.mode === 'playing') {
      ctx.fillStyle = '#fff';
      ctx.font = '14px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('Time: ' + state.timer.toFixed(1) + 's', W / 2, H - 15);
    }
  }

  function update(timestamp) {
    if (state.mode === 'playing') {
      state.timer = (Date.now() - state.startTime) / 1000;
    }
    draw();
    requestAnimationFrame(update);
  }

  function handleCardClick(x, y) {
    if (state.mode !== 'playing' || state.lockBoard) return;

    for (var i = 0; i < state.cards.length; i++) {
      var card = state.cards[i];
      var col = i % GRID_COLS;
      var row = Math.floor(i / GRID_COLS);
      var cx = OFFSET_X + col * (CARD_W + GAP);
      var cy = OFFSET_Y + row * (CARD_H + GAP);

      if (x >= cx && x <= cx + CARD_W && y >= cy && y <= cy + CARD_H) {
        if (card.matched || card.faceUp) return;

        card.faceUp = true;
        state.flipped.push(i);

        if (state.flipped.length === 2) {
          state.moveCount++;
          state.lockBoard = true;
          var first = state.cards[state.flipped[0]];
          var second = state.cards[state.flipped[1]];

          if (first.pattern.color === second.pattern.color && first.pattern.shape === second.pattern.shape) {
            first.matched = true;
            second.matched = true;
            state.matchedCount++;
            state.flipped = [];
            state.lockBoard = false;
            updateHud();

            if (state.matchedCount === state.totalPairs) {
              var finalScore = getScore();
              state.score = finalScore;
              updateHud();
              state.mode = 'gameover';
              var timeMsg = state.timer < 30 ? 'Speed Bonus: +100' : '';
              showOverlay('YOU WIN!', 'Score: ' + finalScore, ['Moves: ' + state.moveCount, 'Time: ' + state.timer.toFixed(1) + 's', timeMsg], 'PLAY AGAIN');
            }
          } else {
            setTimeout(function () {
              state.cards[state.flipped[0]].faceUp = false;
              state.cards[state.flipped[1]].faceUp = false;
              state.flipped = [];
              state.lockBoard = false;
            }, 800);
          }
        }
        break;
      }
    }
  }

  canvas.addEventListener('click', function (e) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (W / rect.width);
    var y = (e.clientY - rect.top) * (H / rect.height);
    handleCardClick(x, y);
  });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches[0];
    var x = (touch.clientX - rect.left) * (W / rect.width);
    var y = (touch.clientY - rect.top) * (H / rect.height);
    handleCardClick(x, y);
  }, { passive: false });

  startBtn.addEventListener('click', startGame);

  function renderGameToText() {
    return JSON.stringify({
      mode: state.mode,
      cards: state.cards.map(function (c) {
        return { id: c.id, pattern: c.pattern.shape + '_' + c.pattern.color, matched: c.matched, faceUp: c.faceUp };
      }),
      flipped: state.flipped,
      matchedCount: state.matchedCount,
      moveCount: state.moveCount,
      round: state.round,
      timer: Math.round(state.timer * 10) / 10,
      totalPairs: state.totalPairs,
      score: state.score || 0
    });
  }
  window.render_game_to_text = renderGameToText;

  function advanceTime(ms) {
    if (state.mode === 'playing') {
      state.timer += ms / 1000;
    }
    draw();
  }
  window.advanceTime = advanceTime;

  state.score = 0;
  requestAnimationFrame(update);
})();
