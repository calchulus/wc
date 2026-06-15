(function() {
  'use strict';

  const TOTAL_ROUNDS = 20;
  const WHISTLE_TIME_LIMIT = 2000;
  const DECISION_TIME_LIMIT = 3000;
  const REPLAY_SPEED = 0.25;

  const INCIDENT_TYPES = [
    { type: 'tackle_from_behind', label: 'Challenge from behind', difficulty: 1 },
    { type: 'handball', label: 'Handball?', difficulty: 1 },
    { type: 'offside', label: 'Offside situation', difficulty: 2 },
    { type: 'diving', label: 'Possible dive', difficulty: 2 },
    { type: 'rough_tackle', label: 'Hard tackle', difficulty: 2 },
    { type: 'push', label: 'Push in the box', difficulty: 3 },
    { type: 'shirt_pull', label: 'Shirt pulling', difficulty: 3 },
    { type: 'late_challenge', label: 'Late challenge', difficulty: 3 },
    { type: 'handball_deliberate', label: 'Deliberate handball', difficulty: 3 },
    { type: 'cleats_up', label: 'Cleats up tackle', difficulty: 4 },
  ];

  const DECISIONS = ['FOUL', 'NO FOUL', 'YELLOW CARD', 'RED CARD', 'OFFSIDE'];

  const RATING_THRESHOLDS = [
    { min: 90, emoji: '🏆', title: 'LEGENDARY REF!', desc: 'You are the world\'s best referee!' },
    { min: 75, emoji: '🥇', title: 'ELITE REF!', desc: 'Outstanding performance!' },
    { min: 60, emoji: '🥈', title: 'SOLID REF', desc: 'Good game management.' },
    { min: 40, emoji: '🥉', title: 'DECENT REF', desc: 'Room for improvement.' },
    { min: 0, emoji: '📋', title: 'ROOKIE REF', desc: 'Keep practicing!' },
  ];

  let state = {
    phase: 'start',
    round: 0,
    score: 0,
    correct: 0,
    totalWhistleTime: 0,
    incidents: [],
    currentIncident: null,
    animationTime: 0,
    whistleBlown: false,
    whistleTime: 0,
    decisionTimer: 0,
    decisionStarted: false,
    playerDecision: null,
    showingReplay: false,
    replayTime: 0,
    animFrame: 0,
    timerInterval: null,
  };

  let canvas, ctx, replayCanvas, replayCtx;

  function init() {
    canvas = document.getElementById('incident-canvas');
    ctx = canvas.getContext('2d');
    replayCanvas = document.getElementById('replay-canvas');
    replayCtx = replayCanvas.getContext('2d');

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('whistle-btn').addEventListener('click', blowWhistle);
    document.getElementById('next-btn').addEventListener('click', nextRound);
    document.getElementById('restart-btn').addEventListener('click', startGame);

    document.querySelectorAll('.dec-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        makeDecision(this.dataset.decision);
      });
    });

    drawField(ctx);
    drawField(replayCtx);
  }

  function resizeCanvas() {
    const area = document.getElementById('incident-area');
    const w = area.clientWidth;
    const h = area.clientHeight;
    canvas.width = w * (window.devicePixelRatio || 1);
    canvas.height = h * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    replayCanvas.width = w * (window.devicePixelRatio || 1);
    replayCanvas.height = h * (window.devicePixelRatio || 1);
    replayCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    state.canvasW = w;
    state.canvasH = h;
  }

  function startGame() {
    state.phase = 'playing';
    state.round = 0;
    state.score = 0;
    state.correct = 0;
    state.totalWhistleTime = 0;
    state.incidents = generateIncidents();
    state.playerDecision = null;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('replay-overlay').classList.add('hidden');

    updateScore();
    startRound();
  }

  function generateIncidents() {
    let incidents = [];
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
      const diff = Math.min(4, Math.floor(i / 5) + 1);
      const pool = INCIDENT_TYPES.filter(t => t.difficulty <= diff);
      const incident = { ...pool[Math.floor(Math.random() * pool.length)] };
      incident.correctDecision = getCorrectDecision(incident.type);
      incident.incidentTime = 0.6 + Math.random() * 0.4;
      incidents.push(incident);
    }
    return incidents;
  }

  function getCorrectDecision(type) {
    const map = {
      'tackle_from_behind': 'FOUL',
      'handball': Math.random() > 0.3 ? 'FOUL' : 'NO FOUL',
      'offside': 'OFFSIDE',
      'diving': 'NO FOUL',
      'rough_tackle': Math.random() > 0.4 ? 'YELLOW CARD' : 'RED CARD',
      'push': Math.random() > 0.5 ? 'FOUL' : 'YELLOW CARD',
      'shirt_pull': 'FOUL',
      'late_challenge': Math.random() > 0.3 ? 'YELLOW CARD' : 'FOUL',
      'handball_deliberate': 'RED CARD',
      'cleats_up': 'RED CARD',
    };
    return map[type] || 'FOUL';
  }

  function startRound() {
    state.round++;
    if (state.round > TOTAL_ROUNDS) {
      endGame();
      return;
    }

    state.currentIncident = state.incidents[state.round - 1];
    state.animationTime = 0;
    state.whistleBlown = false;
    state.whistleTime = 0;
    state.decisionTimer = 0;
    state.decisionStarted = false;
    state.playerDecision = null;
    state.showingReplay = false;
    state.replayTime = 0;

    document.getElementById('round').textContent = state.round;
    document.getElementById('decision-panel').classList.add('hidden');
    document.getElementById('whistle-prompt').classList.remove('hidden');
    document.getElementById('whistle-btn').classList.remove('blowing');
    document.getElementById('whistle-btn').textContent = ' blows whistle!';
    document.getElementById('replay-overlay').classList.add('hidden');
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('incident-label').textContent = state.currentIncident.label;

    resetTimerBar();

    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(timerTick, 16);
  }

  function timerTick() {
    if (state.phase !== 'playing') return;
    if (state.showingReplay) return;

    if (!state.whistleBlown) {
      state.animationTime += 16;
      if (state.animationTime >= WHISTLE_TIME_LIMIT) {
        blowWhistle();
      }
    } else if (state.decisionStarted) {
      state.decisionTimer += 16;
      if (state.decisionTimer >= DECISION_TIME_LIMIT) {
        makeDecision('TIME_UP');
      }
    }

    updateTimerDisplay();
    drawFrame();
  }

  function updateTimerDisplay() {
    let remaining;
    let maxTime;
    if (!state.whistleBlown) {
      remaining = Math.max(0, WHISTLE_TIME_LIMIT - state.animationTime);
      maxTime = WHISTLE_TIME_LIMIT;
    } else if (state.decisionStarted) {
      remaining = Math.max(0, DECISION_TIME_LIMIT - state.decisionTimer);
      maxTime = DECISION_TIME_LIMIT;
    } else {
      return;
    }

    const pct = (remaining / maxTime) * 100;
    const bar = document.getElementById('timer-bar');
    bar.style.width = pct + '%';
    bar.className = '';
    if (pct < 25) bar.classList.add('danger');
    else if (pct < 50) bar.classList.add('warning');

    document.getElementById('timer-text').textContent = (remaining / 1000).toFixed(1) + 's';
  }

  function resetTimerBar() {
    document.getElementById('timer-bar').style.width = '100%';
    document.getElementById('timer-bar').className = '';
    document.getElementById('timer-text').textContent = '2.0s';
  }

  function blowWhistle() {
    if (state.whistleBlown) return;
    state.whistleBlown = true;
    state.whistleTime = state.animationTime;

    document.getElementById('whistle-btn').classList.add('blowing');
    document.getElementById('whistle-btn').textContent = ' WHISTLE BLOWN! ';

    setTimeout(() => {
      document.getElementById('whistle-prompt').classList.add('hidden');
      document.getElementById('decision-panel').classList.remove('hidden');
      state.decisionStarted = true;
      state.decisionTimer = 0;
    }, 400);
  }

  function makeDecision(decision) {
    if (state.playerDecision) return;
    state.playerDecision = decision;
    state.phase = 'judging';

    const incident = state.currentIncident;
    const isCorrect = decision === incident.correctDecision;
    const whistleBonus = Math.max(0, 1 - state.whistleTime / WHISTLE_TIME_LIMIT);
    const timeBonus = Math.max(0, 1 - state.decisionTimer / DECISION_TIME_LIMIT);

    let points = 0;
    if (isCorrect) {
      points = Math.round(50 + whistleBonus * 25 + timeBonus * 25);
      state.correct++;
    }
    state.score += points;
    state.totalWhistleTime += state.whistleTime;

    document.getElementById('decision-panel').classList.add('hidden');
    if (state.timerInterval) clearInterval(state.timerInterval);

    document.querySelectorAll('.dec-btn').forEach(btn => {
      if (btn.dataset.decision === decision) {
        btn.classList.add(isCorrect ? 'correct' : 'wrong');
      } else {
        btn.classList.add('wrong');
      }
    });

    setTimeout(() => {
      document.querySelectorAll('.dec-btn').forEach(btn => {
        btn.classList.remove('correct', 'wrong');
      });
      showReplay(incident, decision, isCorrect, points);
    }, 600);
  }

  function showReplay(incident, decision, isCorrect, points) {
    state.showingReplay = true;
    state.replayTime = 0;
    state.replayIncident = incident;
    state.replayDecision = decision;
    state.replayCorrect = isCorrect;
    state.replayPoints = points;

    document.getElementById('replay-overlay').classList.remove('hidden');
    document.getElementById('next-btn').classList.add('hidden');

    const resultEl = document.getElementById('replay-result');
    if (isCorrect) {
      resultEl.innerHTML = '<span class="correct-call">CORRECT!</span> +' + points + ' pts<br>' +
        'Your call: ' + decision + ' | Correct: ' + incident.correctDecision;
    } else {
      resultEl.innerHTML = '<span class="wrong-call">WRONG!</span> +0 pts<br>' +
        'Your call: ' + decision + ' | Correct: ' + incident.correctDecision;
    }

    let replayFrame = 0;
    const replayInterval = setInterval(() => {
      replayFrame++;
      drawReplayFrame(replayFrame, incident);
      if (replayFrame >= 120) {
        clearInterval(replayInterval);
        document.getElementById('next-btn').classList.remove('hidden');
        updateScore();
      }
    }, 33);
  }

  function drawReplayFrame(frame, incident) {
    const w = state.canvasW;
    const h = state.canvasH;
    replayCtx.clearRect(0, 0, w, h);
    drawField(replayCtx);

    const t = (frame / 120) * 2;
    drawIncidentScene(replayCtx, incident, t, w, h);

    replayCtx.fillStyle = 'rgba(255,0,0,0.8)';
    replayCtx.font = 'bold 16px sans-serif';
    replayCtx.fillText('0.25x', w - 50, 20);
  }

  function nextRound() {
    state.showingReplay = false;
    state.phase = 'playing';
    startRound();
  }

  function endGame() {
    state.phase = 'end';
    if (state.timerInterval) clearInterval(state.timerInterval);

    const pct = Math.round((state.correct / TOTAL_ROUNDS) * 100);
    const rating = RATING_THRESHOLDS.find(r => pct >= r.min);

    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('rating').textContent = rating.emoji;
    document.getElementById('end-title').textContent = rating.title;
    document.getElementById('final-score').textContent = 'Score: ' + state.score + ' | ' + state.correct + '/' + TOTAL_ROUNDS + ' correct';
    document.getElementById('stats').innerHTML =
      'Accuracy: ' + pct + '%<br>' +
      'Avg Whistle: ' + (state.totalWhistleTime / TOTAL_ROUNDS / 1000).toFixed(2) + 's<br>' +
      rating.desc;
    if (typeof Leaderboard !== 'undefined') {
      Leaderboard.promptName(function (name) {
        Leaderboard.addScore('ref-simulator', state.score, name);
        Leaderboard.renderLeaderboard('ref-simulator', 'leaderboard-container', state.score);
      });
    }
  }

  function updateScore() {
    document.getElementById('score').textContent = state.score;
  }

  function drawFrame() {
    const w = state.canvasW;
    const h = state.canvasH;
    ctx.clearRect(0, 0, w, h);
    drawField(ctx);

    if (state.currentIncident) {
      const t = state.animationTime / 2000;
      drawIncidentScene(ctx, state.currentIncident, t, w, h);
    }
  }

  function drawField(c) {
    const w = state.canvasW;
    const h = state.canvasH;
    if (!w || !h) return;

    c.fillStyle = '#2d8a2d';
    c.fillRect(0, 0, w, h);

    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 2;

    c.beginPath();
    c.moveTo(w * 0.5, 0);
    c.lineTo(w * 0.5, h);
    c.stroke();

    c.beginPath();
    c.arc(w * 0.5, h * 0.5, h * 0.28, 0, Math.PI * 2);
    c.stroke();

    c.beginPath();
    c.moveTo(0, h * 0.15);
    c.lineTo(0, h * 0.85);
    c.lineTo(w * 0.12, h * 0.85);
    c.lineTo(w * 0.12, h * 0.15);
    c.closePath();
    c.stroke();

    c.beginPath();
    c.moveTo(w, h * 0.15);
    c.lineTo(w, h * 0.85);
    c.lineTo(w * 0.88, h * 0.85);
    c.lineTo(w * 0.88, h * 0.15);
    c.closePath();
    c.stroke();
  }

  function drawPlayer(c, x, y, color, label) {
    const size = 12;
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y - size * 2, size * 0.6, 0, Math.PI * 2);
    c.fill();

    c.fillRect(x - size * 0.4, y - size * 1.4, size * 0.8, size * 1.4);

    c.fillStyle = '#ffccaa';
    c.beginPath();
    c.arc(x, y - size * 3.2, size * 0.45, 0, Math.PI * 2);
    c.fill();

    if (label) {
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.font = '10px sans-serif';
      c.textAlign = 'center';
      c.fillText(label, x, y - size * 4);
      c.textAlign = 'left';
    }
  }

  function drawBall(c, x, y) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(x, y, 6, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#333';
    c.lineWidth = 1.5;
    c.stroke();

    c.fillStyle = '#333';
    c.beginPath();
    c.arc(x, y, 2, 0, Math.PI * 2);
    c.fill();
  }

  function drawWhistleIcon(c, x, y, alpha) {
    c.globalAlpha = alpha;
    c.fillStyle = '#ffd700';
    c.beginPath();
    c.arc(x, y, 10, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#000';
    c.font = 'bold 14px sans-serif';
    c.textAlign = 'center';
    c.fillText('!', x, y + 5);
    c.textAlign = 'left';
    c.globalAlpha = 1;
  }

  function drawContact(c, x, y, t) {
    const alpha = Math.max(0, 1 - t);
    if (alpha <= 0) return;
    c.globalAlpha = alpha;
    c.strokeStyle = '#ff0';
    c.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + t * 3;
      const len = 8 + t * 15;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  function drawArrow(c, x1, y1, x2, y2, color) {
    c.strokeStyle = color;
    c.lineWidth = 2;
    c.setLineDash([4, 4]);
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.setLineDash([]);
  }

  function drawOffsideLine(c, x, h) {
    c.strokeStyle = 'rgba(255,255,0,0.7)';
    c.lineWidth = 2;
    c.setLineDash([6, 4]);
    c.beginPath();
    c.moveTo(x, h * 0.1);
    c.lineTo(x, h * 0.9);
    c.stroke();
    c.setLineDash([]);
  }

  function drawIncidentScene(c, incident, t, w, h) {
    const cx = w * 0.5;
    const cy = h * 0.55;

    switch (incident.type) {
      case 'tackle_from_behind':
        drawTackleFromBehind(c, t, w, h, cx, cy);
        break;
      case 'handball':
        drawHandball(c, t, w, h, cx, cy);
        break;
      case 'offside':
        drawOffside(c, t, w, h, cx, cy);
        break;
      case 'diving':
        drawDive(c, t, w, h, cx, cy);
        break;
      case 'rough_tackle':
        drawRoughTackle(c, t, w, h, cx, cy);
        break;
      case 'push':
        drawPush(c, t, w, h, cx, cy);
        break;
      case 'shirt_pull':
        drawShirtPull(c, t, w, h, cx, cy);
        break;
      case 'late_challenge':
        drawLateChallenge(c, t, w, h, cx, cy);
        break;
      case 'handball_deliberate':
        drawDeliberateHandball(c, t, w, h, cx, cy);
        break;
      case 'cleats_up':
        drawCleatsUp(c, t, w, h, cx, cy);
        break;
    }
  }

  function drawTackleFromBehind(c, t, w, h, cx, cy) {
    const attackerX = cx - 80 + t * 60;
    const attackerY = cy;
    const defenderX = attackerX - 40 - t * 20;
    const defenderY = cy + 5;

    drawBall(c, attackerX + 15, attackerY + 5);
    drawPlayer(c, attackerX, attackerY, '#e53935', 'Attacker');
    drawPlayer(c, defenderX, defenderY, '#1565c0', 'Defender');

    if (t > 0.4) {
      const slideX = defenderX + t * 30;
      c.fillStyle = '#1565c0';
      c.fillRect(slideX - 15, cy + 12, 30, 6);
    }

    if (t > 0.5) {
      drawContact(c, attackerX, attackerY - 10, (t - 0.5) * 2);
      drawWhistleIcon(c, attackerX + 20, attackerY - 35, Math.min(1, (t - 0.5) * 3));
    }
  }

  function drawHandball(c, t, w, h, cx, cy) {
    const playerX = cx - 20 + Math.sin(t * 3) * 30;
    const playerY = cy;
    const ballX = cx + 60 - t * 80;
    const ballY = cy - 10 + Math.sin(t * 5) * 20;

    drawPlayer(c, playerX, playerY, '#e53935', 'Player');
    drawPlayer(c, cx + 100, cy + 20, '#1565c0', 'Defender');

    if (t < 0.5) {
      drawBall(c, ballX, ballY);
    } else {
      const hitY = playerY - 20;
      drawBall(c, playerX + 12, hitY);
      drawContact(c, playerX + 12, hitY, (t - 0.5) * 2);
      drawWhistleIcon(c, playerX + 30, hitY - 20, Math.min(1, (t - 0.5) * 3));
    }
  }

  function drawOffside(c, t, w, h, cx, cy) {
    drawOffsideLine(c, cx + 40, h);

    const attackerX = cx - 60 + t * 120;
    const attackerY = cy - 10;
    const defenderX = cx + 50;
    const defenderY = cy + 10;
    const passerX = cx - 120;
    const passerY = cy + 20;

    drawPlayer(c, defenderX, defenderY, '#1565c0', 'Last Def');
    drawPlayer(c, passerX, passerY, '#e53935', 'Passer');

    if (t < 0.4) {
      drawBall(c, passerX + 20 + t * 200, passerY - t * 80);
    } else {
      drawBall(c, attackerX + 15, attackerY);
    }

    drawPlayer(c, attackerX, attackerY, '#e53935', 'Attacker');
    drawArrow(c, passerX + 20, passerY - 10, attackerX, attackerY - 10, '#fff');

    if (t > 0.5) {
      drawWhistleIcon(c, attackerX, attackerY - 40, Math.min(1, (t - 0.5) * 3));
    }
  }

  function drawDive(c, t, w, h, cx, cy) {
    const playerX = cx - 40;
    const playerY = cy;
    const defenderX = cx + 60;
    const defenderY = cy;

    drawPlayer(c, defenderX, defenderY, '#1565c0', 'Defender');

    if (t < 0.3) {
      drawBall(c, playerX + 20, playerY);
      drawPlayer(c, playerX, playerY, '#e53935', 'Player');
    } else if (t < 0.5) {
      const diveProgress = (t - 0.3) / 0.2;
      const diveY = playerY - diveProgress * 30;
      drawPlayer(c, playerX + diveProgress * 20, diveY, '#e53935', 'Player');
      drawBall(c, playerX + 40, playerY + 5);
    } else {
      const fallProgress = (t - 0.5) / 0.5;
      const groundY = playerY + fallProgress * 15;
      drawPlayer(c, playerX + 20 + fallProgress * 10, groundY, '#e53935', 'Player');
      drawBall(c, playerX + 60, playerY + 5);
      if (t > 0.6) {
        drawWhistleIcon(c, playerX + 20, playerY - 50, Math.min(1, (t - 0.6) * 3));
      }
    }
  }

  function drawRoughTackle(c, t, w, h, cx, cy) {
    const attackerX = cx - 30 + t * 40;
    const attackerY = cy;
    const defenderX = cx - 80 + t * 60;
    const defenderY = cy + 8;

    drawBall(c, attackerX + 18, attackerY + 5);
    drawPlayer(c, attackerX, attackerY, '#e53935', 'Player');

    if (t < 0.4) {
      drawPlayer(c, defenderX, defenderY, '#1565c0', 'Defender');
    } else {
      const tackleX = defenderX + (t - 0.4) * 80;
      drawPlayer(c, tackleX, defenderY, '#1565c0', 'Defender');
    }

    if (t > 0.5) {
      drawContact(c, attackerX, attackerY - 5, (t - 0.5) * 2);
      drawWhistleIcon(c, attackerX + 25, attackerY - 40, Math.min(1, (t - 0.5) * 3));
    }
  }

  function drawPush(c, t, w, h, cx, cy) {
    const playerX = cx - 20;
    const playerY = cy;
    const pusherX = cx - 60 + t * 30;
    const pusherY = cy - 5;

    drawPlayer(c, pusherX, pusherY, '#1565c0', 'Defender');

    if (t < 0.4) {
      drawPlayer(c, playerX, playerY, '#e53935', 'Player');
      drawBall(c, playerX + 25, playerY - 5);
    } else {
      const pushBack = (t - 0.4) * 60;
      drawPlayer(c, playerX + pushBack, playerY + 5, '#e53935', 'Player');
      drawBall(c, playerX + pushBack + 25, playerY);
      if (t > 0.5) {
        drawContact(c, playerX + pushBack, playerY - 10, (t - 0.5) * 2);
        drawWhistleIcon(c, playerX + pushBack + 25, playerY - 45, Math.min(1, (t - 0.5) * 3));
      }
    }
  }

  function drawShirtPull(c, t, w, h, cx, cy) {
    const playerX = cx - 10 + t * 20;
    const playerY = cy;
    const pullerX = cx - 55;
    const pullerY = cy;

    drawPlayer(c, pullerX, pullerY, '#1565c0', 'Defender');
    drawPlayer(c, playerX, playerY, '#e53935', 'Player');
    drawBall(c, playerX + 22, playerY + 8);

    if (t > 0.2) {
      c.strokeStyle = '#fff';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(pullerX + 10, pullerY - 15);
      c.lineTo(playerX - 8, playerY - 12);
      c.stroke();
    }

    if (t > 0.5) {
      drawContact(c, playerX - 5, playerY - 15, (t - 0.5) * 2);
      drawWhistleIcon(c, playerX + 10, playerY - 50, Math.min(1, (t - 0.5) * 3));
    }
  }

  function drawLateChallenge(c, t, w, h, cx, cy) {
    const playerX = cx + 20 - t * 30;
    const playerY = cy;

    drawBall(c, playerX + 20, playerY - 5);
    drawPlayer(c, playerX, playerY, '#e53935', 'Player');

    if (t < 0.3) {
      drawPlayer(c, cx + 100, cy + 5, '#1565c0', 'Defender');
    } else {
      const tackleX = cx + 100 - (t - 0.3) * 150;
      drawPlayer(c, tackleX, cy + 5, '#1565c0', 'Defender');

      if (t > 0.55) {
        drawContact(c, playerX, playerY - 8, (t - 0.55) * 2.5);
        drawWhistleIcon(c, playerX + 25, playerY - 45, Math.min(1, (t - 0.55) * 3));
      }
    }
  }

  function drawDeliberateHandball(c, t, w, h, cx, cy) {
    const playerX = cx - 20;
    const playerY = cy;

    drawPlayer(c, playerX, playerY, '#1565c0', 'Defender');

    if (t < 0.4) {
      drawBall(c, cx + 80 - t * 120, cy - 30 + t * 40);
    } else {
      const armExtend = Math.min(1, (t - 0.4) * 3);
      c.fillStyle = '#1565c0';
      c.fillRect(playerX + 6, playerY - 28 - armExtend * 5, 4 + armExtend * 12, 4);
      drawBall(c, playerX + 20 + armExtend * 8, playerY - 30 - armExtend * 5);

      if (t > 0.6) {
        drawContact(c, playerX + 22, playerY - 32, (t - 0.6) * 2.5);
        drawWhistleIcon(c, playerX + 35, playerY - 55, Math.min(1, (t - 0.6) * 3));
      }
    }
  }

  function drawCleatsUp(c, t, w, h, cx, cy) {
    const attackerX = cx - 30 + t * 30;
    const attackerY = cy;
    const defenderX = cx - 90 + t * 50;
    const defenderY = cy;

    drawBall(c, attackerX + 20, attackerY + 5);
    drawPlayer(c, attackerX, attackerY, '#e53935', 'Player');

    if (t < 0.35) {
      drawPlayer(c, defenderX, defenderY, '#1565c0', 'Defender');
    } else {
      const tackleProgress = (t - 0.35) / 0.65;
      const jumpX = defenderX + tackleProgress * 60;
      const jumpY = defenderY - Math.sin(tackleProgress * Math.PI) * 25;

      c.fillStyle = '#1565c0';
      c.beginPath();
      c.arc(jumpX, jumpY - 24, 7, 0, Math.PI * 2);
      c.fill();
      c.fillRect(jumpX - 5, jumpY - 17, 10, 17);

      c.fillStyle = '#333';
      c.fillRect(jumpX - 6, jumpY + 1, 12, 4);

      if (t > 0.55) {
        drawContact(c, attackerX + 5, attackerY - 15, (t - 0.55) * 2.5);
        drawWhistleIcon(c, attackerX + 20, attackerY - 50, Math.min(1, (t - 0.55) * 3));
      }
    }
  }

  window.render_game_to_text = function() {
    const incident = state.currentIncident;
    return JSON.stringify({
      mode: state.phase,
      round: state.round,
      totalRounds: TOTAL_ROUNDS,
      score: state.score,
      correct: state.correct,
      incidentType: incident ? incident.type : null,
      incidentLabel: incident ? incident.label : null,
      correctDecision: state.showingReplay ? incident.correctDecision : null,
      playerDecision: state.playerDecision,
      timerRemaining: state.whistleBlown
        ? Math.max(0, (DECISION_TIME_LIMIT - state.decisionTimer) / 1000)
        : Math.max(0, (WHISTLE_TIME_LIMIT - state.animationTime) / 1000),
      timerMax: state.whistleBlown ? DECISION_TIME_LIMIT / 1000 : WHISTLE_TIME_LIMIT / 1000,
      decisionOptions: state.decisionStarted ? DECISION_OPTIONS : null,
      whistleBlown: state.whistleBlown,
      showingReplay: state.showingReplay,
    });
  };

  const DECISION_OPTIONS = ['FOUL', 'NO FOUL', 'YELLOW CARD', 'RED CARD', 'OFFSIDE'];

  window.advanceTime = function(ms) {
    if (state.phase !== 'playing') return;
    if (state.showingReplay) return;

    if (!state.whistleBlown) {
      state.animationTime += ms;
      if (state.animationTime >= WHISTLE_TIME_LIMIT) {
        blowWhistle();
      }
    } else if (state.decisionStarted) {
      state.decisionTimer += ms;
      if (state.decisionTimer >= DECISION_TIME_LIMIT) {
        makeDecision('TIME_UP');
      }
    }

    updateTimerDisplay();
    drawFrame();
  };

  document.addEventListener('DOMContentLoaded', init);
})();
