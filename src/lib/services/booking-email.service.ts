import 'server-only';
import { after } from 'next/server';
import { supabaseAdmin } from '../db/supabase';
import type { Tables } from '@/types/database.types';
import { createSmtpTransport, GAMEON_NOTIFICATION_EMAIL, getSmtpConfig, getSmtpFailure, smtpAcceptedAll } from '../email/smtp';
import { bookingConfirmationTemplate, type ConfirmationDetails } from '../email/booking-template';
import { generateBookingQr, type QrCategory } from '../whatsapp/qr';
import { bookingTimeRange, longDate } from '../whatsapp/template';

type Delivery = Tables<'booking_emails'>;
export const isBookingEmailAddress = (value: string | null): value is string => Boolean(value && value.length <= 200 && /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(value));

export class BookingEmailService {
  /** The trigger owns durable enqueue; delivery runs after the checkout response. */
  static schedule(category: QrCategory, id: string) {
    try { after(async () => {
      try { await BookingEmailService.drain(1, category, id); }
      catch { console.error('[booking-email] delivery deferred to worker', category, id); }
    }); } catch { /* Cron also handles confirmations outside HTTP requests. */ }
  }

  static async loadDetails(category: QrCategory, id: string): Promise<ConfirmationDetails | null> {
    if (category === 'booking') {
      const { data: row, error } = await supabaseAdmin.from('bookings')
        .select('id,status,contact_name,booking_date,start_time,end_time,players,amount_paid,payment_status,wallet_points_used,facilities(name,venues(name,address,timezone),court_types(sports(name)))')
        .eq('id', id).maybeSingle();
      if (error) throw error;
      if (!row || row.status !== 'CONFIRMED') return null;
      const facility = row.facilities; const venue = facility?.venues;
      return { category, id, name: row.contact_name || 'Player', title: facility?.court_types?.sports?.name || 'Court booking',
        date: longDate(row.booking_date), time: bookingTimeRange(row.start_time, row.end_time),
        venue: venue?.name || 'GameOn Multi Sports', address: venue?.address || '', timezone: venue?.timezone || 'Asia/Kolkata',
        amount: Number(row.amount_paid || 0), paymentStatus: row.payment_status,
        extras: [['Court', facility?.name || ''], ['Players', row.players ? String(row.players) : ''],
          ['GameOn Points used', row.wallet_points_used ? String(row.wallet_points_used) : '']],
      };
    }
    if (category === 'event') {
      const { data: row, error } = await supabaseAdmin.from('event_orders')
        .select('id,status,attendee_name,tickets,amount_paid,payment_status,events(title,starts_on,ends_on,daily_start_time,daily_end_time,venues(name,address,timezone))')
        .eq('id', id).maybeSingle();
      if (error) throw error;
      if (!row || row.status !== 'CONFIRMED') return null;
      const event = row.events; const venue = event?.venues;
      return { category, id, name: row.attendee_name, title: event?.title || 'Event',
        date: BookingEmailService.dateRange(event?.starts_on, event?.ends_on), time: bookingTimeRange(event?.daily_start_time, event?.daily_end_time),
        venue: venue?.name || 'GameOn Multi Sports', address: venue?.address || '', timezone: venue?.timezone || 'Asia/Kolkata',
        amount: Number(row.amount_paid || 0), paymentStatus: row.payment_status, extras: [['Tickets', String(row.tickets)]],
      };
    }
    const { data: row, error } = await supabaseAdmin.from('tournament_registrations')
      .select('id,status,captain_name,team_name,amount_paid,payment_status,tournaments(title,starts_on,ends_on,daily_start_time,daily_end_time,venues(name,address,timezone))')
      .eq('id', id).maybeSingle();
    if (error) throw error;
    if (!row || row.status !== 'CONFIRMED') return null;
    const tournament = row.tournaments; const venue = tournament?.venues;
    return { category, id, name: row.captain_name, title: tournament?.title || 'Tournament',
      date: BookingEmailService.dateRange(tournament?.starts_on, tournament?.ends_on), time: bookingTimeRange(tournament?.daily_start_time, tournament?.daily_end_time),
      venue: venue?.name || 'GameOn Multi Sports', address: venue?.address || '', timezone: venue?.timezone || 'Asia/Kolkata',
      amount: Number(row.amount_paid || 0), paymentStatus: row.payment_status, extras: [['Team', row.team_name], ['Captain', row.captain_name]],
    };
  }

