-- Home screen content and in-app notifications (2026-09-17)
--
--   1. home_banners: hero slides and promo cards shown on the app's Home screen,
--      managed from the admin panel. Seeded with the slides the app shipped with.
--   2. sports.image_url: photo for the sport's card on Home ("Trending now").
--   3. notifications + notification_reads: per-user messages (booking confirmed,
--      cancelled, refunded, reminders, closures) and broadcasts to every user
--      (user_id is null), with per-user read state.
--   4. Service-role-only functions to list, count and mark notifications read.
--   5. Public "media" storage bucket for images uploaded from the admin panel.
--
-- Every new table has RLS on and no policies: only the API (service role) reads
-- and writes them.

-- 1. Home banners ---------------------------------------------------------------

create table if not exists public.home_banners (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('HERO', 'PROMO')),
  title text not null check (char_length(title) between 1 and 60),
  title_accent text check (char_length(title_accent) <= 60),
  subtitle text check (char_length(subtitle) <= 160),
  badge text check (char_length(badge) <= 20),
  image_url text check (char_length(image_url) <= 1000),
  link text check (link is null or (link like '/%' and char_length(link) <= 300)),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_banners_window check (starts_at is null or ends_at is null or ends_at > starts_at)
);

comment on table public.home_banners is 'Hero slides and promo cards on the app Home screen. Managed from /admin/banners.';
comment on column public.home_banners.link is 'In-app route opened on tap, e.g. /sports?sport=badminton.';

create index if not exists home_banners_placement_idx on public.home_banners (placement, is_active, sort_order);

alter table public.home_banners enable row level security;

drop trigger if exists home_banners_touch_updated_at on public.home_banners;
create trigger home_banners_touch_updated_at
  before update on public.home_banners
  for each row execute function public.touch_updated_at();

-- The four slides the app had hardcoded, so Home looks the same until an admin edits them.
insert into public.home_banners (placement, title, title_accent, subtitle, image_url, link, sort_order)
select v.placement, v.title, v.title_accent, v.subtitle, v.image_url, v.link, v.sort_order
from (values
  ('HERO', 'Play More.', 'Book Easy.', 'Book your favorite playground anytime, anywhere.',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80&auto=format&fit=crop', '/sports', 10),
  ('HERO', 'Indoor Courts.', 'All Weather.', 'Air-conditioned badminton and pickleball, open till late.',
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80&auto=format&fit=crop', '/sports?sport=badminton', 20),
  ('HERO', 'Turf Nights.', 'Floodlit.', 'Cricket and football under the lights, seven days a week.',
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&q=80&auto=format&fit=crop', '/sports?sport=cricket', 30),
  ('HERO', 'Join the', 'Tournaments.', 'Leagues, knockouts and prizes across all four sports.',
    'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=800&q=80&auto=format&fit=crop', '/events', 40)
) as v (placement, title, title_accent, subtitle, image_url, link, sort_order)
where not exists (select 1 from public.home_banners);

-- 2. Sport photos -----------------------------------------------------------------

alter table public.sports add column if not exists image_url text;

-- 3. Notifications ----------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  -- null: a broadcast every app user sees
  user_id uuid references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('booking', 'reminder', 'tournament', 'wallet', 'facility', 'offer', 'general')),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 500),
  -- In-app route opened on tap, e.g. /booking/<id>
  link text check (link is null or (link like '/%' and char_length(link) <= 300)),
  booking_id uuid references public.bookings (id) on delete set null,
  -- Makes system notifications idempotent, e.g. 'booking-confirmed:<booking id>'
  dedupe_key text unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.notifications is 'In-app notifications. user_id null = broadcast to every user.';

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_broadcast_created_idx on public.notifications (created_at desc) where user_id is null;

alter table public.notifications enable row level security;

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.notification_reads enable row level security;

-- 4. Functions ----------------------------------------------------------------------

-- A user sees their own notifications, and broadcasts sent since they joined.
create or replace function public.user_notifications(
  p_user_id uuid,
  p_limit integer default 50,
  p_before timestamptz default null
)
returns table (
  id uuid,
  kind text,
  title text,
  body text,
  link text,
  booking_id uuid,
  is_broadcast boolean,
  is_read boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    n.id, n.kind, n.title, n.body, n.link, n.booking_id,
    n.user_id is null as is_broadcast,
    r.notification_id is not null as is_read,
    n.created_at
  from public.notifications n
  left join public.notification_reads r
    on r.notification_id = n.id and r.user_id = p_user_id
  where (
      n.user_id = p_user_id
      or (n.user_id is null and n.created_at >= (select p.created_at from public.profiles p where p.id = p_user_id))
    )
    and (p_before is null or n.created_at < p_before)
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create or replace function public.user_unread_notification_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.notifications n
  where (
      n.user_id = p_user_id
      or (n.user_id is null and n.created_at >= (select p.created_at from public.profiles p where p.id = p_user_id))
    )
    and not exists (
      select 1 from public.notification_reads r
      where r.notification_id = n.id and r.user_id = p_user_id
    );
$$;

-- Marks the given notifications (or, with null, all of them) read. Returns how many were newly read.
create or replace function public.mark_notifications_read(p_user_id uuid, p_ids uuid[] default null)
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  with visible as (
    select n.id
    from public.notifications n
    where (
        n.user_id = p_user_id
        or (n.user_id is null and n.created_at >= (select p.created_at from public.profiles p where p.id = p_user_id))
      )
      and (p_ids is null or n.id = any (p_ids))
  ),
  inserted as (
    insert into public.notification_reads (notification_id, user_id)
    select v.id, p_user_id from visible v
    on conflict do nothing
    returning 1
  )
  select count(*)::integer from inserted;
$$;

revoke all on function public.user_notifications(uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.user_unread_notification_count(uuid) from public, anon, authenticated;
revoke all on function public.mark_notifications_read(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.user_notifications(uuid, integer, timestamptz) to service_role;
grant execute on function public.user_unread_notification_count(uuid) to service_role;
grant execute on function public.mark_notifications_read(uuid, uuid[]) to service_role;

-- 5. Media bucket ------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

notify pgrst, 'reload schema';
