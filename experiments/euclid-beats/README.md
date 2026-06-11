# euclid beats — a drum loom

One ancient rule — distribute k hits as evenly as possible across n steps
(the Euclidean rhythm of Bjorklund and Toussaint) — generates a startling
share of the world's grooves. Four concentric glowing rings, four
Web-Audio-synthesized drum voices, one rotating bar.

**Zero dependencies. No build, no network.** Open `index.html` straight from
`file://` and click anywhere to start the loom.

## Rings (inner → outer)

| ring | voice | synthesis |
| --- | --- | --- |
| 1 | kick | pitched-down sine thump |
| 2 | snare | filtered noise burst + tonal body |
| 3 | hat | short bright noise |
| 4 | bell | detuned FM ping (pentatonic, melodic per step) |

Each ring has its own step count n, so different rings make polyrhythms —
every ring completes one bar in the same time. Hits are lit gems; the comet
playhead sweeps all rings and each hit flashes as it sounds.

## Interactions

- **Click anywhere** — first click starts the loom (tresillo, softly).
- **Click a ring** — one more hit: k+1, redistributed evenly (wraps past n
  back to 0).
- **Right-click / long-press a ring** — one fewer hit (k−1, floored at 0).
- **Preset chips** — Tresillo E(3,8), Cinquillo E(5,8), Khafif E(2,5),
  Money E(3,7), Samba E(7,16), Bossa E(5,16).
- **? button** — roll the dice on all four rings. Random Euclidean patterns
  inside taste bounds (sparse kick, busy hat) almost always groove — that's
  the algorithm's magic.
- **Tempo slider** — 60–180 BPM, applied from the next bar.

## Keys

| key | action |
| --- | --- |
| `space` | play / pause |
| `m` | mute / unmute |
| `?` | reroll all rings (same as the dice button) |

## Tests

Pure rhythm math (`euclid`, `rotate`, `patternString`, `scheduleTimes`,
`PRESETS`, `rollRings`) lives in the `<script id="logic">` block and is
unit-tested in Node — no browser needed:

```sh
node --test 'experiments/euclid-beats/*.test.mjs'
```
