# World Cup Minigames — Complete State Machine Analysis (Games 11–20)

---

## 11. JIGSAW

### State Diagram
```
                 ┌──────────┐
                 │  title   │
                 └────┬─────┘
                      │ startBtn click
                      ▼
               ┌──────────────┐
          ┌────│   playing    │────┐
          │    └──────────────┘    │
          │ solved                 │ timer <= 0
          ▼                        ▼
    ┌───────────┐          ┌───────────┐
    │ gameover  │          │ gameover  │
    │  (win)    │          │  (lose)   │
    └─────┬─────┘          └─────┬─────┘
          │ startBtn click       │ startBtn click
          └──────────┬───────────┘
                     ▼
               ┌──────────┐
               │  title   │  (immediately replaced by playing via startGame)
               └──────────┘
```

### All States
| Variable | Values |
|----------|--------|
| `state.mode` | `'title'`, `'playing'`, `'gameover'` |
| `state.solved` | `true`, `false` |

### All Transitions
| Source | Target | Trigger | Guard |
|--------|--------|---------|-------|
| title | playing | `startBtn` click | — |
| playing | gameover (win) | `isSolved()` returns true after a swap | `solved = true` |
| playing | gameover (lose) | `state.timer <= 0` in game loop or `advanceTime` | — |
| gameover | playing | `startBtn` click (recreated in endGame) | — |

### Edge Cases
1. **Rapid tile clicks**: Clicking tiles rapidly — each click is a separate event handler call. Selecting and deselecting in quick succession is safe (state.selected toggles).
2. **Double-click same tile**: Clicking the same selected tile deselects it (`state.selected = -1`).
3. **Click during gameover**: Canvas click handler checks `state.mode !== 'playing'` — safe.
4. **Timer race**: Both `advanceTime()` and the game loop decrement timer. Could cause double-decrement if called simultaneously.
5. **Click invalid grid position**: `idx < 0 || idx >= tiles.length` check prevents out-of-bounds.
6. **Shuffle already-solved**: `shuffleTiles` ensures the result is not already solved.
7. **Score never negative**: `Math.max(0, ...)` in `calcScore()`.

### Test Scenarios

1. **Start game**: Click startBtn → overlay hidden, mode='playing', 16 tiles shuffled
2. **Select a tile**: Click any tile → tile gets yellow border (selected)
3. **Deselect same tile**: Click selected tile again → selection cleared
4. **Swap two tiles**: Click tile A, click tile B → tiles swap positions, swapCount++
5. **Solve puzzle**: Arrange all tiles correctly → gameover with 'PUZZLE SOLVED!'
6. **Timer expiry**: Advance time to 0 → gameover with 'TIME\'S UP!'
7. **Score calculation**: Verify score = 100 - (swapCount * 2) - timeElapsed
8. **Rapid clicks**: Click 5 tiles in <100ms → only last complete pair swaps
9. **Click outside grid**: Click outside canvas bounds → no state change
10. **Click during gameover**: Click canvas while gameover → no effect
11. **Play again**: Click PLAY AGAIN/TRY AGAIN button → new shuffled game starts
12. **Score minimum 0**: Make many swaps → score floors at 0
13. **Single swap solve**: If tiles only need 1 swap, solve immediately after that swap
14. **advanceTime while not playing**: Call advanceTime in title mode → no effect
15. **render_game_to_text**: Verify JSON output has all expected fields

---

## 12. MAZE

### State Diagram
```
                 ┌──────────┐
                 │  title   │
                 └────┬─────┘
                      │ startBtn click (startGame)
                      ▼
               ┌──────────────┐
          ┌────│   playing    │────┐
          │    └──────────────┘    │
          │ caught                 │ goal reached
          │ by defender            │
          ▼                        ▼
    ┌───────────┐          ┌───────────┐
    │ gameover  │          │ gameover  │
    │  (lose)   │          │  (win)    │
    └─────┬─────┘          └─────┬─────┘
          │                      │
          │     ┌────────────────┤
          │     │ if won & level<4: next level
          │     │ else: restart
          ▼     ▼
    ┌──────────────┐
    │   playing    │ (via startLevel)
    └──────────────┘
```

### All States
| Variable | Values |
|----------|--------|
| `state.mode` | `'title'`, `'playing'`, `'gameover'` |
| `state.level` | `0–4` (5 levels) |

