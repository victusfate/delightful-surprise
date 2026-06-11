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

// ---------- slice 2: figure identity ----------

test('figureHash: deterministic integer, order-sensitive, figure-sensitive', () => {
  const { figureHash } = loadLogic(HTML);
  const fig = [3, 17, 42, 8, 99];
  const h = figureHash(fig);
  assert.equal(typeof h, 'number');
  assert.ok(Number.isInteger(h), 'hash must be an integer');
  assert.equal(figureHash(fig), h, 'same figure must hash identically');
  assert.notEqual(figureHash([...fig].reverse()), h, 'reversed order must differ');
  assert.notEqual(figureHash([3, 17, 42, 8, 100]), h, 'different figure must differ');
  assert.notEqual(figureHash([3, 17, 42, 8]), h, 'prefix figure must differ');
});

test('figureTraits: closed iff first index === last index', () => {
  const { figureTraits, makeSky } = loadLogic(HTML);
  const stars = makeSky(1, 800, 600, 20);
  assert.equal(figureTraits([0, 5, 9, 0], stars, 800, 600).closed, true);
  assert.equal(figureTraits([0, 5, 9, 4], stars, 800, 600).closed, false);
  assert.equal(figureTraits([2], stars, 800, 600).closed, false, 'single star is not a loop');
});

test('figureTraits: stars counts distinct stars', () => {
  const { figureTraits, makeSky } = loadLogic(HTML);
  const stars = makeSky(1, 800, 600, 20);
  assert.equal(figureTraits([0, 5, 9, 0], stars, 800, 600).stars, 3);
  assert.equal(figureTraits([0, 5, 9, 4], stars, 800, 600).stars, 4);
});

test('figureTraits: spanRatio = max pairwise distance over chart diagonal', () => {
  const { figureTraits } = loadLogic(HTML);
  const w = 300, h = 400; // diagonal 500
  const stars = [
    { x: 0, y: 0, mag: 1 },
    { x: 300, y: 400, mag: 1 },
    { x: 150, y: 200, mag: 1 },
  ];
  const t = figureTraits([0, 2, 1], stars, w, h);
  assert.ok(Math.abs(t.spanRatio - 1) < 1e-9, `corner-to-corner should be ~1, got ${t.spanRatio}`);
  const tiny = figureTraits([2], stars, w, h);
  assert.equal(tiny.spanRatio, 0, 'a single star spans nothing');
  const half = figureTraits([0, 2], stars, w, h);
  assert.ok(Math.abs(half.spanRatio - 0.5) < 1e-9, `half-diagonal should be ~0.5, got ${half.spanRatio}`);
});

// ---------- slice 3: the forge (names & myths) ----------

const sentencesOf = myth => myth.trim().split(/(?<=\.)\s+/);

test('forgeName: deterministic per rng seed', () => {
  const { forgeName, mulberry } = loadLogic(HTML);
  assert.equal(forgeName(mulberry(11)), forgeName(mulberry(11)));
  assert.notEqual(forgeName(mulberry(11)), forgeName(mulberry(12)));
});

test('forgeName: capitalized, pronounceable, no 3+ consonant runs', () => {
  const { forgeName, mulberry } = loadLogic(HTML);
  for (let seed = 0; seed < 120; seed++) {
    const name = forgeName(mulberry(seed));
    assert.match(name, /^[A-Z][a-z]+$/, `bad shape: ${name}`);
    assert.ok(name.length >= 4 && name.length <= 14, `bad length: ${name}`);
    assert.doesNotMatch(name.toLowerCase(), /[bcdfghjklmnpqrstvwxz]{3}/,
      `3+ consonant run in: ${name}`);
  }
});

test('forgeName: varies across seeds', () => {
  const { forgeName, mulberry } = loadLogic(HTML);
  const names = new Set();
  for (let seed = 0; seed < 50; seed++) names.add(forgeName(mulberry(seed)));
  assert.ok(names.size >= 30, `only ${names.size} unique names in 50 seeds`);
});

