# boid-lagoon — implementation plan

Vertical slices, pure logic first, acceptance last. Tests live in
`experiments/boid-lagoon/boid-lagoon.test.mjs` and load the single
`<script id="logic">` block from `experiments/boid-lagoon/index.html` via
the shared harness (`experiments/_harness/logic.mjs`). Each slice is
RED → GREEN → (REFACTOR).

## Slice 1 — vector hygiene: `limit` and `clampSpeed`

- RED: `limit(v, max)` leaves short vectors alone, scales long ones to
  `max` preserving direction; `clampSpeed(v, min, max)` never returns a
  speed outside [min, max] and preserves direction for nonzero v; the
  zero vector gets a deterministic nonzero fallback at `min` (fish never
  stall).
- GREEN: implement both in a minimal logic block exporting
  `globalThis.__logic`.

## Slice 2 — the three rules: `separation`, `alignment`, `cohesion`

- RED: cohesion steers toward the neighbor centroid; separation steers
  away from a too-close neighbor; alignment's steering matches the average
  heading direction; all three return `{x:0, y:0}` with no neighbors.
- GREEN: implement the three steering functions.

## Slice 3 — threats: `flee`

- RED: `flee(boid, threat, radius)` is exactly zero beyond `radius`;
  inside it is nonzero and points away from the threat (positive dot
  product with boid−threat); closer threat → stronger flee.
- GREEN: implement `flee` with inverse-distance falloff.

## Slice 4 — integration: `stepBoid` and school invariants

- RED: `stepBoid(boid, neighbors, env, weights, dt)` returns a *new* boid
  (input untouched) with speed in [min, max]; a 30-fish school stepped
  600 times in a 800×600 lagoon stays strictly inside bounds with every
  fish's speed in [min, max] the whole way; food in `env` pulls a lone
  boid toward it; a predator in `env` pushes a nearby boid away.
- GREEN: implement `stepBoid` — weighted sum of the rules + flee + seek +
  soft wall avoidance, integrate, clamp speed, advance wiggle phase.

## Slice 5 — the lagoon (visual app + acceptance)

- Build the full app around the proven logic in the app `<script>`:
  teal-black gradient water, animated god-rays, glowing chevron fish with
  tail wiggle, sinking food motes, the red-eyed predator, bubbles, serif
  title/hints, Web-Audio pad + plinks + sub swell (gesture-gated), keys
  `m` `+` `-`.
- Acceptance: headless Playwright from `file://` — drive every scenario
  from the design (pointer move, hold to feed, tap for predator, resize
  school), assert zero page/console errors, screenshot at 1280×800.

## Out of scope for unit tests

Canvas rendering, audio, and input handling are verified by the headless
acceptance run, not unit tests.
