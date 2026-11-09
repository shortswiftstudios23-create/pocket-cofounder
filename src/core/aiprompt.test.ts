import test from 'node:test'; import assert from 'node:assert/strict';
import { aiDailyCap, parseScore, parseFlag, parsePingCopy, systemPrompt, userPrompt, clip, isSerious, MAX_INPUT } from './aiprompt.ts';
test('daily cap grows with trust', () => { assert.equal(aiDailyCap(0), 30); assert.equal(aiDailyCap(3), 60); assert.equal(aiDailyCap(10), 100); });
test('parseScore reads JSON, bare numbers, percentages and clamps', () => {
  assert.equal(parseScore('{"score": 0.8}'), 0.8); assert.equal(parseScore('Score 0.35 ok'), 0.35); assert.equal(parseScore('{"score": 85}'), 0.85);
  assert.equal(parseScore('{"score": 1.0}'), 1); assert.equal(parseScore('no idea'), undefined); assert.equal(parseScore('{"score": -2}'), 0);
});
test('parseFlag fails open on junk', () => { assert.equal(parseFlag('{"flag": true}'), 'flagged'); assert.equal(parseFlag('{"flag":false}'), 'ok'); assert.equal(parseFlag('sure'), 'unknown'); });
test('parsePingCopy takes two lines else the fallback', () => {
  const fb = { title: 'T', body: 'B' };
  assert.deepEqual(parsePingCopy('"Ship it"\nWrite the first paragraph now.', fb), { title: 'Ship it', body: 'Write the first paragraph now.' });
  assert.deepEqual(parsePingCopy('one line only', fb), fb); assert.deepEqual(parsePingCopy('x'.repeat(60) + '\nbody', fb), fb);
});
test('prompts carry the task hint and clip long input', () => {
  assert.match(systemPrompt('missed_task'), /got in the way/); assert.match(systemPrompt('chat'), /ONE question/);
  assert.equal(clip('abcdef', 3), 'abc'); assert.ok(userPrompt('', 'x'.repeat(MAX_INPUT + 50)).length < MAX_INPUT + 120); assert.match(userPrompt('', 'hi'), /nothing yet/);
});
test('serious detection', () => { assert.ok(isSerious('I was in the hospital')); assert.ok(!isSerious('shipping the landing page')); });