### All Transitions
| Source | Target | Trigger | Guard |
|--------|--------|---------|-------|
| title | playing | startBtn click → `startGame()` → `startLevel()` | — |
| playing | gameover (lose) | `checkCollisions()` returns `'caught'` | defender overlap |
| playing | gameover (win) | `checkCollisions()` returns `'goal'` | player at goalX/Y |
| gameover | playing (next level) | startBtn click | `won && level < 4` |
| gameover | playing (restart) | startBtn click | `!won` or `level >= 4` |

### Edge Cases
1. **Movement into walls**: `movePlayer` checks `maze[ny][nx] === 0` — wall movement rejected silently.
2. **Boundary movement**: Grid bounds checked before wall check.
3. **Rapid key presses**: Each keydown is processed independently; rapid movement is frame-limited.
4. **Defender collision on movement**: `checkCollisions` called after each move — immediate detection.
5. **Defender collision during timer**: `advanceTime` and game loop both call `checkCollisions`.
6. **Star collection**: `state.score += 10` per star, collected flag prevents double-count.
7. **Goal adjacent cells forced open**: Lines 96-97 ensure path to goal.

### Test Scenarios

1. **Start game**: Click startBtn → mode='playing', maze generated, player at (1,1)
2. **Move player**: Press ArrowRight → playerX increments if cell is open
3. **Move into wall**: Press key toward wall → no position change
4. **Collect star**: Move to star position → score += 10, star.collected = true
5. **Reach goal**: Move to goal position → gameover WIN, 'GOAL! LEVEL COMPLETE!'
6. **Caught by defender**: Move into defender path → gameover LOSE, 'CAUGHT!'
7. **Level progression**: Win level 0 → startBtn shows 'NEXT LEVEL', level=1
8. **Complete all 5 levels**: Win level 4 → startBtn shows 'PLAY AGAIN'
9. **Restart after losing**: Lose any level → startBtn shows 'PLAY AGAIN', level=0
10. **WASD movement**: Press 'w' → moves up, 'a' → left, etc.
11. **Timer increments**: Advance time → timer increases (lower is better for bonus)
12. **Time bonus**: Fast completion → timeBonus = max(0, 100 - floor(timer))
13. **Level bonus**: Higher level → levelBonus = (level+1) * 50
14. **Defender movement**: Advance time → defenders oscillate along their range
15. **render_game_to_text**: Verify maze, player, defenders, stars all in output

---

## 13. STICKER COLLECTOR

### State Diagram
```
                 ┌──────────┐
                 │  title   │
                 └────┬─────┘
                      │ startBtn click
                      ▼
               ┌──────────────┐     collected.length >= 16
               │   playing    │─────────────────────────────┐
               │              │◄────────────────────────────┘
               │              │  (sticker caught/missed → spawn new)
               └──────┬───────┘
                      │ setComplete = true (all 16 collected)
                      ▼
               ┌───────────┐
               │ gameover  │ (win: SET COMPLETE!)
               └─────┬─────┘
                     │ startBtn click
                     ▼
               ┌──────────┐
               │  playing  │
               └──────────┘
```

**NOTE**: No timer-based game over — game only ends when all 16 flags collected.

### All States
| Variable | Values |
|----------|--------|
| `state.mode` | `'title'`, `'playing'`, `'gameover'` |
| `state.setComplete` | `true`, `false` |

### All Transitions
| Source | Target | Trigger | Guard |
|--------|--------|---------|-------|
| title | playing | startBtn click | — |
| playing | gameover (win) | `collected.length >= FLAGS.length` after catch | `setComplete = true` |
| gameover | playing | startBtn click | — |

**Internal playing-loop transitions:**
- Sticker caught (basket overlap): score += 10 (new) or score -= 5 (duplicate), spawn new after 500ms
- Sticker missed (fell off screen): spawn new after 800ms
- spawnTimer > 2: force spawn new sticker

### Edge Cases
1. **No timer expiry**: Game runs indefinitely until all 16 collected — no timeout.
2. **Duplicate catch**: Already-collected flag → score -= 5, duplicates++.
3. **Speed escalation**: `speed = SPEED_INITIAL + floor(timer/5) * SPEED_INCREMENT`.
4. **Basket boundary clamping**: basketX clamped to [BASKET_W/2, canvas.width - BASKET_W/2].
5. **Mouse + keyboard**: Both mousemove and keydown move basket — could conflict.
6. **Touch events**: touchmove also moves basket — prevents default.
7. **Spawn timer override**: If spawnTimer > 2, forces new spawn even if current sticker exists.

### Test Scenarios

