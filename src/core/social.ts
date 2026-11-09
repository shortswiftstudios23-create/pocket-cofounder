// Pure feed / inbox helpers.
export const REACTIONS = ['fire', 'clap', 'check'] as const;
export type ReactionKind = (typeof REACTIONS)[number];
export interface ReactionRow { kind: ReactionKind; user_id: string }
export type ReactionSummary = Record<ReactionKind, { count: number; mine: boolean }>;
export function summarizeReactions(rows: ReactionRow[], me: string): ReactionSummary {
  const out = { fire: { count: 0, mine: false }, clap: { count: 0, mine: false }, check: { count: 0, mine: false } } as ReactionSummary;
  for (const r of rows) if (out[r.kind]) { out[r.kind].count++; if (r.user_id === me) out[r.kind].mine = true; }
  return out;
}
/** Drops hidden items and anything by a blocked user (defence in depth: the database already filters). */
export function visibleOnly<T extends { user_id: string; hidden?: boolean | null }>(items: T[], blocked: ReadonlySet<string>) { return items.filter(i => !i.hidden && !blocked.has(i.user_id)); }
/** A conversation is one row per pair, stored with the smaller id first. */
export const convoPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);
export const otherUser = (c: { user_a: string; user_b: string }, me: string) => (c.user_a === me ? c.user_b : c.user_a);
export const unreadCount = (msgs: { sender_id: string; read_at: string | null }[], me: string) => msgs.filter(m => m.sender_id !== me && !m.read_at).length;
export function timeAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (s < 60) return 'now'; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`; if (s < 7 * 86400) return `${Math.floor(s / 86400)}d`;
  return new Date(Date.parse(iso)).toISOString().slice(0, 10);
}
/** Search text for the people finder: trims, strips LIKE wildcards, undefined when too short. */
export function cleanSearch(q: string): string | undefined { const t = q.trim().replace(/[%_\\]/g, ''); return t.length >= 2 ? t.slice(0, 40) : undefined; }
/** Tab badge text: nothing at 0 (no badge), the number up to 9, then "9+". */
export const badgeLabel = (n: number): string | undefined => (n <= 0 ? undefined : n > 9 ? '9+' : String(n));
/** Storage paths of image proofs in a feed page (unique, photo/screenshot only), so one call can sign them all. */
export function imagePaths(items: { kind: string; media_path?: string | null }[]): string[] {
  return [...new Set(items.filter(i => (i.kind === 'photo' || i.kind === 'screenshot') && !!i.media_path).map(i => i.media_path as string))];
}
