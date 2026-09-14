import { supabaseAdmin } from '../db/supabase';
import { SlotService } from './slot.service';

export class BookingService {
  /**
   * Creates a PENDING booking, temporarily locking the slot for 10 minutes.
   */
  static async createBooking(
    userId: string,
    facilityId: string,
    date: string,
    startTime: string,
    endTime: string,
    amount: number
  ) {
    // 1. Double check slot availability right before booking
    const availableSlots = await SlotService.getAvailableSlots(facilityId, date);
    const isAvailable = availableSlots.some(
      (slot) => slot.start_time === startTime && slot.end_time === endTime
    );

    if (!isAvailable) {
      throw new Error('This slot is no longer available. Please select another time.');
    }

    // 2. Calculate Expiration (10 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // 3. Check if userId is a valid UUID (Firebase UIDs are not)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
    const validUserId = isUUID ? userId : null;

    // 4. Insert PENDING booking
    // The DB Unique Constraint will block this if someone else JUST booked it
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: validUserId,
        facility_id: facilityId,
        booking_date: date,
        start_time: startTime,
        end_time: endTime,
        amount_paid: amount,
        status: 'PENDING',
        payment_status: 'UNPAID',
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') { // Postgres Unique Violation code
        throw new Error('Slot was just booked by someone else.');
      }
      throw new Error('Failed to create booking: ' + error.message);
    }

    return booking;
  }

  /**
   * Called by your Payment Gateway Webhook (e.g. Razorpay/Stripe) to confirm payment
   */
  static async confirmBooking(bookingId: string) {
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'CONFIRMED',
        payment_status: 'PAID',
        expires_at: null, // Clear expiration since it's paid
      })
      .eq('id', bookingId)
      .select('id, booking_date, start_time')
      .single();

    if (error) throw new Error('Failed to confirm booking');
    
    // The `data.id` (UUID) returned here will be used by the app to generate the QR code
    return data;
  }

  /**
   * Admin Function: Verifies a QR Code (Booking UUID) scanned at the venue
   */
  static async verifyQRCode(bookingId: string) {
    // 1. Fetch booking with user details
    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, status, is_scanned, booking_date, start_time, 
        users (name, phone),
        facilities (name)
      `)
      .eq('id', bookingId)
      .single();

    if (error || !booking) throw new Error('Invalid QR Code. Booking not found.');

    // 2. Validate Status
    if (booking.status !== 'CONFIRMED') {
      throw new Error(`Booking is not confirmed. Current status: ${booking.status}`);
    }

    // 3. Validate if already scanned (Screenshot Prevention)
    if (booking.is_scanned) {
      throw new Error('QR Code has already been used for entry!');
    }

    // 4. Validate Date (Must be today)
    const today = new Date().toISOString().split('T')[0];
    if (booking.booking_date !== today) {
      throw new Error(`Invalid Date! This booking is for ${booking.booking_date}.`);
    }

    // 5. Update to Scanned
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        is_scanned: true,
        scanned_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) throw new Error('Failed to update scan status');

    // 6. Return success with User Info for verbal check
    // @ts-ignore - Supabase type joins can be tricky, casting safely
    const user = booking.users as unknown as { name: string, phone: string };
    // @ts-ignore
    const facility = booking.facilities as unknown as { name: string };

    return {
      success: true,
      message: 'Access Granted',
      facilityName: facility.name,
      userName: user.name,
      userPhone: user.phone,
    };
  }

  static async getUserBookings(userId: string) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
    const validUserId = isUUID ? userId : null;

    if (!validUserId) {
       // Mock Firebase user workaround: return all bookings for this fake user session?
       // Let's query by user_id IS NULL to show the ones they just created.
       const { data, error } = await supabaseAdmin
        .from('bookings')
        .select(`
          id, booking_date, start_time, end_time, amount_paid, status, payment_status,
          facilities (
            id, name, is_indoor, is_ac,
            venues ( name, address ),
            sports ( name )
          )
        `)
        .is('user_id', null)
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false });

       if (error) throw error;
       return data;
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id, booking_date, start_time, end_time, amount_paid, status, payment_status,
        facilities (
          id, name, is_indoor, is_ac,
          venues ( name, address ),
          sports ( name )
        )
      `)
      .eq('user_id', validUserId)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data;
  }
}
