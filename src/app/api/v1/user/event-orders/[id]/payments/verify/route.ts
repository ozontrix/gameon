import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { isValidPaymentSignature } from '@/lib/razorpay';
import { EventError, EventService } from '@/lib/services/event.service';

const verifyOrderSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const orderId = (await params).id;
      const body = await req.json();
      const validation = verifyOrderSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid payload', details: validation.error.format() },
          { status: 400 }
        );
      }
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validation.data;

      const { data: order } = await supabaseAdmin
        .from('event_orders')
        .select('user_id, razorpay_order_id')
        .eq('id', orderId)
        .maybeSingle();

      if (!order || order.user_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }

      if (!order.razorpay_order_id || order.razorpay_order_id !== razorpay_order_id) {
        return NextResponse.json(
          { success: false, error: 'This payment does not belong to this order.' },
          { status: 400 }
        );
      }

      if (!isValidPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
        return NextResponse.json({ success: false, error: 'Invalid Payment Signature' }, { status: 400 });
      }

      const result = await EventService.confirmPaidOrder(razorpay_order_id, razorpay_payment_id);

      if (result.outcome === 'tickets-lost') {
        return NextResponse.json(
          {
            success: false,
            code: 'TICKETS_TAKEN',
            error: `We received your payment, but this event sold out before it went through. Please contact GameOn support for a refund (payment ID ${razorpay_payment_id}).`,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: true, message: 'Payment verified and tickets confirmed', order: { id: result.orderId } },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof EventError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      console.error('Verify Event Payment Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
