// In-app notice for a moderator's appeal decision. The server stamps proofs.appeal_resolved_at; the device remembers the last time the person dismissed.
export interface ResolvedAppeal { id: string; appeal_status: 'upheld' | 'overturned' | 'none' | 'pending'; appeal_resolved_at: string | null; task_title: string }
export interface AppealNotice { id: string; text: string; at: string }
/** Resolved appeals newer than `seenIso` (or all of them when nothing was dismissed yet), newest first, as plain sentences. */
export function unseenAppealNotices(rows: ResolvedAppeal[], seenIso: string | null): AppealNotice[] {
  const seen = seenIso ? Date.parse(seenIso) : 0;
  return rows
    .filter(r => (r.appeal_status === 'upheld' || r.appeal_status === 'overturned') && !!r.appeal_resolved_at && Date.parse(r.appeal_resolved_at) > seen)
    .sort((a, b) => Date.parse(b.appeal_resolved_at!) - Date.parse(a.appeal_resolved_at!))
    .map(r => ({ id: r.id, at: r.appeal_resolved_at!,
      text: r.appeal_status === 'overturned' ? `Your appeal was accepted: "${r.task_title}" now counts and your streak is updated.` : `Your appeal for "${r.task_title}" was reviewed. The decision stands.` }));
}
/** The timestamp to store when the person dismisses the notices: the newest one shown. */
export const newestStamp = (n: AppealNotice[]): string | null => (n.length ? n.reduce((m, x) => (Date.parse(x.at) > Date.parse(m) ? x.at : m), n[0].at) : null);
