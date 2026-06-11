import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;

// ---------- slice 1 — seeded noise & fbm ----------

test('mulberry: same seed gives the same sequence, in [0,1)', () => {
  const { mulberry } = loadLogic(HTML);
  const a = mulberry(1234), b = mulberry(1234);
  for (let i = 0; i < 200; i++) {
    const va = a(), vb = b();
    assert.equal(va, vb, `diverged at draw ${i}`);
    assert.ok(va >= 0 && va < 1, `value ${va} out of [0,1)`);
  }
});

test('mulberry: different seeds give different sequences', () => {
  const { mulberry } = loadLogic(HTML);
  const a = mulberry(1), b = mulberry(2);
  let same = 0;
  for (let i = 0; i < 50; i++) if (a() === b()) same++;
  assert.ok(same < 5, `sequences nearly identical (${same}/50 equal draws)`);
});

test('makeNoise: deterministic per seed, in [0,1] on a sample grid', () => {
  const { makeNoise } = loadLogic(HTML);
  const n1 = makeNoise(42), n2 = makeNoise(42);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const v = n1(x * 1.7, y * 2.3);
      assert.equal(v, n2(x * 1.7, y * 2.3), `not deterministic at (${x},${y})`);
      assert.ok(v >= 0 && v <= 1, `noise ${v} out of [0,1] at (${x},${y})`);
    }
  }
});

test('makeNoise: different seeds give different fields', () => {
  const { makeNoise } = loadLogic(HTML);
  const n1 = makeNoise(42), n2 = makeNoise(43);
  let diff = 0;
  for (let i = 0; i < 40; i++) {
    if (Math.abs(n1(i * 0.9, i * 1.3) - n2(i * 0.9, i * 1.3)) > 1e-6) diff++;
  }
  assert.ok(diff > 30, `fields look identical (${diff}/40 samples differ)`);
});

test('fbm: in [0,1] across a sample grid', () => {
  const { makeNoise, fbm } = loadLogic(HTML);
  const noise = makeNoise(7);
  for (let y = -8; y <= 8; y += 1.3) {
    for (let x = -8; x <= 8; x += 1.3) {
      const v = fbm(noise, x, y, 5);
      assert.ok(v >= 0 && v <= 1, `fbm ${v} out of [0,1] at (${x},${y})`);
    }
  }
});

test('fbm: deterministic per seed', () => {
  const { makeNoise, fbm } = loadLogic(HTML);
  const a = makeNoise(99), b = makeNoise(99);
  for (let i = 0; i < 30; i++) {
    assert.equal(fbm(a, i * 0.37, i * 0.61, 5), fbm(b, i * 0.37, i * 0.61, 5));
  }
});

// ---------- slice 2 — biome table & character ramps ----------

const BIOME_IDS = ['deep-sea', 'sea', 'shore', 'plains', 'grass', 'forest', 'hills', 'mountains', 'snow'];

test('BIOMES: nine biomes, each with id, name, ramp, color, suffixes', () => {
  const { BIOMES } = loadLogic(HTML);
  const hex = /^#[0-9a-f]{6}$/i;
  for (const id of BIOME_IDS) {
    const b = BIOMES[id];
    assert.ok(b, `missing biome ${id}`);
    assert.equal(b.id, id);
    assert.ok(typeof b.name === 'string' && b.name.length > 0, `${id} needs a name`);
    assert.ok(Array.isArray(b.chars) && b.chars.length >= 1, `${id} needs a char ramp`);
    for (const ch of b.chars) assert.equal(typeof ch, 'string');
    assert.match(b.color, hex, `${id} color must be #rrggbb`);
    assert.ok(Array.isArray(b.suffixes) && b.suffixes.length >= 2, `${id} needs suffixes`);
  }
  assert.equal(Object.keys(BIOMES).length, BIOME_IDS.length, 'no extra biomes');
});

test('biomeFor: totally covers [0,1]^2 with valid biome ids', () => {
  const { biomeFor, BIOMES } = loadLogic(HTML);
  for (let h = 0; h <= 1.0001; h += 0.05) {
    for (let m = 0; m <= 1.0001; m += 0.05) {
      const id = biomeFor(Math.min(h, 1), Math.min(m, 1));
      assert.ok(BIOMES[id], `biomeFor(${h.toFixed(2)},${m.toFixed(2)}) = ${id} is not a biome`);
    }
  }
});

test('biomeFor: deep sea at h=0, snow at h=1, for any moisture', () => {
  const { biomeFor } = loadLogic(HTML);
  for (const m of [0, 0.25, 0.5, 0.75, 1]) {
    assert.equal(biomeFor(0, m), 'deep-sea');
    assert.equal(biomeFor(1, m), 'snow');
  }
});

test('biomeFor: moisture splits the mid band into plains/grass/forest', () => {
  const { biomeFor } = loadLogic(HTML);
  const seen = new Set();
  for (let h = 0; h <= 1.0001; h += 0.02) {
    for (const m of [0.05, 0.5, 0.95]) seen.add(biomeFor(Math.min(h, 1), m));
  }
  for (const id of BIOME_IDS) assert.ok(seen.has(id), `${id} unreachable in sweep`);
});

test('charFor: deterministic and always a member of the biome ramp', () => {
  const { charFor, BIOMES } = loadLogic(HTML);
  for (const id of BIOME_IDS) {
    for (let h = 0; h <= 1.0001; h += 0.07) {
      const hh = Math.min(h, 1);
      const c = charFor(id, hh);
      assert.equal(c, charFor(id, hh), `charFor(${id},${hh}) not deterministic`);
      assert.ok(BIOMES[id].chars.includes(c), `charFor(${id},${hh}) = ${JSON.stringify(c)} not in ramp`);
    }
  }
});

test('charFor: low h picks the low end of the ramp, high h the high end', () => {
  const { charFor, BIOMES } = loadLogic(HTML);
  for (const id of BIOME_IDS) {
    const ramp = BIOMES[id].chars;
    assert.equal(charFor(id, 0), ramp[0], `${id} at h=0`);
    assert.equal(charFor(id, 1), ramp[ramp.length - 1], `${id} at h=1`);
  }
});

test('fbm: smooth — small step changes value by < 0.05', () => {
  const { makeNoise, fbm } = loadLogic(HTML);
  const noise = makeNoise(2026);
  for (let i = 0; i < 300; i++) {
    const x = (i % 25) * 0.83, y = Math.floor(i / 25) * 0.71;
    const d = Math.abs(fbm(noise, x, y, 5) - fbm(noise, x + 0.01, y, 5));
    assert.ok(d < 0.05, `fbm jumped ${d} at (${x},${y})`);
  }
});
