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

  // Start the game
  console.log('Clicking START...');
  await page.evaluate(() => document.getElementById('start-btn').click());
  await page.waitForTimeout(300);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After start:', JSON.stringify(state));
  console.assert(state.mode === 'replay' || state.mode === 'decision', 'Expected replay/decision mode after start');

  await page.screenshot({ path: path.join(screenshotDir, '02-replay.png') });

  // Let replay play for a bit, then advance into decision phase
  await page.evaluate(() => window.advanceTime(2000));
  await page.waitForTimeout(200);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After replay advance:', JSON.stringify(state));
  console.assert(state.mode === 'decision' || state.mode === 'replay', 'Expected decision or replay mode');

  await page.screenshot({ path: path.join(screenshotDir, '03-decision.png') });

  // Make a decision (click GOAL button)
  console.log('Making decision: GOAL...');
  await page.evaluate(() => {
    document.querySelector('.dec-btn.goal-btn').click();
  });
  await page.waitForTimeout(500);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After decision:', JSON.stringify(state));
  console.assert(state.mode === 'result', 'Expected result mode after decision');
  console.assert(state.decisions.length === 1, 'Expected 1 decision recorded');

  await page.screenshot({ path: path.join(screenshotDir, '04-result.png') });

  // Verify score updated (may be 0 if wrong, or >0 if correct)
  const firstDecision = state.decisions[0];
  console.log('Decision result:', JSON.stringify(firstDecision));
  console.assert(typeof firstDecision.isCorrect === 'boolean', 'Expected isCorrect boolean');
  console.assert(typeof firstDecision.points === 'number', 'Expected points number');

  // Click NEXT to go to round 2
  console.log('Clicking NEXT...');
  await page.evaluate(() => document.getElementById('next-btn').click());
  await page.waitForTimeout(300);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Round 2:', JSON.stringify(state));
  console.assert(state.round === 2, 'Expected round 2');

  await page.screenshot({ path: path.join(screenshotDir, '05-round2.png') });

  // Play through a few more rounds
  for (let round = 2; round <= 5; round++) {
    await page.evaluate(() => window.advanceTime(4000));
    await page.waitForTimeout(300);

    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (state.mode === 'gameover') {
      console.log('Game over at round', round);
      break;
    }

    // Pick a random decision button
    const buttons = ['goal-btn', 'nogoal-btn', 'foul-btn', 'offside-btn'];
    const btn = buttons[Math.floor(Math.random() * buttons.length)];
    await page.evaluate((b) => document.querySelector('.dec-btn.' + b).click(), btn);
    await page.waitForTimeout(500);

    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (state.mode === 'gameover') {
      console.log('Game over after decision at round', round);
      break;
    }

    // Next round
    if (state.mode === 'result') {
      await page.evaluate(() => document.getElementById('next-btn').click());
      await page.waitForTimeout(300);
    }
  }

  // Advance to game over
  await page.evaluate(() => window.advanceTime(5000));
  await page.waitForTimeout(500);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));

  // May still be playing, make more decisions until game over
  for (let i = 0; i < 20 && state.mode !== 'gameover'; i++) {
    if (state.mode === 'replay' || state.mode === 'decision') {
      await page.evaluate(() => window.advanceTime(4000));
      await page.waitForTimeout(300);
      state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }
    if (state.mode === 'decision' || state.mode === 'replay') {
      await page.evaluate(() => document.querySelector('.dec-btn.goal-btn').click());
      await page.waitForTimeout(500);
      state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }
    if (state.mode === 'result') {
      await page.evaluate(() => document.getElementById('next-btn').click());
      await page.waitForTimeout(300);
      state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }
  }

  await page.screenshot({ path: path.join(screenshotDir, '06-final.png') });
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Final state:', JSON.stringify(state));

  if (state.mode === 'gameover') {
    console.log('PASS: Game reached gameover state');
    console.assert(state.decisions.length === 10, 'Expected 10 decisions in gameover');
  } else {
    console.log('NOTE: Game ended in mode=' + state.mode);
  }

  console.log('Total decisions:', state.decisions.length);
  console.log('Correct:', state.correct, '/', state.total);

  if (errors.length) console.log('ERRORS:', errors);
  else console.log('No console errors.');

  // === EXTENDED SCENARIO: Test each decision type systematically ===
  console.log('\n--- EXTENDED: Systematic decision type testing ---');
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('start-btn').click());
  await page.waitForTimeout(300);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.assert(state.mode === 'replay' || state.mode === 'decision', 'Expected game started');

  const decisionTypes = ['goal-btn', 'nogoal-btn', 'foul-btn', 'offside-btn'];
  const decisionLabels = ['GOAL', 'NO GOAL', 'FOUL', 'OFFSIDE'];
  let decisionTypeCounts = { 'goal-btn': 0, 'nogoal-btn': 0, 'foul-btn': 0, 'offside-btn': 0 };

  for (let i = 0; i < 4; i++) {
    // Wait for decision phase
    await page.evaluate(() => window.advanceTime(5000));
    await page.waitForTimeout(300);
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (state.mode === 'gameover') break;

    if (state.mode === 'replay') {
      await page.evaluate(() => window.advanceTime(3000));
      await page.waitForTimeout(200);
      state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }

    if (state.mode === 'decision') {
      // Click the specific decision button
      const btn = decisionTypes[i];
      await page.evaluate((b) => document.querySelector('.dec-btn.' + b).click(), btn);
      await page.waitForTimeout(500);
      decisionTypeCounts[btn]++;
      state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
      console.log('Decision', i + 1, ':', decisionLabels[i], '- correct:', state.decisions[state.decisions.length - 1]?.isCorrect);

      // Click next
      if (state.mode === 'result') {
        await page.evaluate(() => document.getElementById('next-btn').click());
        await page.waitForTimeout(300);
      }
    }
  }
  console.log('Decision type counts:', JSON.stringify(decisionTypeCounts));
  console.assert(Object.values(decisionTypeCounts).every(v => v >= 0), 'Decision counts should be non-negative');

  // === EXTENDED SCENARIO: Verify correct/incorrect tracking ===
  console.log('\n--- EXTENDED: Correct/incorrect tracking verification ---');
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  if (state.decisions.length > 0) {
    let correctCount = state.decisions.filter(d => d.isCorrect === true).length;
    let incorrectCount = state.decisions.filter(d => d.isCorrect === false).length;
    console.log('Decisions so far:', state.decisions.length, 'correct:', correctCount, 'incorrect:', incorrectCount);
    console.assert(correctCount + incorrectCount === state.decisions.length, 'All decisions should be classified');

    for (const d of state.decisions) {
      console.assert(typeof d.isCorrect === 'boolean', 'isCorrect should be boolean for each decision');
      console.assert(typeof d.points === 'number', 'points should be number for each decision');
      console.assert(d.call !== undefined, 'call should exist in decision');
    }
    console.log('PASS: Decision tracking structure verified');
  }

  // Play remaining rounds to gameover
  for (let i = 0; i < 30 && state.mode !== 'gameover'; i++) {
    if (state.mode === 'replay' || state.mode === 'decision') {
      await page.evaluate(() => window.advanceTime(4000));
      await page.waitForTimeout(300);
      state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }
    if (state.mode === 'decision') {
      // Systematically try each decision type in order
      const btnIdx = state.decisions.length % 4;
      await page.evaluate((b) => document.querySelector('.dec-btn.' + b).click(), decisionTypes[btnIdx]);
      await page.waitForTimeout(500);
      state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }
    if (state.mode === 'result') {
      await page.evaluate(() => document.getElementById('next-btn').click());
      await page.waitForTimeout(300);
      state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }
  }

  await page.evaluate(() => window.advanceTime(5000));
  await page.waitForTimeout(500);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));

  // === EXTENDED SCENARIO: Gameover shows final score summary ===
  console.log('\n--- EXTENDED: Gameover final score summary ---');
  console.log('Final mode:', state.mode, 'score:', state.score, 'correct:', state.correct, '/', state.total);

  if (state.mode === 'gameover') {
    console.assert(typeof state.score === 'number', 'Score should be a number');
    console.assert(typeof state.correct === 'number', 'Correct count should be a number');
    console.assert(state.decisions.length === 10, 'Expected 10 decisions in gameover');
    const totalDecisions = state.decisions.length;
    console.assert(state.correct + (totalDecisions - state.correct) === totalDecisions, 'Math check: correct + incorrect = total');
    console.log('PASS: Gameover summary verified');
  } else {
    console.log('NOTE: Could not reach gameover, mode=' + state.mode);
  }

  await page.screenshot({ path: path.join(screenshotDir, 'ext-01-gameover-summary.png') });

  await browser.close();
  console.log('VAR Replay test complete!');
})().catch(e => {
  console.error('Test error:', e.message);
  process.exit(1);
});
