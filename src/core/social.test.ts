import test from 'node:test'; import assert from 'node:assert/strict';
import { summarizeReactions, visibleOnly, convoPair, otherUser, unreadCount, timeAgo, cleanSearch } from './social.ts';
test('reaction summary counts and marks mine', () => {
  const s = summarizeReactions([{ kind: 'fire', user_id: 'a' }, { kind: 'fire', user_id: 'me' }, { kind: 'check', user_id: 'b' }], 'me');
  assert.deepEqual(s.fire, { count: 2, mine: true }); assert.deepEqual(s.clap, { count: 0, mine: false }); assert.deepEqual(s.check, { count: 1, mine: false });
});
test('visibleOnly drops hidden and blocked', () => {
  const r = visibleOnly([{ user_id: 'a' }, { user_id: 'b', hidden: true }, { user_id: 'c' }], new Set(['c'])); assert.deepEqual(r, [{ user_id: 'a' }]);
});
test('convo pair is order independent', () => { assert.deepEqual(convoPair('b', 'a'), ['a', 'b']); assert.deepEqual(convoPair('a', 'b'), ['a', 'b']); assert.equal(otherUser({ user_a: 'a', user_b: 'b' }, 'a'), 'b'); });
test('unread counts only others unread', () => { assert.equal(unreadCount([{ sender_id: 'x', read_at: null }, { sender_id: 'me', read_at: null }, { sender_id: 'x', read_at: 't' }], 'me'), 1); });
test('timeAgo buckets', () => {
  const now = Date.parse('2026-11-09T12:00:00Z');
  assert.equal(timeAgo('2026-11-09T11:59:40Z', now), 'now'); assert.equal(timeAgo('2026-11-09T11:30:00Z', now), '30m'); assert.equal(timeAgo('2026-11-09T07:00:00Z', now), '5h');
  assert.equal(timeAgo('2026-11-07T12:00:00Z', now), '2d'); assert.equal(timeAgo('2026-10-01T12:00:00Z', now), '2026-10-01');
});
test('cleanSearch strips wildcards and needs 2 chars', () => { assert.equal(cleanSearch(' a '), undefined); assert.equal(cleanSearch('jo%hn_'), 'john'); });
import { badgeLabel, imagePaths } from './social.ts';
test('badgeLabel hides zero and caps at 9+', () => { assert.equal(badgeLabel(0), undefined); assert.equal(badgeLabel(-1), undefined); assert.equal(badgeLabel(4), '4'); assert.equal(badgeLabel(9), '9'); assert.equal(badgeLabel(10), '9+'); });
test('imagePaths picks unique photo/screenshot paths only', () => {
  const items = [{ kind: 'photo', media_path: 'u/1.jpg' }, { kind: 'screenshot', media_path: 'u/2.jpg' }, { kind: 'photo', media_path: 'u/1.jpg' }, { kind: 'text', media_path: null }, { kind: 'photo', media_path: null }, { kind: 'link', media_path: 'u/x.jpg' }];
  assert.deepEqual(imagePaths(items), ['u/1.jpg', 'u/2.jpg']);
});
