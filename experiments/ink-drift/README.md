# ink drift

Ink dropped into dark water. A divergence-free curl-noise current carries
thousands of particles into ribbons and vortices that never repeat. You
paint by releasing ink and steering the current; the water keeps swirling
on its own when you stop.

One HTML file, zero dependencies — open `index.html` straight from disk
(`file://` works).

## Interactions

- **Hold / drag** — pour ink at the pointer. The drag direction combs the
  water, blending an impulse into nearby ink.
- **Click** — a small burst that blooms and drifts downstream.
- **Swatch row** (bottom) — pick the ink color. Colors never blend; two
  inks released near each other marble by interleaving.
- **Idle** — the current keeps breathing; residual ink swirls on its own
  and old ink fades over ~10 seconds.

## Keys

| key | action |
| --- | --- |
| `1`–`6` | choose ink (ember, orchid, lagoon, frost, sunfall, spirit) |
| `c` | clear the water |
| `s` | save a PNG |

## How it works

A seeded fbm value-noise field `n(x, y, t)` defines the **current** as its
perpendicular gradient `(∂n/∂y, −∂n/∂x)` — divergence-free by construction,
so the flow looks like water. Two drifting fields are crossfaded over time
so the flow never settles. Particles are advected Verlet-style over a
coarse field grid with bilinear sampling; strokes are batched into one path
per color per frame, and a low-alpha fade toward the background makes
ribbons linger like real ink.

The pure math (`makeNoise`, `fbm`, `curl`, `stepParticle`, `PALETTES`)
lives in the `<script id="logic">` block and is unit-tested in Node:

```
node --test 'experiments/ink-drift/*.test.mjs'
```
