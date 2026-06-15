# Complete State Machine Analysis: 10 Worldcup Minigames

---

## 1. PENALTY-KICK-DUEL

### State Diagram
```
    ┌─────────┐
    │  start  │ ◄──────────────────────────────────┐
    └────┬────┘                                      │
         │ click start-btn                           │
         ▼                                           │
    ┌──────────┐                                     │
    │ playing  │ ◄──── setTimeout 1200ms ───┐       │
    │ (aim)    │                            │       │
    └────┬─────┘                            │       │
         │ click/touch                      │       │
         ▼                                  │       │
    ┌──────────┐                            │       │
    │ playing  │                            │       │
    │(shooting)│                            │       │
    └────┬─────┘                            │       │
         │ ball resolves                    │       │
         ▼                                  │       │
    ┌─────────┐   round < 5                │       │
    │ result  │ ──────────► getready ──────┘       │
    └────┬────┘                                    │
         │ round >= 5                              │
         ▼                                         │
    ┌───────────┐  click PLAY AGAIN                │
    │ gameover  │ ─────────────────────────────────┘
    └───────────┘
```

### Modes/States
| # | Mode | Description |
|---|------|-------------|
| 1 | `start` | Initial title screen with Start button |
| 2 | `playing` | Active gameplay with sub-phase `shootPhase` (`aim` or `shooting`) |
| 3 | `result` | Post-kick outcome display with countdown timer |
| 4 | `getready` | Inter-round transition (1200ms timeout) |
| 5 | `gameover` | Final screen after round 5 |

### Transitions
| # | From | To | Trigger | Guard |
|---|------|----|---------|-------|
| T1 | start | playing | click start-btn | None |
| T2 | playing/aim | playing/shooting | canvas click/touchstart | mode='playing' && shootPhase='aim' |
| T3 | playing/shooting | result | ball enters goal + keeper misses | scored=true |
| T4 | playing/shooting | result | ball enters goal + keeper saves | saved=true |
| T5 | playing/shooting | result | ball out of bounds | y<-20, x<-20, or x>W+20 |
| T6 | result | getready | resultTimer reaches 0 | round < 5 |
| T7 | result | gameover | resultTimer reaches 0 | round >= 5 |
| T8 | getready | playing | setTimeout 1200ms | None |
| T9 | gameover | playing | click PLAY AGAIN | None |

### Edge Cases
- **Rapid clicks**: Protected — shootPhase guard prevents double shots
- **Ball out of bounds downward**: No y > H+20 check; ball aimed downward could fly off-screen
- **advanceTime()**: Does NOT process getready mode (setTimeout-based), so advancing time through getready leaves mode stuck
- **Crosshair lerp**: Aim uses lerped position, not raw mouse position

### Test Scenarios
```
TEST 1: Full game play-through
  - Click start-btn → assert mode='playing', shootPhase='aim'
  - Click canvas → assert shootPhase='shooting', ball.active=true
  - Wait for ball to resolve → assert mode='result'
  - Wait for resultTimer (120 frames) → assert mode='getready' or 'gameover'
  - If round < 5: assert mode='playing' after 1200ms
  - Repeat 5 rounds → assert mode='gameover'

TEST 2: Double-click protection
  - Click start → click canvas rapidly twice
  - Assert only one shot fired, shootPhase='shooting'

TEST 3: Score a goal
  - Click start, aim at center of goal, click
  - Assert scored=true, mode='result', result shows "GOAL!"

TEST 4: Miss the goal entirely
  - Click start, aim far outside goal, click
  - Assert ball goes out of bounds, mode='result'

TEST 5: Play Again flow
  - Complete 5 rounds → assert mode='gameover'
  - Click PLAY AGAIN → assert mode='playing', round=1, score=0

TEST 6: Timer countdown
  - Score goal → assert resultTimer starts at 120
  - advanceTime(2100ms) → assert mode='getready' or 'gameover'

TEST 7: Difficulty progression
  - Play 5 rounds, assert difficulty increases: 1.0, 1.4, 1.8, 2.2, 2.6
```

---

## 2. VAR-REPLAY

### State Diagram
```
    ┌───────┐
    │ menu  │
    └───┬───┘
        │ click start-btn
        ▼
    ┌────────┐    animTime >= 1.5
    │ replay │ ──────────────────► ┌──────────┐
    └────────┘                     │ decision │
                                   └─────┬────┘
                                         │ makeDecision() or timeLeft <= 0
                                         ▼
                                   ┌──────────┐   click next-btn (round < 10)
                                   │  result  │ ────────────────────────┐
                                   └─────┬────┘                         │
                                         │ round >= 10                   │
                                         ▼                               │
                                   ┌──────────┐                         │
                                   │ gameover │                         │
                                   └─────┬────┘                         │
                                         │ click replay-btn              │
                                         └──────────────────────────────┘
```

