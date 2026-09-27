import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

/**
 * The caller's own ticket order, confirmed or not. What the success screen
 * trusts instead of its in-memory draft — the draft is gone after a reload,
 * the order itself is not.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const { id } = await params;
      const { data, error } = await supabaseAdmin
        .from('event_orders')
        .select(
          `id, attendee_name, tickets, status, payment_status, amount_paid, razorpay_payment_id,
           events ( title, venue_id, starts_on, ends_on, daily_start_time, daily_end_time, venues ( name ) )`
        )
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('Get Event Order Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
