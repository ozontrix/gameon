-- Let the database mint a referral code by default.
--
-- `generate_referral_code()` was only ever called from `handle_new_user`, so a
-- profile row could not be created by anything else: the column is NOT NULL and
-- had no default. Giving it one makes the column self-sufficient — the profile
-- API can heal a missing row without asking a caller to invent a code that
-- might collide, and any future insert path gets a valid code for free.

alter table public.profiles
  alter column referral_code set default public.generate_referral_code();
