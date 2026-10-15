-- Release cleanup ahead of the App Store / Google Play submissions (15 Oct 2026).
--
-- 1. The venue in use carried seed placeholder values written by
--    `scripts/seed-venue.js` ("123 Sports Avenue, City Center"). That string was
--    served to the app by `GET /public/home`, `GET /public/events` and
--    `GET /public/tournaments`, and rendered on every event, tournament and
--    booking detail screen — and it disagreed with the venue location the app's
--    own header shows. The real address is the one published on
--    gameonmultisports.com.
-- 2. The second venue ("GameOn Multi-Sports" @ "Main Location") has no courts,
--    no court types and no opening hours. It is seed scaffolding and is never
--    surfaced; it is deactivated rather than deleted so any future reference
--    resolves.
-- 3. Two broadcast notifications were developer test data ("jhkjhg" /
--    "kjhgkjhg", "Let's play." / "My first notification.") and appeared in every
--    user's in-app notification list — including an App Review reviewer's.
--
-- Deliberately NOT changed here, because each needs an owner decision rather
-- than an engineer's guess:
--   * the 45-minute vs 60-minute Badminton – Indoor Synthetic price;
--   * `referral_settings`, still 0/0, so no referral bonus is promised;
--   * the venue's display name;
--   * publishing an upcoming event or tournament.

update public.venues as v
   set address = 'Sector 70, Gurugram, Haryana 122101'
 where v.address in ('123 Sports Avenue, City Center', 'Main Location');

update public.venues as v
   set is_active = false
 where v.name = 'GameOn Multi-Sports'
   and not exists (select 1 from public.facilities f where f.venue_id = v.id)
   and not exists (select 1 from public.court_types ct where ct.venue_id = v.id)
   and not exists (select 1 from public.operating_hours oh where oh.venue_id = v.id);

delete from public.notifications
 where title = 'jhkjhg'
    or body = 'kjhgkjhg'
    or (title = 'Let''s play.' and body = 'My first notification.');
