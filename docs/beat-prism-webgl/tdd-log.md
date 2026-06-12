# TDD log: beat-prism-webgl

## Slice 1 — pass plan core (order, gating, minimal plan)
- Status: done
- Notes: `buildPassPlan` + `passLive` in `__logic`; fold passes carry a
  `members` array (observable gating without uniform math, which lands in
  slice 2). 82 tests green.

## Slice 2 — fold uniforms + geometry matrix
- Status: done
- Notes: `colorFoldUniforms` (parity transfer curves + GL-native
  `levels` posterize hook), `overlayFoldUniforms`, `geometryMatrix`
  (column-major mat3, 2D ctx-transform op order, parity amplitudes),
  `mat3mul`. Plan input grew `hueBase`, `joltDir`, `shake`, and
  `scheduled.lbPos` — design.md contract updated alongside. 93 green.
