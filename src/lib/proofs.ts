import type { ProofKind, ProofStatus } from '@/core/proof';
import { supabase } from './supabase';
import { uploadProofImage } from './image';
export interface ProofResult { proof_id: string; status: ProofStatus; reason: string; appeal_status?: string }
async function call(body: Record<string, unknown>): Promise<ProofResult> {
  const { data, error } = await supabase.functions.invoke('submit-proof', { body });
  if (error) {
    let msg = error.message; try { const j = await (error as { context?: Response }).context?.json(); if (j?.error) msg = j.error; } catch { /* keep generic message */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data as ProofResult;
}
export async function submitProof(a: { uid: string; taskId: string; kind: ProofKind; content?: string; imageUri?: string }) {
  const media_path = a.imageUri ? await uploadProofImage(a.uid, a.imageUri) : undefined;
  return call({ task_id: a.taskId, kind: a.kind, content: a.content, media_path });
}
export const appealProof = (proofId: string, note: string) => call({ action: 'appeal', proof_id: proofId, note });
