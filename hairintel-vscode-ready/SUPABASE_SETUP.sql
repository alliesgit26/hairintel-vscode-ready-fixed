-- HairIntel AI Supabase setup
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  first_name text,
  last_name text,
  plan text default 'free',
  subscription_status text default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null unique,
  plan text not null default 'free',
  status text not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_end timestamptz,
  latest_event_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_subscriptions_email on public.subscriptions(customer_email);
create index if not exists idx_subscriptions_customer on public.subscriptions(stripe_customer_id);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

-- Public visitors receive no table privileges. Vercel functions use the server-only service role.
revoke all on public.profiles from anon;
revoke all on public.subscriptions from anon;
grant select, insert, update on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.profiles to service_role;
grant all on public.subscriptions to service_role;

-- Signed-in stylists may only access rows matching the verified email claim in their JWT.
-- raw_user_meta_data is intentionally not used for authorization.

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')))
  with check (lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription"
  on public.subscriptions for select
  to authenticated
  using (lower(customer_email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));
