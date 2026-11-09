import test from 'node:test'; import assert from 'node:assert/strict';
import { dayKey, addDays, weekdayIndex, heatmapColumns } from './day.ts';
test('dayKey respects time zone', () => {
  const d = new Date('2026-11-08T17:30:00Z');
  assert.equal(dayKey(d, 'Asia/Shanghai'), '2026-11-09'); assert.equal(dayKey(d, 'America/Los_Angeles'), '2026-11-08');
});
test('addDays crosses months', () => { assert.equal(addDays('2026-11-30', 1), '2026-12-01'); assert.equal(addDays('2026-03-01', -1), '2026-02-28'); });
test('weekday Mon=0', () => { assert.equal(weekdayIndex('2026-11-09'), 0); assert.equal(weekdayIndex('2026-11-08'), 6); });
test('heatmap shape', () => {
  const c = heatmapColumns('2026-11-08', 12); // Sunday
  assert.equal(c.length, 12); assert.ok(c.every(x => x.length === 7)); assert.equal(c[11][6], '2026-11-08');
  const mid = heatmapColumns('2026-11-10', 2); assert.equal(mid[1][0], '2026-11-09'); assert.equal(mid[1][2], null);
});
