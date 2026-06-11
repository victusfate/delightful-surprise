# pocket-orrery — PRD

## Problem

Demonstrate that real Newtonian n-body mechanics can be a toy: a single
dependency-free HTML file where the user composes music by flinging planets
into orbit around a burning sun, following the repo's testable
single-file-experiment pattern.

## Goals

1. A pocket solar system: press-drag-release flings a planet; real gravity
   decides whether it orbits, collides, or escapes.
2. Stable orbits become melody — each planet hums a pentatonic note every
   time it completes a revolution, so resonant systems play rhythms.
3. Zero dependencies, zero build, zero network: `open index.html` is the
   entire install story; works from `file://`.
4. Pure physics and music-mapping logic is unit-testable in Node via the
   shared logic-block harness (`experiments/_harness/logic.mjs`).

## Non-goals

- Persistence, sharing, presets, relativistic or 3D physics.
- Mobile-specific UI, settings panels, accessibility audit.
- Astronomical realism beyond Newton's law of gravitation.

## Functional requirements

- **FR1 — sun:** a fixed sun (`bodies[0]`, `fixed: true`) burns at the
  viewport center with a corona gradient. It attracts everything and never
  moves.
- **FR2 — fling:** pointer press sets the spawn point; dragging shows an
  aiming line plus a predicted-path ghost (forward-simulated with the same
  integrator); release births a planet with v₀ = drag vector × constant.
- **FR3 — physics:** semi-implicit Euler at fixed dt; every body attracts
  every body via `gravityAccel`; `stepBodies` advances the system. A
  softening term prevents singular forces at tiny separations.
- **FR4 — merging:** when two bodies overlap, `mergeBodies` combines them —
  mass sums exactly, momentum is conserved exactly, radius scales as
  mass^(1/3). Merging into the sun grows the sun. A flash and a low thump
  accompany every merge.
- **FR5 — culling:** bodies farther than ~3× the viewport diagonal from the
  sun are removed silently.
- **FR6 — winding & notes:** each planet accumulates winding angle around
  the sun via `orbitCount`; every completed 2π revolution plays its note
  exactly once. `noteForMass` assigns a pentatonic degree, heavier → lower
  or equal note.
- **FR7 — trails:** each planet leaves a faded trail (~200 points) tinted
  with its hue.
- **FR8 — keys:** `c` clears all planets, `m` toggles mute. A serif hint
  line shows the controls; the intro UI fades after the first fling.
- **FR9 — audio:** WebAudio only after the first user gesture (autoplay
  policy). Pentatonic orbit notes, low thump on merge.
- **FR10 — testability:** `stepBodies`, `gravityAccel`, `mergeBodies`,
  `orbitCount`, `noteForMass` are exported from the single
  `<script id="logic">` block via `globalThis.__logic` (IIFE-wrapped).

## Quality requirements

- 60 fps target with a dozen planets; trail and body arrays bounded and
  self-pruning.
- Deterministic, fast unit tests (<10 s, no network, no browser).
- No console errors or page errors in a headless Chromium run from `file://`.
- A body launched at circular-orbit speed `sqrt(G*M/r)` stays within ±5% of
  its radius over many steps.

## Acceptance

Headless Playwright run from `file://`: a tangential drag yields a planet in
a sustained orbit; a radial drag yields a sun-fall merge (sun mass grows,
body count returns to baseline); a wild fling either escapes (culled) or
survives as a comet ellipse; trails render; zero page/console errors.
