-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  code       text not null default '' check (char_length(code) <= 200000),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.user_settings (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  settings   jsonb not null default '{}'::jsonb,
  draft      text check (char_length(draft) <= 200000),
  updated_at timestamptz not null default now()
);

-- Row level security: every person can only read and write their own rows.
alter table public.projects      enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
