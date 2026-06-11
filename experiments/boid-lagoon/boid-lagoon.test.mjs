import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;

const mag = v => Math.hypot(v.x, v.y);
const dot = (a, b) => a.x * b.x + a.y * b.y;
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// ---------- slice 1 — vector hygiene ----------

test('limit: leaves vectors at or under max untouched', () => {
  const { limit } = loadLogic(HTML);
  assert.deepEqual(limit({ x: 3, y: 4 }, 5), { x: 3, y: 4 });
  assert.deepEqual(limit({ x: 0, y: 0 }, 5), { x: 0, y: 0 });
  assert.deepEqual(limit({ x: -1, y: 2 }, 10), { x: -1, y: 2 });
});

test('limit: scales long vectors down to max, preserving direction', () => {
  const { limit } = loadLogic(HTML);
  const v = limit({ x: 30, y: 40 }, 5);
  assert.ok(close(mag(v), 5), `expected magnitude 5, got ${mag(v)}`);
  assert.ok(close(v.x / v.y, 30 / 40), 'direction must be preserved');
  assert.ok(v.x > 0 && v.y > 0, 'quadrant must be preserved');
});

test('clampSpeed: speed inside [min, max] passes through unchanged', () => {
  const { clampSpeed } = loadLogic(HTML);
  const v = clampSpeed({ x: 3, y: 4 }, 2, 10); // speed 5
  assert.deepEqual(v, { x: 3, y: 4 });
});

test('clampSpeed: too-fast vectors are scaled to max, direction preserved', () => {
  const { clampSpeed } = loadLogic(HTML);
  const v = clampSpeed({ x: 30, y: -40 }, 2, 10); // speed 50
  assert.ok(close(mag(v), 10), `expected speed 10, got ${mag(v)}`);
  assert.ok(dot(v, { x: 30, y: -40 }) > 0, 'direction must be preserved');
  assert.ok(close(v.x * -40, v.y * 30), 'must stay collinear with input');
});

test('clampSpeed: too-slow nonzero vectors are scaled up to min, direction preserved', () => {
  const { clampSpeed } = loadLogic(HTML);
  const v = clampSpeed({ x: 0.03, y: 0.04 }, 2, 10); // speed 0.05
  assert.ok(close(mag(v), 2), `expected speed 2, got ${mag(v)}`);
  assert.ok(dot(v, { x: 0.03, y: 0.04 }) > 0, 'direction must be preserved');
});

test('clampSpeed: the zero vector gets a deterministic nonzero fallback at min', () => {
  const { clampSpeed } = loadLogic(HTML);
  const a = clampSpeed({ x: 0, y: 0 }, 2, 10);
  const b = clampSpeed({ x: 0, y: 0 }, 2, 10);
  assert.ok(close(mag(a), 2), `fallback speed must be min, got ${mag(a)}`);
  assert.deepEqual(a, b, 'fallback must be deterministic');
});

test('clampSpeed: never returns a speed outside [min, max] across a sweep', () => {
  const { clampSpeed } = loadLogic(HTML);
  for (let i = 0; i < 50; i++) {
    const ang = (i / 50) * Math.PI * 2;
    const s = i * 0.4; // speeds 0 .. 19.6
    const v = clampSpeed({ x: Math.cos(ang) * s, y: Math.sin(ang) * s }, 1.5, 6);
    const m = mag(v);
    assert.ok(m >= 1.5 - 1e-9 && m <= 6 + 1e-9, `speed ${m} escaped [1.5, 6]`);
  }
});

// ---------- slice 2 — the three rules ----------

const boid = (x, y, vx = 0, vy = 0) => ({ x, y, vx, vy, hue: 190, wiggle: 0 });

