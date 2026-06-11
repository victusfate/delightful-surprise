# minotaur-maze — TDD log

Tests: `experiments/minotaur-maze/minotaur-maze.test.mjs` (Node test runner,
shared harness `experiments/_harness/logic.mjs`). Final run: **15/15 pass,
~120 ms**.

## Slice 1 — seeded RNG and maze generation — DONE

- RED: 8 tests (mulberry determinism / divergence / range; generateMaze
  shape, perfection via cleared-bit count = 2(w·h−1), seed determinism,
  seed divergence, carveOrder coverage + start). Failed for the right
  reason against a stub logic block (missing exports).
- GREEN: mulberry32 + iterative recursive backtracker; carveOrder records
  every head position including backtracks (fuel for the carving ballet).

## Slice 2 — movement and solving — DONE

- RED: 5 tests (edge cells blocked outward; N/S and W/E wall symmetry over
  every cell; neighbors ≡ canMove in all four directions; BFS connectivity
  from cell 0 to corners and center; solve path endpoints, open-neighbor
  hops, no repeats). 5 failed, 8 stayed green.
- GREEN: `canMove` bitmask test, `neighbors`, BFS `solve` with Int32Array
  prev-chain.

## Slice 3 — structural surface — DONE (green on arrival)

- The 2 tests (full export surface incl. DIRS bit convention N=1 E=2 S=4
  W=8; default 25×17 maze solves with a sane path length) passed
  immediately — slices 1–2 had already completed the surface. No red
  phase was possible; committed as a test-only commit noting this.

## Slice 4 — full visual app — DONE

Built around the untouched logic block: carving ballet animating
`carveOrder` with a glowing chisel-head and trail (~3 s), fog fall, race
(golden thread vs. lantern player), fog of war with the thread smouldering
through claimed cells, win bloom / minotaur red-glow reveal with mythic
serif flavor lines, WebAudio (drumbeat, footsteps, victory arpeggio, doom
note) initialized only on first key/pointer gesture, `r` re-roll, `m`
mute, `#seed=N` hash round-trip with the seed displayed. Unit tests stayed
green (logic block byte-identical apart from nothing — verified by rerun).

## Slice 5 — headless acceptance — DONE

Playwright (chromium, 1280×800, `file://`, pageerror + console-error
listeners; any error fails the run). All checks passed:

- waited through the carving ballet to the race phase (`#seed=42`);
- blocked arrow key left the player cell unchanged; an open one moved it;
- `#seed=42` produced byte-identical walls across two page loads;
- `r` re-rolled: carving restarted, new seed, different walls;
- lose path: thread completed unopposed → `lost` phase + minotaur reveal,
  no errors over the full ~35 s race;
- mid-race screenshot with thread and lantern visible saved to
  `/tmp/exp-minotaur-maze.png`.

Also eyeballed dedicated screenshots of carving / race / won / lost states.

### Tuning notes

- Thread pace 230 ms/cell with a 1.0 s stir delay after the drumbeat;
  held-key sprint at 95 ms/step. For a typical 25×17 solution (~100
  cells) the thread takes ~24 s — a decent run that remembers the carve
  wins by a hair.
- Carving ballet fixed at 3 s regardless of carveOrder length.

## Deviations from design

- Slice 3 had no red phase (surface already complete) — recorded above.
- After the first acceptance run, the lantern was visually too dim and was
  brightened; the player lantern is now drawn above the fog layer so the
  light scatters over the fog edge. One mid-acceptance script fix: the
  screenshot had to be taken before the long lose scenario, or the
  first page's own race ended in the meantime.
- The entrance (cell 0 west wall) and exit (last cell east wall) are drawn
  as open doorways for readability; the wall bitmasks underneath remain
  closed, exactly as the tests assert.
