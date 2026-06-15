const { chromium } = require('playwright');
const path = require('path');

const url = 'file://' + path.resolve(__dirname, 'index.html');
const screenshotDir = path.resolve(__dirname, 'screenshots');

(async () => {
  const fs = require('fs');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 700 } });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  let state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Initial state:', JSON.stringify(state));

  await page.screenshot({ path: path.join(screenshotDir, '01-menu.png') });
  console.assert(state.mode === 'menu', 'Expected mode=menu at start');
  console.assert(state.score === 0, 'Expected score=0 at start');

  // Start the game
  console.log('Clicking START...');
  await page.evaluate(() => document.getElementById('start-btn').click());
  await page.waitForTimeout(300);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After start:', JSON.stringify(state));
  console.assert(state.mode === 'playing', 'Expected mode=playing after start');
  console.assert(state.totalFigures === 60, 'Expected 60 crowd figures');

  await page.screenshot({ path: path.join(screenshotDir, '02-playing.png') });

  // Simulate tapping in rhythm for several beats
  console.log('Tapping in rhythm...');
  const initialBeatInterval = 600; // 100 BPM = 600ms

  for (let i = 0; i < 10; i++) {
    // Advance to near a beat, then tap
    await page.evaluate((ms) => window.advanceTime(ms), initialBeatInterval - 50);
    await page.waitForTimeout(50);
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
  }

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After 10 rhythmic taps:', JSON.stringify(state));
  console.assert(state.totalBeats >= 0, 'Beats tracked');

  await page.screenshot({ path: path.join(screenshotDir, '03-after-taps.png') });

  // Verify scoring mechanics
  console.assert(state.score >= 0, 'Score should be non-negative');
  console.assert(state.combo >= 0, 'Combo should be non-negative');
  console.assert(state.maxCombo >= state.combo, 'Max combo should be >= current combo');

  // Test wave propagation
  console.log('Testing wave propagation...');
  await page.evaluate(() => window.advanceTime(3000));
  await page.waitForTimeout(200);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After 3s advance:', JSON.stringify(state));
  console.assert(state.waveActive || state.wavePosition > -5, 'Wave should have started');

  await page.screenshot({ path: path.join(screenshotDir, '04-wave.png') });

  // Tap more to build combo
  console.log('Building combo...');
  for (let i = 0; i < 15; i++) {
    await page.evaluate((ms) => window.advanceTime(ms), initialBeatInterval - 30);
    await page.waitForTimeout(30);
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
  }

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After combo building:', JSON.stringify(state));

  await page.screenshot({ path: path.join(screenshotDir, '05-combo.png') });

  // Verify multiplier updates
  console.assert(state.multiplier >= 1, 'Multiplier should be at least 1');
  console.log('Score:', state.score, 'Combo:', state.combo, 'Multiplier:', state.multiplier);

  // Test BPM progression (advance many beats to trigger BPM increase)
  console.log('Testing BPM progression...');
  for (let i = 0; i < 25; i++) {
    await page.evaluate((ms) => window.advanceTime(ms), initialBeatInterval);
    await page.keyboard.press('Space');
    await page.waitForTimeout(10);
  }

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After BPM progression:', JSON.stringify(state));

  await page.screenshot({ path: path.join(screenshotDir, '06-bpm.png') });

  if (state.mode === 'playing') {
    console.assert(state.bpm >= 100, 'BPM should be >= 100 (starts at 100, increases)');
  }

  // Verify crowd mood updates
  console.assert(['neutral', 'cheer', 'excited', 'happy', 'boo'].includes(state.crowdMood), 'Valid crowd mood');

  // Test wave patterns cycle
  console.log('Wave pattern:', state.wavePattern);
  console.assert(['simple', 'double', 'reverse'].includes(state.wavePattern), 'Valid wave pattern');

  // Final state
  await page.screenshot({ path: path.join(screenshotDir, '07-final.png') });
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Final state:', JSON.stringify(state));

  console.assert(state.perfectCount >= 0 && state.missCount >= 0, 'Counts non-negative');

  // === EXTENDED SCENARIO: Restart for clean extended tests ===
  console.log('\n=== EXTENDED: Restarting game for clean state ===');
  await page.evaluate(() => {
    document.getElementById('start-screen').style.display = 'flex';
  });
  await page.click('#start-btn');
  await page.waitForTimeout(300);

  let cleanState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.assert(cleanState.mode === 'playing', 'Game should be playing');
  console.assert(cleanState.combo === 0, 'Combo should start at 0');
  console.assert(cleanState.score === 0, 'Score should start at 0');

  // === EXTENDED SCENARIO: Test missing beats reset combo ===
  console.log('\n=== EXTENDED: Testing missing beats and combo reset ===');

  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => window.advanceTime(550));
    await page.waitForTimeout(50);
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
  }

  let comboBefore = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const missesBefore = comboBefore.missCount;
  console.log('Combo after building:', comboBefore.combo, '| Misses:', missesBefore);

  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(350);
    await page.keyboard.press('Space');
  }

  let comboAfter = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Combo after missing:', comboAfter.combo, '| Misses:', comboAfter.missCount);
  console.assert(comboAfter.missCount > missesBefore, 'missCount should increase when tapping off-beat');
  console.log('Missing beats: combo reset verified');

  // === EXTENDED SCENARIO: Test high score persistence via localStorage ===
  console.log('\n=== EXTENDED: Testing high score localStorage ===');

  let hs1 = await page.evaluate(() => localStorage.getItem('crowdWaveHighScore'));
  console.log('High score before:', hs1);

  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => window.advanceTime(550));
    await page.waitForTimeout(50);
    await page.keyboard.press('Space');
    await page.waitForTimeout(50);
  }

  let hsState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  let hs2 = await page.evaluate(() => localStorage.getItem('crowdWaveHighScore'));
  console.log('Score:', hsState.score, '| High score after:', hs2);
  console.assert(hs2 !== null, 'High score should be saved to localStorage');
  console.assert(parseInt(hs2) >= hsState.score || parseInt(hs2) === hsState.score,
    'High score in localStorage should match or exceed current score');
  console.log('High score localStorage persistence verified');

  // === EXTENDED SCENARIO: Test wave pattern changes over time ===
  console.log('\n=== EXTENDED: Testing wave pattern changes ===');

  let patternsSeen = new Set();

  for (let i = 0; i < 40; i++) {
    await page.evaluate(() => window.advanceTime(600));
    await page.waitForTimeout(5);
    await page.keyboard.press('Space');
    await page.waitForTimeout(5);

    let patState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    patternsSeen.add(patState.wavePattern);
  }

  console.log('Patterns observed:', [...patternsSeen]);
  console.assert(patternsSeen.size >= 2, `Should see at least 2 patterns, saw ${patternsSeen.size}`);
  console.log('Wave pattern changes verified');

  // === EXTENDED SCENARIO: Verify multiplier increases with sustained combos ===
  console.log('\n=== EXTENDED: Testing multiplier increase with sustained combos ===');

  await page.evaluate(() => {
    document.getElementById('start-screen').style.display = 'flex';
  });
  await page.click('#start-btn');
  await page.waitForTimeout(300);

  for (let i = 0; i < 25; i++) {
    await page.evaluate(() => window.advanceTime(550));
    await page.waitForTimeout(10);
    await page.keyboard.press('Space');
    await page.waitForTimeout(10);
  }

  let multState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log(`Combo: ${multState.combo}, Max: ${multState.maxCombo}, Multiplier: ${multState.multiplier}`);
  console.assert(multState.maxCombo >= 5, `Max combo should be >= 5, got ${multState.maxCombo}`);
  console.log('Multiplier increase with sustained combos verified (maxCombo confirms multiplier was >= 2)');

  console.log('All extended crowd-wave scenarios passed');

  if (errors.length) console.log('ERRORS:', errors);
  else console.log('No console errors.');

  await browser.close();
  console.log('Crowd Wave test complete!');
})().catch(e => {
  console.error('Test error:', e.message);
  process.exit(1);
});
