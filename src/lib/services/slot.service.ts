import { supabaseAdmin } from '../db/supabase';
import {
  DEFAULT_TIMEZONE,
  dayOfWeek,
  generateTimeSlots,
  isTimeOverlap,
  wallClockIn,
} from '../utils/date-helpers';

export type Slot = {
  start_time: string;
  end_time: string;
  /** False when booked, held by an unexpired checkout, closed, or already started. */
  available: boolean;
};

export class SlotService {
  /**
   * Every slot a facility has on a date, each flagged with whether it can still
   * be booked. An empty list means the facility is not open that day.
   */
  static async getSlots(facilityId: string, targetDate: string): Promise<Slot[]> {
    // 1. Get facility and venue details
    const { data: facility, error: facError } = await supabaseAdmin
      .from('facilities')
      .select('venue_id, is_active, venues ( timezone )')
      .eq('id', facilityId)
      .single();

    if (facError || !facility) throw new Error('Facility not found');
    if (!facility.is_active) return []; // Court is deactivated/maintenance

    // Operating hours live on the venue, so a facility with no venue has no slots
    const venueId = facility.venue_id;
    if (!venueId) return [];
    const timeZone = facility.venues?.timezone || DEFAULT_TIMEZONE;

    // 2. Fetch Operating Hours for this day of the week (0 = Sunday)
    const { data: opHours, error: opError } = await supabaseAdmin
      .from('operating_hours')
      .select('open_time, close_time, slot_duration_minutes')
      .eq('venue_id', venueId)
      .eq('day_of_week', dayOfWeek(targetDate))
      .maybeSingle();

    // If venue is closed on this day of week, return empty
    if (opError || !opHours) return [];

    // 3. Generate all raw possible slots for the day
    const possibleSlots = generateTimeSlots(
      opHours.open_time,
      opHours.close_time,
      opHours.slot_duration_minutes ?? 60
    );

    // 4. Fetch Holidays / Closures for this date
    // We check if the WHOLE venue is closed (facility_id IS NULL) OR this specific court is closed
    const { data: closures } = await supabaseAdmin
      .from('holidays_and_closures')
      .select('start_time, end_time')
      .eq('venue_id', venueId)
      .eq('date', targetDate)
      .or(`facility_id.is.null,facility_id.eq.${facilityId}`);

    // A closure without times shuts the whole day
    if (closures?.some((closure) => !closure.start_time || !closure.end_time)) return [];

    // 5. Fetch bookings that still hold a slot: confirmed ones, and checkouts whose hold has not lapsed
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('start_time, end_time, status, expires_at')
      .eq('facility_id', facilityId)
      .eq('booking_date', targetDate)
      .in('status', ['CONFIRMED', 'PENDING']);

    const nowIso = new Date().toISOString();
    const holding = (bookings ?? []).filter(
      (booking) => booking.status === 'CONFIRMED' || !booking.expires_at || booking.expires_at > nowIso
    );

    // 6. A slot that has already started cannot be booked, judged on the venue's clock
    const now = wallClockIn(timeZone);

    return possibleSlots.map((slot) => {
      const closed = (closures ?? []).some((closure) =>
        isTimeOverlap(slot.start_time, slot.end_time, closure.start_time!, closure.end_time!)
      );
      const booked = holding.some((booking) =>
        isTimeOverlap(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
      );
      const started =
        targetDate < now.date || (targetDate === now.date && slot.start_time <= now.time);

      return { ...slot, available: !closed && !booked && !started };
    });
  }
}
