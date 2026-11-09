// Push delivery: FCM HTTP v1 for Android, Web Push (VAPID) for Chrome. Dead tokens are deleted.
import webpush from 'npm:web-push@3.6.7';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
export interface Payload { title: string; body: string; url?: string; tag?: string }

let fcmCache: { token: string; exp: number } | null = null;
const b64u = (b: ArrayBuffer | string) => btoa(typeof b === 'string' ? b : String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function fcmAccessToken(sa: { client_email: string; private_key: string }) {
  if (fcmCache && fcmCache.exp > Date.now() + 60_000) return fcmCache.token;
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----|\s/g, '')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` }) });
  const j = await r.json(); if (!j.access_token) throw new Error('FCM auth failed');
  fcmCache = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 }; return j.access_token as string;
}
async function sendFcm(token: string, p: Payload): Promise<'ok' | 'dead' | 'error'> {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT'); if (!raw) return 'error';
  const sa = JSON.parse(raw);
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, { method: 'POST',
    headers: { authorization: `Bearer ${await fcmAccessToken(sa)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ message: { token, notification: { title: p.title, body: p.body }, data: { url: p.url ?? '/' }, android: { priority: 'HIGH', notification: { channel_id: 'pings', tag: p.tag } } } }) });
  if (r.ok) return 'ok';
  const err = await r.text(); return /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/.test(err) ? 'dead' : 'error';
}
let vapidReady = false;
async function sendWeb(sub: unknown, p: Payload): Promise<'ok' | 'dead' | 'error'> {
  const pub = Deno.env.get('VAPID_PUBLIC_KEY'), priv = Deno.env.get('VAPID_PRIVATE_KEY'); if (!pub || !priv) return 'error';
  if (!vapidReady) { webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@pocketcofounder.app', pub, priv); vapidReady = true; }
  try { await webpush.sendNotification(sub as never, JSON.stringify(p)); return 'ok'; }
  catch (e) { const code = (e as { statusCode?: number }).statusCode; return code === 404 || code === 410 ? 'dead' : 'error'; }
}
/** Returns how many devices accepted the message. */
export async function sendPush(db: SupabaseClient, userId: string, p: Payload): Promise<number> {
  const { data: devices } = await db.from('device_tokens').select('id, platform, token, subscription').eq('user_id', userId);
  let sent = 0;
  for (const d of devices ?? []) {
    const res = d.platform === 'android' ? await sendFcm(d.token, p) : await sendWeb(d.subscription, p);
    if (res === 'ok') sent++; else if (res === 'dead') await db.from('device_tokens').delete().eq('id', d.id);
  }
  return sent;
}
