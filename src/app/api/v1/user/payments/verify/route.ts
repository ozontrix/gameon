import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { isValidPaymentSignature } from '@/lib/razorpay';
import { BookingError, BookingService } from '@/lib/services/booking.service';

const verifyOrderSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  bookingId: z.string().uuid(),
});

export async function POST(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const body = await req.json();
      const validation = verifyOrderSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid payload', details: validation.error.format() },
          { status: 400 }
        );
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = validation.data;

      // 1. The booking must be the caller's, and the order must be the one created for it
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('user_id, razorpay_order_id')
        .eq('id', bookingId)
        .maybeSingle();

      if (!booking || booking.user_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }

      if (!booking.razorpay_order_id || booking.razorpay_order_id !== razorpay_order_id) {
        return NextResponse.json({ success: false, error: 'This payment does not belong to this booking.' }, { status: 400 });
      }

      // 2. Verify the signature cryptographically
      if (!isValidPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        return NextResponse.json({ success: false, error: 'Invalid Payment Signature' }, { status: 400 });
      }

      // 3. Confirm — the webhook may already have done it, which is fine
      const result = await BookingService.confirmPaidOrder(razorpay_order_id, razorpay_payment_id);

      if (result.outcome === 'slot-lost') {
        return NextResponse.json({
          success: false,
          code: 'SLOT_TAKEN',
          error: `We received your payment, but this slot was booked by someone else before it went through. Please contact GameOn support for a refund (payment ID ${razorpay_payment_id}).`,
        }, { status: 409 });
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and booking confirmed',
        booking: { id: result.bookingId },
      }, { status: 200 });

    } catch (error) {
      if (error instanceof BookingError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }

      console.error('Verify Razorpay Payment Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}