1. **Start game**: Click startBtn → mode='playing', first sticker spawns
2. **Catch sticker**: Move basket under falling sticker → score += 10, collected++
3. **Miss sticker**: Let sticker fall past screen → sticker disappears, new spawns after 800ms
4. **Catch duplicate**: Catch same flag twice → score -= 5, duplicates++
5. **Complete set**: Collect all 16 flags → gameover WIN, 'SET COMPLETE!', +200 bonus
6. **Keyboard movement**: Press ArrowLeft/ArrowRight → basket moves 30px
7. **Mouse movement**: Move mouse over canvas → basket follows cursor
8. **Boundary clamping**: Move basket to edge → stops at canvas boundary
9. **Speed increase**: Advance time by 30s → speed increases
10. **Spawn timer**: Wait >2s without catching → new sticker force-spawns
11. **Immediate spawn after catch**: Catch sticker → new spawns after 500ms delay
12. **render_game_to_text**: Verify collected array, speed, score in JSON output
13. **Touch control**: touchmove moves basket on mobile
14. **Rapid mouse moves**: Fast mouse movement → basket tracks smoothly

---

## 14. PENALTY WALL

### State Diagram
```
                 ┌──────────┐
                 │  start   │
                 └────┬─────┘
                      │ startBtn click
                      ▼
               ┌──────────────┐     goalHealth <= 0
               │   playing    │─────────────────────┐
               │              │◄─────────────────────┘
               │              │  (placeDefender on click)
               └──────┬───────┘
                      │ 20 balls survived
                      ▼
               ┌───────────┐
               │ gameover  │ (win: VICTORY!)
               └─────┬─────┘
                     │ replayBtn click
                     ▼
               ┌──────────┐
               │  playing  │
               └──────────┘
```

### All States
| Variable | Values |
|----------|--------|
| `state.mode` | `'start'`, `'playing'`, `'gameover'` |
| `state.grid[r][c]` | `0` (empty), `1` (defender) |

### All Transitions
| Source | Target | Trigger | Guard |
|--------|--------|---------|-------|
| start | playing | startBtn click | — |
| playing | gameover (lose) | `goalHealth <= 0` when ball reaches goal | — |
| playing | gameover (win) | `totalBallsSpawned >= 20 && incomingBalls.length === 0` | all balls survived |
| gameover | playing | replayBtn click | — |

**Internal playing-loop:**
- Ball timer expires → `spawnBall()` (up to 20 balls)
- Click on grid cell → `placeDefender()` if budget >= 10 and cell empty
- Ball hits defender → defender destroyed, score += 5, ball bounces
- Ball reaches goal area → goalHealth--, ball deactivated

### Edge Cases
1. **Insufficient budget**: Click with budget < $10 → no defender placed, silently ignored.
2. **Occupied cell click**: Click cell with existing defender → ignored.
3. **Click in goal area**: `my >= H - 80` check prevents placing in goal zone.
4. **Ball-defender collision**: Defender removed from grid AND defenders array.
5. **20 ball limit**: `totalBallsSpawned >= 20` stops spawning.
6. **Ball interval acceleration**: `ballInterval = max(40, 120 - totalBallsSpawned * 4)`.
7. **Rapid grid clicks**: Each click independently checks budget — could place multiple defenders quickly.
8. **Win timing**: All 20 balls spawned + all deactivated = win.
9. **Score on ball-deflected**: +5 per deflection.
10. **No timer-based end**: Game runs until health=0 or all balls survived.

### Test Scenarios

1. **Start game**: Click startBtn → mode='playing', budget=80, health=3
2. **Place defender**: Click empty grid cell → defender appears, budget -= 10
3. **Insufficient budget**: Click with budget < 10 → no defender placed
4. **Occupied cell**: Click cell with defender → no change
5. **Ball spawned**: Wait for timer → ball appears at top, moves downward
6. **Ball deflected**: Ball hits defender → defender destroyed, score += 5, ball bounces up
7. **Ball reaches goal**: Ball enters goal area → health--
8. **Game over (lose)**: Health reaches 0 → gameover 'GAME OVER'
9. **Win condition**: Survive all 20 balls → gameover 'VICTORY!'
10. **Budget exhaustion**: Place 8 defenders → budget=0, can't place more
11. **Ball wall bounce**: Ball hits side walls → bounces back
12. **Particle effects**: Ball hits defender → particles created
13. **advanceTime**: Call advanceTime with ms → multiple game ticks simulated
14. **Click outside grid**: Click below play area → ignored
15. **render_game_to_text**: Verify grid, defenders, balls, budget in output

---

