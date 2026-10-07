import 'server-only';
import { supabaseAdmin } from '@/lib/db/supabase';
import { OPEN_PLAY_DATE } from './constants';
import type { OpenPlayRegistrationInput } from './registration';

export async function saveOpenPlayRegistration(input: OpenPlayRegistrationInput) {
  const { data, error } = await supabaseAdmin.from('open_play_registrations').upsert({
    event_date: OPEN_PLAY_DATE, sport: input.sport, full_name: input.fullName,
    phone: input.phone, email: input.email || null, city: input.city,
    contact_consent: input.contactConsent, marketing_consent: input.marketingConsent,
    attribution: input.attribution ?? {},
  }, { onConflict: 'event_date,phone,sport', ignoreDuplicates: true }).select('id').maybeSingle();
  if (error) throw new Error('Open play registration could not be saved.');
  // A retry never overwrites another attendee's details or reveals their record.
  return { created: Boolean(data), registrationId: data?.id ?? null };
}