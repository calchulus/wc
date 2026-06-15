const canvas = document.getElementById('jersey-canvas');
const ctx = canvas.getContext('2d');

const state = {
    mainColor: '#FF0000',
    accentColor: '#FFFFFF',
    sleeveColor: '#FF0000',
    pattern: 'solid',
    logoPosition: 'chest',
    playerNumber: 10,
    playerName: 'MESSI',
    team: 'custom',
    savedDesigns: []
};

const teamPresets = {
    brazil: { main: '#FFDF00', accent: '#009c3b', sleeve: '#009c3b' },
    germany: { main: '#FFFFFF', accent: '#000000', sleeve: '#FFFFFF' },
    argentina: { main: '#75AADB', accent: '#FFFFFF', sleeve: '#FFFFFF' },
    france: { main: '#002395', accent: '#FFFFFF', sleeve: '#002395' },
    england: { main: '#FFFFFF', accent: '#CF081F', sleeve: '#FFFFFF' },
    spain: { main: '#AA151B', accent: '#F1BF00', sleeve: '#AA151B' },
    italy: { main: '#0046AD', accent: '#FFFFFF', sleeve: '#0046AD' },
    netherlands: { main: '#FF6B00', accent: '#FFFFFF', sleeve: '#FF6B00' },
    japan: { main: '#FFFFFF', accent: '#00205B', sleeve: '#00205B' },
    usa: { main: '#002868', accent: '#BF0A30', sleeve: '#BF0A30' }
};

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function drawJersey() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const jerseyTop = 50;
    const jerseyBottom = 420;
    const jerseyWidth = 240;

    ctx.save();

    drawBody(centerX, jerseyTop, jerseyBottom, jerseyWidth);

    drawSleeves(centerX, jerseyTop);

    drawCollar(centerX, jerseyTop);

    drawDetails(centerX, jerseyTop, jerseyBottom, jerseyWidth);

    if (state.logoPosition === 'chest') {
        drawLogo(centerX, jerseyTop + 100);
    }

    ctx.restore();

    if (state.playerName) {
        drawName(centerX, jerseyTop + 60);
    }

    if (state.playerNumber >= 0 && state.playerNumber <= 99) {
        drawNumber(centerX, jerseyTop + 200);
    }
}

function drawBody(centerX, top, bottom, width) {
    ctx.beginPath();
    ctx.moveTo(centerX - width / 2, top + 50);
    ctx.lineTo(centerX - width / 2, bottom);
    ctx.lineTo(centerX + width / 2, bottom);
    ctx.lineTo(centerX + width / 2, top + 50);
    ctx.closePath();

    applyPattern(centerX, top + 50, width, bottom - top - 50);
}

function drawDetails(centerX, top, bottom, width) {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);

    const leftX = centerX - width / 2 + 15;
    const rightX = centerX + width / 2 - 15;

    ctx.beginPath();
    ctx.moveTo(leftX, top + 55);
    ctx.lineTo(leftX, bottom - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightX, top + 55);
    ctx.lineTo(rightX, bottom - 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - width / 2, bottom - 8);
    ctx.lineTo(centerX + width / 2, bottom - 8);
    ctx.stroke();

    ctx.setLineDash([]);
}

function drawSleeves(centerX, top) {
    const sleeveWidth = 70;
    const sleeveHeight = 80;

    ctx.beginPath();
    ctx.moveTo(centerX - 120, top + 50);
    ctx.lineTo(centerX - 120 - sleeveWidth, top + sleeveHeight);
    ctx.lineTo(centerX - 120 - sleeveWidth, top + sleeveHeight + 40);
    ctx.lineTo(centerX - 120, top + 90);
    ctx.closePath();
    ctx.fillStyle = state.sleeveColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + 120, top + 50);
    ctx.lineTo(centerX + 120 + sleeveWidth, top + sleeveHeight);
    ctx.lineTo(centerX + 120 + sleeveWidth, top + sleeveHeight + 40);
    ctx.lineTo(centerX + 120, top + 90);
    ctx.closePath();
    ctx.fillStyle = state.sleeveColor;
    ctx.fill();
    ctx.stroke();
}

