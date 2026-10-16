/**
 * Firebase phone (SMS OTP) sign-in — the two steps behind the phone login
 * screen, and the web twin of `phone-auth.web.ts` in the Expo app.
 *
 *   sendPhoneOtp()    Firebase texts a 6-digit code; we hold the confirmation
 *   confirmPhoneOtp() the code is exchanged for a Firebase user and ID token
 *   resetPhoneAuth()  drop the pending confirmation and the reCAPTCHA widget
 *
 * The web SDK renders its own invisible reCAPTCHA badge, so no AppVerifier has
 * to be supplied from outside — that is the one place this build is simpler
 * than the handset one.
 *
 * The pending `ConfirmationResult` is not renderable state — it is held here as
 * a module singleton so the screen only has to carry the digits the user typed.
 */

import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';

import { getFirebaseAuth, isFirebaseConfigured, missingFirebaseKeys } from './firebase';
import { PhoneAuthError, asPhoneAuthError, toE164, type PhoneAuthUser } from './phone-auth-common';

export {
  PhoneAuthError,
  asPhoneAuthError,
  describePhoneAuthError,
  maskPhoneNumber,
  toE164,
} from './phone-auth-common';
export type { PhoneAuthUser } from './phone-auth-common';

/** The id of the element Firebase renders Google's badge into. */
const RECAPTCHA_CONTAINER_ID = 'gameon-firebase-recaptcha';

let confirmation: ConfirmationResult | null = null;
let verifier: RecaptchaVerifier | null = null;

function notConfiguredError(): PhoneAuthError {
  return new PhoneAuthError(
    'app/not-configured',
    `Phone sign-in is not set up yet. Add ${missingFirebaseKeys.join(', ')} to .env.local, then restart the dev server.`,
  );
}

function recaptchaUnavailableError(): PhoneAuthError {
  return new PhoneAuthError(
    'app/recaptcha-unavailable',
    'The reCAPTCHA check could not start. Reopen the login screen and try again.',
  );
}

function noPendingVerificationError(): PhoneAuthError {
  return new PhoneAuthError(
    'app/no-pending-verification',
    'That code has expired. Tap Resend OTP to get a new one.',
  );
}

/**
 * The invisible reCAPTCHA widget, created on first use and reused for the life
 * of the sign-in attempt. Firebase renders its badge into an element of our
 * own so the container can be found again for `clear()`.
 */
function getRecaptchaVerifier(): RecaptchaVerifier {
  if (verifier) return verifier;
  if (typeof document === 'undefined') throw recaptchaUnavailableError();

  const existing = document.getElementById(RECAPTCHA_CONTAINER_ID);
  const container = existing ?? document.createElement('div');
  if (!existing) {
    container.id = RECAPTCHA_CONTAINER_ID;
    document.body.appendChild(container);
  }

  verifier = new RecaptchaVerifier(getFirebaseAuth(), container, { size: 'invisible' });
  return verifier;
}

/**
 * Tears the widget down. Called whenever an attempt fails — a rejected or spent
 * verifier cannot be reused, and the next attempt deserves a clean one — and
 * from `resetPhoneAuth` when the user edits their number.
 */
export function clearPhoneRecaptcha(): void {
  if (verifier) {
    try {
      verifier.clear();
    } catch {
      // Already detached — the SDK is the one that owns the element now.
    }
    verifier = null;
  }
  if (typeof document !== 'undefined') {
    document.getElementById(RECAPTCHA_CONTAINER_ID)?.remove();
  }
}

/**
 * Step 1 — text a code to `nationalNumber` (the ten digits the field collects).
 * Resolves once Firebase has accepted the request, which is the moment the OTP
 * step becomes truthful about having sent something.
 */
export async function sendPhoneOtp(nationalNumber: string): Promise<void> {
  if (!isFirebaseConfigured) throw notConfiguredError();

  try {
    confirmation = await signInWithPhoneNumber(
      getFirebaseAuth(),
      toE164(nationalNumber),
      getRecaptchaVerifier(),
    );
  } catch (error) {
    confirmation = null;
    clearPhoneRecaptcha();
    throw asPhoneAuthError(error);
  }
}

/**
 * Step 2 — exchange the six digits the user typed for a Firebase session. The
 * ID token returned is what `/api/v1/auth/exchange` verifies before it will
 * mint a GameOn phone session.
 */
export async function confirmPhoneOtp(code: string): Promise<PhoneAuthUser> {
  if (!isFirebaseConfigured) throw notConfiguredError();
  if (!confirmation) throw noPendingVerificationError();

  try {
    const credential = await confirmation.confirm(code);
    confirmation = null;
    const { uid, phoneNumber } = credential.user;
    return { uid, phoneNumber, idToken: await credential.user.getIdToken() };
  } catch (error) {
    throw asPhoneAuthError(error);
  }
}

/** Forgets the pending verification — "Wrong number? Edit", and Logout. */
export function resetPhoneAuth(): void {
  confirmation = null;
  clearPhoneRecaptcha();
}