test('cohesion: steers toward the neighbor centroid', () => {
  const { cohesion } = loadLogic(HTML);
  const b = boid(0, 0);
  const neighbors = [boid(10, 0), boid(10, 20), boid(40, 10)];
  // centroid (20, 10) — steering must point into the +x +y quadrant
  const s = cohesion(b, neighbors);
  assert.ok(mag(s) > 0, 'must be nonzero');
  assert.ok(dot(s, { x: 20, y: 10 }) > 0, 'must point toward centroid');
  assert.ok(s.x > 0 && s.y > 0, 'must point into the centroid quadrant');
});

test('separation: steers away from a too-close neighbor', () => {
  const { separation } = loadLogic(HTML);
  const b = boid(0, 0);
  const s = separation(b, [boid(3, 4)]); // close neighbor up-right
  assert.ok(mag(s) > 0, 'must be nonzero');
  assert.ok(dot(s, { x: -3, y: -4 }) > 0, 'must point away from the neighbor');
});

test('separation: a closer neighbor pushes harder than a distant one', () => {
  const { separation } = loadLogic(HTML);
  const b = boid(0, 0);
  const near = separation(b, [boid(2, 0)]);
  const far = separation(b, [boid(12, 0)]);
  assert.ok(mag(near) > mag(far), 'separation must fall off with distance');
});

test('alignment: steering matches the average heading direction', () => {
  const { alignment } = loadLogic(HTML);
  const b = boid(0, 0, 0, -1); // heading up
  const neighbors = [boid(5, 0, 2, 0), boid(-5, 0, 2, 0)]; // all heading +x
  const s = alignment(b, neighbors);
  assert.ok(mag(s) > 0, 'must be nonzero');
  assert.ok(dot(s, { x: 1, y: 0 }) > 0, 'must steer toward the average heading');
});

// ---------- slice 3 — threats ----------

test('flee: exactly zero beyond the threat radius', () => {
  const { flee } = loadLogic(HTML);
  const b = boid(0, 0);
  assert.deepEqual(flee(b, { x: 200, y: 0 }, 100), { x: 0, y: 0 });
  assert.deepEqual(flee(b, { x: 100.001, y: 0 }, 100), { x: 0, y: 0 });
});

test('flee: nonzero and pointing away inside the radius', () => {
  const { flee } = loadLogic(HTML);
  const b = boid(0, 0);
  const threat = { x: 30, y: 40 }; // distance 50, radius 100
  const f = flee(b, threat, 100);
  assert.ok(mag(f) > 0, 'must be nonzero inside the radius');
  assert.ok(dot(f, { x: -30, y: -40 }) > 0, 'must point away from the threat');
});

test('flee: a closer threat produces a stronger flee', () => {
  const { flee } = loadLogic(HTML);
  const b = boid(0, 0);
  const near = flee(b, { x: 10, y: 0 }, 100);
  const far = flee(b, { x: 80, y: 0 }, 100);
  assert.ok(mag(near) > mag(far), 'flee must strengthen as the threat closes');
});

test('the three rules all return {x:0, y:0} with no neighbors', () => {
  const { separation, alignment, cohesion } = loadLogic(HTML);
  const b = boid(7, 7, 1, 1);
  for (const rule of [separation, alignment, cohesion]) {
    assert.deepEqual(rule(b, []), { x: 0, y: 0 }, `${rule.name} must be zero`);
  }
});

// ---------- slice 4 — integration: stepBoid ----------

const BOUNDS = { w: 800, h: 600 };
const ENV = { food: [], predator: null, bounds: BOUNDS };

test('WEIGHTS: default tuning is exported with sane speed bounds', () => {
  const { WEIGHTS } = loadLogic(HTML);
  assert.ok(WEIGHTS && typeof WEIGHTS === 'object');
  assert.ok(WEIGHTS.minSpeed > 0, 'minSpeed must be positive — fish never stall');
  assert.ok(WEIGHTS.maxSpeed > WEIGHTS.minSpeed, 'maxSpeed must exceed minSpeed');
  assert.ok(WEIGHTS.fleeRadius > 0 && WEIGHTS.wallMargin > 0);
});

