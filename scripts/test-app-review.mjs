/** node --test scripts/test-app-review.mjs. No live users, payments or emails. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mobile = resolve(root, '../gameon-multisports');
const require = createRequire(import.meta.url);
function loader(mocks, base = root) {
  const cache = new Map();
  function load(relative) {
    const filename = resolve(base, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiledModule = { exports: {} }; cache.set(filename, compiledModule);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    new Function('require', 'module', 'exports', compiled)(id => {
      if (id in mocks) return mocks[id];
      if (id === 'server-only') return {};
      if (id.startsWith('@/') || id.startsWith('.')) {
        const target = id.startsWith('@/') ? resolve(base, 'src', id.slice(2)) : resolve(dirname(filename), id);
        return load(existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`);
      }
      return require(id);
    }, compiledModule, compiledModule.exports);
    return compiledModule.exports;
  }
  return load;
}
const userId = '11111111-1111-4111-8111-111111111111';
function request(body, auth = true) {
  return new Request('https://example.com/api', { method: 'POST', headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'Bearer test' } : {}) }, body: JSON.stringify(body) });
}
function supportHarness() {
  const rows = []; let fail = false;
  const db = { auth: { admin: { getUserById: async id => { assert.equal(id, userId); return { data: { user: { email: 'login@example.com' } }, error: null }; } } },
    from(table) {
      assert.equal(table, 'app_support_requests');
      let insert; const conditions = [];
      const q = { select() { return q; }, eq(k, v) { conditions.push([k, v]); return q; },
        insert(value) { insert = value; return q; },
        async maybeSingle() { return { data: rows.find(row => conditions.every(([k, v]) => row[k] === v)) ?? null, error: fail ? new Error('DB unavailable') : null }; },
        async single() {
          if (fail) return { data: null, error: new Error('DB unavailable') };
          const row = { id: `request-${rows.length}`, created_at: '2026-10-14', status: 'pending', ...insert };
          rows.push(row); return { data: row, error: null };
        } };
      return q;
    } };
  const load = loader({ '@/lib/db/supabase': { supabaseAdmin: db }, '@/lib/middlewares/auth': {
    withAuth: async (req, _roles, handler) => req.headers.has('authorization') ? handler(req, { id: userId, provider: 'email', role: 'USER' }) : require('next/server').NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  }, '@/lib/middlewares/rate-limiter': { withRateLimit: (req, _options, handler) => handler(req) } });
  return { rows, load, fail: () => { fail = true; } };
}
test('Deletion requires an authenticated confirmation and rejects substituted user IDs', async () => {
  const h = supportHarness(); const route = h.load('src/app/api/v1/user/account-deletion/route.ts');
  assert.equal((await route.POST(request({ confirmation: 'DELETE' }, false))).status, 401);
  for (const body of [{ confirmation: 'no' }, { confirmation: 'DELETE', userId: 'victim' }, { confirmation: 'DELETE', replyEmail: 'bad' }]) {
    assert.equal((await route.POST(request(body))).status, 400);
  }
  assert.equal(h.rows.length, 0);
});
test('Deletion saves the caller identity, is idempotent and never claims completed deletion', async () => {
  const h = supportHarness(); const route = h.load('src/app/api/v1/user/account-deletion/route.ts');
  const first = await route.POST(request({ confirmation: 'DELETE' }));
  assert.equal(first.status, 201); assert.equal(first.headers.get('cache-control'), 'no-store');
  const second = await route.POST(request({ confirmation: 'DELETE' })); assert.equal(second.status, 200);
  assert.equal(h.rows.length, 1); assert.equal(h.rows[0].user_id, userId); assert.equal(h.rows[0].status, 'pending');
});
test('Deletion storage failure returns failure, not a fake receipt', async () => {
  const h = supportHarness(); h.fail();
  assert.equal((await h.load('src/app/api/v1/user/account-deletion/route.ts').POST(request({ confirmation: 'DELETE' }))).status, 503);
});
test('Feedback persists privately and validates before saving', async () => {
  const h = supportHarness(); const route = h.load('src/app/api/v1/public/feedback/route.ts');
  const valid = { topic: 'payment', message: 'Please help with my payment', replyEmail: 'player@example.com', rating: 4 };
  for (const body of [{ ...valid, message: 'short' }, { ...valid, rating: 8 }, { ...valid, replyEmail: 'bad' }, { ...valid, userId }]) assert.equal((await route.POST(request(body))).status, 400);
  assert.equal(h.rows.length, 0);
  assert.equal((await route.POST(request(valid, false))).status, 201);
  assert.equal(h.rows[0].kind, 'feedback'); assert.equal(h.rows[0].message, valid.message);
  h.fail(); assert.equal((await route.POST(request(valid))).status, 503);
});
for (const kind of ['event', 'tournament']) {
  for (const fee of [0, 250]) test(`${kind}: ${fee === 0 ? 'free entry confirms without a gateway' : 'paid entry remains an unpaid hold'}`, async () => {
    let inserted;
    const db = { from() { const q = {
      select() { return q; }, eq() { return q; }, lt() { return Promise.resolve({ error: null }); }, update() { return q; },
      insert(value) { inserted = value; return q; },
      async maybeSingle() { return { data: { status: 'published', entry_fee: fee, max_tickets_per_order: 5, registration_closes_at: '2099-01-01T00:00:00Z' }, error: null }; },
      async single() { return { data: { id: 'saved', ...inserted }, error: null }; },
    }; return q; } };
    const service = loader({ '../db/supabase': { supabaseAdmin: db } })(`src/lib/services/${kind}.service.ts`)[kind === 'event' ? 'EventService' : 'TournamentService'];
    if (kind === 'event') await service.buyTickets(userId, { eventId: 'event', tickets: 2, attendeeName: 'Player', contactPhone: '9876543210' });
    else await service.register(userId, { tournamentId: 'tournament', teamName: 'Team', captainName: 'Player', contactPhone: '9876543210' });
    assert.equal(inserted.status, fee === 0 ? 'CONFIRMED' : 'PENDING');
    assert.equal(inserted.payment_status, fee === 0 ? 'PAID' : 'UNPAID');
    assert.equal(inserted.expires_at === null, fee === 0);
  });
}
test('Direct booking lookup is scoped to caller and confirmed status, independent of pagination', async () => {
  const filters = [];
  const q = { select() { return q; }, eq(k, v) { filters.push([k, v]); return q; }, maybeSingle: async () => ({ data: { id: 'booking' }, error: null }) };
  const service = loader({ '../db/supabase': { supabaseAdmin: { from: () => q } } })('src/lib/services/booking.service.ts').BookingService;
  await service.getUserBooking(userId, 'booking');
  assert.deepEqual(filters, [['id', 'booking'], ['user_id', userId], ['status', 'CONFIRMED']]);
});
test('Booking status filters precede pagination and have stable ordering', async () => {
  for (const status of ['upcoming', 'ongoing', 'past']) {
    const calls = [];
    const q = {};
    for (const method of ['select', 'eq', 'or', 'order', 'lte', 'gt']) q[method] = (...args) => { calls.push([method, ...args]); return q; };
    q.range = async (...args) => { calls.push(['range', ...args]); return { data: [], count: 0, error: null }; };
    const service = loader({ '../db/supabase': { supabaseAdmin: { from: () => q } } })('src/lib/services/booking.service.ts').BookingService;
    await service.getUserBookings(userId, { status, page: 2, limit: 20 });
    assert.deepEqual(calls.at(-1), ['range', 20, 39]);
    assert.ok(calls.some(call => call[0] === 'order' && call[1] === 'id'));
    assert.ok(calls.some(call => status === 'ongoing' ? call[0] === 'gt' && call[1] === 'end_time' : call[0] === 'or' && call[1].includes(status === 'past' ? 'end_time.lte.' : 'start_time.gt.')));
  }
});
test('Auth links ignore foreign origins and non-auth routes before adopting credentials', async () => {
  let adopted = 0;
  const auth = loader({ '@/constants/referral': {}, '@/lib/supabase': { getSupabaseClient: () => ({ auth: { setSession: async () => { adopted++; return { error: null }; } } }) } }, mobile)('src/lib/email-auth.ts');
  for (const url of ['https://evil.example/email-confirmed#access_token=a&refresh_token=b', 'gameonmultisports://sport/one?code=injected']) assert.equal(await auth.applySessionFromAuthUrl(url), null);
  assert.equal(adopted, 0);
  assert.equal((await auth.applySessionFromAuthUrl('gameonmultisports://email-confirmed#access_token=a&refresh_token=b')).kind, 'signed-in');
  assert.equal(adopted, 1);
});
test('Release guards: private inbox RLS, discoverable deletion, native checkout, tappable tickets', () => {
  const sql = readFileSync(resolve(root, 'supabase/migrations/20261014101342_app_support_requests.sql'), 'utf8');
  assert.match(sql, /enable row level security/i); assert.match(sql, /revoke all.*anon, authenticated/i);
  assert.match(readFileSync(resolve(mobile, 'src/app/(tabs)/accounts/index.tsx'), 'utf8'), /Delete Account/);
  assert.match(readFileSync(resolve(mobile, 'src/components/payment/razorpay-checkout.native.tsx'), 'utf8'), /Razorpay.open\(options\)/);
  assert.match(readFileSync(resolve(mobile, 'src/app/my-tickets.tsx'), 'utf8'), /onPress=\{onPress\}/);
});
test('iOS config declares the UPI intent schemes and the export-compliance answer', () => {
  const config = readFileSync(resolve(mobile, 'app.config.js'), 'utf8');
  for (const scheme of ['tez', 'phonepe', 'paytmmp', 'credpay', 'bhim', 'amazonpay']) {
    assert.ok(config.includes(`'${scheme}'`), `missing UPI scheme ${scheme}`);
  }
  assert.match(config, /ITSAppUsesNonExemptEncryption: false/);
  // Photo library only: a camera usage string must never be advertised.
  const appJson = JSON.parse(readFileSync(resolve(mobile, 'app.json'), 'utf8'));
  const picker = appJson.expo.plugins.find(entry => Array.isArray(entry) && entry[0] === 'expo-image-picker')[1];
  assert.equal(picker.cameraPermission, false);
});
test('Purchases are real-world services only, so Apple IAP does not apply', () => {
  const app = resolve(mobile, 'src/app');
  for (const file of ['event/[id].tsx', 'tournament/[id].tsx', 'book/payment.tsx']) {
    assert.match(readFileSync(resolve(app, file), 'utf8'), /paymentId|create-order|razorpay/i, `${file} should settle through Razorpay`);
  }
  // Nothing in the app sells Points or other digital content.
  assert.equal(readFileSync(resolve(mobile, 'src/context/wallet.tsx'), 'utf8').match(/purchase|top.?up/i), null);
});
