import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingError, BookingService } from '@/lib/services/booking.service';
import { withAuth, AuthenticatedUser } from '@/lib/middlewares/auth';
import { DEFAULT_TIMEZONE, minutesBetween, zonedTimeToUtc } from '@/lib/utils/date-helpers';
import { sportKeyFor } from '@/lib/utils/sport-key';
import { bookingStatusAt } from '@/lib/utils/booking-status';

const createBookingSchema = z.object({
  facilityId: z.string().uuid("Invalid Facility ID"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD format required"),
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "HH:MM:SS format required"),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, "HH:MM:SS format required"),
  // The price is computed on the server; an `amount` sent by older app builds is ignored.
  players: z.number().int().min(1).max(50).optional(),
  contactName: z.string().trim().max(100).optional(),
  contactPhone: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(200).optional(),
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

      return NextResponse.json({
        success: true,
        message: 'Slot locked successfully for 10 minutes. Proceed to payment.',
        bookingId: booking.id, // Mobile app will use this to initialize payment
        amount: Number(booking.amount_paid),
        expiresAt: booking.expires_at,
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

type UserBooking = Awaited<ReturnType<typeof BookingService.getUserBookings>>['rows'][number];

function capitalize(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

/** 06:00:00 → 6:00 AM */
function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/** 2026-09-17 → { date: "17 Sep 2026", weekday: "Thu" }, without the server's timezone leaking in. */
function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return {
    date: utc.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    weekday: utc.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
  };
}

function formatDuration(minutes: number): string {
  if (minutes % 60 !== 0) return `${minutes} Minutes`;
  const hours = minutes / 60;
  return hours === 1 ? '1 Hour' : `${hours} Hours`;
}

/** Maps a booking row to the shape the app's booking cards and detail screen render. */
function toAppBooking(b: UserBooking, now: Date) {
  const facility = b.facilities;
  const venue = facility?.venues;
  const timeZone = venue?.timezone || DEFAULT_TIMEZONE;

  const startsAt = zonedTimeToUtc(b.booking_date, b.start_time, timeZone);
  const endsAt = zonedTimeToUtc(b.booking_date, b.end_time, timeZone);
  const status = bookingStatusAt(startsAt, endsAt, now);

  const { date, weekday } = formatDate(b.booking_date);
  const bookedAt = new Date(b.paid_at ?? b.created_at ?? Date.now());
  const courtType = facility?.court_types;
  const sportName = courtType?.sports?.name ?? 'Sport';
  const setting = courtType?.is_indoor ? 'Indoor' : 'Outdoor';
  const climate = courtType?.has_ac ? 'AC' : 'Non-AC';
  const surface = capitalize(courtType?.surface_type ?? '');
  const amount = Number(b.amount_paid ?? 0);

  return {
    key: b.id, // Full booking UUID — also the check-in QR payload
    bookingId: `#${b.id.substring(0, 8).toUpperCase()}`,
    sport: sportKeyFor(sportName) ?? 'badminton',
    status,
    venue: facility?.name || 'Unknown Facility',
    location: [venue?.name, venue?.address].filter(Boolean).join(', '),
    date: `${date} (${weekday})`,
    time: `${formatTime(b.start_time)} – ${formatTime(b.end_time)}`,
    tags: [surface, setting, climate].filter(Boolean),
    paid: amount,
    image: null, // The app picks a photo for the sport
    detailTitle: `${sportName} – ${facility?.name ?? 'Court'}`,
    // ── Booking Detail (Screen 12) Fields ──
    bookedOn: bookedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone }),
    court: facility?.name || '—',
    floor: surface || '—',
    setting,
    climate,
    players: b.players ?? null,
    bookingType: 'Regular Slot',
    duration: formatDuration(minutesBetween(b.start_time, b.end_time)),
    qrValidTill: `${date}, ${formatTime(b.end_time)}`,
    invoice: {
      orderId: b.razorpay_order_id ?? `INV-${b.id.substring(0, 8).toUpperCase()}`,
      paymentMethod: 'Razorpay',
      amountPaid: amount,
    },
    hoursUntilSlot: Math.floor((startsAt.getTime() - now.getTime()) / (1000 * 60 * 60)),
  };
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
      // Today's rows sit in the window for both directions; only the ones
      // actually in this status survive.
      const data = rows.map((booking) => toAppBooking(booking, now)).filter((booking) => booking.status === status);

      return NextResponse.json({ success: true, data, page, total, hasMore }, { status: 200 });

    } catch (error) {
      console.error('Fetch Bookings Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
