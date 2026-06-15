# 10 New World Cup Mini-Games Plan (v2)

## Audit Result: 7 Replaced, 3 Kept

| # | Game | Verdict | Reason |
|---|------|---------|--------|
| 11 | Stadium Jigsaw | ✅ KEEP | Tile-swap puzzle — no overlap |
| 12 | ~~World Cup Trivia~~ | ❌ REPLACED | Timed-judgment-quiz overlaps Ref/VAR |
| 13 | ~~Transfer Window~~ | ❌ REPLACED | Budget allocation overlaps Stadium Builder |
| 14 | ~~Chant Composer~~ | ❌ REPLACED | Music/rhythm overlaps Crowd Wave |
| 15 | ~~Halftime Show~~ | ❌ REPLACED | Celebration theme overlaps Goal Celebration |
| 16 | Fan Photo Album | ✅ KEEP | Card matching — no overlap |
| 17 | ~~Offside Line~~ | ❌ REPLACED | Offside judgment overlaps Ref/VAR |
| 18 | ~~Substitution Strategy~~ | ❌ REPLACED | Match management overlaps Formation Tactician |
| 19 | Food Truck Rally | ✅ KEEP | Order sequencing — no overlap |
| 20 | ~~Card Battle~~ | ❌ REPLACED | 5-round best-of-5 overlaps Penalty Kick Duel |

---

## 7 New Replacements

### 12. World Cup Maze (`maze`) — event: `match`

**Mechanic:** Navigate a footballer through a top-down maze to reach the goal. Arrow keys/WASD to move. Defenders patrol corridors. Reach the goal without being tackled. 10 mazes, escalating complexity.

**Why it's unique:** Maze navigation + stealth. No other game uses spatial navigation or patrol avoidance.

**State:** `{ mode, maze[][], playerX, playerY, defenders[], goalX, goalY, level, timer, score }`

**Key interactions:**
- Arrow keys / WASD to move through corridors
- Avoid patrolling defender sprites
- Collect stars for bonus points
- Reach goal to complete level

**Scoring:** Time bonus (faster = more points) + stars collected × 10 + levels completed × 50.

---

### 13. Sticker Collector (`stickers`) — event: `ticket`

**Mechanic:** World Cup stickers fall from the top of the screen. Move a collector basket left/right to catch them. Avoid duplicate stickers (they deduct points). Collect a full set of 16 national team stickers to win.

**Why it's unique:** Falling object collection + set completion. No other game uses gravity-based catching or collection sets.

**State:** `{ mode, fallingSticker, basketX, collected[], score, timer, duplicates, setComplete }`

**Key interactions:**
- Arrow keys / touch to move basket
- Catch sticker = add to collection
- Catch duplicate = lose points
- Complete set of 16 = bonus + win

**Scoring:** 10pts per unique sticker, -5pts per duplicate, 200pts bonus for complete set.

---

### 14. Penalty Wall (`penalty-wall`) — event: `match`

**Mechanic:** Tower defense — penalties fly toward your goal. Place defender blocks on a grid to deflect them. Each block has a durability rating. Place wisely — budget is limited. Survive 20 shots.

**Why it's unique:** Tower defense / protection. No other game uses grid-based defensive placement or projectile deflection.

**State:** `{ mode, grid[][], defenders[], incomingBalls[], budget, shotsLeft, score, goalHealth }`

**Key interactions:**
- Click grid cell to place defender
- Deflectors bounce balls away from goal
- Budget limits placements
- Goal health = 3 hits and you lose

**Scoring:** Survive 20 shots = 200pts. +5pts per ball deflected. +10pts for goal health remaining.

---

### 15. Commentary Typing Race (`typing`) — event: `fan`

**Mechanic:** Football commentary text appears on screen. Type it as fast and accurately as possible. WPM and accuracy are tracked. 10 rounds of increasing speed.

**Why it's unique:** Typing speed + accuracy. No other game uses keyboard input or text replication.

**State:** `{ mode, round, text, typed, startTime, wpm, accuracy, score, streak }`

**Key interactions:**
- Read displayed commentary text
- Type on keyboard
- See real-time WPM and accuracy
- Complete 10 rounds

**Scoring:** WPM × accuracy% per round. Streak bonus for 100% accuracy rounds.

---

### 16. Draw the Play (`draw-play`) — event: `tactical`

