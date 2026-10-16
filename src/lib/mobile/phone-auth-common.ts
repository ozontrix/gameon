/**
 * The parts of phone sign-in that are the same on every platform, plus the
 * error vocabulary the login screens show.
 *
 * Split out from `phone-auth.ts` so a module can describe a phone-auth failure
 * — or format a number the way the field expects — without pulling the Firebase
 * bundle in. This mirrors `phone-auth-common.ts` in the Expo app.
 */

/** The country code dialled ahead of the ten digits the login screen collects. */
export const PhoneCountryCode =
  (process.env.NEXT_PUBLIC_PHONE_COUNTRY_CODE ?? '91').replace(/\D/g, '') || '91';

export type PhoneAuthUser = {
  uid: string;
  phoneNumber: string | null;
  idToken: string;
};

export class PhoneAuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PhoneAuthError';
    this.code = code;
  }
}

/** `9876543210` → `+919876543210`. Digits only, so a formatted entry still works. */
export function toE164(nationalNumber: string): string {
  return `+${PhoneCountryCode}${nationalNumber.replace(/\D/g, '')}`;
}

/** What the OTP step shows so the number is recognisable without echoing it back. */
export function maskPhoneNumber(nationalNumber: string): string {
  return `+${PhoneCountryCode} •••••${nationalNumber.replace(/\D/g, '').slice(-4)}`;
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-phone-number': 'That mobile number looks incomplete. Check it and try again.',
  'auth/missing-phone-number': 'Enter your 10-digit mobile number.',
  'auth/too-many-requests': 'Too many attempts from this device. Wait a few minutes and try again.',
  'auth/quota-exceeded': "Today's SMS quota is used up. Try again later.",
  'auth/invalid-verification-code': 'That code is not right. Check the 6 digits and try again.',
  'auth/invalid-verification-id': 'That code is not right. Check the 6 digits and try again.',
  'auth/code-expired': 'That code has expired. Tap Resend OTP for a new one.',
  'auth/session-expired': 'The verification session expired. Tap Resend OTP to start again.',
  'auth/captcha-check-failed': "Google's reCAPTCHA check did not pass. Reload the page and try again.",
  'auth/invalid-app-credential': "Google's reCAPTCHA check was rejected. Reload the page and try again.",
  'auth/missing-app-credential': "Google's reCAPTCHA check did not run. Reload the page and try again.",
  'auth/unauthorized-domain':
    'This domain is not authorised in Firebase. Add it under Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed':
    'Phone sign-in is switched off in Firebase. Turn on the Phone provider under Authentication → Sign-in method.',
  'auth/invalid-api-key': 'The Firebase API key looks wrong. Check NEXT_PUBLIC_FIREBASE_API_KEY.',
  'auth/network-request-failed': 'No connection. Check your network and try again.',
  'auth/internal-error': 'Firebase could not complete that. Try again in a moment.',
};

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return '';
}

/** The one line of reason to show for a failed phone-auth step. */
export function describePhoneAuthError(error: unknown): string {
  const mapped = MESSAGES[errorCode(error)];
  if (mapped) return mapped;
  if (error instanceof Error && error.message) return error.message.replace(/^Firebase:\s*/, '');
  return 'Something went wrong. Please try again.';
}

export function asPhoneAuthError(error: unknown): PhoneAuthError {
  if (error instanceof PhoneAuthError) return error;
  return new PhoneAuthError(errorCode(error) || 'auth/unknown', describePhoneAuthError(error));
}
