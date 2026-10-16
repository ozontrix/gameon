/**
 * Firebase client bootstrap — the web twin of
 * `gameon-multisports/src/lib/firebase.ts`.
 *
 * The credentials are the ones from the **web app** registered in the Firebase
 * console (Project settings → Your apps → Web app) and they live in
 * `.env.local` as `NEXT_PUBLIC_*`. Nothing here touches the network at import
 * time: the Firebase app is created on the first phone sign-in attempt, so a
 * checkout without credentials still renders every screen and the login screen
 * can name exactly what is missing.
 *
 * A Firebase web config is an identifier rather than a secret — it ships in the
 * client by design. Restrict the API key by HTTP referrer in Google Cloud
 * Console instead of trying to hide it.
 */

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, signOut as firebaseSignOut, type Auth } from 'firebase/auth';

/** The env keys the config is read from, in Firebase console order. */
export const FirebaseEnvKeys = {
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
  measurementId: 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
} as const;

/**
 * Every value is read as `process.env.NEXT_PUBLIC_…` with dot notation and
 * nothing else — Next.js inlines that exact expression at build time, so a
 * destructured or computed lookup would silently resolve to `undefined`.
 */
const options: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Phone sign-in needs these four; Storage and Cloud Messaging are not part of
 * the login flow, so a blank bucket or sender ID is not treated as a fault.
 */
const REQUIRED_FIELDS = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;

/** Env keys left blank in `.env.local`, quoted back to the developer on screen. */
export const missingFirebaseKeys: string[] = REQUIRED_FIELDS.filter((field) => !options[field]).map(
  (field) => FirebaseEnvKeys[field],
);

/** False until `.env.local` carries a usable web config. */
export const isFirebaseConfigured = missingFirebaseKeys.length === 0;

/**
 * The web API key, for the calls that go straight to Google's REST API.
 * `authDomain` doubles as a trusted origin: the reCAPTCHA widget loads under
 * `https://<authDomain>`, which Firebase always lists as an authorised domain,
 * so Google renders it without a domain error.
 */
export const firebaseApiKey = options.apiKey ?? '';
export const firebaseAuthDomain = options.authDomain ?? '';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

/** The Firebase app, created on first use. Throws if `.env.local` is incomplete. */
export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    if (!isFirebaseConfigured) {
      throw new Error(`Firebase is not configured. Missing: ${missingFirebaseKeys.join(', ')}`);
    }
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(options);
  }
  return firebaseApp;
}

/**
 * The shared Auth instance. On the web it persists the session in
 * `localStorage`, which is what lets a verified number survive a page reload.
 */
export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) firebaseAuth = getAuth(getFirebaseApp());
  return firebaseAuth;
}

/**
 * Drops the Firebase session. A no-op when phone sign-in never ran, so logging
 * out of the app never has to know whether Firebase was involved.
 */
export async function signOutOfFirebase(): Promise<void> {
  if (!firebaseAuth) return;
  await firebaseSignOut(firebaseAuth);
}
