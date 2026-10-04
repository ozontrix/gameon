-- Combined carts share one payment and store sport-qualified category snapshots.
alter table public.league_bookings drop constraint league_bookings_sport_check;
alter table public.league_bookings add constraint league_bookings_sport_check
  check (sport in ('badminton', 'pickleball', 'cricket', 'football', 'multisport'));
create index league_bookings_entry_gin_idx on public.league_bookings using gin (entry jsonb_path_ops);
notify pgrst, 'reload schema';