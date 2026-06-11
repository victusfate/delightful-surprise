import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;

// Sample grid used across noise tests — deterministic, off-lattice points.
function* grid(n = 12, span = 7.3) {
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      yield [i * span / n + 0.137, j * span / n + 0.731];
    }
  }
}

// ---------- slice 1: seeded value noise + fbm ----------

test('makeNoise: same seed gives identical values', () => {
  const { makeNoise } = loadLogic(HTML);
  const a = makeNoise(42), b = makeNoise(42);
  for (const [x, y] of grid()) {
    assert.equal(a(x, y), b(x, y), `mismatch at (${x},${y})`);
  }
});

test('makeNoise: different seeds differ somewhere', () => {
  const { makeNoise } = loadLogic(HTML);
  const a = makeNoise(1), b = makeNoise(2);
  let differs = false;
  for (const [x, y] of grid()) if (a(x, y) !== b(x, y)) { differs = true; break; }
  assert.ok(differs, 'seeds 1 and 2 produced identical fields');
});

test('makeNoise: output stays within [0, 1] across a grid', () => {
  const { makeNoise } = loadLogic(HTML);
  const n = makeNoise(7);
  for (const [x, y] of grid(20, 23.7)) {
    const v = n(x, y);
    assert.ok(v >= 0 && v <= 1, `noise(${x},${y}) = ${v} out of [0,1]`);
  }
});

test('makeNoise: field is not constant', () => {
  const { makeNoise } = loadLogic(HTML);
  const n = makeNoise(3);
  const vals = new Set();
  for (const [x, y] of grid()) vals.add(n(x, y));
  assert.ok(vals.size > 10, `expected variation, got ${vals.size} distinct values`);
});

test('fbm: output stays within [0, 1] and varies', () => {
  const { makeNoise, fbm } = loadLogic(HTML);
  const n = makeNoise(11);
  const vals = new Set();
  for (const [x, y] of grid(16, 15.1)) {
    const v = fbm(n, x, y, 4);
    assert.ok(v >= 0 && v <= 1, `fbm(${x},${y}) = ${v} out of [0,1]`);
    vals.add(v);
  }
  assert.ok(vals.size > 10, 'fbm should vary across the grid');
});

test('fbm: deterministic for the same inputs', () => {
  const { makeNoise, fbm } = loadLogic(HTML);
  const n = makeNoise(5);
  assert.equal(fbm(n, 1.5, 2.5, 4), fbm(n, 1.5, 2.5, 4));
});

// ---------- slice 2: curl field, divergence-free ----------

test('curl: returns finite {vx, vy}', () => {
  const { makeNoise, curl } = loadLogic(HTML);
  const n = makeNoise(9);
  for (const [x, y] of grid()) {
    const v = curl(n, x, y, 0.01);
    assert.ok(Number.isFinite(v.vx), `vx not finite at (${x},${y})`);
    assert.ok(Number.isFinite(v.vy), `vy not finite at (${x},${y})`);
  }
});

test('curl: numerical divergence is ~0 across sampled points', () => {
  const { makeNoise, fbm, curl } = loadLogic(HTML);
  const n = makeNoise(13);
  const field = (x, y) => fbm(n, x, y, 3);
  const eps = 0.01;
  for (const [x, y] of grid(10, 5.9)) {
    const xp = curl(field, x + eps, y, eps), xm = curl(field, x - eps, y, eps);
    const yp = curl(field, x, y + eps, eps), ym = curl(field, x, y - eps, eps);
    const div = (xp.vx - xm.vx) / (2 * eps) + (yp.vy - ym.vy) / (2 * eps);
    assert.ok(Math.abs(div) < 1e-3, `divergence ${div} at (${x},${y})`);
  }
});

test('curl: field is non-trivial (some |v| > 0)', () => {
  const { makeNoise, curl } = loadLogic(HTML);
  const n = makeNoise(21);
  let maxMag = 0;
  for (const [x, y] of grid()) {
    const v = curl(n, x, y, 0.01);
    maxMag = Math.max(maxMag, Math.hypot(v.vx, v.vy));
  }
  assert.ok(maxMag > 0, 'curl field is identically zero');
});

// ---------- slice 3: particle step + palettes ----------

const ink = (x, y, px = x, py = y) => ({ x, y, px, py, hue: 0, life: 1 });
const STILL = { vx: 0, vy: 0 };