**Mechanic:** A tactical situation is described (e.g., "2v1 counter-attack"). Draw arrows on a whiteboard to show player movement. AI rates your tactic on creativity, feasibility, and effectiveness.

**Why it's unique:** Freeform drawing + tactical analysis. No other game uses canvas drawing or gesture recognition.

**State:** `{ mode, scenario, drawnPaths[], aiRating, round, score, scenarios[] }`

**Key interactions:**
- Read tactical scenario
- Draw arrows/lines on whiteboard canvas
- Submit drawing for AI rating
- See feedback on your tactic

**Scoring:** AI rates 1-100 based on: arrow clarity (25%), tactical soundness (25%), creativity (25%), feasibility (25%).

---

### 17. Soccer Physics (`soccer-physics`) — event: `bonus`

**Mechanic:** Ragdoll footballers on a physics field. Flick/tap to launch your player into the ball. Use physics bounces to score. 5 shots, each with different field layouts and obstacles.

**Why it's unique:** Physics-based flicking. No other game uses ragdoll physics or projectile physics.

**State:** `{ mode, player, ball, obstacles[], goal, score, round, launched }`

**Key interactions:**
- Click/drag to aim launch direction
- Release to launch player
- Player ragdoll bounces off obstacles
- Ball must end up in goal

**Scoring:** Goal = 20pts + physics bonus (fewer bounces = more points). Miss = 0pts.

---

### 18. Fan Hide & Seek (`hide-seek`) — event: `fan`

**Mechanic:** You're a fan hiding from security in a stadium. Move through a grid while avoiding guard patrol lines of sight. Collect merchandise items. Reach the exit without being spotted. 10 levels.

**Why it's unique:** Stealth / line-of-sight avoidance. No other game uses visibility cones or stealth mechanics.

**State:** `{ mode, playerPos, guards[], grid[][], items[], exitPos, level, spotted, score }`

**Key interactions:**
- Arrow keys to move through stadium
- Avoid guard vision cones (shown as colored triangles)
- Collect merchandise for bonus
- Reach exit to advance

**Scoring:** Items collected × 15 + time bonus + levels completed × 100. Spotted = restart level.

---

## Final 10 New Games — No Overlaps

| # | Game | Mechanic | Theme | Overlaps With |
|---|------|----------|-------|---------------|
| 11 | Stadium Jigsaw | Tile swap puzzle | bonus | NONE |
| 12 | World Cup Maze | Navigation + stealth | match | NONE |
| 13 | Sticker Collector | Falling object collection | ticket | NONE |
| 14 | Penalty Wall | Tower defense / deflection | match | NONE |
| 15 | Commentary Typing Race | Typing speed + accuracy | fan | NONE |
| 16 | Draw the Play | Freeform drawing + AI rating | tactical | NONE |
| 17 | Soccer Physics | Ragdoll physics flicking | bonus | NONE |
| 18 | Fan Hide & Seek | Stealth / line-of-sight | fan | NONE |
| 19 | Fan Photo Album | Card matching pairs | ticket | NONE |
| 20 | Food Truck Rally | Order sequencing speed | fan | NONE |

**New mechanics added:** puzzles, navigation, collection, tower defense, typing, drawing, physics, stealth, matching, speed

**No overlap with existing 10 games.**

---

## Updated Event Type Balance (all 20)

| Event Type | Games | Count |
|------------|-------|-------|
| match | penalty, curl, dive, maze, penalty-wall | 5 |
| fan | hype, chant, nutmeg, typing, foodtruck, hide-seek | 6 |
| ticket | memory, bag, stickers, album | 4 |
| bonus | flags, trivia, jigsaw, soccer-physics | 4 |
| tactical | draw-play | 1 |
| sponsor | — | 1 |

---

## Asset Requirements

- **maze**: 10 maze layouts (JSON grid data)
- **stickers**: 16 national team flag stickers (emoji or small PNGs)
- **penalty-wall**: Defender block sprites, ball sprites
- **typing**: 10 commentary text strings (JSON)
- **draw-play**: Whiteboard canvas, scenario descriptions
- **soccer-physics**: Ragdoll sprites, ball, goal, obstacle layouts
- **hide-seek**: Stadium grid layouts, guard sprites, vision cone rendering
- **album**: 16 stadium photos (can reuse from jigsaw)
- **foodtruck**: Ingredient icons (reuse from existing assets if possible)
