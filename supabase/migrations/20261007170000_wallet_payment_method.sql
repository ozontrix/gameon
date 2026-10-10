-- Existing wallet-only checkout writes WALLET, but the original constraint
-- omitted it. Keep all previously supported methods and add WALLET.
alter table public.bookings drop constraint bookings_payment_method_check;
alter table public.bookings add constraint bookings_payment_method_check
  check (payment_method is null or payment_method in ('RAZORPAY', 'WALLET', 'CASH', 'UPI', 'CARD', 'COMPLIMENTARY'));