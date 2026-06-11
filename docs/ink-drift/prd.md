# ink-drift — PRD

## Problem

Show that a convincing fluid toy — ink dropped into dark water — fits in one
dependency-free HTML file, with its math proven by Node unit tests through
the shared logic-block harness.

## Goals

1. Painting with ink feels alive: hold/drag releases ink that rides a
   divergence-free curl-noise current into ribbons and vortices.
2. The water never dies: with zero input, residual ink keeps swirling and
   fades over ~10 s (the **settle**).
3. Performance is the craft: thousands of ink particles at 60 fps via
   color-batched canvas strokes and a low-alpha fade rect.
4. Pure math (`makeNoise`, `fbm`, `curl`, `stepParticle`) is unit-tested in
   Node via `experiments/_harness/logic.mjs`.

## Non-goals

- Real Navier–Stokes; curl noise fakes the fluid.
- Color blending — colors never mix; marbling comes from interleaving.
- Persistence, sharing, settings, audio, mobile-specific UI.

## Functional requirements

- **FR1 — emission:** while the pointer is held, ink particles spawn each
  frame near the pointer in the active color (continuous emission). A single
  click yields a small burst that drifts downstream.
- **FR2 — current:** every particle is advected by the curl of a seeded,
  time-drifting fbm value-noise field — divergence-free by construction,
  verified numerically in tests.
- **FR3 — comb:** drag direction adds a local impulse to particles near the
  pointer, blended by distance, so the user can comb the water.
- **FR4 — settle:** each frame a low-alpha near-black-blue rect fades the
  canvas, so ribbons linger like real ink and old ink fades over ~10 s.
- **FR5 — color:** number keys `1`–`6` and a clickable swatch row pick the
  ink from the six nightbloom palettes (ember, orchid, lagoon, frost,
  sunfall, spirit). Two colors released near each other interleave without
  blending.
- **FR6 — keys:** `c` clears the water, `s` saves a PNG. Hints rendered in
  Georgia serif; no other chrome.
- **FR7 — idle life:** with no input the field keeps breathing — slow time
  drift in the noise keeps residual ink moving on its own.
- **FR8 — cap:** particle count is bounded (ring buffer / recycle oldest);
  rendering batches strokes by color to one path per color per frame.
- **FR9 — testability:** `makeNoise(seed)`, `fbm(noise, x, y, octaves)`,
  `curl(noiseFn, x, y, eps)`, `stepParticle(p, vel, dt, drag)`, and
  `PALETTES` are exported via `globalThis.__logic` from a single
  `<script id="logic">` IIFE.

## Quality requirements

- 60 fps with thousands of particles on a mid-size window.
- Deterministic, fast unit tests (<10 s, no network, no DOM).
- No console errors in a headless Chromium run from `file://`.

## Acceptance

Headless Playwright run from `file://`: a click burst, a slow S-shaped drag,
a color switch plus second drag, and an idle period produce visible ink,
ongoing motion while idle, and zero page/console errors.
