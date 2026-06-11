# l-system-atelier — PRD

## Problem

Show that three lines of grammar can become a fern. An L-system studio in
one dependency-free HTML file: edit rewrite rules in a small panel, watch
alien botany grow stroke by stroke in glowing light. The gap between the
grammar and the plant is the whole show.

## Goals

1. Live grammar editing: any change to axiom, rules, angle, or iterations
   re-derives the system and replays growth.
2. The growth replay is the centerpiece — thousands of segments drawn
   progressively over a few seconds, glowing teal at the root tapering to
   amber at the deepest branches.
3. A "mutate" button produces one structural rule perturbation whose
   dramatic morphological effect is immediately visible; one-level undo
   ("back") restores the previous rules.
4. Pure logic (`expand`, `interpret`, `mutate`, `PRESETS`) is unit-testable
   in Node via the shared logic-block harness.
5. Zero dependencies, zero build, zero network: works from `file://`.

## Non-goals

- Stochastic or parametric L-systems, context-sensitive rules.
- Persistence, sharing, sound, mobile-specific UI.
- Multi-level undo history (one level only).

## Functional requirements

- **FR1 — derivation:** `expand(axiom, rules, n)` applies all rules in
  parallel per pass; symbols without a rule copy through unchanged.
- **FR2 — turtle:** `interpret(s, { angle, step })` walks the string:
  `F` draws forward, `f` moves without drawing, `+`/`-` turn by `angle`
  degrees, `[` pushes state, `]` pops; all other symbols are silent.
  Returns `{ segments, bounds }` where each segment is
  `{x1, y1, x2, y2, depth}` (depth = bracket nesting at draw time) and
  `bounds` is the tight bounding box of all endpoints. Pure trig, no canvas.
- **FR3 — presets:** `PRESETS` ships six named systems — Fern, Weed, Bush,
  Snowflake, Dragon, Sparse — each `{axiom, rules, angle, iterations}`,
  each producing ≤ 60k segments at its shipped iteration count.
- **FR4 — rule panel:** dark glass card bottom-left with axiom field, up to
  3 rule rows (`X → replacement`), angle slider, iteration stepper, preset
  chips, mutate and back buttons. Every edit re-derives and replays.
- **FR5 — mutation:** `mutate(rules, rng)` returns new rules differing
  textually from the input via one structural perturbation (swap a turn
  sign, duplicate a bracketed branch clause); the result still expands
  without throwing. The UI highlights the rule diff and keeps the previous
  rules for one-level undo.
- **FR6 — growth replay:** segments are revealed in derivation order over
  ~4 s (eased), root segments thick and dim, tips bright; depth drives a
  teal-to-amber color ramp and width taper.
- **FR7 — error handling:** invalid input (unbalanced brackets, empty
  axiom, segment overflow) shows a gentle inline error in the panel; the
  canvas keeps the last good plant.
- **FR8 — keys:** `s` saves the canvas as PNG.
- **FR9 — testability:** `expand`, `interpret`, `mutate`, `validate`, and
  `PRESETS` are exported from the single `<script id="logic">` block via
  `globalThis.__logic`.

## Quality requirements

- Tests deterministic, no network, < 10 s total via
  `node --test 'experiments/l-system-atelier/*.test.mjs'`.
- No console errors in a headless Chromium run from `file://`.
- Fits the house aesthetic: night palette, Georgia serif, glow, consistent
  with nightbloom.

## Acceptance

Headless Playwright run: load → Fern grows; click each preset chip without
error; change the angle and observe an instant rederive; mutate then back
restores the prior rules; an unbalanced-bracket rule shows the inline error
while the canvas keeps the last good plant; zero page errors; final
screenshot captured after a full grow.
