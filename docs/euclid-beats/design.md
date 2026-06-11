# euclid-beats — design

## Concept

A drum loom. The Euclidean rhythm algorithm (Bjorklund/Toussaint) distributes
k hits as evenly as possible across n steps — and that single rule generates
a startling share of the world's rhythms (tresillo, cinquillo, bossa…). Four
concentric rings, four synthesized drums, all driven by one ancient idea.

## Q&A (auto-resolved)

**Q: Core interaction?** Four concentric rings = four voices (kick, snare,
hat, bell). Each ring shows n step-cells; filled cells are hits. Click a ring
to give it one more hit (k+1, wrapping); right-click/long-press removes one.
A rotating playhead sweeps all rings in sync. Space toggles play.

**Q: Drums?** Synthesized: kick = pitched-down sine thump; snare = filtered
noise burst; hat = short high noise; bell = detuned FM ping. No samples.

**Q: Presets?** A named dropdown of world rhythms: Tresillo E(3,8), Cinquillo
E(5,8), Khafif E(2,5), Money E(3,7), Samba E(7,16), Bossa E(5,16) — each
labels which ring gets what.

**Q: What's surprising?** A "?" button rolls dice on all four rings and the
result almost always grooves — that's the algorithm's magic, and the UI says
so the first time.

## Pure logic

- `euclid(k, n)` — boolean array, Bjorklund distribution, hits as even as
  possible, `pattern[0] === true` when k > 0.
- `rotate(pattern, r)` — circular rotation.
- `patternString(pattern)` — `'x..x..x.'` notation for tests/UI.
- `scheduleTimes(pattern, stepDur, t0)` — absolute hit times for one bar.

### Tests must assert

- `patternString(euclid(3,8)) === 'x..x..x.'` (tresillo).
- `patternString(euclid(5,8)) === 'x.xx.xx.'` (cinquillo).
- `euclid(4,4)` all hits; `euclid(0,n)` none; counts always equal k.
- `rotate` preserves count and round-trips at r=n.
- `scheduleTimes` spacing equals stepDur and offsets land on hit indices.

## Vocabulary

| term | meaning |
| --- | --- |
| **ring** | one voice's circular step display |
| **hit / rest** | true / false cell in a pattern |
| **playhead** | the rotating radius sweeping all rings |
| **bar** | one full rotation; all rings share n=16 grid time but may have different n? No — each ring has its own n; rotations align at the bar |

Decision: rings may have different n (polyrhythm!); the bar is the loop of
each ring independently — playheads per ring, one global tempo in steps/sec
scaled so each ring completes in the same bar length.

## Scenarios

1. Load → tresillo preset playing softly after first gesture.
2. Click hat ring 3× → density rises, groove shifts evenly each time.
3. `?` → all rings reroll (k, n within taste bounds), instant new groove.
4. Tempo slider 60–180 BPM; `m` mutes.

## Aesthetic

Rings as glowing arcs on the night palette; hits are lit gems, the playhead
leaves a brief comet trail; the active hit flashes. Serif labels.
