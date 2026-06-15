(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('start-btn');
  const scoreEl = document.getElementById('score-display');
  const levelEl = document.getElementById('level-display');
  const timerEl = document.getElementById('timer-display');

  const LEVELS = [
    { w: 10, h: 10, defenders: 2, stars: 3 },
    { w: 12, h: 12, defenders: 3, stars: 4 },
    { w: 14, h: 14, defenders: 3, stars: 5 },
    { w: 16, h: 16, defenders: 4, stars: 5 },
    { w: 18, h: 18, defenders: 5, stars: 6 }
  ];

  let state = { mode: 'title', maze: [], playerX: 0, playerY: 0, defenders: [], goalX: 0, goalY: 0, level: 0, timer: 0, score: 0, stars: [] };
  let cellSize = 0;

  function generateMaze(w, h) {
    const maze = Array.from({ length: h }, () => Array(w).fill(1));
    const visited = Array.from({ length: h }, () => Array(w).fill(false));

    function carve(x, y) {
      visited[y][x] = true;
      maze[y][x] = 0;
      const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
      }
      for (const [dx, dy] of dirs) {
        const nx = x + dx * 2, ny = y + dy * 2;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny][nx]) {
          maze[y + dy][x + dx] = 0;
          carve(nx, ny);
        }
      }
    }
    carve(1, 1);

    // Ensure borders are walkable for player start
    maze[1][1] = 0;

    return maze;
  }

  function placeDefenders(maze, count) {
    const defenders = [];
    const h = maze.length, w = maze[0].length;
    let placed = 0;
    while (placed < count) {
      const x = 2 + Math.floor(Math.random() * (w - 4));
      const y = 2 + Math.floor(Math.random() * (h - 4));
      if (maze[y][x] === 0 && !(x === 1 && y === 1)) {
        const horizontal = Math.random() > 0.5;
        const range = 2 + Math.floor(Math.random() * 3);
        defenders.push({ x, y, startX: x, startY: y, horizontal, range, dir: 1, speed: 0.5 + Math.random() * 0.5 });
        placed++;
      }
    }
    return defenders;
  }

  function placeStars(maze, count) {
    const stars = [];
    const h = maze.length, w = maze[0].length;
    let placed = 0;
    while (placed < count) {
      const x = 1 + Math.floor(Math.random() * (w - 2));
      const y = 1 + Math.floor(Math.random() * (h - 2));
      if (maze[y][x] === 0 && !(x === 1 && y === 1) && !stars.some(s => s.x === x && s.y === y)) {
        stars.push({ x, y, collected: false });
        placed++;
      }
    }
    return stars;
  }

  function startLevel() {
    const cfg = LEVELS[state.level];
    const maze = generateMaze(cfg.w, cfg.h);
    cellSize = Math.floor(Math.min(canvas.width, canvas.height) / Math.max(cfg.w, cfg.h));

    state.maze = maze;
    state.playerX = 1;
    state.playerY = 1;
    state.defenders = placeDefenders(maze, cfg.defenders);
    state.stars = placeStars(maze, cfg.stars);
    state.goalX = cfg.w - 2;
    state.goalY = cfg.h - 2;
    state.maze[state.goalY][state.goalX] = 0;
    state.maze[1][1] = 0;
    // Make sure adjacent to goal is open
    if (state.goalX > 0) state.maze[state.goalY][state.goalX - 1] = 0;
    if (state.goalY > 0) state.maze[state.goalY - 1][state.goalX] = 0;
    state.timer = 0;
    state.mode = 'playing';
    overlay.classList.add('hidden');
  }

  function startGame() {
    state = { mode: 'title', maze: [], playerX: 0, playerY: 0, defenders: [], goalX: 0, goalY: 0, level: 0, timer: 0, score: 0, stars: [] };
    state.level = 0;
    state.score = 0;
    startLevel();
  }

  function drawMaze() {
    const h = state.maze.length;
    const w = state.maze[0].length;
    const offsetX = Math.floor((canvas.width - w * cellSize) / 2);
    const offsetY = Math.floor((canvas.height - h * cellSize) / 2);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;
        if (state.maze[y][x] === 1) {
          ctx.fillStyle = '#1e3a5f';
          ctx.fillRect(px, py, cellSize, cellSize);
          ctx.strokeStyle = '#0f2744';
          ctx.strokeRect(px, py, cellSize, cellSize);
        } else {
          ctx.fillStyle = '#1a2744';
          ctx.fillRect(px, py, cellSize, cellSize);
        }
      }
    }
    return { offsetX, offsetY };
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (state.mode === 'title') return;

    const { offsetX, offsetY } = drawMaze();

    // Draw stars
    ctx.font = `${cellSize * 0.7}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const s of state.stars) {
      if (!s.collected) {
        ctx.fillText('⭐', offsetX + s.x * cellSize + cellSize / 2, offsetY + s.y * cellSize + cellSize / 2);
      }
    }

    // Draw goal
    ctx.fillText('🥅', offsetX + state.goalX * cellSize + cellSize / 2, offsetY + state.goalY * cellSize + cellSize / 2);

    // Draw defenders
    ctx.font = `${cellSize * 0.65}px serif`;
    for (const d of state.defenders) {
      ctx.fillText('🏃', offsetX + d.x * cellSize + cellSize / 2, offsetY + d.y * cellSize + cellSize / 2);
    }

    // Draw player
    ctx.font = `${cellSize * 0.7}px serif`;
    ctx.fillText('⚽', offsetX + state.playerX * cellSize + cellSize / 2, offsetY + state.playerY * cellSize + cellSize / 2);

    // HUD
    scoreEl.textContent = `Score: ${state.score}`;
    levelEl.textContent = `Level: ${state.level + 1}`;
    timerEl.textContent = `Time: ${Math.floor(state.timer)}s`;
  }

  function updateDefenders(dt) {
    for (const d of state.defenders) {
      if (d.horizontal) {
        d.x += d.dir * d.speed * dt;
        if (Math.abs(d.x - d.startX) >= d.range) {
          d.dir *= -1;
          d.x = d.startX + d.dir * d.range;
        }
      } else {
        d.y += d.dir * d.speed * dt;
        if (Math.abs(d.y - d.startY) >= d.range) {
          d.dir *= -1;
          d.y = d.startY + d.dir * d.range;
        }
      }
      // Clamp to integer grid positions for collision
      d.gridX = Math.round(d.x);
      d.gridY = Math.round(d.y);
    }
  }

  function checkCollisions() {
    for (const d of state.defenders) {
      const dx = Math.abs(state.playerX - Math.round(d.x));
      const dy = Math.abs(state.playerY - Math.round(d.y));
      if (dx + dy < 1) return 'caught';
    }
    if (state.playerX === state.goalX && state.playerY === state.goalY) return 'goal';
    for (const s of state.stars) {
      if (!s.collected && state.playerX === s.x && state.playerY === s.y) {
        s.collected = true;
        state.score += 10;
      }
    }
    return 'ok';
  }

  function endGame(won) {
    state.mode = 'gameover';
    const timeBonus = Math.max(0, 100 - Math.floor(state.timer));
    const starsCollected = state.stars.filter(s => s.collected).length;
    const levelBonus = (state.level + 1) * 50;
    state.score += timeBonus + levelBonus;

    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <h1>${won ? 'GOAL! LEVEL COMPLETE!' : 'CAUGHT!'}</h1>
      <h2>Final Score: ${state.score}</h2>
      <p>Level reached: ${state.level + 1}</p>
      <p>Time bonus: +${timeBonus}</p>
      <p>Level bonus: +${levelBonus}</p>
      <button class="btn" id="start-btn">${won && state.level < LEVELS.length - 1 ? 'NEXT LEVEL' : 'PLAY AGAIN'}</button>
    `;
    document.getElementById('start-btn').addEventListener('click', () => {
      if (won && state.level < LEVELS.length - 1) {
        state.level++;
        startLevel();
      } else {
        startGame();
      }
    });
    if (typeof Leaderboard !== 'undefined') {
      Leaderboard.promptName(function (name) {
        Leaderboard.addScore('maze', state.score, name);
        Leaderboard.renderLeaderboard('maze', 'leaderboard-container', state.score);
      });
    }
  }

  function movePlayer(dx, dy) {
    if (state.mode !== 'playing') return;
    const nx = state.playerX + dx;
    const ny = state.playerY + dy;
    if (ny >= 0 && ny < state.maze.length && nx >= 0 && nx < state.maze[0].length && state.maze[ny][nx] === 0) {
      state.playerX = nx;
      state.playerY = ny;
      const result = checkCollisions();
      if (result === 'caught') endGame(false);
      else if (result === 'goal') endGame(true);
    }
  }

  document.addEventListener('keydown', (e) => {
    if (state.mode !== 'playing') return;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': movePlayer(0, -1); e.preventDefault(); break;
      case 'ArrowDown': case 's': case 'S': movePlayer(0, 1); e.preventDefault(); break;
      case 'ArrowLeft': case 'a': case 'A': movePlayer(-1, 0); e.preventDefault(); break;
      case 'ArrowRight': case 'd': case 'D': movePlayer(1, 0); e.preventDefault(); break;
    }
  });

  window.advanceTime = (ms) => {
    if (state.mode !== 'playing') return;
    const dt = ms / 1000;
    state.timer += dt;
    updateDefenders(dt);
    const result = checkCollisions();
    if (result === 'caught') endGame(false);
    else if (result === 'goal') endGame(true);
    render();
  };

  function renderGameToText() {
    const cfg = LEVELS[state.level] || LEVELS[0];
    return JSON.stringify({
      mode: state.mode,
      maze: state.maze,
      playerX: state.playerX,
      playerY: state.playerY,
      defenders: state.defenders.map(d => ({ x: Math.round(d.x), y: Math.round(d.y), horizontal: d.horizontal })),
      goalX: state.goalX,
      goalY: state.goalY,
      level: state.level,
      timer: Math.floor(state.timer),
      score: state.score,
      stars: state.stars.map(s => ({ x: s.x, y: s.y, collected: s.collected }))
    });
  }

  window.render_game_to_text = renderGameToText;

  startBtn.addEventListener('click', startGame);

  // Game loop
  let lastTime = 0;
  function loop(ts) {
    if (lastTime && state.mode === 'playing') {
      const dt = (ts - lastTime) / 1000;
      state.timer += dt;
      updateDefenders(dt);
      const result = checkCollisions();
      if (result === 'caught') endGame(false);
      else if (result === 'goal') endGame(true);
    }
    lastTime = ts;
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  render();
})();
