import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingService } from '@/lib/services/booking.service';
import { withAuth, AuthenticatedUser } from '@/lib/middlewares/auth';

const createBookingSchema = z.object({
  facilityId: z.string().uuid("Invalid Facility ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format required"),
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "HH:MM:SS format required"),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "HH:MM:SS format required"),
  amount: z.number().min(0),
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

export async function GET(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const bookings = await BookingService.getUserBookings(user.id);

      // Map backend bookings to the frontend structure
      const mappedBookings = bookings.map((b: any) => {
        const facility = b.facilities;
        const venue = facility?.venues || { name: 'Unknown', address: 'Unknown' };
        
        // Convert status (PENDING/CONFIRMED/CANCELLED) to frontend status (upcoming/ongoing/past)
        let status = 'upcoming'; // naive default
        const today = new Date().toISOString().split('T')[0];
        if (b.status === 'CANCELLED') status = 'past';
        else if (b.booking_date < today) status = 'past';
        else if (b.booking_date === today) status = 'ongoing'; // For today, mark as ongoing for now

        // Extract date format
        const dateObj = new Date(b.booking_date);
        const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const dayStr = dateObj.toLocaleDateString('en-GB', { weekday: 'short' });
        
        // Extract time format (06:00:00 -> 6:00 AM)
        const formatTime = (t: string) => {
          const [h, m] = t.split(':');
          let hour = parseInt(h);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          hour = hour % 12 || 12;
          return `${hour}:${m} ${ampm}`;
        };

        // Calculate hours until slot starts
        const slotStart = new Date(`${b.booking_date}T${b.start_time}+05:30`);
        const now = new Date();
        const diffMs = slotStart.getTime() - now.getTime();
        const hoursUntilSlot = Math.floor(diffMs / (1000 * 60 * 60));

        return {
          key: b.id,
          bookingId: b.id.substring(0,8).toUpperCase(),
          sport: facility?.sports?.name?.toLowerCase() || 'badminton',
          status,
          venue: facility?.name || 'Unknown Facility',
          location: venue.name + ', ' + venue.address,
          date: `${dateStr} (${dayStr})`,
          time: `${formatTime(b.start_time)} - ${formatTime(b.end_time)}`,
          tags: [facility?.sports?.name, 'Court'].filter(Boolean),
          paid: parseFloat(b.amount_paid || '0'),
          image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea', // fallback mock image
          detailTitle: facility?.name,
          // ── Booking Detail (Screen 12) Fields ──
          bookedOn: `Booked on ${dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
          court: facility?.name || 'Court 1',
          floor: facility?.is_indoor ? 'Indoor' : 'Outdoor',
          setting: facility?.is_indoor ? 'Indoor' : 'Outdoor',
          climate: facility?.has_ac ? 'AC' : 'Non-AC',
          players: 2,
          bookingType: 'Regular Slot',
          duration: '1 Hour',
          qrValidTill: `${dateStr}, ${formatTime(b.end_time)}`,
          invoice: {
            orderId: `INV-${b.id.substring(0, 8).toUpperCase()}`,
            paymentMethod: b.payment_status === 'PAID' ? 'Online' : 'Pending',
            amountPaid: parseFloat(b.amount_paid || '0')
          },
          hoursUntilSlot
        };
      });

      return NextResponse.json({ success: true, data: mappedBookings }, { status: 200 });

    } catch (error: any) {
      console.error('Fetch Bookings Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
