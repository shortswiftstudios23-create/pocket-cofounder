create table profiles(id uuid primary key references auth.users on delete cascade, name text, bio text, project text, stage text, field text,
  tz text default 'UTC', wake_min int default 420, sleep_min int default 1380, ping_cap int default 6, ping_interval_min int default 90,
  trust_level int default 0, is_public boolean default true, created_at timestamptz default now());
create table goals(id uuid primary key default gen_random_uuid(), user_id uuid references profiles on delete cascade, goal text, deadline date, weekly_hours int, created_at timestamptz default now());
create table tasks(id uuid primary key default gen_random_uuid(), user_id uuid references profiles on delete cascade, day date not null, title text not null,
  status text not null default 'not_started' check(status in('not_started','in_progress','done','not_today')), reason text, must_do boolean default false, due_at timestamptz, created_at timestamptz default now());
create table proofs(id uuid primary key default gen_random_uuid(), user_id uuid references profiles on delete cascade, task_id uuid references tasks on delete cascade, day date not null,
  kind text check(kind in('link','screenshot','photo','text')), content text, media_path text, phash text,
  status text default 'needs_followup' check(status in('accepted','needs_followup','not_accepted')), status_reason text, hidden boolean default false, created_at timestamptz default now());
create unique index proofs_link_unique on proofs(content) where kind='link';
create index proofs_phash on proofs(phash);
create table memory_entries(id uuid primary key default gen_random_uuid(), user_id uuid references profiles on delete cascade, kind text, body text, updated_at timestamptz default now());
create table ai_messages(id uuid primary key default gen_random_uuid(), user_id uuid references profiles on delete cascade, role text check(role in('user','ai')), body text, created_at timestamptz default now());
create table notification_log(id uuid primary key default gen_random_uuid(), user_id uuid references profiles on delete cascade, stage text, sent_at timestamptz default now());
do $$ declare t text; begin
 foreach t in array array['goals','tasks','proofs','memory_entries','ai_messages','notification_log'] loop
  execute format('alter table %I enable row level security',t);
  execute format('create policy "own rows" on %I for all using (user_id=auth.uid()) with check (user_id=auth.uid())',t);
 end loop; end $$;
alter table profiles enable row level security;
create policy "own profile write" on profiles for all using (id=auth.uid()) with check (id=auth.uid());
create policy "public profiles readable" on profiles for select using (is_public);
-- Phase 2 (follows, reactions, comments, reports, conversations, messages, app_usage) goes in 0002.
