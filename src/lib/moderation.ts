// Moderator calls. The edge function re-checks profiles.is_moderator on every call; hiding this UI is convenience only.
import { supabase } from './supabase';
export interface AppealItem { id: string; user_id: string; kind: string; content: string | null; image_url: string | null; status: string; status_reason: string | null; appeal_text: string | null; task_title: string; created_at: string }
export interface ReportItem { id: string; source: 'user' | 'auto'; target_type: string; target_id: string; reason: string; detail: string | null; preview: string; created_at: string }
async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('moderate', { body });
  if (error) { let msg = error.message; try { const j = await (error as { context?: Response }).context?.json(); if (j?.error) msg = j.error; } catch { /* keep */ } throw new Error(msg); }
  if (data?.error) throw new Error(data.error); return data as T;
}
export const listAppeals = async () => (await call<{ items: AppealItem[] }>({ action: 'list_appeals' })).items;
export const resolveAppeal = (proof_id: string, decision: 'uphold' | 'overturn', note?: string) => call({ action: 'resolve_appeal', proof_id, decision, note });
export const listReports = async () => (await call<{ items: ReportItem[] }>({ action: 'list_reports' })).items;
export const resolveReport = (report_id: string, decision: 'hide' | 'restore' | 'dismiss') => call({ action: 'resolve_report', report_id, decision });
