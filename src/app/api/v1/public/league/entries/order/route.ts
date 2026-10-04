import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/middlewares/rate-limiter";
import { getRazorpay } from "@/lib/razorpay";
import { parseLeagueEntry } from "@/lib/league/entry";
import { LEAGUE_NAME } from "@/lib/league/constants";
import { formatDayLabel, scheduleLabel } from "@/components/league/data";
import { attachLeagueOrder, createLeagueBooking } from "@/lib/league/bookings";

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

      // Persist first. Never open checkout without a durable entry snapshot.
      const booking = await createLeagueBooking(entry, quote);
      const order = await getRazorpay().orders.create({
        amount,
        currency: "INR",
        receipt: `lge_${booking.id}`,
        notes: {
          league_booking_id: booking.id,
          league: LEAGUE_NAME,
          sport: entry.sports.map(sport => sport.name).join(" + ").slice(0, 256),
          categories: entry.categories.map((category) => `${category.sportName}: ${category.name} (${formatDayLabel(category.date)})`).join(", ").slice(0, 256),
          match_day: scheduleLabel(entry.categories),
          contact: entry.phone,
        },
      });
      await attachLeagueOrder(booking.id, order.id);

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
