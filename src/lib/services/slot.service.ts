import { supabaseAdmin } from '../db/supabase';
import { generateTimeSlots, isTimeOverlap } from '../utils/date-helpers';

export class SlotService {
  /**
   * Calculates all available slots for a specific facility on a given date.
   */
  static async getAvailableSlots(facilityId: string, targetDate: string) {
    // 1. Get facility and venue details
    const { data: facility, error: facError } = await supabaseAdmin
      .from('facilities')
      .select('venue_id, is_active')
      .eq('id', facilityId)
      .single();

    if (facError || !facility) throw new Error('Facility not found');
    if (!facility.is_active) return []; // Court is deactivated/maintenance

    // Operating hours live on the venue, so a facility with no venue has no slots
    const venueId = facility.venue_id;
    if (!venueId) return [];

    // 2. Get Day of Week (0 = Sunday, 1 = Monday, etc.)
    const dateObj = new Date(targetDate);
    const dayOfWeek = dateObj.getDay();

    // 3. Fetch Operating Hours for this day
    const { data: opHours, error: opError } = await supabaseAdmin
      .from('operating_hours')
      .select('open_time, close_time, slot_duration_minutes')
      .eq('venue_id', venueId)
      .eq('day_of_week', dayOfWeek)
      .single();

    // If venue is closed on this day of week, return empty
    if (opError || !opHours) return [];

    // 4. Generate all raw possible slots for the day
    let possibleSlots = generateTimeSlots(
      opHours.open_time, 
      opHours.close_time, 
      opHours.slot_duration_minutes ?? 60
    );

    // 5. Fetch Holidays / Closures for this date
    // We check if the WHOLE venue is closed (facility_id IS NULL) OR this specific court is closed
    const { data: closures } = await supabaseAdmin
      .from('holidays_and_closures')
      .select('start_time, end_time')
      .eq('venue_id', venueId)
      .eq('date', targetDate)
      .or(`facility_id.is.null,facility_id.eq.${facilityId}`);

    if (closures && closures.length > 0) {
      for (const closure of closures) {
        // If start_time is null, it means closed for the ENTIRE DAY
        if (!closure.start_time || !closure.end_time) {
          return [];
        }
        // Otherwise, filter out slots that overlap with the closure time
        possibleSlots = possibleSlots.filter(
          slot => !isTimeOverlap(slot.start_time, slot.end_time, closure.start_time!, closure.end_time!)
        );
      }
    }

    // 6. Fetch Existing Bookings (Confirmed OR Pending)
    const { data: bookings } = await supabaseAdmin
      .from('bookings')
      .select('start_time, end_time')
      .eq('facility_id', facilityId)
      .eq('booking_date', targetDate)
      .in('status', ['CONFIRMED', 'PENDING']);

    // 7. Remove booked slots from our possible slots
    if (bookings && bookings.length > 0) {
      possibleSlots = possibleSlots.filter(slot => {
        // Return true ONLY if this slot does NOT overlap with ANY booking
        return !bookings.some(booking => 
          isTimeOverlap(slot.start_time, slot.end_time, booking.start_time, booking.end_time)
        );
      });
    }

    // 8. Return the final clean list of available slots
    return possibleSlots;
  }
}