test('stepBoid: returns a new boid, leaves the input untouched', () => {
  const { stepBoid, WEIGHTS } = loadLogic(HTML);
  const b = boid(400, 300, 50, 0);
  const frozen = JSON.stringify(b);
  const next = stepBoid(b, [boid(420, 310, 40, 10)], ENV, WEIGHTS, 1 / 60);
  assert.notEqual(next, b, 'must be a new object');
  assert.equal(JSON.stringify(b), frozen, 'input boid must not be mutated');
  assert.equal(next.hue, b.hue, 'hue carries over');
  assert.ok(next.wiggle > b.wiggle, 'wiggle phase must advance');
});

test('stepBoid: speed is always clamped to [minSpeed, maxSpeed]', () => {
  const { stepBoid, WEIGHTS } = loadLogic(HTML);
  for (const [vx, vy] of [[0, 0], [0.01, 0], [9999, -9999], [-3, 4]]) {
    const next = stepBoid(boid(400, 300, vx, vy), [], ENV, WEIGHTS, 1 / 60);
    const s = mag({ x: next.vx, y: next.vy });
    assert.ok(
      s >= WEIGHTS.minSpeed - 1e-9 && s <= WEIGHTS.maxSpeed + 1e-9,
      `speed ${s} escaped [${WEIGHTS.minSpeed}, ${WEIGHTS.maxSpeed}] for v=(${vx},${vy})`,
    );
  }
});

test('stepBoid: food in env pulls a lone boid toward it', () => {
  const { stepBoid, WEIGHTS } = loadLogic(HTML);
  const make = () => boid(400, 300, 0, 40); // drifting down, food to the right
  const fed = stepBoid(make(), [], { ...ENV, food: [{ x: 550, y: 300 }] }, WEIGHTS, 1 / 60);
  const unfed = stepBoid(make(), [], ENV, WEIGHTS, 1 / 60);
  assert.ok(fed.vx > unfed.vx, 'food to the +x side must add +x velocity');
});

test('stepBoid: a predator in env pushes a nearby boid away', () => {
  const { stepBoid, WEIGHTS } = loadLogic(HTML);
  const make = () => boid(400, 300, 0, 40); // predator just to the right
  const env = { ...ENV, predator: { x: 430, y: 300 } };
  const hunted = stepBoid(make(), [], env, WEIGHTS, 1 / 60);
  const calm = stepBoid(make(), [], ENV, WEIGHTS, 1 / 60);
  assert.ok(hunted.vx < calm.vx, 'predator to the +x side must add -x velocity');
});

test('school invariant: 30 fish, 600 steps — inside bounds, speed in range, every step', () => {
  const { stepBoid, WEIGHTS } = loadLogic(HTML);
  // deterministic LCG so the test never flakes
  let seed = 42;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  let school = [];
  for (let i = 0; i < 30; i++) {
    const ang = rnd() * Math.PI * 2;
    school.push({
      x: 100 + rnd() * 600, y: 80 + rnd() * 440,
      vx: Math.cos(ang) * 60, vy: Math.sin(ang) * 60,
      hue: 185 + rnd() * 30, wiggle: rnd() * 6,
    });
  }
  const R = 70, dt = 1 / 60;
  for (let step = 0; step < 600; step++) {
    school = school.map(b => {
      const neighbors = school.filter(o => o !== b && Math.hypot(o.x - b.x, o.y - b.y) < R);
      return stepBoid(b, neighbors, ENV, WEIGHTS, dt);
    });
    for (const b of school) {
      assert.ok(
        b.x >= 0 && b.x <= BOUNDS.w && b.y >= 0 && b.y <= BOUNDS.h,
        `step ${step}: fish escaped to (${b.x}, ${b.y})`,
      );
      const s = mag({ x: b.vx, y: b.vy });
      assert.ok(
        s >= WEIGHTS.minSpeed - 1e-9 && s <= WEIGHTS.maxSpeed + 1e-9,
        `step ${step}: speed ${s} out of range`,
      );
    }
  }
});
