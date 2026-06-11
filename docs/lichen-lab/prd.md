# lichen-lab — PRD

## Problem

Show that a classic cellular automaton becomes a living instrument when the
rules themselves are a control surface: paint a dish, run it, then bend the
physics mid-flight and watch the same pattern become a different organism.
Ships as one dependency-free HTML file in the repo's testable single-file
experiment pattern.

## Goals

1. A petri dish of Life-family automata the user paints with the pointer
   and steers by editing one string (`B3/S23`) — including *while running*.
2. Zero dependencies, zero build, zero network: `open index.html` is the
   entire install story; works from `file://`.
3. Pure simulation logic is unit-testable in Node via the shared logic-block
   harness (`experiments/_harness/logic.mjs`).
4. Genuinely beautiful: age-driven color, ghosts of the dead, dark glass
   dish — visually consistent with nightbloom.

## Non-goals

- Persistence, sharing, pattern libraries (RLE import), mobile-specific UI.
- Arbitrary neighborhoods or non-totalistic rules; B/S Moore-neighborhood
  only.
- Audio.

## Functional requirements

- **FR1 — dish:** a toroidal grid of ~160×100 cells rendered to canvas.
  On load it is seeded with a faint random soup under Life, paused, with a
  hint visible.
- **FR2 — painting:** pointer drag paints live cells; right-click drag (or
  `e` toggle) erases. Painting works whether paused or running.
- **FR3 — running:** Space toggles run/pause. A speed slider sets 1–60
  generations per second. `n` advances exactly one generation while paused.
  `c` clears the dish (cells, ages, ghosts).
- **FR4 — rules:** a text input accepts B/S notation (case-insensitive,
  missing `S` digits allowed, e.g. `B2/S` for Seeds). Malformed input is
  rejected with a visible error and the previous rule stays active. Preset
  chips apply: Life B3/S23, HighLife B36/S23, Seeds B2/S, Day & Night
  B3678/S34678, Maze B3/S12345, Coral B3/S45678 — each labeled with a
  temperament word, not notation. Rule changes apply instantly mid-run.
- **FR5 — age color:** each live cell tracks age (generations continuously
  alive). Newborns are bright; hue shifts with age teal → violet → ember.
- **FR6 — ghosts:** a cell that dies leaves a deep-blue trace that fades
  over subsequent generations.
- **FR7 — testability:** the logic block exports via `globalThis.__logic`:
  - `parseRule(str)` → `{ birth: Set, survive: Set }`; throws a clear
    `Error` on malformed input.
  - `step(grid, w, h, rule)` → next-generation `Uint8Array`, toroidal wrap;
    grid cells are 0/1 only — age lives in the app layer.
  - `countNeighbors(grid, w, h, x, y)` → toroidal Moore neighborhood count.
  - `ageTick(ages, before, after)` → new ages array: born → 1, surviving →
    +1, dead → 0.
  - `PRESETS` — the six temperament-labeled preset rules.

## Quality requirements

- `step()` stays lean enough for 160×100 at 60 gen/s on a mid-size machine
  (typed arrays, no per-cell allocation).
- No console errors in a headless Chromium run from `file://`.
- `node --test 'experiments/lichen-lab/*.test.mjs'` passes in under 10 s,
  deterministically, with no network.

## Acceptance scenarios (headless Playwright)

1. Load → soup visible, paused hint shown, no page errors.
2. Drag across the dish → painted cells appear.
3. Space → simulation runs; ages shift colors.
4. Switch rule mid-run (Life → Day & Night) → dish keeps running under the
   new rule without error.
5. Seeds preset at max speed → fireworks; `c` clears everything.
6. `n` while paused advances exactly one generation.
