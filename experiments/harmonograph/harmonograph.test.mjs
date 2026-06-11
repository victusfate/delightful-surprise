import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;
const TAU = Math.PI * 2;

// ---------- slice 1: ratios and period ----------

test('RATIOS: the six named ratios with their {p, q}', () => {
  const { RATIOS } = loadLogic(HTML);
  const byName = Object.fromEntries(RATIOS.map(r => [r.name, r]));
  const want = {
    unison: [1, 1], octave: [1, 2], fifth: [2, 3],
    fourth: [3, 4], sixth: [3, 5], drift: [2, 3],
  };
  for (const [name, [p, q]] of Object.entries(want)) {
    assert.ok(byName[name], `missing ratio ${name}`);
    assert.equal(byName[name].p, p, `${name}.p`);
    assert.equal(byName[name].q, q, `${name}.q`);
  }
  assert.equal(byName.drift.detune, 0.01, 'drift detune');
  for (const r of RATIOS) {
    if (r.name !== 'drift') assert.ok(!r.detune, `${r.name} must not detune`);
  }
});

test('gcd: greatest common divisor', () => {
  const { gcd } = loadLogic(HTML);
  assert.equal(gcd(2, 3), 1);
  assert.equal(gcd(2, 4), 2);
  assert.equal(gcd(12, 18), 6);
  assert.equal(gcd(7, 7), 7);
});

test('period: 2π / gcd(p, q) — pendulum frequencies are p and q on a unit base', () => {
  const { period } = loadLogic(HTML);
  // The 1:2 figure closes after the longer (slower) pendulum's full cycle.
  assert.equal(period({ p: 1, q: 2 }), TAU);
  assert.equal(period({ p: 2, q: 3 }), TAU / 1);
  assert.equal(period({ p: 2, q: 4 }), TAU / 2);
  assert.equal(period({ p: 3, q: 5 }), TAU / 1);
});

// ---------- slice 2: pendulumPoint and the decay envelope ----------

const term = (A, f, phi = 0, d = 0) => ({ A, f, phi, d });

test('pendulumPoint: at t=0 with zero phases, x and y are 0', () => {
  const { pendulumPoint } = loadLogic(HTML);
  const params = {
    xTerms: [term(0.7, 2), term(0.3, 3)],
    yTerms: [term(0.6, 3), term(0.4, 2)],
  };
  const { x, y } = pendulumPoint(0, params);
  assert.equal(x, 0);
  assert.equal(y, 0);
});

test('pendulumPoint: at t=0 with all phases π/2, x = ΣAᵢ', () => {
  const { pendulumPoint } = loadLogic(HTML);
  const params = {
    xTerms: [term(0.7, 2, Math.PI / 2), term(0.3, 3, Math.PI / 2)],
    yTerms: [term(0.6, 3, Math.PI / 2), term(0.4, 2, Math.PI / 2)],
  };
  const { x, y } = pendulumPoint(0, params);
  assert.ok(Math.abs(x - 1.0) < 1e-12, `x=${x}, want ΣA=1.0`);
  assert.ok(Math.abs(y - 1.0) < 1e-12, `y=${y}, want ΣA=1.0`);
});

test('pendulumPoint: single-term envelope A·e^(−d·t) bounds |x| and is non-increasing', () => {
  const { pendulumPoint } = loadLogic(HTML);
  const A = 0.9, d = 0.05, f = 2.3;
  const params = { xTerms: [term(A, f, 0.7, d)], yTerms: [term(A, f, 0.7, d)] };
  let prevBound = Infinity;
  for (let t = 0; t <= 60; t += 0.37) {
    const bound = A * Math.exp(-d * t);
    const { x } = pendulumPoint(t, params);
    assert.ok(Math.abs(x) <= bound + 1e-12, `|x(${t})|=${Math.abs(x)} exceeds ${bound}`);
    assert.ok(bound <= prevBound, `envelope rose at t=${t}`);
    prevBound = bound;
  }
  // the envelope actually bites: late peaks are far below A
  const late = Math.abs(pendulumPoint(60 + Math.PI / (2 * f), params).x);
  assert.ok(late < A * 0.1, `expected strong decay by t≈60, got ${late}`);
});

// ---------- slice 3: closure ----------

// Undamped 2:3 figure, phases chosen so y(0) = 0 — a position-only check at
// t=0 would wrongly call this closed at T/2; periodicity at offsets won't.
const undampedFifth = {
  xTerms: [term(0.7, 2, 1.1), term(0.25, 3, 0.4)],
  yTerms: [term(0.7, 3, 0), term(0.25, 2, 0)],
};

