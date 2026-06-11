# euclid-beats — implementation plan

Vertical slices, pure logic first, acceptance last. Tests live in
`experiments/euclid-beats/euclid-beats.test.mjs` and load the logic block
from `experiments/euclid-beats/index.html` via the shared harness at
`experiments/_harness/logic.mjs`. The logic block is an IIFE exporting
through `globalThis.__logic`.

## Slice 1 — euclid(k, n): the Bjorklund core

- RED: `patternString(euclid(3,8)) === 'x..x..x.'` (tresillo);
  `patternString(euclid(5,8)) === 'x.xx.xx.'` (cinquillo);
  `euclid(4,4)` all hits; `euclid(0,n)` all rests; for a sweep of (k, n)
  the hit count always equals k, length equals n, and `pattern[0] === true`
  whenever k > 0; max-even property: gap sizes between consecutive hits
  differ by at most 1.
- GREEN: minimal `index.html` skeleton containing the
  `<script id="logic">` IIFE with `euclid` and `patternString`.

## Slice 2 — rotate + scheduleTimes

- RED: `rotate` preserves hit count; `rotate(p, n)` and `rotate(p, 0)`
  round-trip; `rotate(p, 1)` moves index 0's value to index 1; negative r
  works; `scheduleTimes(pattern, stepDur, t0)` returns ascending times,
  spacing between hits at indices i, j equals `(j - i) * stepDur`, offsets
  land exactly on hit indices, empty pattern → empty array.
- GREEN: add `rotate` and `scheduleTimes` to the logic block.

## Slice 3 — presets and dice bounds

- RED: `PRESETS` has the six named world rhythms (Tresillo, Cinquillo,
  Khafif, Money, Samba, Bossa), each defining four ring specs `{k, n}` with
  0 ≤ k ≤ n and the headline (k, n) present; `rollRings(rng)` with a seeded
  rng returns four specs inside taste bounds (4 ≤ n ≤ 16, 1 ≤ k ≤ n) and is
  deterministic for a fixed rng.
- GREEN: add `PRESETS` and `rollRings` to the logic block.

## Slice 4 — full visual + audio app

- Build the complete app around the proven logic in the app `<script>`:
  concentric glowing rings on the night palette, hits as lit gems,
  per-ring comet-trail playheads, active-hit flashes, Georgia serif labels,
  preset chips, `?` dice with first-time toast, tempo slider 60–180,
  Space play/pause, `m` mute, right-click removes a hit.
- Web Audio voices (kick sine drop, snare filtered noise, hat short bright
  noise, bell detuned FM ping) driven by a lookahead scheduler
  (~25 ms timer, ~120 ms horizon) using `scheduleTimes` per ring per bar.
- Unit tests stay green (structural test: logic block exports the full
  documented surface).

## Slice 5 — headless acceptance

- Playwright (chromium, file://, 1280×800): pageerror + console-error
  listeners; click to start audio/transport; 3 clicks on the hat ring raise
  its density; preset chip click applies the preset; `?` rerolls all rings;
  Space toggles; tempo slider drags; let it play; capture
  `/tmp/exp-euclid-beats.png`. Zero errors required.

## Out of scope for unit tests

Canvas rendering, Web Audio output, and pointer hit-testing are covered by
the headless acceptance run, not Node unit tests.
