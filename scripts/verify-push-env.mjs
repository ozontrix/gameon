/** Checks presence; optional --validate uses FCM dry run. Never prints secrets. */
import { createRequire } from 'node:module';
import { importPKCS8, SignJWT } from 'jose';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: '.env.local', quiet: true });
const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT;
let account;
try { account = raw ? JSON.parse(raw) : null; } catch { /* Invalid configuration is reported below. */ }
console.log('Firebase server credentials:', account?.project_id && account?.client_email && account?.private_key ||
  process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY ? 'present (not remotely validated)' : 'MISSING / incomplete');
console.log('Push worker CRON_SECRET:', process.env.CRON_SECRET ? 'present' : 'MISSING');

// Explicit dry-run only: checks OAuth and the FCM API without delivering a push.
if (process.argv.includes('--validate')) {
  try {
    account ??= { project_id: process.env.FIREBASE_PROJECT_ID, client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') };
    if (!account.project_id || !account.client_email || !account.private_key) throw new Error('Incomplete Firebase credentials');
    const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
      .setProtectedHeader({ alg: 'RS256' }).setIssuer(account.client_email)
      .setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('5m')
      .sign(await importPKCS8(account.private_key, 'RS256'));
    const oauth = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
      signal: AbortSignal.timeout(15_000),
    });
    const auth = await oauth.json();
    if (!oauth.ok || !auth.access_token) throw new Error(`OAuth rejected (HTTP ${oauth.status})`);
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`, {
      method: 'POST', headers: { Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ validate_only: true, message: { topic: 'gameon-push-config-validation',
        notification: { title: 'Configuration validation', body: 'Dry run only; never delivered.' } } }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`FCM validation rejected (HTTP ${response.status})`);
    console.log('Firebase OAuth and FCM HTTP v1 authorization validated. No notification was sent.');
    console.log('APNs credentials and physical-device receipt were NOT validated.');
  } catch (error) {
    // Do not print upstream response bodies, signing errors, keys or bearer tokens.
    console.error('Firebase dry-run validation failed:', error instanceof Error && /^(Incomplete Firebase credentials|OAuth rejected|FCM validation rejected)/.test(error.message)
      ? error.message : 'Credential parsing, signing or network request failed.');
    process.exitCode = 1;
  }
}