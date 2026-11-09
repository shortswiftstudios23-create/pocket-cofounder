-- Session 5 / Phase 2: social + safety + AI usage. RLS is enabled in the same statement block as each table, before any data can exist.
-- Limits here MUST match src/core/safety.ts (LIMITS, AUTO_HIDE_REPORTS).
-- Clients never write proofs or trust_level (unchanged from 0002). Moderator actions go through the `moderate` edge function (service role).

alter table profiles add column is_moderator boolean not null default false; -- not in the 0002 column grant, so clients cannot set it. Grant yourself in the SQL editor.

-- ---------- tables ----------
create table follows(follower_id uuid not null references profiles on delete cascade, followee_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(), primary key (follower_id, followee_id), check (follower_id <> followee_id));
create index follows_followee on follows(followee_id);
create table blocks(blocker_id uuid not null references profiles on delete cascade, blocked_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(), primary key (blocker_id, blocked_id), check (blocker_id <> blocked_id));
create index blocks_blocked on blocks(blocked_id);
create table reactions(id uuid primary key default gen_random_uuid(), proof_id uuid not null references proofs on delete cascade, user_id uuid not null references profiles on delete cascade,
  kind text not null check (kind in ('fire', 'clap', 'check')), created_at timestamptz not null default now(), unique (proof_id, user_id, kind));
create index reactions_proof on reactions(proof_id);
create table comments(id uuid primary key default gen_random_uuid(), proof_id uuid not null references proofs on delete cascade, user_id uuid not null references profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 500), hidden boolean not null default false, created_at timestamptz not null default now());
create index comments_proof on comments(proof_id, created_at);
create table reports(id uuid primary key default gen_random_uuid(), reporter_id uuid references profiles on delete set null, source text not null default 'user' check (source in ('user', 'auto')),
  target_type text not null check (target_type in ('proof', 'comment', 'profile', 'message')), target_id uuid not null, target_user uuid references profiles on delete set null,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'fake_proof', 'other')), detail text check (char_length(detail) <= 300),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')), created_at timestamptz not null default now(), resolved_by uuid references profiles on delete set null, resolved_at timestamptz,
  unique (reporter_id, target_type, target_id));
create index reports_open on reports(status, created_at);
create table conversations(id uuid primary key default gen_random_uuid(), user_a uuid not null references profiles on delete cascade, user_b uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(), last_message_at timestamptz not null default now(), unique (user_a, user_b), check (user_a < user_b));
create index conversations_a on conversations(user_a); create index conversations_b on conversations(user_b);
create table messages(id uuid primary key default gen_random_uuid(), conversation_id uuid not null references conversations on delete cascade, sender_id uuid not null references profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 1000), hidden boolean not null default false, read_at timestamptz, created_at timestamptz not null default now());
create index messages_conv on messages(conversation_id, created_at);
create table app_usage(user_id uuid not null references profiles on delete cascade, day date not null, ai_calls int not null default 0, primary key (user_id, day));

-- ---------- RLS on, immediately ----------
alter table follows enable row level security; alter table blocks enable row level security; alter table reactions enable row level security; alter table comments enable row level security;
alter table reports enable row level security; alter table conversations enable row level security; alter table messages enable row level security; alter table app_usage enable row level security;

-- ---------- helper functions (security definer so policies can look across users without exposing tables) ----------
create function public.is_blocked_pair(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)) $$;
create function public.are_mutual(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from follows where follower_id = a and followee_id = b) and exists (select 1 from follows where follower_id = b and followee_id = a) $$;
-- You may see a proof if it is accepted, not hidden, its author is public, you follow them (or it is yours), and nobody blocked anybody.
create function public.can_view_proof(pid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from proofs p join profiles pr on pr.id = p.user_id where p.id = pid and auth.uid() is not null and (
    p.user_id = auth.uid() or (p.status = 'accepted' and not coalesce(p.hidden, false) and pr.is_public and not public.is_blocked_pair(auth.uid(), p.user_id)
      and exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = p.user_id)))) $$;
create function public.in_conversation(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversations c where c.id = cid and auth.uid() in (c.user_a, c.user_b)) $$;
create function public.can_send_in(cid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversations c where c.id = cid and auth.uid() in (c.user_a, c.user_b)
    and not public.is_blocked_pair(c.user_a, c.user_b) and public.are_mutual(c.user_a, c.user_b)) $$;
revoke execute on function public.is_blocked_pair, public.are_mutual, public.can_view_proof, public.in_conversation, public.can_send_in from public, anon;
grant execute on function public.is_blocked_pair, public.are_mutual, public.can_view_proof, public.in_conversation, public.can_send_in to authenticated;

