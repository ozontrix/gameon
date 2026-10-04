-- All coupon mutations, inventory and contact identities are server-only.
create table public.league_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,20}$'),
  discount_type text not null check (discount_type in ('PERCENT','FLAT')),
  discount_value integer not null check (discount_value between 1 and 100000),
  min_entry_fee integer not null check (min_entry_fee between 0 and 1000000),
  usage_limit integer not null check (usage_limit between 1 and 1000000),
  per_person_limit integer not null check (per_person_limit between 1 and usage_limit),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (discount_type <> 'PERCENT' or discount_value <= 99)
);
create table public.league_coupon_uses (
  booking_id uuid primary key references public.league_bookings(id),
  coupon_id uuid not null references public.league_coupons(id),
  email_key text not null,
  phone_key text not null,
  state text not null default 'RESERVED' check (state in ('RESERVED','REDEEMED')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);
create index league_coupon_uses_coupon_idx on public.league_coupon_uses(coupon_id, state);
create index league_coupon_uses_email_idx on public.league_coupon_uses(coupon_id, email_key);
create index league_coupon_uses_phone_idx on public.league_coupon_uses(coupon_id, phone_key);
alter table public.league_coupons enable row level security;
alter table public.league_coupon_uses enable row level security;
revoke all on public.league_coupons, public.league_coupon_uses from public, anon, authenticated;
grant select, insert, update on public.league_coupons to service_role;
grant select on public.league_coupon_uses to service_role;

create function public.league_coupon_inventory() returns jsonb
language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object(
    'used', counts.used, 'reserved', counts.reserved,
    'remaining', greatest(0, c.usage_limit - counts.used - counts.reserved)) order by c.created_at desc), '[]'::jsonb)
  from public.league_coupons c cross join lateral (
    select count(*) filter (where u.state = 'REDEEMED') as used,
      count(*) filter (where u.state = 'RESERVED') as reserved
    from public.league_coupon_uses u where u.coupon_id = c.id
  ) counts;
$$;

-- Authoritative discount + reservation + booking creation are one transaction.
-- Orders may remain payable after browser dismissal. Never expire an issued
-- reservation on a timer: a late captured payment must not oversubscribe it.
create function public.league_create_coupon_booking(p_entry jsonb, p_quote jsonb)
returns public.league_bookings language plpgsql security definer set search_path = '' as $$
declare
  c public.league_coupons;
  b public.league_bookings;
  fee integer := (p_quote->>'entryFee')::integer;
  subtotal integer := (p_quote->>'subtotal')::integer;
  discount integer;
  v_email text := lower(trim(p_entry->>'email'));
  v_phone text := right(regexp_replace(p_entry->>'phone', '[^0-9]', '', 'g'), 10);
  total_used integer;
  person_used integer;
  label text;
  q jsonb;
begin
  select * into c from public.league_coupons where code = upper(trim(p_entry->>'coupon')) for update;
  if not found then raise exception 'This coupon does not exist.' using errcode = 'P0001'; end if;
  -- Exact checkout retries reuse a payment/order without reserving twice.
  select lb.* into b from public.league_coupon_uses u join public.league_bookings lb on lb.id = u.booking_id
    where u.coupon_id = c.id and u.state = 'RESERVED' and lb.status = 'PENDING'
      and lb.entry = p_entry order by u.created_at desc limit 1;
  if found then
    if b.razorpay_order_id is null then raise exception 'Your discounted payment is still being prepared. Please wait or contact the desk.' using errcode = 'P0001'; end if;
    return b;
  end if;
  if not c.active then raise exception 'This coupon has been deactivated.' using errcode = 'P0001'; end if;
  if fee < c.min_entry_fee then raise exception 'The entry total is below this coupon minimum.' using errcode = 'P0001'; end if;
  if length(v_phone) <> 10 or v_email = '' then raise exception 'Valid contact details are required.' using errcode = 'P0001'; end if;
  select count(*), count(*) filter (where u.email_key = v_email or u.phone_key = v_phone)
    into total_used, person_used from public.league_coupon_uses u where u.coupon_id = c.id;
  if total_used >= c.usage_limit then raise exception 'This coupon is fully allocated.' using errcode = 'P0001'; end if;
  if person_used >= c.per_person_limit then raise exception 'This contact has reached the coupon limit. Resume your original checkout or remove the code.' using errcode = 'P0001'; end if;
  discount := case when c.discount_type = 'PERCENT' then round(fee * c.discount_value / 100.0)::integer else c.discount_value end;
  discount := greatest(0, least(discount, fee - 1));
  label := case when c.discount_type = 'PERCENT' then c.discount_value || '% off' else '₹' || c.discount_value || ' off' end;
  q := p_quote || jsonb_build_object('discount', discount, 'total', subtotal - discount, 'couponCode', c.code, 'couponLabel', label);
  insert into public.league_bookings(sport, captain_name, team_name, email, phone, amount_paise, entry, quote)
    values(p_entry->>'sport', p_entry->>'captainName', p_entry->>'teamName', p_entry->>'email', p_entry->>'phone',
      (subtotal - discount) * 100, p_entry, q) returning * into b;
  insert into public.league_coupon_uses(booking_id, coupon_id, email_key, phone_key)
    values(b.id, c.id, v_email, v_phone);
  return b;
end;
$$;

create function public.league_redeem_coupon() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'CONFIRMED' and old.status <> 'CONFIRMED' then
    update public.league_coupon_uses set state = 'REDEEMED', redeemed_at = new.paid_at
      where booking_id = new.id and state = 'RESERVED';
  end if;
  return new;
end;
$$;
create trigger league_coupon_capture after update of status on public.league_bookings
  for each row execute function public.league_redeem_coupon();
revoke all on function public.league_coupon_inventory(), public.league_create_coupon_booking(jsonb,jsonb), public.league_redeem_coupon() from public, anon, authenticated;
grant execute on function public.league_coupon_inventory(), public.league_create_coupon_booking(jsonb,jsonb) to service_role;
notify pgrst, 'reload schema';