test('isClosed: undamped 2:3 closes at T = period(2:3)', () => {
  const { isClosed, period } = loadLogic(HTML);
  const T = period({ p: 2, q: 3 });
  assert.equal(isClosed(undampedFifth, T, 1e-9), true);
});

test('isClosed: undamped 2:3 does not close at T/2 (even through its start point)', () => {
  const { isClosed, period } = loadLogic(HTML);
  const T = period({ p: 2, q: 3 });
  assert.equal(isClosed(undampedFifth, T / 2, 1e-6), false);
});

test('isClosed: damping breaks closure at T', () => {
  const { isClosed, period } = loadLogic(HTML);
  const damped = {
    xTerms: [term(0.7, 2, 1.1, 0.05), term(0.25, 3, 0.4, 0.05)],
    yTerms: [term(0.7, 3, 0.6, 0.05), term(0.25, 2, 0.2, 0.05)],
  };
  assert.equal(isClosed(damped, period({ p: 2, q: 3 }), 1e-6), false);
});

// ---------- slice 4: makeParams and the exported surface ----------

test('mulberry32: deterministic per seed, values in [0, 1)', () => {
  const { mulberry32 } = loadLogic(HTML);
  const a = mulberry32(42), b = mulberry32(42), c = mulberry32(7);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()], seqC = [c(), c(), c()];
  assert.deepEqual(seqA, seqB, 'same seed, same sequence');
  assert.notDeepEqual(seqA, seqC, 'different seed, different sequence');
  for (const v of [...seqA, ...seqC]) assert.ok(v >= 0 && v < 1, `value ${v} out of [0,1)`);
});

test('makeParams: deterministic given the rng, varies across seeds', () => {
  const { makeParams, mulberry32, RATIOS } = loadLogic(HTML);
  const fifth = RATIOS.find(r => r.name === 'fifth');
  const p1 = makeParams(fifth, { damping: 0.04 }, mulberry32(5));
  const p2 = makeParams(fifth, { damping: 0.04 }, mulberry32(5));
  const p3 = makeParams(fifth, { damping: 0.04 }, mulberry32(6));
  assert.deepEqual(p1, p2, 'same seed must reproduce the same swing');
  assert.notDeepEqual(p1, p3, 'a new seed must give a new swing');
});

test('makeParams: f-quotient of the two x terms equals p / (q + detune)', () => {
  const { makeParams, mulberry32, RATIOS } = loadLogic(HTML);
  for (const name of ['fifth', 'drift', 'octave']) {
    const ratio = RATIOS.find(r => r.name === name);
    const params = makeParams(ratio, { damping: 0.04 }, mulberry32(11));
    const [t1, t2] = params.xTerms;
    const want = ratio.p / (ratio.q + (ratio.detune ?? 0));
    assert.ok(Math.abs(t1.f / t2.f - want) < 1e-12,
      `${name}: x f-quotient ${t1.f / t2.f}, want ${want}`);
  }
});

test('makeParams: opts.damping lands on every term; amplitudes positive and bounded', () => {
  const { makeParams, mulberry32, RATIOS } = loadLogic(HTML);
  const fifth = RATIOS.find(r => r.name === 'fifth');
  for (const damping of [0, 0.025, 0.08]) {
    const { xTerms, yTerms } = makeParams(fifth, { damping }, mulberry32(3));
    assert.equal(xTerms.length, 2);
    assert.equal(yTerms.length, 2);
    for (const t of [...xTerms, ...yTerms]) {
      assert.equal(t.d, damping, 'damping must pass through to each term');
      assert.ok(t.A > 0 && t.A <= 1, `amplitude ${t.A} out of (0, 1]`);
      assert.ok(t.phi >= 0 && t.phi < TAU, `phase ${t.phi} out of [0, 2π)`);
      assert.ok(t.f > 0, 'frequency must be positive');
    }
  }
});

test('structure: logic block exports the full documented surface', () => {
  const logic = loadLogic(HTML);
  for (const fn of ['pendulumPoint', 'makeParams', 'isClosed', 'period', 'gcd', 'mulberry32']) {
    assert.equal(typeof logic[fn], 'function', `${fn} must be a function`);
  }
  assert.ok(Array.isArray(logic.RATIOS), 'RATIOS must be an array');
});
