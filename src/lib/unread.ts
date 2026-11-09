// Live unread-message count for the Inbox tab badge: refetched on any message change (realtime, RLS applies) and every minute as a fallback.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { unreadTotal } from './social';

export function useUnreadCount(): number {
  const { session } = useAuth(); const me = session?.user.id ?? ''; const [n, setN] = useState(0); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(async () => { if (!me) { setN(0); return; } try { setN(await unreadTotal(me)); } catch { /* keep the last number */ } }, [me]);
  useEffect(() => {
    if (!me) { setN(0); return; }
    void refresh();
    const ch = supabase.channel(`unread-${me}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void refresh(), 400); }).subscribe();
    const poll = setInterval(() => void refresh(), 60_000);
    return () => { clearInterval(poll); if (timer.current) clearTimeout(timer.current); void supabase.removeChannel(ch); };
  }, [me, refresh]);
  return n;
}
