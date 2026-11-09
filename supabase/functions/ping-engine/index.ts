// Runs every 5 minutes (pg_cron -> pg_net, see docs/SETUP.md). Applies src/core/ping.ts rules per user.
import { admin, json } from '../_shared/util.ts';
import { sendPush } from '../_shared/push.ts';
import { shouldPing, cutoffAlarmDue, PING_COPY } from '../../../src/core/ping.ts';
import { dayKey } from '../../../src/core/day.ts';
import { aiPingCopy } from '../_shared/gemini.ts';

Deno.serve(async req => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'forbidden' }, 403);
  const db = admin(), now = new Date();
  const { data: profiles, error } = await db.from('profiles').select('id, tz, trust_level, wake_min, sleep_min, cutoff_min, ping_cap, ping_interval_min').eq('onboarded', true);
  if (error) return json({ error: error.message }, 500);
  const out = { users: 0, pings: 0, cutoffs: 0 };
  for (const p of profiles ?? []) {
    out.users++;
    try {
      const today = dayKey(now, p.tz ?? 'UTC');
      const [{ data: tasks }, { data: accepted }, { data: logs }] = await Promise.all([
        db.from('tasks').select('title, status, created_at, due_at').eq('user_id', p.id).eq('day', today),
        db.from('proofs').select('id').eq('user_id', p.id).eq('day', today).eq('status', 'accepted').limit(1),
        db.from('notification_log').select('stage, sent_at').eq('user_id', p.id).gte('sent_at', new Date(now.getTime() - 36 * 3600_000).toISOString()),
      ]);
      const todays = (logs ?? []).filter(l => dayKey(new Date(l.sent_at), p.tz ?? 'UTC') === today);
      const pings = todays.filter(l => l.stage !== 'cutoff');
      const open = (tasks ?? []).filter(t => t.status === 'not_started' || t.status === 'in_progress');
      const doneToday = (accepted ?? []).length > 0;
      const notToday = (tasks ?? []).length > 0 && open.length === 0 && !doneToday;
      const since = open.length ? new Date(Math.min(...open.map(t => new Date(t.due_at ?? t.created_at).getTime()))) : undefined;
      const last = pings.length ? new Date(Math.max(...pings.map(l => new Date(l.sent_at).getTime()))) : undefined;

      const decision = shouldPing({ now, tz: p.tz ?? 'UTC', wakeMin: p.wake_min, sleepMin: p.sleep_min, intervalMin: p.ping_interval_min, sentToday: pings.length,
        cap: p.ping_cap, lastSentAt: last, proofSent: doneToday, notToday, taskOpenSince: since });
      if (decision.ping && decision.stage) {
        const copy = await aiPingCopy(db, { id: p.id, trust: p.trust_level ?? 0, tz: p.tz ?? 'UTC' }, decision.stage, open[0]?.title, PING_COPY[decision.stage]); // AI copy, fixed text if AI is off/capped
        const delivered = await sendPush(db, p.id, { ...copy, tag: 'ping', url: '/' });
        await db.from('notification_log').insert({ user_id: p.id, stage: decision.stage }); // log even if no device, so the cap holds
        if (delivered) out.pings++;
      }
      const cut = cutoffAlarmDue({ now, tz: p.tz ?? 'UTC', cutoffMin: p.cutoff_min, doneToday, notToday, alreadySent: todays.some(l => l.stage === 'cutoff') });
      if (cut.due) {
        await sendPush(db, p.id, { title: 'Cutoff reached', body: 'No proof yet today. Send anything real before the day ends to keep your streak.', tag: 'cutoff', url: '/' });
        await db.from('notification_log').insert({ user_id: p.id, stage: 'cutoff' }); out.cutoffs++;
      }
    } catch (e) { console.error('ping-engine user failed', p.id, e); }
  }
  return json(out);
});
