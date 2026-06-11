# lichen lab

A petri dish for the rules of Life. Paint living cells onto a dark glass
dish, press space, and then bend the universe's physics by editing one
string — `B3/S23` — while it runs. The same pattern instantly behaves like
a different organism.

One HTML file, zero dependencies, zero network. `open index.html` is the
entire install story (works straight from `file://`).

## What you're looking at

- The dish is a toroidal 160×100 grid — edges wrap, gliders come back.
- Cells track **age**: newborns flash near-white teal, then their hue
  drifts teal → violet → ember the longer they survive.
- The dead leave **ghosts** — deep-blue traces that fade over the next
  generations, so you can read where life just was.
- On load, a faint random soup waits under Life, paused.

## Interactions

- **Drag** on the dish to paint live cells (works while running too).
- **Right-drag** to erase, or toggle eraser mode with `e`.
- **Rule input** — type any B/S rule (`B36/S23`, `B2/S`, …) and press
  Enter. Malformed rules are rejected; the dish keeps its current physics.
- **Preset chips** — six temperaments, applied instantly, even mid-run:
  | temperament | preset | rule |
  | --- | --- | --- |
  | orderly | Life | B3/S23 |
  | mutinous | HighLife | B36/S23 |
  | explosive | Seeds | B2/S |
  | tidal | Day & Night | B3678/S34678 |
  | crystalline | Maze | B3/S12345 |
  | accretive | Coral | B3/S45678 |
- **Speed slider** — 1 to 60 generations per second.

## Keys

| key | action |
| --- | --- |
| `space` | run / pause |
| `n` | step one generation (while paused) |
| `c` | clear the dish |
| `e` | toggle eraser |

## Try this

1. Paint a messy blob, press space under **orderly** — watch debris age
   into violet and ember still lifes.
2. While it runs, click **tidal** — the same dish reorganizes into
   inverse-symmetric continents.
3. Crank the speed and click **explosive** — fireworks. One `c` calms
   everything.

## Tests

Pure logic (`parseRule`, `step`, `countNeighbors`, `ageTick`) lives in the
`<script id="logic">` block and is unit-tested in Node without a browser:

```sh
node --test 'experiments/lichen-lab/*.test.mjs'
```
