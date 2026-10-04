import 'server-only';
import { supabaseAdmin } from '@/lib/db/supabase';
import { couponLabel, type CouponAvailability, type PublicCoupon } from './coupons';

export async function couponInventory(): Promise<CouponAvailability[]> {
  const { data, error } = await supabaseAdmin.rpc('league_coupon_inventory');
  if (error) throw error;
  return data as unknown as CouponAvailability[];
}

export function publicCoupon(coupon: CouponAvailability): PublicCoupon {
  return {
    code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value,
    min_entry_fee: coupon.min_entry_fee, per_person_limit: coupon.per_person_limit,
    label: couponLabel(coupon),
  };
}

export async function availableCoupons(): Promise<PublicCoupon[]> {
  return (await couponInventory()).filter(coupon => coupon.active && coupon.remaining > 0).map(publicCoupon);
}

/** Preview only. Final allocation is locked by league_create_coupon_booking. */
export async function previewCoupon(code: string, fee: number, email: string, phone: string): Promise<PublicCoupon> {
  const coupon = (await couponInventory()).find(item => item.code === code.trim().toUpperCase());
  if (!coupon || !coupon.active || coupon.remaining < 1) throw new Error('This coupon is inactive or fully allocated.');
  if (fee < coupon.min_entry_fee) throw new Error(`This coupon needs entry fees of ₹${coupon.min_entry_fee.toLocaleString('en-IN')} or more.`);
  const { count, error } = await supabaseAdmin.from('league_coupon_uses').select('booking_id', { count: 'exact', head: true })
    .eq('coupon_id', coupon.id).eq('state', 'REDEEMED')
    .or(`email_key.eq.${email.trim().toLowerCase()},phone_key.eq.${phone.replace(/\D/g, '').slice(-10)}`);
  if (error) throw error;
  if ((count ?? 0) >= coupon.per_person_limit) throw new Error('This contact has reached the coupon usage limit.');
  return publicCoupon(coupon);
}