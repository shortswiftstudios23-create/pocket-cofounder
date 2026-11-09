import test from 'node:test'; import assert from 'node:assert/strict';
import { withinRate, checkBody, canMessage, shouldAutoHide, LIMITS, MAX_COMMENT } from './safety.ts';
test('rate window counts only recent actions', () => {
  const now = 10_000_000; const w = LIMITS.comment.windowMs;
  assert.equal(withinRate(Array(19).fill(now - 1000), now, 20, w), true); assert.equal(withinRate(Array(20).fill(now - 1000), now, 20, w), false);
  assert.equal(withinRate(Array(20).fill(now - w - 1), now, 20, w), true);
});
test('checkBody trims, limits, and rejects link spam', () => {
  assert.deepEqual(checkBody('  hi \n\n\n\nthere ', 50), { ok: true, body: 'hi \n\nthere' });
  assert.equal(checkBody('   ', 50).ok, false); assert.equal(checkBody('a'.repeat(MAX_COMMENT + 1), MAX_COMMENT).ok, false);
  assert.equal(checkBody('http://a.co https://b.co http://c.co', 200).ok, false); assert.equal(checkBody('https://a.co and https://b.co', 200).ok, true);
});
test('messaging needs mutual follow and no block', () => {
  assert.equal(canMessage({ iFollow: true, theyFollow: true, blockedEither: false }).ok, true);
  assert.equal(canMessage({ iFollow: true, theyFollow: false, blockedEither: false }).ok, false);
  assert.equal(canMessage({ iFollow: true, theyFollow: true, blockedEither: true }).ok, false);
});
test('auto-hide threshold', () => { assert.equal(shouldAutoHide(2), false); assert.equal(shouldAutoHide(3), true); });
import { isDeleteConfirmed, DELETE_WORD } from './safety.ts';
test('account deletion needs the exact word', () => { assert.equal(DELETE_WORD, 'DELETE'); assert.equal(isDeleteConfirmed('DELETE'), true); assert.equal(isDeleteConfirmed('  DELETE '), true); assert.equal(isDeleteConfirmed('delete'), false); assert.equal(isDeleteConfirmed(''), false); });
