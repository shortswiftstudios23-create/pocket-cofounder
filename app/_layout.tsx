import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useFonts, Outfit_300Light, Outfit_400Regular, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { color } from '@/theme/tokens';
import { AuthProvider, useAuth } from '@/lib/auth';

/** Session gate: signed out -> sign-in, signed in but not onboarded -> onboarding, otherwise the tabs. */
function Gate() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments(); const router = useRouter(); const navReady = !!useRootNavigationState()?.key;
  const group = segments[0] as string | undefined;
  useEffect(() => {
    if (loading || !navReady) return;
    if (!session) { if (group !== '(auth)') router.replace('/(auth)/sign-in'); }
    else if (!profile?.onboarded) { if (group !== 'onboarding') router.replace('/onboarding'); }
    else if (group === '(auth)' || group === 'onboarding') router.replace('/(tabs)');
  }, [loading, navReady, session, profile?.onboarded, group]);
  // Android: tapping a push opens the screen named in its data.url (web does this in public/sw.js).
  useEffect(() => {
    if (Platform.OS === 'web' || !session) return;
    const go = (url: unknown) => { if (typeof url === 'string' && /^\/(thread|proof|u)\/[\w-]+$/.test(url)) router.push(url as never); };
    const sub = Notifications.addNotificationResponseReceivedListener(r => go(r.notification.request.content.data?.url));
    void Notifications.getLastNotificationResponseAsync().then(r => { if (r) go(r.notification.request.content.data?.url); });
    return () => sub.remove();
  }, [session]);
  return (<>
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
    {loading && <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={color.lime500} /></View>}
  </>);
}
export default function Root() {
  const [ok] = useFonts({ Outfit_300Light, Outfit_400Regular, Outfit_700Bold });
  if (!ok) return null;
  return (<AuthProvider><StatusBar style="light" /><Gate /></AuthProvider>);
}