### Modes/States
| # | Mode | Description |
|---|------|-------------|
| 1 | `menu` | Initial start screen |
| 2 | `replay` | VAR replay animation plays (animTime 0→1.5) |
| 3 | `decision` | Player makes call within 3-second timer |
| 4 | `result` | Shows correct/incorrect outcome |
| 5 | `gameover` | Final screen after 10 rounds |

### Transitions
| # | From | To | Trigger | Guard |
|---|------|----|---------|-------|
| T1 | menu | replay | click start-btn | None |
| T2 | replay | decision | animTime >= 1.5 | Auto-transition |
| T3 | decision | result | makeDecision(call) | mode='decision' or 'replay' |
| T4 | decision | result | timeLeft <= 0 | makeDecision('TIME_UP') |
| T5 | result | replay | click next-btn | round < TOTAL_ROUNDS |
| T6 | result | gameover | click next-btn | round >= TOTAL_ROUNDS |
| T7 | gameover | replay | click replay-btn | Calls startGame() |

### Edge Cases
- **Decision during replay**: makeDecision() accepts calls in both 'decision' and 'replay' modes (line 483)
- **Double-click decision**: makeDecision() sets playerCall and transitions immediately; second click returns early if playerCall already set
- **Timer expiry**: TIME_UP auto-submits with 0 points
- **Rapid next-btn clicks**: nextRound() increments round and checks >= TOTAL_ROUNDS

### Test Scenarios
```
TEST 1: Full 10-round game
  - Click start → assert mode='replay'
  - advanceTime(5000ms) → assert mode='decision'
  - Click FOUL/GOAL/etc → assert mode='result'
  - Click next-btn → assert round increments
  - Repeat 10 times → assert mode='gameover'

TEST 2: Timer expiry
  - Start game → wait for decision mode
  - Do NOT click any decision button for 3+ seconds
  - Assert mode='result' with TIME_UP call

TEST 3: Correct decision scoring
  - Start round, identify correct answer from render_game_to_text
  - Click correct button → assert score > 0, "CORRECT!" shown

TEST 4: Incorrect decision
  - Click wrong button → assert score unchanged, "INCORRECT" shown

TEST 5: Decision during replay phase
  - Click start → immediately click a decision button
  - Assert decision accepted (makeDecision checks both modes)

TEST 6: Keyboard shortcuts
  - Press '1' during decision → asserts GOAL submitted
  - Press '3' → asserts FOUL submitted

TEST 7: Replay after game over
  - Complete 10 rounds → click replay-btn
  - Assert round=1, score=0, mode='replay'
```

---

## 3. KIT-DESIGNER

### State Diagram
```
    ┌──────────────────────┐
    │   CONTINUOUS DESIGN  │ (no game modes/phases)
    │   modeless tool      │
    │                      │
    │  Color pickers       │
    │  Pattern buttons     │
    │  Logo position btns  │
    │  Player name/number  │
    │  Team presets        │
    │  Export / Clear      │
    └──────────────────────┘
```

### Modes/States
**No explicit modal state machine.** This is a single-mode continuous design tool.

State is a flat property bag:
| Field | Default | Values |
|-------|---------|--------|
| mainColor | '#FF0000' | Any CSS hex |
| accentColor | '#FFFFFF' | Any CSS hex |
| sleeveColor | '#FF0000' | Any CSS hex |
| pattern | 'solid' | solid/stripes/hoops/diamond/gradient |
| logoPosition | 'chest' | chest (only value used) |
| playerNumber | 10 | 0-99 |
| playerName | 'MESSI' | Any string |
| team | 'custom' | custom + 10 team presets |
| savedDesigns | [] | Append-only array |

### Transitions
All transitions are immediate synchronous mutations + canvas redraw:

| # | Trigger | State Change |
|---|---------|-------------|
| T1 | Color picker input | mainColor/accentColor/sleeveColor + team='custom' |
| T2 | Pattern button click | pattern = btn.dataset.pattern |
| T3 | Logo button click | logoPosition = btn.dataset.logo |
| T4 | Player number input | playerNumber clamped 0-99 |
| T5 | Player name input | playerName = value.toUpperCase() |
| T6 | Team dropdown change | Calls setTeam() → sets all 3 colors from preset |
| T7 | Export button | saveDesign() → pushes to savedDesigns, triggers download |
| T8 | Clear button | clearGallery() → savedDesigns = [] |

### Edge Cases
- **Rapid export clicks**: Each click creates duplicate entry + multiple download prompts
- **Date.now() collision**: Two saves in same ms get same ID
- **Player name overflow**: No length limit, text may overflow jersey canvas
- **Empty player name**: Name not drawn but state still set
- **advanceTime()**: Complete no-op, just redraws
- **Dead code**: hexToRgb() defined but never called
- **No active class initialization**: Pattern/logo buttons may not show highlight on load

