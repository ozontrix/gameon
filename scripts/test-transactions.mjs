/** Run: node --test scripts/test-transactions.mjs. No DB writes or payments. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const userId = '11111111-1111-4111-8111-111111111111';
let operations = [], fail = false;
const dbRow = { id: 'event:receipt', category: 'event', created_at: '2026-10-02T10:00:00Z', title: 'Community event tickets', subtitle: '2 tickets', booking_id: userId, amount: '-750.50', currency: 'INR', points: 0, reason: null, status: 'Paid', payment_reference: 'pay_example', points_used: 0 };
const admin = { from(table) {
  assert.equal(table, 'account_transactions');
  operations = [];
  const query = {
    select(...args) { operations.push(['select', ...args]); return this; },
    eq(...args) { operations.push(['eq', ...args]); return this; },
    order(...args) { operations.push(['order', ...args]); return this; },
    async range(...args) {
      operations.push(['range', ...args]);
      return fail ? { error: new Error('DB unavailable') } : { data: [dbRow], count: 21, error: null };
    },
  };
  return query;
} };
const cache = new Map();
function load(path) {
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const localRequire = (name) => {
    if (name === '../db/supabase') return { supabaseAdmin: admin };
    if (name === '@/lib/middlewares/auth') return { withAuth: async (request, _roles, handler) => {
      if (!request.headers.has('authorization')) return require('next/server').NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      return handler(request, { id: userId, role: 'USER' });
    } };
    if (name.startsWith('@/')) return load(resolve(root, `src/${name.slice(2)}.ts`));
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  cache.set(path, module.exports);
  return module.exports;
}
const { TransactionService } = load(resolve(root, 'src/lib/services/transaction.service.ts'));
const route = load(resolve(root, 'src/app/api/v1/user/transactions/route.ts'));
const presentation = load(resolve(root, '../gameon-multisports/src/constants/transactions.ts'));
const request = (query = '', auth = true) => new Request(`https://gameonmultisports.com/api/v1/user/transactions${query}`, { headers: auth ? { authorization: 'Bearer mock' } : {} });

test('Every read is scoped to the authenticated account and ordered deterministically', async () => {
  const result = await TransactionService.list(userId, 1, 20, 'all');
  assert.ok(operations.some((op) => op[0] === 'eq' && op[1] === 'user_id' && op[2] === userId));
  assert.deepEqual(operations.filter((op) => op[0] === 'order').map((op) => op[1]), ['created_at', 'id']);
  assert.equal(result.rows[0].amount, -750.5);
  assert.equal(result.rows[0].paymentReference, 'pay_example');
  assert.equal(result.hasMore, true);
});
test('Category filter runs before pagination and later pages use the correct range', async () => {
  const result = await TransactionService.list(userId, 2, 20, 'event');
  assert.ok(operations.some((op) => op[0] === 'eq' && op[1] === 'category' && op[2] === 'event'));
  assert.deepEqual(operations.at(-1), ['range', 20, 39]);
  assert.equal(result.hasMore, false);
});
test('Endpoint ignores caller-supplied account IDs and disables receipt caching', async () => {
  const response = await route.GET(request('?userId=another-account'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.ok(operations.some((op) => op[0] === 'eq' && op[1] === 'user_id' && op[2] === userId));
});
test('Anonymous requests are rejected', async () => {
  assert.equal((await route.GET(request('', false))).status, 401);
});
test('Invalid pages, limits and categories are rejected', async () => {
  for (const query of ['?page=0', '?page=1.5', '?limit=51', '?filter=unknown']) {
    assert.equal((await route.GET(request(query))).status, 400);
  }
});
test('DB failure does not become a misleading empty successful history', async () => {
  fail = true;
  try { assert.equal((await route.GET(request())).status, 500); }
  finally { fail = false; }
});
const history = { id: 'event:one', category: 'event', createdAt: '2026-10-02T10:00:00Z', title: 'Event tickets', subtitle: '2 tickets', bookingId: userId, amount: -750.5, currency: 'INR', points: 0, reason: null, status: 'Paid', paymentReference: 'pay_example', pointsUsed: 0 };
test('Cash payments retain currency, reference and rupee amount, not Points', () => {
  const row = presentation.toHistoryTransaction(history);
  assert.equal(row.amount, -750.5); assert.equal(row.currency, 'INR');
  assert.equal(row.points, 0); assert.ok(row.bookingId.startsWith('EV'));
  assert.equal(row.paymentReference, 'pay_example');
});
test('Wallet-only and mixed payments retain the distinct Points portion', () => {
  const row = presentation.toHistoryTransaction({ ...history, category: 'booking', amount: 0, pointsUsed: 500 });
  assert.equal(row.amount, 0); assert.equal(row.pointsUsed, 500); assert.ok(row.bookingId.startsWith('BK'));
  assert.equal(presentation.toHistoryTransaction({ ...history, category: 'booking', amount: -250, pointsUsed: 500 }).amount, -250);
});
test('Existing Points refunds and redemptions keep their correct labels and unit', () => {
  const refund = presentation.toHistoryTransaction({ ...history, category: 'refund', reason: 'refund_credit', amount: null, currency: null, points: 400 });
  assert.equal(refund.category, 'refund'); assert.equal(refund.points, 400);
  assert.equal(refund.amount, undefined); assert.equal(refund.status, 'Credited');
  const redeem = presentation.toHistoryTransaction({ ...history, category: 'wallet', reason: 'booking_redeem', amount: null, points: -100 });
  assert.equal(redeem.status, 'Redeemed'); assert.equal(redeem.points, -100);
});