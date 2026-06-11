# boid lagoon 🐟

A midnight aquarium that thinks as a flock, in a single HTML file.
No dependencies, no build step, no network — just open it.

```
open boid-lagoon/index.html        # macOS
xdg-open boid-lagoon/index.html    # Linux
```

## What it does

Sixty fish school by Reynolds' three rules — separation, alignment,
cohesion — and nothing else is scripted. The same rules produce lazy
milling, tight rotation, and streaming rivers depending on what you did
last. God-rays sweep down through teal-black water; bubbles rise.

- **Move the pointer** — the school is gently curious and drifts your way
  without breaking formation.
- **Press and hold** — food motes sink from your pointer. Nearby fish break
  school to dart in and eat (each bite is a tiny plink); the school loosens
  while food is in the water.
- **Quick tap in open water** — a bigger, darker, red-eyed predator arrives
  on a low sub swell. It hunts the nearest fish for about eight seconds,
  panic propagates through the school as a wave, and it never catches
  anyone — terror only. Then it sinks away and the school forgets.

A quiet underwater pad (filtered noise + slow detuned sines) hums beneath
everything, synthesized live with the Web Audio API. Sound starts on your
first press — browsers require a gesture before audio can play.

## Keys

| key | action |
| --- | --- |
| `m` | mute / unmute |
| `+` / `=` | add 10 fish (max 120) |
| `-` | remove 10 fish (min 20) |

## Notes

The boid math (`separation`, `alignment`, `cohesion`, `limit`,
`clampSpeed`, `flee`, `stepBoid`) lives in a pure, DOM-free
`<script id="logic">` block and is unit-tested in Node:

```
node --test 'experiments/boid-lagoon/*.test.mjs'
```

Built as an autonomous prototype. Feed them — then tap, and feel a little bad.
