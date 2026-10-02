/** Run: node --test scripts/test-profile.mjs. No real users or emails are touched. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const id = '11111111-1111-4111-8111-111111111111';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1kAAAAASUVORK5CYII=', 'base64');
let provider, auth, row, written, removed, uploaded, failUpdate;
function reset(loginProvider = 'email') {
  provider = loginProvider;
  auth = { id, email: loginProvider === 'email' ? 'login@example.com' : null, phone: loginProvider === 'phone' ? '+919876543210' : null, email_confirmed_at: loginProvider === 'email' ? '2026-10-02' : null, phone_confirmed_at: loginProvider === 'phone' ? '2026-10-02' : null, user_metadata: {} };
  row = { id, full_name: 'Player', email: auth.email, phone: auth.phone, avatar_path: null, city: null, gender: null, date_of_birth: null, preferred_sports: [], created_at: '2026-10-02', updated_at: '2026-10-02' };
  written = null; removed = []; uploaded = []; failUpdate = false;
}
class Query {
  conditions = [];
  patch = null;
  select() { return this; }
  eq(key, value) { this.conditions.push([key, value]); return this; }
  is(key, value) { return this.eq(key, value); }
  update(patch) { this.patch = patch; return this; }
  async maybeSingle() {
    assert.ok(this.conditions.some(([key, value]) => key === 'id' && value === id), 'Every DB operation must be scoped to the caller');
    if (this.patch && failUpdate) return { data: null, error: new Error('Mock DB failure') };
    if (this.patch) { written = this.patch; row = { ...row, ...this.patch }; }
    return { data: row, error: null };
  }
}
const admin = {
  auth: { admin: { getUserById: async (userId) => { assert.equal(userId, id); return { data: { user: auth }, error: null }; } } },
  from: (table) => { assert.equal(table, 'profiles'); return new Query(); },
  storage: { from: (bucket) => {
    assert.equal(bucket, 'profile-photos');
    return {
      createSignedUrl: async (path) => ({ data: { signedUrl: `https://private.example/${path}` }, error: null }),
      upload: async (path, bytes) => { assert.ok(path.startsWith(`${id}/`)); assert.ok(bytes.length > 0); uploaded.push(path); return { error: null }; },
      remove: async (paths) => { removed.push(...paths); return { error: null }; },
    };
  } },
};
const cache = new Map();
function load(relative) {
  const path = resolve(root, relative);
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} }; cache.set(path, module);
  const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  const localRequire = (name) => {
    if (name === 'server-only') return {};
    if (name === '@/lib/db/supabase') return { supabaseAdmin: admin };
    if (name === '@/lib/middlewares/auth') return { withAuth: async (request, _roles, handler) => {
      if (!request.headers.has('authorization')) return require('next/server').NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return handler(request, { id, provider, role: 'USER' });
    } };
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    return require(name);
  };
  new Function('require', 'module', 'exports', outputText)(localRequire, module, module.exports);
  return module.exports;
}
const profile = load('src/lib/profile.ts');
const route = load('src/app/api/v1/user/profile/route.ts');
const photo = load('src/app/api/v1/user/profile/photo/route.ts');
function request(body, authorized = true) {
  const multipart = body instanceof FormData;
  return new Request('https://gameonmultisports.com/api/v1/user/profile', { method: 'POST', headers: { ...(authorized ? { authorization: 'Bearer mocked' } : {}), ...(!multipart ? { 'Content-Type': 'application/json' } : {}) }, body: multipart ? body : JSON.stringify(body) });
}
test('Email login verifies only the real auth email, not the manually entered phone', async () => {
  reset(); row.email = 'wrong@example.com'; row.phone = '+919111111111';
  const data = (await (await route.GET(request({}))).json()).data;
  assert.equal(data.email, 'login@example.com'); assert.equal(data.emailVerified, true); assert.equal(data.phoneVerified, false);
});
test('Phone login verifies only the auth phone; manually saved email stays unverified', async () => {
  reset('phone'); row.email = 'manual@example.com';
  const data = (await (await route.GET(request({}))).json()).data;
  assert.equal(data.email, 'manual@example.com'); assert.equal(data.emailVerified, false); assert.equal(data.phoneVerified, true);
});
test('Missing confirmation timestamps never imply verification', () => {
  reset(); auth.email_confirmed_at = null;
  assert.equal(profile.profileIdentity(auth, 'email').emailVerified, false);
});
test('Email users can add a validated phone without changing auth identity', async () => {
  reset(); const response = await route.PATCH(request({ phone: '98765 43210' }));
  assert.equal(response.status, 200); assert.equal(written.phone, '+919876543210'); assert.equal(auth.phone, null);
  assert.equal((await response.json()).data.phoneVerified, false);
});
test('Phone users can add a validated email without changing auth identity', async () => {
  reset('phone'); const response = await route.PATCH(request({ email: ' New@Example.com ' }));
  assert.equal(response.status, 200); assert.equal(written.email, 'new@example.com'); assert.equal(auth.email, null);
});
test('API locks each sign-in contact against manual replacement', async () => {
  reset(); assert.equal((await route.PATCH(request({ email: 'other@example.com' }))).status, 400); assert.equal(written, null);
  reset('phone'); assert.equal((await route.PATCH(request({ phone: '9876543210' }))).status, 400); assert.equal(written, null);
});
test('Malformed contacts and injected verification/photo fields are rejected', async () => {
  for (const body of [{ phone: 'abc' }, { email: 'bad' }, { emailVerified: true }, { avatar_path: 'another-user/photo.jpg' }]) {
    reset('phone'); assert.equal((await route.PATCH(request(body))).status, 400); assert.equal(written, null);
  }
});
test('Photo upload stores only under the caller folder and replaces old photo', async () => {
  reset(); const old = `${id}/old.jpg`; row.avatar_path = old;
  const form = new FormData(); form.append('photo', new File([png], 'photo.png', { type: 'image/png' }));
  const response = await photo.POST(request(form)); assert.equal(response.status, 200);
  assert.equal(written.avatar_path, uploaded[0]); assert.deepEqual(removed, [old]);
  assert.ok((await response.json()).data.avatarUrl);
});
test('Fake images and oversized photos are rejected without uploads', async () => {
  for (const file of [new File(['not a PNG'], 'photo.png', { type: 'image/png' }), new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })]) {
    reset(); const form = new FormData(); form.append('photo', file);
    assert.equal((await photo.POST(request(form))).status, 400); assert.equal(uploaded.length, 0);
  }
});
test('DB save failure cleans the new upload but keeps the old photo', async () => {
  reset(); row.avatar_path = `${id}/old.jpg`; failUpdate = true;
  const form = new FormData(); form.append('photo', new File([png], 'photo.png', { type: 'image/png' }));
  assert.equal((await photo.POST(request(form))).status, 500);
  assert.deepEqual(removed, uploaded); assert.equal(row.avatar_path, `${id}/old.jpg`);
});
test('Anonymous profile and photo requests are denied', async () => {
  reset(); assert.equal((await route.PATCH(request({ fullName: 'Player' }, false))).status, 401);
  assert.equal((await photo.POST(request(new FormData(), false))).status, 401);
});