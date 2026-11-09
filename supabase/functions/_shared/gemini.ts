// Server-side Gemini access + the per-user daily cap. The key lives only in function secrets (GEMINI_API_KEY), never in the app.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { aiDailyCap, MAX_IMAGE_B64, MODERATION_PROMPT, PROOF_CHECK_PROMPT, parseFlag, parsePingCopy, parseScore, systemPrompt } from '../../../src/core/aiprompt.ts';
import { dayKey } from '../../../src/core/day.ts';

export const aiConfigured = () => !!Deno.env.get('GEMINI_API_KEY');
export class AIError extends Error { constructor(public code: 'not_configured' | 'cap' | 'upstream', msg: string) { super(msg); } }

export async function gemini(o: { system: string; user: string; imageBase64?: string; maxTokens?: number; temperature?: number }): Promise<string> {
  const key = Deno.env.get('GEMINI_API_KEY'); if (!key) throw new AIError('not_configured', 'AI is not configured');
  const model = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
  if ((o.imageBase64?.length ?? 0) > MAX_IMAGE_B64) throw new AIError('upstream', 'image too large');
  const parts: unknown[] = [{ text: o.user }];
  if (o.imageBase64) parts.push({ inlineData: { mimeType: 'image/jpeg', data: o.imageBase64 } });
  const generationConfig: Record<string, unknown> = { maxOutputTokens: o.maxTokens ?? 300, temperature: o.temperature ?? 0.7 };
  if (/2\.5.*flash/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 }; // short answers, no hidden thinking tokens
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', signal: AbortSignal.timeout(20_000),
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: o.system }] }, contents: [{ role: 'user', parts }], generationConfig }) });
  } catch { throw new AIError('upstream', 'AI request failed'); }
  if (!res.ok) { console.error('gemini', res.status, (await res.text()).slice(0, 300)); throw new AIError('upstream', `AI error ${res.status}`); }
  const j = await res.json();
  const text = (j?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('').trim();
  if (!text) throw new AIError('upstream', 'AI returned nothing');
  return text;
}

/** Atomically counts one AI call against today's cap. False means the cap is used up. */
export async function reserveAI(db: SupabaseClient, uid: string, trust: number, tz: string): Promise<boolean> {
  const { data, error } = await db.rpc('bump_ai_usage', { p_user: uid, p_day: dayKey(new Date(), tz), p_cap: aiDailyCap(trust) });
  if (error) { console.error('bump_ai_usage', error.message); return false; }
  return (data as number) > 0;
}

/** 0..1 "does this proof show the task?" or undefined when AI is off, capped, or failed (callers then fall back to the rule checks). */
export async function aiRelatedness(db: SupabaseClient, u: { id: string; trust: number; tz: string }, taskTitle: string, content: string, imageBase64?: string): Promise<number | undefined> {
  if (!aiConfigured() || !(await reserveAI(db, u.id, u.trust, u.tz))) return undefined;
  try { return parseScore(await gemini({ system: PROOF_CHECK_PROMPT, user: `Task: ${taskTitle.slice(0, 300)}\nProof: ${content.slice(0, 1500) || '(see image)'}`, imageBase64, maxTokens: 40, temperature: 0 })); } catch { return undefined; }
}
/** Image moderation hook. Fails open (unknown) when AI is unavailable: the report flow and moderators are the backstop. */
export async function moderateImage(db: SupabaseClient, u: { id: string; trust: number; tz: string }, imageBase64: string): Promise<'flagged' | 'ok' | 'unknown'> {
  if (!aiConfigured() || !(await reserveAI(db, u.id, u.trust, u.tz))) return 'unknown';
  try { return parseFlag(await gemini({ system: MODERATION_PROMPT, user: 'Screen this image.', imageBase64, maxTokens: 20, temperature: 0 })); } catch { return 'unknown'; }
}

/** AI-written ping copy for one push. Always returns usable copy: falls back to the fixed text on any problem. */
export async function aiPingCopy(db: SupabaseClient, u: { id: string; trust: number; tz: string }, stage: string, openTask: string | undefined, fallback: { title: string; body: string }) {
  if (!aiConfigured() || !(await reserveAI(db, u.id, u.trust, u.tz))) return fallback;
  try { return parsePingCopy(await gemini({ system: systemPrompt('ping_copy'), user: `Ping stage: ${stage}. Their open task: ${openTask?.slice(0, 200) ?? '(none yet)'}`, maxTokens: 80, temperature: 0.9 }), fallback); } catch { return fallback; }
}
