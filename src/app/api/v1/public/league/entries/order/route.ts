import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/middlewares/rate-limiter";
import { getRazorpay } from "@/lib/razorpay";
import { parseLeagueEntry } from "@/lib/league/entry";
import { LEAGUE_NAME, matchDayLabel } from "@/lib/league/constants";

export const runtime = "nodejs";

/**
 * Opens a Razorpay order for a Game On Multisports League entry.
 *
 * Public on purpose — anyone can enter, no account needed. The amount is always
 * recomputed here from the catalog, never taken from the browser.
 */
export async function POST(request: Request) {
  return withRateLimit(request, { limit: 15, windowMs: 60_000 }, async (req) => {
    try {
      const body = await req.json().catch(() => null);
      const result = parseLeagueEntry((body as { entry?: unknown } | null)?.entry);

      if (!result.ok) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      const { entry, quote } = result;
      const amount = Math.round(quote.total * 100); // Razorpay works in paise

      if (amount < 100) {
        return NextResponse.json(
          { success: false, error: "This entry has no payable amount." },
          { status: 409 }
        );
      }

      const keyId = process.env.RAZORPAY_KEY_ID;
      if (!keyId || !process.env.RAZORPAY_KEY_SECRET) {
        console.error("League order: Razorpay keys are missing.");
        return NextResponse.json(
          { success: false, error: "Online payment is not available right now." },
          { status: 503 }
        );
      }

      const order = await getRazorpay().orders.create({
        amount,
        currency: "INR",
        receipt: `lge_${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`.slice(0, 40),
        notes: {
          league: LEAGUE_NAME,
          sport: entry.sport.name,
          categories: entry.categories.map((category) => category.name).join(", "),
          match_day: matchDayLabel(entry.date),
          contact: entry.phone,
        },
      });

      return NextResponse.json(
        {
          success: true,
          orderId: order.id,
          amount,
          currency: "INR",
          keyId,
          quote,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("League create-order error:", error);
      return NextResponse.json(
        { success: false, error: "We could not start the payment. Please try again." },
        { status: 500 }
      );
    }
  });
}
