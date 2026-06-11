# l-system atelier

Grammar in, garden out. An L-system studio in a single dependency-free
HTML file: edit three lines of rewrite rules in a dark glass panel and
watch alien botany grow, stroke by stroke, in glowing light — root dim
teal, canopy luminous, tips warm amber.

Open `index.html` in a browser. That's the whole install.

## The grammar

- `F` — draw one step forward
- `f` — move one step without drawing
- `+` / `-` — turn by the panel angle
- `[` / `]` — push / pop the turtle (branch and return)
- any other letter — silent growth symbol (expands but draws nothing)

Each iteration rewrites every symbol in parallel through the rules.

## Interactions

- **Preset chips** — fern, weed, bush, snowflake, dragon, sparse. Click
  one to load it and replay growth.
- **Axiom / rules** — up to three rules `X → replacement`. Any edit
  re-derives and replays. Unbalanced brackets or runaway derivations show
  a gentle error while the canvas keeps the last good plant.
- **Angle slider** — instant crystalline rederive (try the fern at 90°).
- **Iterate − / +** — derivation depth, budgeted to 60k segments.
- **Mutate** — one structural perturbation (flip a turn sign, duplicate a
  branch clause). The rule diff is highlighted below the buttons; small
  textual mutations cause dramatic morphological change.
- **Back** — one-level undo of the last mutation.

## Keys

- `s` — save the canvas as a PNG (when not typing in the panel).

## Tests

Pure logic (`expand`, `interpret`, `validate`, `mutate`, `PRESETS`) lives
in the `<script id="logic">` block and is unit-tested in Node:

```
node --test 'experiments/l-system-atelier/*.test.mjs'
```