-- ---------- policies ----------
create policy "see my follow edges" on follows for select using (follower_id = auth.uid() or followee_id = auth.uid());
create policy "follow as me" on follows for insert with check (follower_id = auth.uid() and not public.is_blocked_pair(follower_id, followee_id));
create policy "unfollow as me" on follows for delete using (follower_id = auth.uid());

create policy "see my blocks" on blocks for select using (blocker_id = auth.uid());
create policy "block as me" on blocks for insert with check (blocker_id = auth.uid());
create policy "unblock as me" on blocks for delete using (blocker_id = auth.uid());

create policy "read reactions on viewable proofs" on reactions for select using (public.can_view_proof(proof_id) and not public.is_blocked_pair(auth.uid(), user_id));
create policy "react as me" on reactions for insert with check (user_id = auth.uid() and public.can_view_proof(proof_id));
create policy "unreact as me" on reactions for delete using (user_id = auth.uid());

create policy "read comments" on comments for select using (user_id = auth.uid() or (not hidden and public.can_view_proof(proof_id) and not public.is_blocked_pair(auth.uid(), user_id)));
create policy "comment as me" on comments for insert with check (user_id = auth.uid() and not hidden and public.can_view_proof(proof_id));
create policy "delete my comment" on comments for delete using (user_id = auth.uid());

create policy "see my reports" on reports for select using (reporter_id = auth.uid());
create policy "report as me" on reports for insert with check (reporter_id = auth.uid() and source = 'user' and status = 'open');

create policy "see my conversations" on conversations for select using (auth.uid() in (user_a, user_b)); -- created only by start_conversation()

create policy "read messages in my conversations" on messages for select using (public.in_conversation(conversation_id) and (sender_id = auth.uid() or not hidden));
create policy "send as me" on messages for insert with check (sender_id = auth.uid() and not hidden and public.can_send_in(conversation_id));
create policy "mark received messages read" on messages for update using (public.in_conversation(conversation_id) and sender_id <> auth.uid()) with check (sender_id <> auth.uid());
revoke update on messages from authenticated; grant update (read_at) on messages to authenticated;

create policy "see my usage" on app_usage for select using (user_id = auth.uid()); -- writes: bump_ai_usage() only

-- Mutual follows can read each other's profile (name) even when private, so DMs and the inbox show real names.
create policy "mutual follows readable" on profiles for select using (public.are_mutual(auth.uid(), id));

-- ---------- rate limits (server-side; the client cannot skip them) ----------
create function public.enforce_rate() returns trigger language plpgsql security definer set search_path = public as $$
declare n int; begin
  if tg_table_name = 'comments' then select count(*) into n from comments where user_id = new.user_id and created_at > now() - interval '1 hour'; if n >= 20 then raise exception 'rate_limited: too many comments' using errcode = 'P0001'; end if;
  elsif tg_table_name = 'messages' then select count(*) into n from messages where sender_id = new.sender_id and created_at > now() - interval '1 hour'; if n >= 60 then raise exception 'rate_limited: too many messages' using errcode = 'P0001'; end if;
  elsif tg_table_name = 'reports' then if new.source = 'user' then select count(*) into n from reports where reporter_id = new.reporter_id and created_at > now() - interval '1 hour'; if n >= 10 then raise exception 'rate_limited: too many reports' using errcode = 'P0001'; end if; end if;
  elsif tg_table_name = 'follows' then select count(*) into n from follows where follower_id = new.follower_id and created_at > now() - interval '1 day'; if n >= 100 then raise exception 'rate_limited: too many follows' using errcode = 'P0001'; end if;
  end if; return new; end $$;
create trigger rate_comments before insert on comments for each row execute function public.enforce_rate();
create trigger rate_messages before insert on messages for each row execute function public.enforce_rate();
create trigger rate_reports before insert on reports for each row execute function public.enforce_rate();
create trigger rate_follows before insert on follows for each row execute function public.enforce_rate();

-- Blocking removes follows both ways.
create function public.after_block() returns trigger language plpgsql security definer set search_path = public as $$
begin delete from follows where (follower_id = new.blocker_id and followee_id = new.blocked_id) or (follower_id = new.blocked_id and followee_id = new.blocker_id); return new; end $$;
create trigger blocks_cleanup after insert on blocks for each row execute function public.after_block();

