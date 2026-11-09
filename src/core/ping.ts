export type PingStage = 'nudge' | 'blocker' | 'smaller_task' | 'challenge';
export const STAGES: PingStage[] = ['nudge', 'blocker', 'smaller_task', 'challenge'];
export interface PingState {
  now: Date; tz: string; wakeMin: number; sleepMin: number; // minutes after local midnight
  intervalMin: number; sentToday: number; cap: number; lastSentAt?: Date;
  proofSent: boolean; notToday: boolean; taskOpenSince?: Date;
}
export function localMinutes(d: Date, tz: string) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  return Number(p.find(x => x.type === 'hour')!.value) * 60 + Number(p.find(x => x.type === 'minute')!.value);
}
export const inQuietHours = (m: number, wake: number, sleep: number) =>
  wake <= sleep ? m < wake || m >= sleep : m >= sleep && m < wake;
export function shouldPing(s: PingState): { ping: boolean; reason: string; stage?: PingStage } {
  if (s.proofSent) return { ping: false, reason: 'proof_sent' };
  if (s.notToday) return { ping: false, reason: 'not_today' };
  if (s.sentToday >= s.cap) return { ping: false, reason: 'cap' };
  if (!s.taskOpenSince || s.now < s.taskOpenSince) return { ping: false, reason: 'task_time_not_reached' };
  if (inQuietHours(localMinutes(s.now, s.tz), s.wakeMin, s.sleepMin)) return { ping: false, reason: 'quiet_hours' };
  if (s.lastSentAt && s.now.getTime() - s.lastSentAt.getTime() < s.intervalMin * 60_000) return { ping: false, reason: 'interval' };
  return { ping: true, reason: 'ok', stage: STAGES[Math.min(s.sentToday, STAGES.length - 1)] };
}

// ---- Session 3 additions -------------------------------------------------------------------------------
/** Message copy per stage. Replaced by AI-written copy once ai-proxy exists; these are the fallback. */
export const PING_COPY: Record<PingStage, { title: string; body: string }> = {
  nudge: { title: 'Proof time', body: 'What exactly will exist by tonight? Start with the smallest piece.' },
  blocker: { title: 'What is blocking you?', body: 'Name the blocker in one line. Then do the next 10 minutes.' },
  smaller_task: { title: 'Shrink it', body: 'Cut today\'s task in half. Ship the half.' },
  challenge: { title: 'Last push', body: 'One proof keeps the streak alive. What can you show right now?' },
};
export interface CutoffState { now: Date; tz: string; cutoffMin: number; doneToday: boolean; notToday: boolean; alreadySent: boolean; windowMin?: number }
/** Evening-cutoff alarm: fires once, inside [cutoff, cutoff + window), only if no accepted proof exists today. */
export function cutoffAlarmDue(s: CutoffState): { due: boolean; reason: string } {
  if (s.doneToday) return { due: false, reason: 'proof_sent' };
  if (s.notToday) return { due: false, reason: 'not_today' };
  if (s.alreadySent) return { due: false, reason: 'already_sent' };
  const m = localMinutes(s.now, s.tz);
  if (m < s.cutoffMin || m >= s.cutoffMin + (s.windowMin ?? 60)) return { due: false, reason: 'outside_window' };
  return { due: true, reason: 'ok' };
}
/** Next cutoff moment in the machine's local time: today's if still ahead and no proof yet, otherwise tomorrow's. */
export function nextCutoff(now: Date, cutoffMin: number, doneToday: boolean): Date {
  const d = new Date(now); d.setHours(0, 0, 0, 0); d.setMinutes(cutoffMin);
  if (doneToday || d <= now) d.setDate(d.getDate() + 1);
  return d;
}
