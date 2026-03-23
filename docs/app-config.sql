-- App config table for Supabase public settings
-- Run this in Supabase SQL editor (project database).

create table if not exists public.app_config (
  id text primary key,
  supabase_url text,
  supabase_anon_key text,
  supabase_storage_bucket text,
  desktop_price_inr integer not null default 799,
  desktop_plans jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_config
  add column if not exists desktop_price_inr integer not null default 799;

alter table public.app_config
  add column if not exists desktop_plans jsonb;

-- Optional seed row
insert into public.app_config (id, supabase_url, supabase_anon_key, supabase_storage_bucket, desktop_price_inr, desktop_plans)
values ('default', '', '', '', 799, null)
on conflict (id) do nothing;





