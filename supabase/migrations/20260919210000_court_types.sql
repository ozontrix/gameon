-- Court types: the sellable product behind every card in the app (2026-09-19)
--
-- Until now a "card" on the Sports tab had no row of its own. It was a runtime
-- GROUP BY over facility attributes (venue, sport, surface, indoor, AC),
-- recomputed in two services, with its price taken as MIN(facilities
-- .price_per_hour) and its amenities hardcoded in the API layer. That made a
-- per-card price impossible to express and gave the card no stable identity.
--
-- This is the product -> inventory-unit split every booking domain uses (a
-- hotel's room type -> rooms): court_types is the product the app lists and
-- prices; facilities stay as the individual bookable courts.
--
--   1. court_types, with the attributes that DEFINE a type (surface, indoor,
--      AC) and its own price. One row per card.
--   2. amenities + court_type_amenities: what used to be a hardcoded array.
--   3. court_type_rules: the eligibility list, likewise.
--   4. facilities.court_type_id, backfilled from the existing grouping, then
--      the moved columns are dropped. A composite FK keeps a court's venue and
--      its type's venue from ever drifting apart.
--
-- bookings is untouched: amount_paid already snapshots what was charged, and
-- history must never re-price.
--
-- Every new table has RLS on and no policies: only the API (service role)
-- reads and writes them.
--
-- No explicit BEGIN/COMMIT: `supabase db push` runs each migration file as one
-- transaction, and the SQL Editor runs a multi-statement script as one too, so
-- either way the whole file applies or nothing does.

-- 1. Court types ----------------------------------------------------------------

create table if not exists public.court_types (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  sport_id uuid not null references public.sports (id) on delete restrict,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  name text not null check (char_length(name) between 1 and 120),
  description text check (char_length(description) <= 600),
  surface_type text not null check (surface_type in ('synthetic', 'wooden', 'turf', 'acrylic', 'concrete', 'clay')),
  is_indoor boolean not null,
  has_ac boolean not null,
  price_per_hour numeric(10, 2) not null check (price_per_hour > 0 and price_per_hour <= 100000),
  image_url text check (char_length(image_url) <= 1000),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint court_types_venue_slug_key unique (venue_id, slug),
  -- Target for the composite FK on facilities below; also makes (id, venue_id)
  -- a legal reference without weakening the primary key.
  constraint court_types_id_venue_key unique (id, venue_id)
);

comment on table public.court_types is
  'A sellable court category at a venue - one row per card on the app Sports tab. Owns the price; individual courts live in facilities.';
comment on column public.court_types.slug is 'Stable, URL-safe identity within the venue, e.g. wooden-ac.';
comment on column public.court_types.price_per_hour is 'The hourly rate for every court of this type. Bookings snapshot it into bookings.amount_paid.';

create index if not exists court_types_venue_idx on public.court_types (venue_id, sort_order);
create index if not exists court_types_sport_idx on public.court_types (sport_id) where is_active;

alter table public.court_types enable row level security;

drop trigger if exists court_types_touch_updated_at on public.court_types;
create trigger court_types_touch_updated_at
  before update on public.court_types
  for each row execute function public.touch_updated_at();

-- 2. Amenities ------------------------------------------------------------------

create table if not exists public.amenities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  label text not null check (char_length(label) between 1 and 60),
  icon_family text not null check (icon_family in ('ion', 'mci')),
  icon_name text not null check (char_length(icon_name) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.amenities is 'The amenity catalogue. icon_family/icon_name name a glyph in the app icon sets.';

alter table public.amenities enable row level security;

create table if not exists public.court_type_amenities (
  court_type_id uuid not null references public.court_types (id) on delete cascade,
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  primary key (court_type_id, amenity_id)
);

comment on table public.court_type_amenities is 'Which amenities a court type offers.';

alter table public.court_type_amenities enable row level security;

-- 3. Eligibility rules ----------------------------------------------------------

create table if not exists public.court_type_rules (
  id uuid primary key default gen_random_uuid(),
  court_type_id uuid not null references public.court_types (id) on delete cascade,
  rule text not null check (char_length(rule) between 1 and 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.court_type_rules is 'The "what to know before you play" list shown on a court type, in sort_order.';

create index if not exists court_type_rules_type_idx on public.court_type_rules (court_type_id, sort_order);

alter table public.court_type_rules enable row level security;

-- 4. Move courts onto their type -------------------------------------------------

alter table public.facilities
  add column if not exists court_type_id uuid references public.court_types (id) on delete restrict;

-- One type per distinct grouping the services were computing at runtime. The
-- price carries over as-is; every existing group is already uniformly priced.
insert into public.court_types (
  venue_id, sport_id, slug, name, surface_type, is_indoor, has_ac, price_per_hour, image_url, sort_order
)
select
  g.venue_id,
  g.sport_id,
  -- The sport belongs in the slug: two sports at one venue can otherwise share
  -- a surface/setting/climate and collide (outdoor turf cricket vs football).
  trim(both '-' from regexp_replace(lower(s.name), '[^a-z0-9]+', '-', 'g'))
    || '-' || g.surface_type
    || case when g.is_indoor then '-indoor' else '-outdoor' end
    || case when g.has_ac then '-ac' else '-non-ac' end,
  s.name || ' – '
    || case when g.is_indoor then 'Indoor' else 'Outdoor' end
    || ' ' || initcap(g.surface_type)
    || case when g.has_ac then ' (AC)' else '' end,
  g.surface_type,
  g.is_indoor,
  g.has_ac,
  g.price_per_hour,
  s.image_url,
  row_number() over (partition by g.venue_id order by s.name, g.surface_type) - 1
from (
  select
    f.venue_id,
    f.sport_id,
    f.surface_type,
    f.is_indoor,
    f.has_ac,
    max(f.price_per_hour) as price_per_hour
  from public.facilities f
  where f.venue_id is not null and f.sport_id is not null
  group by f.venue_id, f.sport_id, f.surface_type, f.is_indoor, f.has_ac
) g
join public.sports s on s.id = g.sport_id
on conflict (venue_id, slug) do nothing;

update public.facilities f
set court_type_id = ct.id
from public.court_types ct
where f.court_type_id is null
  and ct.venue_id = f.venue_id
  and ct.sport_id = f.sport_id
  and ct.surface_type = f.surface_type
  and ct.is_indoor = f.is_indoor
  and ct.has_ac = f.has_ac;

-- A court with no type would have no price, so fail loudly rather than ship one.
do $$
declare orphans integer;
begin
  select count(*) into orphans from public.facilities where court_type_id is null;
  if orphans > 0 then
    raise exception 'Cannot continue: % facilities could not be matched to a court type', orphans;
  end if;
end $$;

alter table public.facilities alter column court_type_id set not null;

-- The court's venue and its type's venue are now the same column pair, enforced
-- rather than trusted, so no update can leave a court pointing at a type at a
-- different venue.
alter table public.facilities drop constraint if exists facilities_court_type_venue_fk;
alter table public.facilities
  add constraint facilities_court_type_venue_fk
  foreign key (court_type_id, venue_id) references public.court_types (id, venue_id);

create index if not exists facilities_court_type_idx on public.facilities (court_type_id);

-- What the type now owns. sport_id goes too: a court's sport is its type's sport.
alter table public.facilities
  drop column if exists price_per_hour,
  drop column if exists surface_type,
  drop column if exists is_indoor,
  drop column if exists has_ac,
  drop column if exists sport_id;

-- 5. Seed the amenities and rules that were hardcoded in the API ------------------

insert into public.amenities (slug, label, icon_family, icon_name, sort_order) values
  ('ac-hall',          'AC Hall',           'mci', 'snowflake',      0),
  ('synthetic-court',  'Synthetic Court',   'ion', 'layers-outline', 1),
  ('wooden-court',     'Wooden Court',      'mci', 'texture-box',    2),
  ('led-lighting',     'LED Lighting',      'ion', 'bulb-outline',   3),
  ('floodlights',      'Floodlights',       'ion', 'bulb-outline',   4),
  ('natural-turf',     'Natural Turf',      'mci', 'grass',          5),
  ('seating-area',     'Seating Area',      'mci', 'seat-outline',   6),
  ('shower-washroom',  'Shower & Washroom', 'mci', 'shower',         7),
  ('drinking-water',   'Drinking Water',    'mci', 'water',          8)
on conflict (slug) do nothing;

-- Derived from the type's real attributes rather than the API's blanket
-- indoor/outdoor arrays, which claimed a "Synthetic Court" tile on wooden
-- courts and an "AC Hall" on rooms without AC.
insert into public.court_type_amenities (court_type_id, amenity_id)
select ct.id, a.id
from public.court_types ct
join public.amenities a on a.slug = any (
  array['shower-washroom', 'drinking-water']
  || case when ct.is_indoor then array['led-lighting'] else array['floodlights', 'seating-area'] end
  || case when ct.has_ac then array['ac-hall'] else array[]::text[] end
  || case ct.surface_type
       when 'synthetic' then array['synthetic-court']
       when 'wooden' then array['wooden-court']
       when 'turf' then array['natural-turf']
       else array[]::text[]
     end
)
on conflict do nothing;

insert into public.court_type_rules (court_type_id, rule, sort_order)
select ct.id, r.rule, r.sort_order
from public.court_types ct
cross join lateral (
  values
    (case when ct.is_indoor
       then 'Players must bring their own kit and non-marking shoes.'
       else 'Studded footwear is not permitted on synthetic turf.' end, 0),
    (case when ct.is_indoor
       then 'Outside food & drinks are not allowed.'
       else 'Teams must vacate the pitch at the end of the slot.' end, 1)
) as r(rule, sort_order);

-- 6. Make the Data API see the new tables and relationships right away ---------

notify pgrst, 'reload schema';
