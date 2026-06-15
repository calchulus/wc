import { chromium } from "playwright";

const url = "file:///Users/calvinchu/Desktop/mimo/worldcup-minigames/games/goal-celebration/index.html";
const screenshotDir = "/Users/calvinchu/Desktop/mimo/worldcup-minigames/games/goal-celebration/output";

async function main() {
  const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push(String(e)));

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  // Screenshot 1: Initial state
  await page.screenshot({ path: `${screenshotDir}/test-initial.png`, fullPage: true });
  let state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log("Initial:", JSON.stringify(state));

  // Test: Click each pose button via JS
  await page.evaluate(() => { document.querySelectorAll('.pose-btn')[0].click(); }); // Slide
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log("After slide:", JSON.stringify(state));
  await page.screenshot({ path: `${screenshotDir}/test-slide.png`, fullPage: true });

  await page.evaluate(() => { document.querySelectorAll('.pose-btn')[1].click(); }); // Dance
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log("After dance:", JSON.stringify(state));

  await page.evaluate(() => { document.querySelectorAll('.pose-btn')[2].click(); }); // Flex
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log("After flex:", JSON.stringify(state));

  await page.evaluate(() => { document.querySelectorAll('.pose-btn')[3].click(); }); // Scream
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log("After scream:", JSON.stringify(state));

  // Add effects
  await page.evaluate(() => { document.querySelectorAll('.effect-btn')[0].click(); }); // Confetti
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log("After confetti effect:", JSON.stringify(state));

  await page.screenshot({ path: `${screenshotDir}/test-timeline.png`, fullPage: true });

  // Clear and rebuild
  await page.evaluate(() => { document.getElementById('clear-timeline').click(); });
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log("After clear:", JSON.stringify(state));

  // Build full sequence: dance -> confetti -> flex -> fireworks
  await page.evaluate(() => {
    document.querySelectorAll('.pose-btn')[1].click();
    document.querySelectorAll('.effect-btn')[0].click();
    document.querySelectorAll('.pose-btn')[2].click();
    document.querySelectorAll('.effect-btn')[1].click();
  });
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log("Full sequence:", JSON.stringify(state));

  // Test playback
  await page.evaluate(() => { document.getElementById('play-btn').click(); });
  await page.waitForTimeout(200);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log("Playing:", state.playing);

  await page.evaluate(() => window.advanceTime(5000));
  await page.screenshot({ path: `${screenshotDir}/test-playback.png`, fullPage: true });
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log("After playback:", JSON.stringify(state));

  // Test message
  await page.evaluate(() => {
    document.getElementById('message-input').value = 'GOAL!';
    document.getElementById('message-input').dispatchEvent(new Event('input'));
  });
  await page.evaluate(() => window.advanceTime(1000));
  await page.screenshot({ path: `${screenshotDir}/test-message.png`, fullPage: true });
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log("Message state:", state.message);

  // === EXTENDED SCENARIO: Test all 6 celebration poses ===
  console.log('\n=== EXTENDED: Testing all 6 poses ===');
  await page.evaluate(() => { document.getElementById('clear-timeline').click(); });

  const poseNames = ['slide', 'dance', 'flex', 'scream', 'backflip', 'knee'];
  for (let i = 0; i < poseNames.length; i++) {
    await page.evaluate((idx) => { document.querySelectorAll('.pose-btn')[idx].click(); }, i);
    await page.waitForTimeout(50);
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    console.log(`Pose ${i} (${poseNames[i]}):`, state.selectedPose);
    console.assert(state.selectedPose === poseNames[i], `Expected pose=${poseNames[i]}`);
    if (i >= 3) {
      await page.evaluate(() => { document.getElementById('clear-timeline').click(); });
    }
  }
  console.log('All 6 poses verified');

  // === EXTENDED SCENARIO: Test all 4 effects ===
  console.log('\n=== EXTENDED: Testing all 4 effects ===');
  await page.evaluate(() => { document.getElementById('clear-timeline').click(); });

  const effectNames = ['confetti', 'fireworks', 'smoke', 'rainbow'];
  for (let i = 0; i < effectNames.length; i++) {
    await page.evaluate((idx) => { document.querySelectorAll('.effect-btn')[idx].click(); }, i);
    await page.waitForTimeout(50);
    state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
    console.log(`Effect ${i} (${effectNames[i]}):`, state.selectedEffect);
    console.assert(state.selectedEffect === effectNames[i], `Expected effect=${effectNames[i]}`);
  }
  console.log('All 4 effects verified');

  // === EXTENDED SCENARIO: Test timeline limit (max 4 items) ===
  console.log('\n=== EXTENDED: Testing timeline limit ===');
  await page.evaluate(() => { document.getElementById('clear-timeline').click(); });

  for (let i = 0; i < 4; i++) {
    await page.evaluate((idx) => { document.querySelectorAll('.pose-btn')[idx].click(); }, i);
    await page.waitForTimeout(50);
  }
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Timeline after 4 adds:', state.timeline.length);
  console.assert(state.timeline.length === 4, 'Timeline should have 4 items');

  await page.evaluate(() => { document.querySelectorAll('.pose-btn')[0].click(); });
  await page.waitForTimeout(50);
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  console.log('Timeline after 5th add attempt:', state.timeline.length);
  console.assert(state.timeline.length === 4, 'Timeline should still be 4 (limit enforced)');
  console.log('Timeline limit verified');

  // === EXTENDED SCENARIO: Test score calculation accuracy ===
  console.log('\n=== EXTENDED: Testing score calculation ===');
  await page.evaluate(() => { document.getElementById('clear-timeline').click(); });

  // 2 unique poses + 1 unique effect + message
  await page.evaluate(() => {
    document.querySelectorAll('.pose-btn')[0].click();
    document.querySelectorAll('.pose-btn')[1].click();
    document.querySelectorAll('.effect-btn')[0].click();
  });
  await page.evaluate(() => {
    document.getElementById('message-input').value = 'GOAL!';
    document.getElementById('message-input').dispatchEvent(new Event('input'));
  });
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const expectedCreativity = Math.min(100, 2 * 15 + 1 * 20 + 10);
  const expectedScore = 3 * 25 + expectedCreativity;
  console.log(`Creativity: ${state.creativity} (expected ${expectedCreativity}), Score: ${state.score} (expected ${expectedScore})`);
  console.assert(state.creativity === expectedCreativity, `Creativity should be ${expectedCreativity}`);
  console.assert(state.score === expectedScore, `Score should be ${expectedScore}`);

  // Test without message
  await page.evaluate(() => {
    document.getElementById('clear-timeline').click();
    document.getElementById('message-input').value = '';
    document.getElementById('message-input').dispatchEvent(new Event('input'));
    document.querySelectorAll('.pose-btn')[0].click();
    document.querySelectorAll('.effect-btn')[0].click();
  });
  state = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const expectedCreativity2 = Math.min(100, 1 * 15 + 1 * 20);
  const expectedScore2 = 2 * 25 + expectedCreativity2;
  console.log(`No-msg creativity: ${state.creativity} (expected ${expectedCreativity2}), score: ${state.score} (expected ${expectedScore2})`);
  console.assert(state.creativity === expectedCreativity2, `Creativity should be ${expectedCreativity2}`);
  console.assert(state.score === expectedScore2, `Score should be ${expectedScore2}`);
  console.log('Score calculation verified');

  if (errors.length) console.log("ERRORS:", errors);
  else console.log("No console errors.");

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