  private static dateRange(start?: string, end?: string) {
    return start ? `${longDate(start)}${end && end !== start ? ` – ${longDate(end)}` : ''}` : 'See your booking in the app';
  }

  private static async update(row: Delivery, patch: Partial<Delivery>) {
    const { data, error } = await supabaseAdmin.from('booking_emails').update(patch)
      .eq('id', row.id).eq('lease_id', row.lease_id!).in('status', ['processing', 'sending']).select('id').maybeSingle();
    if (error || !data) throw new Error('Email delivery lease unavailable');
  }

  static async deliver(row: Delivery) {
    const config = getSmtpConfig();
    if (!config) throw new Error('SMTP configuration unavailable');
    let sending = false; let accepted = false;
    let transport: ReturnType<typeof createSmtpTransport> | undefined;
    try {
      if (!isBookingEmailAddress(row.recipient)) {
        await BookingEmailService.update(row, { status: 'skipped', error_code: 'NO_VALID_EMAIL', locked_until: null }); return;
      }
      const details = await BookingEmailService.loadDetails(row.category as QrCategory, row.reference_id);
      if (!details) { await BookingEmailService.update(row, { status: 'skipped', error_code: 'NOT_CONFIRMED', locked_until: null }); return; }
      const template = bookingConfirmationTemplate(details);
      const qr = await generateBookingQr(details.category, details.id);
      transport = createSmtpTransport(config);
      await BookingEmailService.update(row, { status: 'sending' });
      sending = true;
      const result = await transport.sendMail({ from: config.from, to: row.recipient, replyTo: GAMEON_NOTIFICATION_EMAIL,
        ...template, messageId: `<confirmation-${row.id}@gameonmultisports.com>`,
        attachments: [{ filename: qr.filename, content: Buffer.from(qr.bytes), contentType: 'image/png', cid: 'booking-qr' }],
      });
      if (!smtpAcceptedAll(result.accepted, [row.recipient])) throw Object.assign(new Error('Recipient rejected'), { code: 'EENVELOPE', command: 'RCPT TO' });
      accepted = true;
      await BookingEmailService.update(row, { status: 'sent', sent_at: new Date().toISOString(), error_code: null, locked_until: null });
    } catch (error) {
      const failure = getSmtpFailure(error);
      const uncertain = accepted || (sending && !failure.responseCode && !['EAUTH','EDNS','ECONNECTION','ECONNREFUSED','EENVELOPE','ETLS'].includes(failure.code));
      console.error('[booking-email] delivery not completed', row.id, failure.reason);
      await BookingEmailService.update(row, {
        status: uncertain ? 'unknown' : 'failed', error_code: uncertain ? 'SMTP_OUTCOME_UNKNOWN' : failure.reason,
        locked_until: null, available_at: new Date(Date.now() + Math.min(3_600_000, 60_000 * 2 ** row.attempts)).toISOString(),
      });
    } finally { transport?.close(); }
  }

  static async drain(limit = 5, category?: QrCategory, referenceId?: string) {
    if (!getSmtpConfig()) return { configured: false, processed: 0 };
    let processed = 0;
    for (; processed < limit; processed++) {
      const { data, error } = await supabaseAdmin.rpc('claim_booking_emails', { p_category: category, p_reference_id: referenceId });
      if (error) throw error;
      if (!data?.[0]) break;
      await BookingEmailService.deliver(data[0]);
    }
    return { configured: true, processed };
  }
}