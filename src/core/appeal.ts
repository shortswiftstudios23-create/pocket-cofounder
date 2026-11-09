// What a moderator decision does to a proof and its task. The edge function applies exactly this.
import type { ProofStatus } from './proof.ts';
export type AppealDecision = 'uphold' | 'overturn'; // uphold = the original rejection stands
export interface AppealOutcome { proof: { status: ProofStatus; appeal_status: 'upheld' | 'overturned'; status_reason: string }; taskDone: boolean; trustDelta: number }
export function resolveAppeal(current: ProofStatus, decision: AppealDecision, note?: string): AppealOutcome {
  if (decision === 'overturn') return { proof: { status: 'accepted', appeal_status: 'overturned', status_reason: 'Accepted after review.' }, taskDone: true, trustDelta: 1 };
  return { proof: { status: current, appeal_status: 'upheld', status_reason: note?.trim() ? `Review: ${note.trim()}` : 'Review kept the original decision.' }, taskDone: false, trustDelta: 0 };
}
