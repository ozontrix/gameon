import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getRazorpay } from '@/lib/razorpay';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const orderId = (await params).id;

      const { data: order, error: fetchError } = await supabaseAdmin
        .from('event_orders')
        .select('amount_paid, status, user_id, expires_at, razorpay_order_id')
        .eq('id', orderId)
        .maybeSingle();

      if (fetchError || !order || order.user_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }

      if (order.status !== 'PENDING') {
        return NextResponse.json(
          { success: false, error: 'This order is no longer awaiting payment.' },
          { status: 409 }
        );
      }

      if (order.expires_at && order.expires_at < new Date().toISOString()) {
        return NextResponse.json(
          { success: false, error: 'Your hold on these tickets expired. Please buy again.' },
          { status: 410 }
        );
      }

      const amountInPaise = Math.round(Number(order.amount_paid || 0) * 100);
      if (amountInPaise <= 0) {
        return NextResponse.json({ success: false, error: 'This order has no amount to pay.' }, { status: 409 });
      }

      const keyId = process.env.RAZORPAY_KEY_ID;

      if (order.razorpay_order_id) {
        return NextResponse.json(
          { success: true, orderId: order.razorpay_order_id, amount: amountInPaise, currency: 'INR', keyId },
          { status: 200 }
        );
      }

      const rzpOrder = await getRazorpay().orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `event_${orderId.replace(/-/g, '').substring(0, 30)}`,
        notes: { event_order_id: orderId },
      });

      const { data: linked, error: linkError } = await supabaseAdmin
        .from('event_orders')
        .update({ razorpay_order_id: rzpOrder.id })
        .eq('id', orderId)
        .is('razorpay_order_id', null)
        .select('razorpay_order_id')
        .maybeSingle();

      if (linkError) throw linkError;

      let razorpayOrderId = linked?.razorpay_order_id ?? null;
      if (!razorpayOrderId) {
        const { data: current } = await supabaseAdmin
          .from('event_orders')
          .select('razorpay_order_id')
          .eq('id', orderId)
          .single();
        razorpayOrderId = current?.razorpay_order_id ?? null;
      }
      if (!razorpayOrderId) throw new Error(`Could not link a Razorpay order to event order ${orderId}`);

      return NextResponse.json(
        { success: true, orderId: razorpayOrderId, amount: amountInPaise, currency: 'INR', keyId },
        { status: 201 }
      );
    } catch (error) {
      console.error('Create Event Razorpay Order Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
