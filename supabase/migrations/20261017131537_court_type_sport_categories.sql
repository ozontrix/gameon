-- Court type sport categories (2026-10-17)
--
-- A card used to belong to exactly one sport, derived from court_types.sport_id.
-- That cannot express the real inventory: the box turf is one court that sells
-- football AND cricket, so it has to appear under both chips while keeping one
-- facility and one booking calendar.
--
-- sport_keys is a set of the app's four sport categories. It is deliberately
-- not a second court type or a duplicate facility: every category on a card
-- resolves to the same facility ids, so the existing bookings exclusion
-- constraint (one live booking per facility per overlapping time) already
-- blocks a football booking from being sold again as cricket.
--
-- Existing cards are backfilled from their primary sport's display name, so
-- "Box Football / Cricket" becomes {football, cricket} and every other card
-- keeps the single category it had.

alter table public.court_types
  add column if not exists sport_keys text[] not null default '{}';

comment on column public.court_types.sport_keys is
  'The app sport categories this card appears under. All categories share the same facilities and booking calendar.';

-- Split the primary sport's display name into every category it names. Unlike
-- sportKeyFor() this keeps BOTH football and cricket for a combined turf.
update public.court_types ct
set sport_keys = coalesce(
  (
    select array_agg(category.key order by category.sort_order)
    from (
      values
        ('badminton', 1),
        ('pickleball', 2),
        ('cricket', 3),
        ('football', 4)
    ) as category(key, sort_order)
    where position(category.key in lower(s.name)) > 0
  ),
  '{}'::text[]
)
from public.sports s
where s.id = ct.sport_id
  and cardinality(ct.sport_keys) = 0;

alter table public.court_types
  drop constraint if exists court_types_sport_keys_check;
alter table public.court_types
  add constraint court_types_sport_keys_check
  check (sport_keys <@ array['badminton', 'pickleball', 'cricket', 'football']::text[]);

create index if not exists court_types_sport_keys_idx
  on public.court_types using gin (sport_keys);

notify pgrst, 'reload schema';