## 15. TYPING RACE

### State Diagram
```
                 ┌──────────┐
                 │  start   │
                 └────┬─────┘
                      │ startBtn click
                      ▼
               ┌──────────────┐
               │   playing    │
               │  (type text) │
               └──────┬───────┘
                      │ typed.length === text.length
                      ▼
               ┌───────────┐
               │  result   │ ← 1500ms timer
               └─────┬─────┘
                     │
          ┌──────────┤
          │          │
          ▼          ▼
    ┌──────────┐  ┌───────────┐
    │ playing  │  │ gameover  │
    │(next rnd)│  │ (10 done) │
    └──────────┘  └─────┬─────┘
                        │ replayBtn click
                        ▼
                  ┌──────────┐
                  │ playing  │
                  └──────────┘
```

### All States
| Variable | Values |
|----------|--------|
| `state.mode` | `'start'`, `'playing'`, `'result'`, `'gameover'` |
| `state.round` | `0–9` (10 rounds) |

### All Transitions
| Source | Target | Trigger | Guard |
|--------|--------|---------|-------|
| start | playing | startBtn click → `startGame()` → `startRound()` | — |
| playing | result | `typed.length === text.length` → `finishRound()` | — |
| result | playing | setTimeout 1500ms | `round < 10` |
| result | gameover | setTimeout 1500ms → `endGame()` | `round >= 10` |
| gameover | playing | replayBtn click | — |

### Edge Cases
1. **Backspace**: Removes last character, recalculates accuracy.
2. **Typing during result mode**: `handleKey` checks `mode !== 'playing'` — ignored.
3. **No time limit per round**: Player can take as long as they want.
4. **Rapid keystrokes**: Each keydown processed individually.
5. **Ctrl/Meta keys**: `e.ctrlKey || e.metaKey` check prevents shortcut interference.
6. **Streak bonus**: 100% accuracy → streak++, +streak*5 bonus. Wrong char → streak=0.
7. **WPM calculation**: `words = typed.length / 5; wpm = words / (elapsedMin)`.
8. **Accuracy = 100% initially**: `typed.length === 0` returns 100.
9. **ROUND_TEXTS overflow**: Round > 9 uses last text (`ROUND_TEXTS[ROUND_TEXTS.length - 1]`).
10. **StartTime reset per round**: `startRound` sets `startTime = 0`, first keystroke starts timer.

### Test Scenarios

1. **Start game**: Click startBtn → mode='playing', round=1, first text shown
2. **Type correct text**: Type all chars of "GOAL!" → result mode, score computed
3. **Type with errors**: Type wrong chars → accuracy < 100%, streak resets
4. **Backspace correction**: Type char, backspace, type correct → accuracy improves
5. **Perfect round**: 100% accuracy → streak++, bonus = streak*5
6. **Round progression**: Complete round 1 → result → after 1500ms → round 2
7. **Game completion**: Complete round 10 → gameover 'RACE COMPLETE!'
8. **Key during result**: Press keys during 1500ms result pause → ignored
9. **Typing starts timer**: First keystroke → startTime set, elapsed begins counting
10. **WPM display**: Type quickly → WPM updates in real-time
11. **Score formula**: Verify score = sum of round scores (wpm * accuracy/100 + streak bonus)
12. **Score never negative**: Verify minimum score behavior
13. **Play again**: Click RACE AGAIN → game resets, new round 1
14. **advanceTime**: Calling advanceTime updates elapsed display
15. **render_game_to_text**: Verify round, text, typed, score, streak in output

---

## 16. DRAW & PLAY

### State Diagram
```
                 ┌──────────┐
                 │  start   │
                 └────┬─────┘
                      │ startBtn click
                      ▼
               ┌──────────────┐
               │   playing    │◄────────────────┐
               │  (draw paths)│                  │
               └──────┬───────┘                  │
                      │ submitBtn click          │
                      ▼                          │
               ┌───────────┐   setTimeout 2s    │
               │  result   │────────────────────┘
               └─────┬─────┘   (round < 5)
                     │
                     │ round >= 5
                     ▼
               ┌───────────┐
               │ gameover  │
               └─────┬─────┘
                     │ replayBtn click
                     ▼
               ┌──────────┐
               │ playing  │
               └──────────┘
```

### All States
| Variable | Values |
|----------|--------|
| `state.mode` | `'start'`, `'playing'`, `'result'`, `'gameover'` |
| `state.round` | `0–4` (5 rounds) |
| `state.isDrawing` | `true`, `false` |

