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
