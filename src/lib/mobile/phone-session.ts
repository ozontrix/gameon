/**
 * The renewable phone session GameOn issues after a verified SMS code — the web
 * twin of `gameon-multisports/src/lib/phone-session.ts`.
 *
 * The refresh token is a 30-day credential, so it is treated as one: it is the
 * only thing persisted, the access token is derived from it, and a failed
 * revocation is queued rather than dropped. A browser has one store to work
 * with — `localStorage` — so that is where the credential lives, which is also
 * what the Expo web build did before the handset builds moved to the keychain.
 */

import { api, ApiError } from './api-client';
import type { SessionUser } from './identity';

const STORAGE_KEY = 'gameon.phone-session.v1';
const LOGOUT_KEY = 'gameon.phone-session.pending-logout.v1';

export type PhoneSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  session_expires_at: string;
  user_id: string;
  phone: string;
};

/**
 * What `POST /auth/exchange` answers with: the session above, plus the `success`
 * flag every API route in this project adds. Declared here so the phone login
 * screen can name the shape instead of reaching into an anonymous object.
 */
export type ExchangeResponse = PhoneSession & { success?: boolean };

let current: PhoneSession | null = null;
let generation = 0;
let renewing: Promise<string | null> | null = null;
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<(session: PhoneSession | null) => void>();

function read(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    // A browser with storage disabled — the session simply does not persist.
    return null;
  }
}

function write(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode and full quotas both land here; an in-memory session still works.
  }
}

function remove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do — the in-memory session is already cleared.
  }
}

function persist(session: PhoneSession | null) {
  const operation = writes
    .catch(() => {})
    .then(() => (session ? write(STORAGE_KEY, JSON.stringify(session)) : remove(STORAGE_KEY)));
  writes = operation;
  return operation;
}

function publish(session: PhoneSession | null) {
  current = session;
  api.setToken(session?.access_token ?? null);
  for (const listener of listeners) listener(session);
}

function valid(value: unknown): value is PhoneSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as PhoneSession;
  return (
    typeof s.access_token === 'string' &&
    s.access_token.split('.').length === 3 &&
    typeof s.refresh_token === 'string' &&
    /^[A-Za-z0-9_-]{43}$/.test(s.refresh_token) &&
    Number.isFinite(s.expires_at) &&
    typeof s.session_expires_at === 'string' &&
    Number.isFinite(Date.parse(s.session_expires_at)) &&
    typeof s.user_id === 'string' &&
    typeof s.phone === 'string'
  );
}

/** The phone session as the provider-agnostic identity the screens read. */
export function phoneSessionUser(session: PhoneSession): SessionUser {
  return {
    id: session.user_id,
    provider: 'phone',
    phoneNumber: session.phone,
    email: null,
    fullName: null,
    idToken: null,
    verifiedAt: null,
  };
}

export function subscribePhoneSession(listener: (session: PhoneSession | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hasPhoneSession() {
  return current !== null;
}

/** Takes the credentials `/auth/exchange` just returned and adopts them. */
export async function adoptPhoneSession(value: unknown): Promise<void> {
  if (!valid(value)) {
    throw new Error(
      'The server did not return a renewable phone session. Update the backend before using this app.',
    );
  }
  const epoch = ++generation;
  await persist(value);
  if (epoch !== generation) return;
  publish(value);
}

/** Reads the stored session on a cold start; drops it when it has expired. */
export async function restorePhoneSession(): Promise<PhoneSession | null> {
  const epoch = generation;
  const raw = read(STORAGE_KEY);
  if (epoch !== generation) return current;
  let stored: unknown;
  try {
    stored = raw ? JSON.parse(raw) : null;
  } catch {
    stored = null;
  }
  if (!valid(stored) || Date.parse(stored.session_expires_at) <= Date.now()) {
    await persist(null);
    return null;
  }
  publish(stored);
  return stored;
}

/** One renewal per process. Never replay protected writes after HTTP 401. */
export async function phoneAccessToken(): Promise<string | null> {
  if (!current) return null;
  if (current.expires_at > Date.now() / 1000 + 60) return current.access_token;
  if (renewing) return renewing;
  const session = current;
  const epoch = generation;
  renewing = (async () => {
    try {
      const next: unknown = await api.post('/auth/refresh', { refresh_token: session.refresh_token });
      if (!valid(next)) throw new Error('Invalid session renewal response.');
      if (epoch !== generation) return null;
      await persist(next);
      if (epoch !== generation) return null;
      publish(next);
      return next.access_token;
    } catch (error) {
      if (epoch === generation && error instanceof ApiError && error.status === 401) {
        ++generation;
        publish(null);
        await persist(null);
      }
      // Network failures preserve credentials for recovery; don't silently send a guest request.
      throw error;
    } finally {
      renewing = null;
    }
  })();
  return renewing;
}

/** Persist failed revocations so an offline logout does not silently abandon them. */
export async function retryPhoneLogout(): Promise<void> {
  const raw = read(LOGOUT_KEY);
  const tokens: string[] = raw ? JSON.parse(raw) : [];
  for (const token of tokens) {
    await api.post('/auth/logout', { refresh_token: token });
    const latest: string[] = JSON.parse(read(LOGOUT_KEY) || '[]');
    write(LOGOUT_KEY, JSON.stringify(latest.filter((value) => value !== token)));
  }
}

export async function clearPhoneSession(): Promise<void> {
  const token = current?.refresh_token;
  ++generation;
  publish(null);
  try {
    if (token) {
      const tokens: string[] = JSON.parse(read(LOGOUT_KEY) || '[]');
      write(LOGOUT_KEY, JSON.stringify([...new Set([...tokens, token])]));
    }
  } finally {
    await persist(null);
  }
  try {
    await retryPhoneLogout();
  } catch {
    /* Queued for the next page load. */
  }
}
