(function () {
  var overlay = document.getElementById('message-overlay');
  var startBtn = document.getElementById('start-btn');
  var orderDisplay = document.getElementById('order-display');
  var inputDisplay = document.getElementById('input-display');
  var hudScore = document.getElementById('score-display');
  var hudTimer = document.getElementById('timer-display');
  var hudCombo = document.getElementById('combo-display');
  var servedDisplay = document.getElementById('served-display');
  var lostDisplay = document.getElementById('lost-display');
  var btns = document.querySelectorAll('.ingredient-btn');

  var INGREDIENTS = ['🍔', '🌭', '🌮', '🍟', '🥤', '🍦'];
  var GAME_DURATION = 60;

  var state = {
    mode: 'start',
    orders: [],
    currentOrderIndex: 0,
    orderIngredients: [],
    playerInput: [],
    score: 0,
    timer: GAME_DURATION,
    combo: 0,
    customersServed: 0,
    customersLost: 0,
    lastTime: 0,
    spawnTimer: 0,
    spawnInterval: 3000,
    orderTimeout: 8000,
    orderTimer: 0
  };

  function generateOrder() {
    var len = 2 + Math.floor(Math.random() * 3);
    var order = [];
    for (var i = 0; i < len; i++) {
      order.push(INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)]);
    }
    return order;
  }

  function startGame() {
    state.mode = 'playing';
    state.score = 0;
    state.timer = GAME_DURATION;
    state.combo = 0;
    state.customersServed = 0;
    state.customersLost = 0;
    state.orders = [generateOrder()];
    state.currentOrderIndex = 0;
    state.orderIngredients = state.orders[0];
    state.playerInput = [];
    state.spawnTimer = 2000;
    state.orderTimer = 0;
    overlay.classList.add('hidden');
    updateUI();
  }

  function updateUI() {
    hudScore.textContent = 'Score: ' + state.score;
    hudTimer.textContent = '⏱ ' + Math.ceil(state.timer) + 's';
    hudCombo.textContent = 'Combo: ' + state.combo;
    servedDisplay.textContent = 'Served: ' + state.customersServed;
    lostDisplay.textContent = 'Lost: ' + state.customersLost;

    orderDisplay.textContent = state.orderIngredients.join(' ');
    inputDisplay.textContent = state.playerInput.join(' ') || '...';
  }

  function showOverlay(title, subtitle, details, buttonText) {
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<h1>' + title + '</h1>' +
      (subtitle ? '<h2>' + subtitle + '</h2>' : '') +
      (details ? details.map(function (d) { return '<p>' + d + '</p>'; }).join('') : '') +
      '<button id="replay-btn">' + buttonText + '</button>';
    document.getElementById('replay-btn').addEventListener('click', startGame);
  }

  function flashBtn(btn, type) {
    btn.classList.add(type);
    setTimeout(function () { btn.classList.remove(type); }, 300);
  }

  function handleIngredient(emoji, btnElement) {
    if (state.mode !== 'playing') return;

    var expected = state.orderIngredients[state.playerInput.length];
    if (emoji === expected) {
      state.playerInput.push(emoji);
      flashBtn(btnElement, 'correct');

      if (state.playerInput.length === state.orderIngredients.length) {
        state.customersServed++;
        state.combo++;
        state.score += 10 + state.combo * 2;
        state.currentOrderIndex++;
        state.orders.push(generateOrder());
        state.orderIngredients = state.orders[state.currentOrderIndex];
        state.playerInput = [];
        state.orderTimer = 0;
      }
    } else {
      flashBtn(btnElement, 'wrong');
      state.combo = 0;
      state.score = Math.max(0, state.score - 5);
    }

    updateUI();
  }

  for (var i = 0; i < btns.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        handleIngredient(btn.getAttribute('data-item'), btn);
      });
    })(btns[i]);
  }

  function update(timestamp) {
    var dt = state.lastTime ? (timestamp - state.lastTime) / 1000 : 1 / 60;
    state.lastTime = timestamp;

    if (state.mode === 'playing') {
      state.timer -= dt;
      state.orderTimer += dt * 1000;

      if (state.orderTimer >= state.orderTimeout) {
        state.customersLost++;
        state.score = Math.max(0, state.score - 5);
        state.combo = 0;
        state.currentOrderIndex++;
        state.orders.push(generateOrder());
        state.orderIngredients = state.orders[state.currentOrderIndex];
        state.playerInput = [];
        state.orderTimer = 0;
        updateUI();
      }

      if (state.timer <= 0) {
        state.mode = 'gameover';
        showOverlay('TIME UP!', 'Score: ' + state.score, [
          'Customers Served: ' + state.customersServed,
          'Customers Lost: ' + state.customersLost,
          'Best Combo: ' + state.combo
        ], 'PLAY AGAIN');
      }

      updateUI();
    }

    requestAnimationFrame(update);
  }

  startBtn.addEventListener('click', startGame);

  function renderGameToText() {
    return JSON.stringify({
      mode: state.mode,
      orders: state.orders.slice(state.currentOrderIndex, state.currentOrderIndex + 3),
      currentOrderIndex: state.currentOrderIndex,
      orderIngredients: state.orderIngredients,
      playerInput: state.playerInput,
      score: state.score,
      timer: Math.round(state.timer * 10) / 10,
      combo: state.combo,
      customersServed: state.customersServed,
      customersLost: state.customersLost
    });
  }
  window.render_game_to_text = renderGameToText;

  function advanceTime(ms) {
    if (state.mode === 'playing') {
      state.timer -= ms / 1000;
      state.orderTimer += ms;

      if (state.orderTimer >= state.orderTimeout) {
        state.customersLost++;
        state.score = Math.max(0, state.score - 5);
        state.combo = 0;
        state.currentOrderIndex++;
        state.orders.push(generateOrder());
        state.orderIngredients = state.orders[state.currentOrderIndex];
        state.playerInput = [];
        state.orderTimer = 0;
      }

      if (state.timer <= 0) {
        state.mode = 'gameover';
        showOverlay('TIME UP!', 'Score: ' + state.score, [
          'Customers Served: ' + state.customersServed,
          'Customers Lost: ' + state.customersLost,
          'Best Combo: ' + state.combo
        ], 'PLAY AGAIN');
      }

      updateUI();
    }
  }
  window.advanceTime = advanceTime;

  requestAnimationFrame(update);
})();
