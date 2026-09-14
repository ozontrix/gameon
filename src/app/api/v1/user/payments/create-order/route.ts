import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

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

      // 1. Fetch the PENDING booking to get the exact amount
      const { data: booking, error: fetchError } = await supabaseAdmin
        .from('bookings')
        .select('amount_paid, status, user_id')
        .eq('id', bookingId)
        .single();

      if (fetchError || !booking) {
        return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }

      if (booking.status !== 'PENDING') {
        return NextResponse.json({ success: false, error: 'Booking is already confirmed or cancelled' }, { status: 400 });
      }

      // If user_id is null (our mock bypass), we allow it. Otherwise strictly check user.id
      if (booking.user_id && booking.user_id !== user.id) {
         return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }

      // 2. Create the Razorpay Order
      // Amount must be in paise (₹1 = 100 paise)
      const amountInPaise = Math.round(Number(booking.amount_paid || 0) * 100);

      if (amountInPaise === 0) {
        return NextResponse.json({ success: false, error: 'Booking is free, no payment needed' }, { status: 400 });
      }

      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${bookingId.replace(/-/g, '').substring(0, 30)}`,
        notes: {
          booking_id: bookingId,
        }
      };

      const order = await razorpay.orders.create(options);

      return NextResponse.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // Send publishable key to client
      }, { status: 201 });

    } catch (error: any) {
      console.error('Create Razorpay Order Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}
