import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

// ---------- slice 3 — tempo estimation ----------

const train = (bpm, n, jitter = 0) => Array.from(
  { length: n },
  (_, i) => i * (60000 / bpm) + (jitter ? Math.sin(i * 7.3) * jitter : 0),
);

test('estimateBpm: null until at least 8 onsets', () => {
  const { estimateBpm } = loadLogic(HTML);
  assert.equal(estimateBpm([]), null);
  assert.equal(estimateBpm(train(120, 7)), null);
  assert.notEqual(estimateBpm(train(120, 8)), null);
});

test('estimateBpm: 120 BPM impulse train → 120 ± 2', () => {
  const { estimateBpm } = loadLogic(HTML);
  const bpm = estimateBpm(train(120, 12));
  assert.ok(Math.abs(bpm - 120) <= 2, `expected ~120, got ${bpm}`);
});

test('estimateBpm: 60 BPM train folds up an octave to 120 ± 2', () => {
  const { estimateBpm } = loadLogic(HTML);
  const bpm = estimateBpm(train(60, 10));
  assert.ok(Math.abs(bpm - 120) <= 2, `expected ~120, got ${bpm}`);
});

test('estimateBpm: 200 BPM train folds down an octave to 100 ± 2', () => {
  const { estimateBpm } = loadLogic(HTML);
  const bpm = estimateBpm(train(200, 16));
  assert.ok(Math.abs(bpm - 100) <= 2, `expected ~100, got ${bpm}`);
});

test('estimateBpm: tolerates ±15 ms jitter on a 128 BPM train', () => {
  const { estimateBpm } = loadLogic(HTML);
  const bpm = estimateBpm(train(128, 24, 15));
  assert.ok(Math.abs(bpm - 128) <= 2, `expected ~128, got ${bpm}`);
});

// ---------- slice 4 — pulse decay ----------

test('decayPulse: halves after one half-life, quarters after two', () => {
  const { decayPulse } = loadLogic(HTML);
  assert.ok(Math.abs(decayPulse(1, 150, 150) - 0.5) < 1e-12);
  assert.ok(Math.abs(decayPulse(1, 300, 150) - 0.25) < 1e-12);
});

test('decayPulse: identity at dt 0 and linear in value', () => {
  const { decayPulse } = loadLogic(HTML);
  assert.equal(decayPulse(0.8, 0, 150), 0.8);
  assert.ok(Math.abs(decayPulse(0.6, 150, 150) - 0.3) < 1e-12);
  assert.equal(decayPulse(0, 999, 150), 0);
});

test('stepOnset: opts override k, window and refractoryMs', () => {
  const { stepOnset } = loadLogic(HTML);
  const fluxes = Array(40).fill(10);
  fluxes[20] = 200;
  fluxes[22] = 200; // 46 ms apart — fires with a 40 ms refractory
  const firedAt = run(stepOnset, fluxes, 23, { refractoryMs: 40 });
  assert.deepEqual(firedAt, [20, 22]);
});

// ---------- slice 5 — structural acceptance ----------

test('structure: logic block exports the full documented surface', () => {
  const logic = loadLogic(HTML);
  const surface = ['spectralFlux', 'adaptiveThreshold', 'stepOnset',
                   'estimateBpm', 'decayPulse', 'bandEnergy'];
  for (const fn of surface) {
    assert.equal(typeof logic[fn], 'function', `${fn} must be a function`);
  }
});

