import { supabaseAdmin } from '../db/supabase';
import { DEFAULT_TIMEZONE, minutesBetween, wallClockIn } from '../utils/date-helpers';
import { NotificationService } from './notification.service';
import { SlotService, type SlotOptions } from './slot.service';

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
  /** Overrides the court's price, e.g. a discount. Defaults to rate × slot length. */
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

export class BookingService {
  /**
   * Creates a PENDING booking that holds the slot for {@link HOLD_MINUTES}.
   * The price is always worked out here from the facility's hourly rate — never
   * taken from the client.
   */
  static async createBooking(userId: string, input: NewBooking) {
    const { facilityId, date, startTime, endTime } = input;

    // 1. The slot must exist and still be free
    await BookingService.assertSlotFree(input);

    // 2. Price
    const amount = await BookingService.priceFor(facilityId, startTime, endTime);
    if (!(amount > 0)) throw new BookingError('This court has no price set.', 409);

    // 3. A lapsed checkout on this exact slot would still trip the unique index
    await BookingService.releaseLapsedHold(facilityId, date, startTime);

    // 4. Insert PENDING booking
    // The DB Unique Constraint will block this if someone else JUST booked it
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
      if (error.code === '23505') { // Postgres Unique Violation code
        throw new BookingError('Slot was just booked by someone else.', 409);
      }
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

    await BookingService.assertSlotFree(input, { allowStarted: true });

    const amount = input.paymentMethod === 'COMPLIMENTARY'
      ? 0
      : input.amount ?? (await BookingService.priceFor(facilityId, startTime, endTime));

    await BookingService.releaseLapsedHold(facilityId, date, startTime);

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
      if (error.code === '23505') throw new BookingError('Slot was just booked by someone else.', 409);
      throw new Error('Failed to create booking: ' + error.message);
    }

    return booking;
  }

  /** Throws a 409 unless `startTime`–`endTime` is one of the facility's free slots on `date`. */
  private static async assertSlotFree(input: NewBooking, options?: SlotOptions) {
    const slots = await SlotService.getSlots(input.facilityId, input.date, options);
    const slot = slots.find((entry) => entry.start_time === input.startTime && entry.end_time === input.endTime);

    if (!slot || !slot.available) {
      throw new BookingError('This slot is no longer available. Please select another time.', 409);
    }
  }

  /** The court's hourly rate × the slot's length, rounded to paise. */
  static async priceFor(facilityId: string, startTime: string, endTime: string): Promise<number> {
    const { data: facility, error } = await supabaseAdmin
      .from('facilities')
      .select('price_per_hour')
      .eq('id', facilityId)
      .single();

    if (error || !facility) throw new BookingError('Facility not found', 404);
    return Math.round(Number(facility.price_per_hour) * (minutesBetween(startTime, endTime) / 60) * 100) / 100;
  }

  /** A lapsed checkout on this exact slot would still trip the unique index. */
  private static async releaseLapsedHold(facilityId: string, date: string, startTime: string) {
    await supabaseAdmin
      .from('bookings')
      .update({ status: 'CANCELLED' })
      .eq('facility_id', facilityId)
      .eq('booking_date', date)
      .eq('start_time', startTime)
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

    if (error?.code === '23505') {
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
  static async getUserBookings(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, booking_date, start_time, end_time, amount_paid, status, payment_status,
        players, razorpay_order_id, paid_at, created_at,
        facilities (
          id, name, is_indoor, has_ac, surface_type,
          venues ( name, address, timezone ),
          sports ( name )
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'CONFIRMED')
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data;
  }
}
