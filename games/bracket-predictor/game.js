(function() {
  const TEAMS_DATA = [
    { name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', atk: 88, def: 82 },
    { name: 'Argentina', flag: '\u{1F1E6}\u{1F1F2}', atk: 90, def: 80 },
    { name: 'France', flag: '\u{1F1EB}\u{1F1F7}', atk: 92, def: 78 },
    { name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', atk: 85, def: 84 },
    { name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}', atk: 87, def: 81 },
    { name: 'England', flag: '\u{1F1EA}\u{1F1EC}', atk: 86, def: 83 },
    { name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}', atk: 84, def: 80 },
    { name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}', atk: 88, def: 79 },
    { name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}', atk: 82, def: 86 },
    { name: 'Belgium', flag: '\u{1F1E7}\u{1F1EA}', atk: 85, def: 77 },
    { name: 'Croatia', flag: '\u{1F1ED}\u{1F1F7}', atk: 80, def: 81 },
    { name: 'Uruguay', flag: '\u{1F1FA}\u{1F1FE}', atk: 83, def: 78 },
    { name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', atk: 79, def: 76 },
    { name: 'Morocco', flag: '\u{1F1F2}\u{1F1E6}', atk: 78, def: 82 },
    { name: 'South Korea', flag: '\u{1F1F0}\u{1F1F7}', atk: 77, def: 75 },
    { name: 'USA', flag: '\u{1F1FA}\u{1F1F8}', atk: 76, def: 74 },
  ];

  const ROUND_NAMES = ['Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'];
  const MATCHES_PER_ROUND = [8, 4, 2, 1];

  let state = {
    teams: [],
    bracket: [],
    picks: [],
    actual: [],
    scored: false,
    totalScore: 0,
    phase: 'idle'
  };

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function ovr(t) { return Math.round((t.atk + t.def) / 2); }

  function simulateWinner(t1, t2) {
    const s1 = ovr(t1) + Math.random() * 20;
    const s2 = ovr(t2) + Math.random() * 20;
    return s1 >= s2 ? t1 : t2;
  }

  function initBracket() {
    const shuffled = shuffle(TEAMS_DATA);
    state.teams = shuffled.map(t => ({ ...t, overall: ovr(t) }));
    state.bracket = [];
    state.picks = [];
    state.actual = [];
    state.scored = false;
    state.totalScore = 0;
    state.phase = 'picking';

    for (let r = 0; r < 4; r++) {
      const matches = [];
      for (let m = 0; m < MATCHES_PER_ROUND[r]; m++) {
        let home = null, away = null;
        if (r === 0) {
          home = state.teams[m * 2];
          away = state.teams[m * 2 + 1];
        }
        matches.push({ home, away, winner: null });
      }
      state.bracket.push(matches);
      state.picks.push(new Array(MATCHES_PER_ROUND[r]).fill(null));
      state.actual.push(new Array(MATCHES_PER_ROUND[r]).fill(null));
    }

    advanceActualResults();
  }

  function advanceActualResults() {
    for (let r = 0; r < 4; r++) {
      for (let m = 0; m < state.bracket[r].length; m++) {
        const match = state.bracket[r][m];
        if (match.home && match.away && !state.actual[r][m]) {
          state.actual[r][m] = simulateWinner(match.home, match.away);
        }
      }
    }
    for (let r = 1; r < 4; r++) {
      for (let m = 0; m < state.bracket[r].length; m++) {
        const prevM1 = m * 2, prevM2 = m * 2 + 1;
        const w1 = state.actual[r - 1][prevM1];
        const w2 = state.actual[r - 1][prevM2];
        if (w1 && w2) {
          if (!state.bracket[r][m].home) state.bracket[r][m].home = w1;
          if (!state.bracket[r][m].away) state.bracket[r][m].away = w2;
        }
      }
    }
  }

  function propagatePick(round, matchIdx) {
    const winner = state.picks[round][matchIdx];
    if (!winner) return;
    state.bracket[round][matchIdx].winner = winner;

    if (round < 3) {
      const nextMatch = Math.floor(matchIdx / 2);
      const isTop = matchIdx % 2 === 0;
      if (isTop) state.bracket[round + 1][nextMatch].home = winner;
      else state.bracket[round + 1][nextMatch].away = winner;
      state.picks[round + 1][nextMatch] = null;
      for (let r = round + 2; r < 4; r++) {
        for (let m = 0; m < state.picks[r].length; m++) {
          state.picks[r][m] = null;
          state.bracket[r][m].home = round + 1 < r ? state.bracket[r][m].home : null;
          if (r === round + 1) {
            state.bracket[r][m].home = null;
            state.bracket[r][m].away = null;
          }
        }
      }
    }
  }

  function pickTeam(round, matchIdx, side) {
    const match = state.bracket[round][matchIdx];
    const team = side === 'home' ? match.home : match.away;
    if (!team) return;

    if (state.picks[round][matchIdx] === team) {
      state.picks[round][matchIdx] = null;
      match.winner = null;
      if (round < 3) {
        const nextMatch = Math.floor(matchIdx / 2);
        const isTop = matchIdx % 2 === 0;
        if (isTop) state.bracket[round + 1][nextMatch].home = null;
        else state.bracket[round + 1][nextMatch].away = null;
        for (let r = round + 1; r < 4; r++) {
          for (let m = 0; m < state.picks[r].length; m++) {
            state.picks[r][m] = null;
            state.bracket[r][m].home = null;
            state.bracket[r][m].away = null;
          }
        }
        advanceActualResults();
      }
    } else {
      state.picks[round][matchIdx] = team;
      propagatePick(round, matchIdx);
    }

    updateButtons();
    render();
  }

  function calculateScore() {
    let score = 0;
    for (let r = 0; r < 4; r++) {
      for (let m = 0; m < state.picks[r].length; m++) {
        if (state.picks[r][m] && state.actual[r][m]) {
          if (state.picks[r][m].name === state.actual[r][m].name) {
            score += r === 3 ? 2 : 1;
          }
        }
      }
    }
    return score;
  }

  function isComplete() {
    return state.picks.every((round, r) => round.every((pick, m) => pick !== null));
  }

  function updateButtons() {
    const save = document.getElementById('save-btn');
    const sim = document.getElementById('sim-btn');
    const score = document.getElementById('score-btn');
    const share = document.getElementById('share-btn');
    if (state.phase === 'picking') {
      save.style.display = '';
      if (isComplete()) { sim.style.display = ''; score.style.display = ''; }
      else { sim.style.display = 'none'; score.style.display = 'none'; }
      share.style.display = 'none';
    } else if (state.phase === 'scored') {
      save.style.display = 'none';
      sim.style.display = 'none';
      score.style.display = 'none';
      share.style.display = '';
    }
  }

  function setStatus(msg) {
    document.getElementById('status-bar').textContent = msg;
  }

  function renderBracket() {
    const bracket = document.getElementById('bracket');
    bracket.innerHTML = '';

    if (state.bracket.length === 0) return;

    for (let r = 0; r < 4; r++) {
      if (r > 0) {
        const conn = document.createElement('div');
        conn.className = 'connector';
        conn.innerHTML = '<svg></svg>';
        bracket.appendChild(conn);
      }

      const roundDiv = document.createElement('div');
      roundDiv.className = 'round';
      roundDiv.innerHTML = `<div class="round-title">${ROUND_NAMES[r]}</div>`;

      for (let m = 0; m < state.bracket[r].length; m++) {
        const match = state.bracket[r][m];
        const matchDiv = document.createElement('div');
        matchDiv.className = 'matchup';
        matchDiv.style.marginTop = r === 0 ? `${Math.pow(2, r) * 18 - 18}px` : '';

        const homeSlot = createTeamSlot(r, m, 'home', match.home, match);
        const awaySlot = createTeamSlot(r, m, 'away', match.away, match);

        matchDiv.appendChild(homeSlot);
        matchDiv.appendChild(awaySlot);
        roundDiv.appendChild(matchDiv);
      }
      bracket.appendChild(roundDiv);
    }
  }

  function createTeamSlot(round, matchIdx, side, team, match) {
    const slot = document.createElement('div');
    slot.className = 'team-slot';

    if (!team) {
      slot.classList.add('empty');
      slot.textContent = 'TBD';
      return slot;
    }

    const pick = state.picks[round][matchIdx];
    if (pick && pick.name === team.name) slot.classList.add('selected');
    if (state.phase === 'scored' && state.actual[round][matchIdx] && state.actual[round][matchIdx].name === team.name) {
      slot.classList.add('winner');
    }

    const flagSpan = document.createElement('span');
    flagSpan.className = 'team-flag';
    flagSpan.textContent = team.flag;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'team-name';
    nameSpan.textContent = team.name;

    const ratingSpan = document.createElement('span');
    ratingSpan.className = 'team-rating';
    ratingSpan.textContent = ovr(team);

    slot.appendChild(flagSpan);
    slot.appendChild(nameSpan);
    slot.appendChild(ratingSpan);

    slot.addEventListener('click', () => {
      if (state.phase === 'picking' && team && match.home && match.away) {
        if (pick && pick.name === team.name) return;
        pickTeam(round, matchIdx, side);
      }
    });

    slot.addEventListener('mouseenter', (e) => showTooltip(e, team));
    slot.addEventListener('mouseleave', hideTooltip);

    return slot;
  }

  function showTooltip(e, team) {
    const tip = document.getElementById('tooltip');
    tip.innerHTML = `
      <div style="font-weight:bold;margin-bottom:6px">${team.flag} ${team.name}</div>
      <div class="stat"><span class="label">Attack</span><div class="stat-bar"><div class="stat-fill atk" style="width:${team.atk}%"></div></div><span>${team.atk}</span></div>
      <div class="stat"><span class="label">Defense</span><div class="stat-bar"><div class="stat-fill def" style="width:${team.def}%"></div></div><span>${team.def}</span></div>
      <div class="stat"><span class="label">Overall</span><div class="stat-bar"><div class="stat-fill ovr" style="width:${ovr(team)}%"></div></div><span>${ovr(team)}</span></div>
    `;
    tip.style.display = 'block';
    tip.style.left = Math.min(e.clientX + 12, window.innerWidth - 230) + 'px';
    tip.style.top = (e.clientY + 12) + 'px';
  }

  function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
  }

  function render() {
    renderBracket();
    if (state.phase === 'picking') {
      const done = isComplete();
      setStatus(done ? 'Bracket complete! Score or simulate actual results.' : `Pick winners for each matchup. ${countPicks()}/15 selected.`);
    }
    updateButtons();
  }

  function countPicks() {
    let c = 0;
    state.picks.forEach(r => r.forEach(p => { if (p) c++; }));
    return c;
  }

  window.startGame = function() {
    initBracket();
    render();
    setStatus('Pick winners for each matchup. Click a team to advance them.');
  };

  window.simulateActual = function() {
    state.phase = 'scored';
    state.totalScore = calculateScore();
    render();
    showScoreOverlay();
  };

  window.scoreBracket = function() {
    state.phase = 'scored';
    state.totalScore = calculateScore();
    render();
    showScoreOverlay();
  };

  function showScoreOverlay() {
    let correct = 0, total = 0;
    const roundScores = [0, 0, 0, 0];
    const roundCorrect = [0, 0, 0, 0];
    for (let r = 0; r < 4; r++) {
      for (let m = 0; m < state.picks[r].length; m++) {
        if (state.picks[r][m] && state.actual[r][m]) {
          total++;
          if (state.picks[r][m].name === state.actual[r][m].name) {
            correct++;
            roundCorrect[r]++;
            roundScores[r] += r === 3 ? 2 : 1;
          }
        }
      }
    }

    const overlay = document.createElement('div');
    overlay.id = 'score-overlay';
    overlay.innerHTML = `
      <div id="score-card">
        <h2>Tournament Score</h2>
        <div class="big-score">${state.totalScore} pts</div>
        <div class="detail">${correct}/${total} correct picks</div>
        <div class="detail">Ro16: ${roundCorrect[0]}/8 correct (${roundScores[0]} pts)</div>
        <div class="detail">QF: ${roundCorrect[1]}/4 correct (${roundScores[1]} pts)</div>
        <div class="detail">SF: ${roundCorrect[2]}/2 correct (${roundScores[2]} pts)</div>
        <div class="detail">Final: ${roundCorrect[3]}/1 correct (${roundScores[3]} pts)</div>
        <button onclick="this.closest('#score-overlay').remove()">Close</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  window.saveBracket = function() {
    const data = {
      picks: state.picks.map(r => r.map(p => p ? p.name : null)),
      phase: state.phase
    };
    localStorage.setItem('bracket-predictor-save', JSON.stringify(data));
    setStatus('Bracket saved!');
  };

  window.loadBracket = function() {
    const raw = localStorage.getItem('bracket-predictor-save');
    if (!raw) { setStatus('No saved bracket found.'); return; }
    const data = JSON.parse(raw);
    initBracket();
    for (let r = 0; r < 4; r++) {
      for (let m = 0; m < data.picks[r].length; m++) {
        if (data.picks[r][m]) {
          const team = findTeamByName(data.picks[r][m]);
          if (team) {
            state.picks[r][m] = team;
            propagatePick(r, m);
          }
        }
      }
    }
    render();
    setStatus('Bracket loaded!');
  };

  function findTeamByName(name) {
    for (const t of state.teams) {
      if (t.name === name) return t;
    }
    return null;
  }

  window.shareBracket = function() {
    const canvas = document.getElementById('share-canvas');
    canvas.width = 1200;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('World Cup Bracket Predictor', 600, 40);

    ctx.fillStyle = '#8ab4f8';
    ctx.font = '14px Segoe UI, system-ui, sans-serif';
    ctx.fillText(`Score: ${state.totalScore} pts | ${countPicks()}/15 correct`, 600, 65);

    const roundX = [40, 290, 520, 740];
    const matchHeight = 50;

    for (let r = 0; r < 4; r++) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ROUND_NAMES[r], roundX[r] + 100, 95);

      for (let m = 0; m < state.bracket[r].length; m++) {
        const yOff = 110 + m * matchHeight * Math.pow(2, r);
        const match = state.bracket[r][m];
        const pick = state.picks[r][m];

        if (match.home) {
          const isPick = pick && pick.name === match.home.name;
          ctx.fillStyle = isPick ? '#2a5a2a' : '#1a2a44';
          ctx.strokeStyle = isPick ? '#4caf50' : '#2a3a5c';
          ctx.lineWidth = 1;
          roundRect(ctx, roundX[r], yOff, 200, 22, 4);
          ctx.fillStyle = '#fff';
          ctx.font = '12px Segoe UI, system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${match.home.flag} ${match.home.name}`, roundX[r] + 6, yOff + 15);
        }

        if (match.away) {
          const isPick = pick && pick.name === match.away.name;
          ctx.fillStyle = isPick ? '#2a5a2a' : '#1a2a44';
          ctx.strokeStyle = isPick ? '#4caf50' : '#2a3a5c';
          roundRect(ctx, roundX[r], yOff + 24, 200, 22, 4);
          ctx.fillStyle = '#fff';
          ctx.font = '12px Segoe UI, system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`${match.away.flag} ${match.away.name}`, roundX[r] + 6, yOff + 38);
        }
      }
    }

    const link = document.createElement('a');
    link.download = 'bracket.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    setStatus('Bracket image downloaded!');
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  window.render_game_to_text = function() {
    const picks = [];
    if (state.picks.length > 0 && state.bracket.length > 0) {
      for (let r = 0; r < 4; r++) {
        if (!state.picks[r] || !state.bracket[r]) continue;
        for (let m = 0; m < state.picks[r].length; m++) {
          picks.push({
            round: ROUND_NAMES[r],
            match: m + 1,
            home: state.bracket[r][m] && state.bracket[r][m].home ? state.bracket[r][m].home.name : null,
            away: state.bracket[r][m] && state.bracket[r][m].away ? state.bracket[r][m].away.name : null,
            pick: state.picks[r][m] ? state.picks[r][m].name : null
          });
        }
      }
    }
    return JSON.stringify({
      phase: state.phase,
      rounds: ROUND_NAMES,
      picks,
      score: state.totalScore,
      complete: isComplete()
    });
  };

  window.advanceTime = function(ms) {};

  document.addEventListener('DOMContentLoaded', () => {
    render();
  });
})();
