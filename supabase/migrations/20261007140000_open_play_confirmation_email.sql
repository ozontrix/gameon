-- Preserve historical entries without inventing contact details. NOT VALID
-- constraints still enforce required details for every new/updated row.
alter table public.open_play_registrations
  add constraint open_play_email_required check (email is not null and char_length(btrim(email)) between 3 and 254) not valid,
  add constraint open_play_city_required check (char_length(btrim(city)) between 2 and 80) not valid,
  add column email_status text not null default 'SKIPPED' check (email_status in ('SKIPPED', 'PENDING', 'SENDING', 'SENT', 'FAILED')),
  add column email_attempted_at timestamptz,
  add column email_sent_at timestamptz,
  add column email_error text;
alter table public.open_play_registrations alter column email_status set default 'PENDING';
notify pgrst, 'reload schema';