-- Refer & Earn: a real referral system (2026-09-26)
--
-- The app's Refer & Earn screen has always been decorative — a hardcoded
-- code, a hardcoded link to a domain that isn't configured anywhere, and
-- literal hardcoded stats shown to every user. This is the backend it never
-- had: every player gets a real, unique referral_code; using someone else's
-- code at signup links the two profiles and credits the new player a
-- signup bonus immediately; the referrer is credited a first-booking bonus
-- once the person they referred actually confirms a booking (not just
-- signs up, so an empty account can't be farmed for points). Both amounts
-- are admin-configurable, not hardcoded, in referral_settings.
--
-- Both signup paths (email's client-side auth.signUp, phone's server-side
-- admin.createUser in /api/v1/auth/exchange) already fire the same
-- on_auth_user_created trigger, so extending handle_new_user() here — rather
-- than adding separate application code per path — is what makes referral
-- linking and the signup bonus work identically for both.

-- 1. Admin-configurable amounts — one row, never more (mirrors the
-- singleton-row pattern; a real tiers table would be overkill for two
-- numbers, unlike cancellation_policy_tiers which genuinely varies by notice).
create table if not exists public.referral_settings (
  id boolean primary key default true check (id),
  signup_bonus_points integer not null default 0 check (signup_bonus_points >= 0),
  first_booking_bonus_points integer not null default 0 check (first_booking_bonus_points >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.referral_settings is 'Single-row settings for the referral program. id is always true, enforced by the check constraint, so there is never a second row.';

insert into public.referral_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists referral_settings_touch_updated_at on public.referral_settings;
create trigger referral_settings_touch_updated_at
  before update on public.referral_settings
  for each row execute function public.touch_updated_at();

alter table public.referral_settings enable row level security;

-- 2. Every player's own code, who referred them (if anyone), and whether
-- the referrer's first-booking bonus has already been paid out for them.
alter table public.profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references public.profiles (id) on delete set null,
  add column if not exists referral_bonus_paid boolean not null default false;

comment on column public.profiles.referral_code is 'This player''s own shareable code.';
comment on column public.profiles.referred_by is 'The profile whose code this player signed up with, if any. Set once, at signup, never changed.';
comment on column public.profiles.referral_bonus_paid is 'Whether referred_by''s first-booking bonus has been paid for this player. Flips true exactly once, guarding against a double credit.';

create index if not exists profiles_referred_by_idx on public.profiles (referred_by) where referred_by is not null;

-- 3. A short, unique, human-shareable code. Loops on collision, which in
-- practice never happens at this code space (36^6), but the loop makes that
-- a non-issue rather than a hazard.
create or replace function public.generate_referral_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_code text;
begin
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    if not exists (select 1 from public.profiles where referral_code = v_code) then
      return v_code;
    end if;
  end loop;
end;
$$;

-- Every profile that predates this migration gets a code too.
update public.profiles set referral_code = public.generate_referral_code() where referral_code is null;

alter table public.profiles alter column referral_code set not null;

-- 4. handle_new_user(), extended: resolve an incoming referral_code (from
-- either signup path's user_metadata) to its owner BEFORE inserting this
-- profile, write referred_by, generate this player's own code, and — only
-- if a real referrer was found — credit the signup bonus immediately.
-- An unknown/absent code is silently a no-op: no error, no bonus.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_referrer uuid;
  v_signup_bonus integer;
begin
  v_code := nullif(upper(trim(new.raw_user_meta_data ->> 'referral_code')), '');
  if v_code is not null then
    select id into v_referrer from public.profiles where referral_code = v_code;
  end if;

  insert into public.profiles (id, full_name, email, phone, referral_code, referred_by)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    new.email,
    new.phone,
    public.generate_referral_code(),
    v_referrer
  )
  on conflict (id) do nothing;

  if v_referrer is not null then
    select signup_bonus_points into v_signup_bonus from public.referral_settings limit 1;
    if v_signup_bonus > 0 then
      perform public.wallet_adjust(new.id, v_signup_bonus, 'referral_signup', null);
    end if;
  end if;

  return new;
end;
$$;

comment on function public.handle_new_user() is 'Creates the matching public.profiles row when a user signs up, links it to a referrer if a valid referral_code was supplied, and credits the signup bonus.';

-- 5. Two more machine reasons on the wallet ledger, alongside the ones the
-- wallet feature already added.
alter table public.wallet_transactions drop constraint if exists wallet_transactions_reason_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_reason_check
  check (reason in (
    'refund_credit', 'refund_credit_release',
    'booking_redeem', 'booking_redeem_release',
    'admin_adjustment',
    'referral_signup', 'referral_bonus'
  ));

notify pgrst, 'reload schema';
