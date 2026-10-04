import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';
import { availableCoupons, previewCoupon } from '@/lib/league/coupon-server';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
const PreviewSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/),
  entryFee: z.number().int().min(1).max(1000000),
  // Quotes are display-only. Reject query syntax in identities used by PostgREST.
  email: z.email().max(254).refine(value => !/[(),"\\]/.test(value)),
  phone: z.string().regex(/^[+\d\s]{10,18}$/).refine(value => value.replace(/\D/g, '').length >= 10),
});

export async function GET(request: Request) {
  return withRateLimit(request, { limit: 60, windowMs: 60_000 }, async () => {
    try { return NextResponse.json({ coupons: await availableCoupons() }, { headers }); }
    catch (error) {
      console.error('League coupons:', error);
      return NextResponse.json({ error: 'Coupons could not be loaded. Try again shortly.' }, { status: 503, headers });
    }
  });
}

export async function POST(request: Request) {
  return withRateLimit(request, { limit: 20, windowMs: 60_000 }, async (req) => {
    const parsed = PreviewSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Enter a valid coupon and your email and phone on the details page first.' }, { status: 400, headers });
    try {
      const { code, entryFee, email, phone } = parsed.data;
      return NextResponse.json({ coupon: await previewCoupon(code, entryFee, email, phone) }, { headers });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'This coupon could not be checked. Try again.' }, { status: 409, headers });
    }
  });
}