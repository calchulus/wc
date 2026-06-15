const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 500;

const POSES = [
  { name: 'slide', label: 'Slide', keyframe: 'slide' },
  { name: 'dance', label: 'Dance', keyframe: 'dance' },
  { name: 'flex', label: 'Flex', keyframe: 'flex' },
  { name: 'scream', label: 'Scream', keyframe: 'scream' },
  { name: 'backflip', label: 'Backflip', keyframe: 'backflip' },
  { name: 'knee', label: 'Knee Slide', keyframe: 'knee' }
];

const EFFECTS = [
  { name: 'confetti', label: 'Confetti', color: '#ffd700' },
  { name: 'fireworks', label: 'Fireworks', color: '#ff4444' },
  { name: 'smoke', label: 'Smoke', color: '#888' },
  { name: 'rainbow', label: 'Rainbow', color: '#ff00ff' }
];

const state = {
  mode: 'select',
  selectedPose: null,
  selectedEffect: null,
  timeline: [],
  message: '',
  particles: [],
  stickFigure: { x: 400, y: 320, angle: 0, limbAngle: 0, pose: null },
  playing: false,
  playbackIndex: 0,
  playbackTimer: 0,
  playbackDelay: 800,
  score: 0,
  creativity: 0,
  confetti: [],
  fireworks: [],
  smoke: [],
  rainbowTrail: [],
  time: 0
};

function initUI() {
  const posesGrid = document.getElementById('poses-grid');
  POSES.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'pose-btn';
    btn.textContent = p.label;
    btn.addEventListener('click', () => selectPose(p.name));
    posesGrid.appendChild(btn);
  });

  const effectsGrid = document.getElementById('effects-grid');
  EFFECTS.forEach(e => {
    const btn = document.createElement('button');
    btn.className = 'effect-btn';
    btn.textContent = e.label;
    btn.addEventListener('click', () => selectEffect(e.name));
    effectsGrid.appendChild(btn);
  });

  document.getElementById('message-input').addEventListener('input', e => {
    state.message = e.target.value;
  });

  document.getElementById('clear-timeline').addEventListener('click', clearTimeline);
  document.getElementById('record-btn').addEventListener('click', startRecording);
  document.getElementById('play-btn').addEventListener('click', startPlayback);
  document.getElementById('share-btn').addEventListener('click', shareScreenshot);
}

function selectPose(name) {
  if (state.playing) return;
  state.selectedPose = name;
  state.selectedEffect = null;
  document.querySelectorAll('.pose-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.effect-btn').forEach(b => b.classList.remove('selected'));
  const btns = document.querySelectorAll('.pose-btn');
  const idx = POSES.findIndex(p => p.name === name);
  if (idx >= 0) btns[idx].classList.add('selected');
  addToTimeline('pose', name);
}

function selectEffect(name) {
  if (state.playing) return;
  state.selectedEffect = name;
  document.querySelectorAll('.effect-btn').forEach(b => b.classList.remove('selected'));
  const btns = document.querySelectorAll('.effect-btn');
  const idx = EFFECTS.findIndex(e => e.name === name);
  if (idx >= 0) btns[idx].classList.add('selected');
  addToTimeline('effect', name);
}

function addToTimeline(type, name) {
  if (state.timeline.length >= 4) return;
  state.timeline.push({ type, name });
  renderTimeline();
  if (state.timeline.length > 0) {
    document.getElementById('play-btn').disabled = false;
    document.getElementById('share-btn').disabled = false;
  }
  updateScore();
}

function renderTimeline() {
  const container = document.getElementById('timeline');
  container.innerHTML = '';
  state.timeline.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'timeline-item ' + item.type;
    el.textContent = item.type === 'pose' ? item.name : item.name[0];
    container.appendChild(el);
  });
}

function clearTimeline() {
  state.timeline = [];
  renderTimeline();
  document.getElementById('play-btn').disabled = true;
  document.getElementById('share-btn').disabled = true;
  state.score = 0;
  state.creativity = 0;
  updateScoreDisplay();
}

function startRecording() {
  if (state.playing) return;
  state.mode = 'record';
  document.getElementById('record-btn').textContent = 'Recording...';
  document.getElementById('record-btn').disabled = true;
  setTimeout(() => {
    state.mode = 'select';
    document.getElementById('record-btn').textContent = 'Record';
    document.getElementById('record-btn').disabled = false;
  }, 2000);
}

