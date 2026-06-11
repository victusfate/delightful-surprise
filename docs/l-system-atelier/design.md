# l-system-atelier — design

## Concept

Grammar in, garden out. An L-system studio: edit rewrite rules in a small
panel and watch alien botany grow, stroke by stroke, in glowing light. The
gap between "three lines of grammar" and "a fern" is the whole show.

## Q&A (auto-resolved)

**Q: Core interaction?** A rule panel (axiom, up to 3 rules `X → …`, angle,
iterations) plus preset chips: Fern, Weed, Bush, Snowflake, Dragon, Sparse.
Any edit re-derives and replays growth. The canvas draws the turtle path
progressively (~thousands of segments over a few seconds), glowing.

**Q: Symbol set?** `F` draw forward, `f` move, `+`/`-` turn, `[`/`]`
push/pop, other letters are silent growth symbols. Stochastic rules and
parametrics are out of scope.

**Q: What's surprising?** A "mutate" button perturbs the current rules
(swap a turn, duplicate a branch clause) — small textual mutations cause
dramatic, often beautiful morphological change, shown side by side with the
rule diff highlighted.

## Pure logic

- `expand(axiom, rules, n)` — string rewriting, rules as
  `{X: 'replacement'}`; non-rule symbols copy through.
- `interpret(s, { angle, step })` — turtle walk → `{ segments, bounds }`
  where segments are `{x1, y1, x2, y2, depth}` (depth = bracket nesting) and
  bounds is the tight bounding box. Pure trig, no canvas.
- `mutate(rules, rng)` — one structural perturbation, returns new rules.
- `PRESETS` — named `{axiom, rules, angle, iterations}`.

### Tests must assert

- Algae system (A→AB, B→A) lengths follow Fibonacci: |expand n| = fib.
- Koch curve F→F+F−F+F: segment count = 4ⁿ.
- Brackets: `F[+F]F` yields 3 segments and the post-pop segment continues
  from the pre-push position.
- `interpret` bounds actually contain every segment endpoint.
- `mutate` returns rules that still expand without throwing and differ
  textually from the input.
- Every preset expands and interprets without error at its shipped
  iteration count (≤ 60k segments).

## Vocabulary

| term | meaning |
| --- | --- |
| **axiom** | the starting string |
| **derivation** | n applications of all rules in parallel |
| **turtle** | the position/heading interpreter producing segments |
| **depth** | bracket nesting at draw time; drives color/width taper |
| **mutation** | one structural rule perturbation from `mutate` |

## Scenarios

1. Load → Fern grows over ~4 s, root thick and dim, tips bright.
2. Change angle 25°→90° on the fern → instant crystalline rederive.
3. Mutate 3× from Bush → lineage of increasingly strange plants; "back"
   restores the previous rules (one-level undo).
4. Type a rule with unbalanced brackets → panel shows a gentle error, canvas
   keeps the last good plant.

## Aesthetic

Night palette; plants glow teal-to-amber by depth; rule panel is a dark
glass card, serif, bottom-left. `s` saves PNG.
