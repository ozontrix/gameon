import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

/**
 * Firebase Admin Auth, initialised on first use by the route that needs it.
 *
 * Every API route is bundled on its own, so initialisation must not live as a
 * side effect of some other module — the phone exchange route would otherwise
 * find no default app on a cold start.
 *
 * Returns `null` when `FIREBASE_SERVICE_ACCOUNT` is not set. Callers must refuse
 * the request in that case: an unverified Firebase token proves nothing.
 */
export function getFirebaseAdminAuth(): Auth | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;

  const app = getApps()[0] ?? initializeApp({ credential: cert(parseServiceAccount(raw)) });
  return getAuth(app);
}

function parseServiceAccount(raw: string) {
  const account = JSON.parse(raw);
  // Hosting dashboards often store the key with escaped newlines.
  if (typeof account.private_key === 'string') {
    account.private_key = account.private_key.replace(/\\n/g, '\n');
  }
  return account;
}