### All Transitions
| Source | Target | Trigger | Guard |
|--------|--------|---------|-------|
| start | playing | startBtn click → `startGame()` → `loadScenario()` | — |
| playing | result | submitBtn click → AI rating computed | — |
| result | playing | setTimeout 2000ms → `loadScenario()` | `round < 5` |
| result | gameover | setTimeout 2000ms → `endGame()` | `round >= 5` |
| gameover | playing | replayBtn click | — |

**Internal drawing transitions:**
- mousedown → isDrawing=true, currentPath starts
- mousemove → currentPath accumulates points
- mouseup → isDrawing=false, currentPath → drawnPaths
- mouseleave → same as mouseup (saves path)

### Edge Cases
1. **No paths drawn + submit**: Submit with 0 paths → rating based on random (pathCount=0).
2. **Single-point path**: `currentPath.length > 1` check — single click doesn't create path.
3. **Clear button**: Resets drawnPaths, currentPath, rating — only works during playing.
4. **Drawing during result**: mousedown checks `mode !== 'playing'` — prevented.
5. **Rapid submit clicks**: Each click during result is blocked by mode check.
6. **Submit with existing rating**: Previous rating overwritten.
7. **Touch support**: touchstart/touchmove/touchend parallel mouse events.
8. **5 scenarios**: Round 4 is the last; round >= 5 triggers gameover.

### Test Scenarios

1. **Start game**: Click startBtn → mode='playing', round=1, scenario shown
2. **Draw a path**: Mousedown + drag + mouseup → path appears in drawnPaths
3. **Clear paths**: Click clearBtn → drawnPaths empty, rating cleared
4. **Submit drawing**: Click submitBtn → AI rating shown, mode='result'
5. **Round transition**: After submit, 2000ms → round 2, new scenario loaded
6. **No draw + submit**: Click submit without drawing → rating based on 0 paths
7. **Multiple paths**: Draw 3 separate paths → all stored in drawnPaths
8. **Mouse leave mid-draw**: Drag outside canvas → path saved, drawing stops
9. **Complete 5 rounds**: Submit round 5 → gameover 'TACTICAL GENIUS!'
10. **Play again**: Click DRAW AGAIN → new game starts
11. **Submit during result**: Click submit during result phase → no effect
12. **Drawing colors**: Each path gets different color (cycles through 5 colors)
13. **Touch drawing**: Touch start/move/end → path created
14. **advanceTime**: No-op (just renders)
15. **render_game_to_text**: Verify paths, scenario, score in output

---

## 17. SOCCER PHYSICS

### State Diagram
```
                 ┌──────────┐
                 │  start   │
                 └────┬─────┘
                      │ startBtn click
                      ▼
               ┌──────────────┐
               │   playing    │
               │  (aim+launch)│
               └──┬───────┬───┘
                  │       │
         goal     │       │ settleTimer>60
         reached  │       │ or out of bounds
                  ▼       ▼
               ┌───────────┐
               │  result   │ ← resultTimer (90 frames)
               └─────┬─────┘
                     │
          ┌──────────┤
          │          │
          ▼          ▼
    ┌──────────┐  ┌───────────┐
    │ playing  │  │ gameover  │
    │(next rnd)│  │ (5 rounds)│
    └──────────┘  └─────┬─────┘
                        │ replayBtn click
                        ▼
                  ┌──────────┐
                  │ playing  │
                  └──────────┘
```

### All States
| Variable | Values |
|----------|--------|
| `state.mode` | `'start'`, `'playing'`, `'result'`, `'gameover'` |
| `state.launched` | `true`, `false` |
| `state.round` | `1–5` |
| `state.dragging` | `true`, `false` |

### All Transitions
| Source | Target | Trigger | Guard |
|--------|--------|---------|-------|
| start | playing | startBtn click → `startGame()` → `resetRound()` | — |
| playing | result (scored) | player enters goal area (`y < goal.y + height && x in goal`) | launched=true |
| playing | result (missed) | settleTimer > 60 (speed < 0.5 for 60 frames) | launched=true |
| playing | result (missed) | player out of bounds (y > H+50, x < -50, x > W+50) | launched=true |
| result | playing | resultTimer <= 0 → `nextRoundOrEnd()` | `round < 5` |
| result | gameover | resultTimer <= 0 → `nextRoundOrEnd()` | `round >= 5` |
| gameover | playing | replayBtn click | — |

**Internal playing transitions:**
- mousedown → dragging=true, dragStart set
- mousemove → dragEnd updated
- mouseup → if power >= 1: launched=true, apply velocity; else: ignore

