export type ProofKind = 'link' | 'screenshot' | 'photo' | 'text';
export type ProofStatus = 'accepted' | 'needs_followup' | 'not_accepted';
export interface ProofInput { kind: ProofKind; content: string; phash?: string; relatedScore?: number /* 0..1 from AI check */;
  existingLinks: string[]; existingHashes: string[]; trustLevel: number }
export const normalizeUrl = (u: string) => u.trim().toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\/(www\.)?/, '');
export function hamming(a: string, b: string) {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { d += x & 1; x >>= 1; } }
  return d + Math.abs(a.length - b.length) * 4;
}
export const isDuplicateImage = (h: string, existing: string[], threshold = 6) => existing.some(e => hamming(h, e) <= threshold);
export function decideProof(p: ProofInput): { status: ProofStatus; reason: string } {
  if (p.kind === 'link') {
    if (!/^https?:\/\/\S+\.\S+/.test(p.content.trim())) return { status: 'not_accepted', reason: 'That is not a valid link.' };
    if (p.existingLinks.map(normalizeUrl).includes(normalizeUrl(p.content))) return { status: 'not_accepted', reason: 'This link was already used as proof.' };
  }
  if ((p.kind === 'photo' || p.kind === 'screenshot') && p.phash && isDuplicateImage(p.phash, p.existingHashes))
    return { status: 'not_accepted', reason: 'This image matches an earlier proof.' };
  if (p.kind === 'text' && p.content.trim().length < 15) return { status: 'needs_followup', reason: 'Too short. What exactly did you finish?' };
  const need = p.trustLevel < 3 ? 0.6 : 0.4; // new accounts get stricter checks
  if (p.relatedScore !== undefined && p.relatedScore < need) return { status: 'needs_followup', reason: 'This does not clearly match the task. What does it show?' };
  return { status: 'accepted', reason: 'Matches the task.' };
}