### Test Scenarios
```
TEST 1: Color change + team override
  - Select team 'brazil' → assert mainColor, accentColor, sleeveColor match preset
  - Change mainColor picker → assert team='custom', dropdown shows 'custom'

TEST 2: Pattern cycling
  - Click each pattern button → assert state.pattern updates
  - Click same button twice → assert no error, pattern stays same

TEST 3: Player number edge cases
  - Input -5 → assert clamped to 0
  - Input 150 → assert clamped to 99
  - Input 'abc' → assert playerNumber=0
  - Input 10.5 → assert playerNumber=10 (truncation)

TEST 4: Export + Clear cycle
  - Export 3 designs → assert savedDesigns.length=3
  - Clear → assert savedDesigns.length=0
  - Export again → assert savedDesigns.length=1

TEST 5: render_game_to_text accuracy
  - Set all fields to known values
  - Call render_game_to_text() → assert JSON matches expected state

TEST 6: Rapid color picker dragging
  - Simulate rapid input events on mainColor
  - Assert no errors, jersey redraws correctly
```

---

## 4. PENALTY-MARATHON

### State Diagram
```
    ┌───────┐
    │ title │
    └───┬───┘
        │ click KICK OFF / Space / Enter
        ▼
    ┌─────────┐         shootBall()
    │ aiming  │ ──────────────────► ┌──────────┐
    └─────────┘                     │ shooting │
                                    └────┬─────┘
                                         │
                            ┌────────────┼────────────┐
                            │            │            │
                     checkGoal()   checkKeeperSave()  out of bounds
                            │            │            │
                            ▼            ▼            ▼
                    ┌──────────┐  ┌──────────┐  ┌──────────┐
                    │  GOAL!   │  │   MISS!  │  │   MISS!  │
                    │(timeout) │  │(immediate│  │(immediate│
                    └────┬─────┘  └────┬─────┘  └────┬─────┘
                         │             │              │
                    800ms later        ▼              ▼
                         │       ┌──────────┐  ┌──────────┐
                         │       │ gameover │  │ gameover │
                         ▼       └─────┬────┘  └──────────┘
                    ┌─────────┐        │ click TRY AGAIN / Space
                    │ aiming  │ ◄──────┘
                    └─────────┘
```

### Modes/States
| # | Mode | Description |
|---|------|-------------|
| 1 | `title` | Initial screen with KICK OFF button |
| 2 | `aiming` | Player moves mouse to aim, click to shoot |
| 3 | `shooting` | Ball in flight, physics active |
| 4 | `gameover` | Miss screen with TRY AGAIN button |

### Transitions
| # | From | To | Trigger | Guard |
|---|------|----|---------|-------|
| T1 | title | aiming | click KICK OFF / Space / Enter | Inside button bounds |
| T2 | aiming | shooting | shootBall() | mode='aiming' |
| T3 | shooting | aiming | handleGoal() after 800ms timeout | ball entered goal + no keeper save |
| T4 | shooting | gameover | handleMiss() | keeper save OR ball out of bounds |
| T5 | gameover | aiming | click TRY AGAIN / Space / Enter | Inside button bounds |

### Difficulty Progression
| Level | Score Threshold | Effect |
|-------|----------------|--------|
| 0 | 0-4 | Normal |
| 1 | 5+ | Moving keeper |
| 2 | 10+ | Wind |
| 3 | 15+ | Small goal (20% shrink) |
| 4 | 20+ | Rotating dive |

### Edge Cases
- **Rapid clicks during shooting**: shootBall() guards `mode !== 'aiming'` — protected
- **Goal timeout check**: handleGoal() checks `state.mode === 'shooting'` inside setTimeout — if game restarted during timeout, mode would be different and reset skipped
- **Wind accumulation**: Wind force = 0.3 + score * 0.02, direction random at level-up, stays constant after
- **Small goal applied once**: `smallGoalActive` flag prevents re-shrinking
- **Ball trail memory**: trail capped at 15 entries
- **dt clamping**: 50ms max per frame prevents physics explosions

