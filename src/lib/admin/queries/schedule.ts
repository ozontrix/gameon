import 'server-only';

import { supabaseAdmin } from '@/lib/db/supabase';
import {
  DEFAULT_TIMEZONE,
  dayOfWeek,
  generateTimeSlots,
  isTimeOverlap,
  wallClockIn,
} from '@/lib/utils/date-helpers';

export type ScheduleCell =
  | { state: 'free'; start: string; end: string }
  | { state: 'past'; start: string; end: string }
  | { state: 'closed'; start: string; end: string; reason: string }
  | {
      state: 'booked' | 'held';
      start: string;
      end: string;
      booking: { id: string; name: string | null; paid: boolean; checkedIn: boolean };
    };

/** One day at a venue: every active court against every slot of the day. */
export async function getSchedule(requestedVenueId: string | undefined, date: string) {
  const { data: venues } = await supabaseAdmin
    .from('venues')
    .select('id, name, timezone, is_active')
    .order('name');

  const activeVenues = (venues ?? []).filter((venue) => venue.is_active !== false);
  const venue = activeVenues.find((entry) => entry.id === requestedVenueId) ?? activeVenues[0];
  if (!venue) return { venues: activeVenues, venue: null, slots: [], rows: [], closedAllDay: false };

  const timeZone = venue.timezone || DEFAULT_TIMEZONE;

  const [{ data: courts }, { data: hours }, { data: closures }] = await Promise.all([
    supabaseAdmin
      .from('facilities')
      .select('id, name, price_per_hour, sports ( name )')
      .eq('venue_id', venue.id)
      .eq('is_active', true)
      .order('name'),
    supabaseAdmin
      .from('operating_hours')
      .select('open_time, close_time, slot_duration_minutes')
      .eq('venue_id', venue.id)
      .eq('day_of_week', dayOfWeek(date))
      .maybeSingle(),
    supabaseAdmin
      .from('holidays_and_closures')
      .select('facility_id, start_time, end_time, reason')
      .eq('venue_id', venue.id)
      .eq('date', date),
  ]);

  const courtList = (courts ?? []).sort(
    (a, b) => (a.sports?.name ?? '').localeCompare(b.sports?.name ?? '') || a.name.localeCompare(b.name)
  );
  const slots = hours ? generateTimeSlots(hours.open_time, hours.close_time, hours.slot_duration_minutes ?? 60) : [];

  const { data: bookings } = courtList.length
    ? await supabaseAdmin
        .from('bookings')
        .select('id, facility_id, start_time, end_time, status, payment_status, expires_at, contact_name, is_scanned')
        .eq('booking_date', date)
        .in('facility_id', courtList.map((court) => court.id))
        .in('status', ['CONFIRMED', 'PENDING'])
    : { data: [] };

  const now = wallClockIn(timeZone);
  const nowIso = new Date().toISOString();
  const venueClosedAllDay = (closures ?? []).some((c) => !c.facility_id && (!c.start_time || !c.end_time));

  const rows = courtList.map((court) => {
    const courtClosures = (closures ?? []).filter((c) => !c.facility_id || c.facility_id === court.id);
    const courtBookings = (bookings ?? []).filter(
      (b) => b.facility_id === court.id && (b.status === 'CONFIRMED' || !b.expires_at || b.expires_at > nowIso)
    );

    const cells: ScheduleCell[] = slots.map(({ start_time: start, end_time: end }) => {
      const booking = courtBookings.find((b) => isTimeOverlap(start, end, b.start_time, b.end_time));
      if (booking) {
        return {
          state: booking.status === 'CONFIRMED' ? 'booked' : 'held',
          start,
          end,
          booking: {
            id: booking.id,
            name: booking.contact_name,
            paid: booking.payment_status === 'PAID',
            checkedIn: Boolean(booking.is_scanned),
          },
        };
      }

      const closure = courtClosures.find(
        (c) => !c.start_time || !c.end_time || isTimeOverlap(start, end, c.start_time, c.end_time)
      );
      if (closure) return { state: 'closed', start, end, reason: closure.reason };

      if (date < now.date || (date === now.date && end <= now.time)) return { state: 'past', start, end };
      return { state: 'free', start, end };
    });

    return { court, cells };
  });

  return { venues: activeVenues, venue, slots, rows, closedAllDay: venueClosedAllDay };
}
