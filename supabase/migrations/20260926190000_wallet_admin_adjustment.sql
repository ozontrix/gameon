-- Wallet: let an admin manually credit or debit a player's Points (2026-09-26)
--
-- Goodwill credits and corrections don't fit any of the existing machine
-- reasons (refund_credit/booking_redeem and their releases) — those are all
-- system-computed. This adds one more reason for a human-initiated change,
-- still going through the same wallet_adjust() function as everything else.

alter table public.wallet_transactions drop constraint if exists wallet_transactions_reason_check;
alter table public.wallet_transactions
  add constraint wallet_transactions_reason_check
  check (reason in ('refund_credit', 'refund_credit_release', 'booking_redeem', 'booking_redeem_release', 'admin_adjustment'));

notify pgrst, 'reload schema';