function startPlayback() {
  if (state.playing || state.timeline.length === 0) return;
  state.playing = true;
  state.playbackIndex = 0;
  state.playbackTimer = 0;
  state.particles = [];
  state.confetti = [];
  state.fireworks = [];
  state.smoke = [];
  state.rainbowTrail = [];
  document.getElementById('play-btn').disabled = true;
}

function shareScreenshot() {
  const link = document.createElement('a');
  link.download = 'celebration.png';
  link.href = canvas.toDataURL();
  link.click();
}

function updateScore() {
  const poses = state.timeline.filter(i => i.type === 'pose');
  const effects = state.timeline.filter(i => i.type === 'effect');
  const uniquePoses = new Set(poses.map(p => p.name)).size;
  const uniqueEffects = new Set(effects.map(e => e.name)).size;
  state.creativity = Math.min(100, uniquePoses * 15 + uniqueEffects * 20 + (state.message ? 10 : 0));
  state.score = state.timeline.length * 25 + state.creativity;
  updateScoreDisplay();
}

function updateScoreDisplay() {
  document.getElementById('score-value').textContent = state.score;
  document.getElementById('creativity-value').textContent = state.creativity;
}

function drawPitch() {
  ctx.fillStyle = '#2d5a27';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#4a8a3a';
  ctx.lineWidth = 2;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  ctx.fillStyle = '#1a3a17';
  ctx.fillRect(300, 350, 200, 150);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.strokeRect(300, 350, 200, 150);
}

function drawStickFigure(pose, t) {
  const cx = 400, cy = 320;
  const s = state.stickFigure;
  s.pose = pose;
  s.time = t;

  ctx.save();
  ctx.translate(cx, cy);

  let rotation = 0;
  let leftArmAngle = 0;
  let rightArmAngle = 0;
  let leftLegAngle = 0;
  let rightLegAngle = 0;
  let bodyOffset = 0;

  switch (pose) {
    case 'slide':
      rotation = -0.3;
      leftArmAngle = -1.2;
      rightArmAngle = -1.2;
      bodyOffset = Math.sin(t * 4) * 5;
      break;
    case 'dance':
      rotation = Math.sin(t * 3) * 0.2;
      leftArmAngle = Math.sin(t * 6) * 1.5;
      rightArmAngle = Math.sin(t * 6 + 1) * 1.5;
      leftLegAngle = Math.sin(t * 4) * 0.5;
      rightLegAngle = Math.sin(t * 4 + 2) * 0.5;
      break;
    case 'flex':
      rotation = 0;
      leftArmAngle = -2.0;
      rightArmAngle = -2.0;
      bodyOffset = Math.sin(t * 2) * 3;
      break;
    case 'scream':
      rotation = 0.1;
      leftArmAngle = -1.8;
      rightArmAngle = -1.8;
      bodyOffset = Math.sin(t * 8) * 4;
      break;
    case 'backflip':
      rotation = (t * 3) % (Math.PI * 2);
      bodyOffset = Math.abs(Math.sin(t * 3)) * -40;
      break;
    case 'knee':
      rotation = -0.2;
      leftArmAngle = -1.5;
      rightArmAngle = 0.5;
      leftLegAngle = -1.2;
      bodyOffset = Math.sin(t * 3) * 8;
      break;
  }

  ctx.rotate(rotation);
  ctx.translate(0, bodyOffset);

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  // Head
  ctx.beginPath();
  ctx.arc(0, -50, 15, 0, Math.PI * 2);
  ctx.stroke();

  // Body
  ctx.beginPath();
  ctx.moveTo(0, -35);
  ctx.lineTo(0, 10);
  ctx.stroke();

  // Left arm
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(Math.sin(leftArmAngle) * 30, -25 + Math.cos(leftArmAngle) * 30);
  ctx.stroke();

  // Right arm
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(Math.sin(rightArmAngle) * -30, -25 + Math.cos(rightArmAngle) * 30);
  ctx.stroke();

  // Left leg
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(Math.sin(leftLegAngle) * 15, 10 + Math.cos(leftLegAngle) * 40);
  ctx.stroke();

  // Right leg
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(Math.sin(rightLegAngle) * -15, 10 + Math.cos(rightLegAngle) * 40);
  ctx.stroke();

  // Jersey
  ctx.fillStyle = '#e94560';
  ctx.fillRect(-10, -35, 20, 25);

  // Shorts
  ctx.fillStyle = '#333';
  ctx.fillRect(-10, 10, 20, 15);

  ctx.restore();

  if (pose === 'scream') {
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GOAL!', cx, cy - 80);
  }
}

