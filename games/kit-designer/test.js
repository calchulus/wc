const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const screenshotDir = path.resolve(__dirname, 'screenshots');
  const fs = require('fs');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  const testUrl = 'file://' + path.resolve(__dirname, 'index.html');
  console.log('Loading kit-designer...');
  await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  let state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Initial state:', JSON.stringify(state));
  console.assert(state.mode === 'design', 'Expected mode=design');
  console.assert(state.design.pattern === 'solid', 'Expected pattern=solid');
  console.assert(state.design.team === 'custom', 'Expected team=custom');

  // Screenshot 1: Initial state
  await page.screenshot({ path: path.join(screenshotDir, '01-initial.png') });
  console.log('Screenshot 1: Initial state');

  // Test 1: Select a team preset
  console.log('Selecting Brazil team preset...');
  await page.selectOption('#team-select', 'brazil');
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After Brazil:', JSON.stringify(state));
  console.assert(state.design.team === 'brazil', 'Expected team=brazil');

  // Test 2: Change main color
  console.log('Changing main color to #00FF00...');
  await page.evaluate(() => {
    const input = document.getElementById('main-color');
    input.value = '#00FF00';
    input.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After color change:', JSON.stringify(state));
  console.assert(state.design.mainColor.toLowerCase() === '#00ff00', 'Expected mainColor=#00ff00');
  console.assert(state.design.team === 'custom', 'Expected team reset to custom');

  // Test 3: Change pattern to stripes
  console.log('Changing pattern to stripes...');
  await page.click('.pattern-btn[data-pattern="stripes"]');
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After stripes:', JSON.stringify(state));
  console.assert(state.design.pattern === 'stripes', 'Expected pattern=stripes');

  // Screenshot 2: After color and pattern changes
  await page.screenshot({ path: path.join(screenshotDir, '02-colors-patterns.png') });
  console.log('Screenshot 2: Colors and patterns');

  // Test 4: Change player number and name
  console.log('Setting player number to 7 and name to RONALDO...');
  await page.fill('#player-number', '7');
  await page.evaluate(() => {
    document.getElementById('player-number').dispatchEvent(new Event('input'));
  });
  await page.fill('#player-name', 'RONALDO');
  await page.evaluate(() => {
    document.getElementById('player-name').dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After player info:', JSON.stringify(state));
  console.assert(state.design.playerNumber === 7, 'Expected playerNumber=7');
  console.assert(state.design.playerName === 'RONALDO', 'Expected playerName=RONALDO');

  // Test 5: Change logo position
  console.log('Changing logo position to back...');
  await page.click('.logo-btn[data-logo="back"]');
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After logo change:', JSON.stringify(state));
  console.assert(state.design.logoPosition === 'back', 'Expected logoPosition=back');

  // Test 6: Export design (click export button)
  console.log('Exporting design...');
  await page.click('#export-btn');
  await page.waitForTimeout(500);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After export:', JSON.stringify(state));
  console.assert(state.design.savedCount === 1, 'Expected savedCount=1 after export');

  // Screenshot 3: After export with gallery
  await page.screenshot({ path: path.join(screenshotDir, '03-exported.png') });
  console.log('Screenshot 3: Exported design');

  // Test 7: Verify canvas was rendered (check if canvas has content)
  const canvasEmpty = await page.evaluate(() => {
    const canvas = document.getElementById('jersey-canvas');
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) return false;
    }
    return true;
  });
  console.assert(!canvasEmpty, 'Canvas should have rendered content');
  console.log('Canvas has content:', !canvasEmpty);

  // Screenshot 4: Exported state
  await page.screenshot({ path: path.join(screenshotDir, '04-exported-state.png') });
  console.log('Screenshot 4: Exported state');

  // Test 9: Export a second design
  await page.click('.pattern-btn[data-pattern="diamond"]');
  await page.fill('#player-name', 'NEYMAR');
  await page.evaluate(() => document.getElementById('player-name').dispatchEvent(new Event('input')));
  await page.click('#export-btn');
  await page.waitForTimeout(500);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After second export:', JSON.stringify(state));
  console.assert(state.design.savedCount === 2, 'Expected savedCount=2');

  // Screenshot 5: Final state
  await page.screenshot({ path: path.join(screenshotDir, '05-final.png') });
  console.log('Screenshot 5: Final state');

  // Report errors
  if (errors.length) {
    console.log('CONSOLE ERRORS:', errors);
  } else {
    console.log('No console errors.');
  }

  // === EXTENDED SCENARIO: Test all 5 patterns ===
  console.log('\n--- EXTENDED: Testing all 5 patterns ---');
  const patterns = ['solid', 'stripes', 'hoops', 'diamond', 'gradient'];
  for (const pat of patterns) {
    await page.click(`.pattern-btn[data-pattern="${pat}"]`);
    await page.waitForTimeout(200);
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    console.assert(state.design.pattern === pat, `Expected pattern=${pat}`);
    console.log('Pattern set:', pat, '- verified:', state.design.pattern === pat);
  }
  console.log('PASS: All 5 patterns verified');

  // === EXTENDED SCENARIO: Test all logo positions ===
  console.log('\n--- EXTENDED: Testing logo positions ---');
  const logoPositions = ['chest', 'back'];
  for (const pos of logoPositions) {
    await page.click(`.logo-btn[data-logo="${pos}"]`);
    await page.waitForTimeout(200);
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    console.assert(state.design.logoPosition === pos, `Expected logoPosition=${pos}`);
    console.log('Logo position:', pos, '- verified:', state.design.logoPosition === pos);
  }
  console.log('PASS: All logo positions verified');

  // === EXTENDED SCENARIO: Boundary values for player number (0 and 99) ===
  console.log('\n--- EXTENDED: Player number boundary values ---');
  // Test number 0
  await page.fill('#player-number', '0');
  await page.evaluate(() => document.getElementById('player-number').dispatchEvent(new Event('input')));
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Player number 0:', state.design.playerNumber);
  console.assert(state.design.playerNumber === 0, 'Expected playerNumber=0');
  await page.screenshot({ path: path.join(screenshotDir, 'ext-01-number-zero.png') });

  // Test number 99
  await page.fill('#player-number', '99');
  await page.evaluate(() => document.getElementById('player-number').dispatchEvent(new Event('input')));
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Player number 99:', state.design.playerNumber);
  console.assert(state.design.playerNumber === 99, 'Expected playerNumber=99');
  await page.screenshot({ path: path.join(screenshotDir, 'ext-02-number-99.png') });

  console.log('PASS: Boundary player numbers verified');

  // === EXTENDED SCENARIO: Test setting empty player name ===
  console.log('\n--- EXTENDED: Empty player name ---');
  await page.fill('#player-name', '');
  await page.evaluate(() => document.getElementById('player-name').dispatchEvent(new Event('input')));
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Empty player name:', JSON.stringify(state.design.playerName));
  console.assert(state.design.playerName === '', 'Expected empty playerName');
  await page.screenshot({ path: path.join(screenshotDir, 'ext-03-empty-name.png') });
  console.log('PASS: Empty player name verified');

  await browser.close();
  console.log('Kit Designer test complete!');
})().catch(e => {
  console.error('Test error:', e.message);
  process.exit(1);
});
