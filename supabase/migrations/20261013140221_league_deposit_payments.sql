-- Preserve existing full-payment orders; new coupon checkouts pin the selected advance.
create or replace function public.league_create_coupon_booking(p_entry jsonb, p_quote jsonb)
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
  plan text := coalesce(p_entry->>'paymentPlan', 'FULL');
  due_paise integer;
begin
  if plan not in ('FULL', 'DEPOSIT_20') then raise exception 'Invalid payment option.' using errcode = 'P0001'; end if;
  select * into c from public.league_coupons where code = upper(trim(p_entry->>'coupon')) for update;
  if not found then raise exception 'This coupon does not exist.' using errcode = 'P0001'; end if;
  -- Include the payment plan in the immutable entry: never reuse a full order for a deposit.
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
  due_paise := case when plan = 'DEPOSIT_20' then round((subtotal - discount) * 100 / 5.0)::integer else (subtotal - discount) * 100 end;
  if due_paise < 100 then raise exception 'This payment option must charge at least one rupee. Please pay in full.' using errcode = 'P0001'; end if;
  insert into public.league_bookings(sport, captain_name, team_name, email, phone, amount_paise, entry, quote)
    values(p_entry->>'sport', p_entry->>'captainName', p_entry->>'teamName', p_entry->>'email', p_entry->>'phone',
      due_paise, p_entry, q) returning * into b;
  insert into public.league_coupon_uses(booking_id, coupon_id, email_key, phone_key)
    values(b.id, c.id, v_email, v_phone);
  return b;
end;
$$;
revoke all on function public.league_create_coupon_booking(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.league_create_coupon_booking(jsonb,jsonb) to service_role;
notify pgrst, 'reload schema';