function spawnConfetti() {
  for (let i = 0; i < 5; i++) {
    state.confetti.push({
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 1,
      color: ['#ffd700', '#ff4444', '#44ff44', '#4444ff', '#ff44ff'][Math.floor(Math.random() * 5)],
      size: Math.random() * 6 + 3,
      rotation: Math.random() * Math.PI * 2
    });
  }
}

function spawnFirework() {
  const fx = 200 + Math.random() * 400;
  const fy = 100 + Math.random() * 100;
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20;
    const speed = Math.random() * 3 + 1;
    state.fireworks.push({
      x: fx, y: fy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color: ['#ff4444', '#ffd700', '#44ff44', '#ff44ff'][Math.floor(Math.random() * 4)]
    });
  }
}

function spawnSmoke() {
  for (let i = 0; i < 3; i++) {
    state.smoke.push({
      x: 400 + (Math.random() - 0.5) * 40,
      y: 330,
      vy: -Math.random() * 2 - 0.5,
      size: Math.random() * 20 + 10,
      life: 1
    });
  }
}

function updateParticles(dt) {
  state.confetti = state.confetti.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.rotation += 0.05;
    return p.y < canvas.height + 10;
  });

  state.fireworks = state.fireworks.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02;
    p.life -= dt * 2;
    return p.life > 0;
  });

  state.smoke = state.smoke.filter(p => {
    p.y += p.vy;
    p.size += 0.5;
    p.life -= dt;
    return p.life > 0;
  });
}

function renderParticles() {
  state.confetti.forEach(p => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
    ctx.restore();
  });

  state.fireworks.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  state.smoke.forEach(p => {
    ctx.globalAlpha = p.life * 0.5;
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function renderMessage() {
  if (!state.message) return;
  ctx.save();
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(state.message, 400, 50);
  ctx.restore();
}

function updatePlayback(dt) {
  if (!state.playing) return;

  state.playbackTimer += dt * 1000;

  if (state.playbackTimer >= state.playbackDelay) {
    state.playbackTimer = 0;

    if (state.playbackIndex < state.timeline.length) {
      const item = state.timeline[state.playbackIndex];
      if (item.type === 'pose') {
        state.stickFigure.pose = item.name;
      } else if (item.type === 'effect') {
        switch (item.name) {
          case 'confetti': spawnConfetti(); break;
          case 'fireworks': spawnFirework(); break;
          case 'smoke': spawnSmoke(); break;
          case 'rainbow': break;
        }
      }
      state.playbackIndex++;
    } else {
      state.playing = false;
      document.getElementById('play-btn').disabled = false;
      state.stickFigure.pose = null;
    }
  }

  if (state.playing && state.stickFigure.pose) {
    if (Math.random() < 0.3) spawnConfetti();
  }
}

function render() {
  drawPitch();

  const currentPose = state.playing ? state.stickFigure.pose : (state.selectedPose || null);
  const t = state.time;

  if (currentPose) {
    drawStickFigure(currentPose, t);
  } else {
    drawStickFigure('dance', t * 0.3);
  }

  renderParticles();
  renderMessage();
}

function update(dt) {
  state.time += dt;
  updateParticles(dt);
  updatePlayback(dt);
}

let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function renderGameToText() {
  const currentPose = state.playing ? state.stickFigure.pose : (state.selectedPose || 'idle');
  return JSON.stringify({
    mode: state.mode,
    selectedPose: state.selectedPose,
    selectedEffect: state.selectedEffect,
    timeline: state.timeline,
    message: state.message,
    currentPose: currentPose,
    effects: {
      confetti: state.confetti.length,
      fireworks: state.fireworks.length,
      smoke: state.smoke.length
    },
    score: state.score,
    creativity: state.creativity,
    playing: state.playing,
    playbackIndex: state.playbackIndex
  });
}

window.render_game_to_text = renderGameToText;

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) update(1 / 60);
  render();
};

initUI();
requestAnimationFrame(gameLoop);
