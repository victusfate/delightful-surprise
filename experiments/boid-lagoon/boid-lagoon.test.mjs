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
