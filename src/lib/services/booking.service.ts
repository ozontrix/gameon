import { supabaseAdmin } from '../db/supabase';
import type { AppBookingStatus } from '@/lib/utils/booking-status';
import { DEFAULT_TIMEZONE, minutesBetween, wallClockIn } from '../utils/date-helpers';
import { NotificationService } from './notification.service';
import { SlotService, lastBookableDate, type SlotOptions } from './slot.service';

/** How long a checkout holds a slot before someone else may take it. */
const HOLD_MINUTES = 10;

/** A failure the API can report as-is, with the HTTP status that fits it. */
export class BookingError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'BookingError';
  }
}

export type NewBooking = {
  facilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  players?: number;
  contactName?: string;
  contactPhone?: string;
  notes?: string;
};

/** A booking taken at the front desk (walk-in or phone), confirmed on creation. */
export type AdminBooking = NewBooking & {
  createdBy: string;
  /** Links the booking to a customer's app account when their phone number matches. */
  userId?: string | null;
  paymentStatus: 'PAID' | 'UNPAID';
  paymentMethod?: 'CASH' | 'UPI' | 'CARD' | 'COMPLIMENTARY';
  /** Overrides the slot option's price, e.g. a discount. Defaults to that price. */
  amount?: number;
};

/**
 * How a paid order ended up:
 * - `confirmed`  the booking is CONFIRMED (now, or already before this call)
 * - `slot-lost`  the hold lapsed and someone else booked the slot before the
 *                payment arrived; the booking stays CANCELLED but is marked
 *                PAID so the team can refund it
 */
export type PaidOrderOutcome = 'confirmed' | 'slot-lost';

/** Unique (23505) or exclusion (23P01) violation: another live booking holds the slot. */
function isSlotTaken(code: string | undefined): boolean {
  return code === '23505' || code === '23P01';
}

