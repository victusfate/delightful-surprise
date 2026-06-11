import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;

// ---------- slice 1 — rule parsing ----------

test('parseRule: Life B3/S23 round-trips to birth {3}, survive {2,3}', () => {
  const { parseRule } = loadLogic(HTML);
  const r = parseRule('B3/S23');
  assert.deepEqual([...r.birth].sort(), [3]);
  assert.deepEqual([...r.survive].sort(), [2, 3]);
});

test('parseRule: Seeds B2/S has an empty survive set', () => {
  const { parseRule } = loadLogic(HTML);
  const r = parseRule('B2/S');
  assert.deepEqual([...r.birth], [2]);
  assert.equal(r.survive.size, 0);
});

test('parseRule: tolerant of lowercase and mixed case', () => {
  const { parseRule } = loadLogic(HTML);
  const r = parseRule('b36/s23');
  assert.deepEqual([...r.birth].sort(), [3, 6]);
  assert.deepEqual([...r.survive].sort(), [2, 3]);
});

test('parseRule: rejects malformed input with a clear error', () => {
  const { parseRule } = loadLogic(HTML);
  for (const bad of ['banana', '', 'B3', 'S23/B3', 'B3/S23/X', 'B9/S2']) {
    assert.throws(() => parseRule(bad), Error, `expected throw for ${JSON.stringify(bad)}`);
  }
});

test('PRESETS: six temperament-labeled rules, all parseable', () => {
  const { parseRule, PRESETS } = loadLogic(HTML);
  assert.equal(PRESETS.length, 6);
  const rules = new Set(PRESETS.map(p => p.rule.toUpperCase()));
  for (const want of ['B3/S23', 'B36/S23', 'B2/S', 'B3678/S34678', 'B3/S12345', 'B3/S45678']) {
    assert.ok(rules.has(want), `missing preset ${want}`);
  }
  const labels = new Set();
  for (const p of PRESETS) {
    assert.equal(typeof p.name, 'string');
    assert.equal(typeof p.temperament, 'string');
    assert.doesNotThrow(() => parseRule(p.rule));
    labels.add(p.temperament);
  }
  assert.equal(labels.size, 6, 'temperament labels must be unique');
});

// ---------- slice 2 — neighbors and step ----------

function gridFrom(w, h, cells) {
  const g = new Uint8Array(w * h);
  for (const [x, y] of cells) g[y * w + x] = 1;
  return g;
}
const liveSet = (g, w) =>
  new Set([...g].flatMap((v, i) => (v ? [`${i % w},${(i / w) | 0}`] : [])));

test('countNeighbors: toroidal wrap — (0,0) neighbors (w-1,h-1)', () => {
  const { countNeighbors } = loadLogic(HTML);
  const w = 5, h = 4;
  const g = gridFrom(w, h, [[w - 1, h - 1]]);
  assert.equal(countNeighbors(g, w, h, 0, 0), 1);
  assert.equal(countNeighbors(g, w, h, 2, 2), 0);
});

test('countNeighbors: full Moore neighborhood counts 8', () => {
  const { countNeighbors } = loadLogic(HTML);
  const w = 5, h = 5;
  const cells = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (dx || dy) cells.push([2 + dx, 2 + dy]);
  const g = gridFrom(w, h, cells);
  assert.equal(countNeighbors(g, w, h, 2, 2), 8);
});

test('step: blinker under Life oscillates with period 2', () => {
  const { step, parseRule } = loadLogic(HTML);
  const w = 7, h = 7, life = parseRule('B3/S23');
  const horiz = gridFrom(w, h, [[2, 3], [3, 3], [4, 3]]);
  const g1 = step(horiz, w, h, life);
  assert.deepEqual(liveSet(g1, w), new Set(['3,2', '3,3', '3,4']));
  const g2 = step(g1, w, h, life);
  assert.deepEqual(liveSet(g2, w), liveSet(horiz, w));
});

test('step: block under Life is a still life', () => {
  const { step, parseRule } = loadLogic(HTML);
  const w = 6, h = 6, life = parseRule('B3/S23');
  const block = gridFrom(w, h, [[2, 2], [3, 2], [2, 3], [3, 3]]);
  assert.deepEqual(liveSet(step(block, w, h, life), w), liveSet(block, w));
});