### Edge Cases
1. **Insufficient drag power**: `power < 1` on mouseup → launch cancelled, no state change.
2. **Drag during result**: mousedown checks `mode !== 'playing' || launched` — prevented.
3. **Launch during result**: Can't launch — `launched` blocks physics and mousedown blocked.
4. **Bounce counting**: Every wall/obstacle bounce increments bounceCount → reduces score.
5. **Obstacle collision**: Circle-rect collision with restitution bounce.
6. **Settling detection**: Speed < 0.5 for 60 frames → missed.
7. **Trail recording**: Position trail drawn behind player, max 50 points.
8. **Round progression**: 5 rounds total, obstacles increase with round number.
9. **Score formula**: `20 + max(0, 10 - bounceCount * 2)` per goal.
10. **dt clamping**: `Math.min(dt, 3)` prevents physics explosion.

### Test Scenarios

1. **Start game**: Click startBtn → mode='playing', round=1, player at (300,340)
2. **Drag to aim**: Mousedown + drag → drag line shown, power displayed
3. **Release to launch**: Mouseup with power >= 1 → player launches with velocity
4. **Score a goal**: Aim into goal area → 'GOAL! +pts', mode='result'
5. **Miss (settle)**: Low power shot that stops → settleTimer counts, 'MISS!'
6. **Miss (out of bounds)**: High power → flies off screen → 'MISS!'
7. **Bounce off obstacle**: Player hits obstacle → bounces, bounceCount++
8. **Bounce off walls**: Player hits wall → bounces back
9. **Round transition**: After result (90 frames) → next round, new obstacles
10. **Game over after round 5**: Complete round 5 → gameover 'GAME OVER'
11. **Low power drag**: Drag very short distance → power < 1, no launch
12. **Maximum power**: Drag full distance → power capped at 20
13. **Play again**: Click PLAY AGAIN → full reset
14. **advanceTime**: Simulate multiple physics steps
15. **render_game_to_text**: Verify player pos, obstacles, score, round

---

## 18. HIDE & SEEK

### State Diagram
```
                 ┌──────────┐
                 │  start   │
                 └────┬─────┘
                      │ startBtn click
                      ▼
               ┌──────────────┐
          ┌────│   playing    │────┐
          │    └──────────────┘    │
          │ spotted                │ reach exit (level<5)
          │ (guard vision)         │
          │                        ▼
          │                 ┌──────────────┐
          │                 │   playing    │
          │                 │ (next level) │
          │                 └──────────────┘
          │
          │                 reach exit (level>=5)
          │                        │
          │                        ▼
          │                 ┌───────────┐
          │                 │ gameover  │
          │                 │  (WIN)    │
          │                 └─────┬─────┘
          │                       │ replayBtn click
          │                       ▼
          │                 ┌──────────┐
          └────────────────►│ playing  │
                            └──────────┘
```

**NOTE**: Being "spotted" does NOT end the game. It deducts 50 points and resets the current level via `loadLevel()`.

### All States
| Variable | Values |
|----------|--------|
| `state.mode` | `'start'`, `'playing'`, `'gameover'` |
| `state.spotted` | `true`, `false` (visual flag, reset by loadLevel) |
| `state.level` | `1–5` |

### All Transitions
| Source | Target | Trigger | Guard |
|--------|--------|---------|-------|
| start | playing | startBtn click → `startGame()` → `loadLevel()` | — |
| playing | playing (spotted) | `checkSpotted()` true after move or guard update | score -= 50, loadLevel() |
| playing | playing (level up) | `movePlayer` reaches exit | `level < 5` |
| playing | gameover (win) | `movePlayer` reaches exit | `level >= 5` |
| gameover | playing | replayBtn click | — |

**Internal playing:**
- Guard moves every frame via `moveGuards()`
- Guards bounce off boundaries (reverse direction)
- Player collects items on move (score += 15 each)

### Edge Cases
1. **Spotted doesn't end game**: Only resets level and deducts points.
2. **Guard movement**: Guards move every frame independently of player.
3. **Double spotted check**: Both `movePlayer` and `update` loop check `checkSpotted()`.
4. **Vision line of sight**: Guards have directional vision (dx, dy) with range.
5. **Boundary guard reversal**: Guards at edge reverse direction.
6. **Item collection on spotted**: Items collected before spotted event are kept.
7. **Level reset on spotted**: `loadLevel()` resets player to start, new guards/items.
8. **Time bonus**: `max(0, 200 - timeSteps)` for reaching exit.
9. **Level bonus**: `level * 100` for reaching exit.
10. **Score floor 0**: `Math.max(0, score - 50)` on spotted.

