/** node --test scripts/test-league-bookings.mjs. Gateway, auth, email and DB mocked. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function loader(mocks = {}) {
  const modules = new Map();
  function load(relative) {
    const filename = resolve(root, relative);
    if (modules.has(filename)) return modules.get(filename).exports;
    const compiled = { exports: {} };
    modules.set(filename, compiled);
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } });
    const localRequire = id => {
      if (id in mocks) return mocks[id];
      if (id === 'server-only') return {};
      if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => createElement('a', props, children) };
      if (id.startsWith('@/') || id.startsWith('.')) {
        const path = id.startsWith('@/') ? resolve(root, 'src', id.slice(2)) : resolve(dirname(filename), id);
        return load(existsSync(`${path}.ts`) ? `${path}.ts` : `${path}.tsx`);
      }
      return require(id);
    };
    new Function('require', 'module', 'exports', outputText)(localRequire, compiled, compiled.exports);
    return compiled.exports;
  }
  return load;
}
const load = loader();
const { SPORTS } = load('src/components/league/data.ts');
const { parseLeagueEntry } = load('src/lib/league/entry.ts');
const input = { sport: 'badminton', categoryIds: [SPORTS[0].categories[0].id], date: '2026-10-17', captainName: 'Test Player', teamName: 'Test Team', email: 'player@example.com', phone: '9811000000', notes: 'Saved checkout notes', city: 'Gurugram', addons: {} };
const parsed = parseLeagueEntry(input);
assert.equal(parsed.ok, true);
const id = '12345678-1234-4234-8234-123456789abc';

function harness({ payment = {}, mail = { sent: true }, failWrite = false, entryResult = parsed } = {}) {
  const rows = [];
  const calls = { emails: 0, fetches: 0, capturedBeforeEmail: false };
  const gatewayPayment = { id: 'pay_valid', order_id: 'order_valid', amount: entryResult.quote.total * 100, currency: 'INR', status: 'captured', ...payment };
  const db = { from(table) {
    assert.equal(table, 'league_bookings');
    let operation = 'select', payload, filters = [], lease = false;
    function result() {
      let matched = rows.filter(row => filters.every(([key, value]) => row[key] === value));
      if (lease) matched = matched.filter(row => ['PENDING', 'FAILED'].includes(row.email_status) || (row.email_status === 'SENDING' && row.email_attempted_at < new Date(Date.now() - 600000).toISOString()));
      if (operation === 'insert') {
        const row = { id, status: 'PENDING', currency: 'INR', razorpay_order_id: null, razorpay_payment_id: null, reference: null, paid_at: null, email_status: 'PENDING', email_attempted_at: null, email_sent_at: null, email_error: null, created_at: '2026-10-02T09:00:00Z', updated_at: '2026-10-02T09:00:00Z', ...structuredClone(payload) };
        rows.push(row); matched = [row];
      }
      if (operation === 'update') {
        if (failWrite && payload.status === 'CONFIRMED') return { error: { message: 'Write unavailable' }, data: null };
        matched.forEach(row => Object.assign(row, structuredClone(payload)));
      }
      return { data: matched.length ? structuredClone(matched[0]) : null, error: null };
    }
    const query = {
      insert(value) { operation = 'insert'; payload = value; return this; },
      update(value) { operation = 'update'; payload = value; return this; },
      select() { return this; },
      eq(key, value) { filters.push([key, value]); return this; },
      is(key, value) { filters.push([key, value]); return this; },
      or() { lease = true; return this; },
      single() { return Promise.resolve(result()); },
      maybeSingle() { return Promise.resolve(result()); },
      then(resolve, reject) { return Promise.resolve().then(result).then(resolve, reject); },
    };
    return query;
  } };
  const modules = loader({
    '@/lib/db/supabase': { supabaseAdmin: db },
    '@/lib/razorpay': { getRazorpay: () => ({ payments: { fetch: async () => { calls.fetches++; return gatewayPayment; } } }) },
    './email': { sendLeagueConfirmationEmail: async () => { calls.emails++; calls.capturedBeforeEmail = rows[0].status === 'CONFIRMED'; return mail; } },
  });
  const bookings = modules('src/lib/league/bookings.ts');
  async function seed() { const row = await bookings.createLeagueBooking(entryResult.entry, entryResult.quote); await bookings.attachLeagueOrder(row.id, 'order_valid'); return row; }
  return { ...bookings, rows, calls, seed };
}

test('Checkout snapshot persists contact, categories, dates, fees and quote before associating order', async () => {
  const h = harness();
  const pending = await h.seed();
  assert.equal(pending.status, 'PENDING');
  assert.equal(h.rows[0].amount_paise, parsed.quote.total * 100);
  assert.equal(h.rows[0].entry.notes, 'Saved checkout notes');
  assert.deepEqual(h.rows[0].entry.categories.map(c => [c.id, c.date, c.fee]), parsed.entry.categories.map(c => [c.id, c.date, c.fee]));
  assert.equal(h.rows[0].razorpay_order_id, 'order_valid');
});

test('Captured payment is durable before email, and duplicate confirmations return the same receipt', async () => {
  const h = harness(); await h.seed();
  const first = await h.confirmLeaguePayment('order_valid', 'pay_valid');
  const second = await h.confirmLeaguePayment('order_valid', 'pay_valid');
  assert.deepEqual(second, first);
  assert.equal(first.emailSent, true);
  assert.equal(first.amount, parsed.quote.total);
  assert.equal(first.entry.captainName, input.captainName);
  assert.equal(h.calls.capturedBeforeEmail, true);
  assert.equal(h.calls.emails, 1); assert.equal(h.calls.fetches, 1);
});

test('Multi-sport checkout persists every qualified category under one captured payment', async () => {
  const selections = [
    { sportId: 'badminton', categoryId: 'mixed-doubles' },
    { sportId: 'pickleball', categoryId: 'mixed-doubles' },
    { sportId: 'cricket', categoryId: 'team' },
    { sportId: 'football', categoryId: 'team' },
  ];
  const entryResult = parseLeagueEntry({ ...input, selections });
  assert.equal(entryResult.ok, true);
  const h = harness({ entryResult }); await h.seed();
  assert.equal(h.rows.length, 1);
  assert.equal(h.rows[0].sport, 'multisport');
  assert.equal(h.rows[0].amount_paise, 800000);
  assert.deepEqual(h.rows[0].entry.categories.map(c => [c.sportId, c.id]), selections.map(c => [c.sportId, c.categoryId]));
  const confirmation = await h.confirmLeaguePayment('order_valid', 'pay_valid');
  assert.equal(confirmation.amount, 8000);
  assert.equal(confirmation.entry.sports.length, 4);
  assert.equal(confirmation.entry.categories.length, 4);
  assert.equal(h.calls.emails, 1);
  const email = load('src/lib/league/email.ts').renderLeagueConfirmationEmail(confirmation);
  for (const text of ['Badminton · Open Mixed Doubles', 'Pickleball · Open Mixed Doubles', 'Box Cricket 7v7 · Team Entry (7v7)', 'Football 6v6 · Team Entry (6v6)', '₹8,000']) assert.ok(email.text.includes(text), text);
});

test('Concurrent browser/webhook confirmations produce one payment and one email', async () => {
  const h = harness(); await h.seed();
  const receipts = await Promise.all([h.confirmLeaguePayment('order_valid', 'pay_valid'), h.confirmLeaguePayment('order_valid', 'pay_valid')]);
  assert.equal(new Set(receipts.map(r => r.reference)).size, 1);
  assert.equal(h.rows.length, 1); assert.equal(h.calls.emails, 1);
  assert.equal(h.rows[0].status, 'CONFIRMED');
});

test('Wrong amount, order, currency or uncaptured payment never confirms or sends email', async () => {
  for (const payment of [{ amount: 1 }, { order_id: 'order_other' }, { currency: 'USD' }, { status: 'authorized' }]) {
    const h = harness({ payment }); await h.seed();
    await assert.rejects(h.confirmLeaguePayment('order_valid', 'pay_valid'), error => error.status === 409);
    assert.equal(h.rows[0].status, 'PENDING'); assert.equal(h.calls.emails, 0);
  }
});

test('Unknown order and alternate payment ID are rejected without changing saved entry', async () => {
  const h = harness(); await h.seed();
  await assert.rejects(h.confirmLeaguePayment('order_unknown', 'pay_valid'), error => error.status === 404);
  await h.confirmLeaguePayment('order_valid', 'pay_valid');
  await assert.rejects(h.confirmLeaguePayment('order_valid', 'pay_other'), error => error.status === 409);
  assert.equal(h.rows[0].razorpay_payment_id, 'pay_valid'); assert.equal(h.calls.emails, 1);
});

test('Failed confirmation write does not send a pass or pretend payment was saved', async () => {
  const h = harness({ failWrite: true }); await h.seed();
  await assert.rejects(h.confirmLeaguePayment('order_valid', 'pay_valid'));
  assert.equal(h.rows[0].status, 'PENDING'); assert.equal(h.calls.emails, 0);
});

test('SMTP failure retains captured booking and supports a leased retry', async () => {
  const h = harness({ mail: { sent: false, error: 'SMTP refused' } }); await h.seed();
  const receipt = await h.confirmLeaguePayment('order_valid', 'pay_valid');
  assert.equal(receipt.emailSent, false); assert.equal(h.rows[0].status, 'CONFIRMED');
  assert.equal(h.rows[0].email_status, 'FAILED'); assert.equal(h.rows[0].email_error, 'SMTP refused');
  await h.deliverLeagueEmail(h.rows[0]); assert.equal(h.calls.emails, 2);
  h.rows[0].email_status = 'SENDING'; h.rows[0].email_attempted_at = new Date().toISOString();
  await h.deliverLeagueEmail(h.rows[0]); assert.equal(h.calls.emails, 2);
  h.rows[0].email_attempted_at = new Date(Date.now() - 11 * 60000).toISOString();
  await h.deliverLeagueEmail(h.rows[0]); assert.equal(h.calls.emails, 3);
});

test('Confirm API rejects invalid proof and ignores substituted entry/pricing', async () => {
  let signatureValid = false, confirmations = 0;
  const h = harness(); await h.seed();
  const route = loader({
    '@/lib/middlewares/rate-limiter': { withRateLimit: async (req, _options, callback) => callback(req) },
    '@/lib/razorpay': { isValidPaymentSignature: () => signatureValid },
    '@/lib/league/bookings': { LeagueBookingError: h.LeagueBookingError, confirmLeaguePayment: async (...args) => { confirmations++; return h.confirmLeaguePayment(...args); } },
  })('src/app/api/v1/public/league/entries/confirm/route.ts');
  const body = { razorpay_order_id: 'order_valid', razorpay_payment_id: 'pay_valid', razorpay_signature: 'a'.repeat(64), entry: { ...input, email: 'attacker@example.com', total: 1 } };
  const post = value => route.POST(new Request('https://example.com/api/confirm', { method: 'POST', body: JSON.stringify(value) }));
  assert.equal((await post({})).status, 400);
  assert.equal((await post(body)).status, 400); assert.equal(confirmations, 0);
  signatureValid = true;
  const response = await post(body); assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.confirmation.entry.email, input.email);
  assert.equal(result.confirmation.amount, parsed.quote.total);
});

test('Order API saves first, associates gateway order, then exposes checkout; DB failure fails closed', async () => {
  const events = [];
  let fail = false;
  const env = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  process.env.RAZORPAY_KEY_ID = 'test'; process.env.RAZORPAY_KEY_SECRET = 'test';
  try {
    const route = loader({
      '@/lib/middlewares/rate-limiter': { withRateLimit: async (req, _options, callback) => callback(req) },
      '@/lib/razorpay': { getRazorpay: () => ({ orders: { create: async args => { events.push('gateway'); assert.equal(args.receipt.length, 40); return { id: 'order_valid' }; } } }) },
      '@/lib/league/bookings': { createLeagueBooking: async () => { events.push('database'); if (fail) throw new Error('DB unavailable'); return { id }; }, attachLeagueOrder: async () => { events.push('attach'); } },
    })('src/app/api/v1/public/league/entries/order/route.ts');
    const post = () => route.POST(new Request('https://example.com/api/order', { method: 'POST', body: JSON.stringify({ entry: input }) }));
    assert.equal((await post()).status, 201); assert.deepEqual(events, ['database', 'gateway', 'attach']);
    events.length = 0; fail = true;
    assert.equal((await post()).status, 500); assert.deepEqual(events, ['database']);
  } finally {
    for (const [key, value] of [['RAZORPAY_KEY_ID', env[0]], ['RAZORPAY_KEY_SECRET', env[1]]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test('Signed Razorpay webhook confirms League and preserves existing booking routing', async () => {
  const oldSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test';
  class Missing extends Error { status = 404; }
  let leagueMissing = false, valid = true, leagueCalls = 0, normalCalls = 0;
  try {
    const route = loader({
      '@/lib/razorpay': { isValidWebhookSignature: () => valid },
      '@/lib/league/bookings': { LeagueBookingError: Missing, confirmLeaguePayment: async () => { leagueCalls++; if (leagueMissing) throw new Missing(); } },
      '@/lib/services/booking.service': { BookingError: Missing, BookingService: { confirmPaidOrder: async () => { normalCalls++; return { outcome: 'confirmed' }; } } },
      '@/lib/services/event.service': { EventError: Missing, EventService: {} },
      '@/lib/services/tournament.service': { TournamentError: Missing, TournamentService: {} },
    })('src/app/api/v1/webhooks/razorpay/route.ts');
    const post = event => route.POST(new Request('https://example.com/webhook', { method: 'POST', headers: { 'x-razorpay-signature': 'test' }, body: JSON.stringify({ event, payload: { payment: { entity: { id: 'pay_valid', order_id: 'order_valid' } } } }) }));
    valid = false; assert.equal((await post('payment.captured')).status, 400); assert.equal(leagueCalls, 0);
    valid = true; assert.equal((await (await post('payment.captured')).json()).outcome, 'league_confirmed'); assert.equal(normalCalls, 0);
    leagueMissing = true; assert.equal((await (await post('order.paid')).json()).outcome, 'confirmed'); assert.equal(normalCalls, 1);
    await post('payment.failed'); assert.equal(normalCalls, 1);
  } finally { if (oldSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET; else process.env.RAZORPAY_WEBHOOK_SECRET = oldSecret; }
});

test('League filters normalise repeated URL params and remove query syntax', () => {
  const queries = loader({ '@/lib/db/supabase': { supabaseAdmin: {} } })('src/lib/admin/queries/league.ts');
  const filters = queries.readLeagueFilters({ q: [' Player,(*) ', 'Other'], sport: ['football', 'badminton'], status: 'INVALID' });
  assert.equal(filters.q, 'Player'); assert.equal(filters.sport, 'football'); assert.equal(filters.status, undefined);
  assert.equal(queries.readLeagueFilters({ q: 'order_valid' }).q, 'order_valid');
});

test('CSV export and email retry deny non-admin users before touching data', async () => {
  const exportRoute = loader({ '@/lib/admin/session': { getStaffSession: async () => ({ role: 'STAFF' }) }, '@/lib/admin/queries/league': {} })('src/app/admin/(panel)/multisports-league/export/route.ts');
  assert.equal((await exportRoute.GET(new Request('https://example.com/export'))).status, 403);
  for (const text of ['=SUM(1,2)', '+123', '  @formula', '\ttext', '-formula']) assert.ok(exportRoute.csvCell(text).startsWith('"\''));
  const actions = loader({ '../session': { authorize: async () => null }, '../queries/league': {}, '../audit': {}, '@/lib/league/bookings': {}, 'next/cache': {} })('src/lib/admin/actions/league.ts');
  assert.equal((await actions.retryLeagueEmail(null, new FormData())).ok, false);
});

test('League admin page displays saved categories, contacts, paid and email statuses with labelled filters', async () => {
  const h = harness(); await h.seed(); await h.confirmLeaguePayment('order_valid', 'pay_valid');
  const queries = loader({ '@/lib/db/supabase': { supabaseAdmin: {} } })('src/lib/admin/queries/league.ts');
  const page = loader({ '@/lib/admin/session': { requireAdmin: async () => ({ role: 'ADMIN' }) }, '@/lib/admin/queries/league': { ...queries, listLeagueBookings: async () => ({ bookings: h.rows, total: 1 }) } })('src/app/admin/(panel)/multisports-league/page.tsx').default;
  const html = renderToStaticMarkup(await page({ searchParams: Promise.resolve({}) }));
  for (const expected of [input.captainName, input.email, input.phone, 'U-13 Singles Boys', 'Paid / confirmed', 'SENT', 'Export CSV', `/admin/multisports-league/${id}`]) assert.ok(html.includes(expected), expected);
  assert.match(html, /for="league-search"/); assert.match(html, /for="league-status"/);
});

test('CSV export paginates past the default database cap and includes saved details', async () => {
  const h = harness(); await h.seed(); await h.confirmLeaguePayment('order_valid', 'pay_valid');
  const queries = loader({ '@/lib/db/supabase': { supabaseAdmin: {} } })('src/lib/admin/queries/league.ts');
  const pages = [];
  const route = loader({
    '@/lib/admin/session': { getStaffSession: async () => ({ role: 'ADMIN' }) },
    '@/lib/admin/queries/league': { ...queries, listLeagueBookings: async (filters, page, size) => {
      assert.equal(filters.sport, 'badminton'); assert.equal(size, 500); pages.push(page);
      return { bookings: Array.from({ length: page < 3 ? 500 : 1 }, () => h.rows[0]), total: 1001 };
    } },
  })('src/app/admin/(panel)/multisports-league/export/route.ts');
  const response = await route.GET(new Request('https://example.com/export?sport=badminton'));
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  const csv = await response.text();
  assert.deepEqual(pages, [1, 2, 3]);
  assert.equal(csv.trim().split('\r\n').length, 1002);
  for (const value of [input.email, input.captainName, input.notes, 'pay_valid', 'U-13 Singles Boys', '2026-10-17']) assert.ok(csv.includes(value), value);
});

test('Admin detail renders frozen checkout, price breakdown and email failure; guard runs before database', async () => {
  const h = harness({ mail: { sent: false, error: 'SMTP refused' } }); await h.seed(); await h.confirmLeaguePayment('order_valid', 'pay_valid');
  const queries = loader({ '@/lib/db/supabase': { supabaseAdmin: {} } })('src/lib/admin/queries/league.ts');
  const componentMocks = {
    '@/lib/admin/queries/league': { ...queries, getLeagueBooking: async () => h.rows[0] },
    '@/lib/admin/actions/league': { retryLeagueEmail: async () => ({ ok: true }) },
    '@/components/admin/action-form': {
      ActionForm: ({ children, className }) => createElement('form', { className }, children),
      FormMessage: () => null,
      SubmitButton: ({ children }) => createElement('button', {}, children),
    },
  };
  const page = loader({ ...componentMocks, '@/lib/admin/session': { requireAdmin: async () => ({ role: 'ADMIN' }) } })('src/app/admin/(panel)/multisports-league/[id]/page.tsx').default;
  const html = renderToStaticMarkup(await page({ params: Promise.resolve({ id }) }));
  for (const value of [input.email, input.notes, 'U-13 Singles Boys', 'Razorpay payment', 'pay_valid', 'Price breakdown', 'SMTP refused', 'Retry confirmation email']) assert.ok(html.includes(value), value);
  let read = false;
  const denied = loader({ ...componentMocks, '@/lib/admin/session': { requireAdmin: async () => { throw new Error('DENIED'); } }, '@/lib/admin/queries/league': { getLeagueBooking: async () => { read = true; } } })('src/app/admin/(panel)/multisports-league/[id]/page.tsx').default;
  await assert.rejects(denied({ params: Promise.resolve({ id }) }), /DENIED/); assert.equal(read, false);
});