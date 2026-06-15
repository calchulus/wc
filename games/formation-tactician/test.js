const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const screenshotDir = path.resolve(__dirname, 'screenshots');
  const fs = require('fs');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  const testUrl = 'file://' + path.resolve(__dirname, 'index.html');
  console.log('Loading formation-tactician...');
  await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  let state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Initial state:', JSON.stringify(state));
  console.assert(state.mode === 'setup', 'Expected mode=setup');
  console.assert(state.formation === '4-4-2', 'Expected formation=4-4-2');

  // Screenshot 1: Initial state
  await page.screenshot({ path: path.join(screenshotDir, '01-initial.png') });
  console.log('Screenshot 1: Initial state');

  // Dismiss overlay
  console.log('Dismissing overlay...');
  await page.click('#overlay-start-btn');
  await page.waitForTimeout(300);

  // Screenshot 2: Setup mode
  await page.screenshot({ path: path.join(screenshotDir, '02-setup.png') });
  console.log('Screenshot 2: Setup mode');

  // Test 1: Select 4-3-3
  console.log('Selecting 4-3-3...');
  await page.click('.preset-btn[data-formation="4-3-3"]');
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.assert(state.formation === '4-3-3', 'Expected 4-3-3');
  console.assert(state.players.length === 11, 'Expected 11 players');

  // Test 2: Verify display
  const displayText = await page.textContent('#formation-display');
  console.assert(displayText === '4-3-3', 'Display should show 4-3-3');

  // Test 3: Select 3-5-2
  console.log('Selecting 3-5-2...');
  await page.click('.preset-btn[data-formation="3-5-2"]');
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.assert(state.formation === '3-5-2', 'Expected 3-5-2');

  // Screenshot 3: Formation selected
  await page.screenshot({ path: path.join(screenshotDir, '03-formation-selected.png') });
  console.log('Screenshot 3: Formation selected');

  // Test 4: Start match via the game's internal mechanism (set mode directly + use advanceTime)
  // The start-btn triggers a setInterval, but advanceTime also advances match time.
  // To avoid race conditions, set mode and use advanceTime only.
  console.log('Starting match via internal state...');
  await page.evaluate(() => {
    // Access internal state via the closure - simulate what startMatch does
    document.getElementById('start-btn').click();
  });
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Mode after start:', state.mode);
  console.assert(state.mode === 'match', 'Expected mode=match');
  console.assert(state.score.player === 0, 'Expected score=0');

  // Screenshot 4: Match started
  await page.screenshot({ path: path.join(screenshotDir, '04-match-started.png') });
  console.log('Screenshot 4: Match started');

  // Test 5: Wait for match to complete via setInterval (90 min * 120ms = 10.8s + 600ms timeout)
  console.log('Waiting for match to complete...');
  // Poll until match completes
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(200);
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (state.matchTime >= 90 || state.mode !== 'match') {
      console.log('Match completed at iteration', i, '- mode:', state.mode, 'minute:', state.matchTime);
      break;
    }
  }

  // Wait for endMatch setTimeout to fire
  await page.waitForTimeout(1000);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Post-match state:', JSON.stringify(state));

  // Test 6: Verify match completed
  const hasResult = await page.evaluate(() => {
    const overlay = document.getElementById('result-overlay');
    return overlay && !overlay.classList.contains('hidden');
  });
  console.log('Result overlay visible:', hasResult);
  console.assert(hasResult || state.mode === 'setup', 'Match should have ended');

  // Test 7: Verify rating
  console.assert(state.rating > 0, 'Rating should be > 0');
  console.log('Formation rating:', state.rating);

  // Test 8: Verify match events
  console.assert(state.matchEvents.length > 0, 'Match should have events');
  console.log('Match events count:', state.matchEvents.length);

  // Screenshot 5: Match result
  await page.screenshot({ path: path.join(screenshotDir, '05-match-result.png') });
  console.log('Screenshot 5: Match result');

  // Report errors
  if (errors.length) {
    console.log('CONSOLE ERRORS:', errors);
  } else {
    console.log('No console errors.');
  }

  // === EXTENDED SCENARIO: Test all 4 formations ===
  console.log('\n--- EXTENDED: Testing all 4 formations ---');
  await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.click('#overlay-start-btn');
  await page.waitForTimeout(300);

  const formations = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1'];
  for (const f of formations) {
    await page.click(`.preset-btn[data-formation="${f}"]`);
    await page.waitForTimeout(200);
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    console.assert(state.formation === f, `Expected formation=${f}`);
    console.assert(state.players.length === 11, `Expected 11 players for ${f}`);
    console.log('Formation:', f, '- players:', state.players.length, '- verified:', state.formation === f);

    const displayText = await page.textContent('#formation-display');
    console.assert(displayText === f, `Display should show ${f}`);
  }
  console.log('PASS: All 4 formations verified with 11 players each');

  // === EXTENDED SCENARIO: Verify player count stays at 11 for each formation ===
  console.log('\n--- EXTENDED: Player count verification per formation ---');
  for (const f of formations) {
    await page.click(`.preset-btn[data-formation="${f}"]`);
    await page.waitForTimeout(200);
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    console.assert(state.players.length === 11, `${f} should have exactly 11 players, got ${state.players.length}`);
    // Verify roles are distributed correctly
    const roles = state.players.map(p => p.role);
    console.log(f, 'roles:', roles.join(', '));
    console.assert(roles.includes('GK'), `${f} should have a GK`);
  }
  console.log('PASS: All formations maintain 11 players');

  // === EXTENDED SCENARIO: Match score tracking ===
  console.log('\n--- EXTENDED: Match score tracking ---');
  // Select 4-4-2 and start match
  await page.click('.preset-btn[data-formation="4-4-2"]');
  await page.waitForTimeout(200);
  await page.click('#start-btn');
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.assert(state.mode === 'match', 'Expected match mode');
  console.assert(state.score.player === 0, 'Initial player score should be 0');
  console.assert(state.score.ai === 0, 'Initial AI score should be 0');

  // The match uses setInterval(120ms) per minute. Wait for 90 minutes + endMatch timeout.
  // 90 * 120ms = 10.8s + 600ms endMatch timeout + buffer
  console.log('Waiting for match to complete (real-time intervals)...');
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(150);
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (state.mode !== 'match') break;
  }
  await page.waitForTimeout(1000);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Final match state - mode:', state.mode, 'player:', state.score.player, 'ai:', state.score.ai, 'rating:', state.rating);
  console.assert(typeof state.score.player === 'number', 'Final player score should be a number');
  console.assert(typeof state.score.ai === 'number', 'Final AI score should be a number');
  console.assert(state.rating > 0, 'Rating should be > 0');
  console.assert(state.matchEvents.length > 0, 'Match should have events');
  console.log('Match events:', state.matchEvents.length);
  console.log('PASS: Match score tracking verified');
  await page.screenshot({ path: path.join(screenshotDir, 'ext-01-match-score.png') });

  await browser.close();
  console.log('Formation Tactician test complete!');
})().catch(e => {
  console.error('Test error:', e.message);
  process.exit(1);
});
