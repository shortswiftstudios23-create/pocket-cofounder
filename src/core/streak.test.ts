import test from 'node:test'; import assert from 'node:assert/strict';
import { computeStreak, badgesFor } from './streak.ts';
test('consecutive days count, pending today keeps streak', () => {
  const r = computeStreak(['2026-11-05','2026-11-06','2026-11-07'], '2026-11-08');
  assert.equal(r.current, 3); assert.equal(r.doneToday, false);
});
test('one missed day resets to zero', () => assert.equal(computeStreak(['2026-11-05','2026-11-06'], '2026-11-08').current, 0));
test('longest survives reset; duplicates ignored', () => {
  const r = computeStreak(['2026-10-01','2026-10-02','2026-10-03','2026-10-03','2026-11-08'], '2026-11-08');
  assert.equal(r.longest, 3); assert.equal(r.current, 1);
});
test('badges', () => assert.deepEqual(badgesFor(30), [7, 30]));
