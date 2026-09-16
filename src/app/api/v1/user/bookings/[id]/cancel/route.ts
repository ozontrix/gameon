import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

/**
 * Releases the caller's own unpaid checkout hold, e.g. when they close the
 * payment sheet. Cancelling a paid booking (and refunding it) is not supported yet.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const bookingId = (await params).id;

      const { data: booking, error: fetchError } = await supabaseAdmin
        .from('bookings')
        .select('user_id, status, payment_status')
        .eq('id', bookingId)
        .maybeSingle();

      if (fetchError || !booking || booking.user_id !== user.id) {
         return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }

      if (booking.status === 'CANCELLED') {
        return NextResponse.json({ success: true, message: 'Booking already released' });
      }

      if (booking.status !== 'PENDING' || booking.payment_status !== 'UNPAID') {
         return NextResponse.json(
           { success: false, error: "Paid bookings can't be cancelled in the app yet." },
           { status: 400 }
         );
      }

      // Only while still unpaid — a payment may be confirming this booking right now
      const { data: released, error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'CANCELLED' })
        .eq('id', bookingId)
        .eq('status', 'PENDING')
        .eq('payment_status', 'UNPAID')
        .select('id')
        .maybeSingle();

      if (updateError) {
         throw updateError;
      }
      if (!released) {
        return NextResponse.json({ success: false, error: 'This booking was just updated.' }, { status: 409 });
      }

      return NextResponse.json({ success: true, message: 'Booking released' });
    } catch (error) {
      console.error('Cancel Booking Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}
