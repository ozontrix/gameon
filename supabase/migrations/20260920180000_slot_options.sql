-- Slot options: each card sells its own slot lengths at its own prices (2026-09-20)
--
-- Until now the slot length was a venue-wide setting (operating_hours
-- .slot_duration_minutes) and a slot cost court_types.price_per_hour x its
-- length. Owners want to sell, per card, specific lengths at specific prices -
-- e.g. 60 min for 600, 90 min for 850 - with any length they like (15, 45, 55...).
--
--   1. court_type_slot_options: the lengths a court type offers and the price
--      of each. The player picks one; that option's price is what's charged.
--   2. Every existing type gets one option carrying over what it sold before:
--      its venue's slot length at price_per_hour pro rata.
--   3. court_types.price_per_hour and operating_hours.slot_duration_minutes
--      are dropped: a slot's length and price now live in exactly one place.
--   4. Double-booking protection moves from "same start time" to "overlapping
--      time". With mixed lengths on one court, a 6:00-7:30 and a 7:00-8:00
--      booking start at different times yet collide; the old unique index on
--      (facility_id, booking_date, start_time) would have let both through.
--   5. Moving a court type to another venue now carries its courts with it.
--
-- RLS on, no policies: only the API (service role) reads and writes it.

-- 1. Slot options -----------------------------------------------------------------

create table if not exists public.court_type_slot_options (
  id uuid primary key default gen_random_uuid(),
  court_type_id uuid not null references public.court_types (id) on delete cascade,
  duration_minutes integer not null check (duration_minutes between 5 and 720),
  price numeric(10, 2) not null check (price > 0 and price <= 100000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint court_type_slot_options_length_key unique (court_type_id, duration_minutes)
);

comment on table public.court_type_slot_options is
  'The slot lengths a court type sells and the price of each. Slots start back-to-back from opening time in the chosen length.';
comment on column public.court_type_slot_options.price is 'Charged for one slot of this length. Snapshotted into bookings.amount_paid.';

create index if not exists court_type_slot_options_type_idx on public.court_type_slot_options (court_type_id, duration_minutes);

alter table public.court_type_slot_options enable row level security;

-- 2. Carry over what each type sold before -----------------------------------------

insert into public.court_type_slot_options (court_type_id, duration_minutes, price)
select
  ct.id,
  coalesce(venue_length.minutes, 60),
  round(ct.price_per_hour * coalesce(venue_length.minutes, 60) / 60.0, 2)
from public.court_types ct
left join lateral (
  select max(oh.slot_duration_minutes) as minutes
  from public.operating_hours oh
  where oh.venue_id = ct.venue_id
) venue_length on true
on conflict (court_type_id, duration_minutes) do nothing;

-- 3. One home for length and price -------------------------------------------------

alter table public.court_types drop column if exists price_per_hour;
alter table public.operating_hours drop column if exists slot_duration_minutes;

-- 4. No two live bookings on a court may overlap ---------------------------------

create extension if not exists btree_gist with schema extensions;

alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap exclude using gist (
    facility_id with =,
    tsrange(booking_date + start_time, booking_date + end_time, '[)') with &&
  ) where (status in ('PENDING', 'CONFIRMED'));

-- The exclusion constraint covers everything this caught, and more.
drop index if exists public.no_double_booking_idx;

-- 5. Courts follow their type when it moves venue -------------------------------
--
-- The composite key pins each court to its type's venue. Without ON UPDATE
-- CASCADE, changing a type's venue fails whichever table is updated first.

alter table public.facilities drop constraint if exists facilities_court_type_venue_fk;
alter table public.facilities
  add constraint facilities_court_type_venue_fk
  foreign key (court_type_id, venue_id) references public.court_types (id, venue_id)
  on update cascade;

notify pgrst, 'reload schema';