### Test Scenarios
```
TEST 1: Title → Play → Goal → Score increment
  - Assert mode='title'
  - Click KICK OFF → assert mode='aiming'
  - Click center of goal → assert mode='shooting'
  - Wait for ball to enter goal → assert score=1, mode='aiming' after 800ms

TEST 2: Miss → Game Over → Restart
  - Aim far outside goal, click
  - Assert mode='gameover'
  - Click TRY AGAIN → assert mode='aiming', score=0

TEST 3: Difficulty level transitions
  - Score 5 goals → assert keeper.moving=true
  - Score 10 goals → assert wind.active=true
  - Score 15 goals → assert smallGoalActive=true
  - Score 20 goals → assert rotatingDiveActive=true

TEST 4: Streak and multiplier
  - Score 3 goals in a row → assert multiplier=2
  - Score 6 in a row → assert multiplier=3
  - Miss → assert streak=0, multiplier=1

TEST 5: Wind effect on ball
  - Enable wind (score 10+)
  - Shoot ball → assert ball.vx changes over time from wind force

TEST 6: Keeper save detection
  - Aim directly at keeper position
  - Assert keeper save triggers gameover

TEST 7: High score persistence
  - Score 5 → assert localStorage has best score
  - Restart → assert bestScore loaded from localStorage
```

---

## 5. FORMATION-TACTICIAN

### State Diagram
```
    ┌─────────┐
    │  setup  │ ◄─────────────────────────────────┐
    └────┬────┘                                     │
         │ drag players to adjust positions         │
         │ click preset formations                  │
         │ click start-btn                          │
         ▼                                          │
    ┌─────────┐    setInterval (90 min × 120ms)     │
    │  match  │ ──────────────────────────────┐     │
    └─────────┘                               │     │
                                              ▼     │
                                        ┌─────────┐ │
                                        │  (end)  │ │
                                        └────┬────┘ │
                                             │      │
                                    setTimeout 600ms │
                                             ▼      │
                                        ┌─────────┐ │
                                        │ result  │─┘
                                        │ overlay │  click play-again-btn
                                        └─────────┘
```

### Modes/States
| # | Mode | Description |
|---|------|-------------|
| 1 | `setup` | Drag players, choose formation, configure team |
| 2 | `match` | Simulated match runs via setInterval (90 minutes) |

Note: Result is shown via DOM overlay, not a mode value. After match ends, mode returns to `setup`.

### Transitions
| # | From | To | Trigger | Guard |
|---|------|----|---------|-------|
| T1 | setup | match | click start-btn | mode='setup' |
| T2 | match | (end) → setup | minute > 90 | clearInterval, setTimeout 600ms → endMatch() |
| T3 | result overlay | setup | click play-again-btn | None |

### Key Functions
- `startMatch()`: Sets mode='match', starts setInterval every 120ms simulating minutes 1-90
- `simulateMatchEvent(minute)`: Calculates goal chances based on formation rating + matchup analysis
- `endMatch()`: Sets mode='setup', shows result overlay
- `calculateFormationRating()`: Evaluates defensive line, GK distance, midfield spread, forward spread, zone coverage
- `analyzeMatchup()`: Compares player vs AI formation strengths/weaknesses

### Edge Cases
- **Drag during match**: onPointerDown guards `mode !== 'setup'` — protected
- **Double-click start**: startMatch() guards `mode !== 'setup'` — protected
- **play-again during match**: Result overlay hidden during match, not clickable
- **advanceTime()**: Steps through match minutes directly, bypassing setInterval
- **Match events are probabilistic**: Goals, chances based on random rolls with formation modifiers

### Test Scenarios
```
TEST 1: Setup → Match → Result cycle
  - Assert mode='setup'
  - Click start-btn → assert mode='match'
  - advanceTime(11000ms) (90+ minutes) → assert mode='setup'
  - Assert result overlay visible with score

TEST 2: Formation presets
  - Click '4-3-3' preset → assert currentFormation='4-3-3'
  - Assert player positions match FORMATIONS['4-3-3']
  - Click '4-4-2' → assert positions reset

TEST 3: Player drag positioning
  - In setup mode, drag player → assert player.x/y updated
  - Clamp check: drag past boundary → assert player stays within bounds

TEST 4: Reset during setup
  - Drag player → click reset-btn → assert positions reset to formation defaults

TEST 5: Formation rating calculation
  - Set known player positions → assert calculateFormationRating() returns expected value
  - Test GK too far from goal → lower rating

TEST 6: Match events
  - advanceTime through match → assert matchLog entries appear
  - Assert goals update score-display

TEST 7: Play again flow
  - Complete match → click play-again-btn
  - Assert mode='setup', score reset, matchLog cleared
```

---

## 6. GOAL-CELEBRATION

