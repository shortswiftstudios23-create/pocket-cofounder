// Onboarding script: a fixed sequence of AI-voiced questions. Chips are shortcuts; typed text always works.
import { addDays } from './day.ts';
export interface Draft { name?: string; project?: string; stage?: string; field?: string; goal?: string; deadline?: string | null; weeklyHours?: number; wakeMin?: number; sleepMin?: number }
export type Applied = { ok: true; draft: Draft } | { ok: false; error: string };
export interface Step { id: string; ask: (d: Draft) => string; chips?: string[]; placeholder: string; apply: (answer: string, d: Draft, today: string) => Applied }

export function parseClock(s: string): number | undefined {
  const t = s.trim().toLowerCase();
  if (t === 'midnight') return 0;
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return undefined;
  let h = Number(m[1]); const min = Number(m[2] ?? 0);
  if (m[3]) { if (h < 1 || h > 12) return undefined; h = (h % 12) + (m[3] === 'pm' ? 12 : 0); }
  if (h > 23 || min > 59) return undefined;
  return h * 60 + min;
}
export function parseDeadline(s: string, today: string): string | null | undefined {
  const t = s.trim().toLowerCase();
  if (/^(no|none|no deadline|skip)/.test(t)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(t))) return t;
  const m = t.match(/^(\d+)\s*(day|week|month)s?$/);
  if (!m) return undefined;
  return addDays(today, Number(m[1]) * (m[2] === 'day' ? 1 : m[2] === 'week' ? 7 : 30));
}
const text = (key: keyof Draft, min: number, err: string) => (a: string, d: Draft): Applied =>
  a.trim().length >= min ? { ok: true, draft: { ...d, [key]: a.trim() } } : { ok: false, error: err };
const clock = (key: 'wakeMin' | 'sleepMin') => (a: string, d: Draft): Applied => {
  const v = parseClock(a); return v === undefined ? { ok: false, error: 'Try a time like 7:00 or 11pm.' } : { ok: true, draft: { ...d, [key]: v } };
};

export const STEPS: Step[] = [
  { id: 'name', ask: () => 'Hey. I am your cofounder. What should I call you?', placeholder: 'Your name', apply: text('name', 1, 'I need a name to use.') },
  { id: 'project', ask: d => `Good to meet you, ${d.name}. What are you building?`, placeholder: 'One line about your project', apply: text('project', 3, 'Give me a few words about it.') },
  { id: 'stage', ask: () => 'What stage is it at?', chips: ['Idea', 'Building', 'Launched', 'Scaling'], placeholder: 'Stage', apply: text('stage', 2, 'Pick a stage or type one.') },
  { id: 'field', ask: () => 'What field is it in?', chips: ['SaaS', 'Content', 'Hardware', 'Service', 'Other'], placeholder: 'Field', apply: text('field', 2, 'Pick a field or type one.') },
  { id: 'goal', ask: () => 'What is the one goal that matters most right now? Make it specific.', placeholder: 'e.g. 10 paying customers', apply: text('goal', 5, 'That is too short to hold you to. What exactly will exist when you reach it?') },
  { id: 'deadline', ask: () => 'By when?', chips: ['2 weeks', '1 month', '3 months', 'No deadline'], placeholder: 'e.g. 6 weeks or 2027-01-31',
    apply: (a, d, today) => { const v = parseDeadline(a, today); return v === undefined ? { ok: false, error: 'Try 2 weeks, 3 months, or a date like 2027-01-31.' } : { ok: true, draft: { ...d, deadline: v } }; } },
  { id: 'hours', ask: () => 'How many hours a week can you put into it?', chips: ['5', '10', '20', '40'], placeholder: 'Hours per week',
    apply: (a, d) => { const n = Number(a.replace(/[^\d.]/g, '')); return n > 0 && n <= 100 ? { ok: true, draft: { ...d, weeklyHours: Math.round(n) } } : { ok: false, error: 'Give me a number between 1 and 100.' }; } },
  { id: 'wake', ask: () => 'When does your day start? I will stay quiet before then.', chips: ['6:00', '7:00', '8:00', '9:00'], placeholder: 'e.g. 7:30', apply: clock('wakeMin') },
  { id: 'sleep', ask: () => 'And when do you wind down? No pings after that.', chips: ['22:00', '23:00', '00:00', '01:00'], placeholder: 'e.g. 23:00', apply: clock('sleepMin') },
];
export const CLOSING = 'Done. Add today\'s first task. What exactly will exist by tonight?';

export function toRecords(d: Draft, tz: string) {
  return {
    profile: { name: d.name!, project: d.project!, stage: d.stage!, field: d.field!, tz, wake_min: d.wakeMin!, sleep_min: d.sleepMin!, onboarded: true },
    goal: { goal: d.goal!, deadline: d.deadline ?? null, weekly_hours: d.weeklyHours! },
    memory: { kind: 'profile', body: `${d.name} is building ${d.project} (${d.stage}, ${d.field}). Main goal: ${d.goal}${d.deadline ? ` by ${d.deadline}` : ''}. ${d.weeklyHours}h/week.` },
  };
}
