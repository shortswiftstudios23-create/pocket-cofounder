// The only writer of proofs. Link check (SSRF-safe), image EXIF strip + phash, duplicate checks, decideProof(), streak-relevant writes.
import { admin, cors, json, userFrom } from '../_shared/util.ts';
import { decideProof, isDuplicateImage, normalizeUrl, type ProofKind } from '../../../src/core/proof.ts';
import { phashFromGray, toGray32 } from '../../../src/core/phash.ts';
import { isBlockedHost, isBlockedIp, extractPageText, relatedness } from '../../../src/core/linkcheck.ts';
import { dayKey } from '../../../src/core/day.ts';
import { decode as decodeImage } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import { aiRelatedness, moderateImage } from '../_shared/gemini.ts';

interface LinkResult { ok: boolean; reason?: string; text?: string }
async function hostIsPublic(host: string) {
  if (isBlockedHost(host)) return false;
  for (const t of ['A', 'AAAA'] as const) { try { if ((await Deno.resolveDns(host, t)).some(isBlockedIp)) return false; } catch { /* no records of this type */ } }
  return true;
}
async function checkLink(raw: string): Promise<LinkResult> {
  let url: URL; try { url = new URL(raw.trim()); } catch { return { ok: false, reason: 'That is not a valid link.' }; }
  for (let hop = 0; hop < 5; hop++) {
    if (!/^https?:$/.test(url.protocol) || !(await hostIsPublic(url.hostname))) return { ok: false, reason: 'That link cannot be checked.' };
    let res: Response;
    try { res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(6000), headers: { 'user-agent': 'PocketCofounderBot/1.0', accept: 'text/html,*/*;q=0.8' } }); }
    catch { return { ok: false, reason: 'We could not open that link.' }; }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { try { url = new URL(res.headers.get('location')!, url); } catch { return { ok: false, reason: 'That link redirects somewhere invalid.' }; } continue; }
    if (res.status === 401 || res.status === 403 || res.status === 429) { await res.body?.cancel(); return { ok: true }; } // exists, but bots are blocked
    if (!res.ok) { await res.body?.cancel(); return { ok: false, reason: `That link returned an error (${res.status}).` }; }
    if (!(res.headers.get('content-type') ?? '').includes('html')) { await res.body?.cancel(); return { ok: true }; }
    const reader = res.body!.getReader(); const dec = new TextDecoder(); let html = '';
    while (html.length < 200_000) { const { done, value } = await reader.read(); if (done) break; html += dec.decode(value, { stream: true }); }
    await reader.cancel(); return { ok: true, text: extractPageText(html) };
  }
  return { ok: false, reason: 'That link redirects too many times.' };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userFrom(req); if (!user) return json({ error: 'unauthorized' }, 401);
  let body: Record<string, unknown>; try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const db = admin();
  const { data: profile } = await db.from('profiles').select('tz, trust_level').eq('id', user.id).single();
  const tz = profile?.tz ?? 'UTC', trust = profile?.trust_level ?? 0;

  async function accept(proofId: string, taskId: string) {
    await db.from('tasks').update({ status: 'done' }).eq('id', taskId);
    await db.from('profiles').update({ trust_level: trust + 1 }).eq('id', user!.id);
    void proofId;
  }

  // ---- Appeal / follow-up ---------------------------------------------------------------------------
  if (body.action === 'appeal') {
    const note = String(body.note ?? '').trim();
    if (note.length < 10) return json({ error: 'Add a sentence of context.' }, 400);
    const { data: proof } = await db.from('proofs').select('*').eq('id', body.proof_id).eq('user_id', user.id).maybeSingle();
    if (!proof || proof.status === 'accepted') return json({ error: 'Nothing to appeal.' }, 404);
    if (proof.appeal_status !== 'none') return json({ error: 'This was already sent for review.' }, 409);
    const { data: task } = await db.from('tasks').select('id, title').eq('id', proof.task_id).single();
    if (proof.status === 'needs_followup' && proof.appeal_status === 'none') {
      const d = decideProof({ kind: 'text', content: note, relatedScore: relatedness(task!.title, `${proof.content ?? ''} ${note}`), existingLinks: [], existingHashes: [], trustLevel: trust });
      if (d.status === 'accepted') {
        await db.from('proofs').update({ status: 'accepted', status_reason: 'Accepted after your follow-up.', appeal_text: note }).eq('id', proof.id);
        await accept(proof.id, proof.task_id);
        return json({ proof_id: proof.id, status: 'accepted', reason: 'Accepted after your follow-up.' });
      }
    }
    await db.from('proofs').update({ appeal_status: 'pending', appeal_text: note }).eq('id', proof.id);
    return json({ proof_id: proof.id, status: proof.status, reason: 'Sent for review. We will look at it.', appeal_status: 'pending' });
  }

  // ---- New proof ------------------------------------------------------------------------------------
  const kind = body.kind as ProofKind;
  if (!['link', 'screenshot', 'photo', 'text'].includes(kind)) return json({ error: 'bad kind' }, 400);
  const { data: task } = await db.from('tasks').select('id, title, day').eq('id', body.task_id).eq('user_id', user.id).maybeSingle();
  if (!task) return json({ error: 'task not found' }, 404);
  if (task.day !== dayKey(new Date(), tz)) return json({ error: 'That task is from another day.' }, 400);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await db.from('proofs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
  if ((count ?? 0) >= 20) return json({ error: 'Too many submissions. Try again later.' }, 429);

  let imageB64: string | undefined;
  let content = String(body.content ?? '').trim(), mediaPath: string | null = null, phash: string | undefined, relatedScore: number | undefined;
  const existingLinks: string[] = [], existingHashes: string[] = [];
  let early: { status: 'not_accepted'; reason: string } | null = null;
  let flaggedImage = false; // set by the moderation hook: the proof is stored hidden and queued for a moderator
  const aiUser = { id: user.id, trust, tz };

  if (kind === 'link') {
    const [{ data: mine }, { data: exact }] = await Promise.all([
      db.from('proofs').select('content').eq('user_id', user.id).eq('kind', 'link').eq('status', 'accepted'),
      db.from('proofs').select('content').eq('kind', 'link').eq('status', 'accepted').eq('content', content)]);
    for (const r of [...(mine ?? []), ...(exact ?? [])]) existingLinks.push(r.content);
    if (!existingLinks.map(normalizeUrl).includes(normalizeUrl(content))) {
      const c = await checkLink(content);
      if (!c.ok) early = { status: 'not_accepted', reason: c.reason! };
      else if (c.text) relatedScore = relatedness(task.title, c.text);
    }
  } else if (kind === 'photo' || kind === 'screenshot') {
    mediaPath = String(body.media_path ?? '');
    if (!mediaPath.startsWith(`${user.id}/`) || mediaPath.includes('..')) return json({ error: 'bad media path' }, 400);
    const { data: blob, error } = await db.storage.from('proofs').download(mediaPath);
    if (error || !blob) return json({ error: 'upload not found' }, 400);
    try {
      const img = await decodeImage(new Uint8Array(await blob.arrayBuffer())) as unknown as { width: number; height: number; bitmap: Uint8ClampedArray; encodeJPEG(q: number): Promise<Uint8Array>; resize(w: number, h: number): unknown };
      phash = phashFromGray(toGray32(img.bitmap, img.width, img.height));
      // Server-side EXIF strip: re-encode and overwrite, so metadata never survives even if the client skipped it.
      const clean = await img.encodeJPEG(80);
      await db.storage.from('proofs').upload(mediaPath, clean, { contentType: 'image/jpeg', upsert: true });
      imageB64 = encodeBase64(clean);
    } catch { return json({ error: 'That image could not be read.' }, 400); }
    const { data: hashes } = await db.from('proofs').select('phash').not('phash', 'is', null).eq('status', 'accepted').order('created_at', { ascending: false }).limit(5000);
    for (const h of hashes ?? []) existingHashes.push(h.phash);
    content = content || '(image)';
    // Moderation hook (fails open when AI is off or capped; reports and moderators are the backstop).
    if (imageB64 && (await moderateImage(db, aiUser, imageB64)) === 'flagged') {
      flaggedImage = true; early = { status: 'not_accepted', reason: 'This image cannot be used as proof.' };
      await db.storage.from('proofs').remove([mediaPath]);
    } else if (!early && imageB64 && !isDuplicateImage(phash!, existingHashes)) relatedScore = await aiRelatedness(db, aiUser, task.title, '', imageB64);
  } else if (kind === 'text' && content.length >= 15) {
    relatedScore = await aiRelatedness(db, aiUser, task.title, content);
  }

  const decision = early ?? decideProof({ kind, content, phash, relatedScore, existingLinks, existingHashes, trustLevel: trust });
  const { data: row, error: insErr } = await db.from('proofs').insert({ user_id: user.id, task_id: task.id, day: task.day, kind, content, media_path: mediaPath, phash,
    status: decision.status, status_reason: decision.reason, hidden: flaggedImage }).select('id').single();
  if (insErr) {
    if (insErr.code === '23505') return json({ status: 'not_accepted', reason: 'This link was already used as proof.' });
    return json({ error: insErr.message }, 500);
  }
  if (flaggedImage) await db.from('reports').insert({ source: 'auto', target_type: 'proof', target_id: row.id, reason: 'inappropriate', detail: 'Flagged by image screening' });
  if (decision.status === 'accepted') await accept(row.id, task.id);
  return json({ proof_id: row.id, status: decision.status, reason: decision.reason });
});
