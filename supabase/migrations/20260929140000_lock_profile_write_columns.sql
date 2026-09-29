-- Lock the profile columns a player must not be able to write themselves.
--
-- The "Players update their own profile" policy is scoped by ROW
-- (id = auth.uid()) and says nothing about columns, so with the publishable key
-- the mobile app could write these directly on its own row:
--
--   referral_code        the code other people type in — rewriting it breaks
--                        attribution and the uniqueness generate_referral_code()
--                        loops on
--   referred_by          would let a player name their own referrer
--   referral_bonus_paid  would let a player mark the first-booking bonus paid
--
-- A column-level REVOKE does nothing while the role still holds the table-level
-- privilege, so the table grant is dropped first and re-granted per column. The
-- server routes write with the service role, which is unaffected.
--
-- No data and no policy changes; safe to re-run.

revoke update, insert on public.profiles from anon, authenticated;
revoke delete on public.profiles from anon, authenticated;

-- Exactly what a player may change about themselves. `referral_code`,
-- `referred_by` and `referral_bonus_paid` are deliberately absent (the database
-- mints or pays them), as are `email`/`phone` (verified identity, written by
-- /auth/exchange and the confirmation flow) and both timestamps (the
-- touch_updated_at trigger owns updated_at).
grant update (full_name, city, gender, date_of_birth, preferred_sports)
  on public.profiles to authenticated;

-- The app's self-healing insert supplies only these. `handle_new_user` creates
-- the real row and runs as the table owner, so it is unaffected.
grant insert (id, full_name, email) on public.profiles to authenticated;
