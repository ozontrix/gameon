import { supabaseAdmin } from '../db/supabase';
import { formatDate, formatMoney, formatTime, formatTimeRange } from '../admin/format';

export const NOTIFICATION_KINDS = ['booking', 'reminder', 'tournament', 'wallet', 'facility', 'offer', 'general'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

type NewNotification = {
  /** null sends a broadcast to every app user. */
  userId: string | null;
  kind: NotificationKind;
  title: string;
  body: string;
  /** In-app route, e.g. `/booking/<id>`. */
  link?: string | null;
  bookingId?: string | null;
  /** Makes the notification idempotent: a second insert with the same key is ignored. */
  dedupeKey?: string | null;
  createdBy?: string | null;
};

export type BookingEvent =
  | { type: 'confirmed' }
  | { type: 'slot-lost' }
  | { type: 'cancelled'; reason?: string | null }
  | { type: 'refunded'; reference: string }
  | { type: 'reminder' }
  | { type: 'closure'; closureId: string; allDay: boolean; startTime?: string | null; endTime?: string | null; reason: string; wholeVenue: boolean };

function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export class NotificationService {
  /**
   * Stores a notification. Never throws: a notification that fails to save is
   * logged, and must not undo the booking change that triggered it.
   * Returns the new id, or null when skipped (duplicate, no recipient, error).
   */
  static async create(input: NewNotification): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: input.userId,
        kind: input.kind,
        title: clip(input.title, 80),
        body: clip(input.body, 500),
        link: input.link ?? null,
        booking_id: input.bookingId ?? null,
        dedupe_key: input.dedupeKey ?? null,
        created_by: input.createdBy ?? null,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code !== '23505') console.error('[notifications] could not save', input.dedupeKey ?? input.title, error.message);
      return null;
    }
    return data.id;
  }

  /** Tells a booking's customer what happened to it. Bookings without an app account are skipped. */
  static async notifyBooking(bookingId: string, event: BookingEvent): Promise<void> {
    try {
      const { data: booking } = await supabaseAdmin
        .from('bookings')
        .select('id, user_id, booking_date, start_time, end_time, amount_paid, payment_status, facilities ( name )')
        .eq('id', bookingId)
        .maybeSingle();

      if (!booking?.user_id) return;

      const court = booking.facilities?.name ?? 'your court';
      const when = `${formatDate(booking.booking_date, { year: false })} at ${formatTime(booking.start_time)}`;
      const amount = formatMoney(booking.amount_paid);
      const link = `/booking/${booking.id}`;
      const base = { userId: booking.user_id, bookingId: booking.id, link };

      switch (event.type) {
        case 'confirmed':
          await NotificationService.create({
            ...base,
            kind: 'booking',
            title: 'Booking confirmed',
            body: `${court} on ${when} is booked. Show the QR code in My Bookings when you arrive.`,
            dedupeKey: `booking-confirmed:${booking.id}`,
          });
          break;
        case 'slot-lost':
          await NotificationService.create({
            ...base,
            kind: 'booking',
            title: 'Payment received, slot unavailable',
            body: `We received ${amount} for ${court} on ${when}, but the slot was booked by someone else first. Our team will refund you.`,
            dedupeKey: `booking-slot-lost:${booking.id}`,
          });
          break;
        case 'cancelled':
          await NotificationService.create({
            ...base,
            kind: 'booking',
            title: 'Booking cancelled',
            body: [
              `Your booking for ${court} on ${when} was cancelled${event.reason ? `: ${event.reason}` : '.'}`,
              booking.payment_status === 'PAID' ? `Your refund of ${amount} is being processed.` : '',
            ]
              .filter(Boolean)
              .join(' '),
            dedupeKey: `booking-cancelled:${booking.id}`,
          });
          break;
        case 'refunded':
          await NotificationService.create({
            ...base,
            kind: 'booking',
            title: 'Refund processed',
            body: `${amount} for ${court} on ${when} has been refunded. Reference: ${event.reference}.`,
            dedupeKey: `booking-refunded:${booking.id}`,
          });
          break;
        case 'reminder':
          await NotificationService.create({
            ...base,
            kind: 'reminder',
            title: 'Game day!',
            body: `${court} today at ${formatTime(booking.start_time)}. Show your QR code at check-in.`,
            dedupeKey: `booking-reminder:${booking.id}`,
          });
          break;
        case 'closure': {
          const hours = event.allDay ? 'all day' : `from ${formatTimeRange(event.startTime, event.endTime)}`;
          await NotificationService.create({
            ...base,
            kind: 'facility',
            title: `Closure on ${formatDate(booking.booking_date, { year: false })}`,
            body: `${event.wholeVenue ? 'The venue' : court} is closed ${hours} (${event.reason}). This affects your booking at ${formatTime(booking.start_time)} — please contact the venue.`,
            dedupeKey: `closure:${event.closureId}:${booking.id}`,
          });
          break;
        }
      }
    } catch (error) {
      console.error('[notifications] booking notice failed', bookingId, event.type, error);
    }
  }

  static async list(userId: string, limit = 50, before?: string | null) {
    const { data, error } = await supabaseAdmin.rpc('user_notifications', {
      p_user_id: userId,
      p_limit: limit,
      ...(before ? { p_before: before } : {}),
    });
    if (error) throw error;
    return data;
  }

  static async unreadCount(userId: string): Promise<number> {
    const { data, error } = await supabaseAdmin.rpc('user_unread_notification_count', { p_user_id: userId });
    if (error) throw error;
    return data ?? 0;
  }

  /** Marks the given notifications read, or all of them when `ids` is omitted. */
  static async markRead(userId: string, ids?: string[]): Promise<number> {
    const { data, error } = await supabaseAdmin.rpc('mark_notifications_read', {
      p_user_id: userId,
      ...(ids ? { p_ids: ids } : {}),
    });
    if (error) throw error;
    return data ?? 0;
  }
}
