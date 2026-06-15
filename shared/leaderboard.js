var Leaderboard = (function () {
  var STORAGE_KEY = 'wc_minigames_leaderboard';

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function getScores(gameId) {
    var data = getAll();
    return (data[gameId] || []).sort(function (a, b) { return b.score - a.score; });
  }

  function addScore(gameId, score, name) {
    name = (name || 'Player').substring(0, 12);
    var data = getAll();
    if (!data[gameId]) data[gameId] = [];
    data[gameId].push({ name: name, score: score, date: Date.now() });
    data[gameId].sort(function (a, b) { return b.score - a.score; });
    data[gameId] = data[gameId].slice(0, 10);
    save(data);
    return data[gameId];
  }

  function getRank(gameId, score) {
    var scores = getScores(gameId);
    for (var i = 0; i < scores.length; i++) {
      if (score >= scores[i].score) return i + 1;
    }
    return scores.length + 1;
  }

  function clearGame(gameId) {
    var data = getAll();
    delete data[gameId];
    save(data);
  }

  function renderLeaderboard(gameId, containerId, currentScore) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var scores = getScores(gameId);
    var html = '<div class="leaderboard">';
    html += '<h3>Leaderboard</h3>';
    if (scores.length === 0) {
      html += '<p class="lb-empty">No scores yet. Be the first!</p>';
    } else {
      html += '<div class="lb-entries">';
      scores.forEach(function (entry, i) {
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
        var highlight = currentScore && entry.score === currentScore ? ' lb-current' : '';
        html += '<div class="lb-entry' + highlight + '">';
        html += '<span class="lb-rank">' + medal + '</span>';
        html += '<span class="lb-name">' + entry.name + '</span>';
        html += '<span class="lb-score">' + entry.score + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }
    if (currentScore !== undefined) {
      var rank = getRank(gameId, currentScore);
      html += '<div class="lb-your-rank">Your rank: #' + rank + '</div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function promptName(callback) {
    var stored = '';
    try { stored = localStorage.getItem('wc_player_name') || ''; } catch (e) {}
    var name = prompt('Enter your name for the leaderboard:', stored);
    if (name && name.trim()) {
      name = name.trim().substring(0, 12);
      try { localStorage.setItem('wc_player_name', name); } catch (e) {}
      callback(name);
    }
  }

  return {
    getScores: getScores,
    addScore: addScore,
    getRank: getRank,
    clearGame: clearGame,
    renderLeaderboard: renderLeaderboard,
    promptName: promptName,
  };
})();
