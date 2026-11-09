export type DayKey = string; // YYYY-MM-DD in the user's local time zone
const toMs = (d: DayKey) => Date.parse(d + 'T00:00:00Z');
const DAY = 86_400_000;
/** Strict streak: one missed day resets to 0. Today is pending until cutoff, so it never breaks a streak. */
export function computeStreak(accepted: Iterable<DayKey>, today: DayKey) {
  const days = [...new Set(accepted)].sort();
  let longest = 0, run = 0, prev = NaN;
  for (const d of days) { const t = toMs(d); run = t - prev === DAY ? run + 1 : 1; longest = Math.max(longest, run); prev = t; }
  const set = new Set(days);
  let cursor = set.has(today) ? toMs(today) : toMs(today) - DAY;
  let current = 0;
  while (set.has(new Date(cursor).toISOString().slice(0, 10))) { current++; cursor -= DAY; }
  return { current, longest, doneToday: set.has(today), total: days.length };
}
export const MILESTONES = [7, 30, 100] as const;
export const badgesFor = (longest: number) => MILESTONES.filter(m => longest >= m);