### State Diagram
```
                    ┌─────────────────────────┐
                    │    SELECT (idle)         │◄──────────────────┐
                    │  mode='select'           │                   │
                    │  playing=false           │                   │
                    └───┬───┬───┬───┬───┬─────┘                   │
                        │   │   │   │   │                          │
                        │   │   │   │   └── [Record btn] ──► RECORD│
                        │   │   │   │                               │
                        │   │   │   └── [Play btn] ──► PLAYBACK ──┘
                        │   │   │                                    │
                        │   │   └── [Share btn] ──► (download PNG)  │
                        │   │                                        │
                        │   └── [Pose btn] ──► add to timeline     │
                        │                                            │
                        └── [Effect btn] ──► add to timeline       │
                                                                    │
    ┌──────────── RECORD ──────────────┐                            │
    │ mode='record'                     │                            │
    │ All pose/effect clicks BLOCKED    │                            │
    │ (BUG: they are NOT blocked)       │                            │
    │                                   │                            │
    │ [2000ms setTimeout] ──────────────┴──► SELECT ────────────────┘
    └───────────────────────────────────┘

    ┌──────────── PLAYBACK ─────────────┐                            │
    │ mode='select' (unchanged)         │                            │
    │ playing=true                      │                            │
    │ All input clicks BLOCKED          │                            │
    │ playbackIndex advances 0→N        │                            │
    │                                   │                            │
    │ [playbackTimer >= 800ms/item]     │                            │
    │ AND playbackIndex >= timeline.len │                            │
    │ → state.playing = false ──────────┴──► POST-PLAYBACK (SELECT) ┘
    └───────────────────────────────────┘
```

### Modes/States
| # | Mode + Flag | Description |
|---|-------------|-------------|
| 1 | mode='select', playing=false | Idle/editing state |
| 2 | mode='record', playing=false | 2-second recording phase |
| 3 | mode='select', playing=true | Timeline playback active |
| 4 | Timeline length >= 4 | Behavioral state: no more items accepted |

### Transitions
| # | From | To | Trigger | Guard |
|---|------|----|---------|-------|
| T1 | SELECT | RECORD | Record button click | playing=false |
| T2 | RECORD | SELECT | setTimeout 2000ms | Unconditional |
| T3 | SELECT | PLAYBACK | Play button click | playing=false AND timeline.length > 0 |
| T4 | PLAYBACK | SELECT | playbackTimer >= 800ms AND index >= timeline.length | All items consumed |

### Bugs Found
1. **Record mode does NOT block pose/effect clicks** — selectPose() only checks `playing`, not `mode`
2. **Play button NOT blocked during Record** — startPlayback() checks `playing`, but Record doesn't set `playing=true`
3. **clearTimeline() doesn't guard against playback** — Can clear mid-playback causing immediate termination
4. **Rainbow effect is dead code** — case exists but body is empty `break;`

### Edge Cases
- **Double-click Play**: Protected — first click sets playing=true
- **Double-click Record**: No debounce; overlapping setTimeouts possible
- **Timeline cap at 4**: addToTimeline() silently rejects beyond 4
- **Share during playback**: Not blocked, can download mid-animation screenshot

### Test Scenarios
```
TEST 1: Add poses and play
  - Click pose buttons → assert timeline grows
  - Click play → assert playing=true, timeline animates
  - Wait for all items → assert playing=false

TEST 2: Record mode
  - Click record → assert mode='record'
  - Wait 2000ms → assert mode='select'

TEST 3: Timeline cap
  - Add 4 items → try adding 5th → assert timeline.length stays 4

TEST 4: Clear timeline
  - Add items → click clear → assert timeline=[], score=0

TEST 5: Play with empty timeline
  - Click play with no items → assert nothing happens (guarded)

TEST 6: Record during playback
  - Start playback → click record → assert blocked by playing=true guard

TEST 7: Share screenshot
  - Add items → click share → assert download triggered

TEST 8: render_game_to_text
  - Add known poses → call render_game_to_text → assert JSON matches state
```

---

## 7. BRACKET-PREDICTOR

### State Diagram
```
    ┌──────┐  startGame()
    │ idle │ ──────────────► ┌─────────┐
    └──────┘                  │ picking │
                              └────┬────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
              pickTeam()    simulateActual()  scoreBracket()
                    │              │              │
                    ▼              ▼              ▼
              ┌─────────┐   ┌─────────┐   ┌─────────┐
              │ picking │   │ scored  │   │ scored  │
              │(updated)│   │(term.)  │   │(term.)  │
              └─────────┘   └─────────┘   └─────────┘
```

### Modes/States
| # | Phase | Description |
|---|-------|-------------|
| 1 | `idle` | Initial state, no bracket loaded |
| 2 | `picking` | Active gameplay, selecting winners |
| 3 | `scored` | Terminal: all picks scored |

### Transitions
| # | From | To | Trigger | Guard |
|---|------|----|---------|-------|
| T1 | idle | picking | startGame() / loadBracket() | None |
| T2 | picking | scored | simulateActual() | isComplete() |
| T3 | picking | scored | scoreBracket() | isComplete() |
| T4 | picking | picking | pickTeam() | Toggle on/off |

