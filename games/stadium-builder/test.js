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
  console.log('Loading stadium-builder...');
  await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  let state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Initial state:', JSON.stringify(state));
  console.assert(state.theme === 'classic', 'Expected theme=classic');
  console.assert(state.budget.remaining === 1000, 'Expected budget=1000');
  console.assert(state.placedComponents.length === 0, 'Expected no placed components');
  console.assert(state.scores.total === 0, 'Expected total score=0');

  // Screenshot 1: Initial state
  await page.screenshot({ path: path.join(screenshotDir, '01-initial.png') });
  console.log('Screenshot 1: Initial state');

  // Test 1: Select pitch via UI
  console.log('Selecting pitch component...');
  await page.click('.component-btn[data-comp-id="pitch"]');
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.assert(state.selectedComponent === 'pitch', 'Expected selectedComponent=pitch');

  // Place pitch by dispatching click event at grid position via evaluate
  // Use the game's internal click handler with proper isometric coords
  console.log('Placing pitch...');
  await page.evaluate(() => {
    const canvas = document.getElementById('stadium-canvas');
    const rect = canvas.getBoundingClientRect();
    // The game's screenToGrid uses canvas.width/height for scaling
    // We need to compute isometric coords for grid cell (5, 5) - center of grid
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    const cx = canvasW / 2;
    const cy = canvasH / 2 - 40;
    const TILE_W = 64, TILE_H = 32;
    // isoProject: x = (col - row) * (TILE_W / 2) + cx, y = (col + row) * (TILE_H / 2) + cy
    // For col=5, row=5: x = 0 + cx = cx, y = 5*TILE_H + cy
    const isoX = (5 - 5) * (TILE_W / 2) + cx;
    const isoY = (5 + 5) * (TILE_H / 2) + cy;
    // Convert back from canvas coords to client coords
    const scaleX = rect.width / canvasW;
    const scaleY = rect.height / canvasH;
    const clientX = rect.left + isoX * scaleX;
    const clientY = rect.top + isoY * scaleY;
    canvas.dispatchEvent(new MouseEvent('click', { clientX, clientY, bubbles: true }));
  });
  await page.waitForTimeout(300);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After placing pitch:', state.placedComponents.length, 'components, budget:', state.budget.remaining);
  console.assert(state.placedComponents.length === 1, 'Expected 1 placed component');
  console.assert(state.placedComponents[0].id === 'pitch', 'Expected pitch placed');
  console.assert(state.scores.total > 0, 'Expected total score > 0');

  // Screenshot 2: After placing pitch
  await page.screenshot({ path: path.join(screenshotDir, '02-pitch-placed.png') });
  console.log('Screenshot 2: Pitch placed');

  // Test 2: Place north stands ($80)
  console.log('Placing north stands...');
  await page.click('.component-btn[data-comp-id="stands_n"]');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const canvas = document.getElementById('stadium-canvas');
    const rect = canvas.getBoundingClientRect();
    const canvasW = canvas.width, canvasH = canvas.height;
    const cx = canvasW / 2, cy = canvasH / 2 - 40;
    const TILE_W = 64, TILE_H = 32;
    const isoX = (5 - 2) * (TILE_W / 2) + cx;
    const isoY = (5 + 2) * (TILE_H / 2) + cy;
    const scaleX = rect.width / canvasW, scaleY = rect.height / canvasH;
    canvas.dispatchEvent(new MouseEvent('click', {
      clientX: rect.left + isoX * scaleX, clientY: rect.top + isoY * scaleY, bubbles: true
    }));
  });
  await page.waitForTimeout(300);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After stands:', state.placedComponents.length, 'components, budget:', state.budget.remaining);
  console.assert(state.placedComponents.length === 2, 'Expected 2 placed components');
  console.assert(state.budget.remaining === 920, 'Expected budget=920');

  // Test 3: Place floodlights ($60)
  console.log('Placing floodlights...');
  await page.click('.component-btn[data-comp-id="lights"]');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const canvas = document.getElementById('stadium-canvas');
    const rect = canvas.getBoundingClientRect();
    const canvasW = canvas.width, canvasH = canvas.height;
    const cx = canvasW / 2, cy = canvasH / 2 - 40;
    const TILE_W = 64, TILE_H = 32;
    const isoX = (8 - 3) * (TILE_W / 2) + cx;
    const isoY = (8 + 3) * (TILE_H / 2) + cy;
    const scaleX = rect.width / canvasW, scaleY = rect.height / canvasH;
    canvas.dispatchEvent(new MouseEvent('click', {
      clientX: rect.left + isoX * scaleX, clientY: rect.top + isoY * scaleY, bubbles: true
    }));
  });
  await page.waitForTimeout(300);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After lights:', state.placedComponents.length, 'components, budget:', state.budget.remaining);
  console.assert(state.placedComponents.length === 3, 'Expected 3 placed components');
  console.assert(state.budget.remaining === 860, 'Expected budget=860');

  // Screenshot 3: Multiple components
  await page.screenshot({ path: path.join(screenshotDir, '03-multiple-components.png') });
  console.log('Screenshot 3: Multiple components');

  // Test 4: Change theme to modern
  console.log('Changing theme to modern...');
  await page.selectOption('#theme-select', 'modern');
  await page.waitForTimeout(300);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.assert(state.theme === 'modern', 'Expected theme=modern');

  // Screenshot 4: Modern theme
  await page.screenshot({ path: path.join(screenshotDir, '04-modern-theme.png') });
  console.log('Screenshot 4: Modern theme');

  // Test 5: Verify scores
  console.log('Score breakdown:', JSON.stringify(state.scores));
  console.assert(state.scores.aesthetics > 0, 'Expected aesthetics > 0');
  console.assert(state.scores.fan > 0, 'Expected fan > 0');

  // Test 6: AdvanceTime works
  await page.evaluate(() => window.advanceTime(2000));
  console.log('advanceTime successful');

  // Test 7: Place trees ($20)
  console.log('Placing trees...');
  await page.click('.component-btn[data-comp-id="trees"]');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const canvas = document.getElementById('stadium-canvas');
    const rect = canvas.getBoundingClientRect();
    const canvasW = canvas.width, canvasH = canvas.height;
    const cx = canvasW / 2, cy = canvasH / 2 - 40;
    const TILE_W = 64, TILE_H = 32;
    const isoX = (3 - 7) * (TILE_W / 2) + cx;
    const isoY = (3 + 7) * (TILE_H / 2) + cy;
    const scaleX = rect.width / canvasW, scaleY = rect.height / canvasH;
    canvas.dispatchEvent(new MouseEvent('click', {
      clientX: rect.left + isoX * scaleX, clientY: rect.top + isoY * scaleY, bubbles: true
    }));
  });
  await page.waitForTimeout(300);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After trees:', state.placedComponents.length, 'components');
  console.assert(state.placedComponents.length === 4, 'Expected 4 placed components');
  console.assert(state.scores.sustainability > 0, 'Expected sustainability > 0');

  // Test 8: Place solar panels ($70)
  console.log('Placing solar...');
  await page.click('.component-btn[data-comp-id="solar"]');
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const canvas = document.getElementById('stadium-canvas');
    const rect = canvas.getBoundingClientRect();
    const canvasW = canvas.width, canvasH = canvas.height;
    const cx = canvasW / 2, cy = canvasH / 2 - 40;
    const TILE_W = 64, TILE_H = 32;
    const isoX = (10 - 1) * (TILE_W / 2) + cx;
    const isoY = (10 + 1) * (TILE_H / 2) + cy;
    const scaleX = rect.width / canvasW, scaleY = rect.height / canvasH;
    canvas.dispatchEvent(new MouseEvent('click', {
      clientX: rect.left + isoX * scaleX, clientY: rect.top + isoY * scaleY, bubbles: true
    }));
  });
  await page.waitForTimeout(300);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After solar:', state.placedComponents.length, 'components');
  console.assert(state.placedComponents.length === 5, 'Expected 5 placed components');

  // Final screenshot
  await page.screenshot({ path: path.join(screenshotDir, '06-final.png') });
  console.log('Screenshot 6: Final state');

  // Report errors
  if (errors.length) {
    console.log('CONSOLE ERRORS:', errors);
  } else {
    console.log('No console errors.');
  }

  // === EXTENDED SCENARIO: Helper to place components ===
  async function placeOnGrid(compId, col, row) {
    await page.click(`.component-btn[data-comp-id="${compId}"]`);
    await page.waitForTimeout(100);
    await page.evaluate(({ col, row }) => {
      const canvas = document.getElementById('stadium-canvas');
      const rect = canvas.getBoundingClientRect();
      const canvasW = canvas.width, canvasH = canvas.height;
      const cx = canvasW / 2, cy = canvasH / 2 - 40;
      const TILE_W = 64, TILE_H = 32;
      const isoX = (col - row) * (TILE_W / 2) + cx;
      const isoY = (col + row) * (TILE_H / 2) + cy;
      const scaleX = rect.width / canvasW, scaleY = rect.height / canvasH;
      canvas.dispatchEvent(new MouseEvent('click', {
        clientX: rect.left + isoX * scaleX, clientY: rect.top + isoY * scaleY, bubbles: true
      }));
    }, { col, row });
    await page.waitForTimeout(200);
  }

  // === EXTENDED SCENARIO: Test budget exhaustion ===
  console.log('\n=== EXTENDED: Testing budget exhaustion ===');

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const budgetBefore = state.budget.remaining;
  console.log('Budget before exhaustion test:', budgetBefore);

  const occupiedCells = state.placedComponents.map(p => `${p.col},${p.row}`);
  const cellsToUse = [];
  for (let r = 0; r < 10 && cellsToUse.length < 15; r++) {
    for (let c = 0; c < 12 && cellsToUse.length < 15; c++) {
      if (!occupiedCells.includes(`${c},${r}`)) cellsToUse.push({ col: c, row: r });
    }
  }

  let placedCount = 0;
  for (let i = 0; i < cellsToUse.length; i++) {
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (state.budget.remaining < 100) break;
    await placeOnGrid('vip', cellsToUse[i].col, cellsToUse[i].row);
    placedCount++;
  }

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Budget after placing VIPs:', state.budget.remaining, '| Placed:', placedCount);
  console.assert(state.budget.remaining >= 0, 'Budget should not go negative');

  if (state.budget.remaining > 0 && state.budget.remaining < 100 && placedCount < cellsToUse.length) {
    const nextCell = cellsToUse[placedCount];
    await placeOnGrid('vip', nextCell.col, nextCell.row);
    let afterReject = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    console.assert(afterReject.budget.remaining === state.budget.remaining,
      'Budget should not change when placement rejected due to insufficient funds');
    console.log('Budget exhaustion: placement rejected correctly');
  }
  console.log('Budget exhaustion test complete');

  // === EXTENDED SCENARIO: Test placing at occupied grid cell ===
  console.log('\n=== EXTENDED: Testing occupied cell rejection ===');

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const budgetBeforeOcc = state.budget.remaining;
  const countBefore = state.placedComponents.length;

  if (state.placedComponents.length > 0) {
    const occupied = state.placedComponents[0];
    console.log(`Trying to place at occupied cell (col=${occupied.col}, row=${occupied.row})`);

    await placeOnGrid('trees', occupied.col, occupied.row);

    let afterOcc = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    console.assert(afterOcc.placedComponents.length === countBefore,
      'Component count should not change when placing at occupied cell');
    console.assert(afterOcc.budget.remaining === budgetBeforeOcc,
      'Budget should not change when placing at occupied cell');
    console.log('Occupied cell rejection verified');
  }

  // === EXTENDED SCENARIO: Test all 4 themes ===
  console.log('\n=== EXTENDED: Testing all 4 themes ===');

  const themes = ['classic', 'modern', 'futuristic', 'eco'];
  for (const theme of themes) {
    await page.selectOption('#theme-select', theme);
    await page.waitForTimeout(300);
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    console.log(`Theme "${theme}": current=${state.theme}`);
    console.assert(state.theme === theme, `Expected theme=${theme}`);
  }
  console.log('All 4 themes verified');

  // === EXTENDED SCENARIO: Test score breakdown categories ===
  console.log('\n=== EXTENDED: Testing score breakdown ===');

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Score breakdown:', JSON.stringify(state.scores));
  console.assert(typeof state.scores.capacity === 'number', 'capacity should be a number');
  console.assert(typeof state.scores.aesthetics === 'number', 'aesthetics should be a number');
  console.assert(typeof state.scores.fan === 'number', 'fan should be a number');
  console.assert(typeof state.scores.sustainability === 'number', 'sustainability should be a number');
  console.assert(typeof state.scores.total === 'number', 'total should be a number');
  console.assert(state.scores.total === state.scores.capacity + state.scores.aesthetics + state.scores.fan + state.scores.sustainability,
    'Total should equal sum of categories');
  console.assert(state.scores.capacity >= 0 && state.scores.aesthetics >= 0 && state.scores.fan >= 0 && state.scores.sustainability >= 0,
    'All categories should be non-negative');
  console.log('Score breakdown categories verified');

  console.log('All extended stadium-builder scenarios passed');

  await browser.close();
  console.log('Stadium Builder test complete!');
})().catch(e => {
  console.error('Test error:', e.message);
  process.exit(1);
});
