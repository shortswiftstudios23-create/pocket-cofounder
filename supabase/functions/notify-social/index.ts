// Push for a new direct message or comment. The sender's app calls this right after the insert succeeds.
// Safe by construction: the caller must BE the author of the row, the recipient is looked up here (never sent by the client), blocks and hidden rows are skipped.
import { admin, cors, json, userFrom } from '../_shared/util.ts';
import { sendPush } from '../_shared/push.ts';
import { messagePush, commentPush, shouldPushMessage, shouldPushComment } from '../../../src/core/socialpush.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userFrom(req); if (!user) return json({ error: 'unauthorized' }, 401);
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  const db = admin();
  const blocked = async (x: string, y: string) => ((await db.from('blocks').select('blocker_id', { count: 'exact', head: true }).or(`and(blocker_id.eq.${x},blocked_id.eq.${y}),and(blocker_id.eq.${y},blocked_id.eq.${x})`)).count ?? 0) > 0;
  const nameOf = async (id: string) => (await db.from('profiles').select('name').eq('id', id).maybeSingle()).data?.name ?? null;

  if (b.kind === 'message') {
    const { data: m } = await db.from('messages').select('id, conversation_id, sender_id, hidden').eq('id', b.id).maybeSingle();
    if (!m || m.sender_id !== user.id) return json({ error: 'not found' }, 404);
    const { data: c } = await db.from('conversations').select('user_a, user_b').eq('id', m.conversation_id).single(); if (!c) return json({ error: 'not found' }, 404);
    const to = c.user_a === user.id ? c.user_b : c.user_a;
    const { count } = await db.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', m.conversation_id).eq('sender_id', user.id).is('read_at', null);
    if (!shouldPushMessage({ unreadFromSender: count ?? 1, blockedEither: await blocked(user.id, to), hidden: !!m.hidden })) return json({ sent: 0 });
    return json({ sent: await sendPush(db, to, messagePush(await nameOf(user.id), m.conversation_id)) });
  }

  if (b.kind === 'comment') {
    const { data: c } = await db.from('comments').select('id, proof_id, user_id, hidden').eq('id', b.id).maybeSingle();
    if (!c || c.user_id !== user.id) return json({ error: 'not found' }, 404);
    const { data: p } = await db.from('proofs').select('id, user_id, task_id').eq('id', c.proof_id).single(); if (!p) return json({ error: 'not found' }, 404);
    if (!shouldPushComment({ commenter: user.id, owner: p.user_id, blockedEither: await blocked(user.id, p.user_id), hidden: !!c.hidden })) return json({ sent: 0 });
    const { data: t } = await db.from('tasks').select('title').eq('id', p.task_id).maybeSingle();
    return json({ sent: await sendPush(db, p.user_id, commentPush(await nameOf(user.id), t?.title ?? 'your task', p.id)) });
  }
  return json({ error: 'bad kind' }, 400);
});
