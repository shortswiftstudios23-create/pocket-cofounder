import test from 'node:test'; import assert from 'node:assert/strict';
import { phashFromGray, toGray32 } from './phash.ts'; import { hamming, isDuplicateImage } from './proof.ts';
const bump = (cx: number, cy: number, r: number) => Array.from({ length: 1024 }, (_, i) => { const x = i % 32, y = Math.floor(i / 32); return 200 * Math.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (2 * r * r))); });
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const A = bump(10, 10, 6).map((v, i) => v + 0.5 * bump(24, 22, 4)[i]);
test('hash is 16 hex chars and deterministic', () => { const h = phashFromGray(A); assert.match(h, /^[0-9a-f]{16}$/); assert.equal(h, phashFromGray(A)); });
test('brightness/contrast change keeps the hash', () => assert.ok(hamming(phashFromGray(A), phashFromGray(A.map(v => v * 0.8 + 20))) <= 2));
test('small noise stays within the duplicate threshold', () => assert.ok(isDuplicateImage(phashFromGray(A.map(v => v + (rnd() - 0.5) * 6)), [phashFromGray(A)])));
test('a different picture is not a duplicate', () => {
  const B = bump(24, 8, 5).map((v, i) => v + 0.8 * bump(6, 26, 5)[i]);
  assert.ok(hamming(phashFromGray(A), phashFromGray(B)) > 10); assert.equal(isDuplicateImage(phashFromGray(B), [phashFromGray(A)]), false);
});
test('toGray32 averages blocks', () => {
  const w = 64, h = 64, px = new Uint8Array(w * h * 4).fill(100); const g = toGray32(px, w, h); assert.equal(g.length, 1024); assert.ok(Math.abs(g[500] - 100) < 0.5);
});
test('rejects wrong size', () => assert.throws(() => phashFromGray([1, 2, 3])));
