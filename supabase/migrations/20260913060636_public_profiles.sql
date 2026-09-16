-- GameOn accounts.
--
-- One row per Supabase Auth user, created automatically at sign-up by
-- `handle_new_user`. Every policy below is scoped to the row's own owner:
-- a player can read, create and update their profile and nothing else.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  city text,
  gender text,
  date_of_birth date,
  preferred_sports text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_len check (char_length(full_name) <= 80)
);

comment on table public.profiles is 'GameOn player profile: one row per auth.users row, keyed by the auth user id.';
comment on column public.profiles.preferred_sports is 'Sport keys from the app, e.g. {football,badminton}.';

-- The Data API roles need table privileges; RLS below narrows them to own-row access.
grant select, insert, update on public.profiles to authenticated;

alter table public.profiles enable row level security;

create policy "Players read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "Players create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Players update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Keep updated_at honest without trusting the client.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Sign-up sends the player's name in the user metadata; mirror it into the
-- profile row so the name is queryable like any other column.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    new.email,
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is 'Creates the matching public.profiles row when a user signs up.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger plumbing, not an API: nothing should be able to call these directly.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;;
