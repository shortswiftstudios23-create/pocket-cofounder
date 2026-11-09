import test from 'node:test'; import assert from 'node:assert/strict';
import { STEPS, parseClock, parseDeadline, toRecords, type Draft } from './onboarding.ts';
test('parseClock', () => {
  assert.equal(parseClock('7:30'), 450); assert.equal(parseClock('11pm'), 1380); assert.equal(parseClock('12am'), 0); assert.equal(parseClock('12pm'), 720);
  assert.equal(parseClock('midnight'), 0); assert.equal(parseClock('25:00'), undefined); assert.equal(parseClock('soon'), undefined);
});
test('parseDeadline', () => {
  assert.equal(parseDeadline('2 weeks', '2026-11-08'), '2026-11-22'); assert.equal(parseDeadline('No deadline', '2026-11-08'), null);
  assert.equal(parseDeadline('2027-01-31', '2026-11-08'), '2027-01-31'); assert.equal(parseDeadline('whenever', '2026-11-08'), undefined);
});
test('full script produces records', () => {
  const answers = ['Ana', 'A habit app', 'Building', 'SaaS', '10 paying customers', '3 months', '20', '7:00', '23:00'];
  let d: Draft = {};
  STEPS.forEach((s, i) => { const r = s.apply(answers[i], d, '2026-11-08'); assert.ok(r.ok, s.id); if (r.ok) d = r.draft; });
  const rec = toRecords(d, 'Asia/Shanghai');
  assert.equal(rec.profile.wake_min, 420); assert.equal(rec.profile.sleep_min, 1380); assert.equal(rec.profile.onboarded, true);
  assert.equal(rec.goal.deadline, '2027-02-06'); assert.equal(rec.goal.weekly_hours, 20); assert.match(rec.memory.body, /Ana is building A habit app/);
});
test('bad answers are rejected with a message', () => {
  for (const [id, bad] of [['goal', 'x'], ['hours', 'lots'], ['wake', 'early'], ['deadline', 'soonish']] as const) {
    const r = STEPS.find(s => s.id === id)!.apply(bad, {}, '2026-11-08'); assert.equal(r.ok, false, id);
  }
});
test('every chip is accepted by its own step', () => {
  for (const s of STEPS) for (const c of s.chips ?? []) assert.ok(s.apply(c, {}, '2026-11-08').ok, `${s.id}:${c}`);
});
