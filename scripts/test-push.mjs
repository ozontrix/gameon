/** Mocked transport/persistence only. Never sends real customer notifications. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function load(file, mocks = {}, globals = {}) {
  const compiled = ts.transpileModule(readFileSync(resolve(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), compiled)(
    name => name in mocks ? mocks[name] : require(name), mod, mod.exports, ...Object.values(globals));
  return mod.exports;
}
const id = '11111111-1111-4111-8111-111111111111';
const content = { id, kind: 'general', title: 'Venue update', body: 'New hours', link: '/sports' };
const environment = account => ({ env: account ? { FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(account) } : {} });
const account = { project_id: 'test-project', client_email: 'sender@test.invalid', private_key: 'test-private-key' };
function firebase(transport, env = environment(account)) {
  const calls = [];
  class JWT {
    setProtectedHeader() { return this; } setIssuer() { return this; } setAudience() { return this; }
    setIssuedAt() { return this; } setExpirationTime() { return this; } async sign() { return 'signed-test-assertion'; }
  }
  return { ...load('src/lib/push/firebase.ts', { jose: { SignJWT: JWT, importPKCS8: async () => ({}) } }, {
    process: env, fetch: async (url, init) => { calls.push({ url, init }); return transport(url, init); },
  }), calls };
}
const json = (status, body, headers) => new Response(JSON.stringify(body), { status, headers });
test('FCM payload contains visible alerts, channel, sound, APNs headers and string data', () => {
  const { message } = firebase(() => {}).firebasePayload('device-token', content);
  assert.equal(message.token, 'device-token'); assert.deepEqual(message.notification, { title: content.title, body: content.body });
  assert.equal(message.android.notification.channel_id, 'gameon-updates'); assert.equal(message.android.priority, 'HIGH');
  assert.equal(message.apns.headers['apns-push-type'], 'alert'); assert.equal(message.apns.payload.aps.sound, 'default');
  assert.ok(Object.values(message.data).every(value => typeof value === 'string'));
  assert.equal(firebase(() => {}).firebasePayload('t', { ...content, link: null }).message.data.link, '/notifications');
});
test('Firebase configuration fails closed and supports split environment variables', () => {
  assert.equal(firebase(() => {}, environment(null)).firebaseCredentials(), null);
  assert.equal(firebase(() => {}, { env: { FIREBASE_SERVICE_ACCOUNT_JSON: 'bad' } }).firebaseCredentials(), null);
  const h = firebase(() => {}, { env: { FIREBASE_PROJECT_ID: 'p', FIREBASE_CLIENT_EMAIL: 'e', FIREBASE_PRIVATE_KEY: 'a\\nb' } });
  assert.equal(h.firebaseCredentials().private_key, 'a\nb');
});
test('sender uses OAuth HTTP v1 and caches the bearer without exposing private keys', async () => {
  const h = firebase(url => url.includes('oauth2') ? json(200, { access_token: 'oauth-token', expires_in: 3600 }) : json(200, { name: 'message-id' }));
  assert.deepEqual(await h.sendFirebase('token', content), { ok: true });
  await h.sendFirebase('token', content);
  assert.equal(h.calls.length, 3); assert.ok(h.calls[1].url.endsWith('/v1/projects/test-project/messages:send'));
  assert.equal(h.calls[1].init.headers.Authorization, 'Bearer oauth-token');
  assert.ok(!JSON.stringify(h.calls).includes(account.private_key));
});
for (const [status, code, retryable, invalid] of [[404, 'UNREGISTERED', false, true], [400, 'INVALID_ARGUMENT', false, false],
  [429, 'QUOTA_EXCEEDED', true, false], [503, 'UNAVAILABLE', true, false], [401, 'THIRD_PARTY_AUTH_ERROR', true, false]]) {
  test(`FCM ${code} is classified without disabling valid devices`, async () => {
    const h = firebase(url => url.includes('oauth2') ? json(200, { access_token: 'oauth-token' }) :
      json(status, { error: { details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: code }] } }, { 'Retry-After': '120' }));
    const result = await h.sendFirebase('token', content);
    assert.equal(result.ok, false); assert.equal(result.code, code); assert.equal(result.retryable, retryable);
    assert.equal(result.invalidToken, invalid); assert.equal(result.retryAfterSeconds, 120);
  });
}

function worker({ jobs = [], device = { installation_id: id, user_id: id, token: 'test-token', enabled: true },
  message = content, result = { ok: true }, configured = true } = {}) {
  const updates = [], sends = [], claims = [], after = [];
  const db = { rpc: async (name, args) => { claims.push({ name, args }); return { data: jobs, error: null }; }, from: table => {
    const query = { select() { return this; }, eq() { return this; },
      maybeSingle: async () => ({ data: table === 'push_devices' ? device : message, error: null }),
      update(value) { updates.push({ table, value }); return this; }, then(resolve) { return Promise.resolve({ error: null }).then(resolve); } };
    return query;
  } };
  return { updates, sends, claims, after, ...load('src/lib/services/push.service.ts', {
    'next/server': { after: callback => after.push(callback) }, '../db/supabase': { supabaseAdmin: db },
    '../push/firebase': { firebaseCredentials: () => configured ? account : null, sendFirebase: async (...args) => {
      sends.push(args); if (result instanceof Error) throw result; return result;
    } },
  }) };
}
const job = { id, installation_id: id, notification_id: id, recipient_user_id: id, lease_id: id, attempts: 1 };
test('worker marks Firebase acceptance sent and registration hashes installation credentials', async () => {
  const h = worker({ jobs: [job] }); await h.PushService.drain(50, id);
  assert.equal(h.sends.length, 1); assert.equal(h.updates[0].value.status, 'sent'); assert.ok(h.updates[0].value.sent_at);
  await h.PushService.register({ installationId: id, token: 'test-token', secret: 'a'.repeat(64), enabled: true, platform: 'ios' }, id);
  const args = h.claims.at(-1).args; assert.equal(args.p_user_id, id); assert.match(args.p_secret_hash, /^[a-f0-9]{64}$/);
  assert.notEqual(args.p_secret_hash, 'a'.repeat(64));
});
test('missing server credentials leave the durable queue untouched', async () => {
  const h = worker({ configured: false }); assert.deepEqual(await h.PushService.drain(), { configured: false, processed: 0 });
  assert.equal(h.claims.length, 0);
});
for (const [name, device, message] of [
  ['switched account', { user_id: 'other', token: 't', enabled: true }, content],
  ['disabled device', { user_id: id, token: 't', enabled: false }, content],
  ['missing notification', { user_id: id, token: 't', enabled: true }, null],
]) test(`worker skips ${name}`, async () => {
  const h = worker({ jobs: [job], device, message }); await h.PushService.drain();
  assert.equal(h.sends.length, 0); assert.equal(h.updates[0].value.status, 'skipped');
});
test('guest broadcasts send, invalid tokens disable only the matching device', async () => {
  const h = worker({ jobs: [{ ...job, recipient_user_id: null }], device: { installation_id: id, user_id: null, enabled: true, token: 't' },
    result: { ok: false, invalidToken: true, code: 'UNREGISTERED' } });
  await h.PushService.drain(); assert.equal(h.sends.length, 1);
  assert.deepEqual(h.updates[0], { table: 'push_devices', value: { enabled: false } });
  assert.equal(h.updates[1].value.status, 'failed');
});
test('transport failure retries durably and exhausted attempts stop', async () => {
  const h = worker({ jobs: [job], result: new Error('offline') }); await h.PushService.drain();
  assert.equal(h.updates[0].value.status, 'pending'); assert.equal(h.updates[0].value.error_code, 'FCM_TRANSPORT_UNAVAILABLE');
  const exhausted = worker({ jobs: [{ ...job, attempts: 8 }], result: { ok: false, retryable: true } });
  await exhausted.PushService.drain(); assert.equal(exhausted.updates[0].value.status, 'failed');
});
test('worker respects Firebase Retry-After and schedules immediate post-response delivery', async () => {
  const h = worker({ jobs: [job], result: { ok: false, retryable: true, retryAfterSeconds: 600 } }); const now = Date.now();
  await h.PushService.drain(); assert.ok(Date.parse(h.updates[0].value.available_at) >= now + 600_000);
  h.PushService.schedule(id); assert.equal(h.after.length, 1); await h.after[0](); assert.equal(h.sends.length, 2);
});

function registrationRoute() {
  const saved = [];
  return { saved, ...load('src/app/api/v1/push/devices/route.ts', {
    '@/lib/middlewares/auth': { withAuth: (req, _roles, callback) => req.headers.get('authorization') === 'Bearer valid'
      ? callback(req, { id }) : Promise.resolve(Response.json({ error: 'Unauthorized' }, { status: 401 })) },
    '@/lib/middlewares/rate-limiter': { withRateLimit: (req, _options, callback) => callback(req) },
    '@/lib/services/push.service': { PushService: { register: async (...args) => saved.push(args) } },
  }) };
}
const deviceInput = { installationId: id, secret: 'a'.repeat(64), token: 'test-token-twenty-characters', platform: 'android', enabled: true };
const request = (body, token) => new Request('https://example.test/api/v1/push/devices', {
  method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body),
});
test('device API supports guests and authenticated identities without trusting a supplied user id', async () => {
  const h = registrationRoute(); assert.equal((await h.POST(request(deviceInput))).status, 200);
  assert.equal(h.saved[0][1], null); assert.equal((await h.POST(request(deviceInput, 'valid'))).status, 200);
  assert.equal(h.saved[1][1], id);
  assert.equal((await h.POST(request({ ...deviceInput, userId: id }))).status, 400);
  assert.equal((await h.POST(request(deviceInput, 'invalid'))).status, 401); assert.equal(h.saved.length, 2);
});
for (const patch of [{ enabled: true, token: null }, { platform: 'web' }, { secret: 'bad' }, { token: 'bad' }, { installationId: 'bad' }]) {
  test(`device registration rejects invalid ${Object.keys(patch).join('/')}`, async () => {
    const h = registrationRoute(); assert.equal((await h.POST(request({ ...deviceInput, ...patch }))).status, 400); assert.equal(h.saved.length, 0);
  });
}
test('permission revocation can disable registration and detach an account', async () => {
  const h = registrationRoute(); assert.equal((await h.POST(request({ ...deviceInput, enabled: false, token: null }))).status, 200);
  assert.equal(h.saved[0][1], null); assert.equal(h.saved[0][0].enabled, false);
});
test('cron is authenticated and missing credentials are not reported as successful sends', async () => {
  const h = load('src/app/api/cron/push-deliveries/route.ts', {
    '@/lib/services/push.service': { PushService: { drain: async () => ({ configured: false, processed: 0 }) } },
  }, { process: { env: { CRON_SECRET: 'worker-secret' } } });
  assert.equal((await h.GET(new Request('https://example.test/cron'))).status, 401);
  const response = await h.GET(new Request('https://example.test/cron', { headers: { authorization: 'Bearer worker-secret' } }));
  assert.deepEqual(await response.json(), { configured: false, processed: 0 });
});