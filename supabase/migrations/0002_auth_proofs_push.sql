-- Session 3: onboarding flag, profile auto-create, server-only proof writes, appeals, push devices, proof storage.
alter table profiles add column onboarded boolean not null default false, add column cutoff_min int not null default 1260; -- 21:00 local

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id, name) select id, split_part(email, '@', 1) from auth.users on conflict do nothing; -- backfill

-- Clients may not touch trust_level or insert profiles (trust gates how strict proof checks are).
revoke insert, update on profiles from authenticated;
grant update (name, bio, project, stage, field, tz, wake_min, sleep_min, cutoff_min, ping_cap, ping_interval_min, is_public, onboarded) on profiles to authenticated;

-- Proofs: clients read their own; ONLY the submit-proof edge function (service role) writes them.
drop policy "own rows" on proofs;
create policy "read own proofs" on proofs for select using (user_id = auth.uid());
drop index proofs_link_unique;
create unique index proofs_link_unique on proofs(content) where kind = 'link' and status = 'accepted'; -- rejected duplicates must be storable
alter table proofs add column appeal_text text, add column appeal_status text not null default 'none' check (appeal_status in ('none', 'pending', 'upheld', 'overturned'));
create index proofs_user_day on proofs(user_id, day);

create index notification_log_user_sent on notification_log(user_id, sent_at);

create table device_tokens(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade,
  platform text not null check (platform in ('android', 'web')), token text not null, subscription jsonb, updated_at timestamptz default now(), unique (user_id, token));
alter table device_tokens enable row level security;
create policy "own rows" on device_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values ('proofs', 'proofs', false, 5242880, array['image/jpeg']) on conflict (id) do nothing;
create policy "upload own proof images" on storage.objects for insert to authenticated with check (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own proof images" on storage.objects for select to authenticated using (bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text);
