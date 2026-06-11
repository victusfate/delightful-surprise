# constellation-forge — TDD log

## Slice 1 — sky generation & star picking — PASS

- RED: 5 tests (`mulberry` determinism + range, `makeSky` determinism /
  bounds / mags, `nearestStar` exact hits, −1 beyond maxR and on empty).
  Failed correctly: no `index.html` yet.
- GREEN: mulberry32 RNG, margin-bounded star field, squared-distance
  nearest scan. 5/5.

## Slice 2 — figure identity — PASS

- RED: 4 tests (`figureHash` deterministic / order-sensitive /
  figure-sensitive / prefix-sensitive; `figureTraits` closed iff first ===
  last, distinct star count, spanRatio = max pairwise distance over chart
  diagonal). Failed on missing exports.
- GREEN: FNV-1a-style hash with length folding; trait computation over the
  distinct star set. 9/9.

## Slice 3 — the forge — PASS

- RED: 9 tests (name determinism, shape `/^[A-Z][a-z]+$/`, length, no 3+
  consonant runs, variety across seeds; myth determinism, exactly three
  `.`-terminated sentences, name mention, family markers for crown / river
  / pursuit; `forgeLegend` determinism and designation shape).
- GREEN: onset+vowel syllable grammar with word-final codas and at most
  one diphthong per name; trait-steered myth families (closed → crown,
  spanRatio ≥ 0.5 → river, stars ≥ 7 → pursuit, else vigil) with shared
  origin sentences and family-specific trial/reward sentences. 18/18.
- Polish during green (before commit): fixed a missing-space bug in one
  crown template ("...firestole..."), rebalanced vowel pools, capped name
  length at 11 — sampled output reads as intended ("Rhonel", "Cravea",
  "Nirialoth").

## Slice 4 — structural acceptance & full app — PASS

- RED: 2 tests (full export surface; app script consumes `makeSky`,
  `nearestStar`, `figureHash`, `figureTraits`, `forgeLegend` from
  `globalThis.__logic` rather than a parallel copy). One failed correctly
  (app shell was a stub).
- GREEN: full visual app — parchment-on-night chart with seeded nebula
  wash and dust, twinkling stars with diffraction glints on bright ones,
  engraved double-rule frame and plate title, thread drawing with ghost
  line and pulsing terminus, luminous seal sweep along the figure,
  museum-label card with name / epithet / designation / wrapped myth,
  accumulating figures with chart labels, keys (Enter / Esc / n / s),
  `?seed=` URL param, `globalThis.__state` debug handle. 20/20.

Final: **20/20 unit tests, ~120 ms.**

## Acceptance (headless Chromium via Playwright, file://, 1280×800)

- Scenario 1: clicked 5 stars, sealed with Enter → legend card with valid
  name, designation containing the name, 3-sentence myth mentioning the
  name. PASS.
- Scenario 2: drew a 5-star loop, closed it by re-clicking the first star
  → auto-sealed, `traits.closed` true, myth carries a crown/ring marker,
  both figures engraved on the same sky. PASS.
- Scenario 3: `n` → fresh sky, new seed, 140 stars, engravings cleared.
  PASS.
- Zero pageerror / console-error events across the run.
- Screenshot: `/tmp/exp-constellation-forge.png` (two engraved figures +
  myth card).

## Deviations from design.md

- `forgeMyth(rng, traits, name)` takes the forged name as an optional
  third argument (forges one from the rng when omitted). The design's
  two-argument sketch could not both mention the name and let the caller
  display it; the composite `forgeLegend(seed, traits)` is the app-facing
  entry point.
- `forgeLegend` additionally returns an `epithet` ("the Circlet Unworn")
  to realize the design's "Vessara — the Oar of the Drowned King" card
  style.
- Sealing requires at least 2 distinct stars; clicking the thread's first
  star both closes the loop and seals (the design left loop-closing
  mechanics implicit).
- `Escape` to abandon a thread was added (not in the design's key list).
