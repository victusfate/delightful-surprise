# boid-lagoon — PRD

## Problem

Demonstrate emergent group behavior as delight: sixty fish governed by three
local rules produce moods — milling, torus rotation, streaming, panic — that
were never scripted. Ship it as one dependency-free HTML file in the repo's
testable single-file experiment pattern.

## Goals

1. A midnight lagoon where a school of fish feels alive: curious about the
   pointer, greedy around food, terrified of the predator — all emergent
   from Reynolds' rules plus flee/seek.
2. Zero dependencies, zero build, zero network: `open index.html` is the
   entire install story; works from `file://`.
3. The boid math is pure, DOM-free, and unit-tested in Node via the shared
   logic-block harness (`experiments/_harness/logic.mjs`).

## Non-goals

- Persistence, sharing, settings, mobile-specific UI, accessibility audit.
- Realistic fish anatomy or fluid dynamics; this is a mood piece.
- Spatial partitioning unless O(n²) measurably fails at n=120.

## Functional requirements

- **FR1 — school:** 60 boids (`{x, y, vx, vy, hue, wiggle}`) school by
  separation / alignment / cohesion within a neighbor radius. Speed is
  clamped to [min, max] every step — fish never stall, never teleport.
- **FR2 — lagoon bounds:** soft repulsion near edges (no wrapping); a school
  stepped many times stays inside bounds.
- **FR3 — curiosity:** the moving pointer exerts a gentle attraction so idle
  fish drift toward it without breaking formation.
- **FR4 — feeding:** press-and-hold emits food particles that sink from the
  pointer; nearby fish seek the nearest food, eat it on contact (plink),
  and the school loosens.
- **FR5 — predator:** a quick tap in open water spawns a bigger, darker,
  red-eyed predator that hunts the nearest fish for ~8 seconds, then sinks
  away. Fish flee with high weight inside the threat radius; the panic
  propagates through alignment. The predator never catches anyone.
- **FR6 — sound:** quiet underwater pad (filtered noise + slow sine), tiny
  plinks on feeding, a low sub swell on predator entrance. Audio starts only
  after the first user gesture; `m` toggles mute.
- **FR7 — keys:** `m` mute, `+`/`=` add 10 fish (max 120), `-` remove 10
  (min 20).
- **FR8 — testability:** `separation`, `alignment`, `cohesion`, `limit`,
  `clampSpeed`, `flee`, and `stepBoid` are exported from the single
  `<script id="logic">` block via `globalThis.__logic`. `stepBoid(boid,
  neighbors, env, weights, dt)` returns a new boid; `env = {food[],
  predator?, bounds}`.

## Quality requirements

- 60 fps target at 120 fish on a mid-size window (O(n²) neighbor scan is
  acceptable at this n).
- Deterministic, fast unit tests: `node --test 'experiments/boid-lagoon/*.test.mjs'`
  passes in well under 10 s with no network and no browser.
- No console errors in a headless Chromium run from `file://`.
- Aesthetic: deep teal-black water, god-rays from above, fish as slim
  glowing chevrons with tail wiggle, rising bubbles, Georgia-serif UI hints
  consistent with nightbloom.

## Acceptance

Headless Playwright run (viewport 1280×800, `file://`): pointer movement,
a press-and-hold that produces food and eating, a tap that spawns a predator
which later despawns, `+`/`-` changing the school size within [20, 120],
several seconds of free evolution — with zero page errors and zero console
errors, ending in a screenshot.
