-- Court types: admin-configurable player limit per booking (2026-09-26)
--
-- The app checkout let a player pick from a flat, sport-agnostic list of
-- player counts (2/4/6/8/10/12), and the API only sanity-capped `players` at
-- 50 — nothing tied it to the actual court being booked. A badminton court
-- could be booked "for 50 players" as far as the API was concerned.
--
-- max_players makes that a real, per-court-type limit the admin sets (like
-- price_per_hour and slot options already are), which the checkout now reads
-- instead of a hardcoded list, and which the booking API enforces server-side.

alter table public.court_types
  add column if not exists max_players integer not null default 10
    check (max_players between 1 and 200);

comment on column public.court_types.max_players is
  'Most players allowed to book one slot of this court type, set by the admin. Enforced on booking creation.';

-- Backfill existing types with a per-sport starting point rather than one
-- flat number for every sport; the admin can retune any of these afterward.
update public.court_types ct
set max_players = case s.name
  when 'Badminton' then 4
  when 'Pickleball' then 4
  when 'Cricket Practice Nets' then 10
  when 'Box Football / Cricket' then 14
  else ct.max_players
end
from public.sports s
where s.id = ct.sport_id;

notify pgrst, 'reload schema';
