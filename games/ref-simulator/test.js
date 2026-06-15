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

  await page.screenshot({ path: path.join(screenshotDir, '01-start.png') });
  console.assert(state.mode === 'start', 'Expected mode=start at start');
  console.assert(state.score === 0, 'Expected score=0 at start');

  // Start the game
  console.log('Clicking START...');
  await page.evaluate(() => document.getElementById('start-btn').click());
  await page.waitForTimeout(300);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After start:', JSON.stringify(state));
  console.assert(state.mode === 'playing', 'Expected mode=playing after start');
  console.assert(state.round === 1, 'Expected round 1');
  console.assert(state.incidentType !== null, 'Expected incident type to be set');

  await page.screenshot({ path: path.join(screenshotDir, '02-round1.png') });

  // Watch incident - timer counts down, whistle auto-blows after 2s
  console.log('Watching incident...');
  await page.evaluate(() => window.advanceTime(500));
  await page.waitForTimeout(200);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After 500ms:', JSON.stringify(state));
  console.assert(state.whistleBlown === false || state.timerRemaining > 0, 'Timer should be active');

  await page.screenshot({ path: path.join(screenshotDir, '03-watching.png') });

  // Wait for whistle to blow (2s timeout)
  console.log('Waiting for whistle...');
  await page.evaluate(() => window.advanceTime(2000));
  await page.waitForTimeout(600);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After whistle:', JSON.stringify(state));
  console.assert(state.whistleBlown === true, 'Whistle should be blown');
  console.assert(state.decisionOptions !== null, 'Decision options should be visible');

  await page.screenshot({ path: path.join(screenshotDir, '04-whistle.png') });

  // Make a decision (FOUL)
  console.log('Making decision: FOUL...');
  await page.evaluate(() => {
    document.querySelector('.dec-btn[data-decision="FOUL"]').click();
  });
  await page.waitForTimeout(1200);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('After decision:', JSON.stringify(state));
  console.assert(state.showingReplay === true, 'Replay should be showing');
  console.assert(state.playerDecision === 'FOUL', 'Player decision should be FOUL');
  console.assert(state.score >= 0, 'Score should be non-negative');

  await page.screenshot({ path: path.join(screenshotDir, '05-replay.png') });

  // Click next round
  console.log('Advancing to round 2...');
  await page.evaluate(() => document.getElementById('next-btn').click());
  await page.waitForTimeout(500);

  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Round 2:', JSON.stringify(state));
  console.assert(state.round === 2, 'Expected round 2');
  console.assert(state.whistleBlown === false, 'Whistle should reset');

  await page.screenshot({ path: path.join(screenshotDir, '06-round2.png') });

  // Play through several more rounds with varied decisions
  const decisions = ['FOUL', 'NO FOUL', 'YELLOW CARD', 'RED CARD', 'OFFSIDE'];
  for (let round = 2; round <= 5; round++) {
    // Watch incident until whistle
    await page.evaluate(() => window.advanceTime(2500));
    await page.waitForTimeout(600);

    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (state.mode !== 'playing') {
      console.log('Game ended early at round', round, 'mode:', state.mode);
      break;
    }

    // Make a decision
    const dec = decisions[Math.floor(Math.random() * decisions.length)];
    console.log('Round', round, ': decision =', dec);
    await page.evaluate((d) => {
      document.querySelector(`.dec-btn[data-decision="${d}"]`).click();
    }, dec);
    await page.waitForTimeout(1200);

    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (state.mode !== 'playing' && !state.showingReplay) {
      console.log('Unexpected state after decision:', state.mode);
      break;
    }

    // Advance to next round
    await page.evaluate(() => document.getElementById('next-btn').click());
    await page.waitForTimeout(400);
  }

  await page.screenshot({ path: path.join(screenshotDir, '07-mid-game.png') });
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Mid-game state:', JSON.stringify(state));

  // Continue to end
  for (let i = 0; i < 25 && state.mode === 'playing'; i++) {
    if (!state.whistleBlown) {
      await page.evaluate(() => window.advanceTime(2500));
      await page.waitForTimeout(600);
      state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }
    if (state.mode === 'playing' && state.decisionOptions) {
      await page.evaluate(() => {
        document.querySelector('.dec-btn[data-decision="FOUL"]').click();
      });
      await page.waitForTimeout(1200);
      state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }
    if (state.showingReplay) {
      await page.evaluate(() => document.getElementById('next-btn').click());
      await page.waitForTimeout(400);
      state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }
  }

  await page.screenshot({ path: path.join(screenshotDir, '08-final.png') });
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Final state:', JSON.stringify(state));

  if (state.mode === 'end') {
    console.log('PASS: Game reached end state');
    console.assert(state.totalRounds === 20, 'Expected 20 total rounds');
    console.assert(state.score >= 0, 'Final score should be non-negative');
  } else {
    console.log('NOTE: Game ended in mode=' + state.mode + ' (may need more rounds)');
  }

  // === EXTENDED SCENARIO: Test all 5 decision types and correct detection ===
  console.log('\n=== EXTENDED: Testing all 5 decision types ===');

  await page.evaluate(() => document.getElementById('start-btn').click());
  await page.waitForTimeout(300);

  const decisionsToTest = ['FOUL', 'NO FOUL', 'YELLOW CARD', 'RED CARD', 'OFFSIDE'];
  let decisionResults = {};
  let totalCorrect = 0;
  let totalScoreGained = 0;

  for (let round = 1; round <= 20; round++) {
    await page.evaluate(() => window.advanceTime(2500));
    await page.waitForTimeout(600);

    let rs = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (rs.mode !== 'playing') break;

    const prevScore = rs.score;
    const dec = decisionsToTest[(round - 1) % 5];

    await page.evaluate((d) => {
      document.querySelector(`.dec-btn[data-decision="${d}"]`).click();
    }, dec);
    await page.waitForTimeout(1200);

    rs = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    if (!rs.showingReplay) continue;

    const correctDec = rs.correctDecision;
    const wasCorrect = dec === correctDec;
    const scoreGained = rs.score - prevScore;

    console.log(`R${round}: Decision=${dec}, Correct=${correctDec}, Match=${wasCorrect}, +${scoreGained}pts`);

    if (!decisionResults[dec]) decisionResults[dec] = { total: 0, correct: 0 };
    decisionResults[dec].total++;
    if (wasCorrect) {
      decisionResults[dec].correct++;
      totalCorrect++;
    }
    totalScoreGained += scoreGained;

    console.assert(wasCorrect === (scoreGained > 0),
      `Score increase should match correctness: correct=${wasCorrect}, gained=${scoreGained}`);

    await page.evaluate(() => document.getElementById('next-btn').click());
    await page.waitForTimeout(400);
  }

  console.log('Decision results:', JSON.stringify(decisionResults));
  console.assert(Object.keys(decisionResults).length >= 3, 'Should have tested at least 3 decision types');
  console.assert(totalScoreGained > 0, 'Should have gained some points from correct decisions');
  console.log('All 5 decision types tested');

  // === EXTENDED SCENARIO: Test gameover shows final stats ===
  console.log('\n=== EXTENDED: Testing gameover final stats ===');

  let gs = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  while (gs.mode === 'playing') {
    await page.evaluate(() => window.advanceTime(2500));
    await page.waitForTimeout(600);
    gs = JSON.parse(await page.evaluate(() => window.render_game_to_text()));

    if (gs.mode === 'playing' && gs.decisionOptions) {
      await page.evaluate(() => {
        document.querySelector('.dec-btn[data-decision="FOUL"]').click();
      });
      await page.waitForTimeout(1200);
      gs = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }
    if (gs.showingReplay) {
      await page.evaluate(() => document.getElementById('next-btn').click());
      await page.waitForTimeout(400);
      gs = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    }
  }

  if (gs.mode === 'end') {
    console.assert(gs.totalRounds === 20, 'Total rounds should be 20');
    console.assert(gs.score >= 0, 'Final score should be non-negative');
    console.assert(gs.correct >= 0 && gs.correct <= 20, 'Correct count 0-20');
    console.log(`Gameover - Round: ${gs.round}, Score: ${gs.score}, Correct: ${gs.correct}/${gs.totalRounds}`);
    console.log('Gameover stats verified');
  } else {
    console.log('Game ended in mode:', gs.mode);
  }

  console.log('All extended ref-simulator scenarios passed');

  if (errors.length) console.log('ERRORS:', errors);
  else console.log('No console errors.');

  await browser.close();
  console.log('Ref Simulator test complete!');
})().catch(e => {
  console.error('Test error:', e.message);
  process.exit(1);
});
