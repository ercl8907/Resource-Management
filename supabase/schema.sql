-- Supabase schema for custom email/password auth with Argon2 hashes.
-- Run this in Supabase Dashboard > SQL Editor.
-- Passwords are Argon2id hashes (never plaintext), created server-side.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create index if not exists users_email_idx on public.users (email);

-- Keep updated_at current on updates.
create or replace function public.set_users_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_users_updated_at();

-- RLS: this table is only accessed via the server-side service-role
-- client (which bypasses RLS). Enable RLS and deny public access so
-- the anon key cannot read password hashes directly.
alter table public.users enable row level security;

drop policy if exists "deny_all" on public.users;
create policy "deny_all" on public.users
  for all using (false) with check (false);

-- Managers table used by /dashboard/new-manager.
-- Written via the app's server route using the authenticated user id.
create table if not exists public.managers (
  id uuid primary key default gen_random_uuid(),
  manager_name text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists managers_user_id_idx on public.managers (user_id);

alter table public.managers enable row level security;

drop policy if exists "managers_all" on public.managers;
create policy "managers_all" on public.managers
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
