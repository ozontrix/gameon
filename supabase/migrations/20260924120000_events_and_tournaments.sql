-- Events and tournaments (2026-09-24)
--
-- Two kinds, two tables, not one table with a kind column: a tournament runs
-- on a specific court type and takes team registrations against a team cap; an
-- event (occasion) belongs to a venue and sells tickets by the head. They
-- diverge enough in what they own — court type vs none, team fields vs ticket
-- count — that a shared table would carry half its columns null for every row.
--
--   1. tournaments / tournament_images / tournament_sections / tournament_registrations
--   2. events / event_images / event_sections / event_orders
--   3. Capacity is enforced in the database, not just in application code: a
--      BEFORE INSERT trigger locks the parent row (tournament or event) before
--      counting active registrations/tickets, which is what makes the last
--      team slot or the last ticket safe under two people racing for it —
--      the same problem bookings solves with its overlap exclusion
--      constraint, solved here for a capacity count instead of a time range.
--   4. A registration/order starts PENDING with an `expires_at` hold, exactly
--      like a booking, so an abandoned checkout doesn't sit on a team slot or
--      a ticket forever.
--   5. tournaments.court_type_id is descriptive, not a real reservation: it
--      does not block that court type's normal hourly bookings. The composite
--      FK to court_types(id, venue_id) only guarantees the court type actually
--      belongs to the tournament's own venue.
--
-- RLS on, no policies: only the API (service role) reads and writes these,
-- same as every other table in this schema.

-- 1. Tournaments ------------------------------------------------------------------

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  -- Descriptive only (see header). restrict: a court type with a live
  -- tournament on it can't be deleted out from under it.
  court_type_id uuid not null references public.court_types (id) on delete restrict,
  title text not null check (char_length(title) between 2 and 120),
  -- Admin's own words for what's being played, e.g. "Men's Doubles" — not a
  -- lookup table, since the site doesn't need to query or filter on it yet.
  match_type text not null check (char_length(match_type) between 2 and 80),
  description text check (char_length(description) <= 2000),
  format text check (char_length(format) <= 160),
  team_size_label text check (char_length(team_size_label) <= 80),
  team_capacity integer not null check (team_capacity between 2 and 512),
  entry_fee numeric(10, 2) not null check (entry_fee >= 0 and entry_fee <= 100000),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  -- The one daily window it plays in — there is no per-session picker.
  daily_start_time time not null,
  daily_end_time time not null check (daily_end_time > daily_start_time),
  registration_closes_at timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'registration_closed', 'completed', 'cancelled')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_court_type_venue_fk
    foreign key (court_type_id, venue_id) references public.court_types (id, venue_id)
    on update cascade
);

comment on table public.tournaments is
  'A team competition run on one court type. Entering takes one of team_capacity slots at entry_fee per team — no session picker.';
comment on column public.tournaments.court_type_id is
  'Which court type this runs on, e.g. Badminton AC. Descriptive: does not block that court type''s normal hourly bookings.';
comment on column public.tournaments.entry_fee is 'Fixed per team by the admin. Snapshotted into tournament_registrations.amount_paid.';

create index if not exists tournaments_venue_idx on public.tournaments (venue_id);
create index if not exists tournaments_court_type_idx on public.tournaments (court_type_id);
create index if not exists tournaments_status_idx on public.tournaments (status) where status in ('published', 'registration_closed');

alter table public.tournaments enable row level security;

drop trigger if exists tournaments_touch_updated_at on public.tournaments;
create trigger tournaments_touch_updated_at
  before update on public.tournaments
  for each row execute function public.touch_updated_at();

