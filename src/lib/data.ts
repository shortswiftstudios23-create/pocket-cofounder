import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeStreak } from '@/core/streak';
import { dayKey } from '@/core/day';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { deviceTz, type Proof, type Task } from './types';

/** Today's tasks, proofs and the streak, all from Supabase. */
export function useToday() {
  const { session, profile } = useAuth();
  const uid = session?.user.id, tz = profile?.tz ?? deviceTz();
  const [tasks, setTasks] = useState<Task[]>([]); const [proofs, setProofs] = useState<Proof[]>([]); const [days, setDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const today = dayKey(new Date(), tz);
  const refresh = useCallback(async () => {
    if (!uid) return;
    const day = dayKey(new Date(), tz);
    const [t, p, a] = await Promise.all([
      supabase.from('tasks').select('id, day, title, status, created_at').eq('day', day).order('created_at'),
      supabase.from('proofs').select('id, task_id, day, kind, content, status, status_reason, appeal_status, created_at').eq('day', day).order('created_at', { ascending: false }),
      supabase.from('proofs').select('day').eq('status', 'accepted'),
    ]);
    const err = t.error ?? p.error ?? a.error;
    if (err) setError(err.message); else { setError(''); setTasks(t.data as Task[]); setProofs(p.data as Proof[]); setDays((a.data ?? []).map(r => r.day as string)); }
    setLoading(false);
  }, [uid, tz]);
  useEffect(() => { void refresh(); }, [refresh]);
  const streak = useMemo(() => computeStreak(days, today), [days, today]);
  const latestProof = useCallback((taskId: string) => proofs.find(p => p.task_id === taskId), [proofs]);
  async function addTask(title: string) {
    const { error: e } = await supabase.from('tasks').insert({ user_id: uid, day: today, title }); if (e) throw e; await refresh();
  }
  async function setStatus(id: string, status: Task['status']) {
    const { error: e } = await supabase.from('tasks').update({ status }).eq('id', id); if (e) throw e; await refresh();
  }
  return { today, tz, tasks, proofs, days, streak, loading, error, refresh, addTask, setStatus, latestProof };
}
/** Every accepted-proof day, for the history screen. */
export function useStreakHistory() {
  const { profile } = useAuth(); const tz = profile?.tz ?? deviceTz(); const [days, setDays] = useState<string[]>([]); const [loading, setLoading] = useState(true);
  const today = dayKey(new Date(), tz);
  useEffect(() => { supabase.from('proofs').select('day').eq('status', 'accepted').then(({ data }) => { setDays((data ?? []).map(r => r.day as string)); setLoading(false); }); }, []);
  return { today, days, loading, streak: useMemo(() => computeStreak(days, today), [days, today]) };
}
