# ink-drift — TDD log

Tests: `experiments/ink-drift/ink-drift.test.mjs` via the shared harness
(`experiments/_harness/logic.mjs`). Run:
`node --test 'experiments/ink-drift/*.test.mjs'`.

## Slice 1 — seeded value noise + fbm — DONE

- RED: 6 tests (seed determinism, seed divergence, range [0, 1], variation,
  fbm range + determinism) failed on the empty logic block.
- GREEN: hash-lattice value noise (imul-based integer hash, smoothstep
  interpolation) and normalized fractal sum. 6/6 pass.
- REFACTOR: none needed.

## Slice 2 — curl field — DONE

- RED: 4 tests (finite output, numerical divergence < 1e-3 on a sampled
  grid with matching eps, non-trivial field, analytic check against
  n = x·y ⇒ curl = (x, −y)).
- GREEN: central-difference perpendicular gradient `(∂n/∂y, −∂n/∂x)`.
  10/10 pass.
- REFACTOR: none needed.

## Slice 3 — particle step + palettes — DONE

- RED: 6 tests (purity/no mutation, monotonic speed decay with zero field
  and drag < 1, field-velocity integration over dt, px/py record the
  pre-step position, non-kinematic fields preserved, six named palettes
  with valid hex inks including ember/orchid/lagoon).
- GREEN: Verlet-style `stepParticle` (implicit velocity = x − px, damped by
  drag, field added as vel·dt) plus `PALETTES` lifted from nightbloom.
  16/16 pass.
- REFACTOR: none needed.

## Slice 4 — full app + structural acceptance — DONE

- RED: structural tests — full `__logic` surface; app wiring (canvas,
  `#swatches` row, exactly one app script consuming `globalThis.__logic`).
- GREEN: full prototype in `experiments/ink-drift/index.html`. 18/18 pass.

Final suite: **18/18 pass, ~110 ms**, deterministic, no network, no DOM.

## Acceptance (headless Playwright, file://, 1280×800)

Script drives all four design scenarios: click burst, slow S-shaped lagoon
drag, color switch (sunfall) + second S-drag for marbling, an orchid accent
ribbon, then an idle period. Listeners on `pageerror` and console errors —
zero errors. Pixel probes confirm visible ink after interaction and a
changing canvas during idle (the water stays alive). Final screenshot:
`/tmp/exp-ink-drift.png`. A frame-rate probe with a loaded particle buffer
reported ~60 fps even under headless software rendering.

### Issues found and fixed during acceptance

1. **Flow too fast** — GAIN 11 swept ribbons off-screen within seconds;
   lowered to 7 for a calmer, more meditative current.
2. **Ring-buffer overwrite** — three drags spawned ~5k particles each into
   an 8k buffer, so the newest color silently erased earlier ribbons.
   Raised `MAX_INK` to 14,000 and lowered the pour rate to 34/frame.
3. **Tuning for wispiness** — added small per-step diffusion jitter,
   lowered stroke alpha/width so dense pours read as fibrous ink rather
   than solid blobs.

## Deviations from design.md

- **Particle update inlined in the app**: the render loop uses
  struct-of-arrays typed buffers mirroring the unit-tested `stepParticle`
  math (allocating an object per particle per frame would defeat the
  thousands-at-60fps goal). The pure function remains exported and tested.
- **8-bit fade ghosting**: a pure low-alpha settle never fully erases on an
  8-bit canvas; the settle uses a gentle per-frame fade toward a
  pre-rendered background plus a deeper pass every 10th frame.
- **Ambient motes**: ~320 near-invisible motes ride the current so even
  empty water visibly breathes — an interpretation of "the water is always
  alive, even empty".
- **Ink lifespan 12–20 s** (vs the design's "~10 s" fade): strokes dim
  through three alpha buckets as life decays, so perceived fade matches the
  spirit while compositions persist a little longer.
