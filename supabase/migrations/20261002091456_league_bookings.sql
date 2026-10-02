-- Website League checkouts use their own immutable pricing/contact snapshot.
create table public.league_bookings (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED')),
  sport text not null check (sport in ('badminton', 'pickleball', 'cricket', 'football')),
  captain_name text not null,
  team_name text not null default '',
  email text not null,
  phone text not null,
  entry jsonb not null check (jsonb_typeof(entry) = 'object'),
  quote jsonb not null check (jsonb_typeof(quote) = 'object'),
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  reference text,
  paid_at timestamptz,
  email_status text not null default 'PENDING' check (email_status in ('PENDING', 'SENDING', 'SENT', 'FAILED')),
  email_attempted_at timestamptz,
  email_sent_at timestamptz,
  email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint league_confirmed_payment check (status <> 'CONFIRMED' or
    (razorpay_order_id is not null and razorpay_payment_id is not null and reference is not null and paid_at is not null)),
  constraint league_email_payment check (email_status = 'PENDING' or status = 'CONFIRMED')
);
create index league_bookings_created_idx on public.league_bookings (created_at desc, id);
create index league_bookings_status_idx on public.league_bookings (status, created_at desc);
alter table public.league_bookings enable row level security;
revoke all on public.league_bookings from public, anon, authenticated;
grant select, insert, update on public.league_bookings to service_role;
create trigger league_bookings_touch_updated_at before update on public.league_bookings
  for each row execute function public.touch_updated_at();
comment on table public.league_bookings is 'Website Multisports League checkout snapshots and captured payments. Server service role only.';
notify pgrst, 'reload schema';