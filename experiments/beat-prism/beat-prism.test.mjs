import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;

// ---------- slice 1 — flux and band energy ----------

test('spectralFlux: sums only positive per-bin differences', () => {
  const { spectralFlux } = loadLogic(HTML);
  // bin0 +5, bin1 -3 (ignored), bin2 +2 — no bass weighting (bassBins 0)
  assert.equal(spectralFlux([10, 10, 10], [15, 7, 12], 0), 7);
});

test('spectralFlux: bins below bassBins count twice', () => {
  const { spectralFlux } = loadLogic(HTML);
  // bin0 +5 doubled, bin1 +5 doubled, bin2 +5 single → 25
  assert.equal(spectralFlux([0, 0, 0], [5, 5, 5], 2), 25);
});

test('spectralFlux: non-increasing spectrum yields zero', () => {
  const { spectralFlux } = loadLogic(HTML);
  assert.equal(spectralFlux([9, 9, 9, 9], [9, 8, 0, 9], 2), 0);
});

test('spectralFlux: identical spectra yield zero', () => {
  const { spectralFlux } = loadLogic(HTML);
  const s = [3, 1, 4, 1, 5, 9, 2, 6];
  assert.equal(spectralFlux(s, s, 3), 0);
});

test('bandEnergy: mean magnitude over [lo, hi)', () => {
  const { bandEnergy } = loadLogic(HTML);
  assert.equal(bandEnergy([10, 20, 30, 40], 1, 3), 25); // (20+30)/2
  assert.equal(bandEnergy([10, 20, 30, 40], 0, 4), 25);
});

test('bandEnergy: hi is exclusive and clamped; empty range is 0', () => {
  const { bandEnergy } = loadLogic(HTML);
  assert.equal(bandEnergy([10, 20, 30], 2, 99), 30); // clamps hi to length
  assert.equal(bandEnergy([10, 20, 30], 2, 2), 0);   // empty range
});

// ---------- slice 2 — adaptive threshold and onset state machine ----------

test('adaptiveThreshold: constant history → mean (MAD is 0)', () => {
  const { adaptiveThreshold } = loadLogic(HTML);
  assert.equal(adaptiveThreshold([7, 7, 7, 7, 7], 1.5), 7);
});

test('adaptiveThreshold: mean + k·median-absolute-deviation, hand-computed', () => {
  const { adaptiveThreshold } = loadLogic(HTML);
  // history [1,2,3,4,100]: mean 22, median 3, |x−3| = [2,1,0,1,97], MAD 1
  assert.equal(adaptiveThreshold([1, 2, 3, 4, 100], 2), 24);
});

test('adaptiveThreshold: empty history → Infinity (never fire blind)', () => {
  const { adaptiveThreshold } = loadLogic(HTML);
  assert.equal(adaptiveThreshold([], 1.5), Infinity);
});

// Drive the state machine like the app does: one flux value per frame.
function run(stepOnset, fluxes, dtMs, opts) {
  let state = { history: [], lastOnsetMs: -Infinity };
  const firedAt = [];
  fluxes.forEach((flux, i) => {
    const r = stepOnset(state, flux, i * dtMs, opts);
    if (r.fired) firedAt.push(i);
    state = r.state;
  });
  return firedAt;
}

test('stepOnset: constant-flux baseline never fires', () => {
  const { stepOnset } = loadLogic(HTML);
  const firedAt = run(stepOnset, Array(100).fill(40), 23, {});
  assert.deepEqual(firedAt, []);
});

test('stepOnset: spikes at known frames fire there and nowhere else', () => {
  const { stepOnset } = loadLogic(HTML);
  const fluxes = Array(120).fill(10);
  // spikes 30 frames apart at 23 ms/frame = 690 ms ≫ 180 ms refractory
  for (const f of [30, 60, 90]) fluxes[f] = 200;
  const firedAt = run(stepOnset, fluxes, 23, {});
  assert.deepEqual(firedAt, [30, 60, 90]);
});

test('stepOnset: refractory suppresses a second spike within 180 ms', () => {
  const { stepOnset } = loadLogic(HTML);
  const fluxes = Array(80).fill(10);
  fluxes[40] = 200;
  fluxes[44] = 200; // 4 frames × 23 ms = 92 ms later → inside refractory
  fluxes[60] = 200; // 460 ms after frame 40 → fires
  const firedAt = run(stepOnset, fluxes, 23, {});
  assert.deepEqual(firedAt, [40, 60]);
});

test('stepOnset: the spike does not lift its own threshold', () => {
  const { stepOnset } = loadLogic(HTML);
  // Two adjacent identical spikes far apart in time: both must fire —
  // proving the threshold is computed from history *before* the spike.
  const fluxes = Array(60).fill(10);
  fluxes[30] = 200;
  fluxes[45] = 200; // 345 ms later
  assert.deepEqual(run(stepOnset, fluxes, 23, {}), [30, 45]);
});

test('stepOnset: returns new state without mutating the input', () => {
  const { stepOnset } = loadLogic(HTML);
  const state = { history: [5, 5, 5], lastOnsetMs: 0 };
  const snapshot = JSON.parse(JSON.stringify(state));
  stepOnset(state, 99, 1000, {});
  assert.deepEqual(state, snapshot);
});

test('stepOnset: opts override k, window and refractoryMs', () => {
  const { stepOnset } = loadLogic(HTML);
  const fluxes = Array(40).fill(10);
  fluxes[20] = 200;
  fluxes[22] = 200; // 46 ms apart — fires with a 40 ms refractory
  const firedAt = run(stepOnset, fluxes, 23, { refractoryMs: 40 });
  assert.deepEqual(firedAt, [20, 22]);
});