function drawCollar(centerX, top) {
    ctx.beginPath();
    ctx.moveTo(centerX - 40, top + 30);
    ctx.quadraticCurveTo(centerX, top + 60, centerX + 40, top + 30);
    ctx.lineWidth = 8;
    ctx.strokeStyle = state.accentColor;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - 35, top + 35);
    ctx.quadraticCurveTo(centerX, top + 55, centerX + 35, top + 35);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.stroke();
}

function applyPattern(x, y, width, height) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - width / 2, y, width, height);
    ctx.clip();

    ctx.fillStyle = state.mainColor;
    ctx.fillRect(x - width / 2, y, width, height);

    switch (state.pattern) {
        case 'stripes':
            drawStripes(x, y, width, height);
            break;
        case 'hoops':
            drawHoops(x, y, width, height);
            break;
        case 'diamond':
            drawDiamond(x, y, width, height);
            break;
        case 'gradient':
            drawGradient(x, y, width, height);
            break;
    }

    ctx.restore();
}

function drawStripes(x, y, width, height) {
    const stripeWidth = 20;
    ctx.fillStyle = state.accentColor;
    for (let i = 0; i < width; i += stripeWidth * 2) {
        ctx.fillRect(x - width / 2 + i, y, stripeWidth, height);
    }
}

function drawHoops(x, y, width, height) {
    const hoopHeight = 25;
    ctx.fillStyle = state.accentColor;
    for (let i = 0; i < height; i += hoopHeight * 2) {
        ctx.fillRect(x - width / 2, y + i, width, hoopHeight);
    }
}

function drawDiamond(x, y, width, height) {
    const size = 30;
    ctx.fillStyle = state.accentColor;

    for (let row = 0; row < height; row += size * 2) {
        for (let col = 0; col < width; col += size * 2) {
            const cx = x - width / 2 + col + size;
            const cy = y + row + size;
            ctx.beginPath();
            ctx.moveTo(cx, cy - size / 2);
            ctx.lineTo(cx + size / 2, cy);
            ctx.lineTo(cx, cy + size / 2);
            ctx.lineTo(cx - size / 2, cy);
            ctx.closePath();
            ctx.fill();
        }
    }
}

function drawGradient(x, y, width, height) {
    const gradient = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y);
    gradient.addColorStop(0, state.mainColor);
    gradient.addColorStop(0.5, state.accentColor);
    gradient.addColorStop(1, state.mainColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(x - width / 2, y, width, height);
}

function drawLogo(x, y) {
    const size = 35;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = state.accentColor;
    ctx.fill();
    ctx.strokeStyle = state.mainColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = state.mainColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = state.accentColor;
    ctx.fill();
}

function drawName(x, y) {
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = state.accentColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    ctx.strokeText(state.playerName, x, y);
    ctx.fillText(state.playerName, x, y);
}

function drawNumber(x, y) {
    ctx.font = 'bold 80px Arial';
    ctx.fillStyle = state.accentColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 4;
    ctx.strokeText(state.playerNumber, x, y);
    ctx.fillText(state.playerNumber, x, y);
}

function updateMainColor(value) {
    state.mainColor = value;
    document.getElementById('main-color').value = value;
    drawJersey();
}

function updateAccentColor(value) {
    state.accentColor = value;
    document.getElementById('accent-color').value = value;
    drawJersey();
}

function updateSleeveColor(value) {
    state.sleeveColor = value;
    document.getElementById('sleeve-color').value = value;
    drawJersey();
}

