import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;
const TAU = Math.PI * 2;

const sun = (mass = 1e6, radius = 26) =>
  ({ x: 0, y: 0, vx: 0, vy: 0, mass, radius, hue: 45, fixed: true });
const planet = (over = {}) =>
  ({ x: 200, y: 0, vx: 0, vy: 0, mass: 8, radius: 6, hue: 200, fixed: false, ...over });

// ---------- slice 1 — gravity and integration ----------

test('gravityAccel: pull points toward the attractor', () => {
  const { gravityAccel } = loadLogic(HTML);
  const bodies = [sun(), planet({ x: 200, y: 0 })];
  const a = gravityAccel(bodies[1], bodies, 1);
  assert.ok(a.ax < 0, `ax should point at the sun, got ${a.ax}`);
  assert.ok(Math.abs(a.ay) < Math.abs(a.ax) * 1e-9, 'pure radial pull has no tangential part');
});

test('gravityAccel: magnitude is ~G*M/r^2 at moderate distance', () => {
  const { gravityAccel } = loadLogic(HTML);
  const G = 1, M = 1e6, r = 200;
  const bodies = [sun(M), planet({ x: r, y: 0 })];
  const a = gravityAccel(bodies[1], bodies, G);
  const mag = Math.hypot(a.ax, a.ay);
  const expected = G * M / (r * r);
  assert.ok(Math.abs(mag - expected) / expected < 0.01,
    `|a|=${mag}, expected ~${expected} (softening must be negligible at r=${r})`);
});

test('gravityAccel: a body does not attract itself', () => {
  const { gravityAccel } = loadLogic(HTML);
  const lone = planet({ x: 50, y: -30, mass: 100 });
  const a = gravityAccel(lone, [lone], 1);
  assert.equal(a.ax, 0);
  assert.equal(a.ay, 0);
});

test('stepBodies: the fixed sun never moves', () => {
  const { stepBodies } = loadLogic(HTML);
  let bodies = [sun(), planet({ x: 120, y: 80, vx: 30, vy: -40 })];
  for (let i = 0; i < 500; i++) bodies = stepBodies(bodies, 0.01, 1);
  assert.equal(bodies[0].x, 0);
  assert.equal(bodies[0].y, 0);
  assert.equal(bodies[0].vx, 0);
  assert.equal(bodies[0].vy, 0);
});

test('stepBodies: a free body accelerates toward the sun', () => {
  const { stepBodies } = loadLogic(HTML);
  let bodies = [sun(), planet({ x: 200, y: 0, vx: 0, vy: 0 })];
  bodies = stepBodies(bodies, 0.01, 1);
  assert.ok(bodies[1].vx < 0, 'gains inward velocity');
  assert.ok(bodies[1].x < 200, 'moves inward (semi-implicit: x uses updated v)');
});

// ---------- slice 2 — merging and culling ----------

test('mergeBodies: mass sums exactly', () => {
  const { mergeBodies } = loadLogic(HTML);
  const a = planet({ mass: 8 }), b = planet({ x: 205, mass: 3 });
  assert.equal(mergeBodies(a, b).mass, 11);
});

test('mergeBodies: momentum conserved exactly in both axes', () => {
  const { mergeBodies } = loadLogic(HTML);
  const a = planet({ mass: 8, vx: 30, vy: -12 });
  const b = planet({ x: 205, mass: 3, vx: -50, vy: 7 });
  const m = mergeBodies(a, b);
  assert.equal(m.vx, (8 * 30 + 3 * -50) / 11);
  assert.equal(m.vy, (8 * -12 + 3 * 7) / 11);
});

test('mergeBodies: radius scales as mass^(1/3) (volume conserved)', () => {
  const { mergeBodies } = loadLogic(HTML);
  const a = planet({ mass: 8, radius: 6 });
  const b = planet({ x: 205, mass: 8, radius: 6 });
  const m = mergeBodies(a, b);
  assert.ok(Math.abs(m.radius - 6 * Math.cbrt(2)) < 1e-9,
    `expected ${6 * Math.cbrt(2)}, got ${m.radius}`);
});

