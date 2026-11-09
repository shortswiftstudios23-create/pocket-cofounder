import test from 'node:test'; import assert from 'node:assert/strict';
import { formatClock, parseHHMM, validateSchedule } from './schedule.ts';
import { friendlyError } from './safety.ts';
test('clock formatting and parsing round-trip', () => { assert.equal(formatClock(420), '07:00'); assert.equal(formatClock(1260), '21:00'); assert.equal(parseHHMM('7:05'), 425); assert.equal(parseHHMM('24:00'), undefined); assert.equal(parseHHMM('seven'), undefined); });
test('schedule validation', () => { assert.equal(validateSchedule(420, 1380, 1260), null); assert.ok(validateSchedule(420, 500, 450)); assert.ok(validateSchedule(420, 1380, 400)); assert.ok(validateSchedule(420, 1380, 1400)); });
test('friendlyError maps known failures', () => { assert.match(friendlyError('rate_limited: too many comments'), /fast/); assert.match(friendlyError('new row violates row-level security policy'), /not allowed/); assert.equal(friendlyError('x'.repeat(200)), 'Something went wrong. Try again.'); });
