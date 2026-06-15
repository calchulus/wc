(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('start-btn');
  const scoreEl = document.getElementById('score-display');
  const timerEl = document.getElementById('timer-display');
  const swapsEl = document.getElementById('swaps-display');

  const GRID = 4;
  const TILE = canvas.width / GRID;
  const TOTAL_TIME = 60;

  let state = { mode: 'title', tiles: [], selected: -1, swapCount: 0, timer: TOTAL_TIME, solved: false, gridSize: GRID };

  function generatePattern() {
    const colors = [];
    for (let r = 0; r < GRID; r++) {
      colors[r] = [];
      for (let c = 0; c < GRID; c++) {
        const hue = (r * 60 + c * 90 + 20) % 360;
        const sat = 70 + ((r + c) * 10) % 30;
        const lit = 45 + ((r * 3 + c * 7) % 25);
        colors[r][c] = `hsl(${hue}, ${sat}%, ${lit}%)`;
      }
    }
    return colors;
  }

  function buildTiles(pattern) {
    const tiles = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        tiles.push({ r, c, color: pattern[r][c], idx: r * GRID + c });
      }
    }
    return tiles;
  }

  function shuffleTiles(tiles) {
    const arr = tiles.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Ensure not already solved
    const solved = arr.every((t, i) => t.idx === i);
    if (solved && arr.length > 1) {
      [arr[0], arr[1]] = [arr[1], arr[0]];
    }
    return arr;
  }

  function isSolved() {
    return state.tiles.every((t, i) => t.idx === i);
  }

  function drawTile(tile, x, y, selected) {
    ctx.fillStyle = tile.color;
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);

    // Draw gradient overlay for depth
    const grad = ctx.createLinearGradient(x, y, x + TILE, y + TILE);
    grad.addColorStop(0, 'rgba(255,255,255,0.15)');
    grad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);

    // Draw original position label
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${tile.idx + 1}`, x + TILE / 2, y + TILE / 2);

    if (selected) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 4;
      ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
    }
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.mode === 'title') return;

    for (let i = 0; i < state.tiles.length; i++) {
      const col = i % GRID;
      const row = Math.floor(i / GRID);
      drawTile(state.tiles[i], col * TILE, row * TILE, i === state.selected);
    }

    scoreEl.textContent = `Score: ${calcScore()}`;
    timerEl.textContent = `Time: ${Math.ceil(state.timer)}`;
    swapsEl.textContent = `Swaps: ${state.swapCount}`;
  }

  function calcScore() {
    const base = 100;
    const swapPenalty = state.swapCount * 2;
    const timePenalty = Math.floor(TOTAL_TIME - state.timer);
    return Math.max(0, base - swapPenalty - timePenalty);
  }

  function startGame() {
    const pattern = generatePattern();
    const tiles = buildTiles(pattern);
    state = {
      mode: 'playing',
      tiles: shuffleTiles(tiles),
      selected: -1,
      swapCount: 0,
      timer: TOTAL_TIME,
      solved: false,
      gridSize: GRID
    };
    overlay.classList.add('hidden');
  }

  function endGame(won) {
    state.mode = 'gameover';
    const score = calcScore();
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <h1>${won ? 'PUZZLE SOLVED!' : 'TIME\'S UP!'}</h1>
      <h2>Final Score: ${score}</h2>
      <p>Swaps: ${state.swapCount}</p>
      <p>Time elapsed: ${Math.floor(TOTAL_TIME - state.timer)}s</p>
      <button class="btn" id="start-btn">${won ? 'PLAY AGAIN' : 'TRY AGAIN'}</button>
    `;
    document.getElementById('start-btn').addEventListener('click', startGame);
  }

  canvas.addEventListener('click', (e) => {
    if (state.mode !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const col = Math.floor(mx / TILE);
    const row = Math.floor(my / TILE);
    const idx = row * GRID + col;

    if (idx < 0 || idx >= state.tiles.length) return;

    if (state.selected === -1) {
      state.selected = idx;
    } else if (state.selected === idx) {
      state.selected = -1;
    } else {
      // Swap
      [state.tiles[state.selected], state.tiles[idx]] = [state.tiles[idx], state.tiles[state.selected]];
      state.swapCount++;
      state.selected = -1;

      if (isSolved()) {
        state.solved = true;
        endGame(true);
      }
    }
    render();
  });

  window.advanceTime = (ms) => {
    if (state.mode !== 'playing') return;
    state.timer -= ms / 1000;
    if (state.timer <= 0) {
      state.timer = 0;
      endGame(false);
    }
    render();
  };

  function renderGameToText() {
    return JSON.stringify({
      mode: state.mode,
      tiles: state.tiles.map((t, i) => ({ pos: i, origIdx: t.idx, correct: t.idx === i })),
      selected: state.selected,
      swapCount: state.swapCount,
      timer: Math.ceil(state.timer),
      solved: state.solved,
      gridSize: state.gridSize,
      score: calcScore()
    });
  }

  window.render_game_to_text = renderGameToText;

  startBtn.addEventListener('click', startGame);

  // Game loop
  let lastTime = 0;
  function loop(ts) {
    if (lastTime && state.mode === 'playing') {
      const dt = ts - lastTime;
      state.timer -= dt / 1000;
      if (state.timer <= 0) {
        state.timer = 0;
        endGame(false);
      }
    }
    lastTime = ts;
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  render();
})();