### Key Behaviors
- **Pick toggling**: Click to select, click again to deselect
- **Cascading undo**: Deselecting round N clears all picks in rounds N+1 through 3
- **AI results re-randomize on undo**: advanceActualResults() called after undo
- **scored is terminal**: No way back to picking without page reload
- **Save/Load asymmetry**: loadBracket() always re-enters picking, ignores saved phase

### Edge Cases
- **Duplicate simulateActual/scoreBracket**: Both do identical thing, two buttons
- **No timer**: advanceTime() is no-op
- **Rapid pick clicks**: No debounce needed — single-threaded JS
- **Toggle off cascades**: Undoing round 0 pick clears ALL downstream

### Test Scenarios
```
TEST 1: Start game → picking
  - Assert idle → call startGame() → assert phase='picking'
  - Assert bracket populated with 16 teams

TEST 2: Pick a team
  - Click team in R16 match → assert pick recorded
  - Click same team again → assert pick toggled off

TEST 3: Cascading pick propagation
  - Pick R16 winner → assert placed in QF slot
  - Pick QF winner → assert placed in SF slot
  - Pick SF winner → assert placed in Final slot
  - Undo R16 pick → assert all downstream picks cleared

TEST 4: Complete bracket
  - Make all 15 picks → assert isComplete()=true
  - Assert Simulate/Score buttons appear

TEST 5: Score bracket
  - Complete picks → click simulateActual()
  - Assert phase='scored', score calculated correctly

TEST 6: Scored is terminal
  - Score bracket → try clicking any pick
  - Assert no changes (phase !== 'picking')

TEST 7: Save and load
  - Make some picks → call saveBracket()
  - Call loadBracket() → assert picks restored
  - Assert phase='picking' (not scored)

TEST 8: render_game_to_text
  - Make picks → call render_game_to_text → assert JSON has correct picks
```

---

## 8. REF-SIMULATOR

### State Diagram
```
    ┌───────┐  startGame()
    │ start │ ──────────────► ┌─────────┐
    └───────┘                  │ playing │
                               └────┬────┘
                                    │
                         ┌──────────┼──────────┐
                         │          │          │
                   blowWhistle()  auto-whistle  timer expires
                         │      (2000ms)       │
                         ▼                     ▼
                   ┌──────────┐          ┌──────────┐
                   │ (whistle │          │ TIME_UP  │
                   │  blown)  │          │ decision │
                   └────┬─────┘          └────┬─────┘
                        │ 400ms delay          │
                        ▼                      │
                   ┌──────────┐                │
                   │ decision │ ◄──────────────┘
                   │  panel   │
                   └────┬─────┘
                        │ makeDecision() or 3s timeout
                        ▼
                   ┌──────────┐
                   │ judging  │
                   └────┬─────┘
                        │ 600ms delay
                        ▼
                   ┌──────────┐   next-btn
                   │ replay   │ ──────────► startRound()
                   └────┬────┘              (playing or end)
                        │ round > 20
                        ▼
                   ┌──────────┐
                   │   end    │
                   └──────────┘
```

### Modes/States (phase field)
| # | Phase | Description |
|---|-------|-------------|
| 1 | `start` | Initial screen |
| 2 | `playing` | Active round: incident animation + whistle prompt |
| 3 | `judging` | Decision made, evaluating |
| 4 | `end` | Game over after 20 rounds |

### Sub-states within `playing`
| # | Sub-state | Description |
|---|-----------|-------------|
| 1 | Pre-whistle | Incident animation plays, whistle timer counting |
| 2 | Whistle blown | 400ms delay, then decision panel shown |
| 3 | Decision panel active | Player chooses, 3s timer |

### Transitions
| # | From | To | Trigger | Guard |
|---|------|----|---------|-------|
| T1 | start | playing | click start-btn | None |
| T2 | playing (pre-whistle) | playing (whistle blown) | blowWhistle() or 2s timeout | whistleBlown=false |
| T3 | playing (whistle blown) | playing (decision panel) | setTimeout 400ms | None |
| T4 | playing (decision) | judging | makeDecision() or 3s timeout | playerDecision=null |
| T5 | judging | playing/replay | setTimeout 600ms | None |
| T6 | replay | playing | click next-btn | round < 20 |
| T7 | playing | end | round > 20 | endGame() |

### Edge Cases
- **Double-click whistle**: blowWhistle() guards `whistleBlown` — protected
- **Double-click decision**: makeDecision() guards `playerDecision` — protected
- **Auto-whistle at 2s**: If player doesn't blow whistle, timerTick auto-calls blowWhistle()
- **Auto-decision at 3s**: If player doesn't decide, makeDecision('TIME_UP') called
- **Timer via setInterval**: 16ms interval, not RAF — more consistent but may conflict with tab throttling
- **advanceTime()**: Advances animationTime and decisionTimer directly

