import { NextResponse } from "next/server";
import { z } from "zod";
import { withRateLimit } from "@/lib/middlewares/rate-limiter";
import { isValidPaymentSignature } from "@/lib/razorpay";
import { confirmLeaguePayment, LeagueBookingError } from "@/lib/league/bookings";

export const runtime = "nodejs";

const ConfirmSchema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/).max(80),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/).max(80),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
});

/**
 * Signature authorises access to this receipt. Contact details and the price
 * come from the stored checkout, not replacement browser data. Capture is
 * verified server-side and persisted before best-effort email delivery.
 */
export async function POST(request: Request) {
  return withRateLimit(request, { limit: 20, windowMs: 60_000 }, async (req) => {
    try {
      const body = await req.json().catch(() => null);
      const parsed = ConfirmSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: "Missing payment details." },
          { status: 400 }
        );
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

      if (!isValidPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        return NextResponse.json(
          { success: false, error: "We could not verify this payment." },
          { status: 400 }
        );
      }

      const confirmation = await confirmLeaguePayment(razorpay_order_id, razorpay_payment_id);
      return NextResponse.json({ success: true, confirmation }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      if (error instanceof LeagueBookingError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      console.error("League confirm error:", error);
      return NextResponse.json(
        { success: false, error: "We could not confirm this payment. Do not pay again; contact the front desk with your payment ID." },
        { status: 500 }
      );
    }
  });
}
