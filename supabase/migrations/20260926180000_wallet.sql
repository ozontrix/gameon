-- GameOn Wallet: real points balance, checkout redemption, policy refunds (2026-09-26)
--
-- The written brief has always said refunds are credited as "GameOn Points",
-- redeemable at checkout — the app already has a WalletBlock component and
-- checkout-draft math built for exactly this, but it's all wired to a
-- hardcoded mock balance with no backend behind it. This is that backend.
--
-- wallet_transactions is the ledger of record; wallets.balance is a cached
-- read of it, kept in sync by the one function (wallet_adjust) that is ever
-- allowed to change either. A booking's wallet portion is only ever moved at
-- confirm time (BookingService.confirmPaidOrder / confirmWithWallet) — never
-- at hold-creation — so a lapsed 10-minute hold needs no wallet cleanup at
-- all: nothing was ever reserved.

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.wallets is 'Cached GameOn Points balance per player. wallet_transactions is the source of truth; this is kept in sync by wallet_adjust().';

drop trigger if exists wallets_touch_updated_at on public.wallets;
create trigger wallets_touch_updated_at
  before update on public.wallets
  for each row execute function public.touch_updated_at();

alter table public.wallets enable row level security;

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Positive = credit (a policy refund), negative = debit (redeemed at checkout).
  points integer not null check (points <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (reason in ('refund_credit', 'refund_credit_release', 'booking_redeem', 'booking_redeem_release')),
  booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.wallet_transactions is 'Append-only ledger of every GameOn Points credit/debit. balance_after is the running balance right after this row, for an auditable history without recomputing a sum.';

create index if not exists wallet_transactions_user_idx on public.wallet_transactions (user_id, created_at desc);

alter table public.wallet_transactions enable row level security;

-- The only way either table above is ever written. Serializes concurrent
-- adjustments for one user with an advisory lock (held for the transaction),
-- so two redemptions — or a redemption racing a refund credit — can never
-- both read the same balance and overdraw it; the balance_after check
-- constraint is the backstop if that ever changes.
create or replace function public.wallet_adjust(
  p_user_id uuid,
  p_points integer,
  p_reason text,
  p_booking_id uuid default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  insert into public.wallets (user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  -- wallets_balance_check (balance >= 0) is the overdraft guard: an
  -- over-debit fails this statement with a check_violation (23514) and the
  -- whole call rolls back, so there's nothing left to branch on afterward.
  update public.wallets
  set balance = balance + p_points
  where user_id = p_user_id
  returning balance into v_balance;

  insert into public.wallet_transactions (user_id, points, balance_after, reason, booking_id)
  values (p_user_id, p_points, v_balance, p_reason, p_booking_id);

  return v_balance;
end;
$$;

comment on function public.wallet_adjust is 'The only writer of wallets/wallet_transactions. An over-debit trips wallets_balance_check (23514) and the whole call rolls back.';

-- The price split decided at hold-creation time (createBooking), so the
-- Razorpay order — if one turns out to be needed — is created for the right
-- remainder and never changes mid-checkout. The actual debit happens later,
-- at confirm time, not here.
alter table public.bookings
  add column if not exists wallet_points_used integer not null default 0 check (wallet_points_used >= 0);

comment on column public.bookings.wallet_points_used is 'Points earmarked for this booking at hold-creation time. Debited from the wallet only when the booking is actually confirmed, never at the hold.';

notify pgrst, 'reload schema';
