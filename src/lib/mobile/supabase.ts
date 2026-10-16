/**
 * Supabase client bootstrap for the mobile web app.
 *
 * Deliberately shaped like `firebase.ts`: the client is built on first use, so a
 * checkout with a blank `.env.local` still renders every screen and the login
 * screens can name the values that are missing rather than throwing at import.
 *
 * Where it differs from the Expo app's copy: this uses `@supabase/ssr`'s
 * `createBrowserClient`, so the session is kept in cookies rather than
 * `localStorage`. That is the same storage the rest of this web app uses, which
 * means the server-side helpers can read the session too.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/** The env keys the client is read from. */
export const SupabaseEnvKeys = {
  url: 'NEXT_PUBLIC_SUPABASE_URL',
  key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
} as const;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Env keys left blank in `.env.local`, quoted back to the developer on screen. */
export const missingSupabaseKeys: string[] = [
  ...(url ? [] : [SupabaseEnvKeys.url]),
  ...(anonKey ? [] : [SupabaseEnvKeys.key]),
];

/** False until `.env.local` carries a project URL and a publishable key. */
export const isSupabaseConfigured = missingSupabaseKeys.length === 0;

let client: SupabaseClient | null = null;

/**
 * The shared client. Throws if `.env.local` is incomplete — callers branch on
 * {@link isSupabaseConfigured} when they want to explain that instead.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  if (!isSupabaseConfigured) {
    throw new Error(`Supabase is not configured. Missing: ${missingSupabaseKeys.join(', ')}`);
  }
  client = createBrowserClient(url, anonKey);
  return client;
}

/** The client if something has already asked for it; `null` before that. */
export function peekSupabaseClient(): SupabaseClient | null {
  return client;
}

/** Reads `code` off anything Supabase throws — auth codes and Postgres codes. */
export function supabaseErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return '';
}

/** Reads the HTTP status Supabase attached to an error, when it has one. */
function supabaseErrorStatus(error: unknown): number | null {
  if (error && typeof error === 'object' && 'status' in error) {
    const { status } = error as { status?: unknown };
    if (typeof status === 'number') return status;
  }
  return null;
}

/** Supabase's codes, in the words the auth screens show. */
const MESSAGES: Record<string, string> = {
  // auth
  invalid_credentials: 'That email and password combination did not work. Check both and try again.',
  email_not_confirmed:
    'Confirm this email address first — open the link we emailed you, then sign in.',
  email_exists: 'That email already has a GameOn account. Sign in instead.',
  user_already_exists: 'That email already has a GameOn account. Sign in instead.',
  weak_password:
    'That password is too easy to guess. Use at least 8 characters with a mix of letters and numbers.',
  same_password: 'Choose a password you have not used on this account before.',
  email_address_invalid: 'That email address was rejected as invalid. Check it and try again.',
  over_email_send_rate_limit:
    'Supabase is limiting confirmation emails for this project — the free plan allows very few per hour. Try again later.',
  over_request_rate_limit: 'Too many attempts. Wait a minute and try again.',
  validation_failed: 'Supabase rejected that request. Check the details and try again.',
  otp_expired: 'That email link has expired. Request a new one.',
  signup_disabled:
    'Email sign-up is switched off for this project. Turn it on under Authentication → Providers → Email.',
  email_provider_disabled:
    'Email sign-up is switched off for this project. Turn it on under Authentication → Providers → Email.',
  // postgres — the codes a client can actually provoke
  '42501': 'The database refused that change: the row does not belong to this account.',
  '23505': 'That record already exists.',
};

/** The one line of reason to show for a failed Supabase call. */
export function describeSupabaseError(error: unknown): string {
  const mapped = MESSAGES[supabaseErrorCode(error)];
  if (mapped) return mapped;

  const status = supabaseErrorStatus(error);
  if (status === 401 || status === 403) {
    return 'Supabase rejected the API key. Check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.';
  }
  if (status !== null && status >= 500) {
    return 'Supabase had a problem with that request. Try again in a moment.';
  }

  if (error instanceof Error && error.message) {
    if (/network request failed|failed to fetch|timed out/i.test(error.message)) {
      return 'No connection to Supabase. Check your network and try again.';
    }
    return error.message;
  }
  return 'Something went wrong talking to Supabase. Please try again.';
}
