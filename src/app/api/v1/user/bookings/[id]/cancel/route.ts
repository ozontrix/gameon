import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { BookingError, BookingService } from '@/lib/services/booking.service';

/**
 * Cancels the caller's own booking.
 *
 * A PENDING, unpaid hold (e.g. they closed the payment sheet) is just
 * released — nothing was ever charged. A CONFIRMED booking is cancelled
 * properly: {@link BookingService.cancelByPlayer} prices the refund from the
 * cancellation policy and snapshots it onto the row, so the Refunds page
 * knows what's actually owed.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const bookingId = (await params).id;
      const body = await req.json().catch(() => ({}));
      const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 300) : undefined;

      const { data: booking, error: fetchError } = await supabaseAdmin
        .from('bookings')
        .select('user_id, status, payment_status')
        .eq('id', bookingId)
        .maybeSingle();

      if (fetchError || !booking || booking.user_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }

      if (booking.status === 'CANCELLED') {
        return NextResponse.json({ success: true, message: 'Booking already cancelled', refund: null });
      }

      // A confirmed booking — paid or not — goes through the real cancel-and-price path.
      if (booking.status === 'CONFIRMED') {
        const result = await BookingService.cancelByPlayer(user.id, bookingId, reason);
        return NextResponse.json({
          success: true,
          message:
            result.paymentStatus === 'PAID'
              ? result.refundDueAmount > 0
                ? `Booking cancelled. You're entitled to a ${result.refundPercent}% refund (₹${result.refundDueAmount}).`
                : 'Booking cancelled. This cancellation falls outside the refund window, so no refund applies.'
              : 'Booking cancelled.',
          refund: {
            percent: result.refundPercent,
            amount: result.refundDueAmount,
            paymentStatus: result.paymentStatus,
          },
        });
      }

      if (booking.status !== 'PENDING' || booking.payment_status !== 'UNPAID') {
        return NextResponse.json(
          { success: false, error: 'This booking can no longer be cancelled.' },
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

      return NextResponse.json({ success: true, message: 'Booking released', refund: null });
    } catch (error) {
      if (error instanceof BookingError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      console.error('Cancel Booking Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
