(function() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const W = 800, H = 600;
  canvas.width = W; canvas.height = H;

  const menuScreen = document.getElementById('menu-screen');
  const decisionScreen = document.getElementById('decision-screen');
  const resultScreen = document.getElementById('result-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const timerFill = document.getElementById('timer-fill');
  const timerText = document.getElementById('timer-text');
  const roundNum = document.getElementById('round-num');
  const resultTitle = document.getElementById('result-title');
  const resultExplanation = document.getElementById('result-explanation');
  const currentScoreEl = document.getElementById('current-score');
  const finalScoreDisplay = document.getElementById('final-score-display');
  const accuracyDisplay = document.getElementById('accuracy-display');
  const verdictText = document.getElementById('verdict-text');

  const TIMER_DURATION = 3.0;
  const TOTAL_ROUNDS = 10;
  const MAX_POINTS_PER_ROUND = 100;

  let state = {
    mode: 'menu',
    round: 0,
    score: 0,
    correct: 0,
    total: 0,
    timeLeft: TIMER_DURATION,
    playerCall: null,
    animTime: 0,
    animFrame: 0,
    decisions: [],
    replayPhase: 0
  };

  const scenarios = [
    {
      type: 'foul',
      correct: 'FOUL',
      explanation: 'The defender trips the attacker in the box — contact made before the ball — clear foul!',
      replay: 'penalty_foul',
      fielders: [{x:400,y:350,color:'#fff'},{x:350,y:320,color:'#fff'},{x:450,y:300,color:'#fff'}],
      attacker: {x:300,y:340,color:'#e84'},
      keeper: {x:680,y:340,color:'#0af'},
      ball: {x:310,y:335}
    },
    {
      type: 'goal',
      correct: 'GOAL',
      explanation: 'The shot beats the keeper cleanly — ball crosses the line!',
      replay: 'clean_goal',
      fielders: [{x:500,y:350,color:'#fff'},{x:520,y:310,color:'#fff'},{x:480,y:290,color:'#fff'}],
      attacker: {x:350,y:340,color:'#e84'},
      keeper: {x:680,y:340,color:'#0af'},
      ball: {x:690,y:300}
    },
    {
      type: 'offside',
      correct: 'OFFSIDE',
      explanation: 'The striker was behind the last defender when the pass was made — offside!',
      replay: 'offside_play',
      fielders: [{x:400,y:300,color:'#fff'},{x:420,y:350,color:'#fff'},{x:380,y:280,color:'#fff'}],
      attacker: {x:500,y:310,color:'#e84'},
      ball: {x:350,y:300}
    },
    {
      type: 'no_goal',
      correct: 'NO GOAL',
      explanation: 'The shot hit the post and bounced out — no goal given.',
      replay: 'post_miss',
      fielders: [{x:500,y:350,color:'#fff'},{x:520,y:300,color:'#fff'}],
      attacker: {x:350,y:340,color:'#e84'},
      ball: {x:680,y:280}
    },
    {
      type: 'foul',
      correct: 'FOUL',
      explanation: 'The defender pulled the attacker\'s shirt — clear foul.',
      replay: 'shirt_pull',
      fielders: [{x:400,y:330,color:'#fff'},{x:450,y:310,color:'#fff'}],
      attacker: {x:380,y:340,color:'#e84'},
      ball: {x:370,y:335}
    },
    {
      type: 'goal',
      correct: 'GOAL',
      explanation: 'Header from the corner kick beats the keeper — goal stands!',
      replay: 'header_goal',
      fielders: [{x:500,y:320,color:'#fff'},{x:520,y:350,color:'#fff'},{x:480,y:300,color:'#fff'}],
      attacker: {x:450,y:290,color:'#e84'},
      ball: {x:690,y:310}
    },
    {
      type: 'offside',
      correct: 'OFFSIDE',
      explanation: 'Player received the ball well beyond the defensive line — offside confirmed.',
      replay: 'long_ball_offside',
      fielders: [{x:380,y:300,color:'#fff'},{x:400,y:350,color:'#fff'}],
      attacker: {x:520,y:320,color:'#e84'},
      ball: {x:480,y:310}
    },
    {
      type: 'no_goal',
      correct: 'NO GOAL',
      explanation: 'The goalkeeper had both hands on the ball — no foul, play on.',
      replay: 'keeper_save',
      fielders: [{x:500,y:350,color:'#fff'},{x:520,y:310,color:'#fff'}],
      attacker: {x:350,y:340,color:'#e84'},
      ball: {x:490,y:330}
    },
    {
      type: 'foul',
      correct: 'FOUL',
      explanation: 'Studs-up challenge from behind — dangerous play, foul and likely a card.',
      replay: 'dangerous_tackle',
      fielders: [{x:400,y:340,color:'#fff'},{x:450,y:320,color:'#fff'}],
      attacker: {x:380,y:335,color:'#e84'},
      ball: {x:360,y:330}
    },
    {
      type: 'goal',
      correct: 'GOAL',
      explanation: 'Long-range screamer flies into the top corner — what a goal!',
      replay: 'long_range_goal',
      fielders: [{x:500,y:320,color:'#fff'},{x:520,y:350,color:'#fff'},{x:480,y:300,color:'#fff'}],
      attacker: {x:250,y:340,color:'#e84'},
      ball: {x:690,y:260}
    }
  ];

  function shuffleScenarios() {
    for (let i = scenarios.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [scenarios[i], scenarios[j]] = [scenarios[j], scenarios[i]];
    }
  }

  function showScreen(name) {
    [menuScreen, decisionScreen, resultScreen, gameoverScreen].forEach(s => s.style.display = 'none');
    if (name === 'menu') menuScreen.style.display = 'flex';
    else if (name === 'decision') decisionScreen.style.display = 'flex';
    else if (name === 'result') resultScreen.style.display = 'flex';
    else if (name === 'gameover') gameoverScreen.style.display = 'flex';
  }

  function drawField() {
    ctx.fillStyle = '#1a5c2a';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W/2, H/2, 60, 0, Math.PI*2);
    ctx.stroke();

    ctx.strokeRect(20, H/2-100, 120, 200);
    ctx.strokeRect(W-140, H/2-100, 120, 200);
    ctx.strokeRect(20, H/2-50, 50, 100);
    ctx.strokeRect(W-70, H/2-50, 50, 100);

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(W-140, H/2-100, 120, 200);
    ctx.fillRect(20, H/2-100, 120, 200);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let x = W-140; x <= W-20; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, H/2-100);
      ctx.lineTo(x, H/2+100);
      ctx.stroke();
    }
    for (let y = H/2-100; y <= H/2+100; y += 15) {
      ctx.beginPath();
      ctx.moveTo(W-140, y);
      ctx.lineTo(W-20, y);
      ctx.stroke();
    }
    for (let x = 20; x <= 140; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, H/2-100);
      ctx.lineTo(x, H/2+100);
      ctx.stroke();
    }
    for (let y = H/2-100; y <= H/2+100; y += 15) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(140, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DEFENSE', 80, H/2 - 110);
    ctx.fillText('GOAL →', W - 80, H/2 - 110);
    ctx.textAlign = 'left';
  }

  function drawStickFigure(x, y, color, facing, action, label) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y - 30, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 22);
    ctx.lineTo(x, y + 5);
    ctx.stroke();
    if (action === 'kicking') {
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x - 10 * facing, y + 25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x + 15 * facing, y + 15);
      ctx.stroke();
    } else if (action === 'tackling') {
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x - 15, y + 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x + 20 * facing, y + 20);
      ctx.stroke();
    } else if (action === 'diving') {
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x - 10, y + 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x + 10, y + 25);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x - 8, y + 25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(x + 8, y + 25);
      ctx.stroke();
    }
    // arms
    if (action === 'arms_up') {
      ctx.beginPath();
      ctx.moveTo(x, y - 15);
      ctx.lineTo(x - 15, y - 30);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 15);
      ctx.lineTo(x + 15, y - 30);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y - 15);
      ctx.lineTo(x - 12, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 15);
      ctx.lineTo(x + 12, y);
      ctx.stroke();
    }
    if (label) {
      ctx.fillStyle = color;
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + 38);
      ctx.textAlign = 'left';
    }
  }

  function drawKeeper(x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y - 30, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 21);
    ctx.lineTo(x, y + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x - 12, y + 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x + 12, y + 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x - 20, y - 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x + 20, y - 25);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GK', x, y + 38);
    ctx.textAlign = 'left';
  }

  function drawContact(x, y) {
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r1 = 8, r2 = 16;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * r1, y + Math.sin(angle) * r1);
      ctx.lineTo(x + Math.cos(angle) * r2, y + Math.sin(angle) * r2);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CONTACT', x, y - 20);
    ctx.textAlign = 'left';
  }

  function drawBall(x, y) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    // pentagon pattern
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawVAROverlay() {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 16px Courier New';
    ctx.fillText('● REC  VAR REVIEW', 16, 26);
    ctx.fillStyle = '#00ff88';
    ctx.font = '14px Courier New';
    const time = new Date().toLocaleTimeString();
    ctx.fillText(time, W - 80, 26);
    // corner markers
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    const m = 20;
    // top-left
    ctx.beginPath(); ctx.moveTo(m, m+10); ctx.lineTo(m, m); ctx.lineTo(m+10, m); ctx.stroke();
    // top-right
    ctx.beginPath(); ctx.moveTo(W-m-10, m); ctx.lineTo(W-m, m); ctx.lineTo(W-m, m+10); ctx.stroke();
    // bottom-left
    ctx.beginPath(); ctx.moveTo(m, H-m-10); ctx.lineTo(m, H-m); ctx.lineTo(m+10, H-m); ctx.stroke();
    // bottom-right
    ctx.beginPath(); ctx.moveTo(W-m-10, H-m); ctx.lineTo(W-m, H-m); ctx.lineTo(W-m, H-m-10); ctx.stroke();
  }

  function drawReplayLabel() {
    ctx.fillStyle = 'rgba(255,68,68,0.8)';
    ctx.fillRect(W/2 - 60, H - 36, 120, 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('REPLAY', W/2, H - 17);
    ctx.textAlign = 'left';
  }

  function drawOffsideLine(defenderX) {
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#44aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(defenderX, 50);
    ctx.lineTo(defenderX, H - 50);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#44aaff';
    ctx.font = '12px Courier New';
    ctx.fillText('OFFSIDE LINE', defenderX + 4, 65);
  }

  function renderReplay(t) {
    drawField();
    const sc = scenarios[state.round];
    const phase = t * 3;

    if (sc.replay === 'penalty_foul') {
      const attX = 250 + Math.min(phase, 1) * 120;
      const attY = 340;
      if (sc.keeper) drawKeeper(sc.keeper.x, sc.keeper.y, sc.keeper.color);
      sc.fielders.forEach(f => drawStickFigure(f.x, f.y, f.color, 1, 'standing', 'DEF'));
      drawStickFigure(attX, attY, sc.attacker.color, 1, phase > 0.8 ? 'kicking' : 'running', 'ATK');
      const ballX = phase > 1 ? attX + 10 + (phase - 1) * 350 : attX + 10;
      const ballY = phase > 1 && phase < 1.3 ? attY - 20 - (phase - 1) * 60 : attY - 5;
      drawBall(Math.min(ballX, 700), ballY);
      if (phase > 0.6 && phase < 1.2) {
        const tackler = sc.fielders[0];
        drawStickFigure(tackler.x - 20, tackler.y + 5, tackler.color, -1, 'tackling', 'DEF');
        drawContact(tackler.x - 10, tackler.y - 5);
      }
      if (phase > 1.2) {
        drawStickFigure(attX, attY + 10, sc.attacker.color, 1, 'diving', 'ATK');
      }
    } else if (sc.replay === 'clean_goal') {
      const attX = 300 + Math.min(phase, 1) * 80;
      if (sc.keeper) drawKeeper(sc.keeper.x, sc.keeper.y, sc.keeper.color);
      sc.fielders.forEach(f => drawStickFigure(f.x, f.y, f.color, -1, 'standing', 'DEF'));
      drawStickFigure(attX, 340, sc.attacker.color, 1, phase > 0.5 ? 'kicking' : 'running', 'ATK');
      const ballX = phase > 0.5 ? attX + 20 + (phase - 0.5) * 600 : attX + 20;
      const ballY = phase > 0.5 ? 340 - (phase - 0.5) * 80 : 335;
      drawBall(Math.min(ballX, 700), Math.max(ballY, 280));
      if (phase > 1.2) {
        ctx.fillStyle = 'rgba(0,255,136,0.2)';
        ctx.fillRect(W - 140, H/2 - 100, 120, 200);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.strokeRect(W - 140, H/2 - 100, 120, 200);
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GOAL!', W - 80, H/2 + 5);
        ctx.textAlign = 'left';
      }
    } else if (sc.replay === 'offside_play') {
      const lastDefX = 400;
      drawOffsideLine(lastDefX);
      sc.fielders.forEach(f => drawStickFigure(f.x, f.y, f.color, -1, 'standing'));
      const attX = 350 + Math.min(phase, 1) * 180;
      drawStickFigure(attX, 310, sc.attacker.color, 1, phase > 0.3 ? 'running' : 'standing');
      const ballX = phase > 0.3 ? 350 + (phase - 0.3) * 500 : 350;
      drawBall(Math.min(ballX, 600), 310);
    } else if (sc.replay === 'post_miss') {
      const attX = 300 + Math.min(phase, 0.8) * 80;
      sc.fielders.forEach(f => drawStickFigure(f.x, f.y, f.color, -1, 'diving'));
      drawStickFigure(attX, 340, sc.attacker.color, 1, phase > 0.4 ? 'kicking' : 'running');
      const ballX = phase > 0.4 ? attX + 20 + (phase - 0.4) * 700 : attX + 20;
      const ballY = 340 - (phase > 0.4 ? (phase - 0.4) * 100 : 0);
      drawBall(Math.min(ballX, 700), Math.max(ballY, 260));
      if (phase > 1.2 && phase < 1.8) {
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(700, H/2 - 40, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (sc.replay === 'shirt_pull') {
      const attX = 320 + Math.min(phase, 1) * 80;
      drawStickFigure(400, 330, sc.fielders[0].color, -1, phase > 0.4 ? 'tackling' : 'standing', 'DEF');
      sc.fielders.slice(1).forEach(f => drawStickFigure(f.x, f.y, f.color, -1, 'standing', 'DEF'));
      drawStickFigure(attX, 340, sc.attacker.color, 1, phase > 0.3 ? 'running' : 'standing', 'ATK');
      drawBall(attX - 10, 335);
      if (phase > 0.3 && phase < 0.9) {
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(400, 325);
        ctx.lineTo(attX + 5, 330);
        ctx.stroke();
        ctx.setLineDash([]);
        drawContact((400 + attX + 5) / 2, 328);
      }
    } else if (sc.replay === 'header_goal') {
      const attX = 400 + Math.min(phase, 1) * 60;
      const attY = phase > 0.6 ? 290 - (phase - 0.6) * 40 : 290;
      if (sc.keeper) drawKeeper(sc.keeper.x, sc.keeper.y, sc.keeper.color);
      sc.fielders.forEach(f => drawStickFigure(f.x, f.y, f.color, -1, 'standing', 'DEF'));
      drawStickFigure(attX, attY, sc.attacker.color, 1, phase > 0.5 ? 'jumping' : 'running', 'ATK');
      const ballX = phase > 0.5 ? attX + 30 + (phase - 0.5) * 500 : attX + 30;
      drawBall(Math.min(ballX, 700), attY - 10);
      if (phase > 1.2) {
        ctx.fillStyle = 'rgba(0,255,136,0.2)';
        ctx.fillRect(W - 140, H/2 - 100, 120, 200);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.strokeRect(W - 140, H/2 - 100, 120, 200);
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GOAL!', W - 80, H/2 + 5);
        ctx.textAlign = 'left';
      }
    } else if (sc.replay === 'long_ball_offside') {
      const lastDefX = 380;
      drawOffsideLine(lastDefX);
      sc.fielders.forEach(f => drawStickFigure(f.x, f.y, f.color, 1, 'standing'));
      const attX = 400 + Math.min(phase, 1) * 140;
      drawStickFigure(attX, 320, sc.attacker.color, 1, phase > 0.2 ? 'running' : 'standing');
      const ballX = phase > 0.2 ? 350 + (phase - 0.2) * 400 : 350;
      const ballY = phase > 0.2 ? 300 - Math.sin((phase - 0.2) * 5) * 40 : 300;
      drawBall(Math.min(ballX, 600), ballY);
    } else if (sc.replay === 'keeper_save') {
      const attX = 300 + Math.min(phase, 0.6) * 80;
      drawStickFigure(500, 350, sc.fielders[0].color, -1, phase > 0.5 ? 'diving' : 'standing');
      sc.fielders.slice(1).forEach(f => drawStickFigure(f.x, f.y, f.color, -1, 'standing'));
      drawStickFigure(attX, 340, sc.attacker.color, 1, phase > 0.3 ? 'kicking' : 'running');
      const ballX = phase > 0.3 ? attX + 20 + (phase - 0.3) * 500 : attX + 20;
      drawBall(Math.min(ballX, 500), 340);
    } else if (sc.replay === 'dangerous_tackle') {
      const attX = 330 + Math.min(phase, 0.5) * 80;
      drawStickFigure(400, 340, sc.fielders[0].color, -1, phase > 0.3 ? 'tackling' : 'standing');
      sc.fielders.slice(1).forEach(f => drawStickFigure(f.x, f.y, f.color, -1, 'standing'));
      drawStickFigure(attX, 335, sc.attacker.color, 1, phase > 0.3 ? 'running' : 'standing');
      drawBall(attX - 5, 330);
      if (phase > 0.3 && phase < 0.7) {
        ctx.fillStyle = 'rgba(255,68,68,0.2)';
        ctx.beginPath();
        ctx.arc(400, 340, 30, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (sc.replay === 'long_range_goal') {
      const attX = 250;
      sc.fielders.forEach(f => drawStickFigure(f.x, f.y, f.color, -1, 'standing'));
      drawStickFigure(attX, 340, sc.attacker.color, 1, phase > 0.2 ? 'kicking' : 'standing');
      const ballX = phase > 0.2 ? attX + 20 + (phase - 0.2) * 1000 : attX + 20;
      const ballY = phase > 0.2 ? 340 - (phase - 0.2) * 200 : 335;
      drawBall(Math.min(ballX, 700), Math.max(ballY, 260));
      if (phase > 1.2) {
        ctx.fillStyle = 'rgba(0,255,136,0.15)';
        ctx.fillRect(W - 30, H/2 - 80, 10, 160);
      }
    }

    drawVAROverlay();
    drawReplayLabel();
  }

  function renderMenu() {
    drawField();
    drawVAROverlay();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    drawStickFigure(300, 350, '#e84', 1, 'standing');
    drawStickFigure(500, 350, '#fff', -1, 'standing');
    drawBall(400, 335);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (state.mode === 'menu') {
      renderMenu();
    } else if (state.mode === 'replay') {
      renderReplay(state.animTime);
    } else if (state.mode === 'decision') {
      renderReplay(Math.min(state.animTime, 1.5));
    } else if (state.mode === 'result') {
      renderReplay(1.5);
    } else if (state.mode === 'gameover') {
      renderMenu();
    }
  }

  function startGame() {
    shuffleScenarios();
    state = {
      mode: 'replay',
      round: 0,
      score: 0,
      correct: 0,
      total: 0,
      timeLeft: TIMER_DURATION,
      playerCall: null,
      animTime: 0,
      animFrame: 0,
      decisions: [],
      replayPhase: 0
    };
    showScreen('decision');
    roundNum.textContent = state.round + 1;
    startReplay();
  }

  function startReplay() {
    state.mode = 'replay';
    state.animTime = 0;
    state.timeLeft = TIMER_DURATION;
    state.playerCall = null;
    timerFill.style.width = '100%';
    timerFill.classList.remove('urgent');
    timerText.textContent = TIMER_DURATION.toFixed(1) + 's';
    roundNum.textContent = state.round + 1;
  }

  function startDecision() {
    state.mode = 'decision';
    state.timeLeft = TIMER_DURATION;
  }

  function makeDecision(call) {
    if (state.mode !== 'decision' && state.mode !== 'replay') return;
    state.playerCall = call;
    const sc = scenarios[state.round];
    const isCorrect = call === sc.correct;
    let points = 0;
    if (isCorrect) {
      points = Math.round(MAX_POINTS_PER_ROUND * (state.timeLeft / TIMER_DURATION));
      points = Math.max(20, points);
    }
    state.score += points;
    if (isCorrect) state.correct++;
    state.total++;
    state.decisions.push({ round: state.round + 1, call, correct: sc.correct, isCorrect, points });
    showResult(isCorrect, sc, points);
  }

  function showResult(isCorrect, sc, points) {
    state.mode = 'result';
    resultTitle.textContent = isCorrect ? 'CORRECT!' : 'INCORRECT';
    resultTitle.className = isCorrect ? 'correct' : 'wrong';
    resultExplanation.textContent = `${isCorrect ? 'Your call: ' + state.playerCall + ' — Correct!' : 'Your call: ' + state.playerCall + ' — Correct answer: ' + sc.correct}. ${sc.explanation}`;
    currentScoreEl.textContent = state.score;
    showScreen('result');
  }

  function nextRound() {
    state.round++;
    if (state.round >= TOTAL_ROUNDS) {
      showGameOver();
      return;
    }
    showScreen('decision');
    startReplay();
  }

  function showGameOver() {
    state.mode = 'gameover';
    const accuracy = state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;
    finalScoreDisplay.textContent = state.score + ' pts';
    accuracyDisplay.textContent = `Accuracy: ${state.correct}/${state.total} (${accuracy}%)`;
    let verdict = '';
    if (accuracy >= 90) verdict = 'Elite VAR Official! You have a sharp eye for the game.';
    else if (accuracy >= 70) verdict = 'Solid review skills. A few close calls could go either way.';
    else if (accuracy >= 50) verdict = 'Getting there. The VAR booth needs more practice.';
    else verdict = 'Time for VAR training camp! Keep studying those replays.';
    verdictText.textContent = verdict;
    showScreen('gameover');
    if (typeof Leaderboard !== 'undefined') {
      Leaderboard.promptName(function (name) {
        Leaderboard.addScore('var-replay', state.score, name);
        Leaderboard.renderLeaderboard('var-replay', 'leaderboard-container', state.score);
      });
    }
  }

  function update(dt) {
    if (state.mode === 'replay') {
      state.animTime += dt * 0.3;
      if (state.animTime >= 1.5) {
        state.animTime = 1.5;
        startDecision();
      }
    } else if (state.mode === 'decision') {
      state.timeLeft -= dt;
      const pct = Math.max(0, state.timeLeft / TIMER_DURATION) * 100;
      timerFill.style.width = pct + '%';
      timerText.textContent = Math.max(0, state.timeLeft).toFixed(1) + 's';
      if (state.timeLeft <= 1.0) timerFill.classList.add('urgent');
      if (state.timeLeft <= 0) {
        makeDecision('TIME_UP');
      }
    }
    state.animFrame++;
  }

  let lastTime = 0;
  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
  }

  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('next-btn').addEventListener('click', nextRound);
  document.getElementById('replay-btn').addEventListener('click', startGame);

  document.querySelectorAll('.dec-btn').forEach(btn => {
    btn.addEventListener('click', () => makeDecision(btn.dataset.call));
  });

  document.addEventListener('keydown', (e) => {
    if (state.mode !== 'decision' && state.mode !== 'replay') return;
    if (e.key === '1') makeDecision('GOAL');
    else if (e.key === '2') makeDecision('NO GOAL');
    else if (e.key === '3') makeDecision('FOUL');
    else if (e.key === '4') makeDecision('OFFSIDE');
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) canvas.requestFullscreen().catch(()=>{});
      else document.exitFullscreen();
    }
  });

  function renderGameToText() {
    return JSON.stringify({
      mode: state.mode,
      round: state.round + 1,
      totalRounds: TOTAL_ROUNDS,
      score: state.score,
      correct: state.correct,
      timeLeft: Math.round(state.timeLeft * 10) / 10,
      animTime: Math.round(state.animTime * 100) / 100,
      currentScenario: state.mode !== 'menu' && state.mode !== 'gameover' ? scenarios[state.round]?.replay : null,
      correctAnswer: state.mode === 'result' ? scenarios[state.round]?.correct : null,
      lastDecision: state.decisions.length > 0 ? state.decisions[state.decisions.length - 1] : null,
      decisions: state.decisions
    });
  }

  window.render_game_to_text = renderGameToText;

  window.advanceTime = function(ms) {
    const steps = Math.max(1, Math.round(ms / (1000 / 60)));
    for (let i = 0; i < steps; i++) update(1 / 60);
    render();
  };

  showScreen('menu');
  render();
  requestAnimationFrame(gameLoop);
})();
