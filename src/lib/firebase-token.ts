/**
 * Firebase ID token verification — the backend's proof that a phone number was
 * really confirmed by SMS.
 *
 * An ID token is an RS256 JWT that Google signs, so it can be checked without
 * the Admin SDK: the signature is verified against Google's published keys and
 * the `iss`, `aud` and `exp` claims against the project. What is left over — the
 * phone number and the Firebase UID — is exactly what the client proved.
 *
 * `firebase-admin` was removed from this path on purpose. Turbopack externalises
 * it and resolves it through a build-time alias symlink
 * (`node_modules/firebase-admin-<hash>`), which serverless packaging does not
 * reproduce, so the module failed to load in production and every request to the
 * route answered 500 before the handler ran. `jose` is bundled inline — it
 * already mints the Supabase token next door — so nothing here can go missing at
 * runtime. It also drops the service-account JSON requirement: the public keys
 * are public.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

/** Google's public keys for Firebase ID tokens (the JWK twin of its x509 set). */
const DEFAULT_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/**
 * The GameOn Firebase project. A project id is an identifier, not a secret — it
 * ships in every client build — so defaulting to it keeps production working
 * without a new environment variable.
 */
const DEFAULT_PROJECT_ID = 'gameon-multisports';

/** What a verified token tells us about the player. */
export interface VerifiedPhoneUser {
  /** The number Firebase verified, in E.164 (`+919876543210`). */
  phoneNumber: string;
  /** The Firebase UID — for logs. Supabase owns the identity we act on. */
  uid: string;
}

/** The claims this backend reads, beyond the standard JWT set. */
interface FirebaseIdTokenClaims {
  sub?: unknown;
  phone_number?: unknown;
  firebase?: { sign_in_provider?: unknown };
}

/**
 * One resolver per URL. It fetches the keys on first use (never at import time)
 * and caches them: 10 minutes, a 5 second timeout, and a 30 second cooldown
 * before a missing key triggers another fetch.
 */
const jwksByUrl = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksFor(url: string) {
  let jwks = jwksByUrl.get(url);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksByUrl.set(url, jwks);
  }
  return jwks;
}

/** Where the public keys are read from; overridable for tests and egress rules. */
function jwksUrl(): string {
  return process.env.FIREBASE_JWKS_URL?.trim() || DEFAULT_JWKS_URL;
}

/**
 * The Firebase project whose tokens this backend accepts: `FIREBASE_PROJECT_ID`
 * when set, else the `project_id` of a `FIREBASE_SERVICE_ACCOUNT` still left in
 * the environment, else the GameOn project.
 */
export function firebaseProjectId(): string {
  const explicit = process.env.FIREBASE_PROJECT_ID?.trim();
  if (explicit) return explicit;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      const account = JSON.parse(raw) as { project_id?: unknown };
      if (typeof account.project_id === 'string' && account.project_id) return account.project_id;
    } catch {
      // A malformed service account is not a reason to refuse phone sign-in.
    }
  }

  return DEFAULT_PROJECT_ID;
}

/**
 * Verifies an ID token from Firebase phone sign-in.
 *
 * Resolves to the verified phone number, or `null` when the token is not one
 * this project issued: a bad signature, a wrong issuer or audience, an expired
 * token, or one minted by a provider other than phone.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedPhoneUser | null> {
  const projectId = firebaseProjectId();

  try {
    const { payload } = await jwtVerify<FirebaseIdTokenClaims>(idToken, jwksFor(jwksUrl()), {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      // A handset's clock is not a source of truth; the signature is.
      clockTolerance: 30,
    });
    return readPhoneUser(payload);
  } catch (error) {
    console.warn('Firebase token rejected:', error instanceof Error ? error.message : error);
    return null;
  }
}

/** The claims a phone sign-in has to carry; `null` when one is missing. */
function readPhoneUser(claims: FirebaseIdTokenClaims): VerifiedPhoneUser | null {
  if (typeof claims.sub !== 'string' || !claims.sub) {
    console.warn('Firebase token rejected: no sub claim');
    return null;
  }

  // Only phone sign-in carries a verified number, so any other provider is
  // something this endpoint was not asked to accept.
  const provider = claims.firebase?.sign_in_provider;
  if (typeof provider === 'string' && provider !== 'phone') {
    console.warn('Firebase token rejected: sign_in_provider is', provider);
    return null;
  }

  const phoneNumber = claims.phone_number;
  if (typeof phoneNumber !== 'string' || !phoneNumber) {
    console.warn('Firebase token rejected: no phone_number claim');
    return null;
  }

  return { phoneNumber, uid: claims.sub };
}
