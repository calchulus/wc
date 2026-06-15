(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('start-btn');
  const scoreEl = document.getElementById('score-display');
  const collectedEl = document.getElementById('collected-display');
  const timerEl = document.getElementById('timer-display');

  const FLAGS = ['🇧🇷','🇦🇷','🇫🇷','🇩🇪','🇪🇸','🇮🇹','🇬🇧','🇵🇹','🇳🇱','🇧🇪','🇯🇵','🇰🇷','🇲🇽','🇺🇸','🇨🇴','🇦🇺'];
  const BASKET_W = 80;
  const BASKET_H = 30;
  const STICKER_SIZE = 40;
  const SPEED_INITIAL = 1.5;
  const SPEED_INCREMENT = 0.1;

  let state = { mode: 'title', fallingSticker: null, basketX: canvas.width / 2, collected: [], score: 0, timer: 0, duplicates: 0, setComplete: false, speed: SPEED_INITIAL, spawnTimer: 0 };

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
      timer: 0,
      duplicates: 0,
      setComplete: false,
      speed: SPEED_INITIAL,
      spawnTimer: 0
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
      <h1>${won ? 'SET COMPLETE!' : 'TIME\'S UP!'}</h1>
      <h2>Final Score: ${state.score}</h2>
      <p>Stickers collected: ${state.collected.length}/16</p>
      <p>Duplicates: ${state.duplicates}</p>
      ${state.setComplete ? '<p style="color:#fbbf24">+200 Set Complete Bonus!</p>' : ''}
      <button class="btn" id="start-btn">${won ? 'PLAY AGAIN' : 'TRY AGAIN'}</button>
    `;
    document.getElementById('start-btn').addEventListener('click', startGame);
  }

  function drawBasket() {
    const x = state.basketX - BASKET_W / 2;
    const y = canvas.height - BASKET_H - 10;

    // Basket body
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + BASKET_W, y);
    ctx.lineTo(x + BASKET_W - 10, y + BASKET_H);
    ctx.lineTo(x + 10, y + BASKET_H);
    ctx.closePath();
    ctx.fill();

    // Basket rim
    ctx.fillStyle = '#d97706';
    ctx.fillRect(x - 5, y - 5, BASKET_W + 10, 8);

    return { x, y };
  }

  function drawSticker() {
    if (!state.fallingSticker) return;
    const s = state.fallingSticker;
    ctx.font = `${STICKER_SIZE}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.flag, s.x, s.y);

    // Glow effect
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 15;
    ctx.fillText(s.flag, s.x, s.y);
    ctx.shadowBlur = 0;
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

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (state.mode === 'title') return;

    // Background field
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#1a2744');
    grad.addColorStop(1, '#0d1f3c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Speed indicator
    ctx.fillStyle = 'rgba(167,139,250,0.3)';
    ctx.fillRect(0, canvas.height - 5, canvas.width * ((state.speed - SPEED_INITIAL) / (SPEED_INCREMENT * 20)), 5);

    drawSticker();
    drawBasket();
    drawCollected();

    scoreEl.textContent = `Score: ${state.score}`;
    collectedEl.textContent = `Collected: ${state.collected.length}/16`;
    timerEl.textContent = `Time: ${Math.floor(state.timer)}s`;
  }

  function update(dt) {
    if (state.mode !== 'playing') return;
    state.timer += dt;
    state.spawnTimer += dt;

    // Increase speed over time
    state.speed = SPEED_INITIAL + Math.floor(state.timer / 5) * SPEED_INCREMENT;

    if (!state.fallingSticker || state.spawnTimer > 2) {
      spawnSticker();
    }

    if (state.fallingSticker) {
      state.fallingSticker.y += state.speed * dt * 60;

      const s = state.fallingSticker;
      const basketY = canvas.height - BASKET_H - 10;
      const basketLeft = state.basketX - BASKET_W / 2;
      const basketRight = state.basketX + BASKET_W / 2;

      // Check catch
      if (s.y + STICKER_SIZE / 2 >= basketY && s.x >= basketLeft - 10 && s.x <= basketRight + 10) {
        const isDuplicate = state.collected.includes(s.flag);
        if (isDuplicate) {
          state.score = Math.max(0, state.score - 5);
          state.duplicates++;
        } else {
          state.score += 10;
          state.collected.push(s.flag);
        }
        state.fallingSticker = null;
        state.spawnTimer = 0;

        // Check win
        if (state.collected.length >= FLAGS.length) {
          state.setComplete = true;
          endGame(true);
          return;
        }

        setTimeout(() => { if (state.mode === 'playing') spawnSticker(); }, 500);
      }

      // Check miss (fell off screen)
      if (s && s.y > canvas.height + STICKER_SIZE) {
        state.fallingSticker = null;
        state.spawnTimer = 0;
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

  // Touch/mouse control
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
      timer: Math.floor(state.timer),
      duplicates: state.duplicates,
      setComplete: state.setComplete,
      speed: state.speed
    });
  }

  window.render_game_to_text = renderGameToText;

  startBtn.addEventListener('click', startGame);

  // Game loop
  let lastTime = 0;
  function loop(ts) {
    if (lastTime && state.mode === 'playing') {
      const dt = (ts - lastTime) / 1000;
      update(dt);
    }
    lastTime = ts;
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  render();
})();