### Test Scenarios

1. **Start game**: Click startBtn → mode='playing', level=1, player at (0,7)
2. **Move player**: Press ArrowUp → player moves up one cell
3. **Move out of bounds**: Press toward wall → no movement
4. **Collect item**: Move to item position → score += 15, itemsCollected++
5. **Reach exit**: Move to exit (11,0) → level up (if <5)
6. **Spotted by guard**: Move into guard vision → score -= 50, level resets
7. **Level progression**: Complete levels 1-4 → level increments
8. **Win condition**: Reach exit at level 5 → gameover 'YOU WIN!'
9. **Guard movement**: Advance time → guards move along their path
10. **Guard reversal**: Guards at boundary → direction reverses
11. **Multiple items**: Collect all items → score bonus
12. **Spotted during update loop**: Guards move into vision of player → spotted
13. **Spotted flash**: Red overlay shown briefly when spotted
14. **Play again**: Click PLAY AGAIN → full reset to level 1
15. **render_game_to_text**: Verify guards, items, player, exit in output

---

## 19. PHOTO ALBUM (Memory Match)

### State Diagram
```
                 ┌──────────┐
                 │  start   │
                 └────┬─────┘
                      │ startBtn click
                      ▼
               ┌──────────────┐
          ┌────│   playing    │────┐
          │    └──────┬───────┘    │
          │           │            │
          │   2 cards flipped     │
          │           │            │
          │     ┌─────┴─────┐     │
          │     │           │     │
          │   match       no match│
          │     │           │     │
          │     ▼           ▼     │
          │  (immediate)  (800ms) │
          │  unlock board  unlock  │
          │     │           │     │
          │     └─────┬─────┘     │
          │           │           │
          │     all 8 pairs matched
          │           │           │
          │           ▼           │
          │     ┌───────────┐    │
          │     │ gameover  │    │
          │     │  (WIN)    │    │
          │     └─────┬─────┘    │
          │           │ replayBtn │
          └───────────┘──────────┘
```

### All States
| Variable | Values |
|----------|--------|
| `state.mode` | `'start'`, `'playing'`, `'gameover'` |
| `state.lockBoard` | `true`, `false` |
| `state.flipped` | `[]`, `[i]`, `[i,j]` |

### All Transitions
| Source | Target | Trigger | Guard |
|--------|--------|---------|-------|
| start | playing | startBtn click → `startGame()` | — |
| playing (0 flipped) | playing (1 flipped) | Click face-down card | lockBoard=false, card not matched |
| playing (1 flipped) | playing (2 flipped→lock) | Click 2nd face-down card | lockBoard=false |
| playing (2 flipped, match) | playing (0 flipped) | Pattern match (color+shape) | Immediate: lockBoard=false |
| playing (2 flipped, no match) | playing (0 flipped) | Pattern mismatch | After 800ms setTimeout |
| playing (all matched) | gameover (win) | `matchedCount === totalPairs` | — |
| gameover | playing | replayBtn click | — |

### Edge Cases
1. **Click during lock**: `lockBoard=true` → handler returns immediately.
2. **Click already matched card**: `card.matched || card.faceUp` → returned early.
3. **Click same card twice**: First click flips it, second click → `card.faceUp` is true → ignored.
4. **Rapid 3rd click**: After 2 cards flipped, lockBoard=true → 3rd click blocked.
5. **Match is instant**: No delay — cards stay matched, lockBoard unlocked immediately.
6. **No-match delay**: 800ms before unlock — cards shown briefly then flip back.
7. **Timer-based scoring**: Time < 30s → +100 speed bonus.
8. **Move penalty**: Each move costs 3 points from base 200.
9. **Score floor 0**: `Math.max(0, base - penalty + timeBonus)`.
10. **Timer uses Date.now()**: Real-time timer, not simulated.

### Test Scenarios

