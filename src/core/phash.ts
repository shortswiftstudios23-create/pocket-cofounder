// Perceptual hash (DCT, 64 bit, 16 hex chars). Pure so it runs in tests and in the edge function.
// Compare results with hamming() from proof.ts. Distance <= 6 counts as the same image.
const N = 32, K = 8;
const COS: number[][] = Array.from({ length: K }, (_, u) => Array.from({ length: N }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N))));

/** `gray` is N*N luminance values (row-major), already resized to 32x32. */
export function phashFromGray(gray: ArrayLike<number>): string {
  if (gray.length !== N * N) throw new Error('phashFromGray needs 32x32 input');
  // Separable DCT: rows then columns, only the low 8x8 block is kept.
  const tmp = new Float64Array(N * K); // [y][u]
  for (let y = 0; y < N; y++) for (let u = 0; u < K; u++) { let s = 0; for (let x = 0; x < N; x++) s += gray[y * N + x] * COS[u][x]; tmp[y * K + u] = s; }
  const c: number[] = [];
  for (let v = 0; v < K; v++) for (let u = 0; u < K; u++) { let s = 0; for (let y = 0; y < N; y++) s += tmp[y * K + u] * COS[v][y]; c.push(s); }
  const ac = c.slice(1).sort((a, b) => a - b);
  const median = ac[Math.floor(ac.length / 2)];
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    let nib = 0;
    for (let b = 0; b < 4; b++) nib = (nib << 1) | (i + b > 0 && c[i + b] > median ? 1 : 0);
    hex += nib.toString(16);
  }
  return hex;
}

/** Box-average an RGBA bitmap down to 32x32 luminance. */
export function toGray32(rgba: ArrayLike<number>, w: number, h: number): number[] {
  const out = new Array<number>(N * N).fill(0);
  for (let oy = 0; oy < N; oy++) for (let ox = 0; ox < N; ox++) {
    const x0 = Math.floor((ox * w) / N), x1 = Math.max(x0 + 1, Math.floor(((ox + 1) * w) / N));
    const y0 = Math.floor((oy * h) / N), y1 = Math.max(y0 + 1, Math.floor(((oy + 1) * h) / N));
    let sum = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * w + x) * 4; sum += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]; n++; }
    out[oy * N + ox] = sum / n;
  }
  return out;
}
