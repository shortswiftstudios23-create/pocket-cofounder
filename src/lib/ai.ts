// ALL AI calls go through askAI(). Live mode calls the `ai-proxy` edge function (Gemini key + daily cap live there); mock mode needs no setup.
import { supabase } from './supabase';
import { isSerious, type AITask } from '@/core/aiprompt';
export type { AITask };
export interface AIRequest { task: AITask; memorySummary: string; input: string; imageBase64?: string }
export interface AIResponse { text: string; softened?: boolean }

async function mock(r: AIRequest): Promise<AIResponse> {
  if (isSerious(r.input)) return { text: 'That sounds heavy. Rest first. When you are ready, one small step is enough.', softened: true };
  const t: Record<AITask, string> = {
    morning_plan: 'What exactly will exist by tonight?', task_challenge: 'That task is too vague. What exactly will exist by tonight?',
    missed_task: 'What got in the way: blocked, low energy, priorities changed, or avoidance?',
    proof_feedback: 'Got it. Which part did you finish?', review: 'Promised vs shipped. One hard question next.', chat: 'Tell me what you are working on right now.',
    ping_copy: 'Proof time. What can you show right now?' };
  return { text: t[r.task] };
}
let memoryCache: { uid: string; text: string } | null = null;
async function loadMemory(): Promise<string> {
  const { data: s } = await supabase.auth.getSession(); const uid = s.session?.user.id; if (!uid) return '';
  const cached = memoryCache; if (cached && cached.uid === uid) return cached.text;
  const { data } = await supabase.from('memory_entries').select('body').eq('user_id', uid).order('updated_at', { ascending: false }).limit(5);
  const text = (data ?? []).map((m: { body: string }) => m.body).join('\n'); memoryCache = { uid, text }; return text;
}
export async function askAI(r: AIRequest): Promise<AIResponse> {
  if ((process.env.EXPO_PUBLIC_AI_MODE ?? 'mock') === 'mock') return mock(r);
  try {
    const memorySummary = r.memorySummary || (await loadMemory().catch(() => ''));
    const { data, error } = await supabase.functions.invoke('ai-proxy', { body: { task: r.task, memorySummary, input: r.input, imageBase64: r.imageBase64 } });
    if (error) {
      let j: { error?: string; code?: string } | undefined; try { j = await (error as { context?: Response }).context?.json(); } catch { /* not json */ }
      if (j?.code === 'cap') return { text: j.error ?? 'Daily AI limit reached. It resets tomorrow.' }; // tell the person why, do not fake an answer
      throw new Error(j?.error ?? error.message);
    }
    return { text: String(data.text), softened: !!data.softened };
  } catch { return mock(r); } // AI down or not configured: the app keeps working with the built-in prompts
}
