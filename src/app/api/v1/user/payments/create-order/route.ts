import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getRazorpay } from '@/lib/razorpay';

const createOrderSchema = z.object({
  bookingId: z.string().uuid("Invalid Booking ID"),
});

export async function POST(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const body = await req.json();
      const validation = createOrderSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid payload', details: validation.error.format() },
          { status: 400 }
        );
      }

      const { bookingId } = validation.data;

      // 1. Fetch the caller's PENDING booking; its amount was set by the server
      const { data: booking, error: fetchError } = await supabaseAdmin
        .from('bookings')
        .select('amount_paid, status, user_id, expires_at, razorpay_order_id, wallet_points_used')
        .eq('id', bookingId)
        .maybeSingle();

      if (fetchError || !booking || booking.user_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }

      if (booking.status !== 'PENDING') {
        return NextResponse.json({ success: false, error: 'This booking is no longer awaiting payment.' }, { status: 409 });
      }

      if (booking.expires_at && booking.expires_at < new Date().toISOString()) {
        return NextResponse.json(
          { success: false, error: 'Your hold on this slot expired. Please pick the slot again.' },
          { status: 410 }
        );
      }

      // Any Points applied at hold time already came off the price — Razorpay
      // is only ever asked for what's left.
      const remaining = Number(booking.amount_paid || 0) - Number(booking.wallet_points_used || 0);
      const amountInPaise = Math.round(remaining * 100);
      if (amountInPaise <= 0) {
        return NextResponse.json(
          { success: false, error: 'This booking has no amount to pay.', code: 'FULLY_COVERED_BY_WALLET' },
          { status: 409 }
        );
      }

      const keyId = process.env.RAZORPAY_KEY_ID; // Publishable key for the checkout

      // 2. One Razorpay order per booking: a retried checkout reuses it
      if (booking.razorpay_order_id) {
        return NextResponse.json({
          success: true,
          orderId: booking.razorpay_order_id,
          amount: amountInPaise,
          currency: 'INR',
          keyId,
        }, { status: 200 });
      }

      const order = await getRazorpay().orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${bookingId.replace(/-/g, '').substring(0, 30)}`,
        notes: {
          booking_id: bookingId,
        },
      });

      // 3. Link the order to the booking — that link is what verify and the webhook trust
      const { data: linked, error: linkError } = await supabaseAdmin
        .from('bookings')
        .update({ razorpay_order_id: order.id })
        .eq('id', bookingId)
        .is('razorpay_order_id', null)
        .select('razorpay_order_id')
        .maybeSingle();

      if (linkError) throw linkError;

      let orderId = linked?.razorpay_order_id ?? null;
      if (!orderId) {
        // A parallel request linked its own order first; use that one
        const { data: current } = await supabaseAdmin
          .from('bookings')
          .select('razorpay_order_id')
          .eq('id', bookingId)
          .single();
        orderId = current?.razorpay_order_id ?? null;
      }
      if (!orderId) throw new Error(`Could not link a Razorpay order to booking ${bookingId}`);

      return NextResponse.json({
        success: true,
        orderId,
        amount: amountInPaise,
        currency: 'INR',
        keyId,
      }, { status: 201 });

    } catch (error) {
      console.error('Create Razorpay Order Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}
