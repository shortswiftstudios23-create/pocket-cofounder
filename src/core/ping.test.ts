import test from 'node:test'; import assert from 'node:assert/strict';
import { shouldPing, type PingState } from './ping.ts';
const base: PingState = { now: new Date('2026-11-08T15:00:00Z'), tz: 'UTC', wakeMin: 420, sleepMin: 1380, intervalMin: 90,
  sentToday: 0, cap: 6, proofSent: false, notToday: false, taskOpenSince: new Date('2026-11-08T09:00:00Z') };
test('first ping is a nudge', () => { const r = shouldPing(base); assert.equal(r.ping, true); assert.equal(r.stage, 'nudge'); });
test('stages escalate then hold at challenge', () => assert.equal(shouldPing({ ...base, sentToday: 5 }).stage, 'challenge'));
test('stops on proof and not-today', () => {
  assert.equal(shouldPing({ ...base, proofSent: true }).reason, 'proof_sent');
  assert.equal(shouldPing({ ...base, notToday: true }).reason, 'not_today');
});
test('cap and quiet hours, time zone aware', () => {
  assert.equal(shouldPing({ ...base, sentToday: 6 }).reason, 'cap');
  assert.equal(shouldPing({ ...base, now: new Date('2026-11-08T23:30:00Z') }).reason, 'quiet_hours');
  assert.equal(shouldPing({ ...base, tz: 'Asia/Dhaka', now: new Date('2026-11-08T20:00:00Z') }).reason, 'quiet_hours');
  assert.equal(shouldPing({ ...base, tz: 'Asia/Dhaka' }).ping, true);
});
test('interval spacing', () => assert.equal(shouldPing({ ...base, lastSentAt: new Date('2026-11-08T14:30:00Z') }).reason, 'interval'));

import { cutoffAlarmDue, PING_COPY, STAGES as ALL_STAGES } from './ping.ts';
const cut = { tz: 'UTC', cutoffMin: 21 * 60, doneToday: false, notToday: false, alreadySent: false };
test('cutoff alarm fires only inside its window', () => {
  assert.equal(cutoffAlarmDue({ ...cut, now: new Date('2026-11-08T20:59:00Z') }).due, false);
  assert.equal(cutoffAlarmDue({ ...cut, now: new Date('2026-11-08T21:05:00Z') }).due, true);
  assert.equal(cutoffAlarmDue({ ...cut, now: new Date('2026-11-08T22:00:00Z') }).due, false);
});
test('cutoff alarm is suppressed by proof, not-today and prior send', () => {
  const now = new Date('2026-11-08T21:05:00Z');
  assert.equal(cutoffAlarmDue({ ...cut, now, doneToday: true }).reason, 'proof_sent');
  assert.equal(cutoffAlarmDue({ ...cut, now, notToday: true }).reason, 'not_today');
  assert.equal(cutoffAlarmDue({ ...cut, now, alreadySent: true }).reason, 'already_sent');
});
test('every stage has ping copy', () => { for (const s of ALL_STAGES) assert.ok(PING_COPY[s].title && PING_COPY[s].body); });

import { nextCutoff } from './ping.ts';
test('nextCutoff picks today until proof is done or time has passed', () => {
  const at = (h: number, m = 0) => new Date(2026, 10, 8, h, m);
  assert.deepEqual(nextCutoff(at(10), 1260, false), at(21)); assert.deepEqual(nextCutoff(at(22), 1260, false), new Date(2026, 10, 9, 21));
  assert.deepEqual(nextCutoff(at(10), 1260, true), new Date(2026, 10, 9, 21));
});
