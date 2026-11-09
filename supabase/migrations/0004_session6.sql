-- Session 6: followers can see image proofs (via signed URLs), the owner can open their own proof page, appeal decisions are timestamped.
-- Run once in the SQL editor after 0003.

-- 1) When a moderator decides an appeal (the `moderate` function sets this; clients cannot, proofs are read-only for them).
alter table proofs add column appeal_resolved_at timestamptz;

-- 2) Storage: a signed URL is only issued if the caller may SEE the proof the file belongs to (accepted, not hidden, public author, caller follows, no block; or your own).
create index proofs_media_path on proofs(media_path) where media_path is not null;
create function public.can_view_proof_image(path text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from proofs p where p.media_path = path and public.can_view_proof(p.id)) $$;
revoke execute on function public.can_view_proof_image from public, anon;
grant execute on function public.can_view_proof_image to authenticated;
create policy "followers read proof images" on storage.objects for select to authenticated using (bucket_id = 'proofs' and public.can_view_proof_image(name));

-- 3) feed_items: now also returns your OWN accepted proofs (the Feed screen filters them out; the proof page and notification links need them) and the image path for photo/screenshot proofs.
-- can_view_proof() already decides who may see what, including the public-profile rule, so the view no longer repeats it.
create or replace view public.feed_items as
  select p.id, p.user_id, p.task_id, p.day, p.kind, case when p.kind in ('link', 'text') then p.content end as content, p.created_at, pr.name, t.title as task_title,
    case when p.kind in ('photo', 'screenshot') then p.media_path end as media_path
  from proofs p join profiles pr on pr.id = p.user_id join tasks t on t.id = p.task_id
  where p.status = 'accepted' and not coalesce(p.hidden, false) and public.can_view_proof(p.id);
