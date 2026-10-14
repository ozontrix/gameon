import type { BookingService } from '@/lib/services/booking.service';
import { DEFAULT_TIMEZONE, minutesBetween, zonedTimeToUtc } from '@/lib/utils/date-helpers';
import { sportKeyFor } from '@/lib/utils/sport-key';
import { bookingStatusAt } from '@/lib/utils/booking-status';

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
export function toAppBooking(b: UserBooking, now: Date) {
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
      paymentMethod: b.payment_method === 'WALLET' ? 'GameOn Wallet' :
        b.payment_method === 'CASH' ? 'Cash' : b.payment_method === 'CARD' ? 'Card' :
          b.payment_method === 'UPI' ? 'UPI' : b.payment_method === 'COMPLIMENTARY' ? 'Complimentary' : 'Razorpay',
      amountPaid: amount,
    },
    hoursUntilSlot: Math.floor((startsAt.getTime() - now.getTime()) / (1000 * 60 * 60)),
  };
}

