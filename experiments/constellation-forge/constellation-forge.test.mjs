import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;

// ---------- slice 1: sky generation & star picking ----------

test('mulberry: deterministic per seed, values in [0, 1)', () => {
  const { mulberry } = loadLogic(HTML);
  const a = mulberry(42), b = mulberry(42), c = mulberry(7);
  const seqA = Array.from({ length: 50 }, () => a());
  const seqB = Array.from({ length: 50 }, () => b());
  assert.deepEqual(seqA, seqB, 'same seed must replay the same sequence');
  for (const v of seqA) assert.ok(v >= 0 && v < 1, `value ${v} out of [0,1)`);
  const seqC = Array.from({ length: 50 }, () => c());
  assert.notDeepEqual(seqA, seqC, 'different seeds must diverge');
});

test('makeSky: same seed => identical sky, different seed => different sky', () => {
  const { makeSky } = loadLogic(HTML);
  const s1 = makeSky(123, 800, 600, 140);
  const s2 = makeSky(123, 800, 600, 140);
  const s3 = makeSky(999, 800, 600, 140);
  assert.deepEqual(s1, s2, 'same seed must produce the identical star list');
  assert.notDeepEqual(s1, s3, 'different seeds must produce different skies');
});

test('makeSky: n stars, all within bounds, mags in [0.2, 1]', () => {
  const { makeSky } = loadLogic(HTML);
  const w = 1280, h = 800, n = 140;
  const stars = makeSky(5, w, h, n);
  assert.equal(stars.length, n);
  for (const s of stars) {
    assert.ok(s.x >= 0 && s.x <= w, `x ${s.x} out of bounds`);
    assert.ok(s.y >= 0 && s.y <= h, `y ${s.y} out of bounds`);
    assert.ok(s.mag >= 0.2 && s.mag <= 1, `mag ${s.mag} out of [0.2, 1]`);
  }
});

test('nearestStar: exact index on a crafted layout', () => {
  const { nearestStar } = loadLogic(HTML);
  const stars = [
    { x: 10, y: 10, mag: 1 },
    { x: 100, y: 100, mag: 1 },
    { x: 102, y: 98, mag: 1 },
    { x: 500, y: 500, mag: 1 },
  ];
  assert.equal(nearestStar(stars, 11, 9, 30), 0);
  assert.equal(nearestStar(stars, 99, 101, 30), 1);
  assert.equal(nearestStar(stars, 103, 97, 30), 2);
  assert.equal(nearestStar(stars, 501, 502, 30), 3);
});

test('nearestStar: -1 beyond maxR and on an empty list', () => {
  const { nearestStar } = loadLogic(HTML);
  const stars = [{ x: 10, y: 10, mag: 1 }];
  assert.equal(nearestStar(stars, 200, 200, 30), -1);
  assert.equal(nearestStar(stars, 10 + 31, 10, 30), -1, 'just outside radius');
  assert.equal(nearestStar(stars, 10 + 29, 10, 30), 0, 'just inside radius');
  assert.equal(nearestStar([], 0, 0, 1e9), -1);
});
