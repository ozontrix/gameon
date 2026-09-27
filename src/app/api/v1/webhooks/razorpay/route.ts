import { NextResponse } from 'next/server';
import { isValidWebhookSignature } from '@/lib/razorpay';
import { BookingError, BookingService } from '@/lib/services/booking.service';
import { EventError, EventService } from '@/lib/services/event.service';
import { TournamentError, TournamentService } from '@/lib/services/tournament.service';

/**
 * Razorpay webhook (Dashboard → Settings → Webhooks), subscribed to
 * `payment.captured` and `order.paid`.
 *
 * This is what confirms a booking, tournament entry or event order when the
 * app never gets to call its own /payments/verify — the app was closed, or
 * the network dropped, right after the money was taken. Confirmation is
 * idempotent, so receiving both events (or the app's verify call as well) is
 * harmless. An order belongs to exactly one of the three tables, so each is
 * tried in turn and a 404 from one just means "try the next."
 */
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('CRITICAL: RAZORPAY_WEBHOOK_SECRET is not configured; rejecting Razorpay webhook.');
    return NextResponse.json({ success: false, error: 'Webhook not configured' }, { status: 500 });
  }

  // The signature is computed over the exact bytes Razorpay sent
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  if (!isValidWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string } };
      order?: { entity?: { id?: string } };
    };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (event.event !== 'payment.captured' && event.event !== 'order.paid') {
    return NextResponse.json({ received: true });
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id ?? event.payload?.order?.entity?.id;
  if (!orderId || !payment?.id) {
    return NextResponse.json({ received: true });
  }

  try {
    const result = await BookingService.confirmPaidOrder(orderId, payment.id);
    return NextResponse.json({ received: true, outcome: result.outcome });
  } catch (error) {
    if (!(error instanceof BookingError && error.status === 404)) {
      console.error('Razorpay Webhook Error (booking):', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  }

  try {
    const result = await TournamentService.confirmPaidOrder(orderId, payment.id);
    return NextResponse.json({ received: true, outcome: result.outcome });
  } catch (error) {
    if (!(error instanceof TournamentError && error.status === 404)) {
      console.error('Razorpay Webhook Error (tournament):', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  }

  try {
    const result = await EventService.confirmPaidOrder(orderId, payment.id);
    return NextResponse.json({ received: true, outcome: result.outcome });
  } catch (error) {
    if (error instanceof EventError && error.status === 404) {
      // Not a booking, a tournament entry, or an event order — e.g. an order
      // created straight from the Razorpay dashboard.
      return NextResponse.json({ received: true, outcome: 'ignored' });
    }
    console.error('Razorpay Webhook Error (event):', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