1. **Start game**: Click startBtn → mode='playing', 16 cards face-down
2. **Flip card**: Click face-down card → card face-up, flipped=[i]
3. **Match pair**: Click two matching cards → both stay face-up, matchedCount++
4. **Mismatch pair**: Click two different cards → both flip back after 800ms
5. **Click matched card**: Click already-matched card → no effect
6. **Click same card**: Click same card twice → no second flip
7. **Lock during comparison**: After 2nd flip, click 3rd card → blocked
8. **Unlock on match**: After match → lockBoard=false immediately
9. **Unlock on mismatch**: After 800ms → lockBoard=false
10. **Complete all pairs**: Match all 8 pairs → gameover 'YOU WIN!'
11. **Score calculation**: Verify score = 200 - (moves*3) + (time<30 ? 100 : 0)
12. **Speed bonus**: Complete in <30s → +100 shown
13. **Play again**: Click PLAY AGAIN → new shuffled deck
14. **Touch support**: Touchstart on card → same as click
15. **render_game_to_text**: Verify cards, flipped, matchedCount, score in output

---

## 20. FOOD TRUCK

### State Diagram
```
                 ┌──────────┐
                 │  start   │
                 └────┬─────┘
                      │ startBtn click
                      ▼
               ┌──────────────┐
          ┌────│   playing    │◄────┐
          │    └──────┬───────┘     │
          │           │             │
          │  correct ingredient     │ order timeout
          │           │             │ (orderTimer>=8000)
          │    ┌──────┴──────┐      │
          │    │             │      │
          │  complete      wrong    │
          │  order       ingredient │
          │    │             │      │
          │    ▼             ▼      │
          │  next order  combo=0    │
          │  combo++     score-=5   │
          │    │             │      │
          │    └──────┬──────┘      │
          │           │             │
          │     timer <= 0          │
          │           │             │
          │           ▼             │
          │     ┌───────────┐       │
          │     │ gameover  │       │
          │     │ (TIME UP!)│       │
          │     └─────┬─────┘       │
          │           │ replayBtn   │
          └───────────┴─────────────┘
```

### All States
| Variable | Values |
|----------|--------|
| `state.mode` | `'start'`, `'playing'`, `'gameover'` |

### All Transitions
| Source | Target | Trigger | Guard |
|--------|--------|---------|-------|
| start | playing | startBtn click | — |
| playing | playing (order complete) | Correct ingredient completes order | `playerInput.length === orderIngredients.length` |
| playing | playing (wrong) | Wrong ingredient button | `emoji !== expected` |
| playing | playing (timeout) | `orderTimer >= orderTimeout` (8000ms) | customersLost++ |
| playing | gameover | `timer <= 0` | — |
| gameover | playing | replayBtn click | — |

**Internal transitions:**
- Correct ingredient: flash green, add to playerInput
- Wrong ingredient: flash red, combo reset, score -= 5
- Order complete: customersServed++, combo++, score += 10 + combo*2, new order generated
- Order timeout: customersLost++, combo reset, score -= 5, advance to next order

### Edge Cases
1. **Rapid ingredient clicks**: Each click independently checked against expected.
2. **Wrong ingredient penalty**: Score -= 5, combo = 0 immediately.
3. **Order timeout**: 8 seconds per order — mid-input order lost.
4. **Combo scoring**: Higher combo → more points per order (10 + combo*2).
5. **Score floor 0**: `Math.max(0, score - 5)` on wrong/timeout.
6. **No upper timer limit**: Game runs 60 seconds total.
7. **Order generation**: 2-4 random ingredients per order.
8. **advanceTime duplication**: Both update() loop and advanceTime handle timer.
9. **Spawn interval**: Not used for order generation (orders generated on completion/timeout).
10. **Ingredient buttons**: HTML buttons with data-item attribute, not canvas clicks.

### Test Scenarios

1. **Start game**: Click startBtn → mode='playing', first order shown, timer=60
2. **Correct ingredient**: Click button matching 1st ingredient → green flash, input grows
3. **Complete order**: Click all ingredients correctly → customersServed++, combo++
4. **Wrong ingredient**: Click wrong button → red flash, combo=0, score-=5
5. **Order timeout**: Wait 8s without completing → customersLost++, next order
6. **Game timer expiry**: Wait 60s → gameover 'TIME UP!'
7. **Combo bonus**: Complete 3 orders in a row → combo=3, score += 10+6 per order
8. **Combo reset on error**: After 2 correct, 1 wrong → combo=0
9. **Multiple orders**: Complete order → new order generated automatically
10. **Score calculation**: Verify score tracks correctly across serves/errors
11. **Button flash**: Correct = green flash 300ms, wrong = red flash 300ms
12. **Play again**: Click PLAY AGAIN → full reset
13. **Partial order + timeout**: Type 1 of 3 ingredients, then timeout → order lost
14. **UI updates**: Verify served, lost, combo displays update
15. **render_game_to_text**: Verify orders, playerInput, score, timer, combo in output
