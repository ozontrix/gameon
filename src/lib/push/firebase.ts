import { importPKCS8, SignJWT } from 'jose';

type Credentials = { project_id: string; client_email: string; private_key: string };
let cached: { key: string; token: string; expires: number } | null = null;
let refreshing: Promise<string> | null = null;

export function firebaseCredentials(): Credentials | null {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;
    const account = raw ? JSON.parse(raw) : {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    return [account.project_id, account.client_email, account.private_key].every(value => typeof value === 'string' && value.trim()) ? account : null;
  } catch { return null; }
}

async function accessToken(account: Credentials): Promise<string> {
  const key = `${account.client_email}:${account.private_key}`;
  if (cached?.key === key && cached.expires > Date.now() + 60_000) return cached.token;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
      .setProtectedHeader({ alg: 'RS256' }).setIssuer(account.client_email)
      .setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h')
      .sign(await importPKCS8(account.private_key, 'RS256'));
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
      signal: AbortSignal.timeout(15_000), cache: 'no-store',
    });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw new Error('FCM_OAUTH_UNAVAILABLE');
    cached = { key, token: data.access_token, expires: Date.now() + Number(data.expires_in || 3600) * 1000 };
    return cached.token;
  })();
  try { return await refreshing; } finally { refreshing = null; }
}

export type PushContent = { id: string; title: string; body: string; link: string | null; kind: string };
export function firebasePayload(token: string, notification: PushContent) {
  return { message: {
    token,
    notification: { title: notification.title, body: notification.body },
    data: { notificationId: notification.id, kind: notification.kind, link: notification.link || '/notifications' },
    android: { priority: 'HIGH', ttl: '86400s', notification: { channel_id: 'gameon-updates', sound: 'default', tag: notification.id } },
    apns: { headers: { 'apns-priority': '10', 'apns-push-type': 'alert', 'apns-collapse-id': notification.id },
      payload: { aps: { sound: 'default' } } },
  } };
}

export async function sendFirebase(token: string, notification: PushContent): Promise<{ ok: boolean; invalidToken?: boolean; retryable?: boolean; retryAfterSeconds?: number; code?: string }> {
  const account = firebaseCredentials();
  if (!account) return { ok: false, retryable: true, code: 'FCM_NOT_CONFIGURED' };
  const bearer = await accessToken(account);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, {
    method: 'POST', headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(firebasePayload(token, notification)), signal: AbortSignal.timeout(15_000), cache: 'no-store',
  });
  const data = await response.json();
  if (response.ok) return { ok: true };
  if (response.status === 401) cached = null;
  const code: string = data.error?.details?.find((detail: { '@type'?: string }) => detail['@type']?.endsWith('.FcmError'))?.errorCode || data.error?.status || `HTTP_${response.status}`;
  const retryAfter = response.headers.get('retry-after');
  const retryAfterSeconds = retryAfter ? (/^\d+$/.test(retryAfter) ? Number(retryAfter) : Math.max(0, (Date.parse(retryAfter) - Date.now()) / 1000)) : 0;
  return { ok: false, code, invalidToken: code === 'UNREGISTERED',
    retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 0,
    retryable: response.status === 429 || response.status >= 500 || response.status === 401 || response.status === 403 };
}