function setTeam(teamName) {
    state.team = teamName;
    if (teamPresets[teamName]) {
        const preset = teamPresets[teamName];
        updateMainColor(preset.main);
        updateAccentColor(preset.accent);
        updateSleeveColor(preset.sleeve);
    }
}

function saveDesign() {
    const imageData = canvas.toDataURL('image/png');
    const design = {
        id: Date.now(),
        image: imageData,
        name: state.playerName || 'Custom',
        number: state.playerNumber,
        team: state.team,
        mainColor: state.mainColor,
        accentColor: state.accentColor,
        pattern: state.pattern
    };

    state.savedDesigns.push(design);
    updateGallery();
    downloadImage(imageData);
    if (typeof Leaderboard !== 'undefined') {
      Leaderboard.promptName(function (name) {
        Leaderboard.addScore('kit-designer', state.savedDesigns.length, name);
        Leaderboard.renderLeaderboard('kit-designer', 'leaderboard-container', state.savedDesigns.length);
      });
    }
}

function downloadImage(dataUrl) {
    const link = document.createElement('a');
    link.download = `kit-design-${state.playerName || 'custom'}-${state.playerNumber}.png`;
    link.href = dataUrl;
    link.click();
}

function updateGallery() {
    const gallery = document.getElementById('gallery');

    if (state.savedDesigns.length === 0) {
        gallery.innerHTML = '<p class="gallery-empty">No saved designs yet. Export your design to see it here!</p>';
        return;
    }

    gallery.innerHTML = state.savedDesigns.map(design => `
        <div class="gallery-item" data-id="${design.id}">
            <img src="${design.image}" alt="${design.name} #${design.number}">
            <div class="gallery-item-info">
                <span>${design.name || 'Custom'} #${design.number}</span>
            </div>
        </div>
    `).join('');
}

function clearGallery() {
    state.savedDesigns = [];
    updateGallery();
}

function renderGameToText() {
    const payload = {
        mode: 'design',
        design: {
            mainColor: state.mainColor,
            accentColor: state.accentColor,
            sleeveColor: state.sleeveColor,
            pattern: state.pattern,
            logoPosition: state.logoPosition,
            playerNumber: state.playerNumber,
            playerName: state.playerName,
            team: state.team,
            savedCount: state.savedDesigns.length
        }
    };
    return JSON.stringify(payload);
}

window.render_game_to_text = renderGameToText;

window.advanceTime = (ms) => {
    drawJersey();
};

document.getElementById('main-color').addEventListener('input', (e) => {
    state.mainColor = e.target.value;
    state.team = 'custom';
    document.getElementById('team-select').value = 'custom';
    drawJersey();
});

document.getElementById('accent-color').addEventListener('input', (e) => {
    state.accentColor = e.target.value;
    state.team = 'custom';
    document.getElementById('team-select').value = 'custom';
    drawJersey();
});

document.getElementById('sleeve-color').addEventListener('input', (e) => {
    state.sleeveColor = e.target.value;
    state.team = 'custom';
    document.getElementById('team-select').value = 'custom';
    drawJersey();
});

document.getElementById('team-select').addEventListener('change', (e) => {
    setTeam(e.target.value);
    drawJersey();
});

document.getElementById('player-number').addEventListener('input', (e) => {
    const num = parseInt(e.target.value);
    state.playerNumber = isNaN(num) ? 0 : Math.max(0, Math.min(99, num));
    drawJersey();
});

document.getElementById('player-name').addEventListener('input', (e) => {
    state.playerName = e.target.value.toUpperCase();
    drawJersey();
});

document.querySelectorAll('.pattern-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.pattern = btn.dataset.pattern;
        drawJersey();
    });
});

document.querySelectorAll('.logo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.logo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.logoPosition = btn.dataset.logo;
        drawJersey();
    });
});

document.getElementById('export-btn').addEventListener('click', saveDesign);
document.getElementById('clear-btn').addEventListener('click', clearGallery);

function init() {
    drawJersey();
    updateGallery();
}

init();
