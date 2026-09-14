import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { BookingService } from '@/lib/services/booking.service';

const verifyOrderSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
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

      // 1. Verify the signature cryptographically
      const bodyStr = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(bodyStr.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return NextResponse.json({ success: false, error: 'Invalid Payment Signature' }, { status: 400 });
      }

      // 2. Mark the booking as CONFIRMED using the existing service
      const booking = await BookingService.confirmBooking(bookingId);

      return NextResponse.json({
        success: true,
        message: 'Payment verified and booking confirmed',
        booking: booking,
      }, { status: 200 });

    } catch (error: any) {
      console.error('Verify Razorpay Payment Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}
