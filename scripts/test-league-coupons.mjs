/** No gateway orders, mail or live database writes. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function loader(mocks = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = { exports: {} };
    cache.set(filename, compiled);
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } });
    function localRequire(id) {
      if (id in mocks) return mocks[id];
      if (id === 'server-only') return {};
      if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => createElement('a', props, children) };
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? resolve(root, 'src', id.slice(2)) : resolve(dirname(filename), id);
        return load(existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`);
      }
      return require(id);
    }
    new Function('require', 'module', 'exports', outputText)(localRequire, compiled, compiled.exports);
    return compiled.exports;
  }
  return load;
}
const load = loader();
const { CouponFormSchema, couponDiscount, couponLabel } = load('src/lib/league/coupons.ts');
const { quoteEntry, parseLeagueEntry } = load('src/lib/league/entry.ts');
const id = '12345678-1234-4234-8234-123456789abc';
const rules = { code: 'ADMIN15', discount_type: 'PERCENT', discount_value: 15, min_entry_fee: 1500, usage_limit: 10, per_person_limit: 1 };
const definition = { ...rules, label: couponLabel(rules) };
const inventory = [
  { ...rules, id, active: true, created_at: '2026-10-04', used: 2, reserved: 1, remaining: 7 },
  { ...rules, id: 'inactive', code: 'INACTIVE', active: false, remaining: 10 },
  { ...rules, id: 'exhausted', code: 'EXHAUSTED', active: true, remaining: 0 },
];
const entryInput = { selections: [{ sportId: 'pickleball', categoryId: 'open-doubles' }], date: '2026-10-18', captainName: 'Test Player', email: 'player@example.com', phone: '9811000000', coupon: 'ADMIN15' };

test('Admin validation accepts flat/percent rules and rejects invalid values and allocations', () => {
  assert.equal(CouponFormSchema.parse({ ...rules, code: ' admin15 ' }).code, 'ADMIN15');
  assert.equal(CouponFormSchema.safeParse({ ...rules, discount_type: 'FLAT', discount_value: '500' }).success, true);
  for (const patch of [
    { code: 'INVALID CODE' }, { code: 'A' }, { discount_value: 0 }, { discount_value: 100 },
    { min_entry_fee: -1 }, { usage_limit: 0 }, { per_person_limit: 0 }, { per_person_limit: 11 },
    { discount_value: 1.5 }, { usage_limit: '' },
  ]) assert.equal(CouponFormSchema.safeParse({ ...rules, ...patch }).success, false, JSON.stringify(patch));
});

test('Quotes use supplied database rules, inclusive entry thresholds and never discount extras', () => {
  const categories = [{ fee: 2000 }];
  const quote = quoteEntry({ categories, addons: { jersey: 2 }, coupon: 'ADMIN15', couponDefinition: definition });
  assert.equal(quote.discount, 300);
  assert.equal(quote.total, 2700);
  assert.equal(quoteEntry({ categories, addons: {}, coupon: 'EARLYBIRD' }).discount, 0);
  assert.equal(quoteEntry({ categories, addons: {}, coupon: 'FORGED', couponDefinition: definition }).discount, 0);
  assert.equal(couponDiscount(1499, definition), 0);
  assert.equal(couponDiscount(1500, definition), 225);
  assert.equal(couponDiscount(2000, { ...definition, discount_type: 'FLAT', discount_value: 500 }), 500);
  assert.equal(couponDiscount(2000, { ...definition, discount_type: 'FLAT', discount_value: 9999 }), 1999);
  assert.match(couponLabel({ ...rules, discount_type: 'FLAT', discount_value: 500 }), /₹500 off/);
  const parsed = parseLeagueEntry({ ...entryInput, couponDefinition: { ...definition, discount_value: 99 } });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.quote.discount, 0, 'Browser cannot supply discount rules to the payment parser');
});

test('Only active, unallocated coupons are public; contact data and internal inventory stay private', async () => {
  const server = loader({ '@/lib/db/supabase': { supabaseAdmin: { rpc: async () => ({ data: inventory, error: null }) } } })('src/lib/league/coupon-server.ts');
  const offers = await server.availableCoupons();
  assert.deepEqual(offers.map(c => c.code), ['ADMIN15']);
  for (const key of ['id', 'used', 'reserved', 'remaining', 'created_at', 'email_key', 'phone_key']) assert.equal(key in offers[0], false);
});

test('Coupon preview checks thresholds and per-person redemptions without allocating uses', async () => {
  let count = 0;
  const filters = [];
  const query = {
    select: () => query, eq: (key, value) => { filters.push([key, value]); return query; },
    or: value => { filters.push(['or', value]); return Promise.resolve({ count, error: null }); },
  };
  const server = loader({ '@/lib/db/supabase': { supabaseAdmin: { rpc: async () => ({ data: inventory, error: null }), from: () => query } } })('src/lib/league/coupon-server.ts');
  await assert.rejects(server.previewCoupon('EXHAUSTED', 2000, 'player@example.com', '9811000000'), /fully allocated/);
  await assert.rejects(server.previewCoupon('ADMIN15', 1499, 'player@example.com', '9811000000'), /₹1,500/);
  assert.equal((await server.previewCoupon('admin15', 2000, 'PLAYER@example.com', '+91 98110 00000')).code, 'ADMIN15');
  assert.ok(filters.some(([key, value]) => key === 'or' && value.includes('phone_key.eq.9811000000')));
  count = 1;
  await assert.rejects(server.previewCoupon('ADMIN15', 2000, 'player@example.com', '9811000000'), /contact.*limit/);
});

test('Unauthorized admin coupon mutations cannot touch the database', async () => {
  const actions = loader({
    '../session': { authorize: async () => null }, '../audit': {}, 'next/cache': {},
    '@/lib/db/supabase': { supabaseAdmin: { from: () => { throw new Error('Unauthorized database access'); } } },
  })('src/lib/admin/actions/league-coupons.ts');
  assert.equal((await actions.createLeagueCoupon(null, new FormData())).ok, false);
  assert.equal((await actions.setLeagueCouponActive(null, new FormData())).ok, false);
});

test('Admin creates and deactivates codes with audit records and refreshed inventory', async () => {
  let payload;
  let fail = false;
  const events = [];
  const query = {
    insert: value => { payload = value; return query; }, update: value => { payload = value; return query; },
    eq: () => query, select: () => query,
    single: async () => ({ data: { id }, error: fail ? { code: '23505' } : null }),
  };
  const actions = loader({
    '../session': { authorize: async () => ({ id: 'admin' }) }, '../audit': { recordAudit: async (...args) => events.push(args) },
    'next/cache': { revalidatePath: path => events.push(path) }, '@/lib/db/supabase': { supabaseAdmin: { from: () => query } },
  })('src/lib/admin/actions/league-coupons.ts');
  const form = new FormData(); Object.entries(rules).forEach(([key, value]) => form.set(key, String(value)));
  assert.equal((await actions.createLeagueCoupon(null, form)).ok, true);
  assert.deepEqual(payload, rules);
  assert.ok(events.some(event => Array.isArray(event) && event[1] === 'league.coupon_create'));
  fail = true;
  assert.match((await actions.createLeagueCoupon(null, form)).message, /already exists/);
  fail = false;
  const status = new FormData(); status.set('id', id); status.set('active', 'false');
  assert.equal((await actions.setLeagueCouponActive(null, status)).ok, true);
  assert.deepEqual(payload, { active: false });
});

test('Coupon API is uncached, fails closed and rejects invalid contact/query syntax', async () => {
  let previews = 0;
  const route = loader({
    '@/lib/middlewares/rate-limiter': { withRateLimit: async (req, _options, callback) => callback(req) },
    '@/lib/league/coupon-server': { availableCoupons: async () => [definition], previewCoupon: async () => { previews++; return definition; } },
  })('src/app/api/v1/public/league/coupons/route.ts');
  const response = await route.GET(new Request('https://example.com/coupons'));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual((await response.json()).coupons.map(c => c.code), ['ADMIN15']);
  const post = value => route.POST(new Request('https://example.com/coupons', { method: 'POST', body: JSON.stringify(value) }));
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ code: 'ADMIN15', entryFee: 2000, email: 'a,b@example.com', phone: '9811000000' })).status, 400);
  assert.equal(previews, 0);
  assert.equal((await post({ code: 'ADMIN15', entryFee: 2000, email: 'player@example.com', phone: '9811000000' })).status, 200);
  assert.equal(previews, 1);
});

test('Coupon bookings use an atomic RPC and surface exhausted allocations as checkout errors', async () => {
  let error = null;
  let args;
  const parsed = parseLeagueEntry(entryInput);
  const booking = loader({
    '@/lib/db/supabase': { supabaseAdmin: {
      rpc: async (name, values) => { assert.equal(name, 'league_create_coupon_booking'); args = values; return { data: { id, amount_paise: 204000 }, error }; },
      from: () => { throw new Error('Discounted booking must not use separate insert'); },
    } }, '@/lib/razorpay': {}, './email': {},
  })('src/lib/league/bookings.ts');
  assert.equal((await booking.createLeagueBooking(parsed.entry, parsed.quote)).amount_paise, 204000);
  assert.equal(args.p_entry.coupon, 'ADMIN15');
  assert.equal(args.p_quote.discount, 0);
  error = { code: 'P0001', message: 'This coupon is fully allocated.' };
  await assert.rejects(booking.createLeagueBooking(parsed.entry, parsed.quote), error => error.status === 409 && /fully allocated/.test(error.message));
});

test('Order API charges the database discount and reuses a reserved order on retry', async () => {
  const prior = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  process.env.RAZORPAY_KEY_ID = 'test'; process.env.RAZORPAY_KEY_SECRET = 'test';
  let reused = false;
  let gatewayCalls = 0;
  class BookingError extends Error { constructor(message, status) { super(message); this.status = status; } }
  const route = loader({
    '@/lib/middlewares/rate-limiter': { withRateLimit: async (req, _options, callback) => callback(req) },
    '@/lib/league/bookings': {
      LeagueBookingError: BookingError,
      createLeagueBooking: async () => ({ id, amount_paise: 204000, quote: { total: 2040, discount: 360 }, razorpay_order_id: reused ? 'order_existing' : null }),
      attachLeagueOrder: async () => {},
    },
    '@/lib/razorpay': { getRazorpay: () => ({ orders: { create: async args => { gatewayCalls++; assert.equal(args.amount, 204000); return { id: 'order_new' }; } } }) },
  })('src/app/api/v1/public/league/entries/order/route.ts');
  try {
    const post = () => route.POST(new Request('https://example.com/order', { method: 'POST', body: JSON.stringify({ entry: entryInput }) }));
    const first = await post(); assert.equal(first.status, 201);
    assert.equal((await first.json()).quote.discount, 360);
    reused = true;
    assert.equal((await (await post()).json()).orderId, 'order_existing');
    assert.equal(gatewayCalls, 1);
  } finally {
    for (const [key, value] of [['RAZORPAY_KEY_ID', prior[0]], ['RAZORPAY_KEY_SECRET', prior[1]]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('Admin coupon UI guards before inventory reads and exposes every required field', async () => {
  const events = [];
  const page = loader({
    '@/lib/admin/session': { requireAdmin: async () => events.push('auth') },
    '@/lib/league/coupon-server': { couponInventory: async () => { events.push('database'); return inventory.slice(0, 1); } },
    '@/lib/admin/actions/league-coupons': {},
    '@/components/admin/action-form': {
      ActionForm: ({ children, className }) => createElement('form', { className }, children),
      FormMessage: () => null, SubmitButton: ({ children }) => createElement('button', {}, children),
    },
  })('src/app/admin/(panel)/multisports-league/coupons/page.tsx').default;
  const html = renderToStaticMarkup(await page());
  assert.deepEqual(events, ['auth', 'database']);
  for (const field of ['code', 'discount_type', 'discount_value', 'min_entry_fee', 'usage_limit', 'per_person_limit']) assert.ok(html.includes(`name="${field}"`), field);
  for (const text of ['Flat amount', 'Percentage', 'Paid uses', 'Reserved', 'Available', 'Deactivate', 'ADMIN15']) assert.ok(html.includes(text), text);
});

test('Review renders only fetched offers; hardcoded EARLYBIRD is gone', () => {
  const parsed = parseLeagueEntry({ ...entryInput, coupon: null });
  const page = loader({
    '@/components/league/booking-context': { useLeagueBooking: () => ({
      draft: { ...entryInput, coupon: null, addons: {}, squadSize: 2 }, ready: true,
      sport: parsed.entry.sport, sports: parsed.entry.sports, categories: parsed.entry.categories,
      pricing: parsed.quote, coupons: [definition, { ...definition, code: 'FLAT500', discount_type: 'FLAT', discount_value: 500, label: '₹500 off entries' }], couponsLoading: false, couponError: null,
      applyCoupon: async () => ({ ok: true, message: 'Applied' }), removeCoupon: () => {},
    }) },
    '@/components/league/pay-button': { LeaguePayButton: () => createElement('button', {}, 'Pay') },
  })('src/app/gameon-multisports-league/book/review/page.tsx').default;
  const html = renderToStaticMarkup(createElement(page));
  for (const text of ['ADMIN15', 'FLAT500', '₹500 off', 'Tap to apply', 'Coupon code']) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /EARLYBIRD/);
});