// Pure AI helpers shared by the app and the edge functions (no network, no React): prompts, caps, parsing.
export type AITask = 'morning_plan' | 'task_challenge' | 'missed_task' | 'proof_feedback' | 'review' | 'chat' | 'ping_copy';
export const AI_TASKS: readonly AITask[] = ['morning_plan', 'task_challenge', 'missed_task', 'proof_feedback', 'review', 'chat', 'ping_copy'];
export const SERIOUS = /(sick|ill|hospital|funeral|died|burnout|burned out|family emergency|exhausted)/i;
export const isSerious = (s: string) => SERIOUS.test(s);
export const MAX_INPUT = 2000, MAX_MEMORY = 1500, MAX_IMAGE_B64 = 2_800_000; // ~2 MB of image bytes

const VOICE = 'You are Pocket Cofounder, a direct, warm, brief accountability partner for a solo founder. Never use hype or emojis. Reply in at most 3 short sentences and ask at most ONE question. '
  + 'If the person mentions illness, grief, burnout or an emergency, drop the pressure: tell them to rest and offer one tiny step later.';
const TASK_HINT: Record<AITask, string> = {
  morning_plan: 'Help them choose one concrete thing to finish today. Ask what exactly will exist by tonight.',
  task_challenge: 'The user just wrote a task. If it is vague, challenge it and ask for a concrete deliverable. If it is already concrete, say so in one sentence.',
  missed_task: 'The user skipped or missed a task. Ask what got in the way: blocked, low energy, priorities changed, or avoidance. Do not scold.',
  proof_feedback: 'The user submitted proof. React to what they showed and ask which part they finished.',
  review: 'Write a weekly review from the stats given: promised vs shipped, one honest observation, one hard question.',
  chat: 'Answer as a cofounder who knows their project from the memory. Keep it practical.',
  ping_copy: 'Write a push notification. Output exactly two lines: line 1 is a title of at most 5 words, line 2 is a body of at most 18 words.',
};
export const systemPrompt = (t: AITask) => `${VOICE}\n${TASK_HINT[t]}`;
export const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);
export function userPrompt(memory: string, input: string) { return `What I know about them:\n${clip(memory, MAX_MEMORY) || '(nothing yet)'}\n\nThey say:\n${clip(input, MAX_INPUT)}`; }

/** Daily AI calls per user. New accounts get less. */
export const aiDailyCap = (trust: number) => (trust < 3 ? 30 : trust < 10 ? 60 : 100);

/** Pulls a 0..1 score out of model text such as {"score":0.8} or "0.8". Undefined when there is none. */
export function parseScore(text: string): number | undefined {
  const m = /"score"\s*:\s*(-?\d*\.?\d+)/.exec(text) ?? /(-?\d*\.?\d+)/.exec(text);
  if (!m) return undefined; const n = Number(m[1]); if (!Number.isFinite(n)) return undefined;
  return Math.min(1, Math.max(0, n > 1 && n <= 100 ? n / 100 : n));
}
/** Moderation verdict. Anything unparseable is treated as "not flagged" (fail open) and reported as unknown. */
export function parseFlag(text: string): 'flagged' | 'ok' | 'unknown' {
  const m = /"flag"\s*:\s*(true|false)/i.exec(text); if (!m) return 'unknown'; return m[1].toLowerCase() === 'true' ? 'flagged' : 'ok';
}
/** Splits AI ping copy into title/body, falling back to the given default. */
export function parsePingCopy(text: string, fallback: { title: string; body: string }) {
  const lines = text.split('\n').map(l => l.replace(/^["'*\s-]+|["'*\s]+$/g, '')).filter(Boolean);
  if (lines.length < 2 || lines[0].length > 40 || lines[1].length > 140) return fallback;
  return { title: lines[0], body: lines[1] };
}
export const PROOF_CHECK_PROMPT = 'You check whether a proof matches a task. Reply with JSON only: {"score": number between 0 and 1}. 1 means the proof clearly shows the task was done; 0.5 means partly or unclear; 0 means unrelated.';
export const MODERATION_PROMPT = 'You screen an image submitted as work proof. Reply with JSON only: {"flag": true|false}. flag=true for nudity, sexual content, graphic violence, or anything involving minors in unsafe contexts. Otherwise false.';
