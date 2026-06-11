# lichen-lab — implementation plan

Pure logic first, acceptance last. Tests live in
`experiments/lichen-lab/lichen-lab.test.mjs` and load the logic block from
`experiments/lichen-lab/index.html` via `experiments/_harness/logic.mjs`.
The logic block is an IIFE exporting through `globalThis.__logic`.

## Slice 1 — rule parsing

- RED: `parseRule('B3/S23')` → birth {3}, survive {2,3}; `parseRule('B2/S')`
  → survive empty (Seeds); tolerant of case (`b36/s23`); round-trips Life
  and Seeds; `parseRule('banana')` throws an `Error` with a clear message.
- GREEN: implement `parseRule` in the logic block; export `PRESETS` (six
  temperament-labeled rules) and verify each parses.

## Slice 2 — neighbors and step

- RED: `countNeighbors` counts the toroidal Moore neighborhood — a cell at
  (0,0) neighbors (w−1, h−1); `step` under Life: blinker oscillates with
  period 2; block (2×2) is a still life; glider translates by (1,1) after
  4 generations (toroidal); any pattern under Seeds has zero survivors next
  generation; `step` returns a fresh `Uint8Array` of 0/1 only.
- GREEN: implement `countNeighbors` and `step` with typed arrays and no
  per-cell allocation.

## Slice 3 — age tick

- RED: `ageTick(ages, before, after)` — born cells get age 1, survivors
  increment, dead reset to 0; input arrays are not mutated.
- GREEN: implement `ageTick` as a pure function.

## Slice 4 — structural acceptance

- RED: exactly one logic block; the harness loads it; every documented
  export (`parseRule`, `step`, `countNeighbors`, `ageTick`, `PRESETS`)
  exists with the right type; `PRESETS` covers the six designed rules with
  unique temperament labels.
- GREEN: wire-up fixes if any.

## Then (not unit-tested — verified by headless acceptance)

- Full visual app around the proven logic: dark glass petri dish with
  vignette, soft-glow rounded cells colored by age (teal → violet → ember),
  fading blue ghosts, temperament preset chips, rule input with error
  state, speed slider, Space/`n`/`c`/`e` keys, paint/erase drag, faint
  starting soup, Georgia serif UI consistent with nightbloom.
- README.
- Headless Playwright acceptance run of the PRD scenarios from `file://`,
  with a saved screenshot.
