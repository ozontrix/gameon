import { createHash, randomBytes } from 'node:crypto';
import { decodeJwt, jwtVerify, SignJWT } from 'jose';
import { supabaseAdmin } from '@/lib/db/supabase';

const ISSUER = 'gameon:phone-session';
const AUDIENCE = 'gameon:api';
const ACCESS_SECONDS = 15 * 60;
type SessionRecord = { id: string; user_id: string; phone: string; expires_at: string };

export class PhoneSessionError extends Error {
  readonly status = 401;
}

function secret() {
  const value = process.env.PHONE_SESSION_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!value || value.length < 32) throw new Error('Phone session signing secret is not configured.');
  return new TextEncoder().encode(value);
}

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function isPhoneSessionToken(token: string): boolean {
  try { return decodeJwt(token).iss === ISSUER; } catch { return false; }
}

async function credentials(session: SessionRecord, refreshToken: string) {
  const expiresAt = Math.min(Math.floor(Date.now() / 1000) + ACCESS_SECONDS,
    Math.floor(new Date(session.expires_at).getTime() / 1000));
  const accessToken = await new SignJWT({ sid: session.id, token_use: 'phone_api' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setIssuer(ISSUER).setAudience(AUDIENCE)
    .setSubject(session.user_id).setIssuedAt().setExpirationTime(expiresAt).sign(secret());
  return { access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt,
    session_expires_at: session.expires_at, user_id: session.user_id, phone: session.phone };
}

export async function createPhoneSession(userId: string, phone: string, firebaseUid: string) {
  secret(); // Fail before creating a credential if signing cannot work.
  const token = randomBytes(32).toString('base64url');
  const { data, error } = await supabaseAdmin.rpc('phone_session_create', {
    p_user_id: userId, p_phone: phone, p_firebase_uid: firebaseUid, p_token_hash: hashRefreshToken(token),
  });
  if (error) throw error;
  if (!data) throw new PhoneSessionError('This account cannot sign in.');
  return credentials(data as SessionRecord, token);
}

export async function refreshPhoneSession(token: string) {
  secret();
  const next = randomBytes(32).toString('base64url');
  const { data, error } = await supabaseAdmin.rpc('phone_session_refresh', {
    p_token_hash: hashRefreshToken(token), p_next_hash: hashRefreshToken(next),
  });
  if (error) throw error;
  if (!data) throw new PhoneSessionError('Your session expired or was revoked. Sign in again.');
  return credentials(data as SessionRecord, next);
}

export async function revokePhoneSession(token: string) {
  const { error } = await supabaseAdmin.rpc('phone_session_revoke', { p_token_hash: hashRefreshToken(token) });
  if (error) throw error;
}

export async function verifyPhoneSession(token: string) {
  const key = secret();
  let payload;
  try {
    ({ payload } = await jwtVerify(token, key, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE }));
  } catch { throw new PhoneSessionError('Invalid or expired phone session.'); }
  if (payload.token_use !== 'phone_api' || typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' || !/^[a-f0-9-]{36}$/i.test(payload.sid)) {
    throw new PhoneSessionError('Invalid phone session.');
  }
  const { data, error } = await supabaseAdmin.rpc('phone_session_validate', {
    p_session_id: payload.sid, p_user_id: payload.sub,
  });
  if (error) throw error;
  if (!data) throw new PhoneSessionError('Session revoked or account unavailable.');
  return data as { user_id: string; role: string | null; phone: string };
}