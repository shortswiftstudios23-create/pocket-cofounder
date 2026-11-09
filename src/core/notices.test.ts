import test from 'node:test'; import assert from 'node:assert/strict';
import { unseenAppealNotices, newestStamp, type ResolvedAppeal } from './notices.ts';
const row = (id: string, s: ResolvedAppeal['appeal_status'], at: string | null, t = 'Ship it'): ResolvedAppeal => ({ id, appeal_status: s, appeal_resolved_at: at, task_title: t });
test('only resolved appeals newer than the last dismissal show, newest first', () => {
  const rows = [row('a', 'upheld', '2026-11-09T10:00:00Z'), row('b', 'overturned', '2026-11-09T12:00:00Z'), row('c', 'pending', null), row('d', 'none', null), row('e', 'upheld', '2026-11-01T00:00:00Z')];
  const n = unseenAppealNotices(rows, '2026-11-05T00:00:00Z'); assert.deepEqual(n.map(x => x.id), ['b', 'a']);
  assert.match(n[0].text, /accepted/); assert.match(n[1].text, /decision stands/);
});
test('nothing dismissed yet shows every resolved appeal; dismissing at the newest hides all', () => {
  const rows = [row('a', 'upheld', '2026-11-09T10:00:00Z'), row('b', 'overturned', '2026-11-09T12:00:00Z')];
  const all = unseenAppealNotices(rows, null); assert.equal(all.length, 2);
  assert.equal(newestStamp(all), '2026-11-09T12:00:00Z'); assert.deepEqual(unseenAppealNotices(rows, newestStamp(all)), []);
  assert.equal(newestStamp([]), null);
});
