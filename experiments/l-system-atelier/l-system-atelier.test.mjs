import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from '../_harness/logic.mjs';

const HTML = new URL('./index.html', import.meta.url).pathname;

// ---------- slice 1 — expand ----------

test('expand: n = 0 returns the axiom unchanged', () => {
  const { expand } = loadLogic(HTML);
  assert.equal(expand('F+F', { F: 'FF' }, 0), 'F+F');
});

test('expand: algae system lengths follow Fibonacci', () => {
  const { expand } = loadLogic(HTML);
  const rules = { A: 'AB', B: 'A' };
  // |expand('A', n)| = fib(n+1) with fib(1)=1, fib(2)=1: 1,2,3,5,8,...
  const fib = [1, 2];
  for (let i = 2; i <= 10; i++) fib.push(fib[i - 1] + fib[i - 2]);
  for (let n = 0; n <= 10; n++) {
    assert.equal(expand('A', rules, n).length, fib[n], `length at n=${n}`);
  }
});

test('expand: first algae derivations are exact', () => {
  const { expand } = loadLogic(HTML);
  const rules = { A: 'AB', B: 'A' };
  assert.equal(expand('A', rules, 1), 'AB');
  assert.equal(expand('A', rules, 2), 'ABA');
  assert.equal(expand('A', rules, 3), 'ABAAB');
  assert.equal(expand('A', rules, 4), 'ABAABABA');
});

test('expand: non-rule symbols copy through unchanged', () => {
  const { expand } = loadLogic(HTML);
  assert.equal(expand('F[+F]-f', { F: 'FF' }, 1), 'FF[+FF]-f');
  assert.equal(expand('+-[]f', {}, 3), '+-[]f');
});

test('expand: rules apply in parallel, not sequentially', () => {
  const { expand } = loadLogic(HTML);
  // sequential application of A→B then B→A would collapse; parallel swaps
  assert.equal(expand('AB', { A: 'B', B: 'A' }, 1), 'BA');
});

// ---------- slice 2 — interpret ----------

const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('interpret: Koch curve segment count is 4^n', () => {
  const { expand, interpret } = loadLogic(HTML);
  const rules = { F: 'F+F-F+F' };
  for (let n = 0; n <= 4; n++) {
    const s = expand('F', rules, n);
    const { segments } = interpret(s, { angle: 85, step: 5 });
    assert.equal(segments.length, 4 ** n, `segments at n=${n}`);
  }
});

test('interpret: turtle starts heading up and F draws one step', () => {
  const { interpret } = loadLogic(HTML);
  const { segments } = interpret('F', { angle: 25, step: 10 });
  assert.equal(segments.length, 1);
  const [s] = segments;
  close(s.x2 - s.x1, 0, 'no horizontal drift');
  close(s.y2 - s.y1, -10, 'one step upward (screen coords)');
});

test('interpret: unbracketed segments chain end to start', () => {
  const { interpret } = loadLogic(HTML);
  const { segments } = interpret('F+F-FF', { angle: 30, step: 7 });
  assert.equal(segments.length, 4);
  for (let i = 1; i < segments.length; i++) {
    close(segments[i].x1, segments[i - 1].x2, `x chain at ${i}`);
    close(segments[i].y1, segments[i - 1].y2, `y chain at ${i}`);
  }
});

test('interpret: + and - turn by the given angle', () => {
  const { interpret } = loadLogic(HTML);
  const { segments } = interpret('F+F', { angle: 90, step: 10 });
  const [a, b] = segments;
  const dot = (a.x2 - a.x1) * (b.x2 - b.x1) + (a.y2 - a.y1) * (b.y2 - b.y1);
  close(dot, 0, '90-degree turn makes perpendicular segments');
  const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
  close(len, 10, 'turned segment keeps step length');
});

test('interpret: F[+F]F yields 3 segments and the post-pop segment continues from the pre-push position', () => {
  const { interpret } = loadLogic(HTML);
  const { segments } = interpret('F[+F]F', { angle: 45, step: 10 });
  assert.equal(segments.length, 3);
  const [trunk, branch, after] = segments;
  // branch grows from the trunk tip
  close(branch.x1, trunk.x2, 'branch starts at trunk tip x');
  close(branch.y1, trunk.y2, 'branch starts at trunk tip y');
  // after the pop, the turtle is back at the trunk tip, original heading
  close(after.x1, trunk.x2, 'post-pop x continues from pre-push position');
  close(after.y1, trunk.y2, 'post-pop y continues from pre-push position');
  close(after.x2 - after.x1, trunk.x2 - trunk.x1, 'heading restored x');
  close(after.y2 - after.y1, trunk.y2 - trunk.y1, 'heading restored y');
});

test('interpret: depth equals bracket nesting at draw time', () => {
  const { interpret } = loadLogic(HTML);
  const { segments } = interpret('F[F[F]F]F', { angle: 25, step: 5 });
  assert.deepEqual(segments.map(s => s.depth), [0, 1, 2, 1, 0]);
});

test('interpret: f moves without drawing', () => {
  const { interpret } = loadLogic(HTML);
  const { segments } = interpret('FfF', { angle: 25, step: 10 });
  assert.equal(segments.length, 2);
  // the gap: second segment starts one full step beyond the first's end
  close(segments[1].y1, segments[0].y2 - 10, 'skipped one step');
});

test('interpret: silent symbols draw nothing', () => {
  const { interpret } = loadLogic(HTML);
  const { segments } = interpret('XYZAB', { angle: 25, step: 10 });
  assert.equal(segments.length, 0);
});

test('interpret: bounds tightly contain every segment endpoint', () => {
  const { expand, interpret } = loadLogic(HTML);
  const s = expand('F', { F: 'FF+[+F-F-F]-[-F+F+F]' }, 3);
  const { segments, bounds } = interpret(s, { angle: 22.5, step: 6 });
  assert.ok(segments.length > 0);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const g of segments) {
    for (const [x, y] of [[g.x1, g.y1], [g.x2, g.y2]]) {
      assert.ok(x >= bounds.minX - 1e-9 && x <= bounds.maxX + 1e-9, `x ${x} in bounds`);
      assert.ok(y >= bounds.minY - 1e-9 && y <= bounds.maxY + 1e-9, `y ${y} in bounds`);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  close(bounds.minX, minX, 'tight minX');
  close(bounds.maxX, maxX, 'tight maxX');
  close(bounds.minY, minY, 'tight minY');
  close(bounds.maxY, maxY, 'tight maxY');
});
