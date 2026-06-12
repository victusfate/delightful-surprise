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

## Slice 3 — GL skeleton renders the show
- Status: done
- Notes: main canvas is WebGL2 (one shared quad VS with uMatrix; SHADERS
  registry keyed by program; glRender executes the plan subset that has
  programs, so families come alive per slice). Source upload is the 2D
  `src` canvas — video never enters GL at 4K, passes run at canvas res.
  #nogl fallback, context-lost/restored rebuild, ping-pong realloc on
  resize (old targets deleted). Scene sims extracted to `ageScene`; pulse
  decay moved into the frame loop. 2D draw functions are dead code until
  slice 9; `s` save-PNG temporarily unreliable (GL buffer not preserved)
  — fixed in slice 9. Added an app-script parse test. 97 green.

## Slice 4 — non-affine geometry programs
- Status: done
- Notes: base pass forks by program (kaleido/tile/slice/vslice, 2D
  priority chain); pixelate is a `uBlock` UV-quantizer in FS_COMMON and
  rides any variant. Kaleidoscope upgraded to true aspect-corrected polar
  mirroring (per the color/perceptual emphasis). `sliceSeed` joined the
  plan input. glRender now feeds frame-global uRes/uT. 101 green.

## Slice 5 — color passes
- Status: done
- Notes: folded `color` transfer (brightness/saturation/hueRotate/gray/
  contrast/true-posterize/invert/flash in one shader — the ctx.filter
  stack replacement) + heavy programs. GL-native upgrades landed here per
  the emphasis: real RGB-split chroma, true channel rotation, palette
  thermal, edge-difference neon. `SOLO_UNIFORMS` synthesizers; chroma
  pass omitted when bass-driven split is sub-pixel. 104 green.
