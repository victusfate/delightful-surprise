import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;
const SYNODIC_MS = 29.53058867 * 86400000;
const KNOWN_NEW = Date.UTC(2000, 0, 6, 18, 14);

// phase is cyclic: 0.9999 and 0 are the same moon
const circDist = (a, b) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));

test('moonPhase: a known new moon is ~0', () => {
  const { moonPhase } = loadLogic(HTML);
  assert.ok(circDist(moonPhase(new Date(KNOWN_NEW)), 0) < 0.001);
});

test('moonPhase: one synodic month after a new moon is new again', () => {
  const { moonPhase } = loadLogic(HTML);
  assert.ok(circDist(moonPhase(new Date(KNOWN_NEW + SYNODIC_MS)), 0) < 0.001);
});

test('moonPhase: half a synodic month after a new moon is full', () => {
  const { moonPhase } = loadLogic(HTML);
  const p = moonPhase(new Date(KNOWN_NEW + SYNODIC_MS / 2));
  assert.ok(Math.abs(p - 0.5) < 0.001, `expected ~0.5, got ${p}`);
});

test('moonPhase: always in [0, 1), even before the anchor date', () => {
  const { moonPhase } = loadLogic(HTML);
  for (const d of [Date.UTC(1969, 6, 20), Date.UTC(2026, 5, 11), Date.UTC(2100, 0, 1)]) {
    const p = moonPhase(new Date(d));
    assert.ok(p >= 0 && p < 1, `phase ${p} out of range for ${new Date(d).toISOString()}`);
  }
});

test('hexA converts hex + alpha to rgba()', () => {
  const { hexA } = loadLogic(HTML);
  assert.equal(hexA('#ff0080', 0.5), 'rgba(255,0,128,0.5)');
  assert.equal(hexA('#000000', 1), 'rgba(0,0,0,1)');
  assert.equal(hexA('#39e6c8', 0), 'rgba(57,230,200,0)');
});

test('clamp bounds values to [a, b]', () => {
  const { clamp } = loadLogic(HTML);
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(42, 0, 10), 10);
});

test('ease is a monotonic 0→1 ease-out', () => {
  const { ease } = loadLogic(HTML);
  assert.equal(ease(0), 0);
  assert.equal(ease(1), 1);
  let prev = -Infinity;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const v = ease(t);
    assert.ok(v >= prev, `not monotonic at t=${t}`);
    prev = v;
  }
  assert.ok(ease(0.5) > 0.5, 'ease-out should front-load progress');
});

test('pop ends at 1 and overshoots above 1 on the way (easeOutBack)', () => {
  const { pop } = loadLogic(HTML);
  assert.ok(Math.abs(pop(1) - 1) < 1e-9);
  let overshoot = false;
  for (let t = 0; t <= 1; t += 0.02) if (pop(t) > 1.0001) overshoot = true;
  assert.ok(overshoot, 'expected overshoot above 1 somewhere in (0,1)');
});

test('freq maps semitone offsets to equal-temperament Hz from A3', () => {
  const { freq } = loadLogic(HTML);
  assert.equal(freq(0), 220);
  assert.ok(Math.abs(freq(12) - 440) < 1e-9);
  assert.ok(Math.abs(freq(24) - 880) < 1e-9);
});

test('SCALE is a strictly ascending A-minor pentatonic', () => {
  const { SCALE } = loadLogic(HTML);
  const PENTATONIC = new Set([0, 3, 5, 7, 10]);
  assert.ok(SCALE.length >= 5);
  for (let i = 0; i < SCALE.length; i++) {
    if (i > 0) assert.ok(SCALE[i] > SCALE[i - 1], 'must ascend');
    assert.ok(PENTATONIC.has(SCALE[i] % 12), `degree ${SCALE[i]} not in A minor pentatonic`);
  }
});

test('PALETTES: six named palettes, each with valid petal and heart colors', () => {
  const { PALETTES } = loadLogic(HTML);
  assert.equal(PALETTES.length, 6);
  const hex = /^#[0-9a-f]{6}$/i;
  const names = new Set();
  for (const p of PALETTES) {
    names.add(p.name);
    assert.ok(p.petals.length >= 3, `${p.name} needs >=3 petal colors`);
    for (const c of p.petals) assert.match(c, hex);
    assert.match(p.heart, hex);
  }
  assert.equal(names.size, 6, 'palette names must be unique');
});
