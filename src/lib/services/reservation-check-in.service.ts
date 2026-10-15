import { z } from 'zod';
import { supabaseAdmin } from '../db/supabase';
import { BookingError, BookingService } from './booking.service';
import { wallClockIn } from '../utils/date-helpers';

/** The WhatsApp PNG and app court QR use the same authoritative desk checks. */
export class ReservationCheckInService {
  static async verify(code: string) {
    const parts = /^gameon:(event|tournament):(.+)$/.exec(code.trim());
    if (!parts) return { ...await BookingService.verifyQRCode(z.string().uuid().parse(code.trim())), bookingId: code.trim(), category: 'booking' };
    const category = parts[1];
    const id = z.string().uuid().parse(parts[2]);
    const today = wallClockIn();
    if (category === 'event') {
      const { data, error } = await supabaseAdmin.from('event_orders')
        .select('status, payment_status, scanned_at, attendee_name, contact_phone, tickets, events (title, status, starts_on, ends_on, daily_end_time)')
        .eq('id', id).maybeSingle();
      if (error) throw error;
      ReservationCheckInService.assertEligible(data, data?.events, today);
      const { data: marked, error: markError } = await supabaseAdmin.from('event_orders')
        .update({ scanned_at: new Date().toISOString() }).eq('id', id).eq('status', 'CONFIRMED')
        .eq('payment_status', 'PAID').is('scanned_at', null).select('id').maybeSingle();
      if (markError) throw markError;
      if (!marked) throw new BookingError('This order was already checked in or is no longer valid.', 409);
      return { success: true, bookingId: id, category, facilityName: `${data!.events!.title} (${data!.tickets} tickets — entire order)`, userName: data!.attendee_name, userPhone: data!.contact_phone };
    }
    const { data, error } = await supabaseAdmin.from('tournament_registrations')
      .select('status, payment_status, scanned_at, captain_name, team_name, contact_phone, tournaments (title, status, starts_on, ends_on, daily_end_time)')
      .eq('id', id).maybeSingle();
    if (error) throw error;
    ReservationCheckInService.assertEligible(data, data?.tournaments, today);
    const { data: marked, error: markError } = await supabaseAdmin.from('tournament_registrations')
      .update({ scanned_at: new Date().toISOString() }).eq('id', id).eq('status', 'CONFIRMED')
      .eq('payment_status', 'PAID').is('scanned_at', null).select('id').maybeSingle();
    if (markError) throw markError;
    if (!marked) throw new BookingError('This team was already checked in or is no longer valid.', 409);
    return { success: true, bookingId: id, category, facilityName: `${data!.tournaments!.title} — ${data!.team_name}`, userName: data!.captain_name, userPhone: data!.contact_phone };
  }

  private static assertEligible(
    row: { status: string; payment_status: string; scanned_at: string | null } | null,
    activity: { status: string; starts_on: string; ends_on: string; daily_end_time: string | null } | null | undefined,
    now: { date: string; time: string },
  ) {
    if (!row || !activity || row.status !== 'CONFIRMED' || row.payment_status !== 'PAID' || ['draft', 'cancelled'].includes(activity.status)) {
      throw new BookingError('No valid confirmed reservation matches this QR.', 403);
    }
    if (row.scanned_at) throw new BookingError('This reservation was already checked in.', 409);
    if (now.date < activity.starts_on || now.date > activity.ends_on || (activity.daily_end_time && now.time > activity.daily_end_time)) {
      throw new BookingError('This QR is only valid during the scheduled event or tournament dates and hours (India time).', 403);
    }
  }
}