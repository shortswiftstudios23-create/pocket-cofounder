import test from 'node:test'; import assert from 'node:assert/strict';
import { messagePush, commentPush, shouldPushMessage, shouldPushComment, MAX_DM_PUSHES_PER_BURST } from './socialpush.ts';
test('message push never carries the message text and links to the thread', () => {
  const p = messagePush('Sam', 'c1'); assert.deepEqual(p, { title: 'Sam', body: 'Sent you a message', tag: 'dm-c1', url: '/thread/c1' });
  assert.equal(messagePush('  ', 'c1').title, 'Someone'); assert.equal(messagePush('x'.repeat(100), 'c1').title.length, 40);
});
test('comment push names the commenter and the task', () => {
  const p = commentPush('Ana', 'Write landing page', 'p9'); assert.equal(p.title, 'Ana commented on your proof'); assert.equal(p.body, 'Write landing page'); assert.equal(p.url, '/proof/p9');
});
test('message push is skipped for blocks, hidden messages and long unread bursts', () => {
  assert.equal(shouldPushMessage({ unreadFromSender: 1, blockedEither: false, hidden: false }), true);
  assert.equal(shouldPushMessage({ unreadFromSender: MAX_DM_PUSHES_PER_BURST, blockedEither: false, hidden: false }), true);
  assert.equal(shouldPushMessage({ unreadFromSender: MAX_DM_PUSHES_PER_BURST + 1, blockedEither: false, hidden: false }), false);
  assert.equal(shouldPushMessage({ unreadFromSender: 1, blockedEither: true, hidden: false }), false); assert.equal(shouldPushMessage({ unreadFromSender: 1, blockedEither: false, hidden: true }), false);
});
test('comment push skips your own comments, blocks and hidden comments', () => {
  assert.equal(shouldPushComment({ commenter: 'a', owner: 'b', blockedEither: false, hidden: false }), true);
  assert.equal(shouldPushComment({ commenter: 'a', owner: 'a', blockedEither: false, hidden: false }), false);
  assert.equal(shouldPushComment({ commenter: 'a', owner: 'b', blockedEither: true, hidden: false }), false); assert.equal(shouldPushComment({ commenter: 'a', owner: 'b', blockedEither: false, hidden: true }), false);
});
