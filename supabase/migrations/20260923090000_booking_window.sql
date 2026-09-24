-- How far ahead a venue takes bookings (2026-09-23)
--
-- The app offered a fortnight of dates because its date strip hardcoded 14,
-- and the API enforced nothing at all: /user/slots and POST /user/bookings
-- only checked the date's format, so a direct call could book a year out.
--
-- The window becomes a venue setting, edited beside its opening hours, and
-- the services enforce it. Front-desk bookings are deliberately exempt: staff
-- taking a booking further ahead is a decision, not an accident.

alter table public.venues
  add column if not exists booking_window_days integer not null default 14
  constraint venues_booking_window_days_check check (booking_window_days between 1 and 365);

comment on column public.venues.booking_window_days is
  'How many days ahead of today the app may book, counting today as day 1. Front-desk bookings ignore it.';

notify pgrst, 'reload schema';
