(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('start-btn');
  const scoreEl = document.getElementById('score-display');
  const collectedEl = document.getElementById('collected-display');
  const livesEl = document.getElementById('lives-display');
  const timerEl = document.getElementById('timer-display');

  const FLAGS = ['🇧🇷','🇦🇷','🇫🇷','🇩🇪','🇪🇸','🇮🇹','🇬🇧','🇵🇹','🇳🇱','🇧🇪','🇯🇵','🇰🇷','🇲🇽','🇺🇸','🇨🇴','🇦🇺'];
  const BASKET_W = 80;
  const BASKET_H = 30;
  const STICKER_SIZE = 40;
  const SPEED_INITIAL = 1.5;
  const SPEED_INCREMENT = 0.1;
  const MAX_LIVES = 3;
  const TIME_LIMIT = 90;

  let state = {
    mode: 'title',
    fallingSticker: null,
    basketX: canvas.width / 2,
    collected: [],
    score: 0,
    timer: TIME_LIMIT,
    lives: MAX_LIVES,
    duplicates: 0,
    setComplete: false,
    speed: SPEED_INITIAL,
    spawnTimer: 0,
    missFlash: 0,
    catchFlash: 0
  };

  function spawnSticker() {
    const uncollected = FLAGS.filter(f => !state.collected.includes(f));
    const pool = uncollected.length > 0 ? uncollected : FLAGS;
    const flag = pool[Math.floor(Math.random() * pool.length)];
    const x = STICKER_SIZE / 2 + Math.random() * (canvas.width - STICKER_SIZE);
    state.fallingSticker = { flag, x, y: -STICKER_SIZE };
    state.spawnTimer = 0;
  }

  function startGame() {
    state = {
      mode: 'playing',
      fallingSticker: null,
      basketX: canvas.width / 2,
      collected: [],
      score: 0,
      timer: TIME_LIMIT,
      lives: MAX_LIVES,
      duplicates: 0,
      setComplete: false,
      speed: SPEED_INITIAL,
      spawnTimer: 0,
      missFlash: 0,
      catchFlash: 0
    };
    overlay.classList.add('hidden');
    spawnSticker();
  }

  function endGame(won) {
    state.mode = 'gameover';
    const bonus = state.setComplete ? 200 : 0;
    state.score += bonus;
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <h1>${won ? 'SET COMPLETE!' : state.lives <= 0 ? 'NO LIVES!' : 'TIME\'S UP!'}</h1>
      <h2>Final Score: ${state.score}</h2>
      <p>Stickers collected: ${state.collected.length}/16</p>
      <p>Duplicates: ${state.duplicates}</p>
      ${state.setComplete ? '<p style="color:#fbbf24">+200 Set Complete Bonus!</p>' : ''}
      <button class="btn" id="start-btn">${won ? 'PLAY AGAIN' : 'TRY AGAIN'}</button>
    `;
    document.getElementById('start-btn').addEventListener('click', startGame);
    if (typeof Leaderboard !== 'undefined') {
      Leaderboard.promptName(function (lbName) {
        Leaderboard.addScore('sticker-collector', state.score, lbName);
        Leaderboard.renderLeaderboard('sticker-collector', 'leaderboard-container', state.score);
      });
    }
  }

  function drawBasket() {
    const x = state.basketX - BASKET_W / 2;
    const y = canvas.height - BASKET_H - 10;

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + BASKET_W, y);
    ctx.lineTo(x + BASKET_W - 10, y + BASKET_H);
    ctx.lineTo(x + 10, y + BASKET_H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#d97706';
    ctx.fillRect(x - 5, y - 5, BASKET_W + 10, 8);

    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CATCH HERE', state.basketX, y - 8);

    return { x, y };
  }

  function drawSticker() {
    if (!state.fallingSticker) return;
    const s = state.fallingSticker;
    ctx.font = `${STICKER_SIZE}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.flag, s.x, s.y);

    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 15;
    ctx.fillText(s.flag, s.x, s.y);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(167,139,250,0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y + STICKER_SIZE / 2 + 5);
    ctx.lineTo(s.x, canvas.height - BASKET_H - 15);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawCollected() {
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    const startX = 10;
    const y = canvas.height - 30;
    let x = startX;
    for (const flag of state.collected) {
      ctx.font = '20px serif';
      ctx.fillText(flag, x, y);
      x += 28;
      if (x > canvas.width - 30) break;
    }
  }

  function drawLives() {
    const x = canvas.width - 60;
    const y = 50;
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'right';
    for (let i = 0; i < MAX_LIVES; i++) {
      ctx.fillStyle = i < state.lives ? '#f44' : '#555';
      ctx.fillText('❤️', x - i * 22, y);
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (state.mode === 'title') return;

    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#1a2744');
    grad.addColorStop(1, '#0d1f3c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (state.missFlash > 0) {
      ctx.fillStyle = `rgba(255,0,0,${state.missFlash * 0.3})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (state.catchFlash > 0) {
      ctx.fillStyle = `rgba(0,255,100,${state.catchFlash * 0.2})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawSticker();
    drawBasket();
    drawCollected();
    drawLives();

    scoreEl.textContent = `Score: ${state.score}`;
    collectedEl.textContent = `Collected: ${state.collected.length}/16`;
    livesEl.textContent = `Lives: ${state.lives}`;
    timerEl.textContent = `Time: ${Math.ceil(state.timer)}s`;
  }

  function update(dt) {
    if (state.mode !== 'playing') return;

    state.timer -= dt;
    if (state.timer <= 0) {
      state.timer = 0;
      endGame(false);
      return;
    }

    state.spawnTimer += dt;
    state.speed = SPEED_INITIAL + Math.floor((TIME_LIMIT - state.timer) / 5) * SPEED_INCREMENT;
    state.missFlash = Math.max(0, state.missFlash - dt * 3);
    state.catchFlash = Math.max(0, state.catchFlash - dt * 3);

    if (!state.fallingSticker || state.spawnTimer > 1.5) {
      spawnSticker();
    }

    if (state.fallingSticker) {
      state.fallingSticker.y += state.speed * dt * 60;

      const s = state.fallingSticker;
      const basketY = canvas.height - BASKET_H - 10;
      const basketLeft = state.basketX - BASKET_W / 2;
      const basketRight = state.basketX + BASKET_W / 2;

      if (s.y + STICKER_SIZE / 2 >= basketY && s.x >= basketLeft - 10 && s.x <= basketRight + 10) {
        const isDuplicate = state.collected.includes(s.flag);
        if (isDuplicate) {
          state.score = Math.max(0, state.score - 5);
          state.duplicates++;
        } else {
          state.score += 10;
          state.collected.push(s.flag);
        }
        state.catchFlash = 1;
        state.fallingSticker = null;
        state.spawnTimer = 0;

        if (state.collected.length >= FLAGS.length) {
          state.setComplete = true;
          endGame(true);
          return;
        }

        setTimeout(() => { if (state.mode === 'playing') spawnSticker(); }, 500);
      }

      if (s && s.y > canvas.height + STICKER_SIZE) {
        state.lives--;
        state.missFlash = 1;
        state.fallingSticker = null;
        state.spawnTimer = 0;

        if (state.lives <= 0) {
          endGame(false);
          return;
        }

        setTimeout(() => { if (state.mode === 'playing') spawnSticker(); }, 800);
      }
    }
  }

  document.addEventListener('keydown', (e) => {
    if (state.mode !== 'playing') return;
    const moveSpeed = 30;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      state.basketX = Math.max(BASKET_W / 2, state.basketX - moveSpeed);
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      state.basketX = Math.min(canvas.width - BASKET_W / 2, state.basketX + moveSpeed);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (state.mode !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    state.basketX = Math.max(BASKET_W / 2, Math.min(canvas.width - BASKET_W / 2, e.clientX - rect.left));
  });

  canvas.addEventListener('touchmove', (e) => {
    if (state.mode !== 'playing') return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    state.basketX = Math.max(BASKET_W / 2, Math.min(canvas.width - BASKET_W / 2, e.touches[0].clientX - rect.left));
  }, { passive: false });

  window.advanceTime = (ms) => {
    update(ms / 1000);
    render();
  };

  function renderGameToText() {
    return JSON.stringify({
      mode: state.mode,
      fallingSticker: state.fallingSticker ? { flag: state.fallingSticker.flag, x: state.fallingSticker.x, y: state.fallingSticker.y } : null,
      basketX: state.basketX,
      collected: state.collected,
      score: state.score,
      timer: Math.ceil(state.timer),
      lives: state.lives,
      duplicates: state.duplicates,
      setComplete: state.setComplete,
      speed: state.speed
    });
  }

  window.render_game_to_text = renderGameToText;

  startBtn.addEventListener('click', startGame);

  let lastTime = 0;
  function loop(ts) {
    if (lastTime && state.mode === 'playing') {
      const dt = Math.min((ts - lastTime) / 1000, 0.1);
      update(dt);
    }
    lastTime = ts;
    render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
