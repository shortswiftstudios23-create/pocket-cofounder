// Permanent account deletion. The caller must send {"confirm":"DELETE"}. Removes the person's stored images, then the auth user;
// every table that references profiles/auth.users is `on delete cascade`, so tasks, proofs, follows, comments, messages, device tokens etc. go with it.
import { admin, cors, json, userFrom } from '../_shared/util.ts';
import { isDeleteConfirmed } from '../../../src/core/safety.ts';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userFrom(req); if (!user) return json({ error: 'unauthorized' }, 401);
  let b: Record<string, unknown>; try { b = await req.json(); } catch { return json({ error: 'bad json' }, 400); }
  if (!isDeleteConfirmed(String(b.confirm ?? ''))) return json({ error: 'Type DELETE to confirm.' }, 400);
  const db = admin();
  for (let round = 0; round < 20; round++) { // images live in a folder named after the user id; remove them 1000 at a time
    const { data: files, error } = await db.storage.from('proofs').list(user.id, { limit: 1000 });
    if (error) return json({ error: 'Could not remove your images. Nothing was deleted.' }, 500);
    if (!files?.length) break;
    const { error: rmErr } = await db.storage.from('proofs').remove(files.map(f => `${user.id}/${f.name}`));
    if (rmErr) return json({ error: 'Could not remove your images. Nothing was deleted.' }, 500);
  }
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return json({ error: 'Could not delete the account. Try again.' }, 500);
  return json({ ok: true });
});
