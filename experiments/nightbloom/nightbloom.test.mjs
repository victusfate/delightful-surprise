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
