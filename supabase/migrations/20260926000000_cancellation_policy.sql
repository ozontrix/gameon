-- Cancellation policy: admin-configurable refund timing and percentage (2026-09-26)
--
-- Cancelling a paid booking has existed in the admin panel for a while
-- (admin cancels, then records a manual refund from the Refunds page), but
-- there was never a policy behind it — admin judged the refund amount by
-- eye, and a player had no way to cancel their own booking at all.
--
--   1. cancellation_policy_tiers: "cancel at least N hours before the slot
--      and get X% back", any number of tiers, admin-editable. The tier with
--      the largest min_hours_before that the actual notice still clears is
--      the one that applies; below every tier's threshold, the refund is 0%.
--   2. bookings.refund_percent / refund_due_amount: the entitlement computed
--      at the moment a *player* cancels their own booking, so what shows on
--      the Refunds page is what the policy actually owes them, not the full
--      amount paid. Left null for an admin-initiated cancellation, which
--      stays a human judgement call exactly as before — this policy governs
--      a player's own cancellation, not GameOn's.
--
-- Seeded with the tiers already written into this codebase as policy, not
-- invented here: `src/constants/policies.ts`'s FACILITY_POLICY_DETAILS
-- ("cancel more than 24 hours before... 100% refund", "12 to 24 hours...
-- 50%", "inside 12 hours... not refundable") quotes them from the written
-- brief (OZ-DOC-386); `src/constants/bookings.ts`'s REFUND_SLABS mocked the
-- same numbers for a screen that was never wired to a backend. This
-- migration is that backend; admin can change the numbers at any time.
--
-- RLS on, no policies: only the API (service role) reads and writes it.

create table if not exists public.cancellation_policy_tiers (
  id uuid primary key default gen_random_uuid(),
  applies_to text not null default 'booking' check (applies_to in ('booking', 'tournament', 'event')),
  min_hours_before integer not null check (min_hours_before >= 0),
  refund_percent integer not null check (refund_percent between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cancellation_policy_tiers_unique unique (applies_to, min_hours_before)
);

comment on table public.cancellation_policy_tiers is
  'Cancel at least min_hours_before the slot/start and get refund_percent back. The tier with the largest min_hours_before the actual notice still clears applies; short of every tier, the refund is 0%.';

create index if not exists cancellation_policy_tiers_applies_to_idx
  on public.cancellation_policy_tiers (applies_to, min_hours_before desc);

alter table public.cancellation_policy_tiers enable row level security;

drop trigger if exists cancellation_policy_tiers_touch_updated_at on public.cancellation_policy_tiers;
create trigger cancellation_policy_tiers_touch_updated_at
  before update on public.cancellation_policy_tiers
  for each row execute function public.touch_updated_at();

insert into public.cancellation_policy_tiers (applies_to, min_hours_before, refund_percent) values
  ('booking', 24, 100),
  ('booking', 12, 50),
  ('booking', 0, 0)
on conflict (applies_to, min_hours_before) do nothing;

-- What a player's own cancellation actually entitles them to, snapshotted at
-- cancellation time so a later policy change never rewrites history.
alter table public.bookings
  add column if not exists refund_percent integer check (refund_percent between 0 and 100),
  add column if not exists refund_due_amount numeric(10, 2) check (refund_due_amount >= 0);

comment on column public.bookings.refund_percent is
  'The cancellation policy tier applied when the player cancelled, e.g. 50. Null for an admin-initiated cancellation.';
comment on column public.bookings.refund_due_amount is
  'amount_paid * refund_percent / 100, snapshotted at cancellation. What the Refunds page should actually pay out.';

notify pgrst, 'reload schema';
