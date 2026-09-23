import { NextResponse } from "next/server";
import { z } from "zod";
import { withRateLimit } from "@/lib/middlewares/rate-limiter";
import { isValidPaymentSignature } from "@/lib/razorpay";
import { entryReference, parseLeagueEntry } from "@/lib/league/entry";
import { sendLeagueConfirmationEmail } from "@/lib/league/email";
import type { LeagueConfirmation } from "@/lib/league/confirmation";

export const runtime = "nodejs";

const ConfirmSchema = z.object({
  entry: z.unknown(),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/**
 * Verifies a Razorpay payment and sends the entry confirmation email.
 *
 * The signature is computed over `order_id|payment_id` with our key secret, so a
 * valid signature proves the payment belongs to an order we created. The email
 * is best-effort: a mail failure still returns the confirmed pass.
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

      const result = parseLeagueEntry(parsed.data.entry);
      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      if (!isValidPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        return NextResponse.json(
          { success: false, error: "We could not verify this payment." },
          { status: 400 }
        );
      }

      const { entry, quote } = result;

      const confirmation: LeagueConfirmation = {
        reference: entryReference(razorpay_order_id, razorpay_payment_id),
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: quote.total,
        currency: "INR",
        paidAt: new Date().toISOString(),
        emailSent: false,
        entry: {
          sport: entry.sport.id,
          sportName: entry.sport.name,
          categoryId: entry.category.id,
          categoryName: entry.category.name,
          date: entry.date,
          squadSize: entry.squadSize,
          teamName: entry.teamName,
          captainName: entry.captainName,
          email: entry.email,
          phone: entry.phone,
          city: entry.city,
          notes: entry.notes,
          addons: entry.addons,
          coupon: entry.coupon,
        },
        quote,
      };

      const mail = await sendLeagueConfirmationEmail(confirmation);
      confirmation.emailSent = mail.sent;

      return NextResponse.json({ success: true, confirmation }, { status: 200 });
    } catch (error) {
      console.error("League confirm error:", error);
      return NextResponse.json(
        { success: false, error: "We could not confirm this payment. Please contact the front desk." },
        { status: 500 }
      );
    }
  });
}
