-- Booking + payment hardening (2026-09-17)
--
-- Run once in Supabase Dashboard → SQL Editor BEFORE deploying the backend that
-- ships with it: the new API code reads and writes the columns added here.
--
-- What it does:
--   1. bookings gains the Razorpay references and the booking-form details.
--   2. public.profiles becomes the one user table. Bookings point at it, so
--      email accounts (which never had a public.users row) can book.
--   3. ADMIN / STAFF roles move to auth.users.raw_app_meta_data, which only the
--      service role can change. public.users is no longer read by the API and
--      can be dropped once nothing else depends on it.
--   4. A service-role-only lookup of an auth user by phone number, replacing the
--      exchange route's listUsers() scan (which only ever saw the first 50 users).
--
-- No explicit BEGIN/COMMIT: `supabase db push` runs each migration file as one
-- transaction, and the SQL Editor runs a multi-statement script as one too, so
-- either way the whole file applies or nothing does.

-- 1. Bookings -----------------------------------------------------------------

alter table public.bookings
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists players smallint,
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists notes text;

create unique index if not exists bookings_razorpay_order_id_key
  on public.bookings (razorpay_order_id);

-- 2. One user table: profiles ---------------------------------------------------

-- Every auth user gets a profile row (handle_new_user covers sign-ups from now on).
insert into public.profiles (id, email, phone)
select
  u.id,
  u.email,
  case when coalesce(u.phone, '') = '' then null else '+' || ltrim(u.phone, '+') end
from auth.users u
on conflict (id) do nothing;

-- Phone numbers Supabase Auth already knows.
update public.profiles p
set phone = '+' || ltrim(u.phone, '+')
from auth.users u
where u.id = p.id
  and p.phone is null
  and coalesce(u.phone, '') <> '';

-- handle_new_user copies auth.users.phone as stored, without the '+'. The API
-- writes E.164, so store every number that way.
update public.profiles
set phone = '+' || phone
where phone ~ '^[0-9]+$';

-- Whatever only public.users knew. 'User' was the exchange route's placeholder.
update public.profiles p
set
  phone = coalesce(p.phone, u.phone),
  full_name = case
    -- profiles_full_name_len allows at most 80 characters
    when p.full_name = '' and u.name <> 'User' then left(u.name, 80)
    else p.full_name
  end
from public.users u
where u.id = p.id;

-- Bookings now belong to a profile. NOT VALID: enforced for every new or changed
-- row, without failing on legacy rows whose user never had an auth account.
alter table public.bookings drop constraint if exists bookings_user_id_fkey;
alter table public.bookings
  add constraint bookings_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null
  not valid;

-- 3. Roles --------------------------------------------------------------------

update auth.users a
set raw_app_meta_data = coalesce(a.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', u.role::text)
from public.users u
where u.id = a.id
  and u.role <> 'USER';

-- 4. Phone lookup ---------------------------------------------------------------

create or replace function public.auth_user_id_by_phone(p_phone text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where u.phone in (ltrim(p_phone, '+'), '+' || ltrim(p_phone, '+'))
  order by u.created_at
  limit 1;
$$;

revoke all on function public.auth_user_id_by_phone(text) from public, anon, authenticated;
grant execute on function public.auth_user_id_by_phone(text) to service_role;

-- Let PostgREST see the new columns and function straight away.
notify pgrst, 'reload schema';