export class BookingService {
  /**
   * Creates a PENDING booking that holds the slot for {@link HOLD_MINUTES}.
   * The price is always the court type's price for the chosen slot length —
   * never taken from the client.
   */
  static async createBooking(userId: string, input: NewBooking) {
    const { facilityId, date, startTime, endTime } = input;

    // 1. The date must fall inside the venue's booking window
    await BookingService.assertWithinBookingWindow(facilityId, date);

    // 2. The length must be one this court sells; that option sets the price
    const amount = await BookingService.priceFor(facilityId, startTime, endTime);

    // 3. The slot must exist and still be free
    await BookingService.assertSlotFree(input);

    // 4. A lapsed checkout overlapping this slot would still trip the overlap constraint
    await BookingService.releaseLapsedHold(facilityId, date, startTime, endTime);

    // 5. Insert PENDING booking
    // The overlap constraint blocks this if someone else JUST booked any part of it
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: userId,
        facility_id: facilityId,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        amount_paid: amount,
        status: 'PENDING',
        payment_status: 'UNPAID',
        expires_at: expiresAt,
        players: input.players ?? null,
        contact_name: input.contactName || null,
        contact_phone: input.contactPhone || null,
        notes: input.notes || null,
      })
      .select('id, amount_paid, expires_at')
      .single();

    if (error) {
      if (isSlotTaken(error.code)) throw new BookingError('Slot was just booked by someone else.', 409);
      throw new Error('Failed to create booking: ' + error.message);
    }

    return booking;
  }

  /**
   * Books a slot from the admin panel. The booking is CONFIRMED straight away;
   * payment is either already taken at the desk or recorded later.
   */
  static async createAdminBooking(input: AdminBooking) {
    const { facilityId, date, startTime, endTime } = input;

    const listPrice = await BookingService.priceFor(facilityId, startTime, endTime);
    await BookingService.assertSlotFree(input, { allowStarted: true });

    const amount = input.paymentMethod === 'COMPLIMENTARY' ? 0 : input.amount ?? listPrice;

    await BookingService.releaseLapsedHold(facilityId, date, startTime, endTime);

    const paid = input.paymentStatus === 'PAID';
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: input.userId ?? null,
        facility_id: facilityId,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        amount_paid: amount,
        status: 'CONFIRMED',
        payment_status: paid ? 'PAID' : 'UNPAID',
        payment_method: paid ? (input.paymentMethod ?? 'CASH') : null,
        paid_at: paid ? new Date().toISOString() : null,
        source: 'ADMIN',
        created_by: input.createdBy,
        players: input.players ?? null,
        contact_name: input.contactName || null,
        contact_phone: input.contactPhone || null,
        notes: input.notes || null,
      })
      .select('id, amount_paid')
      .single();

    if (error) {
      if (isSlotTaken(error.code)) throw new BookingError('Slot was just booked by someone else.', 409);
      throw new Error('Failed to create booking: ' + error.message);
    }

    return booking;
  }

  /**
   * Throws a 400 for a date past the venue's booking window. Only the app is
   * held to it; the front desk books beyond it on purpose.
   */
  private static async assertWithinBookingWindow(facilityId: string, date: string) {
    const { data: facility } = await supabaseAdmin
      .from('facilities')
      .select('venues ( timezone, booking_window_days )')
      .eq('id', facilityId)
      .maybeSingle();

    const windowDays = facility?.venues?.booking_window_days ?? 14;
    const timeZone = facility?.venues?.timezone || DEFAULT_TIMEZONE;
    if (date > lastBookableDate(windowDays, timeZone)) {
      throw new BookingError(
        `Bookings open ${windowDays} day${windowDays === 1 ? '' : 's'} ahead. Please pick an earlier date.`,
        400
      );
    }
  }

  /** Throws a 409 unless `startTime`–`endTime` is one of the facility's free slots on `date`. */
  private static async assertSlotFree(input: NewBooking, options?: Omit<SlotOptions, 'durationMinutes'>) {
    const durationMinutes = minutesBetween(input.startTime, input.endTime);
    const slots = await SlotService.getSlots(input.facilityId, input.date, { ...options, durationMinutes });
    const slot = slots.find((entry) => entry.start_time === input.startTime && entry.end_time === input.endTime);

    if (!slot || !slot.available) {
      throw new BookingError('This slot is no longer available. Please select another time.', 409);
    }
  }

  /**
   * The court type's price for a slot of this length. Every length a player can
   * book is an explicit option with its own price, so there's no pro-rating: a
   * length the court doesn't sell is refused. The amount is snapshotted onto the
   * booking, which is what makes a later price change leave past bookings alone.
   */
  static async priceFor(facilityId: string, startTime: string, endTime: string): Promise<number> {
    const { data: facility, error } = await supabaseAdmin
      .from('facilities')
      .select('court_type_id')
      .eq('id', facilityId)
      .maybeSingle();
    if (error || !facility) throw new BookingError('Facility not found', 404);

    const { data: option } = await supabaseAdmin
      .from('court_type_slot_options')
      .select('price')
      .eq('court_type_id', facility.court_type_id)
      .eq('duration_minutes', minutesBetween(startTime, endTime))
      .eq('is_active', true)
      .maybeSingle();
    if (!option) throw new BookingError('This court does not offer a slot of that length.', 400);
    return Number(option.price);
  }

  /** A lapsed checkout overlapping this slot would still trip the overlap constraint. */
  private static async releaseLapsedHold(facilityId: string, date: string, startTime: string, endTime: string) {
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'CANCELLED' })
      .eq('facility_id', facilityId)
      .eq('booking_date', date)
      .lt('start_time', endTime)
      .gt('end_time', startTime)
      .eq('status', 'PENDING')
      .lt('expires_at', new Date().toISOString());
  }

  /**
   * Confirms the booking a paid Razorpay order belongs to. Safe to call more than
   * once for the same order: the app's verify call and the webhook both land here.
   */
  static async confirmPaidOrder(orderId: string, paymentId: string) {
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select('id, status')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!booking) throw new BookingError('No booking found for this payment order.', 404);

    if (booking.status === 'CONFIRMED') {
      // Already confirmed by the other caller (app verify or webhook); its notice is already out.
      return { bookingId: booking.id, outcome: 'confirmed' as PaidOrderOutcome };
    }

    const paid = {
      payment_status: 'PAID' as const,
      payment_method: 'RAZORPAY',
      razorpay_payment_id: paymentId,
      paid_at: new Date().toISOString(),
      expires_at: null,
    };

    // PENDING, or CANCELLED because the hold lapsed (or checkout was closed) before the payment landed
    const { data: confirmed, error } = await supabaseAdmin
      .from('bookings')
      .update({ ...paid, status: 'CONFIRMED' })
      .eq('id', booking.id)
      .in('status', ['PENDING', 'CANCELLED'])
      .select('id')
      .maybeSingle();

    if (confirmed) {
      await NotificationService.notifyBooking(booking.id, { type: 'confirmed' });
      return { bookingId: booking.id, outcome: 'confirmed' as PaidOrderOutcome };
    }

    if (isSlotTaken(error?.code)) {
      // Someone else holds the slot now. Keep the payment on record for a manual refund.
      const { error: recordError } = await supabaseAdmin
        .from('bookings')
        .update({ ...paid, status: 'CANCELLED' })
        .eq('id', booking.id);
      if (recordError) throw recordError;

      console.error(
        `[payments] Paid booking ${booking.id} lost its slot (order ${orderId}, payment ${paymentId}) — refund needed.`
      );
      await NotificationService.notifyBooking(booking.id, { type: 'slot-lost' });
      return { bookingId: booking.id, outcome: 'slot-lost' as PaidOrderOutcome };
    }

    if (error) throw error;

    // Nothing matched: another call confirmed it in the meantime
    const { data: latest } = await supabaseAdmin
      .from('bookings')
      .select('status')
      .eq('id', booking.id)
      .single();

    if (latest?.status === 'CONFIRMED') {
      return { bookingId: booking.id, outcome: 'confirmed' as PaidOrderOutcome };
    }
    throw new Error(`Could not confirm booking ${booking.id} for order ${orderId}`);
  }

  /**
   * Admin Function: Verifies a QR Code (Booking UUID) scanned at the venue
   */
  static async verifyQRCode(bookingId: string) {
    // 1. Fetch booking with facility details
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, user_id, status, is_scanned, booking_date, contact_name, contact_phone,
        facilities ( name, venues ( timezone ) )
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) throw new BookingError('Invalid QR Code. Booking not found.', 400);

    // 2. Validate Status
    if (booking.status !== 'CONFIRMED') {
      throw new BookingError(`Booking is not confirmed. Current status: ${booking.status}`, 400);
    }

    // 3. Validate if already scanned (Screenshot Prevention)
    if (booking.is_scanned) {
      throw new BookingError('QR Code has already been used for entry!', 400);
    }

    // 4. Validate Date (Must be today, on the venue's clock)
    const today = wallClockIn(booking.facilities?.venues?.timezone || DEFAULT_TIMEZONE).date;
    if (booking.booking_date !== today) {
      throw new BookingError(`Invalid Date! This booking is for ${booking.booking_date}.`, 400);
    }

    // 5. Mark as scanned — only if no other scanner got there first
    const { data: scanned, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        is_scanned: true,
        scanned_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .or('is_scanned.is.null,is_scanned.eq.false')
      .select('id')
      .maybeSingle();

    if (updateError) throw new Error('Failed to update scan status');
    if (!scanned) throw new BookingError('QR Code has already been used for entry!', 400);

    // 6. Return success with User Info for verbal check
    const { data: profile } = booking.user_id
      ? await supabaseAdmin.from('profiles').select('full_name, phone').eq('id', booking.user_id).maybeSingle()
      : { data: null };

    return {
      success: true,
      message: 'Access Granted',
      facilityName: booking.facilities?.name ?? 'Unknown facility',
      userName: booking.contact_name || profile?.full_name || 'Unknown',
      userPhone: booking.contact_phone || profile?.phone || null,
    };
  }

  /** The player's confirmed bookings, newest first. */
  /**
   * A page of the player's confirmed bookings for one status.
   *
   * The status a booking is in depends on the clock in its venue's timezone,
   * which SQL can't sort on. So the date window narrows it here — everything
   * from today for upcoming and ongoing, everything up to today for past —
   * and the exact status is settled once the rows are mapped. Only today's
   * rows can fall out that way, so a page may come back a little short; it
   * never comes back wrong.
   */
  static async getUserBookings(
    userId: string,
    { status, page, limit }: { status: AppBookingStatus; page: number; limit: number }
  ) {
    const today = wallClockIn(DEFAULT_TIMEZONE).date;
    const upcoming = status !== 'past';
    const from = (page - 1) * limit;

    let query = supabaseAdmin
      .from('bookings')
      .select(
        `id, booking_date, start_time, end_time, amount_paid, status, payment_status,
         players, razorpay_order_id, paid_at, created_at,
         facilities (
           id, name,
           venues ( name, address, timezone ),
           court_types ( is_indoor, has_ac, surface_type, sports ( name ) )
         )`,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .eq('status', 'CONFIRMED');

    query = upcoming
      ? query.gte('booking_date', today).order('booking_date').order('start_time')
      : query
          .lte('booking_date', today)
          .order('booking_date', { ascending: false })
          .order('start_time', { ascending: false });

    const { data, count, error } = await query.range(from, from + limit - 1);
    if (error) throw error;

    return { rows: data ?? [], total: count ?? 0, hasMore: from + (data?.length ?? 0) < (count ?? 0) };
  }
}
