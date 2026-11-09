// "Your appeal was decided" notice on Today. The server stamps proofs.appeal_resolved_at; this device remembers when the person last dismissed.
import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { newestStamp, unseenAppealNotices, type AppealNotice, type ResolvedAppeal } from '@/core/notices';
const key = (uid: string) => `appeal-notice-seen:${uid}`;

export function useAppealNotices(uid: string) {
  const [notices, setNotices] = useState<AppealNotice[]>([]);
  const refresh = useCallback(async () => {
    if (!uid) return;
    try {
      const seen = await AsyncStorage.getItem(key(uid));
      const { data, error } = await supabase.from('proofs').select('id, appeal_status, appeal_resolved_at, tasks(title)').not('appeal_resolved_at', 'is', null).order('appeal_resolved_at', { ascending: false }).limit(10);
      if (error || !data) return;
      const rows: ResolvedAppeal[] = (data as unknown as { id: string; appeal_status: ResolvedAppeal['appeal_status']; appeal_resolved_at: string; tasks: { title: string } | null }[])
        .map(r => ({ id: r.id, appeal_status: r.appeal_status, appeal_resolved_at: r.appeal_resolved_at, task_title: r.tasks?.title ?? 'your task' }));
      setNotices(unseenAppealNotices(rows, seen));
    } catch { /* no notice is better than a crash */ }
  }, [uid]);
  const dismiss = useCallback(async () => { const at = newestStamp(notices); setNotices([]); if (at) { try { await AsyncStorage.setItem(key(uid), at); } catch { /* it may show again next time */ } } }, [notices, uid]);
  return { notices, refresh, dismiss };
}
