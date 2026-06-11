# ink-drift — implementation plan

Vertical slices, pure logic first, acceptance last. Tests live in
`experiments/ink-drift/ink-drift.test.mjs` and load the logic block from
`experiments/ink-drift/index.html` via `experiments/_harness/logic.mjs`.
Run: `node --test 'experiments/ink-drift/*.test.mjs'`.

## Slice 1 — seeded value noise + fbm

- RED: `makeNoise(seed)` returns a function; same seed ⇒ identical values
  on a sample grid; two different seeds differ somewhere; outputs in [0, 1].
  `fbm(noise, x, y, octaves)` also stays in [0, 1] across a grid and varies
  (not constant).
- GREEN: implement hash-based value-noise lattice with smooth interpolation
  and a normalized fractal sum in the `<script id="logic">` IIFE; export via
  `globalThis.__logic`.

## Slice 2 — curl field, divergence-free

- RED: `curl(noiseFn, x, y, eps)` returns `{vx, vy}`; numerical divergence
  `|∂vx/∂x + ∂vy/∂y| < 1e-3` for a sample of points using the same eps;
  field is non-trivial (some |v| > 0).
- GREEN: central-difference perpendicular gradient `(∂n/∂y, −∂n/∂x)`.

## Slice 3 — particle step + palettes

- RED: `stepParticle(p, vel, dt, drag)` is pure (returns a new particle,
  input untouched); with zero velocity field and drag < 1, speed decays
  monotonically toward 0; position integrates velocity; previous position
  `px, py` records the pre-step position. `PALETTES` exports six named
  nightbloom-style palettes with valid hex colors.
- GREEN: implement the pure update and palette table in the logic block.

## Slice 4 — full visual app + acceptance

- Build the app script around the proven logic: canvas, settle fade rect,
  pointer emission + comb impulse, swatch row, keys (`1`–`6`, `c`, `s`),
  particle ring buffer, color-batched stroke rendering, idle drift.
- Acceptance: structural unit test (logic block exports the documented
  surface) plus headless Playwright run from `file://` — click burst,
  S-shaped drag, color switch, second drag, idle period; zero page errors;
  screenshot saved.

## Out of scope for unit tests

Canvas rendering, pointer handling, and the render loop are covered by the
Playwright acceptance run, not Node unit tests.
