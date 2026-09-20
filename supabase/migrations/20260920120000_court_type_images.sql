-- Photo galleries for court types (2026-09-20)
--
-- court_types.image_url held one photo, so the app's detail-screen carousel
-- only ever had one frame. A court type's photos become their own ordered
-- rows: the first (lowest sort_order) is the cover on the listing card, all of
-- them form the gallery.
--
--   1. court_type_images, ordered per type.
--   2. Any existing court_types.image_url carries over as that type's cover.
--   3. Types left with no photos get the sport's photo set the app used to
--      hardcode, so the carousel works before anyone uploads real ones.
--   4. court_types.image_url is dropped - the gallery is the one place photos live.
--
-- RLS on, no policies: only the API (service role) reads and writes it.

-- 1. Images ---------------------------------------------------------------------

create table if not exists public.court_type_images (
  id uuid primary key default gen_random_uuid(),
  court_type_id uuid not null references public.court_types (id) on delete cascade,
  url text not null check (char_length(url) between 1 and 1000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.court_type_images is
  'Photos of a court type, in sort_order. The first is the listing cover; all form the detail-screen gallery.';

create index if not exists court_type_images_type_idx on public.court_type_images (court_type_id, sort_order);

alter table public.court_type_images enable row level security;

-- 2. Carry over the single photo ---------------------------------------------------

insert into public.court_type_images (court_type_id, url, sort_order)
select ct.id, ct.image_url, 0
from public.court_types ct
where ct.image_url is not null
  and not exists (select 1 from public.court_type_images i where i.court_type_id = ct.id);

-- 3. Seed the photo sets the app shipped with ------------------------------------

with photo_sets (sport_match, url, sort_order) as (
  values
    ('%badminton%',  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80&auto=format&fit=crop', 0),
    ('%badminton%',  'https://images.unsplash.com/photo-1613918431703-aa50889e3be9?w=800&q=80&auto=format&fit=crop', 1),
    ('%badminton%',  'https://images.unsplash.com/photo-1544919982-b61976f0ba43?w=800&q=80&auto=format&fit=crop', 2),
    ('%pickleball%', 'https://images.unsplash.com/photo-1614294148960-9aa740632a87?w=800&q=80&auto=format&fit=crop', 0),
    ('%pickleball%', 'https://images.unsplash.com/photo-1552667466-07770ae110d0?w=800&q=80&auto=format&fit=crop', 1),
    ('%pickleball%', 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?w=800&q=80&auto=format&fit=crop', 2),
    ('%football%',   'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80&auto=format&fit=crop', 0),
    ('%football%',   'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=800&q=80&auto=format&fit=crop', 1),
    ('%football%',   'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=800&q=80&auto=format&fit=crop', 2),
    ('%cricket%',    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80&auto=format&fit=crop', 0),
    ('%cricket%',    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80&auto=format&fit=crop', 1),
    ('%cricket%',    'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=800&q=80&auto=format&fit=crop', 2)
),
-- "Box Football / Cricket" matches both; the first match wins, as the app did.
chosen as (
  select distinct on (ct.id, p.sort_order) ct.id as court_type_id, p.url, p.sort_order
  from public.court_types ct
  join public.sports s on s.id = ct.sport_id
  join photo_sets p on lower(s.name) like p.sport_match
  where not exists (select 1 from public.court_type_images i where i.court_type_id = ct.id)
  order by ct.id, p.sort_order,
    case when p.sport_match = '%football%' then 0 else 1 end
)
insert into public.court_type_images (court_type_id, url, sort_order)
select court_type_id, url, sort_order from chosen;

-- 4. One home for photos ---------------------------------------------------------

alter table public.court_types drop column if exists image_url;

notify pgrst, 'reload schema';
