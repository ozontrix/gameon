import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

/**
 * Releases the caller's own unpaid ticket hold, e.g. when they close the
 * payment sheet. Cancelling a paid (CONFIRMED) order is not supported yet.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const orderId = (await params).id;

      const { data: order, error: fetchError } = await supabaseAdmin
        .from('event_orders')
        .select('user_id, status, payment_status')
        .eq('id', orderId)
        .maybeSingle();

      if (fetchError || !order || order.user_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }

      if (order.status === 'CANCELLED') {
        return NextResponse.json({ success: true, message: 'Order already released' });
      }

      if (order.status !== 'PENDING' || order.payment_status !== 'UNPAID') {
        return NextResponse.json(
          { success: false, error: "Paid orders can't be cancelled in the app yet." },
          { status: 400 }
        );
      }

      const { data: released, error: updateError } = await supabaseAdmin
        .from('event_orders')
        .update({ status: 'CANCELLED' })
        .eq('id', orderId)
        .eq('status', 'PENDING')
        .eq('payment_status', 'UNPAID')
        .select('id')
        .maybeSingle();

      if (updateError) throw updateError;
      if (!released) {
        return NextResponse.json({ success: false, error: 'This order was just updated.' }, { status: 409 });
      }

      return NextResponse.json({ success: true, message: 'Order released' });
    } catch (error) {
      console.error('Cancel Event Order Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