test('step: glider under Life translates by (1,1) after 4 generations', () => {
  const { step, parseRule } = loadLogic(HTML);
  const w = 10, h = 10, life = parseRule('B3/S23');
  const glider = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
  let g = gridFrom(w, h, glider);
  for (let i = 0; i < 4; i++) g = step(g, w, h, life);
  const want = new Set(glider.map(([x, y]) => `${(x + 1) % w},${(y + 1) % h}`));
  assert.deepEqual(liveSet(g, w), want);
});

test('step: under Seeds (S empty) no cell survives to the next generation', () => {
  const { step, parseRule } = loadLogic(HTML);
  const w = 9, h = 9, seeds = parseRule('B2/S');
  const g = gridFrom(w, h, [[3, 3], [4, 3], [4, 4], [6, 6], [2, 7]]);
  const next = step(g, w, h, seeds);
  for (let i = 0; i < w * h; i++) {
    if (g[i] === 1) assert.equal(next[i], 0, `cell ${i} survived under Seeds`);
  }
});

test('step: returns a fresh Uint8Array of 0/1 and leaves the input intact', () => {
  const { step, parseRule } = loadLogic(HTML);
  const w = 7, h = 7, life = parseRule('B3/S23');
  const g = gridFrom(w, h, [[2, 3], [3, 3], [4, 3]]);
  const before = Uint8Array.from(g);
  const next = step(g, w, h, life);
  assert.ok(next instanceof Uint8Array);
  assert.notEqual(next, g);
  assert.deepEqual(g, before, 'input grid must not be mutated');
  for (const v of next) assert.ok(v === 0 || v === 1);
});

// ---------- slice 3 — age tick ----------

test('ageTick: born -> 1, surviving -> +1, dead -> 0', () => {
  const { ageTick } = loadLogic(HTML);
  //            born  survive  die   stay-dead
  const before = Uint8Array.from([0, 1, 1, 0]);
  const after  = Uint8Array.from([1, 1, 0, 0]);
  const ages   = Uint16Array.from([0, 7, 3, 0]);
  const next = ageTick(ages, before, after);
  assert.equal(next[0], 1, 'born cell starts at age 1');
  assert.equal(next[1], 8, 'survivor increments');
  assert.equal(next[2], 0, 'dead cell resets to 0');
  assert.equal(next[3], 0, 'empty cell stays 0');
});

test('ageTick: pure — does not mutate its inputs', () => {
  const { ageTick } = loadLogic(HTML);
  const before = Uint8Array.from([0, 1]);
  const after  = Uint8Array.from([1, 1]);
  const ages   = Uint16Array.from([0, 4]);
  const snapAges = Uint16Array.from(ages);
  const next = ageTick(ages, before, after);
  assert.notEqual(next, ages);
  assert.deepEqual(ages, snapAges, 'ages input must not be mutated');
  assert.deepEqual(before, Uint8Array.from([0, 1]));
  assert.deepEqual(after, Uint8Array.from([1, 1]));
});

// ---------- slice 4 — structural acceptance ----------

test('structure: logic block exports the full documented surface', () => {
  const logic = loadLogic(HTML);
  for (const fn of ['parseRule', 'step', 'countNeighbors', 'ageTick']) {
    assert.equal(typeof logic[fn], 'function', `${fn} must be a function`);
  }
  assert.ok(Array.isArray(logic.PRESETS), 'PRESETS must be an array');
});

test('structure: logic IIFE leaks nothing but __logic', () => {
  loadLogic(HTML);
  for (const name of ['parseRule', 'step', 'countNeighbors', 'ageTick', 'PRESETS']) {
    assert.equal(globalThis[name], undefined, `${name} must not leak into global scope`);
  }
});

test('structure: app script consumes __logic and renders a dish', () => {
  const html = readFileSync(HTML, 'utf8');
  const appScript = html
    .replace(/<script id="logic">[\s\S]*?<\/script>/, '')
    .match(/<script>[\s\S]*?<\/script>/);
  assert.ok(appScript, 'expected an app <script> besides the logic block');
  assert.match(appScript[0], /globalThis\.__logic/, 'app must consume globalThis.__logic');
  assert.match(html, /<canvas/, 'app must render to a canvas');
  assert.match(html, /id="rule"/, 'app must have a rule input');
});
