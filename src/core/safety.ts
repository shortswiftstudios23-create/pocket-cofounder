// Abuse limits and text rules. LIMITS must match the triggers in supabase/migrations/0003_social.sql.
export const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'fake_proof', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_LABEL: Record<ReportReason, string> = { spam: 'Spam', harassment: 'Harassment', inappropriate: 'Inappropriate', fake_proof: 'Fake proof', other: 'Something else' };
export type ReportTarget = 'proof' | 'comment' | 'profile' | 'message';
const H = 3_600_000;
export const LIMITS = { comment: { max: 20, windowMs: H }, message: { max: 60, windowMs: H }, report: { max: 10, windowMs: H }, follow: { max: 100, windowMs: 24 * H } } as const;
export const AUTO_HIDE_REPORTS = 3; // distinct reporters that hide a proof or comment until a moderator looks
export const MAX_COMMENT = 500, MAX_MESSAGE = 1000, MAX_REPORT_DETAIL = 300;

/** True when another action is allowed: fewer than `max` actions inside the trailing window. */
export function withinRate(stamps: number[], now: number, max: number, windowMs: number) { return stamps.filter(t => t > now - windowMs && t <= now).length < max; }
export const shouldAutoHide = (distinctReporters: number) => distinctReporters >= AUTO_HIDE_REPORTS;

export type Checked = { ok: true; body: string } | { ok: false; error: string };
export function checkBody(raw: string, max: number): Checked {
  const body = raw.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!body) return { ok: false, error: 'Write something first.' };
  if (body.length > max) return { ok: false, error: `Keep it under ${max} characters.` };
  if ((body.match(/https?:\/\//gi) ?? []).length > 2) return { ok: false, error: 'Too many links.' };
  return { ok: true, body };
}
/** Turns a raw database/function error into words a person can act on. */
export function friendlyError(msg: string): string {
  if (/rate_limited/i.test(msg)) return 'You are going a bit fast. Try again in a little while.';
  if (/row-level security|violates|permission denied/i.test(msg)) return 'That is not allowed.';
  if (/duplicate key|already exists/i.test(msg)) return 'Already done.';
  if (/Failed to fetch|Network request failed|network/i.test(msg)) return 'No connection. Check your internet and try again.';
  return msg.length > 140 ? 'Something went wrong. Try again.' : msg;
}
/** Direct messages need a mutual follow and no block in either direction. */
export function canMessage(s: { iFollow: boolean; theyFollow: boolean; blockedEither: boolean }) {
  if (s.blockedEither) return { ok: false as const, reason: 'You cannot message this person.' };
  if (!(s.iFollow && s.theyFollow)) return { ok: false as const, reason: 'You can message people who follow you back.' };
  return { ok: true as const, reason: '' };
}

/** Account deletion is permanent, so the person must type this word exactly (the server checks it again). */
export const DELETE_WORD = 'DELETE';
export const isDeleteConfirmed = (typed: string) => typed.trim() === DELETE_WORD;
