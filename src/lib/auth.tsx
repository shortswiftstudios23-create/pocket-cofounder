import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';
WebBrowser.maybeCompleteAuthSession();

interface Ctx { session: Session | null; profile: Profile | null; loading: boolean; refreshProfile: () => Promise<void>; signOut: () => Promise<void> }
const AuthCtx = createContext<Ctx>({ session: null, profile: null, loading: true, refreshProfile: async () => {}, signOut: async () => {} });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (uid?: string) => {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from('profiles').select('id, name, tz, wake_min, sleep_min, cutoff_min, trust_level, onboarded, is_moderator').eq('id', uid).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(async ({ data }) => { if (!live) return; setSession(data.session); await load(data.session?.user.id); if (live) setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); void load(s?.user.id); });
    return () => { live = false; sub.subscription.unsubscribe(); };
  }, [load]);
  const value = useMemo<Ctx>(() => ({ session, profile, loading, refreshProfile: () => load(session?.user.id), signOut: async () => { await supabase.auth.signOut(); } }), [session, profile, loading, load]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const signInEmail = (email: string, password: string) => supabase.auth.signInWithPassword({ email: email.trim(), password });
/** `needsConfirmation` is true when the project requires email confirmation (no session returned yet). */
export async function signUpEmail(email: string, password: string) {
  const r = await supabase.auth.signUp({ email: email.trim(), password });
  return { error: r.error, needsConfirmation: !r.error && !r.data.session };
}
export async function signInGoogle(): Promise<{ error: Error | null }> {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    return { error };
  }
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) return { error: error ?? new Error('No sign-in URL') };
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return { error: new Error('Sign-in cancelled') };
  const p = new URLSearchParams(res.url.split('#')[1] ?? '');
  const access_token = p.get('access_token'), refresh_token = p.get('refresh_token');
  if (!access_token || !refresh_token) return { error: new Error('Google did not return a session') };
  const r = await supabase.auth.setSession({ access_token, refresh_token });
  return { error: r.error };
}
