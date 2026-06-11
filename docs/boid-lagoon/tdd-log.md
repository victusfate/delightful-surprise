# boid-lagoon — TDD log

Tests: `experiments/boid-lagoon/boid-lagoon.test.mjs` (21 tests) against the
`<script id="logic">` block in `experiments/boid-lagoon/index.html`, loaded
via `experiments/_harness/logic.mjs`. Full suite runs in ~0.2 s.

## Slice 1 — vector hygiene: `limit`, `clampSpeed` — DONE

- RED: 7 tests — limit passes short vectors through and scales long ones to
  max preserving direction; clampSpeed passes in-range speeds, scales fast
  and slow vectors to the boundary preserving direction, gives the zero
  vector a deterministic fallback at min, and never escapes [min, max]
  across a 50-point sweep. Failed on missing index.html (right reason).
- GREEN: minimal logic block with both functions. 7/7.

## Slice 2 — the three rules — DONE

- RED: 5 tests — cohesion points into the centroid quadrant; separation
  points away from a close neighbor and falls off with distance; alignment
  steers toward the average heading; all three return {0,0} with no
  neighbors. 5 failed (functions absent).
- GREEN: inverse-square separation, velocity-matching alignment,
  centroid-seeking cohesion. 12/12.

## Slice 3 — threats: `flee` — DONE

- RED: 3 tests — exactly zero beyond radius (including just past it),
  nonzero away-vector inside, closer threat → stronger flee. 3 failed.
- GREEN: normalized away-vector scaled by linear proximity. 15/15.

## Slice 4 — integration: `stepBoid` + school invariants — DONE

- RED: 6 tests — exported `WEIGHTS` sanity; stepBoid returns a new boid and
  never mutates the input (wiggle advances, hue carries); speed always in
  [minSpeed, maxSpeed] including from the zero vector; food in env pulls a
  lone boid toward it; a predator in env pushes a nearby boid away; a
  30-fish school stepped 600 times (deterministic LCG seeding, dt = 1/60,
  800×600 lagoon) stays inside bounds with in-range speed at every step.
  6 failed.
- GREEN: weighted rule sum + nearest-food seek + pointer curiosity capped
  by `maxForce`; uncapped flee and soft wall repulsion on top; speed clamp;
  a 2 px clamp-and-reflect backstop so the bounds invariant is strict (the
  soft walls dominate visually; the backstop is glass). 21/21.

## Slice 5 — the lagoon (visual app + acceptance) — DONE

- Full app around the untouched logic block: teal-black water gradient,
  additive god-rays with surface shimmer, glowing chevron fish (per-fish
  size from hue, tail wiggle from the wiggle phase), sinking food motes,
  red-eyed predator with sub-swell entrance and sink-away exit, rising
  bubbles, eat sparkles + plinks, underwater noise-and-sine pad
  (gesture-gated), vignette, Georgia-serif title/hints/toast, keys
  `m` `+` `-` (school clamped to [20, 120]).
- REFACTOR (committed after a first passing acceptance run): brighter rays,
  surface shimmer band, vignette, fish size variance.

## Acceptance (headless Chromium via Playwright, 1280×800, file://)

Script drove all four design scenarios with pageerror + console-error
listeners armed:

- pointer sweep across the lagoon — no errors;
- press-and-hold 1.6 s — food spawned (9–11 motes), no predator from a
  hold, and the school ate everything within 4 s of release;
- quick tap — predator spawned, hunted, despawned after its ~8 s hunt +
  sink-away; fish count still 60 (nobody caught);
- `+`/`-` — 60 → 80 (toast "80 fish"), clamped at 120 and at 20;
- `m` toggled, then several seconds of free evolution.

Result: zero page errors, zero console errors, both before and after the
visual polish. Screenshot: `/tmp/exp-boid-lagoon.png`.

## Deviations from design

- `stepBoid` adds a 2 px clamp-and-reflect backstop at the walls on top of
  the spec'd soft repulsion, so "stays inside bounds" is a hard invariant
  rather than a probabilistic one. Soft repulsion still does the visible
  steering.
- `env` gained an optional `pointer` field (design lists `{food[],
  predator?, bounds}`) to implement FR3 curiosity inside the pure step.
- The app exposes a read-only `globalThis.__lagoon` (fish/food/predator
  counts) solely so the headless acceptance can assert state.
- Default tuning is exported as `WEIGHTS` so tests and app share one truth.
