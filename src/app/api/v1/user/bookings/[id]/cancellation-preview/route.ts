import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { BookingError, BookingService } from '@/lib/services/booking.service';

/**
 * What cancelling this booking right now would refund — read-only, so the
 * app can show it before the player confirms anything.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const bookingId = (await params).id;
      const preview = await BookingService.cancellationPreview(user.id, bookingId);
      return NextResponse.json({ success: true, data: preview });
    } catch (error) {
      if (error instanceof BookingError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      console.error('Cancellation Preview Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