create table if not exists public.tournament_images (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  url text not null check (char_length(url) <= 1000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.tournament_images is 'The tournament detail screen''s gallery, in sort_order. First image is the listing card''s cover.';

create index if not exists tournament_images_tournament_idx on public.tournament_images (tournament_id, sort_order);

alter table public.tournament_images enable row level security;

create table if not exists public.tournament_sections (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) <= 4000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.tournament_sections is 'Free-form blocks (prizes, rules, what you get) an admin writes without a release.';

create index if not exists tournament_sections_tournament_idx on public.tournament_sections (tournament_id, sort_order);

alter table public.tournament_sections enable row level security;

-- 2. Tournament registrations -------------------------------------------------------

create table if not exists public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  team_name text not null check (char_length(team_name) between 2 and 120),
  captain_name text not null check (char_length(captain_name) between 2 and 120),
  contact_phone text not null check (char_length(contact_phone) between 6 and 20),
  contact_email text check (char_length(contact_email) <= 200),
  notes text check (char_length(notes) <= 600),
  -- Snapshot of tournaments.entry_fee at registration time, so a later price
  -- change never rewrites what a team already agreed to pay.
  amount_paid numeric(10, 2) not null check (amount_paid >= 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'CANCELLED')),
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID', 'PAID')),
  razorpay_order_id text,
  razorpay_payment_id text,
  -- Mirrors bookings' hold pattern: a PENDING registration reserves a team
  -- slot only until this lapses.
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tournament_registrations is
  'One team''s entry. PENDING holds a team slot until expires_at; CONFIRMED is paid and counted against team_capacity.';

create index if not exists tournament_registrations_tournament_idx on public.tournament_registrations (tournament_id, status);
create index if not exists tournament_registrations_user_idx on public.tournament_registrations (user_id);

-- One live entry per player per tournament — stops an accidental double
-- registration (and double charge) for the same team.
create unique index if not exists tournament_registrations_one_active_per_user
  on public.tournament_registrations (tournament_id, user_id)
  where (status in ('PENDING', 'CONFIRMED'));

alter table public.tournament_registrations enable row level security;

drop trigger if exists tournament_registrations_touch_updated_at on public.tournament_registrations;
create trigger tournament_registrations_touch_updated_at
  before update on public.tournament_registrations
  for each row execute function public.touch_updated_at();

-- The capacity guard: lock the parent tournament row first, so two
-- registrations racing for the last team slot are serialized rather than
-- both reading "1 slot left" and both succeeding.
create or replace function public.enforce_tournament_capacity()
returns trigger
language plpgsql
as $$
declare
  cap integer;
  taken integer;
begin
  if new.status not in ('PENDING', 'CONFIRMED') then
    return new;
  end if;

  select team_capacity into cap from public.tournaments where id = new.tournament_id for update;
  if cap is null then
    raise exception 'Unknown tournament %', new.tournament_id;
  end if;

  select count(*) into taken
  from public.tournament_registrations
  where tournament_id = new.tournament_id
    and status in ('PENDING', 'CONFIRMED')
    and id is distinct from new.id;

  if taken >= cap then
    raise exception 'This tournament is full.' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists tournament_registrations_capacity on public.tournament_registrations;
create trigger tournament_registrations_capacity
  before insert or update of status on public.tournament_registrations
  for each row execute function public.enforce_tournament_capacity();

-- 3. Events (occasions) -------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  -- Nullable: an occasion isn't always about one sport (a community run isn't
  -- "football" just because it happens on a football pitch).
  sport_id uuid references public.sports (id) on delete set null,
  title text not null check (char_length(title) between 2 and 120),
  category text not null check (char_length(category) between 2 and 80),
  description text check (char_length(description) <= 2000),
  format text check (char_length(format) <= 160),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  daily_start_time time not null,
  daily_end_time time not null check (daily_end_time > daily_start_time),
  registration_closes_at timestamptz not null,
  -- Null = free to attend.
  entry_fee numeric(10, 2) check (entry_fee is null or (entry_fee >= 0 and entry_fee <= 100000)),
  fee_unit text not null default 'per person' check (char_length(fee_unit) <= 40),
  ticket_capacity integer not null check (ticket_capacity between 1 and 100000),
  max_tickets_per_order integer not null default 10 check (max_tickets_per_order between 1 and 50),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'registration_closed', 'completed', 'cancelled')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.events is
  'An occasion at a venue. Sells ticket_capacity tickets at entry_fee per ticket — no team, no court reservation.';

create index if not exists events_venue_idx on public.events (venue_id);
create index if not exists events_status_idx on public.events (status) where status in ('published', 'registration_closed');

alter table public.events enable row level security;

drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

create table if not exists public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  url text not null check (char_length(url) <= 1000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.event_images is 'The event detail screen''s gallery, in sort_order. First image is the listing card''s cover.';

create index if not exists event_images_event_idx on public.event_images (event_id, sort_order);

alter table public.event_images enable row level security;

create table if not exists public.event_sections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) <= 4000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.event_sections is 'Free-form blocks ("What''s on", "Good to know") an admin writes without a release.';

create index if not exists event_sections_event_idx on public.event_sections (event_id, sort_order);

alter table public.event_sections enable row level security;

-- 4. Event ticket orders -------------------------------------------------------------

create table if not exists public.event_orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  tickets integer not null check (tickets between 1 and 50),
  attendee_name text not null check (char_length(attendee_name) between 2 and 120),
  contact_phone text not null check (char_length(contact_phone) between 6 and 20),
  contact_email text check (char_length(contact_email) <= 200),
  notes text check (char_length(notes) <= 600),
  -- Snapshot of entry_fee * tickets at order time.
  amount_paid numeric(10, 2) not null check (amount_paid >= 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'CANCELLED')),
  payment_status text not null default 'UNPAID' check (payment_status in ('UNPAID', 'PAID')),
  razorpay_order_id text,
  razorpay_payment_id text,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.event_orders is
  'A ticket order for an event. PENDING holds `tickets` places until expires_at; CONFIRMED is paid and counted against ticket_capacity.';

create index if not exists event_orders_event_idx on public.event_orders (event_id, status);
create index if not exists event_orders_user_idx on public.event_orders (user_id);

alter table public.event_orders enable row level security;

drop trigger if exists event_orders_touch_updated_at on public.event_orders;
create trigger event_orders_touch_updated_at
  before update on public.event_orders
  for each row execute function public.touch_updated_at();

-- Same lock-then-count guard as tournaments, summing tickets rather than rows.
create or replace function public.enforce_event_capacity()
returns trigger
language plpgsql
as $$
declare
  cap integer;
  per_order integer;
  taken integer;
begin
  if new.status not in ('PENDING', 'CONFIRMED') then
    return new;
  end if;

  select ticket_capacity, max_tickets_per_order into cap, per_order
  from public.events where id = new.event_id for update;
  if cap is null then
    raise exception 'Unknown event %', new.event_id;
  end if;

  if new.tickets > per_order then
    raise exception 'This event allows up to % tickets per order.', per_order using errcode = 'P0001';
  end if;

  select coalesce(sum(tickets), 0) into taken
  from public.event_orders
  where event_id = new.event_id
    and status in ('PENDING', 'CONFIRMED')
    and id is distinct from new.id;

  if taken + new.tickets > cap then
    raise exception 'Only % ticket(s) left for this event.', greatest(cap - taken, 0) using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists event_orders_capacity on public.event_orders;
create trigger event_orders_capacity
  before insert or update of status, tickets on public.event_orders
  for each row execute function public.enforce_event_capacity();

-- 5. Make the Data API see the new tables and relationships right away ---------------

notify pgrst, 'reload schema';
