-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Adds version history for saved projects.
create table if not exists public.project_versions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  project_name text not null,
  code         text not null,
  saved_at     timestamptz not null default now()
);
create index if not exists project_versions_lookup on public.project_versions (user_id, project_name, saved_at desc);

alter table public.project_versions enable row level security;
drop policy if exists "own versions" on public.project_versions;
create policy "own versions" on public.project_versions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
