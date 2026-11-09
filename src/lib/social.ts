// Feed, comments, reactions, follows, blocks, reports, inbox. Every call is a plain RLS-protected query or RPC: the database decides who can see what.
import { supabase } from './supabase';
import { notifySocial } from './notify';
import { friendlyError, type ReportReason, type ReportTarget } from '@/core/safety';
import { imagePaths, type ReactionKind, type ReactionRow } from '@/core/social';

export class SocialError extends Error {}
/** Unwraps a Supabase result: throws a friendly error, otherwise returns the data (null from maybeSingle is handled by the caller's cast). */
function ok<T>(r: { data: T; error: { message: string } | null }): NonNullable<T> { if (r.error) throw new SocialError(friendlyError(r.error.message)); return r.data as NonNullable<T>; }

export interface FeedItem { id: string; user_id: string; task_id: string; day: string; kind: 'link' | 'text' | 'photo' | 'screenshot'; content: string | null; created_at: string; name: string | null; task_title: string; media_path: string | null }
export interface Person { id: string; name: string | null; project: string | null }
export interface Comment { id: string; proof_id: string; user_id: string; body: string; created_at: string; profiles: { name: string | null } | null }
export interface PublicProfile { id: string; name: string | null; bio: string | null; project: string | null; stage: string | null; field: string | null; is_public: boolean; followers: number; following: number; days: string[];
  i_follow: boolean; follows_me: boolean; i_blocked: boolean }
export interface Conversation { id: string; user_a: string; user_b: string; last_message_at: string }
export interface Message { id: string; conversation_id: string; sender_id: string; body: string; read_at: string | null; created_at: string }

export const loadBlocked = async (uid: string): Promise<Set<string>> => new Set((ok(await supabase.from('blocks').select('blocked_id').eq('blocker_id', uid)) as { blocked_id: string }[]).map(r => r.blocked_id));
export async function searchPeople(q: string, me: string): Promise<Person[]> {
  return ok(await supabase.from('profiles').select('id, name, project').eq('is_public', true).neq('id', me).ilike('name', `%${q}%`).limit(20)) as Person[];
}
/** Other people's accepted proofs (your own are in the view too, for the proof page, but not in your Feed). */
export const loadFeed = async (me: string) => ok(await supabase.from('feed_items').select('*').neq('user_id', me).order('created_at', { ascending: false }).limit(50)) as FeedItem[];
/** Signed, short-lived URLs for image proofs, keyed by storage path. A path the caller may not see simply gets no URL (the database policy decides). */
export async function loadFeedImages(items: { kind: string; media_path?: string | null }[]): Promise<Record<string, string>> {
  const paths = imagePaths(items); if (!paths.length) return {};
  const { data, error } = await supabase.storage.from('proofs').createSignedUrls(paths, 3600); if (error || !data) return {};
  const out: Record<string, string> = {}; for (const r of data) if (r.path && r.signedUrl) out[r.path] = r.signedUrl; return out;
}
export const loadFeedItem = async (id: string) => ok(await supabase.from('feed_items').select('*').eq('id', id).maybeSingle()) as FeedItem | null;

export async function loadReactions(proofIds: string[]): Promise<Record<string, ReactionRow[]>> {
  if (!proofIds.length) return {};
  const rows = ok(await supabase.from('reactions').select('proof_id, kind, user_id').in('proof_id', proofIds)) as (ReactionRow & { proof_id: string })[];
  const out: Record<string, ReactionRow[]> = {}; for (const r of rows) (out[r.proof_id] ??= []).push({ kind: r.kind, user_id: r.user_id }); return out;
}
export async function setReaction(proofId: string, uid: string, kind: ReactionKind, on: boolean) {
  if (on) { const r = await supabase.from('reactions').insert({ proof_id: proofId, user_id: uid, kind }); if (r.error && r.error.code !== '23505') throw new SocialError(friendlyError(r.error.message)); }
  else ok(await supabase.from('reactions').delete().eq('proof_id', proofId).eq('user_id', uid).eq('kind', kind));
}
export const loadComments = async (proofId: string) => ok(await supabase.from('comments').select('id, proof_id, user_id, body, created_at, profiles(name)').eq('proof_id', proofId).order('created_at')) as unknown as Comment[];
export const addComment = async (proofId: string, uid: string, body: string) => { const r = ok(await supabase.from('comments').insert({ proof_id: proofId, user_id: uid, body }).select('id').single()) as { id: string }; void notifySocial('comment', r.id); };
export const deleteComment = async (id: string) => { ok(await supabase.from('comments').delete().eq('id', id)); };

