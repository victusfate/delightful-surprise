# ink-drift — design

## Concept

Ink dropped into dark water. A divergence-free curl-noise current field
carries thousands of particles into ribbons and vortices that never repeat.
The user paints by releasing ink and steering the current.

## Q&A (auto-resolved)

**Q: Core interaction?** Hold/drag to release ink at the pointer (continuous
emission while held). The drag direction adds a local impulse to nearby
particles, so you can comb the water. Number keys or a small swatch row pick
the ink color; `c` clears; `s` saves PNG.

**Q: How is the fluid faked?** Curl noise: take a scalar fbm noise field
n(x, y, t), the velocity is its perpendicular gradient
(∂n/∂y, −∂n/∂x) — automatically divergence-free, looks uncannily like
water. Slow time drift keeps it alive.

**Q: Rendering?** Particles drawn as 1–2px translucent strokes from previous
to current position; the canvas fades by drawing a low-alpha dark rect each
frame, so ribbons linger like real ink.

**Q: What's surprising?** Leave it alone for 20 seconds and the residual ink
keeps swirling on its own — the water is always alive, even empty.

## Pure logic

- `makeNoise(seed)` — returns deterministic 2D value-noise function
  `noise(x, y)` in [0, 1] (hash-based gradients or value lattice, seeded).
- `fbm(noise, x, y, octaves)` — fractal sum, still in [0, 1].
- `curl(noiseFn, x, y, eps)` — numerical perpendicular gradient `{vx, vy}`.
- `stepParticle(p, vel, dt, drag)` — pure position/velocity update.

### Tests must assert

- Same seed ⇒ identical noise values; different seeds differ somewhere.
- `noise` and `fbm` outputs within [0, 1] across a sample grid.
- Numerical divergence of the curl field ≈ 0 (|∂vx/∂x + ∂vy/∂y| < 1e-3
  for sampled points, using the same eps).
- `stepParticle` with zero velocity field and drag < 1 decays speed.

## Vocabulary

| term | meaning |
| --- | --- |
| **current** | the curl-noise velocity field |
| **ink** | a particle `{x, y, px, py, hue, life}` |
| **comb** | pointer-drag impulse blended into nearby particles |
| **settle** | per-frame low-alpha fade that makes ribbons linger |

## Scenarios

1. Single click → a small ink burst blooms and drifts downstream.
2. Slow S-shaped drag → a calligraphic ribbon follows, then disperses.
3. Two colors released near each other → marbled interleaving, no mixing
   (colors never blend; interleaving does the work).
4. Idle → field keeps breathing; old ink fades over ~10 s.

## Aesthetic

Near-black blue water; inks from the nightbloom palettes (ember, orchid,
lagoon…). No chrome beyond a swatch row and the key hints.
