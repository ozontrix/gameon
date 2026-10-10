/** Auth tests with mocked persistence/native SDK; no real SMS or customer writes. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { decodeJwt, SignJWT } from 'jose';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mobile = resolve(root, '../gameon-multisports');
const require = createRequire(import.meta.url);
const uid = '11111111-1111-4111-8111-111111111111';
const sid = '22222222-2222-4222-8222-222222222222';

function loader(base, mocks) {
  const cache = new Map();
  function load(relative) {
    const path = resolve(base, relative);
    if (cache.has(path)) return cache.get(path).exports;
    const compiled = { exports: {} }; cache.set(path, compiled);
    const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    const localRequire = name => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
      if (name.startsWith('.')) return load(`${resolve(dirname(path), name)}.ts`);
      return require(name);
    };
    new Function('require', 'module', 'exports', outputText)(localRequire, compiled, compiled.exports);
    return compiled.exports;
  }
  return load;
}

function backend() {
  const calls = [];
  const record = { id: sid, user_id: uid, phone: '+919876543210', expires_at: new Date(Date.now() + 86400000).toISOString() };
  const db = { async rpc(name, args) {
    calls.push({ name, args });
    return { data: name === 'phone_session_validate' ? { user_id: uid, phone: record.phone, role: 'USER' } : record, error: null };
  } };
  const load = loader(root, { '@/lib/db/supabase': { supabaseAdmin: db }, '../db/supabase': { supabaseAdmin: db } });
  return { calls, db, load, service: load('src/lib/phone-session.ts') };
}

test('Phone credentials are short lived, API scoped, hashed at rest and independently renewable', async () => {
  const previous = process.env.PHONE_SESSION_SECRET;
  process.env.PHONE_SESSION_SECRET = 'test-only-signing-secret-32-characters-long';
  try {
    const h = backend();
    const result = await h.service.createPhoneSession(uid, '+919876543210', 'firebase-user');
    const jwt = decodeJwt(result.access_token);
    assert.equal(jwt.aud, 'gameon:api'); assert.equal(jwt.iss, 'gameon:phone-session');
    assert.equal(jwt.sub, uid); assert.equal(jwt.sid, sid);
    assert.ok(jwt.exp - jwt.iat <= 900);
    assert.match(result.refresh_token, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(result.access_token, result.refresh_token);
    assert.equal(h.calls[0].args.p_token_hash, h.service.hashRefreshToken(result.refresh_token));
    assert.ok(!JSON.stringify(h.calls).includes(result.refresh_token));
    assert.equal((await h.service.verifyPhoneSession(result.access_token)).user_id, uid);
    const renewed = await h.service.refreshPhoneSession(result.refresh_token);
    assert.notEqual(renewed.refresh_token, result.refresh_token);
    await h.service.revokePhoneSession(renewed.refresh_token);
    assert.equal(h.calls.at(-1).name, 'phone_session_revoke');
  } finally {
    if (previous === undefined) delete process.env.PHONE_SESSION_SECRET; else process.env.PHONE_SESSION_SECRET = previous;
  }
});

test('Revoked sessions, invalid signatures and wrong audience fail before authorization', async () => {
  const previous = process.env.PHONE_SESSION_SECRET;
  process.env.PHONE_SESSION_SECRET = 'test-only-signing-secret-32-characters-long';
  try {
    const h = backend();
    const result = await h.service.createPhoneSession(uid, '+919876543210', 'firebase-user');
    h.db.rpc = async () => ({ data: null, error: null });
    await assert.rejects(h.service.verifyPhoneSession(result.access_token), h.service.PhoneSessionError);
    await assert.rejects(h.service.refreshPhoneSession(result.refresh_token), h.service.PhoneSessionError);
    const invalid = await new SignJWT({ sid, token_use: 'phone_api' }).setSubject(uid)
      .setIssuer('gameon:phone-session').setAudience('authenticated').setExpirationTime('15m')
      .setProtectedHeader({ alg: 'HS256' }).sign(new TextEncoder().encode(process.env.PHONE_SESSION_SECRET));
    await assert.rejects(h.service.verifyPhoneSession(invalid), h.service.PhoneSessionError);
    assert.equal(h.service.isPhoneSessionToken('malformed'), false);
  } finally {
    if (previous === undefined) delete process.env.PHONE_SESSION_SECRET; else process.env.PHONE_SESSION_SECRET = previous;
  }
});

test('Refresh/logout endpoints validate credentials and never cache tokens', async () => {
  let renewals = 0;
  const load = loader(root, {
    '@/lib/middlewares/rate-limiter': { withRateLimit: (req, _options, handler) => handler(req) },
    '@/lib/phone-session': { PhoneSessionError: class extends Error {}, refreshPhoneSession: async () => { renewals++; return { access_token: 'access' }; }, revokePhoneSession: async () => {} },
  });
  const req = token => new Request('https://example.com/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: token }) });
  const refresh = load('src/app/api/v1/auth/refresh/route.ts');
  assert.equal((await refresh.POST(req('bad'))).status, 400); assert.equal(renewals, 0);
  assert.equal((await refresh.POST(req('a'.repeat(43)))).headers.get('cache-control'), 'no-store');
  assert.equal((await load('src/app/api/v1/auth/logout/route.ts').POST(req('a'.repeat(43)))).status, 200);
});

function device() {
  const storage = new Map(); const calls = [];
  class ApiError extends Error { constructor(status) { super('API failure'); this.status = status; } }
  const initial = { access_token: 'header.body.signature', refresh_token: 'a'.repeat(43),
    expires_at: Math.floor(Date.now() / 1000) - 1, session_expires_at: new Date(Date.now() + 86400000).toISOString(), user_id: uid, phone: '+919876543210' };
  const api = { setToken() {}, async post(path, body) {
    calls.push({ path, body });
    await new Promise(resolve => setTimeout(resolve, 5));
    return { ...initial, refresh_token: 'b'.repeat(43), expires_at: Math.floor(Date.now() / 1000) + 900 };
  } };
  const load = loader(mobile, {
    '@react-native-async-storage/async-storage': { getItem: async key => storage.get(key) ?? null,
      setItem: async (key, value) => { storage.set(key, value); }, removeItem: async key => { storage.delete(key); } },
    '@/lib/api-client': { api, ApiError },
  });
  return { storage, calls, initial, api, ApiError, service: load('src/lib/phone-session.ts') };
}

test('Mobile renews once for concurrent requests and restores its own session', async () => {
  const h = device();
  await h.service.adoptPhoneSession(h.initial);
  const tokens = await Promise.all([h.service.phoneAccessToken(), h.service.phoneAccessToken(), h.service.phoneAccessToken()]);
  assert.ok(tokens.every(token => token === h.initial.access_token));
  assert.equal(h.calls.length, 1);
  assert.equal((await h.service.restorePhoneSession()).refresh_token, 'b'.repeat(43));
  assert.equal(h.service.phoneSessionUser(h.initial).id, uid);
  await assert.rejects(h.service.adoptPhoneSession({ access_token: 'legacy' }));
});

test('Mobile preserves session on outage but clears revoked renewal credentials', async () => {
  const h = device(); await h.service.adoptPhoneSession(h.initial);
  h.api.post = async () => { throw new Error('offline'); };
  await assert.rejects(h.service.phoneAccessToken()); assert.equal(h.service.hasPhoneSession(), true);
  h.api.post = async () => { throw new h.ApiError(401); };
  await assert.rejects(h.service.phoneAccessToken()); assert.equal(h.service.hasPhoneSession(), false);
  assert.equal(h.storage.has('gameon.phone-session.v1'), false);
});

test('Logout clears local credentials, queues offline revocation and retries without restoring login', async () => {
  const h = device(); await h.service.adoptPhoneSession(h.initial);
  h.api.post = async () => { throw new Error('offline'); };
  await h.service.clearPhoneSession();
  assert.equal(h.service.hasPhoneSession(), false);
  assert.equal(h.storage.has('gameon.phone-session.v1'), false);
  assert.deepEqual(JSON.parse(h.storage.get('gameon.phone-session.pending-logout.v1')), [h.initial.refresh_token]);
  h.api.post = async path => { assert.equal(path, '/auth/logout'); };
  await h.service.retryPhoneLogout();
  assert.deepEqual(JSON.parse(h.storage.get('gameon.phone-session.pending-logout.v1')), []);
});

test('An in-flight renewal cannot resurrect a logged-out account', async () => {
  const h = device(); await h.service.adoptPhoneSession(h.initial);
  const refreshing = h.service.phoneAccessToken();
  await h.service.clearPhoneSession();
  assert.equal(await refreshing, null);
  assert.equal(h.service.hasPhoneSession(), false);
  assert.equal(h.storage.has('gameon.phone-session.v1'), false);
});

test('Native iOS OTP uses the native SDK, retries invalid codes and resets pending challenges', async () => {
  let code = null;
  const load = loader(mobile, {
    '@react-native-firebase/auth': { getAuth: () => ({}), signInWithPhoneNumber: async (_auth, phone) => {
      assert.equal(phone, '+919876543210');
      return { confirm: async value => { code = value; if (value === 'bad') throw new Error('invalid code');
        return { user: { uid: 'firebase', phoneNumber: phone, getIdToken: async () => 'firebase-id-token' } }; } };
    } },
    '@/lib/phone-auth-common': { toE164: number => `+91${number}`, asPhoneAuthError: error => error, PhoneAuthError: class extends Error {} },
  });
  const auth = load('src/lib/phone-auth.ios.ts');
  await assert.rejects(auth.confirmPhoneOtp('123456'));
  await auth.sendPhoneOtp('9876543210');
  await assert.rejects(auth.confirmPhoneOtp('bad'));
  assert.equal((await auth.confirmPhoneOtp('123456')).idToken, 'firebase-id-token'); assert.equal(code, '123456');
  await auth.sendPhoneOtp('9876543210'); auth.resetPhoneAuth();
  await assert.rejects(auth.confirmPhoneOtp('123456'));
});

test('Firebase exchange requires a phone provider, E.164 number and recent SMS auth_time', async () => {
  const now = Math.floor(Date.now() / 1000);
  let payload = { sub: 'firebase-user', phone_number: '+919876543210', firebase: { sign_in_provider: 'phone' }, auth_time: now };
  const load = loader(root, { jose: { createRemoteJWKSet: () => ({}), jwtVerify: async () => ({ payload }) } });
  const verify = load('src/lib/firebase-token.ts').verifyFirebaseIdToken;
  assert.equal((await verify('token')).uid, 'firebase-user');
  const valid = { ...payload };
  for (const change of [{ auth_time: now - 301 }, { auth_time: now + 31 }, { auth_time: undefined },
    { firebase: {} }, { firebase: { sign_in_provider: 'password' } }, { phone_number: 'not-a-number' }]) {
    payload = { ...valid, ...change };
    assert.equal(await verify('token'), null);
  }
});

test('Middleware retires legacy phone JWTs, checks server roles and does not label handler failures as auth errors', async () => {
  let verified = { user_id: uid, role: 'USER', phone: '+919876543210' };
  class PhoneSessionError extends Error {}
  const load = loader(root, {
    '../db/supabase': { supabaseAdmin: { auth: { getUser: async () => ({ data: { user: { id: uid, app_metadata: {} } }, error: null }) } } },
    '../phone-session': { PhoneSessionError, isPhoneSessionToken: token => token === 'phone', verifyPhoneSession: async () => verified },
    jose: { decodeJwt: () => ({ app_metadata: { provider: 'phone' } }) },
  });
  const { withAuth } = load('src/lib/middlewares/auth.ts');
  const request = token => new Request('https://example.com/api/v1/user/profile', { headers: { authorization: `Bearer ${token}` } });
  const handler = async (_req, user) => { assert.equal(user.id, uid); return require('next/server').NextResponse.json({ success: true }); };
  assert.equal((await withAuth(request('legacy'), ['USER'], handler)).status, 401);
  assert.equal((await withAuth(request('phone'), ['ADMIN'], handler)).status, 403);
  assert.equal((await withAuth(request('phone'), ['USER'], handler)).status, 200);
  verified = { ...verified, role: 'ADMIN' };
  assert.equal((await withAuth(request('phone'), ['ADMIN'], handler)).status, 200);
  await assert.rejects(withAuth(request('phone'), ['ADMIN'], async () => { throw new Error('DB write failed'); }), /DB write failed/);
});