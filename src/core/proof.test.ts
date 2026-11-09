import test from 'node:test'; import assert from 'node:assert/strict';
import { decideProof, hamming, type ProofInput } from './proof.ts';
const b: ProofInput = { kind: 'link', content: 'https://github.com/a/b/commit/1', existingLinks: [], existingHashes: [], trustLevel: 5, relatedScore: 0.9 };
test('good link accepted', () => assert.equal(decideProof(b).status, 'accepted'));
test('reused link rejected (normalized)', () => assert.equal(decideProof({ ...b, existingLinks: ['http://www.github.com/a/b/commit/1/'] }).status, 'not_accepted'));
test('bad link rejected', () => assert.equal(decideProof({ ...b, content: 'hello' }).status, 'not_accepted'));
test('duplicate image rejected, distinct accepted', () => {
  const i = { ...b, kind: 'photo' as const, content: '', phash: 'ffff0000ffff0000', existingHashes: ['ffff0000ffff0001'] };
  assert.equal(decideProof(i).status, 'not_accepted');
  assert.equal(decideProof({ ...i, existingHashes: ['0000ffff0000ffff'] }).status, 'accepted');
});
test('short text needs follow-up', () => assert.equal(decideProof({ ...b, kind: 'text', content: 'did it' }).status, 'needs_followup'));
test('new accounts stricter', () => {
  assert.equal(decideProof({ ...b, relatedScore: 0.5, trustLevel: 0 }).status, 'needs_followup');
  assert.equal(decideProof({ ...b, relatedScore: 0.5, trustLevel: 5 }).status, 'accepted');
});
test('hamming', () => assert.equal(hamming('f', '0'), 4));