test('stepParticle: pure — returns a new particle, input untouched', () => {
  const { stepParticle } = loadLogic(HTML);
  const p = ink(10, 20, 9, 19);
  const snapshot = { ...p };
  const q = stepParticle(p, STILL, 1 / 60, 0.9);
  assert.notEqual(q, p, 'must return a new object');
  assert.deepEqual(p, snapshot, 'input particle must not be mutated');
});

test('stepParticle: zero field + drag < 1 decays speed monotonically', () => {
  const { stepParticle } = loadLogic(HTML);
  let p = ink(0, 0, -2, -1); // implicit velocity (2, 1) per step
  let speed = Math.hypot(p.x - p.px, p.y - p.py);
  for (let i = 0; i < 50; i++) {
    p = stepParticle(p, STILL, 1 / 60, 0.9);
    const s = Math.hypot(p.x - p.px, p.y - p.py);
    assert.ok(s < speed || s === 0, `speed did not decay at step ${i}: ${s} >= ${speed}`);
    speed = s;
  }
  assert.ok(speed < 0.02, `speed should approach 0, got ${speed}`);
});

test('stepParticle: integrates the field velocity over dt', () => {
  const { stepParticle } = loadLogic(HTML);
  const p = ink(5, 5); // at rest
  const q = stepParticle(p, { vx: 10, vy: -4 }, 0.1, 0.9);
  assert.ok(Math.abs(q.x - 6) < 1e-9, `x ${q.x} != 6`);
  assert.ok(Math.abs(q.y - 4.6) < 1e-9, `y ${q.y} != 4.6`);
});

test('stepParticle: px/py record the pre-step position', () => {
  const { stepParticle } = loadLogic(HTML);
  const p = ink(3, 7, 2, 6);
  const q = stepParticle(p, { vx: 1, vy: 1 }, 0.016, 0.95);
  assert.equal(q.px, 3);
  assert.equal(q.py, 7);
});

test('stepParticle: preserves non-kinematic fields (hue, life)', () => {
  const { stepParticle } = loadLogic(HTML);
  const p = { ...ink(1, 1), hue: 4, life: 0.5 };
  const q = stepParticle(p, STILL, 0.016, 0.9);
  assert.equal(q.hue, 4);
  assert.equal(q.life, 0.5);
});

test('PALETTES: six named ink palettes with valid hex colors', () => {
  const { PALETTES } = loadLogic(HTML);
  assert.equal(PALETTES.length, 6);
  const hex = /^#[0-9a-f]{6}$/i;
  const names = new Set();
  for (const p of PALETTES) {
    names.add(p.name);
    assert.ok(p.inks.length >= 3, `${p.name} needs >=3 ink colors`);
    for (const c of p.inks) assert.match(c, hex);
  }
  assert.equal(names.size, 6, 'palette names must be unique');
  for (const expected of ['ember', 'orchid', 'lagoon']) {
    assert.ok(names.has(expected), `missing nightbloom palette ${expected}`);
  }
});

test('curl: matches the perpendicular gradient (dn/dy, -dn/dx)', () => {
  const { curl } = loadLogic(HTML);
  // analytic field n = x*y: dn/dy = x, dn/dx = y -> curl = (x, -y)
  const n = (x, y) => x * y;
  const v = curl(n, 2, 3, 0.001);
  assert.ok(Math.abs(v.vx - 2) < 1e-6, `vx ${v.vx} != 2`);
  assert.ok(Math.abs(v.vy + 3) < 1e-6, `vy ${v.vy} != -3`);
});

// ---------- slice 4: structural acceptance ----------

test('structure: logic block exports the full documented surface', () => {
  const logic = loadLogic(HTML);
  for (const fn of ['makeNoise', 'fbm', 'curl', 'stepParticle']) {
    assert.equal(typeof logic[fn], 'function', `${fn} must be a function`);
  }
  assert.ok(Array.isArray(logic.PALETTES), 'PALETTES must be an array');
});

test('structure: app is wired — canvas, swatches, and logic consumption', () => {
  const html = readFileSync(HTML, 'utf8');
  assert.match(html, /<canvas/, 'app must render to a canvas');
  assert.match(html, /id="swatches"/, 'app must have a swatch row');
  const appScripts = (html.match(/<script>[\s\S]*?<\/script>/g) ?? []);
  assert.equal(appScripts.length, 1, 'expected exactly one app <script> block');
  assert.match(appScripts[0], /globalThis\.__logic/, 'app script must consume globalThis.__logic');
});
