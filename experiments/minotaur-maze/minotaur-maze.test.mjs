import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;

// ---------- slice 1: seeded RNG and maze generation ----------

test('mulberry: same seed yields an identical sequence', () => {
  const { mulberry } = loadLogic(HTML);
  const a = mulberry(42), b = mulberry(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('mulberry: different seeds yield different sequences', () => {
  const { mulberry } = loadLogic(HTML);
  const a = mulberry(1), b = mulberry(2);
  let same = true;
  for (let i = 0; i < 20; i++) if (a() !== b()) same = false;
  assert.ok(!same, 'seeds 1 and 2 produced identical 20-value prefixes');
});

test('mulberry: outputs stay in [0, 1)', () => {
  const { mulberry } = loadLogic(HTML);
  const r = mulberry(7);
  for (let i = 0; i < 1000; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
  }
});

test('generateMaze: returns walls Uint8Array of w*h plus dimensions', () => {
  const { generateMaze } = loadLogic(HTML);
  const m = generateMaze(9, 7, 3);
  assert.ok(m.walls instanceof Uint8Array);
  assert.equal(m.walls.length, 9 * 7);
  assert.equal(m.w, 9);
  assert.equal(m.h, 7);
  assert.ok(Array.isArray(m.carveOrder));
});

test('generateMaze: perfection — exactly w*h-1 carved openings', () => {
  const { generateMaze } = loadLogic(HTML);
  for (const [w, h, seed] of [[5, 5, 1], [25, 17, 42], [12, 9, 99]]) {
    const m = generateMaze(w, h, seed);
    // each carved opening clears one bit on each of the two cells it joins
    let cleared = 0;
    for (const cell of m.walls) {
      for (const bit of [1, 2, 4, 8]) if (!(cell & bit)) cleared++;
    }
    assert.equal(cleared, 2 * (w * h - 1), `maze ${w}x${h} seed ${seed} is not a tree`);
  }
});

test('generateMaze: same seed reproduces identical walls and carveOrder', () => {
  const { generateMaze } = loadLogic(HTML);
  const a = generateMaze(25, 17, 42);
  const b = generateMaze(25, 17, 42);
  assert.deepEqual(Array.from(a.walls), Array.from(b.walls));
  assert.deepEqual(a.carveOrder, b.carveOrder);
});

test('generateMaze: different seeds produce different walls', () => {
  const { generateMaze } = loadLogic(HTML);
  const a = generateMaze(25, 17, 1);
  const b = generateMaze(25, 17, 2);
  assert.notDeepEqual(Array.from(a.walls), Array.from(b.walls));
});

// ---------- slice 3: structural acceptance of the logic surface ----------

test('structure: logic block exports the full documented surface', () => {
  const logic = loadLogic(HTML);
  for (const fn of ['mulberry', 'generateMaze', 'solve', 'canMove', 'neighbors']) {
    assert.equal(typeof logic[fn], 'function', `${fn} must be a function`);
  }
  assert.equal(typeof logic.DIRS, 'object', 'DIRS must be an object');
  for (const key of ['N', 'E', 'S', 'W']) {
    const d = logic.DIRS[key];
    assert.ok(d && typeof d.bit === 'number' && typeof d.opp === 'number',
      `DIRS.${key} must carry bit and opp`);
  }
  // bitmask convention from the design: N=1, E=2, S=4, W=8
  assert.equal(logic.DIRS.N.bit, 1);
  assert.equal(logic.DIRS.E.bit, 2);
  assert.equal(logic.DIRS.S.bit, 4);
  assert.equal(logic.DIRS.W.bit, 8);
});

test('structure: default-size maze generates and solves with a sane path', () => {
  const { generateMaze, solve } = loadLogic(HTML);
  const m = generateMaze(25, 17, 42);
  const path = solve(m, 0, m.w * m.h - 1);
  assert.ok(path.length >= m.w + m.h - 1,
    `solution length ${path.length} shorter than Manhattan minimum`);
  assert.ok(path.length <= m.w * m.h, 'solution longer than the cell count');
});

// ---------- slice 2: movement and solving ----------

test('canMove: edge cells are blocked outward', () => {
  const { generateMaze, canMove } = loadLogic(HTML);
  const m = generateMaze(8, 6, 11);
  for (let x = 0; x < m.w; x++) {
    assert.equal(canMove(m, x, 'N'), false, `top row open north at x=${x}`);
    assert.equal(canMove(m, (m.h - 1) * m.w + x, 'S'), false, `bottom row open south at x=${x}`);
  }
  for (let y = 0; y < m.h; y++) {
    assert.equal(canMove(m, y * m.w, 'W'), false, `left col open west at y=${y}`);
    assert.equal(canMove(m, y * m.w + m.w - 1, 'E'), false, `right col open east at y=${y}`);
  }
});

test('canMove: wall symmetry — open N from a cell iff open S from its northern neighbor', () => {
  const { generateMaze, canMove } = loadLogic(HTML);
  const m = generateMaze(15, 11, 23);
  for (let y = 1; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const cell = y * m.w + x;
      const north = cell - m.w;
      assert.equal(canMove(m, cell, 'N'), canMove(m, north, 'S'), `asymmetric N/S at cell ${cell}`);
    }
  }
  for (let y = 0; y < m.h; y++) {
    for (let x = 1; x < m.w; x++) {
      const cell = y * m.w + x;
      const west = cell - 1;
      assert.equal(canMove(m, cell, 'W'), canMove(m, west, 'E'), `asymmetric W/E at cell ${cell}`);
    }
  }
});

test('neighbors: returns exactly the open-adjacent cells', () => {
  const { generateMaze, canMove, neighbors } = loadLogic(HTML);
  const m = generateMaze(10, 7, 31);
  for (let cell = 0; cell < m.w * m.h; cell++) {
    const expected = [];
    if (canMove(m, cell, 'N')) expected.push(cell - m.w);
    if (canMove(m, cell, 'E')) expected.push(cell + 1);
    if (canMove(m, cell, 'S')) expected.push(cell + m.w);
    if (canMove(m, cell, 'W')) expected.push(cell - 1);
    assert.deepEqual([...neighbors(m, cell)].sort((a, b) => a - b),
      expected.sort((a, b) => a - b), `neighbor mismatch at cell ${cell}`);
  }
});

test('solve: BFS from cell 0 reaches every cell (the maze is connected)', () => {
  const { generateMaze, solve } = loadLogic(HTML);
  const m = generateMaze(25, 17, 42);
  for (const end of [m.w - 1, (m.h - 1) * m.w, m.w * m.h - 1, ((m.h / 2) | 0) * m.w + ((m.w / 2) | 0)]) {
    const path = solve(m, 0, end);
    assert.ok(Array.isArray(path) && path.length > 0, `no path 0 -> ${end}`);
  }
});

test('solve: path starts/ends correctly, hops are open neighbors, no repeats', () => {
  const { generateMaze, solve, neighbors } = loadLogic(HTML);
  const m = generateMaze(25, 17, 7);
  const start = 0, end = m.w * m.h - 1;
  const path = solve(m, start, end);
  assert.equal(path[0], start);
  assert.equal(path[path.length - 1], end);
  const seen = new Set(path);
  assert.equal(seen.size, path.length, 'path revisits a cell');
  for (let i = 1; i < path.length; i++) {
    assert.ok(neighbors(m, path[i - 1]).includes(path[i]),
      `hop ${path[i - 1]} -> ${path[i]} crosses a wall`);
  }
});

test('generateMaze: carveOrder visits every cell, starting at cell 0', () => {
  const { generateMaze } = loadLogic(HTML);
  const m = generateMaze(10, 8, 5);
  assert.equal(m.carveOrder[0], 0, 'carve must start at the entrance');
  const seen = new Set(m.carveOrder);
  assert.equal(seen.size, 10 * 8, 'carveOrder must visit every cell at least once');
});
