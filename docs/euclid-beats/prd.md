# euclid-beats — PRD

## Problem

Show that one ancient idea — distribute k hits as evenly as possible across
n steps (Bjorklund / Toussaint's Euclidean rhythms) — generates a startling
share of the world's grooves, in a single dependency-free HTML file that is
beautiful enough to demo and tight enough to dance to.

## Goals

1. A drum loom: four concentric rings, four synthesized voices (kick, snare,
   hat, bell), one rotating bar. Every click reshapes the groove instantly.
2. Zero dependencies, zero build, zero network: `open index.html` from
   `file://` is the entire install story.
3. Pure rhythm math is unit-testable in Node via the shared logic-block
   harness (`experiments/_harness/logic.mjs`).
4. The "?" dice roll demonstrates the surprise: random Euclidean patterns
   almost always groove, and the UI says so the first time.

## Non-goals

- Persistence, sharing, MIDI, samples, recording, mobile-specific layout.
- Sequencer features beyond Euclidean k/n/rotation per ring (no per-step
  velocity editing, no swing controls).

## Functional requirements

- **FR1 — rings:** four concentric rings, inner→outer = kick, snare, hat,
  bell. Each ring renders its own n step-cells; hits are lit gems, rests are
  dim cells. Each ring has its own playhead; all rings complete one bar in
  the same wall-clock time (polyrhythm by construction).
- **FR2 — edit:** left-click/tap a ring adds one hit (k+1, wrapping past n
  back to 0); right-click (or long-press) removes one (k−1, floored at 0,
  wrapping from 0 to n is not performed — only the add path wraps). The new
  pattern is always `euclid(k, n)` rotated by the ring's current rotation.
- **FR3 — transport:** Space (and a visible button) toggles play/pause.
  Audio only ever starts after a user gesture. Scheduling uses an
  AudioContext lookahead loop (timer interval ≈25 ms, lookahead ≈120 ms) so
  timing is sample-accurate, not rAF-quantized.
- **FR4 — voices:** all synthesized via Web Audio, no samples:
  kick = pitched-down sine thump; snare = band/high-passed noise burst;
  hat = very short bright noise; bell = detuned FM ping.
- **FR5 — presets:** named chips: Tresillo E(3,8), Cinquillo E(5,8),
  Khafif E(2,5), Money E(3,7), Samba E(7,16), Bossa E(5,16). Each preset
  assigns sensible patterns to all four rings (the headline pattern goes to
  its featured ring; companions keep the groove).
- **FR6 — dice:** a "?" button rerolls all four rings with random (k, n)
  inside taste bounds (n ∈ {4..16}, 0 < k ≤ n, voice-weighted so kick stays
  sparse and hat stays busy). First roll shows a one-time toast explaining
  the algorithm's magic.
- **FR7 — tempo & mute:** slider 60–180 BPM, live; `m` toggles the master
  bus.
- **FR8 — scenario 1:** on load the tresillo preset is armed; the first
  user gesture (click/Space) starts it playing softly.
- **FR9 — testability:** `euclid(k, n)`, `rotate(pattern, r)`,
  `patternString(pattern)`, and `scheduleTimes(pattern, stepDur, t0)` are
  exported from the single `<script id="logic">` block via
  `globalThis.__logic` (IIFE-wrapped).

## Pure-logic contracts

- `euclid(k, n)` → boolean array, length n, exactly k `true`, Bjorklund
  max-even distribution, `pattern[0] === true` whenever k > 0.
  Known: `euclid(3,8)` = `x..x..x.`, `euclid(5,8)` = `x.xx.xx.`,
  `euclid(4,4)` all hits, `euclid(0,n)` all rests.
- `rotate(pattern, r)` → circular right-rotation by r steps; preserves hit
  count; `rotate(p, n)` round-trips; handles negative r.
- `patternString(pattern)` → `'x..x..x.'` notation.
- `scheduleTimes(pattern, stepDur, t0)` → ascending absolute times
  `t0 + i*stepDur` for each hit index i.

## Quality requirements

- 60 fps rendering target; canvas redraw is bounded (4 rings ≤ 16 steps).
- No console or page errors in a headless Chromium run from `file://`.
- `node --test 'experiments/euclid-beats/*.test.mjs'` passes, deterministic,
  < 10 s.

## Aesthetic

Night palette (deep indigo field), rings as glowing arcs, hits as lit gems
in each voice's hue, per-ring playhead with a brief comet trail, active hits
flash and bloom on trigger. Georgia serif labels and chips, echoing
nightbloom's typography.

## Acceptance

Headless Playwright: load via `file://`, click to start, click rings to add
hits (density rises), apply a preset chip, hit `?` (all rings reroll within
taste bounds), Space pauses/resumes, drag tempo slider — all with zero page
errors, and a final screenshot worth showing off.