test('forgeMyth: deterministic, exactly three sentences, mentions the name', () => {
  const { forgeMyth, mulberry } = loadLogic(HTML);
  const traits = { stars: 5, closed: false, spanRatio: 0.3 };
  const m1 = forgeMyth(mulberry(33), traits, 'Vessara');
  const m2 = forgeMyth(mulberry(33), traits, 'Vessara');
  assert.equal(m1, m2, 'same seed must forge the same myth');
  assert.ok(m1.includes('Vessara'), 'myth must mention the forged name');
  const sentences = sentencesOf(m1);
  assert.equal(sentences.length, 3, `expected 3 sentences, got ${sentences.length}: ${m1}`);
  for (const s of sentences) {
    assert.match(s, /\.$/, `sentence must end with a period: ${s}`);
    assert.ok(s.length > 25, `sentence suspiciously short: ${s}`);
  }
  assert.doesNotMatch(m1, /[!?]/, 'solemn myths do not exclaim');
});

test('forgeMyth: closed figures always draw from the crown/ring family', () => {
  const { forgeMyth, mulberry } = loadLogic(HTML);
  const traits = { stars: 4, closed: true, spanRatio: 0.2 };
  for (let seed = 0; seed < 25; seed++) {
    const m = forgeMyth(mulberry(seed), traits, 'Oreliane');
    assert.match(m, /\b(crown|ring|circlet|diadem)\b/i, `no crown marker (seed ${seed}): ${m}`);
  }
});

test('forgeMyth: wide-span open figures draw from the river family', () => {
  const { forgeMyth, mulberry } = loadLogic(HTML);
  const traits = { stars: 4, closed: false, spanRatio: 0.72 };
  for (let seed = 0; seed < 25; seed++) {
    const m = forgeMyth(mulberry(seed), traits, 'Thamoris');
    assert.match(m, /\b(river|current|flood|estuary|headwaters)\b/i, `no river marker (seed ${seed}): ${m}`);
  }
});

test('forgeMyth: many-star figures draw from the long-pursuit family', () => {
  const { forgeMyth, mulberry } = loadLogic(HTML);
  const traits = { stars: 9, closed: false, spanRatio: 0.3 };
  for (let seed = 0; seed < 25; seed++) {
    const m = forgeMyth(mulberry(seed), traits, 'Calvenna');
    assert.match(m, /\b(pursuit|pursued|chase|chased|hunt|hunted)\b/i, `no pursuit marker (seed ${seed}): ${m}`);
  }
});

test('forgeLegend: deterministic {name, designation, myth} per seed', () => {
  const { forgeLegend } = loadLogic(HTML);
  const traits = { stars: 5, closed: false, spanRatio: 0.3 };
  const a = forgeLegend(77, traits);
  const b = forgeLegend(77, traits);
  assert.deepEqual(a, b, 'same seed must forge the same legend');
  assert.notDeepEqual(forgeLegend(78, traits), a, 'different seeds must differ');
  assert.match(a.name, /^[A-Z][a-z]+$/);
  assert.ok(a.myth.includes(a.name), 'myth must mention the legend name');
  assert.equal(sentencesOf(a.myth).length, 3);
});

test('forgeLegend: designation is "<greek> <Name> <Latin epithet>"', () => {
  const { forgeLegend } = loadLogic(HTML);
  const traits = { stars: 6, closed: true, spanRatio: 0.4 };
  for (const seed of [1, 2, 3, 4, 5]) {
    const { name, designation } = forgeLegend(seed, traits);
    assert.match(designation, /^[α-ω] [A-Z][a-z]+ [A-Z][a-z]+$/u,
      `bad designation: ${designation}`);
    assert.ok(designation.includes(` ${name} `), `designation must carry the name: ${designation}`);
  }
});
