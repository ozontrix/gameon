-- Row locking makes app/webhook retries produce one debit and one transition.
-- All wallet and booking writes in each RPC commit or roll back together.
create or replace function public.booking_confirm_payment(
  p_booking_id uuid, p_order_id text, p_payment_id text, p_user_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  b public.bookings%rowtype;
  v_outcome text;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or (p_order_id is null and b.user_id is distinct from p_user_id) then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if p_order_id is not null then
    if b.razorpay_order_id is distinct from p_order_id or p_payment_id is null or p_payment_id = '' then
      raise exception 'Payment order mismatch' using errcode = '22023';
    end if;
    if b.razorpay_payment_id is not null and b.razorpay_payment_id is distinct from p_payment_id then
      raise exception 'A different payment is already recorded' using errcode = '22023';
    end if;
  elsif b.wallet_points_used <= 0 or b.wallet_points_used <> b.amount_paid or b.razorpay_order_id is not null then
    raise exception 'Booking is not fully covered by Points' using errcode = '22023';
  end if;

  if b.status = 'CONFIRMED' and b.payment_status = 'PAID' then
    if (p_order_id is null and b.payment_method <> 'WALLET') or
       (p_order_id is not null and b.razorpay_payment_id is distinct from p_payment_id) then
      raise exception 'Payment method mismatch' using errcode = '22023';
    end if;
    return jsonb_build_object('outcome', 'confirmed', 'changed', false);
  end if;
  -- Never resurrect a customer/admin cancellation or a refunded purchase.
  if b.payment_status <> 'UNPAID' then
    if b.status = 'CANCELLED' and b.payment_status = 'PAID' and
       p_order_id is not null and b.razorpay_payment_id = p_payment_id then
      return jsonb_build_object('outcome', case when b.cancel_reason = 'Captured payment: insufficient Points; refund required' then 'wallet-insufficient' else 'slot-lost' end, 'changed', false);
    end if;
    raise exception 'Booking is no longer awaiting payment' using errcode = '22023';
  end if;
  if p_order_id is null and (b.status <> 'PENDING' or b.expires_at is null or b.expires_at <= now()) then
    raise exception 'Your hold expired. Please pick the slot again.' using errcode = '22023';
  end if;
  if b.status not in ('PENDING', 'CANCELLED') then
    raise exception 'Booking cannot be confirmed' using errcode = '22023';
  end if;

  if p_order_id is not null and b.status = 'CANCELLED' and b.cancelled_at is not null then
    update public.bookings set payment_status = 'PAID', payment_method = 'RAZORPAY',
      razorpay_payment_id = p_payment_id, paid_at = now(), expires_at = null,
      refund_percent = 100, refund_due_amount = b.amount_paid - b.wallet_points_used
    where id = b.id;
    return jsonb_build_object('outcome', 'slot-lost', 'changed', true);
  end if;

  -- An exception rolls back both the debit and the attempted confirmation.
  begin
    if b.wallet_points_used > 0 then
      if b.user_id is null then
        raise exception 'Wallet owner missing' using errcode = '22023';
      end if;
      perform public.wallet_adjust(b.user_id, -b.wallet_points_used, 'booking_redeem', b.id);
    end if;
    update public.bookings set
      status = 'CONFIRMED', payment_status = 'PAID',
      payment_method = case when p_order_id is null then 'WALLET' else 'RAZORPAY' end,
      razorpay_payment_id = p_payment_id, paid_at = now(), expires_at = null
    where id = b.id;
    return jsonb_build_object('outcome', 'confirmed', 'changed', true);
  exception
    when exclusion_violation or unique_violation then
      if p_order_id is null then raise; end if;
      v_outcome := 'slot-lost';
    when check_violation then
      if p_order_id is null or sqlerrm not like '%wallets_balance_check%' then raise; end if;
      v_outcome := 'wallet-insufficient';
  end;

  -- Keep captured money visible in the existing refund queue. No Points were
  -- debited: only the gateway remainder is refundable in this exception path.
  update public.bookings set status = 'CANCELLED', payment_status = 'PAID',
    payment_method = 'RAZORPAY', razorpay_payment_id = p_payment_id, paid_at = now(),
    expires_at = null, cancelled_at = coalesce(cancelled_at, now()),
    cancel_reason = case when v_outcome = 'wallet-insufficient' then 'Captured payment: insufficient Points; refund required' else 'Captured payment: slot lost; refund required' end,
    refund_percent = 100, refund_due_amount = b.amount_paid - b.wallet_points_used
  where id = b.id;
  return jsonb_build_object('outcome', v_outcome, 'changed', true);
end;
$$;

create or replace function public.booking_cancel_with_wallet_refund(
  p_booking_id uuid, p_user_id uuid, p_refund_percent integer, p_reason text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  b public.bookings%rowtype;
  v_timezone text;
  v_refund numeric;
  v_points integer;
  v_owes_refund boolean;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.user_id is distinct from p_user_id then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;
  if b.status <> 'CONFIRMED' or coalesce(b.is_scanned, false) then
    raise exception 'This booking can no longer be cancelled.' using errcode = '22023';
  end if;
  select coalesce(v.timezone, 'Asia/Kolkata') into v_timezone
  from public.facilities f join public.venues v on v.id = f.venue_id where f.id = b.facility_id;
  if ((b.booking_date + b.start_time) at time zone coalesce(v_timezone, 'Asia/Kolkata')) <= now() then
    raise exception 'This booking has already started.' using errcode = '22023';
  end if;
  if p_refund_percent is null or p_refund_percent < 0 or p_refund_percent > 100 then
    raise exception 'Invalid refund percentage' using errcode = '22023';
  end if;
  v_refund := round(b.amount_paid * p_refund_percent / 100, 2);
  v_points := round(v_refund)::integer;
  v_owes_refund := v_refund > 0 and b.payment_status = 'PAID';
  if v_owes_refund and v_points > 0 then
    perform public.wallet_adjust(p_user_id, v_points, 'refund_credit', b.id);
  end if;
  update public.bookings set status = 'CANCELLED', cancelled_at = now(),
    cancelled_by = p_user_id, cancel_reason = coalesce(nullif(trim(p_reason), ''), 'Cancelled by customer'),
    expires_at = null, refund_percent = p_refund_percent, refund_due_amount = v_refund,
    payment_status = case when v_owes_refund then 'REFUNDED'::public.payment_status else payment_status end,
    refunded_at = case when v_owes_refund then now() else refunded_at end,
    refund_reference = case when v_owes_refund then 'Wallet credit' else refund_reference end
  where id = b.id;
  return jsonb_build_object('refundDueAmount', v_refund, 'amountPaid', b.amount_paid,
    'paymentStatus', case when v_owes_refund then 'REFUNDED' else b.payment_status::text end);
end;
$$;

create or replace function public.credit_booking_referral(p_user_id uuid, p_booking_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_referrer uuid;
  v_paid boolean;
  v_bonus integer;
begin
  if not exists (select 1 from public.bookings where id = p_booking_id and user_id = p_user_id and status = 'CONFIRMED' and payment_status = 'PAID') then
    raise exception 'A confirmed paid booking is required' using errcode = '22023';
  end if;
  select referred_by, referral_bonus_paid into v_referrer, v_paid
  from public.profiles where id = p_user_id for update;
  if v_referrer is null or v_paid then return; end if;
  select first_booking_bonus_points into v_bonus from public.referral_settings limit 1;
  if coalesce(v_bonus, 0) > 0 then
    perform public.wallet_adjust(v_referrer, v_bonus, 'referral_bonus', p_booking_id);
  end if;
  update public.profiles set referral_bonus_paid = true where id = p_user_id;
end;
$$;

revoke all on function public.booking_confirm_payment(uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.booking_cancel_with_wallet_refund(uuid, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.credit_booking_referral(uuid, uuid) from public, anon, authenticated;
grant execute on function public.booking_confirm_payment(uuid, text, text, uuid) to service_role;
grant execute on function public.booking_cancel_with_wallet_refund(uuid, uuid, integer, text) to service_role;
grant execute on function public.credit_booking_referral(uuid, uuid) to service_role;
notify pgrst, 'reload schema';