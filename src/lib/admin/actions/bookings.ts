'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/db/supabase';
import { BookingError, BookingService } from '@/lib/services/booking.service';
import { NOT_ALLOWED, formValues, invalid, type ActionState } from '../action-result';
import { recordAudit } from '../audit';
import { COUNTER_PAYMENT_METHODS, DEFAULT_COUNTRY_CODE } from '../constants';
import { formatDate, formatTimeRange, shortBookingId } from '../format';
import { authorize } from '../session';

const uuid = z.string().uuid('Choose a valid item.');

/** The customer's app account, when the phone typed at the desk matches one. */
async function findCustomerByPhone(phone: string): Promise<string | null> {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const e164 = phone.trim().startsWith('+') ? `+${digits}` : `+${DEFAULT_COUNTRY_CODE}${digits.slice(-10)}`;
  const { data } = await supabaseAdmin.from('profiles').select('id').eq('phone', e164).limit(1).maybeSingle();
  return data?.id ?? null;
}

function refreshBookingViews(id?: string) {
  revalidatePath('/admin', 'layout');
  if (id) revalidatePath(`/admin/bookings/${id}`);
}

/* ─── Front-desk booking ─────────────────────────────────────────────────── */

const createSchema = z
  .object({
    facilityId: uuid,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
    slot: z.string({ error: 'Choose a time slot.' }).regex(/^\d{2}:\d{2}:\d{2}\|\d{2}:\d{2}:\d{2}$/, 'Choose a time slot.'),
    contactName: z.string({ error: 'Enter the customer’s name.' }).min(2, 'Enter the customer’s name.').max(100),
    contactPhone: z
      .string({ error: 'Enter a phone number.' })
      .regex(/^\+?[\d\s-]{10,16}$/, 'Enter a valid phone number.'),
    players: z.coerce.number().int().min(1).max(50).optional(),
    notes: z.string().max(200).optional(),
    paymentStatus: z.enum(['PAID', 'UNPAID']),
    paymentMethod: z.enum(COUNTER_PAYMENT_METHODS).optional(),
    amount: z.coerce.number().min(0, 'Amount cannot be negative.').max(1_000_000).optional(),
  })
  .refine((v) => v.paymentStatus === 'UNPAID' || v.paymentMethod, {
    path: ['paymentMethod'],
    message: 'Choose how the customer paid.',
  });

export async function createFrontDeskBooking(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('STAFF');
  if (!actor) return NOT_ALLOWED;

  const parsed = createSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;
  const [startTime, endTime] = input.slot.split('|');
  const complimentary = input.paymentMethod === 'COMPLIMENTARY';

  let bookingId: string;
  try {
    const booking = await BookingService.createAdminBooking({
      facilityId: input.facilityId,
      date: input.date,
      startTime,
      endTime,
      contactName: input.contactName,
      contactPhone: input.contactPhone.replace(/[\s-]/g, ''),
      players: input.players,
      notes: input.notes,
      createdBy: actor.id,
      userId: await findCustomerByPhone(input.contactPhone),
      paymentStatus: complimentary ? 'PAID' : input.paymentStatus,
      paymentMethod: input.paymentStatus === 'PAID' || complimentary ? input.paymentMethod : undefined,
      amount: input.amount,
    });
    bookingId = booking.id;

    await recordAudit(actor, 'booking.create', 'booking', booking.id, {
      date: input.date,
      slot: `${startTime}-${endTime}`,
      facility_id: input.facilityId,
      amount: booking.amount_paid,
      payment_status: complimentary ? 'PAID' : input.paymentStatus,
      payment_method: input.paymentMethod ?? null,
      price_overridden: input.amount !== undefined,
    });
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, message: error.message };
    console.error('[admin] create booking failed', error);
    return { ok: false, message: 'Could not create the booking. Please try again.' };
  }

  refreshBookingViews();
  redirect(`/admin/bookings/${bookingId}?created=1`);
}

/* ─── Payments ───────────────────────────────────────────────────────────── */

const recordPaymentSchema = z.object({
  bookingId: uuid,
  paymentMethod: z.enum(COUNTER_PAYMENT_METHODS, { error: 'Choose a payment method.' }),
});

export async function recordPayment(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('STAFF');
  if (!actor) return NOT_ALLOWED;

  const parsed = recordPaymentSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, paymentMethod } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({
      payment_status: 'PAID',
      payment_method: paymentMethod,
      paid_at: new Date().toISOString(),
      ...(paymentMethod === 'COMPLIMENTARY' ? { amount_paid: 0 } : {}),
    })
    .eq('id', bookingId)
    .eq('status', 'CONFIRMED')
    .eq('payment_status', 'UNPAID')
    .select('id, amount_paid')
    .maybeSingle();

  if (error) {
    console.error('[admin] record payment failed', error);
    return { ok: false, message: 'Could not record the payment.' };
  }
  if (!data) return { ok: false, message: 'Only confirmed, unpaid bookings can be marked as paid.' };

  await recordAudit(actor, 'booking.payment_recorded', 'booking', bookingId, {
    payment_method: paymentMethod,
    amount: data.amount_paid,
  });
  refreshBookingViews(bookingId);
  return { ok: true, message: 'Payment recorded.' };
}

