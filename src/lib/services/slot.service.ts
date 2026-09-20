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

export type SlotOptions = {
  /**
   * The slot length to lay the day out in. It must be one of the court type's
   * active slot options; any other length gets no slots at all.
   */
  durationMinutes: number;
  /**
   * Front desk only: a slot that has started but not yet ended can still be
   * booked for a walk-in. The app always needs the slot to be in the future.
   */
  allowStarted?: boolean;
};

export class SlotService {
  /**
   * Every slot a facility has on a date, each flagged with whether it can still
   * be booked. An empty list means the facility is not open that day.
   */
  static async getSlots(facilityId: string, targetDate: string, options: SlotOptions): Promise<Slot[]> {
    // 1. Get facility and venue details
    const { data: facility, error: facError } = await supabaseAdmin
      .from('facilities')
      .select('venue_id, court_type_id, is_active, venues ( timezone, is_active )')
      .eq('id', facilityId)
      .single();

    if (facError || !facility) throw new Error('Facility not found');
    if (!facility.is_active) return []; // Court is deactivated/maintenance

    // Operating hours live on the venue, so a facility with no venue has no slots
    const venueId = facility.venue_id;
    if (!venueId || facility.venues?.is_active === false) return [];
    const timeZone = facility.venues?.timezone || DEFAULT_TIMEZONE;

    // Only a length this court's type actually sells lays out a day.
    const { data: slotOption } = await supabaseAdmin
      .from('court_type_slot_options')
      .select('id')
      .eq('court_type_id', facility.court_type_id)
      .eq('duration_minutes', options.durationMinutes)
      .eq('is_active', true)
      .maybeSingle();
    if (!slotOption) return [];

    // 2. Fetch Operating Hours for this day of the week (0 = Sunday)
    const { data: opHours, error: opError } = await supabaseAdmin
      .from('operating_hours')
      .select('open_time, close_time')
      .eq('venue_id', venueId)
      .eq('day_of_week', dayOfWeek(targetDate))
      .maybeSingle();

    // If venue is closed on this day of week, return empty
    if (opError || !opHours) return [];

    // 3. Back-to-back slots of the chosen length, from opening time
    const possibleSlots = generateTimeSlots(opHours.open_time, opHours.close_time, options.durationMinutes);

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

    // 6. A slot that has already started (or, at the front desk, ended) cannot be
    //    booked, judged on the venue's clock
    const now = wallClockIn(timeZone);

    return possibleSlots.map((slot) => {
      const closed = (closures ?? []).some((closure) =>
        isTimeOverlap(slot.start_time, slot.end_time, closure.start_time!, closure.end_time!)
      );
      const booked = holding.some((booking) =>
        isTimeOverlap(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
      );
      const cutoff = options.allowStarted ? slot.end_time : slot.start_time;
      const tooLate = targetDate < now.date || (targetDate === now.date && cutoff <= now.time);

      return { ...slot, available: !closed && !booked && !tooLate };
    });
  }
}
