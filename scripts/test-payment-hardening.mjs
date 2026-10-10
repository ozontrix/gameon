/** node --test scripts/test-payment-hardening.mjs — no live gateway or DB writes. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function loader(mocks) {
  const cache = new Map();
  function load(path) {
    const filename = resolve(root, path);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = { exports: {} };
    cache.set(filename, compiled);
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    const localRequire = id => {
      if (id in mocks) return mocks[id];
      if (id.startsWith('.') || id.startsWith('@/')) {
        const target = id.startsWith('@/') ? resolve(root, 'src', id.slice(2)) : resolve(dirname(filename), id);
        return load(existsSync(`${target}.ts`) ? `${target}.ts` : target);
      }
      return require(id);
    };
    new Function('require', 'module', 'exports', outputText)(localRequire, compiled, compiled.exports);
    return compiled.exports;
  }
  return load;
}

function harness(kind, { payment = {}, rpcError = null, row = {}, outcome = 'confirmed' } = {}) {
  const calls = { writes: 0, rpc: [], notifications: 0 };
  const saved = { id: 'purchase', user_id: 'user', status: 'PENDING', payment_status: 'UNPAID',
    amount_paid: 500, wallet_points_used: kind === 'booking' ? 100 : 0, razorpay_payment_id: null, ...row };
  const gateway = { id: 'pay_valid', order_id: 'order_valid', amount: kind === 'booking' ? 40000 : 50000,
    currency: 'INR', status: 'captured', amount_refunded: 0, ...payment };
  const db = {
    from() {
      const q = { select() { return q; }, eq() { return q; }, in() { return q; }, is() { return q; },
        update(value) { calls.writes++; Object.assign(saved, value); return q; },
        async maybeSingle() { return { data: { ...saved }, error: null }; },
        async single() { return { data: { ...saved }, error: null }; } };
      return q;
    },
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      return { data: { outcome, changed: true }, error: name === 'credit_booking_referral' ? null : rpcError };
    },
  };
  const load = loader({
    '../db/supabase': { supabaseAdmin: db },
    '../razorpay': { getRazorpay: () => ({ payments: { fetch: async () => gateway } }) },
    './notification.service': { NotificationService: { notifyBooking: async () => { calls.notifications++; } } },
    './slot.service': {},
  });
  const classes = { booking: 'BookingService', event: 'EventService', tournament: 'TournamentService' };
  const service = load(`src/lib/services/${kind}.service.ts`)[classes[kind]];
  return { calls, saved, service, load };
}

for (const kind of ['booking', 'event', 'tournament']) {
  test(`${kind}: captured payment with matching order/amount/currency confirms`, async () => {
    const h = harness(kind);
    const result = await h.service.confirmPaidOrder('order_valid', 'pay_valid');
    assert.equal(result.outcome, 'confirmed');
    assert.equal(kind === 'booking' ? h.calls.rpc[0].name : h.saved.status, kind === 'booking' ? 'booking_confirm_payment' : 'CONFIRMED');
  });
  for (const [name, payment] of Object.entries({
    authorized: { status: 'authorized' }, amount: { amount: 1 }, currency: { currency: 'USD' },
    order: { order_id: 'order_other' }, identity: { id: 'pay_other' }, refunded: { amount_refunded: 100 },
  })) {
    test(`${kind}: rejects ${name} before any mutation`, async () => {
      const h = harness(kind, { payment });
      await assert.rejects(h.service.confirmPaidOrder('order_valid', 'pay_valid'), error => error.status === 409);
      assert.equal(h.calls.writes, 0);
      assert.equal(h.calls.rpc.length, 0);
    });
  }
  test(`${kind}: rejects conflicting payment even when already confirmed`, async () => {
    const h = harness(kind, { row: { status: 'CONFIRMED', razorpay_payment_id: 'pay_other' } });
    await assert.rejects(h.service.confirmPaidOrder('order_valid', 'pay_valid'), error => error.status === 409);
    assert.equal(h.calls.writes, 0);
    assert.equal(h.calls.rpc.length, 0);
  });
}

test('Booking: failed financial transaction never reports confirmation or sends notification', async () => {
  const h = harness('booking', { rpcError: { code: '23514', message: 'wallets_balance_check' } });
  await assert.rejects(h.service.confirmPaidOrder('order_valid', 'pay_valid'), error => error.status === 409);
  assert.equal(h.calls.notifications, 0);
  assert.equal(h.calls.rpc.length, 1);
});

test('Booking: insufficient Points outcome is not success', async () => {
  const h = harness('booking', { outcome: 'wallet-insufficient' });
  const result = await h.service.confirmPaidOrder('order_valid', 'pay_valid');
  assert.equal(result.outcome, 'wallet-insufficient');
  assert.equal(h.calls.notifications, 0);
  assert.equal(h.calls.rpc.length, 1);
});

test('Wallet-only confirmation uses atomic RPC, not separate wallet writes', async () => {
  const h = harness('booking');
  await h.service.confirmWithWallet('user', 'purchase');
  assert.deepEqual(h.calls.rpc[0], { name: 'booking_confirm_payment', args: {
    p_booking_id: 'purchase', p_user_id: 'user', p_order_id: null, p_payment_id: null,
  } });
  assert.equal(h.calls.writes, 0);
});

test('Wallet permission migration explicitly revokes public API roles', () => {
  const sql = readFileSync(resolve(root, 'supabase/migrations/20261007150000_wallet_rpc_permissions.sql'), 'utf8');
  assert.match(sql, /from public, anon, authenticated/i);
  assert.match(sql, /to service_role/i);
  assert.match(sql, /set search_path = ''/i);
});

for (const kind of ['event', 'tournament']) {
  test(`${kind}: public detail denies a private draft`, async () => {
    let excluded = false;
    const q = { select() { return q; }, eq() { return q; },
      neq(key, value) { assert.equal(key, 'status'); assert.equal(value, 'draft'); excluded = true; return q; },
      async maybeSingle() { assert.equal(excluded, true); return { data: null, error: null }; } };
    const load = loader({ '../db/supabase': { supabaseAdmin: { from: () => q } } });
    const name = kind === 'event' ? 'EventService' : 'TournamentService';
    assert.equal(await load(`src/lib/services/${kind}.service.ts`)[name].getPublic('draft'), null);
  });
}

test('Expiry cron cleans all three purchase types with the same cutoff', async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'test-secret';
  try {
    const calls = [];
    const load = loader({ '@/lib/db/supabase': { supabaseAdmin: { from(table) {
      const call = { table, filters: {} }; calls.push(call);
      const q = { update(value) { assert.deepEqual(value, { status: 'CANCELLED' }); return q; },
        eq(key, value) { call.filters[key] = value; return q; },
        lt(key, value) { call.filters[key] = value; return q; },
        async select() { return { data: [{ id: table }], error: null }; } };
      return q;
    } } } });
    const route = load('src/app/api/cron/clear-expired/route.ts');
    const denied = await route.GET(new Request('https://example.com/api/cron/clear-expired'));
    assert.equal(denied.status, 401); assert.equal(calls.length, 0);
    const response = await route.GET(new Request('https://example.com/api/cron/clear-expired', { headers: { authorization: 'Bearer test-secret' } }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).clearedCount, 3);
    assert.deepEqual(calls.map(call => call.table), ['bookings', 'event_orders', 'tournament_registrations']);
    assert.equal(new Set(calls.map(call => call.filters.expires_at)).size, 1);
    for (const call of calls) {
      assert.equal(call.filters.status, 'PENDING'); assert.equal(call.filters.payment_status, 'UNPAID');
    }
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});