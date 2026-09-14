import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const bookingId = (await params).id;

      // Ensure the booking belongs to this user (or mock user)
      const { data: booking, error: fetchError } = await supabaseAdmin
        .from('bookings')
        .select('user_id, status')
        .eq('id', bookingId)
        .single();

      if (fetchError || !booking) {
         return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
      }

      if (booking.user_id && booking.user_id !== user.id) {
         return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }

      if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') {
         return NextResponse.json({ success: false, error: 'Booking cannot be cancelled' }, { status: 400 });
      }

      // Mark as cancelled
      const { error: updateError } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'CANCELLED' })
        .eq('id', bookingId);

      if (updateError) {
         throw updateError;
      }

      return NextResponse.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (error: any) {
      console.error('Cancel Booking Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}
