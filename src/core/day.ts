// Local-day helpers. A "day" is always YYYY-MM-DD in the user's own time zone.
export function dayKey(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function addDays(key: string, n: number): string {
  return new Date(Date.parse(key + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10);
}
/** Mon=0 .. Sun=6 */
export const weekdayIndex = (key: string) => (new Date(key + 'T00:00:00Z').getUTCDay() + 6) % 7;
/** Columns of 7 cells (Mon..Sun), oldest week first. Cells after `today` are null. */
export function heatmapColumns(today: string, weeks: number): (string | null)[][] {
  const thisMonday = addDays(today, -weekdayIndex(today));
  const cols: (string | null)[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const monday = addDays(thisMonday, -7 * w);
    cols.push(Array.from({ length: 7 }, (_, i) => { const k = addDays(monday, i); return k > today ? null : k; }));
  }
  return cols;
}
export function monthLabel(key: string) {
  return new Date(key + 'T00:00:00Z').toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
}
