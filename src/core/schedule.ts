// Wake / sleep / cutoff times as "HH:MM" text <-> minutes after local midnight.
export function formatClock(min: number): string { const m = ((Math.round(min) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
export function parseHHMM(s: string): number | undefined {
  const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(s); if (!m) return undefined; const h = Number(m[1]), mi = Number(m[2]);
  return h < 24 && mi < 60 ? h * 60 + mi : undefined;
}
/** Wake must be before sleep, with the cutoff between them and at least an hour of day. */
export function validateSchedule(wake: number, sleep: number, cutoff: number): string | null {
  if (sleep - wake < 180) return 'Wake and sleep need to be at least 3 hours apart, wake first.';
  if (cutoff <= wake || cutoff > sleep) return 'The cutoff must be after you wake up and no later than bedtime.';
  return null;
}