/* ─── Cancel & refund (admins) ───────────────────────────────────────────── */

const cancelSchema = z.object({
  bookingId: uuid,
  reason: z.string({ error: 'Give a reason for the cancellation.' }).min(3, 'Give a reason for the cancellation.').max(300),
});

export async function cancelBooking(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = cancelSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, reason } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancelled_by: actor.id,
      cancel_reason: reason,
      expires_at: null,
    })
    .eq('id', bookingId)
    .in('status', ['CONFIRMED', 'PENDING'])
    .select('id, payment_status, amount_paid, booking_date, start_time, end_time')
    .maybeSingle();

  if (error) {
    console.error('[admin] cancel booking failed', error);
    return { ok: false, message: 'Could not cancel the booking.' };
  }
  if (!data) return { ok: false, message: 'This booking is already cancelled.' };

  await recordAudit(actor, 'booking.cancel', 'booking', bookingId, {
    reason,
    payment_status: data.payment_status,
    amount: data.amount_paid,
  });
  refreshBookingViews(bookingId);

  return {
    ok: true,
    message:
      data.payment_status === 'PAID'
        ? `Booking cancelled. ${formatDate(data.booking_date)}, ${formatTimeRange(data.start_time, data.end_time)} is free again — refund it from the Refunds page.`
        : 'Booking cancelled and the slot is free again.',
  };
}

const refundSchema = z.object({
  bookingId: uuid,
  reference: z
    .string({ error: 'Enter the refund reference (e.g. the Razorpay refund ID or a cash note).' })
    .min(3, 'Enter the refund reference (e.g. the Razorpay refund ID or a cash note).')
    .max(120),
});

export async function markRefunded(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = refundSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { bookingId, reference } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update({ payment_status: 'REFUNDED', refunded_at: new Date().toISOString(), refund_reference: reference })
    .eq('id', bookingId)
    .eq('status', 'CANCELLED')
    .eq('payment_status', 'PAID')
    .select('id, amount_paid')
    .maybeSingle();

  if (error) {
    console.error('[admin] mark refunded failed', error);
    return { ok: false, message: 'Could not record the refund.' };
  }
  if (!data) return { ok: false, message: 'Only cancelled bookings that were paid can be marked as refunded.' };

  await recordAudit(actor, 'booking.refund_recorded', 'booking', bookingId, { reference, amount: data.amount_paid });
  refreshBookingViews(bookingId);
  return { ok: true, message: 'Refund recorded.' };
}

/* ─── Check-in ───────────────────────────────────────────────────────────── */

export type CheckInResult = {
  bookingId: string;
  shortId: string;
  facilityName: string;
  userName: string;
  userPhone: string | null;
};

const checkInSchema = z.object({
  code: z.string({ error: 'Scan a QR code or enter a booking ID.' }).min(8, 'Scan a QR code or enter a booking ID.').max(64),
});

/** Resolves a scanned QR (full UUID) or a typed short ID ("#3F2B8C1E") to today's booking. */
async function resolveBookingId(code: string): Promise<string | null> {
  const value = code.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) return value;
  if (!/^[0-9a-f]{8}$/.test(value)) return null;

  const { data } = await supabaseAdmin
    .from('bookings')
    .select('id')
    .gte('id', `${value}-0000-0000-0000-000000000000`)
    .lte('id', `${value}-ffff-ffff-ffff-ffffffffffff`)
    .eq('status', 'CONFIRMED')
    .limit(2);

  return data?.length === 1 ? data[0].id : null;
}

export async function checkInBooking(
  _state: ActionState<CheckInResult>,
  formData: FormData
): Promise<ActionState<CheckInResult>> {
  const actor = await authorize('STAFF');
  if (!actor) return NOT_ALLOWED;

  const parsed = checkInSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);

  const bookingId = await resolveBookingId(parsed.data.code);
  if (!bookingId) return { ok: false, message: 'No confirmed booking matches that code.' };

  try {
    const result = await BookingService.verifyQRCode(bookingId);
    await recordAudit(actor, 'booking.check_in', 'booking', bookingId, {});
    refreshBookingViews(bookingId);
    return {
      ok: true,
      message: `Checked in ${result.userName}.`,
      data: {
        bookingId,
        shortId: shortBookingId(bookingId),
        facilityName: result.facilityName,
        userName: result.userName,
        userPhone: result.userPhone,
      },
    };
  } catch (error) {
    if (error instanceof BookingError) return { ok: false, message: error.message };
    console.error('[admin] check-in failed', error);
    return { ok: false, message: 'Could not check this booking in.' };
  }
}
