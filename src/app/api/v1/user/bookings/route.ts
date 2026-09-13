import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingService } from '@/lib/services/booking.service';
import { withAuth, AuthenticatedUser } from '@/lib/middlewares/auth';

const createBookingSchema = z.object({
  facilityId: z.string().uuid("Invalid Facility ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format required"),
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "HH:MM:SS format required"),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "HH:MM:SS format required"),
  amount: z.number().positive(),
});

export async function POST(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user: AuthenticatedUser) => {
    try {
      const body = await req.json();
      const validation = createBookingSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid payload', details: validation.error.format() },
          { status: 400 }
        );
      }

      const { facilityId, date, startTime, endTime, amount } = validation.data;

      // Call service to lock the slot using the authenticated user's ID
      const booking = await BookingService.createBooking(
        user.id,
        facilityId,
        date,
        startTime,
        endTime,
        amount
      );

      return NextResponse.json({
        success: true,
        message: 'Slot locked successfully for 10 minutes. Proceed to payment.',
        bookingId: booking.id, // Mobile app will use this to initialize payment
      }, { status: 201 });

    } catch (error: any) {
      console.error('Create Booking Error:', error);
      
      // Check if it's our custom double-booking error
      if (error.message.includes('no longer available') || error.message.includes('booked by someone else')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 409 });
      }

      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}
