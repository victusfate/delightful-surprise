# harmonograph — TDD log

Tests: `experiments/harmonograph/harmonograph.test.mjs` (loads the logic
block from `index.html` via `experiments/_harness/logic.mjs`).
Run: `node --test 'experiments/harmonograph/*.test.mjs'` — **14/14 pass,
~0.1 s**.

## Slices

| slice | behavior | red | green | refactor |
| --- | --- | --- | --- | --- |
| 1 | `RATIOS`, `gcd`, `period` convention | ✅ failed: no index.html | ✅ 3/3 | — |
| 2 | `pendulumPoint` values + decay envelope | ✅ failed: not exported | ✅ 6/6 | — |
| 3 | `isClosed` periodicity at the ratio period | ✅ failed: not exported | ✅ 9/9 | — |
| 4 | `makeParams` determinism, f-quotient, damping pass-through; `mulberry32`; export surface | ✅ failed: not exported | ✅ 14/14 | — |
| 5 | full visual app (acceptance, not unit-tested) | — | ✅ Playwright clean | tuned `DRAW_BASE`/ink after first screenshot |

## Acceptance (headless Chromium via Playwright, `file://`)

All checks passed, no page or console errors:

- loads with the fifth, drawing starts immediately
- figure progresses (~18 s of sim time after 4 real s) with real ink on
  the plate (pixel sampling)
- **drift** chip restarts the draw with the detuned ratio
- damping slider to 0 restarts undamped; in-page `isClosed` confirms the
  undamped fifth closes at `period(fifth)`
- **new swing** ×5 yields five distinct seeds, ratio family unchanged
- `m` toggles mute, `s` saves without throwing
- dyad audio runs only after the first gesture (autoplay policy honored)
- final screenshot: `/tmp/exp-harmonograph.png` (1280×800)

## Deviations from design.md

1. **Period formula.** The design asks to assert
   `period = 2π·p·q / gcd(p,q)` *and* `period({p:1,q:2}) = 2π` — these
   contradict each other (the formula gives 4π for 1:2). Shipped the
   convention that matches the design's own example: pendulum angular
   frequencies are the integers `p` and `q` on a unit base, so
   `period({p,q}) = 2π / gcd(p,q)`; the 1:2 figure closes after the
   longer pendulum's full cycle. Documented in the PRD and the logic block.
2. **Dyad timbre.** The design says "two very quiet sines". Two *pure*
   sines at a mistuned 2:3 share no partials, so drift would barely beat.
   Each voice is a near-sine `PeriodicWave` with a whisper of low-order
   harmonics — the 3rd partial of 220 Hz and 2nd of 331.1 Hz beat at
   ~2.2 Hz, so drift audibly shimmers while consonant ratios fuse. Volume
   and character stay quiet and sine-like.
3. **Phase knob.** Rendered as a slim slider (0–360°) on the control card
   rather than a rotary widget; it sets the lead-pendulum x/y phase
   relation (90° at unison = circle, 0° = line).
4. **`n` key** added as a keyboard shortcut for "new swing" (not in the
   design, harmless convenience; documented in the README).
5. **isClosed strictness.** Closure is checked at several time offsets,
   not just t=0, so a curve that merely passes through its start point at
   T/2 is not falsely "closed" — this is what makes the design's
   "false at T/2" assertion robust for arbitrary phases.

## Notes

- `makeParams` accepts `opts.base`; logic-space uses base 1 (tests), the
  app draws with `DRAW_BASE = 2.1` rad/s per ratio unit for denser plates
  and sings with `AUDIO_BASE = 110` Hz per ratio unit.
- The audio gain ramp uses `exponentialRampToValueAtTime` to the exact
  `e^(−d·60)` endpoint over the 15 s draw — the chord and the ink share
  the same decay law. At damping 0 the chord sustains, as in scenario 3.
