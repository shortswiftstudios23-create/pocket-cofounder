import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const isConfigured = !!url && !!key;
export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'anon', {
  auth: { storage: Platform.OS === 'web' ? undefined : AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === 'web' },
});
if (Platform.OS !== 'web') AppState.addEventListener('change', s => { if (s === 'active') supabase.auth.startAutoRefresh(); else supabase.auth.stopAutoRefresh(); });
