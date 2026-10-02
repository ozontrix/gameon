import 'server-only';

import { supabaseAdmin } from '@/lib/db/supabase';
import { getRazorpay } from '@/lib/razorpay';
import type { Database, Json } from '@/types/database.types';
import type { LeagueConfirmation } from './confirmation';
import { entryReference, type EntryQuote, type LeagueEntry } from './entry';
import { sendLeagueConfirmationEmail } from './email';

export type LeagueBooking = Database['public']['Tables']['league_bookings']['Row'];

export class LeagueBookingError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Frozen at order creation: confirmations never trust a replacement browser entry. */
export function entrySnapshot(entry: LeagueEntry): LeagueConfirmation['entry'] {
  return {
    sport: entry.sport.id, sportName: entry.sport.name,
    categories: entry.categories.map(({ id, name, date, fee, squadSize }) => ({ id, name, date, fee, squadSize })),
    date: entry.date, dates: entry.dates, squadSize: entry.squadSize,
    teamName: entry.teamName, captainName: entry.captainName,
    email: entry.email, phone: entry.phone, city: entry.city, notes: entry.notes,
    addons: entry.addons, coupon: entry.coupon,
  };
}

export function bookingConfirmation(booking: LeagueBooking): LeagueConfirmation {
  if (booking.status !== 'CONFIRMED' || !booking.reference || !booking.razorpay_order_id || !booking.razorpay_payment_id || !booking.paid_at) {
    throw new LeagueBookingError('This entry is not paid yet.', 409);
  }
  return {
    reference: booking.reference, orderId: booking.razorpay_order_id,
    paymentId: booking.razorpay_payment_id, paidAt: booking.paid_at,
    amount: booking.amount_paise / 100, currency: booking.currency,
    emailSent: booking.email_status === 'SENT',
    entry: booking.entry as unknown as LeagueConfirmation['entry'],
    quote: booking.quote as unknown as EntryQuote,
  };
}

export async function createLeagueBooking(entry: LeagueEntry, quote: EntryQuote): Promise<LeagueBooking> {
  const { data, error } = await supabaseAdmin.from('league_bookings').insert({
    sport: entry.sport.id, captain_name: entry.captainName, team_name: entry.teamName,
    email: entry.email, phone: entry.phone, amount_paise: Math.round(quote.total * 100),
    entry: entrySnapshot(entry) as unknown as Json, quote: quote as unknown as Json,
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function attachLeagueOrder(id: string, orderId: string): Promise<void> {
  const { data, error } = await supabaseAdmin.from('league_bookings')
    .update({ razorpay_order_id: orderId }).eq('id', id).is('razorpay_order_id', null).select('id').single();
  if (error) throw error;
  if (!data) throw new Error('Could not persist League order.');
}

/** Atomic lease prevents simultaneous callbacks/webhooks sending duplicate emails. */
export async function deliverLeagueEmail(booking: LeagueBooking): Promise<LeagueConfirmation> {
  const confirmation = bookingConfirmation(booking);
  if (booking.email_status === 'SENT') return confirmation;
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: claimed, error } = await supabaseAdmin.from('league_bookings')
    .update({ email_status: 'SENDING', email_attempted_at: now, email_error: null })
    .eq('id', booking.id).eq('status', 'CONFIRMED')
    .or(`email_status.in.(PENDING,FAILED),and(email_status.eq.SENDING,email_attempted_at.lt.${stale})`)
    .select('*').maybeSingle();
  if (error) throw error;
  if (!claimed) return confirmation;
  const result = await sendLeagueConfirmationEmail(confirmation);
  confirmation.emailSent = result.sent;
  const { error: updateError } = await supabaseAdmin.from('league_bookings').update({
    email_status: result.sent ? 'SENT' : 'FAILED',
    email_sent_at: result.sent ? new Date().toISOString() : null,
    email_error: result.sent ? null : (result.error ?? 'Email delivery failed').slice(0, 500),
  }).eq('id', booking.id).eq('email_attempted_at', now).eq('email_status', 'SENDING');
  if (updateError) console.error('League email status update failed:', updateError);
  return confirmation;
}

/** The browser and signed webhook converge on the same captured-payment record. */
export async function confirmLeaguePayment(orderId: string, paymentId: string): Promise<LeagueConfirmation> {
  const { data: found, error } = await supabaseAdmin.from('league_bookings')
    .select('*').eq('razorpay_order_id', orderId).maybeSingle();
  if (error) throw error;
  if (!found) throw new LeagueBookingError('This League order was not found. Contact the desk with your payment ID.', 404);
  let booking = found;
  if (booking.status === 'CONFIRMED') {
    if (booking.razorpay_payment_id !== paymentId) throw new LeagueBookingError('This order already has a different payment.', 409);
  } else {
    const payment = await getRazorpay().payments.fetch(paymentId);
    if (payment.order_id !== orderId || Number(payment.amount) !== booking.amount_paise || payment.currency !== booking.currency) {
      throw new LeagueBookingError('Payment details do not match this entry.', 409);
    }
    if (payment.status !== 'captured') throw new LeagueBookingError('Payment capture is still pending. Your entry will confirm once captured; please do not pay again.', 409);
    const { data: updated, error: writeError } = await supabaseAdmin.from('league_bookings').update({
      status: 'CONFIRMED', razorpay_payment_id: paymentId,
      reference: entryReference(orderId, paymentId), paid_at: new Date().toISOString(),
    }).eq('id', booking.id).eq('status', 'PENDING').select('*').maybeSingle();
    if (writeError) throw writeError;
    if (updated) booking = updated;
    else {
      const { data: existing, error: readError } = await supabaseAdmin.from('league_bookings').select('*').eq('id', booking.id).single();
      if (readError) throw readError;
      if (existing.razorpay_payment_id !== paymentId) throw new LeagueBookingError('Payment conflict. Please contact the desk.', 409);
      booking = existing;
    }
  }
  // The booking is durable before SMTP; never undo a paid booking for an email failure.
  try { return await deliverLeagueEmail(booking); }
  catch (emailError) { console.error('League email delivery failed:', emailError); return bookingConfirmation(booking); }
}