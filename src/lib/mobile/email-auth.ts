/**
 * Supabase email + password sign-in — what the email login screen calls, and
 * the web twin of `gameon-multisports/src/lib/email-auth.ts`.
 *
 *   signUpWithEmail()          creates the auth user; the profile row follows by trigger
 *   signInWithEmail()          email + password → a session
 *   resendConfirmationEmail()  re-sends the confirmation link
 *   signOutOfSupabase()        drops the session
 *
 * New confirmation emails always land on the production website. After
 * verification the player returns to the app and signs in with their password.
 */

import { normaliseReferralCode } from './referral';
import { getSupabaseClient, peekSupabaseClient } from './supabase';

/**
 * Where Supabase sends a player once they open the confirmation email.
 *
 * This exact HTTPS URL has to be allowed under Authentication → URL
 * Configuration in the Supabase dashboard. It is deliberately independent of
 * the development host and of the `/app` route, so a confirmation email never
 * sends a player to localhost.
 */
export function emailConfirmRedirectTo(): string {
  return 'https://gameonmultisports.com/email-confirmed';
}

/**
 * What `supabase.auth.signUp` means for the screen that called it.
 *
 * `confirm-email` is the normal path: the account exists, but no session is
 * issued until the link in the email is opened.
 */
export type SignUpOutcome =
  | { kind: 'signed-in' }
  | { kind: 'confirm-email' }
  | { kind: 'already-registered' };

export type SignUpDetails = {
  fullName: string;
  email: string;
  password: string;
  /** A friend's code, when they were invited. Applied by `handle_new_user`. */
  referralCode?: string;
};

export async function signUpWithEmail({
  fullName,
  email,
  password,
  referralCode,
}: SignUpDetails): Promise<SignUpOutcome> {
  const code = normaliseReferralCode(referralCode ?? '');

  const { data, error } = await getSupabaseClient().auth.signUp({
    email: email.trim(),
    password,
    options: {
      // Lands in `raw_user_meta_data`; the `handle_new_user` trigger copies the
      // name into `public.profiles.full_name` and matches `referral_code`
      // against `profiles.referral_code` to attribute the referral.
      data: {
        full_name: fullName.trim(),
        ...(code ? { referral_code: code } : {}),
      },
      emailRedirectTo: emailConfirmRedirectTo(),
    },
  });
  if (error) throw error;

  // Email confirmation switched off in the dashboard: Supabase signs them in.
  if (data.session) return { kind: 'signed-in' };

  // With confirmation on, Supabase hides whether an address is taken by
  // returning a user with no identities. That empty list is the duplicate signal.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return { kind: 'already-registered' };
  }

  return { kind: 'confirm-email' };
}

export async function signInWithEmail({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<void> {
  // Only one provider may be signed in at a time: a phone session left behind
  // would keep sending the phone identity to the API.
  const { clearPhoneSession } = await import('./phone-session');
  await clearPhoneSession();

  const { error } = await getSupabaseClient().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: emailConfirmRedirectTo() },
  });
  if (error) throw error;
}

/** Drops the Supabase session. A no-op when the client was never created. */
export async function signOutOfSupabase(): Promise<void> {
  const supabase = peekSupabaseClient();
  if (!supabase) return;
  // Local credentials must disappear even when the auth server is offline.
  await supabase.auth.signOut({ scope: 'local' });
}
