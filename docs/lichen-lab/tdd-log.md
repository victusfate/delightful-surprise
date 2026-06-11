# lichen-lab — TDD log

Tests: `experiments/lichen-lab/lichen-lab.test.mjs` (17 tests), loading the
logic block from `experiments/lichen-lab/index.html` via
`experiments/_harness/logic.mjs`. Full suite runs in ~100 ms,
deterministic, no network.

## Slice 1 — rule parsing — DONE

- RED: 5 tests — Life round-trip, Seeds empty survive, case tolerance,
  malformed rejection (`banana`, `''`, `B3`, `S23/B3`, `B3/S23/X`, `B9/S2`),
  six unique temperament presets. 4 failed on missing exports; the
  malformed-rejection test passed vacuously (calling an undefined function
  throws a `TypeError`, which is an `Error`) — noted, accepted.
- GREEN: `parseRule` (single regex, `[0-8]*` digit classes) + `PRESETS`.

## Slice 2 — toroidal neighbors and step — DONE

- RED: 7 tests — (0,0)↔(w−1,h−1) wrap, full Moore count of 8, blinker
  period 2, block still life, glider translates (1,1)/4 gens, Seeds has
  zero survivors, `step` returns a fresh 0/1 `Uint8Array` without mutating
  input. All 7 failed for missing exports.
- GREEN: `countNeighbors` plus a `step` with row-offset precomputation and
  zero per-cell allocation (lean enough for 160×100 @ 60 gen/s).

## Slice 3 — age tick — DONE

- RED: 2 tests — born→1 / survivor +1 / dead→0, and purity (no input
  mutation, fresh output array).
- GREEN: `ageTick` allocating one same-typed array per generation.

## Slice 4 — structural acceptance — DONE

- RED: 3 tests — full export surface, IIFE leaks nothing but `__logic`,
  and app wire-up (an app `<script>` consuming `globalThis.__logic`, a
  canvas, a `#rule` input). Only the wire-up test failed (the app didn't
  exist yet); the surface tests were already satisfied by slices 1–3.
- GREEN: the full prototype commit (`feat(lichen-lab): full prototype …`)
  doubles as this slice's green — the app is the wire-up.

## Final unit-test status

17/17 passing — `node --test 'experiments/lichen-lab/*.test.mjs'`.

## Headless acceptance (Playwright, file://, 1280×800)

Throwaway script; `pageerror` + console-error listeners armed (any error
fails the run). All scenarios PASS, zero errors:

- load: soup simmering (pop ~1600), paused, hint visible
- `c`: dish wiped (pop 0, gen 0)
- drag: painted cells appear; title overlay dismissed
- `n` while paused: exactly one generation
- space: runs; paused hint truly hidden
- mid-run switch Life → Day & Night via the "tidal" chip: rule applied,
  still running
- Seeds at 60 gen/s: ~60 gens/s observed; one `c` calms everything
- typed rules: `banana` rejected with error styling, previous rule kept;
  `b3/s23` accepted and normalized
- beauty state: jittered lattice of ragged colonies grown under Coral
  (~240 gens) — ember cores, violet midbands, newborn-teal fringes —
  screenshot saved to `/tmp/exp-lichen-lab.png`

## Fixes found by acceptance

- Paused hint used opacity alone to hide; Playwright (correctly) still
  treated it as visible. Added `visibility: hidden` after the fade
  (`fix(lichen-lab): fully hide paused hint while running`).

## Deviations from design

- None of substance. Interpretations made in the spirit of the doc:
  - Temperament labels chosen: orderly (Life), mutinous (HighLife),
    explosive (Seeds), tidal (Day & Night), crystalline (Maze),
    accretive (Coral) — design named three; the rest follow the pattern.
  - Slice 4 RED was red only on the wire-up assertion; the export-surface
    assertions were already green from earlier slices (expected for a
    structural slice).
  - Ghost fade decays per generation (×0.86) rather than per frame, so
    ghost behavior stays deterministic relative to the simulation.
