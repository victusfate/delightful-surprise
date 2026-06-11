# harmonograph — PRD

## Problem

Resurrect the Victorian harmonograph as a single dependency-free HTML file:
two damped pendulums drive a pen in x and y, the machine draws its figure in
real time, and it quietly *sings* the two frequencies it is drawing — so the
user hears why consonant ratios make pretty geometry.

## Goals

1. A living drawing: the pen traces ~60 s of simulated pendulum time over
   ~15 real seconds, then holds the finished plate.
2. Sound as explanation: two quiet sines at audio-scaled pendulum
   frequencies decay with the ink. Consonant ratios sound consonant;
   "drift" beats audibly while its figure precesses.
3. Zero dependencies, zero build, zero network: works from `file://`.
4. Pure pendulum math is unit-testable in Node via the shared logic-block
   harness (`experiments/_harness/logic.mjs`).

## Non-goals

- Persistence, sharing, mobile-specific UI, accessibility audit.
- Physical pendulum simulation (gravity, rod lengths); the closed-form
  damped-sinusoid model is the product.

## Model

Classic harmonograph, closed form:

```
x(t) = Σᵢ Aᵢ·sin(fᵢ·t + φᵢ)·e^(−dᵢ·t)   (xTerms; same form for yTerms)
```

Two terms per axis (4 total). The two main pendulums carry angular
frequencies `p·ω₀` and `q·ω₀` for a named rational ratio `{p, q}` (with
`ω₀ = 1` in logic-space); drift adds a small detune to `q`.

**Period convention (documented, tested):** with unit base frequency the
pendulum angular frequencies are the integers `p` and `q`, so the undamped
figure closes after `period({p, q}) = 2π / gcd(p, q)`. For reduced ratios
this is 2π — e.g. `period({p:1, q:2}) = 2π`, the longer (slower) pendulum's
full cycle. (The design sketch's `2π·p·q/gcd` formula contradicts its own
1:2 example; this convention is the one that matches the example and is the
one shipped.)

## Functional requirements

- **FR1 — ratios:** named ratio chips: unison 1:1, octave 1:2, fifth 2:3,
  fourth 3:4, sixth 3:5, drift 2:3.01 (`{p:2, q:3, detune:0.01}`).
  Fifth is the default on load.
- **FR2 — draw cycle:** any control change (chip, phase, damping, swing)
  restarts the draw. The pen draws 60 s of simulated time in ~15 real
  seconds (4× time scale), then holds the plate.
- **FR3 — controls:** control card bottom-left with ratio chips, a phase
  knob (0–2π), a damping slider (0–0.08), and a "new swing" button that
  re-randomizes amplitudes/phases tastefully (deterministic given its rng).
- **FR4 — sound:** two sines at `110·p` Hz and `110·(q+detune)` Hz, very
  quiet, with the same exponential decay as the pendulums (time-scaled to
  real seconds). Damping 0 sustains the dyad; drift beats. Audio starts
  only after a user gesture. `m` toggles mute.
- **FR5 — keys:** `s` saves the canvas as PNG, `m` mutes, `n` = new swing.
- **FR6 — aesthetic:** ivory ink with a subtle hue shift along its length
  on near-black; pen tip is a small bright bead with a faint glow; serif
  control card, unobtrusive, consistent with nightbloom.
- **FR7 — testability:** the logic block exports `pendulumPoint`,
  `makeParams`, `isClosed`, `period`, `gcd`, `RATIOS`, and `mulberry32`
  via `globalThis.__logic` (IIFE-wrapped).

## Pure-logic surface

- `pendulumPoint(t, params)` → `{x, y}` for
  `params = {xTerms: [{A, f, phi, d}…], yTerms: […]}`.
- `makeParams(ratio, opts, rng)` → tasteful params for a named ratio;
  deterministic given `rng`; the f-quotient of the two x terms equals
  `p / (q + detune)`.
- `isClosed(params, T, eps)` → with zero damping, does the figure repeat
  with period T? (Checked at several sample offsets, not just t=0, so a
  curve that merely passes through its start does not count as closed.)
- `period(ratio)` → `2π / gcd(p, q)` (see Period convention).
- `RATIOS` → the named ratio list.
- `mulberry32(seed)` → small deterministic rng for swings and tests.

## Quality requirements

- 60 fps on a mid-size window; ink accumulates on an offscreen plate
  canvas so cost per frame is bounded.
- `node --test experiments/harmonograph/` passes, deterministic, < 10 s.
- No console errors in a headless Chromium run from `file://`.

## Acceptance

Headless Playwright run: page loads with no errors; the fifth draws
substantially; clicking "drift" restarts the draw with the detuned ratio;
dragging damping to 0 yields a sustaining, closing figure; "new swing"
5× produces distinct plates of the same ratio family; `s`/`m` do not
throw. Final screenshot saved.
