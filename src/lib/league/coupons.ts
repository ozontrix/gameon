/** Safe, shared coupon definitions. Database access lives in coupon-server.ts. */
import { z } from 'zod';

export const CouponFormSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/, 'Use 3–20 letters, numbers, underscores or hyphens.'),
  discount_type: z.enum(['PERCENT', 'FLAT']),
  discount_value: z.coerce.number().int().min(1).max(100000),
  min_entry_fee: z.coerce.number().int().min(0).max(1000000),
  usage_limit: z.coerce.number().int().min(1).max(1000000),
  per_person_limit: z.coerce.number().int().min(1).max(1000000),
}).superRefine((value, context) => {
  if (value.discount_type === 'PERCENT' && value.discount_value > 99) {
    context.addIssue({ code: 'custom', path: ['discount_value'], message: 'Percentage must be between 1 and 99.' });
  }
  if (value.per_person_limit > value.usage_limit) {
    context.addIssue({ code: 'custom', path: ['per_person_limit'], message: 'Per-person limit cannot exceed the overall limit.' });
  }
});

export interface LeagueCoupon {
  id: string;
  code: string;
  discount_type: 'PERCENT' | 'FLAT';
  discount_value: number;
  min_entry_fee: number;
  usage_limit: number;
  per_person_limit: number;
  active: boolean;
  created_at: string;
}

export interface CouponAvailability extends LeagueCoupon {
  used: number;
  reserved: number;
  remaining: number;
}

export type PublicCoupon = Pick<LeagueCoupon, 'code' | 'discount_type' | 'discount_value' | 'min_entry_fee' | 'per_person_limit'> & { label: string };

export function couponLabel(coupon: Pick<LeagueCoupon, 'discount_type' | 'discount_value' | 'min_entry_fee'>): string {
  const offer = coupon.discount_type === 'PERCENT' ? `${coupon.discount_value}% off` : `₹${coupon.discount_value.toLocaleString('en-IN')} off`;
  return `${offer} entries of ₹${coupon.min_entry_fee.toLocaleString('en-IN')} or more`;
}

/** Discounts apply only to entry fees, never extras; keep at least ₹1 payable. */
export function couponDiscount(entryFee: number, coupon: PublicCoupon | null): number {
  if (!coupon || entryFee < coupon.min_entry_fee) return 0;
  const amount = coupon.discount_type === 'PERCENT'
    ? Math.round(entryFee * coupon.discount_value / 100) : coupon.discount_value;
  return Math.max(0, Math.min(amount, entryFee - 1));
}