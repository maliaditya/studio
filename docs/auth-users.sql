-- Auth users table for cloud authentication.
-- Run this in Supabase SQL editor before using the Postgres-backed auth flow.

create table if not exists public.auth_users (
  username text primary key,
  email text,
  is_priviledge boolean not null default false,
  password_hash text not null,
  password_salt text not null,
  password_algo text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  migrated_from_storage_at timestamptz
);

create index if not exists auth_users_email_idx on public.auth_users (lower(email));
create index if not exists auth_users_created_at_idx on public.auth_users (created_at desc);

comment on table public.auth_users is 'Cloud auth records migrated from auth/*.json storage files into Postgres.';

create table if not exists public.user_github_settings (
  username text primary key references public.auth_users(username) on delete cascade,
  github_token text,
  github_owner text,
  github_repo text,
  github_path text,
  github_fetch_missing_only boolean not null default true,
  supabase_url text,
  supabase_anon_key text,
  supabase_pdf_bucket text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  migrated_from_storage_at timestamptz
);

create index if not exists user_github_settings_owner_repo_idx
  on public.user_github_settings (github_owner, github_repo);

comment on table public.user_github_settings is 'Per-user GitHub sync settings linked to auth_users by username.';

create table if not exists public.user_desktop_status (
  username text primary key references public.auth_users(username) on delete cascade,
  payment_completed boolean not null default false,
  purchase_date timestamptz,
  expires_at timestamptz,
  payment_provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  migrated_from_storage_at timestamptz,
  constraint user_desktop_status_payment_provider_check
    check (payment_provider is null or payment_provider in ('razorpay', 'upi', 'paypal'))
);

create index if not exists user_desktop_status_expires_at_idx
  on public.user_desktop_status (expires_at desc);

comment on table public.user_desktop_status is 'Desktop purchase entitlement per user. Used to allow or block desktop-app login after the one-year term expires.';

create table if not exists public.user_support_donations (
  id text primary key,
  username text references public.auth_users(username) on delete set null,
  email text,
  session_id text not null unique,
  plan_id text,
  plan_heading text,
  provider text not null,
  provider_payment_id text,
  provider_order_id text,
  amount_inr integer not null,
  currency text not null default 'INR',
  status text not null default 'started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint user_support_donations_provider_check
    check (provider in ('razorpay', 'upi', 'paypal', 'buymeacoffee')),
  constraint user_support_donations_status_check
    check (status in ('started', 'completed', 'failed')),
  constraint user_support_donations_amount_inr_check
    check (amount_inr >= 0)
);

create index if not exists user_support_donations_username_idx
  on public.user_support_donations (username);

create index if not exists user_support_donations_created_at_idx
  on public.user_support_donations (created_at desc);

create index if not exists user_support_donations_completed_at_idx
  on public.user_support_donations (completed_at desc);

alter table public.user_support_donations
  add column if not exists plan_id text;

alter table public.user_support_donations
  add column if not exists plan_heading text;

comment on table public.user_support_donations is 'Verified and pending support donations for Dock, linked to auth_users when the donor is signed in.';