export const getPublicProfile = async (id: string) => ok(await supabase.rpc('public_profile', { pid: id })) as PublicProfile | null;
export const follow = async (me: string, other: string) => { const r = await supabase.from('follows').insert({ follower_id: me, followee_id: other }); if (r.error && r.error.code !== '23505') throw new SocialError(friendlyError(r.error.message)); };
export const unfollow = async (me: string, other: string) => { ok(await supabase.from('follows').delete().eq('follower_id', me).eq('followee_id', other)); };
export const blockUser = async (me: string, other: string) => { const r = await supabase.from('blocks').insert({ blocker_id: me, blocked_id: other }); if (r.error && r.error.code !== '23505') throw new SocialError(friendlyError(r.error.message)); };
export const unblockUser = async (me: string, other: string) => { ok(await supabase.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', other)); };
export const namesFor = async (ids: string[]) => {
  if (!ids.length) return {} as Record<string, string>;
  const rows = ok(await supabase.from('profiles').select('id, name').in('id', ids)) as { id: string; name: string | null }[]; return Object.fromEntries(rows.map(r => [r.id, r.name ?? 'Member']));
};
export async function mutuals(me: string): Promise<Person[]> {
  const [a, b] = await Promise.all([supabase.from('follows').select('followee_id').eq('follower_id', me), supabase.from('follows').select('follower_id').eq('followee_id', me)]);
  const mine = new Set((ok(a) as { followee_id: string }[]).map(r => r.followee_id)); const ids = (ok(b) as { follower_id: string }[]).map(r => r.follower_id).filter(id => mine.has(id)); if (!ids.length) return [];
  return ok(await supabase.from('profiles').select('id, name, project').in('id', ids)) as Person[];
}
export async function sendReport(me: string, type: ReportTarget, id: string, reason: ReportReason, detail: string) {
  const r = await supabase.from('reports').insert({ reporter_id: me, target_type: type, target_id: id, reason, detail: detail.trim() || null });
  if (r.error && r.error.code !== '23505') throw new SocialError(friendlyError(r.error.message)); // reporting the same thing twice is fine
}

export const listConversations = async () => ok(await supabase.from('conversations').select('*').order('last_message_at', { ascending: false })) as Conversation[];
export const unreadByConversation = async (me: string) => {
  const rows = ok(await supabase.from('messages').select('conversation_id').is('read_at', null).neq('sender_id', me)) as { conversation_id: string }[];
  const out: Record<string, number> = {}; for (const r of rows) out[r.conversation_id] = (out[r.conversation_id] ?? 0) + 1; return out;
};
export const startConversation = async (other: string) => ok(await supabase.rpc('start_conversation', { other })) as string;
export const loadMessages = async (cid: string) => ok(await supabase.from('messages').select('*').eq('conversation_id', cid).order('created_at').limit(200)) as Message[];
export const sendMessage = async (cid: string, me: string, body: string) => { const r = ok(await supabase.from('messages').insert({ conversation_id: cid, sender_id: me, body }).select('id').single()) as { id: string }; void notifySocial('message', r.id); };
export async function unreadTotal(me: string): Promise<number> {
  const r = await supabase.from('messages').select('id', { count: 'exact', head: true }).is('read_at', null).neq('sender_id', me); if (r.error) throw new SocialError(friendlyError(r.error.message)); return r.count ?? 0;
}
export const markRead = async (cid: string, me: string) => { await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('conversation_id', cid).neq('sender_id', me).is('read_at', null); };
export function subscribeMessages(cid: string, onInsert: (m: Message) => void) {
  const ch = supabase.channel(`thread-${cid}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${cid}` }, p => onInsert(p.new as Message)).subscribe();
  return () => { void supabase.removeChannel(ch); };
}
