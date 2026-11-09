import test from 'node:test'; import assert from 'node:assert/strict';
import { resolveAppeal } from './appeal.ts';
test('overturn accepts the proof and finishes the task', () => {
  const r = resolveAppeal('not_accepted', 'overturn'); assert.equal(r.proof.status, 'accepted'); assert.equal(r.proof.appeal_status, 'overturned'); assert.equal(r.taskDone, true); assert.equal(r.trustDelta, 1);
});
test('uphold keeps status and carries the note', () => {
  const r = resolveAppeal('needs_followup', 'uphold', ' same link as before '); assert.equal(r.proof.status, 'needs_followup'); assert.equal(r.proof.appeal_status, 'upheld');
  assert.equal(r.proof.status_reason, 'Review: same link as before'); assert.equal(r.taskDone, false); assert.equal(r.trustDelta, 0);
});