### Test Scenarios
```
TEST 1: Full round flow
  - Click start → assert phase='playing'
  - Click whistle → assert whistle blown, 400ms delay
  - Decision panel appears → click FOUL
  - Assert phase='judging', 600ms delay
  - Replay shown → click next-btn → assert next round starts

TEST 2: Auto-whistle timeout
  - Start round → do NOT blow whistle for 2+ seconds
  - Assert whistle auto-blown, decision panel appears

TEST 3: Auto-decision timeout
  - Blow whistle → do NOT make decision for 3+ seconds
  - Assert TIME_UP decision submitted

TEST 4: Correct decision scoring
  - Read correct answer from render_game_to_text (during replay)
  - Click correct button → assert score > 0, "CORRECT!" shown

TEST 5: Wrong decision
  - Click wrong button → assert score unchanged

TEST 6: Full 20-round game
  - Play 20 rounds → assert phase='end'
  - Assert rating shown, stats displayed

TEST 7: Whistle timing bonus
  - Blow whistle early (0.5s) vs late (1.8s)
  - Assert early whistle gives more points

TEST 8: advanceTime integration
  - advanceTime(2500ms) → assert whistle blown automatically
  - advanceTime(3500ms) more → assert TIME_UP decision
```

---

## 9. CROWD-WAVE

### State Diagram
```
    ┌──────┐  start-btn
    │ menu │ ──────────► ┌─────────┐  endGame() (NEVER CALLED)
    └──────┘              │ playing │ ──────────────────────────► ┌──────────┐
                          └────┬────┘                            │ gameover │
                               │                                 └─────┬────┘
                               │                                        │ restart-btn
                               │                                        ▼
                               │                                 ┌─────────┐
                               └─────────────────────────────────│ playing │
                                                                 └─────────┘
```

### Modes/States
| # | Mode | Description |
|---|------|-------------|
| 1 | `menu` | Start screen, game loop renders but update() returns immediately |
| 2 | `playing` | Active gameplay: beats, waves, taps, scoring |
| 3 | `gameover` | Terminal state (**UNREACHABLE** — endGame() never called) |

### Transitions
| # | From | To | Trigger | Guard |
|---|------|----|---------|-------|
| T1 | menu | playing | click start-btn | None |
| T2 | gameover | playing | click restart-btn | None |
| T3 | playing | gameover | endGame() | **NEVER CALLED** — unreachable! |

### Sub-state machine: Wave Lifecycle (within playing)
| # | Sub-state | Description |
|---|-----------|-------------|
| 1 | waveActive=false | Break period, waveBreakTimer counting down from 500ms |
| 2 | waveActive=true | Wave sweeping across figures |

Wave patterns cycle every 10 beats: simple → double → reverse → simple...

### Edge Cases
- **CRITICAL BUG: endGame() never called** — game runs indefinitely once started
- **No tap debouncing** — rapid taps within single beat can be double-scored
- **Reverse wave exit bug** — exit condition only checks `wavePosition >= 65`, but reverse waves move left (position decreases), so they may never exit
- **First-frame NaN dt** — harmless due to mode guard
- **Beat timing drift** — accumulated from using actual performance.now()
- **lastTapTime recorded but never read** — dead code for debouncing

### Test Scenarios
```
TEST 1: Start game
  - Click start-btn → assert mode='playing'
  - Assert start screen hidden

TEST 2: Tap scoring
  - During playing, tap on beat → assert score > 0
  - Assert combo increases on successive beats

TEST 3: Multiplier system
  - Hit 10 perfect taps → assert multiplier increased

TEST 4: BPM acceleration
  - Play through 20+ beats → assert BPM increased by 5
  - Play to 200 BPM → assert capped

TEST 5: Wave patterns
  - Play through 30+ beats → assert pattern cycles
  - Assert simple → double → reverse → simple

TEST 6: Game over (CURRENTLY IMPOSSIBLE)
  - Verify endGame() is unreachable
  - Assert no lose condition exists

TEST 7: Restart during game (UNREACHABLE)
  - Verify restart-btn is hidden during menu and playing
  - Only visible when gameover is shown

TEST 8: render_game_to_text
  - During playing → assert JSON has mode='playing', score, combo, BPM

TEST 9: advanceTime integration
  - advanceTime(1000ms) → assert beat count increases
  - advanceTime(60000ms) → assert many beats fired, score accumulated
```

---

## 10. STADIUM-BUILDER

### State Diagram
```
    ┌──────────────────────┐
    │   CONTINUOUS BUILDER │ (no game modes/phases)
    │   modeless tool      │
    │                      │
    │  Component palette   │
    │  Isometric grid      │
    │  Theme selector      │
    │  Budget tracking     │
    │  Save / Load / Clear │
    │  Leaderboard         │
    └──────────────────────┘
```

