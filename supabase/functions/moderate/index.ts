// Moderator-only actions (service role). Caller must have profiles.is_moderator = true.
import { admin, cors, json, userFrom } from '../_shared/util.ts';
import { sendPush } from '../_shared/push.ts';
import { resolveAppeal, type AppealDecision } from '../../../src/core/appeal.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userFrom(req); if (!user) return json({ error: 'unauthorized' }, 401);
  const db = admin();
  const { data: me } = await db.from('profiles').select('is_moderator').eq('id', user.id).single();
  if (!me?.is_moderator) return json({ error: 'forbidden' }, 403);
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }

  if (b.action === 'list_appeals') {
    const { data, error } = await db.from('proofs').select('id, user_id, task_id, kind, content, media_path, status, status_reason, appeal_text, created_at').eq('appeal_status', 'pending').order('created_at').limit(50);
    if (error) return json({ error: error.message }, 500);
    const ids = [...new Set((data ?? []).map(p => p.task_id))];
    const { data: tasks } = ids.length ? await db.from('tasks').select('id, title').in('id', ids) : { data: [] };
    const out = [];
    for (const p of data ?? []) {
      let image_url: string | null = null;
      if (p.media_path) image_url = (await db.storage.from('proofs').createSignedUrl(p.media_path, 600)).data?.signedUrl ?? null;
      out.push({ ...p, task_title: (tasks ?? []).find(t => t.id === p.task_id)?.title ?? '', image_url });
    }
    return json({ items: out });
  }

  if (b.action === 'resolve_appeal') {
    const decision = b.decision as AppealDecision; if (decision !== 'uphold' && decision !== 'overturn') return json({ error: 'bad decision' }, 400);
    const { data: p } = await db.from('proofs').select('id, user_id, task_id, status, appeal_status').eq('id', b.proof_id).maybeSingle();
    if (!p || p.appeal_status !== 'pending') return json({ error: 'No pending appeal for that proof.' }, 404);
    const o = resolveAppeal(p.status, decision, typeof b.note === 'string' ? b.note.slice(0, 300) : undefined);
    const { error } = await db.from('proofs').update({ ...o.proof, appeal_resolved_at: new Date().toISOString() }).eq('id', p.id);
    if (error) return json({ error: error.code === '23505' ? 'Another accepted proof already uses this link.' : error.message }, error.code === '23505' ? 409 : 500);
    if (o.taskDone) {
      await db.from('tasks').update({ status: 'done' }).eq('id', p.task_id);
      const { data: u } = await db.from('profiles').select('trust_level').eq('id', p.user_id).single();
      await db.from('profiles').update({ trust_level: (u?.trust_level ?? 0) + o.trustDelta }).eq('id', p.user_id);
    }
    await sendPush(db, p.user_id, { title: decision === 'overturn' ? 'Appeal accepted' : 'Appeal reviewed', body: decision === 'overturn' ? 'Your proof now counts. Streak updated.' : o.proof.status_reason, tag: 'appeal', url: '/' }).catch(() => {});
    return json({ ok: true, status: o.proof.status, appeal_status: o.proof.appeal_status });
  }

  if (b.action === 'list_reports') {
    const { data, error } = await db.from('reports').select('id, reporter_id, source, target_type, target_id, target_user, reason, detail, created_at').eq('status', 'open').order('created_at').limit(50);
    if (error) return json({ error: error.message }, 500);
    const out = [];
    for (const r of data ?? []) {
      let preview = '';
      if (r.target_type === 'proof') preview = (await db.from('proofs').select('kind, content').eq('id', r.target_id).maybeSingle()).data?.content ?? '(image)';
      else if (r.target_type === 'comment') preview = (await db.from('comments').select('body').eq('id', r.target_id).maybeSingle()).data?.body ?? '';
      else if (r.target_type === 'message') preview = (await db.from('messages').select('body').eq('id', r.target_id).maybeSingle()).data?.body ?? '';
      else preview = (await db.from('profiles').select('name, bio').eq('id', r.target_id).maybeSingle()).data?.name ?? '';
      out.push({ ...r, preview });
    }
    return json({ items: out });
  }

  if (b.action === 'resolve_report') {
    const act = b.decision; if (act !== 'hide' && act !== 'restore' && act !== 'dismiss') return json({ error: 'bad decision' }, 400);
    const { data: r } = await db.from('reports').select('*').eq('id', b.report_id).maybeSingle(); if (!r || r.status !== 'open') return json({ error: 'Report not found.' }, 404);
    const table = ({ proof: 'proofs', comment: 'comments', message: 'messages' } as Record<string, string>)[r.target_type];
    if (table && act !== 'dismiss') await db.from(table).update({ hidden: act === 'hide' }).eq('id', r.target_id);
    // Closing one report closes every open report on the same target.
    await db.from('reports').update({ status: act === 'dismiss' || act === 'restore' ? 'dismissed' : 'actioned', resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('target_type', r.target_type).eq('target_id', r.target_id).eq('status', 'open');
    return json({ ok: true });
  }
  return json({ error: 'bad action' }, 400);
});
