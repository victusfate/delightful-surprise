import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;

// ---------- slice 1: euclid(k, n) ----------

test('euclid(3,8) is the tresillo: x..x..x.', () => {
  const { euclid, patternString } = loadLogic(HTML);
  assert.equal(patternString(euclid(3, 8)), 'x..x..x.');
});

test('euclid(5,8) is the cinquillo: x.xx.xx.', () => {
  const { euclid, patternString } = loadLogic(HTML);
  assert.equal(patternString(euclid(5, 8)), 'x.xx.xx.');
});

test('euclid(4,4) is all hits; euclid(0,n) is all rests', () => {
  const { euclid } = loadLogic(HTML);
  assert.deepEqual(euclid(4, 4), [true, true, true, true]);
  for (const n of [1, 5, 8, 16]) {
    assert.deepEqual(euclid(0, n), new Array(n).fill(false));
  }
});

test('euclid: length n, hit count k, pattern[0] true when k > 0', () => {
  const { euclid } = loadLogic(HTML);
  for (let n = 1; n <= 16; n++) {
    for (let k = 0; k <= n; k++) {
      const p = euclid(k, n);
      assert.equal(p.length, n, `length for E(${k},${n})`);
      assert.equal(p.filter(Boolean).length, k, `count for E(${k},${n})`);
      if (k > 0) assert.equal(p[0], true, `E(${k},${n})[0] must be a hit`);
    }
  }
});

test('euclid: max-even — circular gaps between hits differ by at most 1', () => {
  const { euclid } = loadLogic(HTML);
  for (let n = 2; n <= 16; n++) {
    for (let k = 1; k <= n; k++) {
      const p = euclid(k, n);
      const idx = [];
      p.forEach((v, i) => { if (v) idx.push(i); });
      const gaps = idx.map((v, i) => {
        const next = idx[(i + 1) % idx.length];
        return ((next - v) + n) % n || n;
      });
      const min = Math.min(...gaps), max = Math.max(...gaps);
      assert.ok(max - min <= 1, `E(${k},${n}) gaps ${gaps} not max-even`);
    }
  }
});

test('patternString renders hits as x and rests as .', () => {
  const { patternString } = loadLogic(HTML);
  assert.equal(patternString([true, false, false, true]), 'x..x');
  assert.equal(patternString([]), '');
});

// ---------- slice 2: rotate + scheduleTimes ----------

test('rotate preserves hit count and round-trips at r=0 and r=n', () => {
  const { euclid, rotate } = loadLogic(HTML);
  const p = euclid(5, 16);
  assert.deepEqual(rotate(p, 0), p);
  assert.deepEqual(rotate(p, p.length), p);
  for (const r of [1, 3, 7, 15]) {
    assert.equal(rotate(p, r).filter(Boolean).length, 5, `count after r=${r}`);
  }
});

test('rotate(p, 1) moves each value one step later (circular right shift)', () => {
  const { rotate, patternString } = loadLogic(HTML);
  assert.equal(patternString(rotate([true, false, false, false], 1)), '.x..');
  assert.equal(patternString(rotate([true, true, false, false], 2)), '..xx');
});

test('rotate handles negative r and inverts positive rotation', () => {
  const { euclid, rotate } = loadLogic(HTML);
  const p = euclid(3, 8);
  assert.deepEqual(rotate(rotate(p, 3), -3), p);
  assert.deepEqual(rotate(p, -1), rotate(p, 7));
});

test('scheduleTimes lands offsets on hit indices with stepDur spacing', () => {
  const { euclid, scheduleTimes } = loadLogic(HTML);
  const p = euclid(3, 8); // hits at 0, 3, 6
  const times = scheduleTimes(p, 0.25, 10);
  assert.deepEqual(times, [10, 10.75, 11.5]);
  // spacing between consecutive hits equals (index gap) * stepDur
  assert.ok(Math.abs((times[1] - times[0]) - 3 * 0.25) < 1e-12);
  assert.ok(Math.abs((times[2] - times[1]) - 3 * 0.25) < 1e-12);
});

