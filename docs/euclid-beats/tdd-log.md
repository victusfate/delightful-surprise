# euclid-beats — TDD log

Tests: `experiments/euclid-beats/euclid-beats.test.mjs` via
`experiments/_harness/logic.mjs`. Run: `node --test 'experiments/euclid-beats/*.test.mjs'`.

## Slice 1 — euclid(k, n) Bjorklund core — DONE

- RED: 6 tests — tresillo `x..x..x.`, cinquillo `x.xx.xx.`, all/none edges,
  full (k, n) sweep for length/count/downbeat, max-even circular-gap
  property, patternString. Failed for the right reason (no index.html).
- GREEN: skeleton index.html with the logic IIFE; paired-run Bjorklund
  matches both canonical strings exactly. 6/6.
- REFACTOR: none needed.

## Slice 2 — rotate + scheduleTimes — DONE

- RED: 6 more tests — count preservation, r=0/r=n round-trips, right-shift
  direction, negative r, hit-time spacing, ascending mapping to
  `t0 + i*stepDur`, empty pattern. Failed: `rotate is not a function`.
- GREEN: both added to the logic block. 12/12.

## Slice 3 — presets + dice bounds — DONE

- RED: 5 more tests — six named world rhythms each carrying their headline
  E(k,n) on a ring, four valid ring specs per preset, seeded-LCG
  determinism for `rollRings`, taste bounds (4 ≤ n ≤ 16, 1 ≤ k ≤ n) across
  200 seeds, structural export surface. Failed: `PRESETS`/`rollRings`
  missing.
- GREEN: PRESETS (rings = kick/snare/hat/bell with groove rotations) and
  voice-weighted `rollRings`. 17/17.

## Slice 4 — full visual + audio app — DONE

Built around the proven logic, single file, file://-safe, zero deps:

- Four concentric glowing rings on the night palette; hits as lit gems
  (diamond + halo), rests as dim dots; comet-trail playhead per ring;
  active hits flash/bloom at their scheduled audio time; Georgia serif
  everywhere (canvas labels show `voice E(k,n)` plus the live
  patternString).
- Web Audio voices: kick (150→42 Hz sine drop), snare (high/band-passed
  noise + triangle body), hat (7.5 kHz+ noise tick), bell (two ±7-cent
  detuned FM carriers, pentatonic per step — the bell plays melodies).
  Compressor glue + feedback-delay air on snare/bell.
- Lookahead scheduler: 25 ms timer, 120 ms horizon; a shared lazy bar
  clock (bar = 4 beats) with per-ring queues built by `scheduleTimes`, so
  rings with different n stay locked to the same bar (polyrhythm by
  construction). Live edits requeue the current bar past the lookahead
  cutoff — no double-fires.
- Controls: preset chips, ? dice (first-roll explainer toast), play/pause
  button + Space, tempo slider 60–180 (applies from the next bar), `m`
  mute, right-click/long-press removes a hit. Audio starts only after the
  first user gesture.

Unit suite stayed green throughout: 17/17, ~115 ms.

## Slice 5 — headless acceptance — DONE

Playwright chromium, `file://`, 1280×800, pageerror + console-error
listeners (any error fails):

- no autoplay before gesture; first click starts the loom and hides intro
- 3 clicks on the hat ring follow k+1-with-wrap; right-click removes one
- Bossa chip applies exactly its four ring specs
- ? rerolls all rings inside taste bounds and shows the explainer toast
- Space pauses and resumes; tempo drag raises BPM
- plays ~4.5 s on Samba, screenshot saved to `/tmp/exp-euclid-beats.png`

Result: **ACCEPTANCE PASSED**, zero page/console errors.

One acceptance-script fix during the run: the first assertion naively
expected hat density to only rise, but Tresillo's hat starts full at
E(8,8), so the spec'd wrap (k+1 past n → 0) took 8 → 0 → 1 → 2. The app was
correct per design; the script now models the wrap.

## Deviations from design.md

- A small read-only `globalThis.__app` handle (ring specs, playing, bpm,
  ring hit-point) was added for the headless acceptance run — not part of
  the logic surface.
- `rollRings(rng)` takes an injected rng so dice bounds are testable
  deterministically; the app passes `Math.random`.
- Tempo changes apply from the next bar boundary (keeps every ring's
  playhead and queue locked to one shared bar clock).
- The bell adds per-step pentatonic pitch (design said "detuned FM ping";
  the detune is there, the melody is a delight bonus).
