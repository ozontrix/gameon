import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { BookingError, BookingService } from '@/lib/services/booking.service';

/**
 * Confirms a PENDING booking whose GameOn Points fully cover its price —
 * called instead of /user/payments/create-order when the checkout's wallet
 * block brings `remainingPayable` to zero, so no Razorpay order is ever created.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (_req, user) => {
    try {
      const bookingId = (await params).id;
      const result = await BookingService.confirmWithWallet(user.id, bookingId);
      return NextResponse.json({ success: true, booking: { id: result.bookingId } });
    } catch (error) {
      if (error instanceof BookingError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      console.error('Confirm With Wallet Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
