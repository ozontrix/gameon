import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingError, BookingService } from '@/lib/services/booking.service';
import { withAuth, AuthenticatedUser } from '@/lib/middlewares/auth';
import { toAppBooking } from '@/lib/services/booking-presenter';

const createBookingSchema = z.object({
  facilityId: z.string().uuid("Invalid Facility ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format required"),
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "HH:MM:SS format required"),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "HH:MM:SS format required"),
  // The price is computed on the server; an `amount` sent by older app builds is ignored.
  players: z.number().int().min(1).max(50).optional(),
  contactName: z.string().trim().max(100).optional(),
  contactPhone: z.string().trim().max(20).optional(),
  whatsappConsent: z.boolean().optional().default(false),
  notes: z.string().trim().max(200).optional(),
  // How many GameOn Points the player chose in the wallet block; clamped
  // server-side against their actual balance and this booking's price.
  walletPointsToUse: z.number().int().min(0).max(200_000).optional(),
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

      // Call service to lock the slot using the authenticated user's ID
      const booking = await BookingService.createBooking(user.id, validation.data);

      const walletPointsUsed = Number(booking.wallet_points_used ?? 0);
      return NextResponse.json({
        success: true,
        message: 'Slot locked successfully for 10 minutes. Proceed to payment.',
        bookingId: booking.id, // Mobile app will use this to initialize payment
        amount: Number(booking.amount_paid),
        expiresAt: booking.expires_at,
        walletPointsUsed,
        remainingPayable: Number(booking.amount_paid) - walletPointsUsed,
      }, { status: 201 });

    } catch (error) {
      if (error instanceof BookingError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }

      console.error('Create Booking Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}

const listQuerySchema = z.object({
  status: z.enum(['upcoming', 'ongoing', 'past']).default('upcoming'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const parsed = listQuerySchema.safeParse({
        status: searchParams.get('status') ?? undefined,
        page: searchParams.get('page') ?? undefined,
        limit: searchParams.get('limit') ?? undefined,
      });
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
      }
      const { status, page, limit } = parsed.data;

      const { rows, total, hasMore } = await BookingService.getUserBookings(user.id, { status, page, limit });
      const now = new Date();
      const data = rows.map((booking) => toAppBooking(booking, now));

      return NextResponse.json({ success: true, data, page, total, hasMore }, { status: 200, headers: { 'Cache-Control': 'no-store' } });

    } catch (error) {
      console.error('Fetch Bookings Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