### Modes/States
**No explicit modal state machine.** This is a modeless isometric building tool.

State fields:
| Field | Default | Description |
|-------|---------|-------------|
| theme | 'classic' | Visual theme (classic/modern/futuristic/eco) |
| grid | 10×12 null array | Grid contents |
| selectedComponent | null | Currently selected component to place |
| budget | 1000 | Starting budget |
| placed | [] | Array of placed components |
| hoverCell | null | Currently hovered grid cell |
| dragging | false | Pan state |
| offsetX/Y | 0 | Canvas pan offset |

### Transitions
All transitions are immediate synchronous mutations:

| # | Trigger | State Change |
|---|---------|-------------|
| T1 | Component button click | selectedComponent = id (or null if toggled off) |
| T2 | Canvas click (with selection) | placeComponent() → grid updated, budget reduced |
| T3 | Shift+click on occupied cell | removeComponent() → grid cleared, budget restored |
| T4 | Theme dropdown change | theme = new value |
| T5 | Clear button | initGrid(), placed=[] |
| T6 | Save button | Pushes to localStorage |
| T7 | Load button | Restores from localStorage |
| T8 | Leaderboard button | Shows modal with sorted saved designs |

### Budget System
- Total budget: 1000
- Components have individual costs (0-120)
- placeComponent() checks `budgetRemaining() < comp.cost` — blocks if insufficient
- removeComponent() restores budget

### Score Calculation
- Capacity: sum of component capacity values
- Aesthetics: sum + bonus for 3+ and 6+ components
- Fan: sum + pitch bonus (+5) + roof+stands bonus (+4)
- Sustainability: sum + solar+trees bonus (+5)

### Edge Cases
- **Double-click same component**: Toggles selection off (line 322: `selectedComponent === comp.id ? null : comp.id`)
- **Place on occupied cell**: placeComponent() returns false — no double placement
- **Budget exhaustion**: placeComponent() returns false when budget < cost
- **Touch placement**: touchstart places component but doesn't support drag
- **Pan conflicts**: Middle-click or Alt+click for panning
- **No undo for removal**: Shift+click removes permanently

### Test Scenarios
```
TEST 1: Select and place component
  - Click 'stands_n' button → assert selectedComponent='stands_n'
  - Click grid cell → assert placed in grid, budget reduced by 80

TEST 2: Toggle selection off
  - Click 'stands_n' → click again → assert selectedComponent=null

TEST 3: Budget enforcement
  - Place components totaling 980 → try placing 50-cost component
  - Assert placement blocked, grid unchanged

TEST 4: Remove component
  - Place component → Shift+click → assert removed, budget restored

TEST 5: Theme switching
  - Select 'futuristic' → assert theme='futuristic'
  - Assert canvas re-renders with new colors

TEST 6: Clear all
  - Place several components → click clear
  - Assert grid all null, placed=[], budget=1000

TEST 7: Save and load
  - Place components → click save
  - Clear → click load → assert grid restored

TEST 8: Score calculation
  - Place pitch + 2 stands → assert capacity, aesthetics, fan values correct
  - Place solar + trees → assert sustainability bonus

TEST 9: Leaderboard
  - Save 3 designs → click leaderboard
  - Assert sorted by total score

TEST 10: render_game_to_text
  - Place known components → call render_game_to_text
  - Assert JSON matches expected budget, scores, placed components

TEST 11: advanceTime
  - advanceTime(5000ms) → assert animTime increased
  - Assert no state corruption (tool is time-independent)
```

---

## CROSS-GAME PATTERNS

### Common State Machine Types
1. **Finite State Machine** (penalty-kick-duel, var-replay, penalty-marathon, ref-simulator, crowd-wave): Explicit mode field with clear transitions
2. **Modeless/Continuous** (kit-designer, stadium-builder): No game phases, just reactive UI
3. **Hybrid** (goal-celebration, formation-tactician): Mix of modal states and behavioral flags

### Common Edge Cases Across All Games
1. **Rapid clicks**: All games should have guards against double-action
2. **Tab backgrounding**: RAF pauses but setTimeout continues; dt clamping helps
3. **advanceTime()**: Test helper present in all games; behavior varies (some no-op, some advance physics)
4. **render_game_to_text()**: All games expose this; useful for state verification in tests

### Test Framework Recommendations
- Use Playwright for browser-based testing
- Leverage `window.render_game_to_text()` for state assertions
- Use `window.advanceTime(ms)` for deterministic time advancement
- Test each transition path independently
- Verify guards prevent invalid transitions
- Test timer expiry paths
- Verify score/progress persistence (localStorage)
