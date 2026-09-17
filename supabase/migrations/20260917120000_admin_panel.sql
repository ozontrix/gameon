-- Admin panel (2026-09-17)
--
--   1. Row level security on every table the mobile app never reads directly.
--      Until now the publishable key shipped inside the app could read (and
--      write) bookings, users, venues and courts through the Data API. With RLS
--      on and no policies, only the service role — the Next.js API and admin
--      panel — can touch them. public.profiles keeps its own-row policies.
--   2. Booking lifecycle columns the admin panel records: where a booking came
--      from, how it was paid, who created or cancelled it, and refunds.
--   3. admin_audit_log: every change made from the admin panel.
--   4. Indexes for the admin lists.
--   5. Service-role-only helpers to find a user by email and list team members.

-- 1. Lock down tables -----------------------------------------------------------

alter table public.bookings enable row level security;
alter table public.users enable row level security;
alter table public.venues enable row level security;
alter table public.facilities enable row level security;
alter table public.sports enable row level security;
alter table public.operating_hours enable row level security;
alter table public.holidays_and_closures enable row level security;

-- 2. Booking lifecycle ----------------------------------------------------------

alter table public.bookings
  add column if not exists source text not null default 'APP',
  add column if not exists payment_method text,
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references auth.users (id) on delete set null,
  add column if not exists cancel_reason text,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_reference text;

alter table public.bookings drop constraint if exists bookings_source_check;
alter table public.bookings
  add constraint bookings_source_check check (source in ('APP', 'ADMIN'));

alter table public.bookings drop constraint if exists bookings_payment_method_check;
alter table public.bookings
  add constraint bookings_payment_method_check
  check (payment_method is null or payment_method in ('RAZORPAY', 'CASH', 'UPI', 'CARD', 'COMPLIMENTARY'));

update public.bookings
set payment_method = 'RAZORPAY'
where payment_method is null
  and razorpay_payment_id is not null;

-- 3. Audit log ------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_log is 'Changes made from the GameOn admin panel. Service role only.';

alter table public.admin_audit_log enable row level security;

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_entity_idx on public.admin_audit_log (entity_type, entity_id);

-- 4. Indexes --------------------------------------------------------------------

create index if not exists bookings_booking_date_idx on public.bookings (booking_date);
create index if not exists bookings_facility_date_idx on public.bookings (facility_id, booking_date);
create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_status_payment_idx on public.bookings (status, payment_status);

-- 5. Helpers --------------------------------------------------------------------

create or replace function public.auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

create or replace function public.admin_team_members()
returns table (
  id uuid,
  email text,
  phone text,
  full_name text,
  role text,
  last_sign_in_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    u.id,
    u.email::text,
    u.phone::text,
    p.full_name,
    u.raw_app_meta_data ->> 'role',
    u.last_sign_in_at,
    u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.raw_app_meta_data ->> 'role' in ('ADMIN', 'STAFF')
  order by u.created_at;
$$;

revoke all on function public.auth_user_id_by_email(text) from public, anon, authenticated;
revoke all on function public.admin_team_members() from public, anon, authenticated;
grant execute on function public.auth_user_id_by_email(text) to service_role;
grant execute on function public.admin_team_members() to service_role;

notify pgrst, 'reload schema';
