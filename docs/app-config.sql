-- App config table for Supabase public settings
-- Run this in Supabase SQL editor (project database).

create table if not exists public.app_config (
  id text primary key,
  supabase_url text,
  supabase_anon_key text,
  supabase_storage_bucket text,
  updated_at timestamptz not null default now()
);

-- Optional seed row
insert into public.app_config (id, supabase_url, supabase_anon_key, supabase_storage_bucket)
values ('default', '', '', '')
on conflict (id) do nothing;
