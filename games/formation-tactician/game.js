(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const PITCH_W = 600;
  const PITCH_H = 400;
  const PLAYER_R = 12;
  const GOAL_W = 8;
  const GOAL_H = 80;

  canvas.width = PITCH_W;
  canvas.height = PITCH_H;

  const FORMATIONS = {
    '4-4-2': [
      { x: 50, y: 200, role: 'GK' },
      { x: 140, y: 80, role: 'LB' }, { x: 140, y: 160, role: 'CB' },
      { x: 140, y: 240, role: 'CB' }, { x: 140, y: 320, role: 'RB' },
      { x: 260, y: 80, role: 'LM' }, { x: 260, y: 160, role: 'CM' },
      { x: 260, y: 240, role: 'CM' }, { x: 260, y: 320, role: 'RM' },
      { x: 380, y: 150, role: 'ST' }, { x: 380, y: 250, role: 'ST' }
    ],
    '4-3-3': [
      { x: 50, y: 200, role: 'GK' },
      { x: 140, y: 80, role: 'LB' }, { x: 140, y: 160, role: 'CB' },
      { x: 140, y: 240, role: 'CB' }, { x: 140, y: 320, role: 'RB' },
      { x: 270, y: 120, role: 'CM' }, { x: 270, y: 200, role: 'CM' },
      { x: 270, y: 280, role: 'CM' },
      { x: 390, y: 80, role: 'LW' }, { x: 410, y: 200, role: 'ST' },
      { x: 390, y: 320, role: 'RW' }
    ],
    '3-5-2': [
      { x: 50, y: 200, role: 'GK' },
      { x: 130, y: 120, role: 'CB' }, { x: 130, y: 200, role: 'CB' },
      { x: 130, y: 280, role: 'CB' },
      { x: 240, y: 60, role: 'LWB' }, { x: 260, y: 140, role: 'CM' },
      { x: 260, y: 200, role: 'CM' }, { x: 260, y: 260, role: 'CM' },
      { x: 240, y: 340, role: 'RWB' },
      { x: 380, y: 150, role: 'ST' }, { x: 380, y: 250, role: 'ST' }
    ],
    '4-2-3-1': [
      { x: 50, y: 200, role: 'GK' },
      { x: 140, y: 80, role: 'LB' }, { x: 140, y: 160, role: 'CB' },
      { x: 140, y: 240, role: 'CB' }, { x: 140, y: 320, role: 'RB' },
      { x: 240, y: 160, role: 'CDM' }, { x: 240, y: 240, role: 'CDM' },
      { x: 340, y: 100, role: 'LAM' }, { x: 340, y: 200, role: 'CAM' },
      { x: 340, y: 300, role: 'RAM' },
      { x: 420, y: 200, role: 'ST' }
    ]
  };

  const AI_FORMATIONS = [
    { name: '4-4-2', formation: '4-4-2', strength: 'balanced midfield', weakness: 'vulnerable on wings' },
    { name: '4-3-3', formation: '4-3-3', strength: 'wide attacks', weakness: 'thin midfield' },
    { name: '3-5-2', formation: '3-5-2', strength: 'midfield overload', weakness: 'exposed flanks' },
    { name: '4-2-3-1', formation: '4-2-3-1', strength: 'counter-attacks', weakness: 'isolation up top' }
  ];

  const PLAYER_COLORS = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
    '#4ade80', '#86efac', '#bbf7d0', '#34d399', '#6ee7b7', '#a7f3d0'];

  let state = {
    mode: 'setup',
    players: [],
    aiPlayers: [],
    aiFormation: null,
    selectedPlayer: null,
    dragOffset: { x: 0, y: 0 },
    currentFormation: '4-4-2',
    score: { player: 0, ai: 0 },
    matchTime: 0,
    matchEvents: [],
    matchLog: [],
    rating: 0,
    ball: { x: PITCH_W / 2, y: PITCH_H / 2 },
    animationFrame: null
  };

  function initPlayers() {
    const formation = FORMATIONS[state.currentFormation];
    state.players = formation.map((p, i) => ({
      x: p.x,
      y: p.y,
      role: p.role,
      color: PLAYER_COLORS[i],
      id: i
    }));
  }

  function initAI() {
    const aiChoice = AI_FORMATIONS[Math.floor(Math.random() * AI_FORMATIONS.length)];
    state.aiFormation = aiChoice;
    const formation = FORMATIONS[aiChoice.formation];
    state.aiPlayers = formation.map((p, i) => ({
      x: PITCH_W - p.x,
      y: p.y,
      role: p.role,
      color: '#ef4444',
      id: i
    }));
  }

  function drawPitch() {
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, PITCH_W, PITCH_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;

    ctx.strokeRect(0, 0, PITCH_W, PITCH_H);

    ctx.beginPath();
    ctx.moveTo(PITCH_W / 2, 0);
    ctx.lineTo(PITCH_W / 2, PITCH_H);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(PITCH_W / 2, PITCH_H / 2, 40, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeRect(0, PITCH_H / 2 - 60, 80, 120);
    ctx.strokeRect(PITCH_W - 80, PITCH_H / 2 - 60, 80, 120);

    ctx.strokeRect(0, PITCH_H / 2 - 30, 30, 60);
    ctx.strokeRect(PITCH_W - 30, PITCH_H / 2 - 30, 30, 60);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(-GOAL_W / 2, PITCH_H / 2 - GOAL_H / 2, GOAL_W, GOAL_H);
    ctx.fillRect(PITCH_W - GOAL_W / 2, PITCH_H / 2 - GOAL_H / 2, GOAL_W, GOAL_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-GOAL_W / 2, PITCH_H / 2 - GOAL_H / 2, GOAL_W, GOAL_H);
    ctx.strokeRect(PITCH_W - GOAL_W / 2, PITCH_H / 2 - GOAL_H / 2, GOAL_W, GOAL_H);
  }

  function drawPlayer(p, isAI) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    if (!isAI && state.selectedPlayer === p.id) {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.role, p.x, p.y);
  }

  function drawBall() {
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function draw() {
    drawPitch();
    state.aiPlayers.forEach(p => drawPlayer(p, true));
    state.players.forEach(p => drawPlayer(p, false));
    drawBall();
  }

  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = PITCH_W / rect.width;
    const scaleY = PITCH_H / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function findPlayer(pos) {
    for (let i = state.players.length - 1; i >= 0; i--) {
      const p = state.players[i];
      const dx = pos.x - p.x;
      const dy = pos.y - p.y;
      if (dx * dx + dy * dy <= PLAYER_R * PLAYER_R * 2) {
        return i;
      }
    }
    return -1;
  }

  function onPointerDown(e) {
    if (state.mode !== 'setup') return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const idx = findPlayer(pos);
    if (idx >= 0) {
      state.selectedPlayer = idx;
      state.dragOffset.x = pos.x - state.players[idx].x;
      state.dragOffset.y = pos.y - state.players[idx].y;
    }
  }

  function onPointerMove(e) {
    if (state.mode !== 'setup' || state.selectedPlayer === null) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    const p = state.players[state.selectedPlayer];
    p.x = Math.max(PLAYER_R, Math.min(PITCH_W - PLAYER_R, pos.x - state.dragOffset.x));
    p.y = Math.max(PLAYER_R, Math.min(PITCH_H - PLAYER_R, pos.y - state.dragOffset.y));
    draw();
  }

  function onPointerUp(e) {
    state.selectedPlayer = null;
  }

  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('mouseleave', onPointerUp);
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('touchmove', onPointerMove, { passive: false });
  canvas.addEventListener('touchend', onPointerUp);

  function setFormation(name) {
    state.currentFormation = name;
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.formation === name);
    });
    document.getElementById('formation-display').textContent = name;
    initPlayers();
    draw();
  }

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => setFormation(btn.dataset.formation));
  });

  document.getElementById('overlay-start-btn').addEventListener('click', () => {
    document.getElementById('message-overlay').classList.add('hidden');
  });

  document.getElementById('reset-btn').addEventListener('click', () => {
    if (state.mode !== 'setup') return;
    initPlayers();
    draw();
  });

  document.getElementById('start-btn').addEventListener('click', startMatch);
  document.getElementById('play-again-btn').addEventListener('click', () => {
    document.getElementById('result-overlay').classList.add('hidden');
    state.mode = 'setup';
    state.score = { player: 0, ai: 0 };
    state.matchTime = 0;
    state.matchEvents = [];
    state.matchLog = [];
    document.getElementById('score-display').textContent = '0 - 0';
    document.getElementById('match-log').innerHTML = '';
    document.getElementById('start-btn').disabled = false;
    initPlayers();
    initAI();
    draw();
  });

  function calculateFormationRating() {
    const players = state.players;
    const gk = players.find(p => p.role === 'GK');
    const defenders = players.filter(p => ['LB', 'CB', 'RB', 'LWB', 'RWB'].includes(p.role));
    const midfielders = players.filter(p => ['LM', 'CM', 'RM', 'CDM', 'CAM', 'LAM', 'RAM'].includes(p.role));
    const forwards = players.filter(p => ['ST', 'LW', 'RW'].includes(p.role));

    let rating = 50;

    const defLine = defenders.map(d => d.x);
    if (defLine.length > 1) {
      const defSpread = Math.max(...defLine) - Math.min(...defLine);
      if (defSpread < 30) rating += 10;
    }

    const gkDist = gk ? Math.abs(gk.x - 50) : 50;
    if (gkDist < 40) rating += 5;

    const midLine = midfielders.map(m => m.y);
    if (midLine.length > 2) {
      const midSpread = Math.max(...midLine) - Math.min(...midLine);
      if (midSpread > 100 && midSpread < 280) rating += 10;
    }

    const fwdLine = forwards.map(f => f.x);
    if (fwdLine.length > 1) {
      const fwdSpread = Math.max(...fwdLine) - Math.min(...fwdLine);
      if (fwdSpread > 40) rating += 5;
    }

    const coverage = new Set();
    players.forEach(p => {
      const zone = Math.floor(p.x / 100) + '-' + Math.floor(p.y / 100);
      coverage.add(zone);
    });
    rating += Math.min(20, coverage.size * 3);

    return Math.min(99, Math.max(10, rating));
  }

  function analyzeMatchup() {
    const playerFormation = state.currentFormation;
    const aiFormation = state.aiFormation;
    const strengths = [];
    const weaknesses = [];

    const playerMidfielders = state.players.filter(p =>
      ['LM', 'CM', 'RM', 'CDM', 'CAM', 'LAM', 'RAM'].includes(p.role)
    ).length;

    const aiMidfielders = state.aiPlayers.filter(p =>
      ['LM', 'CM', 'RM', 'CDM', 'CAM', 'LAM', 'RAM'].includes(p.role)
    ).length;

    if (playerMidfielders > aiMidfielders) {
      strengths.push('Midfield dominance');
    } else if (playerMidfielders < aiMidfielders) {
      weaknesses.push('Outnumbered in midfield');
    }

    const playerForwards = state.players.filter(p =>
      ['ST', 'LW', 'RW'].includes(p.role)
    ).length;

    const aiForwards = state.aiPlayers.filter(p =>
      ['ST', 'LW', 'RW'].includes(p.role)
    ).length;

    if (playerForwards >= aiForwards) {
      strengths.push('Attacking presence');
    } else {
      weaknesses.push('Fewer attacking options');
    }

    if (playerFormation === '4-3-3' && aiFormation.formation === '4-4-2') {
      strengths.push('Width exploits narrow 4-4-2');
    }
    if (playerFormation === '3-5-2' && aiFormation.formation === '4-3-3') {
      weaknesses.push('Wingers exploit 3-back');
    }
    if (playerFormation === '4-2-3-1' && aiFormation.formation === '3-5-2') {
      strengths.push('Overloads midfield');
    }

    return { strengths, weaknesses };
  }

  function addLog(text, className) {
    const log = document.getElementById('match-log');
    const div = document.createElement('div');
    div.className = 'event ' + (className || '');
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    state.matchLog.push(text);
  }

  function simulateMatchEvent(minute) {
    const playerRating = calculateFormationRating();
    const matchup = analyzeMatchup();
    const aiChance = 45 + Math.random() * 20 - matchup.weaknesses.length * 5;
    const playerChance = playerRating + matchup.strengths.length * 5;

    const eventRoll = Math.random() * 100;

    if (minute === 1) {
      addLog("The match begins! " + state.aiFormation.name + " vs " + state.currentFormation);
    }

    if (minute === 45) {
      addLog("Half-time: " + state.score.player + " - " + state.score.ai, 'chance');
    }

    if (eventRoll < 3) {
      const scorer = Math.random() * 100 < playerChance ? 'player' : 'ai';
      if (scorer === 'player') {
        state.score.player++;
        addLog(minute + "' - GOAL! Your team scores!", 'goal');
      } else {
        state.score.ai++;
        addLog(minute + "' - GOAL! AI opponent scores!", 'goal');
      }
      document.getElementById('score-display').textContent = state.score.player + ' - ' + state.score.ai;
      state.ball.x = PITCH_W / 2;
      state.ball.y = PITCH_H / 2;
    } else if (eventRoll < 10) {
      const isPlayer = Math.random() * 100 < playerChance;
      if (isPlayer) {
        addLog(minute + "' - Chance! Your team creates an opportunity", 'chance');
      } else {
        addLog(minute + "' - Danger! AI threatens on the counter", 'weakness');
      }
    } else {
      state.ball.x = PITCH_W * 0.2 + Math.random() * PITCH_W * 0.6;
      state.ball.y = Math.random() * PITCH_H;
    }

    state.players.forEach(p => {
      if (p.role !== 'GK') {
        p.x += (Math.random() - 0.4) * 6;
        p.y += (Math.random() - 0.5) * 8;
        p.x = Math.max(PLAYER_R, Math.min(PITCH_W - PLAYER_R, p.x));
        p.y = Math.max(PLAYER_R, Math.min(PITCH_H - PLAYER_R, p.y));
      }
    });

    state.aiPlayers.forEach(p => {
      if (p.role !== 'GK') {
        p.x += (Math.random() - 0.6) * 6;
        p.y += (Math.random() - 0.5) * 8;
        p.x = Math.max(PLAYER_R, Math.min(PITCH_W - PLAYER_R, p.x));
        p.y = Math.max(PLAYER_R, Math.min(PITCH_H - PLAYER_R, p.y));
      }
    });

    if (state.aiFormation.weakness && Math.random() < 0.15) {
      addLog(minute + "' - AI exploits " + state.aiFormation.weakness, 'weakness');
    }
  }

  function endMatch() {
    state.mode = 'setup';
    const rating = calculateFormationRating();
    state.rating = rating;
    const matchup = analyzeMatchup();

    const resultTitle = document.getElementById('result-title');
    if (state.score.player > state.score.ai) {
      resultTitle.textContent = '🏆 Victory!';
      resultTitle.style.color = '#4ade80';
    } else if (state.score.player < state.score.ai) {
      resultTitle.textContent = '😞 Defeat';
      resultTitle.style.color = '#f87171';
    } else {
      resultTitle.textContent = '🤝 Draw';
      resultTitle.style.color = '#fbbf24';
    }

    document.getElementById('result-stats').innerHTML =
      'Score: ' + state.score.player + ' - ' + state.score.ai + '<br>' +
      'Formation: ' + state.currentFormation + '<br>' +
      'Opponent: ' + (state.aiFormation ? state.aiFormation.name : 'Unknown') + '<br>' +
      'Formation Rating: ' + rating + '/99';

    let analysisHTML = '';
    if (matchup.strengths.length > 0) {
      analysisHTML += '<span class="strength-label">Strengths:</span><br>';
      matchup.strengths.forEach(s => analysisHTML += '  ' + s + '<br>');
    }
    if (matchup.weaknesses.length > 0) {
      analysisHTML += '<span class="weakness-label">Weaknesses:</span><br>';
      matchup.weaknesses.forEach(w => analysisHTML += '  ' + w + '<br>');
    }
    analysisHTML += '<br>AI Formation: ' + (state.aiFormation ? state.aiFormation.name : 'Unknown');
    analysisHTML += '<br>AI Strength: ' + (state.aiFormation ? state.aiFormation.strength : 'N/A');
    analysisHTML += '<br>AI Weakness: ' + (state.aiFormation ? state.aiFormation.weakness : 'N/A');

    document.getElementById('tactical-analysis').innerHTML = analysisHTML;
    document.getElementById('result-overlay').classList.remove('hidden');
  }

  function startMatch() {
    if (state.mode !== 'setup') return;
    state.mode = 'match';
    state.score = { player: 0, ai: 0 };
    state.matchTime = 0;
    state.matchEvents = [];
    state.matchLog = [];
    document.getElementById('match-log').innerHTML = '';
    document.getElementById('start-btn').disabled = true;

    initAI();
    draw();

    let minute = 1;
    const interval = setInterval(() => {
      if (minute > 90) {
        clearInterval(interval);
        addLog("Full-time: " + state.score.player + " - " + state.score.ai);
        setTimeout(endMatch, 600);
        return;
      }
      state.matchTime = minute;
      simulateMatchEvent(minute);
      draw();
      minute++;
    }, 120);
  }

  function renderGameToText() {
    const payload = {
      mode: state.mode,
      formation: state.currentFormation,
      players: state.players.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), role: p.role })),
      aiPlayers: state.aiPlayers.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), role: p.role })),
      score: state.score,
      matchTime: state.matchTime,
      rating: state.rating,
      matchEvents: state.matchLog.slice(-10),
      aiFormation: state.aiFormation ? state.aiFormation.name : null
    };
    return JSON.stringify(payload);
  }
  window.render_game_to_text = renderGameToText;

  window.advanceTime = function (ms) {
    const steps = Math.max(1, Math.round(ms / 120));
    for (let i = 0; i < steps; i++) {
      if (state.mode === 'match') {
        const minute = state.matchTime + 1;
        if (minute <= 90) {
          state.matchTime = minute;
          simulateMatchEvent(minute);
        }
      }
    }
    draw();
  };

  initPlayers();
  draw();
})();