test('mergeBodies: free bodies merge at the mass-weighted centroid', () => {
  const { mergeBodies } = loadLogic(HTML);
  const a = planet({ x: 0, y: 0, mass: 3 });
  const b = planet({ x: 100, y: 40, mass: 1 });
  const m = mergeBodies(a, b);
  assert.equal(m.x, 25);
  assert.equal(m.y, 10);
});

test('mergeBodies: merging into a fixed body keeps it fixed and pinned', () => {
  const { mergeBodies } = loadLogic(HTML);
  const s = sun();
  const p = planet({ x: 10, y: 5, vx: 80, vy: -20, mass: 8 });
  const m = mergeBodies(s, p);
  assert.equal(m.fixed, true);
  assert.equal(m.x, 0);
  assert.equal(m.y, 0);
  assert.equal(m.vx, 0);
  assert.equal(m.vy, 0);
  assert.equal(m.mass, 1e6 + 8);
});

test('stepBodies: two overlapping planets become one (collision merge)', () => {
  const { stepBodies } = loadLogic(HTML);
  let bodies = [sun(),
    planet({ x: 300, y: 0, vx: 0, vy: 50, mass: 8, radius: 6 }),
    planet({ x: 306, y: 0, vx: 0, vy: -50, mass: 8, radius: 6 })];
  bodies = stepBodies(bodies, 0.005, 1);
  assert.equal(bodies.length, 2, 'pair should merge into a single planet');
  assert.equal(bodies[1].mass, 16);
});

test('stepBodies: a planet falling into the sun grows the sun', () => {
  const { stepBodies } = loadLogic(HTML);
  let bodies = [sun(1e6, 26), planet({ x: 28, y: 0, vx: -10, vy: 0, mass: 8 })];
  bodies = stepBodies(bodies, 0.005, 1);
  assert.equal(bodies.length, 1, 'planet should be absorbed');
  assert.equal(bodies[0].mass, 1e6 + 8);
  assert.equal(bodies[0].x, 0, 'sun stays pinned');
  assert.equal(bodies[0].fixed, true);
});

test('stepBodies: reports each merge through opts.onMerge', () => {
  const { stepBodies } = loadLogic(HTML);
  const merges = [];
  let bodies = [sun(1e6, 26), planet({ x: 20, y: 0, vx: 0, vy: 0, mass: 8 })];
  bodies = stepBodies(bodies, 0.005, 1, { onMerge: m => merges.push(m) });
  assert.equal(merges.length, 1);
  assert.equal(merges[0].mass, 1e6 + 8);
});

test('stepBodies: culls escapees beyond opts.cullRadius, never the sun', () => {
  const { stepBodies } = loadLogic(HTML);
  let bodies = [sun(),
    planet({ x: 200, y: 0, vx: 0, vy: Math.sqrt(1e6 / 200) }),
    planet({ x: 9000, y: 0, vx: 500, vy: 0 })];
  bodies = stepBodies(bodies, 0.005, 1, { cullRadius: 5000 });
  assert.equal(bodies.length, 2, 'far escapee culled, orbiter kept');
  assert.equal(bodies[0].fixed, true, 'sun survives');
  assert.ok(Math.abs(Math.hypot(bodies[1].x, bodies[1].y) - 200) < 5, 'orbiter kept');
});

test('stepBodies: circular-orbit speed sqrt(G*M/r) holds radius within ±5% over 3 orbits', () => {
  const { stepBodies } = loadLogic(HTML);
  const G = 1, M = 1e6, r = 200;
  const v = Math.sqrt(G * M / r);
  let bodies = [sun(M), planet({ x: r, y: 0, vx: 0, vy: v })];
  const dt = 0.005;
  const period = TAU * r / v;
  const steps = Math.ceil(3 * period / dt);
  for (let i = 0; i < steps; i++) {
    bodies = stepBodies(bodies, dt, G);
    const rr = Math.hypot(bodies[1].x, bodies[1].y);
    assert.ok(Math.abs(rr - r) / r < 0.05, `radius ${rr} drifted >5% from ${r} at step ${i}`);
  }
});
