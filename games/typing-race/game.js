(function () {
  var hudScore = document.getElementById('score-display');
  var hudRound = document.getElementById('round-display');
  var hudWpm = document.getElementById('wpm-display');
  var commentaryEl = document.getElementById('commentary-text');
  var typedEl = document.getElementById('typed-display');
  var timerEl = document.getElementById('timer-display');
  var accuracyEl = document.getElementById('accuracy-display');
  var overlay = document.getElementById('message-overlay');
  var startBtn = document.getElementById('start-btn');

  var ROUND_TEXTS = [
    "GOAL!",
    "What a save!",
    "The crowd goes wild!",
    "Offside called by the referee!",
    "A brilliant counter-attack unfolds!",
    "GOAL! What a strike from outside the box!",
    "The keeper dives but can't reach it!",
    "A thunderous free kick curls into the top corner!",
    "The striker makes a solo run through the entire defense!",
    "In the dying minutes of the match, a moment of pure genius decides it all!",
  ];

  var state = {
    mode: 'start',
    round: 0,
    text: '',
    typed: '',
    startTime: 0,
    wpm: 0,
    accuracy: 0,
    score: 0,
    streak: 0,
    totalWpm: 0,
    elapsed: 0,
    lastTime: 0,
    keyHandler: null,
  };

  function startGame() {
    state.mode = 'playing';
    state.round = 0;
    state.score = 0;
    state.streak = 0;
    state.totalWpm = 0;
    overlay.classList.add('hidden');
    startRound();
    updateHud();
  }

  function startRound() {
    state.text = ROUND_TEXTS[state.round] || ROUND_TEXTS[ROUND_TEXTS.length - 1];
    state.typed = '';
    state.startTime = 0;
    state.wpm = 0;
    state.accuracy = 0;
    state.elapsed = 0;
    updateDisplay();
    updateHud();
  }

  function updateHud() {
    hudScore.textContent = 'Score: ' + state.score;
    hudRound.textContent = 'Round: ' + (state.round + 1) + '/10';
    hudWpm.textContent = 'WPM: ' + Math.round(state.wpm);
  }

  function updateDisplay() {
    var text = state.text;
    var typed = state.typed;
    var html = '';
    for (var i = 0; i < text.length; i++) {
      if (i < typed.length) {
        if (typed[i] === text[i]) {
          html += '<span class="correct">' + escapeHtml(text[i]) + '</span>';
        } else {
          html += '<span class="incorrect">' + escapeHtml(text[i]) + '</span>';
        }
      } else if (i === typed.length) {
        html += '<span class="cursor">' + escapeHtml(text[i]) + '</span>';
      } else {
        html += escapeHtml(text[i]);
      }
    }
    commentaryEl.textContent = '';
    typedEl.innerHTML = html;
    timerEl.textContent = state.elapsed.toFixed(1) + 's';
    accuracyEl.textContent = Math.round(state.accuracy) + '% accuracy';
  }

  function escapeHtml(ch) {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === ' ') return '&nbsp;';
    return ch;
  }

  function calcWpm(typed, elapsedMs) {
    if (elapsedMs <= 0) return 0;
    var words = typed.length / 5;
    return (words / (elapsedMs / 60000));
  }

  function calcAccuracy(typed, text) {
    if (typed.length === 0) return 100;
    var correct = 0;
    for (var i = 0; i < typed.length; i++) {
      if (typed[i] === text[i]) correct++;
    }
    return (correct / typed.length) * 100;
  }

  function finishRound() {
    var elapsed = state.elapsed;
    state.wpm = calcWpm(state.typed, elapsed * 1000);
    state.accuracy = calcAccuracy(state.typed, state.text);
    var roundScore = Math.round(state.wpm * (state.accuracy / 100));
    if (state.accuracy === 100) {
      state.streak++;
      roundScore += state.streak * 5;
    } else {
      state.streak = 0;
    }
    state.score += roundScore;
    state.totalWpm += state.wpm;
    updateHud();

    state.mode = 'result';
    setTimeout(function () {
      state.round++;
      if (state.round >= 10) {
        endGame();
      } else {
        state.mode = 'playing';
        startRound();
      }
    }, 1500);
  }

  function endGame() {
    state.mode = 'gameover';
    var avgWpm = Math.round(state.totalWpm / 10);
    overlay.classList.remove('hidden');
    overlay.innerHTML = '<h1>RACE COMPLETE!</h1>' +
      '<p>Final Score: ' + state.score + '</p>' +
      '<p>Average WPM: ' + avgWpm + '</p>' +
      '<p>Best Streak: ' + state.streak + '</p>' +
      '<button id="replay-btn">RACE AGAIN</button>';
    document.getElementById('replay-btn').addEventListener('click', startGame);
    if (typeof Leaderboard !== 'undefined') {
      Leaderboard.promptName(function (name) {
        Leaderboard.addScore('typing-race', state.score, name);
        Leaderboard.renderLeaderboard('typing-race', 'leaderboard-container', state.score);
      });
    }
  }

  function handleKey(e) {
    if (state.mode !== 'playing') return;
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (state.startTime === 0) {
        state.startTime = performance.now();
      }
      if (state.typed.length < state.text.length) {
        state.typed += e.key;
        state.elapsed = (performance.now() - state.startTime) / 1000;
        state.accuracy = calcAccuracy(state.typed, state.text);
        state.wpm = calcWpm(state.typed, state.elapsed * 1000);
        updateDisplay();
        updateHud();

        if (state.typed.length === state.text.length) {
          finishRound();
        }
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (state.typed.length > 0) {
        state.typed = state.typed.slice(0, -1);
        if (state.startTime > 0) {
          state.elapsed = (performance.now() - state.startTime) / 1000;
        }
        state.accuracy = calcAccuracy(state.typed, state.text);
        updateDisplay();
      }
    }
  }

  document.addEventListener('keydown', handleKey);

  startBtn.addEventListener('click', startGame);

  function update(ts) {
    if (state.mode === 'playing' && state.startTime > 0) {
      state.elapsed = (performance.now() - state.startTime) / 1000;
      state.wpm = calcWpm(state.typed, state.elapsed * 1000);
      updateDisplay();
      updateHud();
    }
    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);

  window.render_game_to_text = function () {
    return JSON.stringify({
      mode: state.mode,
      round: state.round + 1,
      text: state.text,
      typed: state.typed,
      startTime: state.startTime,
      wpm: Math.round(state.wpm * 10) / 10,
      accuracy: Math.round(state.accuracy),
      score: state.score,
      streak: state.streak,
      totalWpm: Math.round(state.totalWpm * 10) / 10,
    });
  };

  window.advanceTime = function (ms) {
    if (state.mode === 'playing' && state.startTime > 0) {
      state.elapsed = (performance.now() - state.startTime) / 1000;
      state.wpm = calcWpm(state.typed, state.elapsed * 1000);
      updateDisplay();
    }
  };
})();
