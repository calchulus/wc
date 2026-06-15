(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  let W, H;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const COLORS = {
    sky: '#1a5276',
    grass: '#27ae60',
    grassLight: '#2ecc71',
    goalPost: '#ecf0f1',
    net: 'rgba(255,255,255,0.3)',
    ball: '#ffffff',
    ballShadow: 'rgba(0,0,0,0.3)',
    keeper: '#e74c3c',
    keeperGloves: '#f1c40f',
    aimLine: 'rgba(255,255,255,0.25)',
    wind: 'rgba(255,255,255,0.15)',
    text: '#ffffff',
    streak: '#f39c12',
    danger: '#e74c3c',
    safe: '#2ecc71',
    particle: ['#f1c40f', '#e74c3c', '#ffffff', '#3498db', '#2ecc71'],
  };

  const DIFFICULTY_THRESHOLDS = {
    movingKeeper: 5,
    wind: 10,
    smallGoal: 15,
    rotatingDive: 20,
  };

  const state = {
    mode: 'title',
    score: 0,
    streak: 0,
    multiplier: 1,
    bestScore: parseInt(localStorage.getItem('penaltyMarathon_best') || '0'),
    ball: { x: 0, y: 0, vx: 0, vy: 0, r: 12, active: false, trail: [] },
    keeper: { x: 0, y: 0, w: 80, h: 100, baseY: 0, diveDir: 0, diveTimer: 0, diveSpeed: 2, moving: false, moveDir: 1, moveSpeed: 1.5, divePhase: 0 },
    aim: { x: W / 2, y: H / 2, active: false },
    goalArea: { x: 0, y: 0, w: 0, h: 0 },
    goalTop: 0,
    particles: [],
    wind: { active: false, force: 0, direction: 0 },
    message: '',
    messageTimer: 0,
    difficultyLevel: 0,
    time: 0,
    mouseX: W / 2,
    mouseY: H / 2,
    smallGoalActive: false,
    rotatingDiveActive: false,
  };

  function initGoalArea() {
    const gw = Math.min(W * 0.55, 400);
    const gh = gw * 0.5;
    const gx = (W - gw) / 2;
    const gy = H * 0.12;
    state.goalArea = { x: gx, y: gy, w: gw, h: gh };
    state.goalTop = gy;
    state.keeper.x = W / 2;
    state.keeper.baseY = gy + gh - state.keeper.h;
    state.keeper.y = state.keeper.baseY;
    state.keeper.w = 80;
    state.keeper.h = 100;
  }

  function applySmallGoal() {
    const shrink = 0.2;
    const gw = state.goalArea.w * (1 - shrink);
    const gh = state.goalArea.h * (1 - shrink);
    state.goalArea.x = (W - gw) / 2;
    state.goalArea.w = gw;
    state.goalArea.h = gh;
    state.smallGoalActive = true;
  }

  function initBall() {
    state.ball.x = W / 2;
    state.ball.y = H * 0.82;
    state.ball.vx = 0;
    state.ball.vy = 0;
    state.ball.active = false;
    state.ball.trail = [];
  }

  function getDifficultyLevel() {
    const s = state.score;
    if (s >= DIFFICULTY_THRESHOLDS.rotatingDive) return 4;
    if (s >= DIFFICULTY_THRESHOLDS.smallGoal) return 3;
    if (s >= DIFFICULTY_THRESHOLDS.wind) return 2;
    if (s >= DIFFICULTY_THRESHOLDS.movingKeeper) return 1;
    return 0;
  }

  function updateDifficulty() {
    const newLevel = getDifficultyLevel();
    if (newLevel > state.difficultyLevel) {
      state.difficultyLevel = newLevel;
      if (newLevel >= 1) {
        state.keeper.moving = true;
        state.keeper.moveSpeed = 1.5 + state.score * 0.05;
      }
      if (newLevel >= 2) {
        state.wind.active = true;
        state.wind.force = 0.3 + state.score * 0.02;
        state.wind.direction = Math.random() > 0.5 ? 1 : -1;
      }
      if (newLevel >= 3 && !state.smallGoalActive) {
        applySmallGoal();
      }
      if (newLevel >= 4) {
        state.rotatingDiveActive = true;
        state.keeper.diveSpeed = 3 + state.score * 0.05;
      }
    }
  }

  function spawnParticles(x, y, count, colors, speed, life) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed;
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: life * (0.5 + Math.random() * 0.5),
        maxLife: life,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      p.life -= dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, COLORS.sky);
    grad.addColorStop(0.4, '#2980b9');
    grad.addColorStop(0.55, COLORS.grass);
    grad.addColorStop(1, '#1e8449');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (let i = 0; i < W; i += 60) {
      ctx.beginPath();
      ctx.moveTo(i, H * 0.45);
      ctx.lineTo(i, H);
      ctx.stroke();
    }
  }

  function drawGoal() {
    const g = state.goalArea;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(g.x, g.y, g.w, g.h);

    ctx.strokeStyle = COLORS.net;
    ctx.lineWidth = 1;
    const spacing = 15;
    for (let x = g.x; x <= g.x + g.w; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, g.y);
      ctx.lineTo(x, g.y + g.h);
      ctx.stroke();
    }
    for (let y = g.y; y <= g.y + g.h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(g.x, y);
      ctx.lineTo(g.x + g.w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = COLORS.goalPost;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y + g.h);
    ctx.lineTo(g.x, g.y);
    ctx.lineTo(g.x + g.w, g.y);
    ctx.lineTo(g.x + g.w, g.y + g.h);
    ctx.stroke();

    ctx.fillStyle = COLORS.goalPost;
    ctx.beginPath();
    ctx.arc(g.x, g.y + g.h, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(g.x + g.w, g.y + g.h, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawKeeper() {
    const k = state.keeper;
    const cx = k.x;
    const cy = k.y + k.h / 2;

    ctx.fillStyle = COLORS.keeper;
    ctx.beginPath();
    ctx.roundRect(cx - k.w / 2, k.y, k.w, k.h, 8);
    ctx.fill();

    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(cx, k.y + 18, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.keeperGloves;
    const armSpread = k.w / 2 + 12;
    ctx.beginPath();
    ctx.arc(cx - armSpread, cy - 5, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + armSpread, cy - 5, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBall() {
    const b = state.ball;

    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      const alpha = (i / b.trail.length) * 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS.ball;
      ctx.beginPath();
      ctx.arc(t.x, t.y, b.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = COLORS.ballShadow;
    ctx.beginPath();
    ctx.ellipse(b.x + 3, b.y + b.r + 4, b.r * 0.8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#2c3e50';
    const pentR = b.r * 0.35;
    const pentCount = 5;
    for (let i = 0; i < pentCount; i++) {
      const angle = (i / pentCount) * Math.PI * 2 - Math.PI / 2;
      const px = b.x + Math.cos(angle) * b.r * 0.5;
      const py = b.y + Math.sin(angle) * b.r * 0.5;
      ctx.beginPath();
      ctx.arc(px, py, pentR * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawAim() {
    if (state.mode !== 'aiming' || !state.aim.active) return;

    ctx.strokeStyle = COLORS.aimLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(state.ball.x, state.ball.y);
    ctx.lineTo(state.aim.x, state.aim.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(state.aim.x, state.aim.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWind() {
    if (!state.wind.active) return;
    const t = state.time;
    ctx.fillStyle = COLORS.wind;
    for (let i = 0; i < 12; i++) {
      const x = ((t * 40 * state.wind.direction + i * 90) % (W + 100)) - 50;
      const y = H * 0.3 + Math.sin(t * 2 + i) * 30;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 20 * state.wind.direction, y - 3);
      ctx.lineTo(x + 25 * state.wind.direction, y);
      ctx.lineTo(x + 20 * state.wind.direction, y + 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = COLORS.text;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WIND ' + (state.wind.direction > 0 ? '→' : '←'), W - 50, H * 0.35);
  }

  function drawHUD() {
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Score: ' + state.score, 20, 40);

    if (state.streak > 0) {
      ctx.fillStyle = COLORS.streak;
      ctx.fillText('x' + state.multiplier + ' streak', 20, 72);
    }

    ctx.textAlign = 'right';
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#bdc3c7';
    ctx.fillText('Best: ' + state.bestScore, W - 20, 40);

    const dl = state.difficultyLevel;
    const dlNames = ['Normal', 'Moving Keeper', 'Wind!', 'Small Goal!', 'Rotating Dive!'];
    const dlColors = [COLORS.safe, '#f39c12', '#3498db', COLORS.danger, '#8e44ad'];
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = dlColors[dl];
    ctx.fillText(dlNames[dl], W / 2, H - 20);

    const barW = 200;
    const barH = 6;
    const barX = (W - barW) / 2;
    const barY = H - 12;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(barX, barY, barW, barH);
    const nextThresholds = [
      DIFFICULTY_THRESHOLDS.movingKeeper,
      DIFFICULTY_THRESHOLDS.wind,
      DIFFICULTY_THRESHOLDS.smallGoal,
      DIFFICULTY_THRESHOLDS.rotatingDive,
    ];
    if (dl < 4) {
      const curr = dl === 0 ? 0 : Object.values(DIFFICULTY_THRESHOLDS)[dl - 1];
      const next = nextThresholds[dl];
      const progress = (state.score - curr) / (next - curr);
      ctx.fillStyle = dlColors[dl];
      ctx.fillRect(barX, barY, barW * Math.min(1, progress), barH);
    } else {
      ctx.fillStyle = '#8e44ad';
      ctx.fillRect(barX, barY, barW, barH);
    }

    if (state.messageTimer > 0) {
      const alpha = Math.min(1, state.messageTimer / 0.5);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.message, W / 2, H * 0.5);
      ctx.globalAlpha = 1;
    }
  }

  function drawTitle() {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PENALTY MARATHON', W / 2, H * 0.28);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#bdc3c7';
    ctx.fillText('Score as many penalties as you can!', W / 2, H * 0.36);
    ctx.fillText('Difficulty increases every 5 goals', W / 2, H * 0.41);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#95a5a6';
    ctx.fillText('5 goals: Moving keeper | 10: Wind | 15: Small goal | 20: Rotating dive', W / 2, H * 0.47);

    const btnW = 220;
    const btnH = 56;
    const btnX = (W - btnW) / 2;
    const btnY = H * 0.56;
    ctx.fillStyle = COLORS.safe;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('KICK OFF', W / 2, btnY + 36);

    if (state.bestScore > 0) {
      ctx.font = '16px sans-serif';
      ctx.fillStyle = COLORS.streak;
      ctx.fillText('Best: ' + state.bestScore, W / 2, H * 0.7);
    }

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#7f8c8d';
    ctx.fillText('Mouse/touch to aim, click/tap to shoot', W / 2, H * 0.82);
    ctx.fillText('Press F for fullscreen | ESC to exit', W / 2, H * 0.86);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MISS!', W / 2, H * 0.3);

    ctx.fillStyle = COLORS.text;
    ctx.font = '24px sans-serif';
    ctx.fillText('Score: ' + state.score, W / 2, H * 0.4);
    ctx.fillStyle = COLORS.streak;
    ctx.fillText('Best: ' + state.bestScore, W / 2, H * 0.46);

    if (state.score >= state.bestScore && state.score > 0) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('NEW HIGH SCORE!', W / 2, H * 0.52);
    }

    const btnW = 220;
    const btnH = 56;
    const btnX = (W - btnW) / 2;
    const btnY = H * 0.6;
    ctx.fillStyle = COLORS.safe;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('TRY AGAIN', W / 2, btnY + 36);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#7f8c8d';
    ctx.fillText('Click/tap or press Space to restart', W / 2, H * 0.78);
  }

  function resetGame() {
    state.score = 0;
    state.streak = 0;
    state.multiplier = 1;
    state.difficultyLevel = 0;
    state.keeper.moving = false;
    state.keeper.moveDir = 1;
    state.keeper.divePhase = 0;
    state.wind.active = false;
    state.smallGoalActive = false;
    state.rotatingDiveActive = false;
    state.particles = [];
    state.message = '';
    state.messageTimer = 0;
    initGoalArea();
    initBall();
    state.mode = 'aiming';
    state.aim.active = false;
  }

  function checkGoal() {
    const b = state.ball;
    const g = state.goalArea;
    const inGoalX = b.x > g.x + 10 && b.x < g.x + g.w - 10;
    const inGoalY = b.y < g.y + g.h && b.y > g.y;
    return inGoalX && inGoalY;
  }

  function checkKeeperSave() {
    const b = state.ball;
    const k = state.keeper;
    const kLeft = k.x - k.w / 2 - 15;
    const kRight = k.x + k.w / 2 + 15;
    const kTop = k.y - 15;
    const kBottom = k.y + k.h + 15;
    return b.x + b.r > kLeft && b.x - b.r < kRight &&
           b.y + b.r > kTop && b.y - b.r < kBottom;
  }

  function shootBall() {
    if (state.mode !== 'aiming') return;

    const b = state.ball;
    const targetX = state.aim.active ? state.aim.x : state.mouseX;
    const targetY = state.aim.active ? state.aim.y : state.mouseY;

    const dx = targetX - b.x;
    const dy = targetY - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 500;

    b.vx = (dx / dist) * speed;
    b.vy = (dy / dist) * speed;
    b.active = true;
    state.mode = 'shooting';

    state.keeper.diveDir = dx > 0 ? 1 : -1;
    state.keeper.diveTimer = 0;
  }

  function updateKeeper(dt) {
    const k = state.keeper;
    if (k.moving && state.mode === 'aiming') {
      k.x += k.moveDir * k.moveSpeed * 60 * dt;
      if (k.x > state.goalArea.x + state.goalArea.w - k.w / 2) {
        k.x = state.goalArea.x + state.goalArea.w - k.w / 2;
        k.moveDir = -1;
      }
      if (k.x < state.goalArea.x + k.w / 2) {
        k.x = state.goalArea.x + k.w / 2;
        k.moveDir = 1;
      }
    }

    if (state.mode === 'shooting' && state.ball.active) {
      k.diveTimer += dt;
      const diveDelay = state.rotatingDiveActive ? 0.08 : 0.15;

      if (k.diveTimer > diveDelay) {
        let targetDir = k.diveDir;
        if (state.rotatingDiveActive) {
          k.divePhase += dt * 2;
          const pattern = Math.sin(k.divePhase);
          if (pattern > 0.3) targetDir = 1;
          else if (pattern < -0.3) targetDir = -1;
          else targetDir = 0;
        }
        k.x += targetDir * k.diveSpeed * 60 * dt;
      }

      const centerY = (state.goalArea.y + state.goalArea.h) / 2;
      k.y += (centerY - k.y) * dt * 4;
    } else {
      k.y += (k.baseY - k.y) * dt * 5;
    }

    k.x = Math.max(state.goalArea.x + k.w / 2, Math.min(state.goalArea.x + state.goalArea.w - k.w / 2, k.x));
  }

  function updateBall(dt) {
    const b = state.ball;
    if (!b.active) return;

    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > 15) b.trail.shift();

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (state.wind.active) {
      b.vx += state.wind.force * state.wind.direction * 60 * dt;
    }

    b.vy += 120 * dt;

    if (checkKeeperSave() || b.y > H + 50 || b.x < -50 || b.x > W + 50) {
      handleMiss();
      return;
    }

    if (checkGoal()) {
      handleGoal();
      return;
    }
  }

  function handleGoal() {
    state.ball.active = false;
    state.score++;
    state.streak++;
    state.multiplier = Math.min(5, 1 + Math.floor(state.streak / 3));

    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      localStorage.setItem('penaltyMarathon_best', state.bestScore.toString());
    }

    spawnParticles(state.ball.x, state.ball.y, 30, COLORS.particle, 200, 1.5);
    state.message = 'GOAL!';
    state.messageTimer = 1.2;

    updateDifficulty();
    setTimeout(() => {
      if (state.mode === 'shooting') {
        initBall();
        state.mode = 'aiming';
      }
    }, 800);
  }

  function handleMiss() {
    state.ball.active = false;
    state.streak = 0;
    state.multiplier = 1;

    spawnParticles(state.ball.x, state.ball.y, 20, [COLORS.danger, '#c0392b', '#7f8c8d'], 150, 1);

    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      localStorage.setItem('penaltyMarathon_best', state.bestScore.toString());
    }

    state.mode = 'gameover';
  }

  function update(dt) {
    state.time += dt;
    state.messageTimer = Math.max(0, state.messageTimer - dt);
    updateKeeper(dt);
    updateBall(dt);
    updateParticles(dt);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawGoal();
    drawWind();
    drawKeeper();
    drawBall();
    drawAim();
    drawParticles();
    drawHUD();

    if (state.mode === 'title') drawTitle();
    if (state.mode === 'gameover') drawGameOver();
  }

  let lastTime = 0;
  function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function isInsideBtn(x, y, bx, by, bw, bh) {
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
  }

  function handleClick(e) {
    const pos = getCanvasPos(e);

    if (state.mode === 'title') {
      const btnW = 220, btnH = 56;
      const btnX = (W - btnW) / 2, btnY = H * 0.56;
      if (isInsideBtn(pos.x, pos.y, btnX, btnY, btnW, btnH)) {
        resetGame();
      }
      return;
    }

    if (state.mode === 'gameover') {
      const btnW = 220, btnH = 56;
      const btnX = (W - btnW) / 2, btnY = H * 0.6;
      if (isInsideBtn(pos.x, pos.y, btnX, btnY, btnW, btnH)) {
        resetGame();
      }
      return;
    }

    if (state.mode === 'aiming') {
      state.aim.x = pos.x;
      state.aim.y = pos.y;
      state.aim.active = true;
      shootBall();
    }
  }

  function handleMove(e) {
    e.preventDefault();
    const pos = getCanvasPos(e);
    state.mouseX = pos.x;
    state.mouseY = pos.y;
    if (state.mode === 'aiming') {
      state.aim.x = pos.x;
      state.aim.y = pos.y;
      state.aim.active = true;
    }
  }

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousemove', handleMove);
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleMove(e);
    handleClick(e);
  }, { passive: false });
  canvas.addEventListener('touchmove', handleMove, { passive: false });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) {
        canvas.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    }
    if (e.key === 'Escape' && document.fullscreenElement) {
      document.exitFullscreen();
    }
    if (e.key === ' ' || e.key === 'Enter') {
      if (state.mode === 'title' || state.mode === 'gameover') {
        resetGame();
      }
    }
  });

  initGoalArea();
  initBall();
  requestAnimationFrame(gameLoop);

  function renderGameToText() {
    const payload = {
      mode: state.mode,
      score: state.score,
      streak: state.streak,
      multiplier: state.multiplier,
      bestScore: state.bestScore,
      difficultyLevel: state.difficultyLevel,
      ball: { x: Math.round(state.ball.x), y: Math.round(state.ball.y), active: state.ball.active },
      keeper: { x: Math.round(state.keeper.x), y: Math.round(state.keeper.y), moving: state.keeper.moving },
      goalArea: { x: Math.round(state.goalArea.x), y: Math.round(state.goalArea.y), w: Math.round(state.goalArea.w), h: Math.round(state.goalArea.h) },
      wind: { active: state.wind.active, force: Math.round(state.wind.force * 100) / 100, direction: state.wind.direction },
      smallGoalActive: state.smallGoalActive,
      rotatingDiveActive: state.rotatingDiveActive,
      aim: state.aim.active ? { x: Math.round(state.aim.x), y: Math.round(state.aim.y) } : null,
      message: state.message,
    };
    return JSON.stringify(payload);
  }
  window.render_game_to_text = renderGameToText;

  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) update(1 / 60);
    render();
  };

  window._gameState = state;
})();
