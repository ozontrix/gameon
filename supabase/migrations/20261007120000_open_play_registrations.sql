create table public.open_play_registrations (
  id uuid primary key default gen_random_uuid(),
  event_date date not null default '2026-10-18',
  sport text not null check (sport in ('cricket', 'football', 'badminton', 'pickleball')),
  full_name text not null check (char_length(full_name) between 2 and 80),
  phone text not null check (phone ~ '^[6-9][0-9]{9}$'),
  email text check (email is null or char_length(email) <= 254),
  city text not null default '' check (char_length(city) <= 80),
  contact_consent boolean not null check (contact_consent = true),
  marketing_consent boolean not null default false,
  attribution jsonb not null default '{}'::jsonb check (jsonb_typeof(attribution) = 'object' and octet_length(attribution::text) <= 2000),
  created_at timestamptz not null default now(),
  constraint open_play_registrations_attendee_sport_key unique (event_date, phone, sport)
);
create index open_play_registrations_date_created_idx on public.open_play_registrations (event_date, created_at desc, id);
create index open_play_registrations_date_sport_created_idx on public.open_play_registrations (event_date, sport, created_at desc, id);
alter table public.open_play_registrations enable row level security;
revoke all on public.open_play_registrations from anon, authenticated;
grant select, insert, update, delete on public.open_play_registrations to service_role;
comment on table public.open_play_registrations is 'Free open play registrations, separate from paid bookings. Server-only writes and admin-only reads. No public PII access.';
notify pgrst, 'reload schema';