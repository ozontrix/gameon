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
const { leaguePaymentSchedule, formatLeaguePayment } = load('src/lib/league/payment-plan.ts');
const { confirmationBalance } = load('src/lib/league/confirmation.ts');
const input = { sport: 'badminton', categoryIds: [SPORTS[0].categories[0].id], date: '2026-10-25', captainName: 'Test Player', teamName: 'Test Team', email: 'player@example.com', phone: '9811000000', notes: 'Saved checkout notes', city: 'Gurugram', addons: {} };
const parsed = parseLeagueEntry(input);
assert.equal(parsed.ok, true);
const id = '12345678-1234-4234-8234-123456789abc';

function harness({ payment = {}, mail = { sent: true }, failWrite = false, entryResult = parsed } = {}) {
  const rows = [];
  const calls = { emails: 0, fetches: 0, capturedBeforeEmail: false };
  const gatewayPayment = { id: 'pay_valid', order_id: 'order_valid', amount: leaguePaymentSchedule(entryResult.quote.total, entryResult.entry.paymentPlan).dueNowPaise, currency: 'INR', status: 'captured', ...payment };
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

test('Every badminton category keeps its corrected date through saved checkout, payment, success and both email formats', async () => {
  const expected = [
    ['u13-boys-singles', '2026-10-25'], ['u13-girls-singles', '2026-10-25'],
    ['u17-boys-singles', '2026-10-25'], ['mixed-doubles', '2026-10-24'],
    ['mens-singles', '2026-10-24'], ['womens-singles', '2026-10-24'], ['mens-doubles', '2026-10-24'],
  ];
  for (const [categoryId, date] of expected) {
    for (const paymentPlan of ['FULL', 'DEPOSIT_20']) {
      const entryResult = parseLeagueEntry({ ...input, selections: [{ sportId: 'badminton', categoryId }], date, paymentPlan });
      assert.equal(entryResult.ok, true, categoryId);
      const h = harness({ entryResult });
      await h.seed();
      assert.equal(h.rows[0].entry.categories[0].date, date);
      assert.equal(h.rows[0].entry.date, date);
      assert.deepEqual(h.rows[0].entry.dates, [date]);
      const receipt = await h.confirmLeaguePayment('order_valid', 'pay_valid');
      assert.equal(receipt.entry.categories[0].date, date);
      const screen = loader({
        react: { ...require('react'), useSyncExternalStore: () => JSON.stringify(receipt) },
      })('src/components/league/confirmation-screen.tsx').LeagueConfirmationScreen;
      const html = renderToStaticMarkup(createElement(screen));
      const day = date.endsWith('24') ? '24' : '25';
      const otherDay = day === '24' ? '25' : '24';
      assert.match(html, new RegExp(`${day} Oct,? 2026`));
      assert.doesNotMatch(html, new RegExp(`${otherDay} Oct,? 2026`));
      const email = load('src/lib/league/email.ts').renderLeagueConfirmationEmail(receipt);
      const weekday = day === '24' ? 'Saturday' : 'Sunday';
      for (const content of [email.text, email.html]) {
        assert.match(content, new RegExp(`${weekday}, ${day} October,? 2026`));
        assert.doesNotMatch(content, new RegExp(`${otherDay} Oct(?:ober)?,? 2026`));
      }
    }
  }
});

test('Multi-sport checkout persists every qualified category under one captured payment', async () => {
  const selections = [
    { sportId: 'badminton', categoryId: 'mixed-doubles' },
    { sportId: 'pickleball', categoryId: 'mixed-doubles' },
    { sportId: 'cricket', categoryId: 'team' },
    { sportId: 'football', categoryId: 'team' },
  ];
  const entryResult = parseLeagueEntry({ ...input, selections, date: '2026-10-24' });
  assert.equal(entryResult.ok, true);
  const h = harness({ entryResult }); await h.seed();
  assert.equal(h.rows.length, 1);
  assert.equal(h.rows[0].sport, 'multisport');
  assert.equal(h.rows[0].amount_paise, 840000);
  assert.deepEqual(h.rows[0].entry.categories.map(c => [c.sportId, c.id]), selections.map(c => [c.sportId, c.categoryId]));
  const confirmation = await h.confirmLeaguePayment('order_valid', 'pay_valid');
  assert.equal(confirmation.amount, 8400);
  assert.equal(confirmation.entry.sports.length, 4);
  assert.equal(confirmation.entry.categories.length, 4);
  assert.equal(h.calls.emails, 1);
  const email = load('src/lib/league/email.ts').renderLeagueConfirmationEmail(confirmation);
  for (const text of ['Badminton · Open Mixed Doubles', 'Pickleball · Open Mixed Doubles', 'Box Cricket 7v7 · Team Entry (7v7)', 'Football 6v6 · Team Entry (6v6)', '₹8,400']) assert.ok(email.text.includes(text), text);
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
      '@/lib/league/bookings': { LeagueBookingError: class extends Error {}, createLeagueBooking: async () => { events.push('database'); if (fail) throw new Error('DB unavailable'); return { id }; }, attachLeagueOrder: async () => { events.push('attach'); } },
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
  const { csvCell } = loader({})('src/lib/admin/csv.ts');
  for (const text of ['=SUM(1,2)', '+123', '  @formula', '\ttext', '-formula']) assert.ok(csvCell(text).startsWith('"\''));
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
  for (const value of [input.email, input.captainName, input.notes, 'pay_valid', 'U-13 Singles Boys', '2026-10-25']) assert.ok(csv.includes(value), value);
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

test('20% advance persists and verifies separately from the complete price for every sport', async () => {
  for (const sport of SPORTS) {
    const entryResult = parseLeagueEntry({ ...input, sport: sport.id, categoryIds: [sport.categories[0].id], date: sport.categories[0].date, paymentPlan: 'DEPOSIT_20' });
    assert.equal(entryResult.ok, true);
    const h = harness({ entryResult }); await h.seed();
    assert.equal(h.rows[0].entry.paymentPlan, 'DEPOSIT_20');
    assert.equal(h.rows[0].quote.total, entryResult.quote.total);
    assert.equal(h.rows[0].amount_paise, entryResult.quote.total * 20);
    const receipt = await h.confirmLeaguePayment('order_valid', 'pay_valid');
    assert.equal(receipt.amount, entryResult.quote.total / 5);
    assert.equal(confirmationBalance(receipt), entryResult.quote.total * 0.8);
    assert.equal(h.calls.emails, 1);
    assert.deepEqual(await h.confirmLeaguePayment('order_valid', 'pay_valid'), receipt);
    const email = load('src/lib/league/email.ts').renderLeagueConfirmationEmail(receipt);
    for (const content of [email.text, email.html]) {
      assert.ok(content.includes('Advance paid (20%)'));
      assert.ok(content.includes('Remaining balance'));
      assert.ok(content.includes(formatLeaguePayment(confirmationBalance(receipt))));
      assert.ok(content.includes('will not be charged automatically'));
    }
    const wrong = harness({ entryResult, payment: { amount: entryResult.quote.total * 100 } }); await wrong.seed();
    await assert.rejects(wrong.confirmLeaguePayment('order_valid', 'pay_valid'), error => error.status === 409);
    assert.equal(wrong.calls.emails, 0);
  }
});

test('Mixed-sport advance confirms one order with all categories and exposes outstanding amount on success', async () => {
  const selections = SPORTS.map(s => ({ sportId: s.id, categoryId: s.categories[0].id }));
  const entryResult = parseLeagueEntry({ ...input, selections, date: '2026-10-24', paymentPlan: 'DEPOSIT_20' });
  assert.equal(entryResult.ok, true);
  const h = harness({ entryResult }); await h.seed();
  const receipt = await h.confirmLeaguePayment('order_valid', 'pay_valid');
  assert.equal(receipt.entry.sports.length, 4);
  assert.equal(receipt.amount, entryResult.quote.total / 5);
  assert.equal(h.calls.emails, 1);
  const screen = loader({
    react: { ...require('react'), useSyncExternalStore: () => JSON.stringify(receipt) },
  })('src/components/league/confirmation-screen.tsx').LeagueConfirmationScreen;
  const html = renderToStaticMarkup(createElement(screen));
  for (const text of ['20% advance paid', 'Advance paid (20%)', 'Remaining balance', 'will not be charged automatically', formatLeaguePayment(receipt.amount), formatLeaguePayment(confirmationBalance(receipt))]) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('Paid in full'));
});

test('Payment plans default to full, reject untrusted percentages, and preserve paise after discounts', () => {
  assert.equal(parseLeagueEntry(input).entry.paymentPlan, undefined);
  for (const paymentPlan of ['DEPOSIT_1', 'deposit', 20, null]) assert.equal(parseLeagueEntry({ ...input, paymentPlan }).ok, false);
  const schedule = leaguePaymentSchedule(2041, 'DEPOSIT_20');
  assert.deepEqual(schedule, { plan: 'DEPOSIT_20', totalPaise: 204100, dueNowPaise: 40820, balancePaise: 163280 });
  assert.equal(leaguePaymentSchedule(2041).dueNowPaise, 204100);
  assert.equal(formatLeaguePayment(408.2), '₹408.20');
  assert.throws(() => leaguePaymentSchedule(NaN));
  const cart = load('src/components/league/cart.ts');
  assert.equal(cart.restoreDraft({ ...input, paymentPlan: 'DEPOSIT_20' }).paymentPlan, 'DEPOSIT_20');
  assert.equal(cart.restoreDraft({ ...input, paymentPlan: 'INVALID' }).paymentPlan, 'FULL');
});

test('Review exposes accessible full/20% choices and exact amounts for all sports and mixed carts', () => {
  const reactRuntime = require('react/jsx-runtime');
  for (const selections of [...SPORTS.map(s => [{ sportId: s.id, categoryId: s.categories[0].id }]), SPORTS.map(s => ({ sportId: s.id, categoryId: s.categories[0].id }))]) {
    for (const paymentPlan of ['FULL', 'DEPOSIT_20']) {
      const date = selections.map(s => SPORTS.find(sport => sport.id === s.sportId).categories.find(c => c.id === s.categoryId).date).sort()[0];
      const result = parseLeagueEntry({ ...input, date, selections, paymentPlan });
      assert.equal(result.ok, true);
      const radios = [], patches = [];
      const capture = kind => (tag, props, key) => { if (tag === 'input' && props.type === 'radio') radios.push(props); return reactRuntime[kind](tag, props, key); };
      const page = loader({
        '@/components/league/booking-context': { useLeagueBooking: () => ({ draft: { ...input, selections, paymentPlan, addons: {} }, ready: true, sport: result.entry.sport, sports: result.entry.sports, categories: result.entry.categories, pricing: result.quote, coupons: [], couponsLoading: false, couponError: null, update: patch => patches.push(patch) }) },
        '@/components/league/pay-button': { LeaguePayButton: ({ label }) => createElement('button', {}, label) },
        'react/jsx-runtime': { ...reactRuntime, jsx: capture('jsx'), jsxs: capture('jsxs') },
      })('src/app/gameon-multisports-league/book/review/page.tsx').default;
      const html = renderToStaticMarkup(createElement(page));
      assert.equal(radios.length, 2);
      assert.equal(radios.filter(r => r.checked).length, 1);
      assert.ok(html.includes('Pay in full'));
      assert.ok(html.includes('Book your slot at just 20%'));
      assert.ok(html.includes('Remaining balance'));
      assert.ok(html.includes(formatLeaguePayment(leaguePaymentSchedule(result.quote.total, paymentPlan).dueNowPaise / 100)));
      radios.find(r => r.value === 'DEPOSIT_20').onChange();
      assert.deepEqual(patches, [{ paymentPlan: 'DEPOSIT_20' }]);
    }
  }
});

test('Deposit admin list, details and CSV distinguish the captured advance from the remaining balance', async () => {
  const entryResult = parseLeagueEntry({ ...input, paymentPlan: 'DEPOSIT_20' });
  const h = harness({ entryResult }); await h.seed(); await h.confirmLeaguePayment('order_valid', 'pay_valid');
  const queries = loader({ '@/lib/db/supabase': { supabaseAdmin: {} } })('src/lib/admin/queries/league.ts');
  const mocks = {
    '@/lib/admin/session': { requireAdmin: async () => ({ role: 'ADMIN' }), getStaffSession: async () => ({ role: 'ADMIN' }) },
    '@/lib/admin/queries/league': { ...queries, listLeagueBookings: async () => ({ bookings: h.rows, total: 1 }), getLeagueBooking: async () => h.rows[0] },
    '@/lib/admin/actions/league': {},
    '@/components/admin/action-form': {},
  };
  const list = loader(mocks)('src/app/admin/(panel)/multisports-league/page.tsx').default;
  const detail = loader(mocks)('src/app/admin/(panel)/multisports-league/[id]/page.tsx').default;
  for (const html of [renderToStaticMarkup(await list({ searchParams: Promise.resolve({}) })), renderToStaticMarkup(await detail({ params: Promise.resolve({ id }) }))]) {
    assert.ok(html.includes('Advance paid / reserved'));
    assert.ok(!html.includes('>Paid / confirmed<'));
  }
  const csv = await (await loader(mocks)('src/app/admin/(panel)/multisports-league/export/route.ts').GET(new Request('https://example.com/export'))).text();
  assert.ok(csv.includes('Remaining balance INR'));
  assert.ok(csv.includes('"DEPOSIT_20"'));
});