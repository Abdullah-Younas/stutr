-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. (After schema.sql.)
-- One row per paying person. Only the webhook (service role) writes it; people can only READ their own row.
create table if not exists public.entitlements (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  plan                  text not null check (plan in ('pro', 'student', 'founder')),
  status                text not null,           -- active, trialing, canceled, revoked, refunded, past_due ...
  billing_interval      text,                    -- month, year, once
  polar_customer_id     text,
  polar_subscription_id text,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  source_ts             timestamptz not null default now(), -- time of the Polar event, so a late old event never overwrites a newer one
  updated_at            timestamptz not null default now()
);

alter table public.entitlements enable row level security;

drop policy if exists "read own entitlement" on public.entitlements;
create policy "read own entitlement" on public.entitlements
  for select using (auth.uid() = user_id);
-- No insert/update/delete policies on purpose: a browser can never grant itself a plan.