test('scheduleTimes: every hit index i maps to t0 + i*stepDur, ascending', () => {
  const { euclid, scheduleTimes } = loadLogic(HTML);
  const p = euclid(7, 16);
  const stepDur = 0.125, t0 = 2;
  const times = scheduleTimes(p, stepDur, t0);
  const idx = [];
  p.forEach((v, i) => { if (v) idx.push(i); });
  assert.equal(times.length, idx.length);
  idx.forEach((i, j) => {
    assert.ok(Math.abs(times[j] - (t0 + i * stepDur)) < 1e-12, `hit ${j}`);
    if (j > 0) assert.ok(times[j] > times[j - 1], 'ascending');
  });
});

test('scheduleTimes on an empty pattern is empty', () => {
  const { euclid, scheduleTimes } = loadLogic(HTML);
  assert.deepEqual(scheduleTimes(euclid(0, 8), 0.25, 0), []);
  assert.deepEqual(scheduleTimes([], 0.25, 0), []);
});

// ---------- slice 3: presets + dice ----------

const WORLD = [
  ['Tresillo', 3, 8],
  ['Cinquillo', 5, 8],
  ['Khafif', 2, 5],
  ['Money', 3, 7],
  ['Samba', 7, 16],
  ['Bossa', 5, 16],
];

test('PRESETS: six named world rhythms with their headline E(k,n)', () => {
  const { PRESETS } = loadLogic(HTML);
  assert.equal(PRESETS.length, 6);
  for (const [name, k, n] of WORLD) {
    const p = PRESETS.find(p => p.name === name);
    assert.ok(p, `missing preset ${name}`);
    assert.equal(p.k, k, `${name} headline k`);
    assert.equal(p.n, n, `${name} headline n`);
    assert.ok(
      p.rings.some(r => r.k === k && r.n === n),
      `${name}: headline E(${k},${n}) must land on one of its rings`,
    );
  }
});

test('PRESETS: every preset defines four valid ring specs (0 <= k <= n)', () => {
  const { PRESETS } = loadLogic(HTML);
  for (const p of PRESETS) {
    assert.equal(p.rings.length, 4, `${p.name} must spec all four rings`);
    for (const r of p.rings) {
      assert.ok(Number.isInteger(r.k) && Number.isInteger(r.n), `${p.name} integer specs`);
      assert.ok(r.k >= 0 && r.k <= r.n, `${p.name}: 0 <= k <= n`);
      assert.ok(r.n >= 1 && r.n <= 16, `${p.name}: n within grid`);
    }
  }
});

// deterministic LCG so dice tests never flake
const lcg = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;

test('rollRings: four specs inside taste bounds, deterministic for a seed', () => {
  const { rollRings } = loadLogic(HTML);
  const a = rollRings(lcg(42));
  const b = rollRings(lcg(42));
  assert.deepEqual(a, b, 'same seed, same roll');
  assert.equal(a.length, 4);
  for (const r of a) {
    assert.ok(Number.isInteger(r.k) && Number.isInteger(r.n));
    assert.ok(r.n >= 4 && r.n <= 16, `n=${r.n} outside taste bounds`);
    assert.ok(r.k >= 1 && r.k <= r.n, `k=${r.k} outside 1..n`);
  }
});

test('rollRings: bounds hold across many seeds', () => {
  const { rollRings } = loadLogic(HTML);
  for (let seed = 0; seed < 200; seed++) {
    for (const r of rollRings(lcg(seed))) {
      assert.ok(r.n >= 4 && r.n <= 16 && r.k >= 1 && r.k <= r.n,
        `seed ${seed}: E(${r.k},${r.n}) out of bounds`);
    }
  }
});

// ---------- structure ----------

test('structure: logic block exports the full documented surface', () => {
  const logic = loadLogic(HTML);
  for (const fn of ['euclid', 'rotate', 'patternString', 'scheduleTimes', 'rollRings']) {
    assert.equal(typeof logic[fn], 'function', `${fn} must be a function`);
  }
  assert.ok(Array.isArray(logic.PRESETS), 'PRESETS must be an array');
});
