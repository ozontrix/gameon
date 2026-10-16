/**
 * Who the app believes is signed in, whichever provider proved it.
 *
 * The two identities live side by side because the login screen offers both:
 * `phone` is a Firebase phone session, `email` is a Supabase email session.
 * Nothing downstream has to care which one it was — and when the two are linked
 * (a player who verifies both) only these mappers change.
 *
 * The provider modules are imported as types only, so this stays free of the
 * Firebase and Supabase bundles.
 */

import type { User } from '@supabase/supabase-js';

import type { PhoneAuthUser } from './phone-auth-common';

export type AuthProvider = 'phone' | 'email';

export type SessionUser = {
  /** The identity the provider issued: a Firebase uid or a Supabase user id. */
  id: string;
  /** Which provider verified this visitor. */
  provider: AuthProvider;
  fullName: string | null;
  email: string | null;
  /** E.164 when known, e.g. `+919876543210`. */
  phoneNumber: string | null;
  /** Firebase ID token for a fresh phone session; `null` for an email session. */
  idToken: string | null;
  /** ISO timestamp of provider verification, when the provider reports one. */
  verifiedAt: string | null;
};

/** A session Firebase verified by SMS code. */
export function sessionUserFromPhone(user: PhoneAuthUser): SessionUser {
  return {
    id: user.uid,
    provider: 'phone',
    fullName: null,
    email: null,
    phoneNumber: user.phoneNumber,
    idToken: user.idToken,
    verifiedAt: new Date().toISOString(),
  };
}

/** A session Supabase verified by email and password. */
export function sessionUserFromSupabase(user: User): SessionUser {
  const metadata = user.user_metadata as { full_name?: unknown } | undefined;
  const name = typeof metadata?.full_name === 'string' ? metadata.full_name.trim() : '';
  const provider = user.app_metadata?.provider === 'phone' ? 'phone' : 'email';

  return {
    id: user.id,
    provider,
    fullName: name || null,
    email: user.email ?? null,
    // Supabase only fills `phone` once the project's phone provider is used.
    phoneNumber: user.phone ?? null,
    idToken: null,
    verifiedAt: (provider === 'phone' ? user.phone_confirmed_at : user.email_confirmed_at) ?? null,
  };
}

/**
 * The last 10 digits of a phone number — what the app's 10-digit form fields
 * expect, whether the stored value is `+919876543210`, `919876543210` or
 * `98765 43210`.
 */
export function nationalNumber(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '').slice(-10);
}
