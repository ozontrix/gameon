import 'server-only';
import { supabaseAdmin } from '@/lib/db/supabase';
import { OPEN_PLAY_DATE } from './constants';
import type { OpenPlayRegistrationInput } from './registration';
import type { Database } from '@/types/database.types';
import { sendOpenPlayConfirmationEmail } from './email';

export type OpenPlayRegistration = Database['public']['Tables']['open_play_registrations']['Row'];

export async function saveOpenPlayRegistration(input: OpenPlayRegistrationInput) {
  const { data, error } = await supabaseAdmin.from('open_play_registrations').upsert({
    event_date: OPEN_PLAY_DATE, sport: input.sport, full_name: input.fullName,
    phone: input.phone, email: input.email, city: input.city, email_status: 'PENDING',
    contact_consent: input.contactConsent, marketing_consent: input.marketingConsent,
    attribution: input.attribution ?? {},
  }, { onConflict: 'event_date,phone,sport', ignoreDuplicates: true }).select('*').maybeSingle();
  if (error) throw new Error('Open play registration could not be saved.');
  // A retry never overwrites another attendee's details or reveals their record.
  return { created: Boolean(data), registrationId: data?.id ?? null, registration: data };
}

/** Atomic delivery lease prevents concurrent requests/admin retries from emailing twice. */
export async function deliverOpenPlayEmail(registration: OpenPlayRegistration): Promise<boolean> {
  if (registration.email_status === 'SENT') return true;
  if (!registration.email) return false;
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: claimed, error } = await supabaseAdmin.from('open_play_registrations')
    .update({ email_status: 'SENDING', email_attempted_at: now, email_error: null }).eq('id', registration.id)
    .or(`email_status.in.(PENDING,FAILED,SKIPPED),and(email_status.eq.SENDING,email_attempted_at.lt.${stale})`)
    .select('*').maybeSingle();
  if (error) throw new Error('Unable to claim confirmation email.');
  if (!claimed) return false;
  const result = await sendOpenPlayConfirmationEmail(claimed);
  const { error: updateError } = await supabaseAdmin.from('open_play_registrations').update({
    email_status: result.sent ? 'SENT' : 'FAILED', email_sent_at: result.sent ? new Date().toISOString() : null,
    email_error: result.sent ? null : (result.error ?? 'Email delivery failed').slice(0, 500),
  }).eq('id', registration.id).eq('email_attempted_at', now).eq('email_status', 'SENDING');
  if (updateError) console.error('Open play: could not update confirmation email status.');
  return result.sent;
}