/** node --test scripts/test-scanner.mjs — no real check-ins or external calls. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function loader(mocks = {}) {
  const cache = new Map();
  function load(path) {
    const filename = resolve(root, path);
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = { exports: {} }; cache.set(filename, loaded);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText;
    new Function('require', 'module', 'exports', compiled)(name => {
      if (name in mocks) return mocks[name];
      if (name === 'server-only') return {};
      if (name.startsWith('.') || name.startsWith('@/')) {
        const target = name.startsWith('@/') ? resolve(root, 'src', name.slice(2)) : resolve(dirname(filename), name);
        return load(existsSync(`${target}.ts`) ? `${target}.ts` : target);
      }
      return require(name);
    }, loaded, loaded.exports);
    return loaded.exports;
  }
  return load;
}
const id = '11111111-1111-4111-8111-111111111111';
const actor = '22222222-2222-4222-8222-222222222222';
const { KeyboardScanBuffer, isScannerExcluded } = loader()('src/lib/scanner/keyboard-buffer.ts');
function type(buffer, code, gap = 5, start = 0) {
  [...code].forEach((key, index) => buffer.feed({ key }, start + index * gap));
  return buffer.feed({ key: 'Enter' }, start + code.length * gap);
}
test('rapid full UUID and activity QR finalize on Enter without a focused input', () => {
  for (const code of [id, `gameon:event:${id}`, `gameon:tournament:${id}`]) {
    const buffer = new KeyboardScanBuffer(); assert.equal(type(buffer, code).code, code);
    assert.equal(buffer.feed({ key: 'Enter' }, 500).code, null);
  }
});
test('normal human typing, fragments, delayed Enter and overflow are ignored', () => {
  assert.equal(type(new KeyboardScanBuffer(), id, 110).code, null);
  assert.equal(type(new KeyboardScanBuffer(), '123').code, null);
  assert.equal(type(new KeyboardScanBuffer(), 'x'.repeat(129)).code, null);
  const buffer = new KeyboardScanBuffer(); type(buffer, id); buffer.feed({ key: 'a' }, 600);
  assert.equal(buffer.feed({ key: 'Enter' }, 1000).code, null);
});
test('configurable affixes, Shift, modifiers, reset and timing thresholds', () => {
  assert.equal(type(new KeyboardScanBuffer({ prefix: ']Q3', suffix: '~' }), `]Q3${id}~`).code, id);
  assert.equal(type(new KeyboardScanBuffer({ prefix: 'X' }), id).code, null);
  assert.equal(type(new KeyboardScanBuffer({ maxInterCharacterMs: 100, maxAverageCharacterMs: 70 }), id, 60).code, id);
  const buffer = new KeyboardScanBuffer(); buffer.feed({ key: 'a' }, 0); buffer.feed({ key: 'Shift' }, 1);
  assert.equal(buffer.feed({ key: 's', ctrlKey: true }, 2).consume, false);
  assert.equal(buffer.feed({ key: 'a', isComposing: true }, 3).consume, false);
  assert.equal(buffer.feed({ key: 'a', repeat: true }, 4).consume, false);
  buffer.reset(); assert.equal(buffer.finish(), null);
});
test('editable controls are excluded from global scanning', () => {
  const previous = globalThis.Element;
  globalThis.Element = class { closest(selector) { assert.match(selector, /input, textarea, select/); return this.editable; } };
  try { const element = new Element(); element.editable = true; assert.equal(isScannerExcluded(element), true);
    element.editable = false; assert.equal(isScannerExcluded(element), false); assert.equal(isScannerExcluded(null), false);
  } finally { globalThis.Element = previous; }
});
test('rapid duplicates and concurrent different scans do not issue simultaneous requests', async () => {
  const { ScanRequestGate } = loader()('src/lib/scanner/verification-client.ts');
  const gate = new ScanRequestGate(); let release; let calls = 0;
  const task = () => { calls++; return new Promise(resolve => { release = resolve; }); };
  const first = gate.run(id, task); assert.equal(await gate.run(id, task), undefined);
  assert.equal(await gate.run('other', task), undefined); release('done'); assert.equal(await first, 'done');
  assert.equal(await gate.run(id, task), undefined); assert.equal(calls, 1);
  assert.equal(await gate.run('other', async () => 'next'), 'next');
});
test('verification client handles success, network error, bad response, auth, throttling and timeout', async () => {
  const { verifyScan } = loader()('src/lib/scanner/verification-client.ts');
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, init) => { assert.equal(init.credentials, 'same-origin'); assert.equal(JSON.parse(init.body).qrData, id);
      return Response.json({ success: true, status: 'checked_in', booking: { bookingId: id } }); };
    assert.equal((await verifyScan(id, 'hid')).success, true);
    for (const [status, expected] of [[401, 'unauthorized'], [403, 'unauthorized'], [429, 'rate_limited'], [503, 'server_error']]) {
      globalThis.fetch = async () => new Response('', { status }); assert.equal((await verifyScan(id, 'hid')).status, expected);
    }
    globalThis.fetch = async () => Response.json({ success: true }); assert.equal((await verifyScan(id, 'hid')).success, false);
    globalThis.fetch = async () => { throw new TypeError('offline'); }; assert.equal((await verifyScan(id, 'hid')).status, 'network_error');
    const controller = new AbortController(); controller.abort();
    globalThis.fetch = async (_url, init) => { assert.equal(init.signal.aborted, true); throw new DOMException('timeout', 'AbortError'); };
    assert.equal((await verifyScan(id, 'hid', undefined, controller.signal)).status, 'network_error');
  } finally { globalThis.fetch = old; }
});
function routeHarness({ session = { id: actor }, result = { success: true, status: 'checked_in', booking: { bookingId: id } }, fail = false } = {}) {
  const calls = [];
  const route = loader({
    '@/lib/admin/session': { getStaffSession: async () => session },
    '@/lib/middlewares/auth': { withAuth: async (req, roles, handler) => {
      assert.deepEqual(roles, ['ADMIN', 'STAFF']); return handler(req, { id: actor });
    } },
    '@/lib/middlewares/rate-limiter': { withRateLimit: (req, _options, handler) => handler(req) },
    '@/lib/services/reservation-check-in.service': { ReservationCheckInService: { verify: async (...args) => {
      calls.push(args); if (fail) throw new Error('secret database credentials'); return result;
    } } },
  })('src/app/api/v1/admin/bookings/verify-qr/route.ts');
  const request = (body, headers = {}) => new Request('https://game-on.in/api/v1/admin/bookings/verify-qr', {
    method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://game-on.in', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { route, request, calls };
}
test('existing bearer bookingId and panel cookie qrData reach the same authenticated operation', async () => {
  const h = routeHarness();
  for (const [body, headers] of [[{ qrData: id, source: 'hid' }, {}], [{ bookingId: id }, { authorization: 'Bearer staff' }]]) {
    const response = await h.route.POST(h.request(body, headers)); assert.equal(response.status, 200);
    assert.equal((await response.json()).bookingId, id);
  }
  assert.equal(h.calls.length, 2); assert.equal(h.calls[0][1].actorId, actor);
});
test('unauthorized, cross-site, malformed JSON, oversized and ambiguous input fail before check-in', async () => {
  const h = routeHarness();
  for (const [body, headers, status] of [['{bad', {}, 400], [{ qrData: id }, { origin: 'https://evil.example' }, 403],
    [{ qrData: id }, { 'sec-fetch-site': 'cross-site' }, 403], ['x'.repeat(2049), {}, 413], [{ qrData: id, bookingId: id }, {}, 400]]) {
    assert.equal((await h.route.POST(h.request(body, headers))).status, status);
  }
  assert.equal(h.calls.length, 0);
  const denied = routeHarness({ session: null }); assert.equal((await denied.route.POST(denied.request({ qrData: id }))).status, 401);
});
for (const status of ['invalid', 'not_found', 'cancelled', 'expired', 'payment_pending', 'already_checked_in', 'wrong_date', 'too_early', 'too_late', 'refunded', 'wrong_location']) {
  test(`API returns safe ${status} without claiming admission`, async () => {
    const h = routeHarness({ result: { success: false, status, message: status } });
    const response = await h.route.POST(h.request({ qrData: id })); assert.equal(response.status, 400);
    const result = await response.json(); assert.equal(result.success, false); assert.equal(result.status, status);
  });
}
test('database failure never reports success or leaks internal details', async () => {
  const h = routeHarness({ fail: true }); const response = await h.route.POST(h.request({ qrData: id }));
  assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /secret|credentials/);
});
test('all reservation types delegate actor/context to atomic RPC; database failure propagates', async () => {
  const calls = [];
  const load = loader({ '../db/supabase': { supabaseAdmin: { rpc: async (name, params) => {
    calls.push([name, params]); return { data: { success: true, status: 'checked_in' }, error: null };
  } } } });
  const service = load('src/lib/services/reservation-check-in.service.ts').ReservationCheckInService;
  for (const code of [id, `gameon:event:${id}`, `gameon:tournament:${id}`]) assert.equal((await service.verify(code, { actorId: actor, source: 'hid' })).success, true);
  assert.equal(calls.length, 3); assert.equal(calls[0][0], 'check_in_reservation'); assert.equal(calls[0][1].p_actor_id, actor);
  const failed = loader({ '../db/supabase': { supabaseAdmin: { rpc: async () => ({ error: new Error('offline') }) } } });
  await assert.rejects(failed('src/lib/services/check-in-operation.ts').performCheckIn(id, { actorId: actor }), /offline/);
});
test('SQL enforces locking, current-role validation, audit transaction and private execution', () => {
  const sql = readFileSync(resolve(root, 'supabase/migrations/20261017172209_atomic_reservation_check_in.sql'), 'utf8');
  assert.match(sql, /for update/g); assert.match(sql, /security definer set search_path = ''/);
  assert.match(sql, /raw_app_meta_data->>'role' in \('ADMIN', 'STAFF'\)/);
  assert.match(sql, /insert into public.admin_audit_log/); assert.match(sql, /from public, anon, authenticated/);
  assert.doesNotMatch(sql, /exception when|commit;/i);
});