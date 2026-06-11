# lichen-lab — design

## Concept

A petri dish for the rules of Life. Paint living cells with your pointer,
then bend the universe's physics by editing one string — `B3/S23` — and
watch order, chaos, coral, and lichen emerge from the same dish.

## Q&A (auto-resolved)

**Q: Core interaction?** Drag to paint live cells (eraser with right-click /
`e` toggle). Space runs/pauses the world. A rule input accepts B/S notation;
preset chips: Life B3/S23, HighLife B36/S23, Seeds B2/S, Day & Night
B3678/S34678, Maze B3/S12345, Coral B3/S45678. Speed slider 1–60 gen/s.
`c` clears, `n` steps once while paused.

**Q: Rendering?** Cells aren't binary pixels: each cell tracks age. Newborn
cells are bright; long-survivors shift hue slowly (teal → violet → ember);
dead cells leave a fading ghost. The dish is toroidal, ~160×100 cells.

**Q: What's surprising?** Changing the rule *while running* — the same
pattern instantly behaves like a different organism. The preset chips are
labeled with temperament ("orderly", "explosive", "crystalline") instead of
notation.

## Pure logic

- `parseRule('B3/S23')` — `{birth: Set, survive: Set}`; tolerant of case
  and missing S digits; throws a clear error on malformed input.
- `step(grid, w, h, rule)` — next generation, toroidal wrap; grid is a
  Uint8Array of 0/1 (age handled by the app layer, not the logic layer).
- `countNeighbors(grid, w, h, x, y)` — toroidal Moore neighborhood.
- `ageTick(ages, before, after)` — pure age update: born→1, surviving→+1,
  dead→0.

### Tests must assert

- `parseRule` round-trips Life and Seeds; rejects `'banana'` with an error.
- Blinker (3-in-a-row) under Life oscillates with period 2.
- Block (2×2) under Life is a still life.
- Glider under Life translates by (1,1) after 4 generations (toroidal).
- Any pattern under Seeds (S empty) has zero survivors next gen.
- Toroidal wrap: a cell at (0,0) neighbors (w−1, h−1).
- `ageTick`: born cells age 1, survivors increment, dead reset to 0.

## Vocabulary

| term | meaning |
| --- | --- |
| **dish** | the toroidal grid |
| **rule** | B/S birth–survival sets |
| **age** | generations a cell has been continuously alive (drives color) |
| **ghost** | fading trace of a recently dead cell |
| **temperament** | human label for a preset's behavior |

## Scenarios

1. Load → a faint random soup already simmering under Life, paused hint.
2. Paint a glider gun-ish blob → run → emergent debris, ages visible.
3. Switch Life → Day & Night mid-run → the same dish reorganizes into
   inverse-symmetric blobs.
4. Seeds at full speed → fireworks; one click of `c` calms everything.

## Aesthetic

Dark glass dish with a subtle vignette; cells as soft-glow rounded pixels;
ghosts in deep blue. Serif chips and hints, nightbloom-consistent.