test('structure: no external fetches of any kind', () => {
  const html = readFileSync(HTML, 'utf8');
  assert.ok(!/(?:src|href)\s*=\s*["']?\s*(?:https?:)?\/\//i.test(html),
    'no src/href may point at a remote URL');
  assert.ok(!/url\(\s*["']?\s*(?:https?:)?\/\//i.test(html),
    'no CSS url() may point at a remote URL');
  assert.ok(!/@import|fetch\(|XMLHttpRequest|navigator\.sendBeacon/.test(html),
    'no imports or network APIs');
});

test('structure: analyser configured per design (fftSize 2048, no smoothing)', () => {
  const html = readFileSync(HTML, 'utf8');
  assert.match(html, /fftSize\s*=\s*2048/);
  assert.match(html, /smoothingTimeConstant\s*=\s*0\b/);
});

test('structure: HUD has BPM readout, sensitivity slider, six chips, file input', () => {
  const html = readFileSync(HTML, 'utf8');
  assert.match(html, /id="bpm"/, 'BPM readout');
  assert.match(html, /id="sens"[^>]*type="range"/, 'sensitivity slider');
  assert.equal((html.match(/class="chip"/g) ?? []).length, 6, 'six effect chips');
  assert.match(html, /type="file"[^>]*accept="video\/\*"/, 'video file input');
});

// ════════════════════ fx-pack ════════════════════
// docs/beat-prism-fx-pack — registry, beat grid, conductor, parameter math.

// ---------- fx slice 1 — registry + parameter math ----------

const NEW_IDS = {
  color: ['hue-spin', 'posterize', 'invert-strobe', 'duotone', 'sat-pump',
          'bleach-burn', 'thermal', 'channel-swap', 'neon-edge',
          'gamma-flicker', 'color-drain', 'sepia-ghost'],
  geometry: ['rotate-jolt', 'kaleidoscope', 'mirror-flip', 'tile-grid',
             'pixelate', 'slice-glitch', 'v-slice', 'squash', 'skew-tilt',
             'spin-zoom'],
  temporal: ['echo-trails', 'motion-ghost', 'strobe-black', 'freeze-frame',
             'stutter-loop', 'time-smear', 'droste', 'interlace-roll'],
  overlay: ['scanlines', 'vhs-band', 'grain-burst', 'vignette-pump',
            'letterbox-snap', 'starburst', 'shockwave'],
  scene: ['lightning', 'confetti', 'glyph-pop'],
};
const ORIGINAL_CAT = {
  zoom: 'geometry', flash: 'color', shake: 'geometry',
  burst: 'scene', chroma: 'color', glow: 'overlay',
};

test('registry: 46 entries with unique ids', () => {
  const { FX_REGISTRY } = loadLogic(HTML);
  assert.equal(FX_REGISTRY.length, 46);
  assert.equal(new Set(FX_REGISTRY.map(e => e.id)).size, 46);
});

test('registry: canonical ids — all 40 new effects and the original six', () => {
  const { FX_REGISTRY } = loadLogic(HTML);
  const ids = new Set(FX_REGISTRY.map(e => e.id));
  for (const cat of Object.keys(NEW_IDS)) {
    for (const id of NEW_IDS[cat]) assert.ok(ids.has(id), `missing ${id}`);
  }
  for (const id of Object.keys(ORIGINAL_CAT)) assert.ok(ids.has(id), `missing ${id}`);
});

test('registry: exact category counts (new 12/10/8/7/3, originals mapped)', () => {
  const { FX_REGISTRY } = loadLogic(HTML);
  const byId = new Map(FX_REGISTRY.map(e => [e.id, e]));
  for (const [cat, ids] of Object.entries(NEW_IDS)) {
    for (const id of ids) assert.equal(byId.get(id)?.cat, cat, `${id} → ${cat}`);
  }
  for (const [id, cat] of Object.entries(ORIGINAL_CAT)) {
    assert.equal(byId.get(id)?.cat, cat, `${id} → ${cat}`);
  }
  const count = cat => FX_REGISTRY.filter(e => e.cat === cat).length;
  assert.equal(count('color'), 14);
  assert.equal(count('geometry'), 12);
  assert.equal(count('temporal'), 8);
  assert.equal(count('overlay'), 8);
  assert.equal(count('scene'), 4);
});

test('registry: every entry has a name, a valid kind, and a boolean heavy flag', () => {
  const { FX_REGISTRY } = loadLogic(HTML);
  for (const e of FX_REGISTRY) {
    assert.equal(typeof e.name, 'string', `${e.id} name`);
    assert.ok(e.name.length > 0, `${e.id} name non-empty`);
    assert.ok(['pulse', 'continuous', 'scheduled'].includes(e.kind), `${e.id} kind ${e.kind}`);
    assert.equal(typeof e.heavy, 'boolean', `${e.id} heavy`);
  }
});

test('mulberry32: deterministic per seed, in [0,1), seeds diverge', () => {
  const { mulberry32 } = loadLogic(HTML);
  const a = mulberry32(42), b = mulberry32(42), c = mulberry32(43);
  const seqA = Array.from({ length: 8 }, () => a());
  const seqB = Array.from({ length: 8 }, () => b());
  const seqC = Array.from({ length: 8 }, () => c());
  assert.deepEqual(seqA, seqB, 'same seed, same sequence');
  assert.notDeepEqual(seqA, seqC, 'different seed, different sequence');
  for (const v of seqA) assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
});

test('latencyMs: FFT window center plus one rAF', () => {
  const { latencyMs } = loadLogic(HTML);
  // 1024/44100 s ≈ 23.22 ms, + 16 ms ≈ 39.22 ms
  assert.ok(Math.abs(latencyMs(2048, 44100) - 39.22) < 0.1, `${latencyMs(2048, 44100)}`);
  assert.ok(Math.abs(latencyMs(2048, 48000) - 37.33) < 0.1, `${latencyMs(2048, 48000)}`);
});

test('sliceOffsets: deterministic, right length, bounded, not flat', () => {
  const { sliceOffsets } = loadLogic(HTML);
  const a = sliceOffsets(7, 12, 40);
  assert.deepEqual(a, sliceOffsets(7, 12, 40), 'deterministic per seed');
  assert.notDeepEqual(a, sliceOffsets(8, 12, 40), 'seed changes offsets');
  assert.equal(a.length, 12);
  for (const v of a) assert.ok(Math.abs(v) <= 40, `|${v}| ≤ 40`);
  assert.ok(new Set(a).size > 1, 'offsets vary');
});

test('wedgeAngles: n evenly spaced wedge starts from 0', () => {
  const { wedgeAngles } = loadLogic(HTML);
  const w = wedgeAngles(6);
  assert.equal(w.length, 6);
  assert.equal(w[0], 0);
  const step = Math.PI * 2 / 6;
  for (let i = 1; i < 6; i++) {
    assert.ok(Math.abs(w[i] - i * step) < 1e-12, `wedge ${i}`);
  }
});

test('posterizeCurve: quantizes into levels, clamps input', () => {
  const { posterizeCurve } = loadLogic(HTML);
  assert.equal(posterizeCurve(0, 4), 0);
  assert.equal(posterizeCurve(1, 4), 1);
  assert.equal(posterizeCurve(0.4, 2), 0);
  assert.equal(posterizeCurve(0.6, 2), 1);
  assert.ok(Math.abs(posterizeCurve(0.5, 3) - 0.5) < 1e-12, 'mid level of 3');
  assert.equal(posterizeCurve(1.5, 4), 1, 'clamps high');
  assert.equal(posterizeCurve(-0.5, 4), 0, 'clamps low');
});

// ---------- fx slice 2 — beat grid phase lock ----------

// Feed a train of onsets through the grid, one stepGrid call per onset.
const feedGrid = (stepGrid, times, bpm, opts) => {
  let g = null;
  for (const t of times) g = stepGrid(g, t, bpm, t, opts);
  return g;
};
const beatTrain = (bpm, n, jitter = 0) => Array.from(
  { length: n },
  (_, i) => i * (60000 / bpm) + (jitter ? Math.sin(i * 7.3) * jitter : 0),
);

test('stepGrid: first onset seeds the anchor; bpm sets the period', () => {
  const { stepGrid } = loadLogic(HTML);
  const g = stepGrid(null, 1000, 120, 1000);
  assert.equal(g.anchorMs, 1000);
  assert.equal(g.periodMs, 500);
  assert.equal(g.onsetCount, 1);
  assert.equal(g.confident, false, 'one onset is not confidence');
});

test('stepGrid: 120 BPM train with ±10 ms jitter → confident, phase on the true grid', () => {
  const { stepGrid } = loadLogic(HTML);
  const g = feedGrid(stepGrid, beatTrain(120, 8, 10), 120);
  assert.equal(g.confident, true, '8 onsets + bpm → confident');
  // anchor must sit on the true beat closest to the last onset (3500 ms)
  assert.ok(Math.abs(g.anchorMs - 3500) <= 25, `anchor ${g.anchorMs} near 3500`);
});

test('stepGrid: onset 40 ms late inside the ±90 ms window re-locks by lerp 0.35', () => {
  const { stepGrid } = loadLogic(HTML);
  let g = feedGrid(stepGrid, beatTrain(120, 8), 120);   // clean → anchor exactly 3500
  assert.equal(g.anchorMs, 3500);
  g = stepGrid(g, 4040, 120, 4040);                     // predicted 4000, off +40
  assert.ok(Math.abs(g.anchorMs - 4014) < 1e-9, `anchor ${g.anchorMs} = 4000 + 0.35·40`);
});

test('stepGrid: off-grid onsets are ignored by a confident clock', () => {
  const { stepGrid } = loadLogic(HTML);
  let g = feedGrid(stepGrid, beatTrain(120, 8), 120);
  const count = g.onsetCount;
  g = stepGrid(g, 4250, 120, 4250);   // 250 ms from both neighbors — outside ±90
  assert.equal(g.anchorMs, 3500, 'anchor untouched');
  assert.equal(g.onsetCount, count + 1, 'onset still counted');
  assert.equal(g.confident, true);
});

test('stepGrid: free-runs through a 3 s quiet gap without losing the clock', () => {
  const { stepGrid } = loadLogic(HTML);
  let g = feedGrid(stepGrid, beatTrain(120, 8), 120);
  g = stepGrid(g, null, 120, 6400);   // frame tick 2.9 s after the last onset
  assert.equal(g.confident, true, 'still confident inside 4 s');
  assert.equal(g.anchorMs, 3500, 'clock untouched while free-running');
  assert.equal(g.periodMs, 500);
});

test('stepGrid: confidence lapses after 4 s without onsets and needs 8 fresh onsets', () => {
  const { stepGrid } = loadLogic(HTML);
  let g = feedGrid(stepGrid, beatTrain(120, 8), 120);
  g = stepGrid(g, null, 120, 7600);   // 4.1 s after the last onset
  assert.equal(g.confident, false, 'confidence lapsed');
  g = stepGrid(g, 8000, 120, 8000);   // one onset is not enough to re-confirm
  assert.equal(g.confident, false, 'needs 8 fresh onsets');
  assert.equal(g.onsetCount, 1);
});

test('stepGrid: opts.latencyMs shifts onset timestamps back before phase math', () => {
  const { stepGrid, latencyMs } = loadLogic(HTML);
  const L = latencyMs(2048, 44100);
  const raw = feedGrid(stepGrid, beatTrain(120, 8), 120);
  const comp = feedGrid(stepGrid, beatTrain(120, 8), 120, { latencyMs: L });
  assert.ok(Math.abs((raw.anchorMs - comp.anchorMs) - L) < 1e-9,
    `anchor shifted back by exactly ${L} ms`);
});

test('stepGrid: returns new state without mutating the input', () => {
  const { stepGrid } = loadLogic(HTML);
  const g = feedGrid(stepGrid, beatTrain(120, 8), 120);
  const snapshot = JSON.parse(JSON.stringify(g));
  stepGrid(g, 4040, 120, 4040);
  stepGrid(g, null, 120, 9999);
  assert.deepEqual(JSON.parse(JSON.stringify(g)), snapshot);
});

test('ringIndex: wraps backward through a 12-slot ring', () => {
  const { ringIndex } = loadLogic(HTML);
  assert.equal(ringIndex(5, 0, 12), 5);
  assert.equal(ringIndex(0, 1, 12), 11);
  assert.equal(ringIndex(3, 15, 12), 0);   // wraps a full lap and a bit
  assert.equal(ringIndex(7, 3, 12), 4);
});
