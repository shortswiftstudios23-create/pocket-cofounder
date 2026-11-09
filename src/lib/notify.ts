// Push registration (Android FCM token / Chrome Web Push) and the on-device evening-cutoff alarm.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { nextCutoff } from '@/core/ping';
import { supabase } from './supabase';
const CUTOFF_ID = 'cutoff-alarm';

export async function registerPush(uid: string): Promise<'granted' | 'denied' | 'unsupported'> {
  if (Platform.OS === 'web') {
    const vapid = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !vapid) return 'unsupported';
    if ((await Notification.requestPermission()) !== 'granted') return 'denied';
    const reg = await navigator.serviceWorker.register('/sw.js');
    const key = Uint8Array.from(atob(vapid.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
    await supabase.from('device_tokens').upsert({ user_id: uid, platform: 'web', token: sub.endpoint, subscription: sub.toJSON(), updated_at: new Date().toISOString() }, { onConflict: 'user_id,token' });
    return 'granted';
  }
  await Notifications.setNotificationChannelAsync('pings', { name: 'Pings', importance: Notifications.AndroidImportance.HIGH });
  const perm = await Notifications.requestPermissionsAsync(); if (!perm.granted) return 'denied';
  const t = await Notifications.getDevicePushTokenAsync(); // FCM token on Android; needs a development build, not Expo Go
  await supabase.from('device_tokens').upsert({ user_id: uid, platform: 'android', token: String(t.data), updated_at: new Date().toISOString() }, { onConflict: 'user_id,token' });
  return 'granted';
}

/** Local alarm (Android only; browsers cannot schedule). Call whenever Today refreshes so it is re-armed or pushed to tomorrow. */
export async function armCutoffAlarm(cutoffMin: number, doneToday: boolean) {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(CUTOFF_ID).catch(() => {});
  if ((await Notifications.getPermissionsAsync()).granted === false) return;
  await Notifications.scheduleNotificationAsync({ identifier: CUTOFF_ID,
    content: { title: 'Cutoff reached', body: 'No proof yet today. Send anything real to keep your streak.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: nextCutoff(new Date(), cutoffMin, doneToday), channelId: 'pings' } });
}

/** Tells the server to push-notify the other person about a message or comment you just sent. Best effort: a failure never blocks sending. */
export async function notifySocial(kind: 'message' | 'comment', id: string) { try { await supabase.functions.invoke('notify-social', { body: { kind, id } }); } catch { /* the message itself was already saved */ } }
