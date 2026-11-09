import { supabase } from './supabase';
import { DELETE_WORD } from '@/core/safety';
/** Permanently deletes the signed-in account (server checks the word again), then clears the local session. */
export async function deleteMyAccount(typed: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirm: typed.trim() } });
  if (error) {
    let msg = error.message; try { const j = await (error as { context?: Response }).context?.json(); if (j?.error) msg = j.error; } catch { /* keep generic message */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  await supabase.auth.signOut(); // the user no longer exists server-side; this clears the stored session so the gate returns to sign-in
}
export const DELETE_PROMPT = `Type ${DELETE_WORD} to permanently delete your account, proofs, messages and photos. This cannot be undone.`;