-- Reports: validate the target, fill target_user, auto-hide a proof/comment once 3 distinct people report it.
create function public.before_report() returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; begin
  if new.target_type = 'proof' then select user_id into owner from proofs where id = new.target_id;
  elsif new.target_type = 'comment' then select user_id into owner from comments where id = new.target_id;
  elsif new.target_type = 'profile' then select id into owner from profiles where id = new.target_id;
  else select m.sender_id into owner from messages m join conversations c on c.id = m.conversation_id where m.id = new.target_id and (new.source = 'auto' or auth.uid() in (c.user_a, c.user_b)); end if;
  if owner is null then raise exception 'report target not found'; end if;
  if new.source = 'user' and owner = new.reporter_id then raise exception 'you cannot report yourself'; end if;
  new.target_user := owner; return new; end $$;
create trigger reports_before before insert on reports for each row execute function public.before_report();
create function public.after_report() returns trigger language plpgsql security definer set search_path = public as $$
declare n int; begin
  if new.source = 'user' and new.target_type in ('proof', 'comment') then
    select count(distinct reporter_id) into n from reports where target_type = new.target_type and target_id = new.target_id and source = 'user' and status = 'open';
    if n >= 3 then
      if new.target_type = 'proof' then update proofs set hidden = true where id = new.target_id; else update comments set hidden = true where id = new.target_id; end if;
    end if;
  end if; return new; end $$;
create trigger reports_after after insert on reports for each row execute function public.after_report();

-- Conversations: only via this function (mutual follow, no block). Messages bump last_message_at.
create function public.start_conversation(other uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a uuid; b uuid; cid uuid; begin
  if me is null then raise exception 'not signed in'; end if;
  if other is null or other = me then raise exception 'pick someone else'; end if;
  if public.is_blocked_pair(me, other) or not public.are_mutual(me, other) then raise exception 'You can message people who follow you back.'; end if;
  a := least(me, other); b := greatest(me, other);
  insert into conversations(user_a, user_b) values (a, b) on conflict (user_a, user_b) do nothing;
  select id into cid from conversations where user_a = a and user_b = b; return cid; end $$;
revoke execute on function public.start_conversation from public, anon; grant execute on function public.start_conversation to authenticated;
create function public.after_message() returns trigger language plpgsql security definer set search_path = public as $$
begin update conversations set last_message_at = new.created_at where id = new.conversation_id; return new; end $$;
create trigger messages_after after insert on messages for each row execute function public.after_message();

-- ---------- feed + public profile ----------
create view public.feed_items as
  select p.id, p.user_id, p.task_id, p.day, p.kind, case when p.kind in ('link', 'text') then p.content end as content, p.created_at, pr.name, t.title as task_title
  from proofs p join profiles pr on pr.id = p.user_id join tasks t on t.id = p.task_id
  where p.status = 'accepted' and not coalesce(p.hidden, false) and pr.is_public and p.user_id <> auth.uid() and public.can_view_proof(p.id); -- owner-run view: shows only these columns, only what can_view_proof allows
revoke all on public.feed_items from public, anon; grant select on public.feed_items to authenticated;

create function public.public_profile(pid uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); r profiles; begin
  if me is null then return null; end if;
  select * into r from profiles where id = pid; if not found then return null; end if;
  if pid <> me and (not r.is_public or public.is_blocked_pair(me, pid)) then return null; end if;
  return jsonb_build_object('id', r.id, 'name', r.name, 'bio', r.bio, 'project', r.project, 'stage', r.stage, 'field', r.field, 'is_public', r.is_public,
    'followers', (select count(*) from follows where followee_id = pid), 'following', (select count(*) from follows where follower_id = pid),
    'days', coalesce((select jsonb_agg(distinct day order by day) from proofs where user_id = pid and status = 'accepted'), '[]'::jsonb),
    'i_follow', exists (select 1 from follows where follower_id = me and followee_id = pid), 'follows_me', exists (select 1 from follows where follower_id = pid and followee_id = me),
    'i_blocked', exists (select 1 from blocks where blocker_id = me and blocked_id = pid)); end $$;
revoke execute on function public.public_profile from public, anon; grant execute on function public.public_profile to authenticated;

-- ---------- AI usage (daily cap). Only the edge functions (service role) call this. Returns the new count, or -1 when the cap is reached. ----------
create function public.bump_ai_usage(p_user uuid, p_day date, p_cap int) returns int language plpgsql security definer set search_path = public as $$
declare n int; begin
  insert into app_usage as u(user_id, day, ai_calls) values (p_user, p_day, 1) on conflict (user_id, day) do update set ai_calls = u.ai_calls + 1 where u.ai_calls < p_cap returning u.ai_calls into n;
  return coalesce(n, -1); end $$;
revoke execute on function public.bump_ai_usage from public, anon, authenticated; grant execute on function public.bump_ai_usage to service_role;

-- ---------- realtime for the inbox ----------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then alter publication supabase_realtime add table public.messages; end if;
end $$;
