(function () {
  const TOTAL_BUDGET = 1000;
  const GRID_COLS = 12;
  const GRID_ROWS = 10;
  const ISO_ANGLE = Math.PI / 6;
  const TILE_W = 64;
  const TILE_H = 32;

  const THEMES = {
    classic:  { name: 'Classic',  colors: { pitch: '#2d8a4e', stands: '#8B4513', roof: '#A0522D', lights: '#FFD700', scoreboard: '#333', ground: '#5a7247' } },
    modern:   { name: 'Modern',   colors: { pitch: '#1faa59', stands: '#4a90d9', roof: '#2c3e50', lights: '#ecf0f1', scoreboard: '#2c3e50', ground: '#3d5c3a' } },
    futuristic: { name: 'Futuristic', colors: { pitch: '#00e676', stands: '#7c4dff', roof: '#1a1a2e', lights: '#00e5ff', scoreboard: '#e040fb', ground: '#1b5e20' } },
    eco:      { name: 'Eco-Friendly', colors: { pitch: '#66bb6a', stands: '#8d6e63', roof: '#a5d6a7', lights: '#fff176', scoreboard: '#4e342e', ground: '#4caf50' } }
  };

  const COMPONENTS = [
    { id: 'pitch',       name: 'Pitch',       icon: '\u26BD', cost: 0,   capacity: 0, aesthetics: 5, fan: 8, sustainability: 6, desc: 'Playing field' },
    { id: 'stands_n',    name: 'North Stands', icon: '\uD83C\uDFDF', cost: 80,  capacity: 15, aesthetics: 4, fan: 6, sustainability: 3, desc: 'Seating block' },
    { id: 'stands_s',    name: 'South Stands', icon: '\uD83C\uDFDF', cost: 80,  capacity: 15, aesthetics: 4, fan: 6, sustainability: 3, desc: 'Seating block' },
    { id: 'stands_e',    name: 'East Stands',  icon: '\uD83C\uDFDF', cost: 80,  capacity: 15, aesthetics: 4, fan: 6, sustainability: 3, desc: 'Seating block' },
    { id: 'stands_w',    name: 'West Stands',  icon: '\uD83C\uDFDF', cost: 80,  capacity: 15, aesthetics: 4, fan: 6, sustainability: 3, desc: 'Seating block' },
    { id: 'roof',        name: 'Roof',         icon: '\u2602',  cost: 120, capacity: 0,  aesthetics: 7, fan: 9, sustainability: 4, desc: 'Weather cover' },
    { id: 'lights',      name: 'Floodlights',  icon: '\uD83D\uDCA1', cost: 60,  capacity: 0,  aesthetics: 5, fan: 7, sustainability: 3, desc: 'Night games' },
    { id: 'scoreboard',  name: 'Scoreboard',   icon: '\uD83D\uDCFA', cost: 50,  capacity: 0,  aesthetics: 6, fan: 8, sustainability: 2, desc: 'Match display' },
    { id: 'vip',         name: 'VIP Box',      icon: '\uD83C\uDFC6', cost: 100, capacity: 2,  aesthetics: 8, fan: 5, sustainability: 2, desc: 'Premium seats' },
    { id: 'parking',     name: 'Parking',      icon: '\uD83D\uDE97', cost: 40,  capacity: 0,  aesthetics: 2, fan: 3, sustainability: 4, desc: 'Visitor parking' },
    { id: 'trees',       name: 'Trees',        icon: '\uD83C\uDF33', cost: 20,  capacity: 0,  aesthetics: 6, fan: 4, sustainability: 9, desc: 'Green areas' },
    { id: 'solar',       name: 'Solar Panels', icon: '\u2600',  cost: 70,  capacity: 0,  aesthetics: 3, fan: 2, sustainability: 10, desc: 'Renewable energy' }
  ];

  let state = {
    theme: 'classic',
    grid: [],
    selectedComponent: null,
    budget: TOTAL_BUDGET,
    placed: [],
    hoverCell: null,
    dragging: false,
    dragStart: null,
    offsetX: 0,
    offsetY: 0,
    animTime: 0
  };

  function initGrid() {
    state.grid = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      state.grid[r] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        state.grid[r][c] = null;
      }
    }
  }

  function budgetUsed() {
    return state.placed.reduce((s, p) => {
      const comp = COMPONENTS.find(c => c.id === p.compId);
      return s + (comp ? comp.cost : 0);
    }, 0);
  }

  function budgetRemaining() { return TOTAL_BUDGET - budgetUsed(); }

  function computeScores() {
    let cap = 0, aes = 0, fan = 0, sus = 0;
    state.placed.forEach(p => {
      const comp = COMPONENTS.find(c => c.id === p.compId);
      if (!comp) return;
      cap += comp.capacity;
      aes += comp.aesthetics;
      fan += comp.fan;
      sus += comp.sustainability;
    });
    if (state.placed.length > 3) aes += 2;
    if (state.placed.length > 6) aes += 3;
    const hasPitch = state.placed.some(p => p.compId === 'pitch');
    if (hasPitch) { fan += 5; }
    const hasRoof = state.placed.some(p => p.compId === 'roof');
    if (hasRoof && state.placed.some(p => p.compId.startsWith('stands'))) fan += 4;
    const hasSolar = state.placed.some(p => p.compId === 'solar');
    const hasTrees = state.placed.some(p => p.compId === 'trees');
    if (hasSolar && hasTrees) sus += 5;
    return { capacity: cap, aesthetics: aes, fan: fan, sustainability: sus, total: cap + aes + fan + sus };
  }

  function isoProject(col, row, cx, cy) {
    const x = (col - row) * (TILE_W / 2) + cx;
    const y = (col + row) * (TILE_H / 2) + cy;
    return { x, y };
  }

  const canvas = document.getElementById('stadium-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    const area = document.getElementById('canvas-area');
    canvas.width = area.clientWidth;
    canvas.height = area.clientHeight;
  }
  window.addEventListener('resize', resize);

  function drawIsometricTile(x, y, color, hover) {
    ctx.beginPath();
    ctx.moveTo(x, y - TILE_H / 2);
    ctx.lineTo(x + TILE_W / 2, y);
    ctx.lineTo(x, y + TILE_H / 2);
    ctx.lineTo(x - TILE_W / 2, y);
    ctx.closePath();
    ctx.fillStyle = hover ? lightenColor(color, 30) : color;
    ctx.fill();
    ctx.strokeStyle = hover ? '#fff' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = hover ? 2 : 1;
    ctx.stroke();
  }

  function drawBlock(x, y, w, h, depth, color) {
    const hw = w / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - hw, y - depth);
    ctx.lineTo(x, y - depth - h);
    ctx.lineTo(x + hw, y - depth);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = darkenColor(color, 20);
    ctx.beginPath();
    ctx.moveTo(x - hw, y - depth);
    ctx.lineTo(x, y - depth - h);
    ctx.lineTo(x, y + TILE_H / 2 - depth);
    ctx.lineTo(x - hw, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lightenColor(color, 15);
    ctx.beginPath();
    ctx.moveTo(x + hw, y - depth);
    ctx.lineTo(x, y - depth - h);
    ctx.lineTo(x, y + TILE_H / 2 - depth);
    ctx.lineTo(x + hw, y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function lightenColor(hex, pct) {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = Math.min(255, (num >> 16) + pct);
    let g = Math.min(255, ((num >> 8) & 0xff) + pct);
    let b = Math.min(255, (num & 0xff) + pct);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function darkenColor(hex, pct) {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = Math.max(0, (num >> 16) - pct);
    let g = Math.max(0, ((num >> 8) & 0xff) - pct);
    let b = Math.max(0, (num & 0xff) - pct);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function render() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const themeColors = THEMES[state.theme].colors;
    const cx = w / 2 + state.offsetX;
    const cy = h / 2 - 40 + state.offsetY;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const pos = isoProject(c, r, cx, cy);
        const isHover = state.hoverCell && state.hoverCell.row === r && state.hoverCell.col === c;
        const cellContent = state.grid[r][c];

        if (cellContent) {
          drawTileContent(pos.x, pos.y, cellContent, themeColors, isHover, r, c);
        } else {
          drawIsometricTile(pos.x, pos.y, themeColors.ground, isHover);
        }

        if (isHover && state.selectedComponent && !cellContent) {
          const preview = drawPreview(pos.x, pos.y, state.selectedComponent, themeColors);
          ctx.globalAlpha = 0.5 + 0.15 * Math.sin(state.animTime * 4);
          drawTileContent(pos.x, pos.y, state.selectedComponent, themeColors, false, r, c);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  function drawTileContent(x, y, compId, colors, hover, row, col) {
    const color = colors[compId] || colors.ground;
    drawIsometricTile(x, y, color, hover);

    switch (compId) {
      case 'pitch':
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(x - 10, y - 1, 20, 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 12, y - 4, 24, 8);
        break;
      case 'stands_n': case 'stands_s': case 'stands_e': case 'stands_w':
        drawBlock(x, y, TILE_W * 0.6, 12, 0, color);
        break;
      case 'roof':
        drawBlock(x, y, TILE_W * 0.8, 4, 16, color);
        break;
      case 'lights':
        ctx.fillStyle = '#888';
        ctx.fillRect(x - 1, y - 20, 2, 20);
        ctx.fillStyle = colors.lights;
        ctx.beginPath();
        ctx.arc(x, y - 22, 4, 0, Math.PI * 2);
        ctx.fill();
        const glow = ctx.createRadialGradient(x, y - 22, 0, x, y - 22, 12);
        glow.addColorStop(0, 'rgba(255,255,200,0.3)');
        glow.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y - 22, 12, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'scoreboard':
        drawBlock(x, y, TILE_W * 0.5, 10, 8, color);
        ctx.fillStyle = '#0f0';
        ctx.font = '6px monospace';
        ctx.fillText('0-0', x - 6, y - 12);
        break;
      case 'vip':
        drawBlock(x, y, TILE_W * 0.5, 14, 2, color);
        ctx.fillStyle = '#ffd700';
        ctx.font = '8px sans-serif';
        ctx.fillText('VIP', x - 8, y - 14);
        break;
      case 'parking':
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x - 14, y - 6, 28, 12);
        ctx.fillStyle = '#fff';
        ctx.font = '6px sans-serif';
        ctx.fillText('P', x - 3, y + 2);
        break;
      case 'trees':
        ctx.fillStyle = '#2d5a1e';
        ctx.beginPath();
        ctx.moveTo(x, y - 20);
        ctx.lineTo(x - 8, y - 2);
        ctx.lineTo(x + 8, y - 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(x - 1.5, y - 4, 3, 6);
        break;
      case 'solar':
        drawBlock(x, y, TILE_W * 0.5, 2, 4, '#1a237e');
        ctx.fillStyle = '#42a5f5';
        ctx.fillRect(x - 8, y - 8, 16, 6);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - 8, y - 8, 16, 6);
        break;
    }
  }

  function drawPreview(x, y, compId, colors) { return true; }

  function screenToGrid(sx, sy) {
    const cx = canvas.width / 2 + state.offsetX;
    const cy = canvas.height / 2 - 40 + state.offsetY;
    const dx = sx - cx;
    const dy = sy - cy;
    const col = Math.round((dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2);
    const row = Math.round((dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      return { col, row };
    }
    return null;
  }

  function placeComponent(col, row, compId) {
    if (state.grid[row][col]) return false;
    const comp = COMPONENTS.find(c => c.id === compId);
    if (!comp) return false;
    if (budgetRemaining() < comp.cost) return false;
    state.grid[row][col] = compId;
    state.placed.push({ compId, row, col });
    return true;
  }

  function removeComponent(col, row) {
    const compId = state.grid[row][col];
    if (!compId) return;
    state.grid[row][col] = null;
    state.placed = state.placed.filter(p => !(p.row === row && p.col === col));
  }

  function updateUI() {
    const scores = computeScores();
    document.getElementById('budget-bar').style.width = ((budgetRemaining() / TOTAL_BUDGET) * 100) + '%';
    document.getElementById('budget-text').textContent = budgetRemaining() + ' / ' + TOTAL_BUDGET;
    document.getElementById('score-capacity').textContent = scores.capacity;
    document.getElementById('score-aesthetics').textContent = scores.aesthetics;
    document.getElementById('score-fan').textContent = scores.fan;
    document.getElementById('score-sustainability').textContent = scores.sustainability;
    document.getElementById('score-total').textContent = scores.total;
    const bar = document.getElementById('budget-bar');
    if (budgetRemaining() < 200) bar.style.background = 'linear-gradient(90deg, #e94560, #ff6b6b)';
    else bar.style.background = 'linear-gradient(90deg, #e94560, #f5a623)';
  }

  function buildComponentList() {
    const list = document.getElementById('component-list');
    list.innerHTML = '';
    COMPONENTS.forEach(comp => {
      const btn = document.createElement('div');
      btn.className = 'component-btn' + (state.selectedComponent === comp.id ? ' selected' : '');
      btn.dataset.compId = comp.id;
      btn.innerHTML = `<span class="icon">${comp.icon}</span><div class="info"><div class="name">${comp.name}</div><div class="cost">$${comp.cost}</div><div class="stats">${comp.desc}</div></div>`;
      btn.addEventListener('click', () => {
        state.selectedComponent = (state.selectedComponent === comp.id) ? null : comp.id;
        buildComponentList();
      });
      list.appendChild(btn);
    });
  }

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    state.hoverCell = screenToGrid(mx, my);
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cell = screenToGrid(mx, my);
    if (!cell) return;

    if (e.shiftKey && state.grid[cell.row][cell.col]) {
      removeComponent(cell.col, cell.row);
      updateUI();
      return;
    }

    if (state.selectedComponent) {
      if (placeComponent(cell.col, cell.row, state.selectedComponent)) {
        updateUI();
      }
    }
  });

  let isPanning = false, panStartX, panStartY;
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning = true;
      panStartX = e.clientX - state.offsetX;
      panStartY = e.clientY - state.offsetY;
      e.preventDefault();
    }
  });
  canvas.addEventListener('mousemove', (e) => {
    if (isPanning) {
      state.offsetX = e.clientX - panStartX;
      state.offsetY = e.clientY - panStartY;
    }
  });
  canvas.addEventListener('mouseup', () => { isPanning = false; });

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      const cell = screenToGrid(mx, my);
      if (cell && state.selectedComponent) {
        if (placeComponent(cell.col, cell.row, state.selectedComponent)) {
          updateUI();
        }
      }
    }
  });

  document.getElementById('theme-select').addEventListener('change', (e) => {
    state.theme = e.target.value;
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    initGrid();
    state.placed = [];
    updateUI();
  });

  document.getElementById('save-btn').addEventListener('click', () => {
    const scores = computeScores();
    const design = {
      theme: state.theme,
      grid: state.grid,
      placed: state.placed,
      scores,
      timestamp: Date.now()
    };
    let saved = JSON.parse(localStorage.getItem('stadium_designs') || '[]');
    saved.push(design);
    localStorage.setItem('stadium_designs', JSON.stringify(saved));
    alert('Design saved!');
  });

  document.getElementById('load-btn').addEventListener('click', () => {
    const saved = JSON.parse(localStorage.getItem('stadium_designs') || '[]');
    if (saved.length === 0) { alert('No saved designs.'); return; }
    const latest = saved[saved.length - 1];
    state.theme = latest.theme;
    state.grid = latest.grid;
    state.placed = latest.placed || [];
    document.getElementById('theme-select').value = state.theme;
    updateUI();
  });

  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    const saved = JSON.parse(localStorage.getItem('stadium_designs') || '[]');
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    const sorted = saved.sort((a, b) => (b.scores?.total || 0) - (a.scores?.total || 0));
    if (sorted.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:#888;">No designs yet. Build and save a stadium!</div>';
    }
    sorted.forEach((d, i) => {
      const entry = document.createElement('div');
      entry.className = 'lb-entry';
      const date = new Date(d.timestamp).toLocaleDateString();
      entry.innerHTML = `<span class="rank">#${i + 1}</span><span class="design-name">${THEMES[d.theme]?.name || d.theme} (${date})</span><span class="score-val">${d.scores?.total || 0}</span>`;
      list.appendChild(entry);
    });
    document.getElementById('leaderboard-modal').classList.remove('hidden');
  });

  document.getElementById('close-leaderboard').addEventListener('click', () => {
    document.getElementById('leaderboard-modal').classList.add('hidden');
  });

  let lastTime = 0;
  function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    state.animTime += dt;
    resize();
    render();
    updateUI();
    requestAnimationFrame(gameLoop);
  }

  function renderGameToText() {
    const scores = computeScores();
    const payload = {
      theme: state.theme,
      selectedComponent: state.selectedComponent,
      budget: { remaining: budgetRemaining(), total: TOTAL_BUDGET },
      placedComponents: state.placed.map(p => ({ id: p.compId, row: p.row, col: p.col })),
      scores: { capacity: scores.capacity, aesthetics: scores.aesthetics, fan: scores.fan, sustainability: scores.sustainability, total: scores.total },
      grid: state.grid
    };
    return JSON.stringify(payload);
  }
  window.render_game_to_text = renderGameToText;

  window.advanceTime = (ms) => {
    state.animTime += ms / 1000;
  };

  initGrid();
  buildComponentList();
  updateUI();
  resize();
  requestAnimationFrame(gameLoop);
})();
