/** node --test scripts/test-whatsapp-inbox.mjs. No real Meta or database calls. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
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
    const module = { exports: {} }; cache.set(filename, module);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    new Function('require', 'module', 'exports', code)(name => {
      if (name in mocks) return mocks[name];
      if (name === 'server-only') return {};
      if (name.startsWith('.') || name.startsWith('@/')) {
        const target = name.startsWith('@/') ? resolve(root, 'src', name.slice(2)) : resolve(dirname(filename), name);
        return load(existsSync(`${target}.ts`) ? `${target}.ts` : existsSync(`${target}.tsx`) ? `${target}.tsx` : target);
      }
      return require(name);
    }, module, module.exports);
    return module.exports;
  }
  return load;
}
const actor = { id: '11111111-1111-4111-8111-111111111111', role: 'ADMIN', email: 'admin@test.invalid', name: 'Admin' };
const phone = '919876543210';
const template = { id: 'tpl1', name: 'league_update', language: 'en', status: 'APPROVED', category: 'UTILITY', components: [{ type: 'BODY', text: 'Hi {{customer}}, entry {{reference}}' }] };
const settings = { token: 'fake', phoneNumberId: '123', version: 'v25.0', appSecret: 'secret', verifyToken: 'verify' };
function harness({ contact = {}, optedOut = false, send, role = 'ADMIN', league = {}, dbFailure = false, metaTemplate = template } = {}) {
  const tables = {
    whatsapp_contacts: [{ phone, name: 'Player', last_inbound_at: new Date(Date.now() - 1000).toISOString(), utility_consent_at: new Date().toISOString(), ...contact }],
    whatsapp_opt_outs: optedOut ? [{ phone }] : [], whatsapp_chat_messages: [],
    league_bookings: [{ id: actor.id, phone: '+91 98765 43210', captain_name: 'Captain', reference: 'GO-123', status: 'CONFIRMED', amount_paise: 20000, ...league }],
  };
  const sent = [], audits = [], rpc = [];
  const db = { from(table) {
    const filters = []; let insert, upsert, options, update;
    const q = {
      select() { return q; }, eq(k, v) { filters.push(row => row[k] === v); return q; },
      order() { return q; }, limit() { return q; }, range() { return q; }, or() { return q; }, gt(k, v) { filters.push(row => row[k] > v); return q; },
      insert(value) { insert = value; return q; }, upsert(value, opts) { upsert = value; options = opts; return q; }, update(value) { update = value; return q; },
      async maybeSingle() { const result = run(); return { ...result, data: result.data?.[0] ?? null }; },
      then(ok, bad) { return Promise.resolve(run()).then(ok, bad); },
    };
    function run() {
      if (dbFailure) return { error: new Error('offline') };
      const rows = tables[table] ??= [];
      if (insert) {
        if (rows.some(row => row.request_key && row.request_key === insert.request_key)) return { error: { code: '23505' } };
        rows.push({ ...insert, created_at: new Date().toISOString() }); return { data: [], error: null };
      }
      if (upsert) {
        const key = options?.onConflict ?? 'phone'; const previous = rows.find(row => row[key] === upsert[key]);
        if (previous && !options?.ignoreDuplicates) Object.assign(previous, upsert);
        else if (!previous) rows.push({ ...upsert, id: randomUUID() });
        return { data: [], error: null };
      }
      const found = rows.filter(row => filters.every(filter => filter(row)));
      if (update) found.forEach(row => Object.assign(row, update));
      return { data: found.map(row => ({ ...row })), error: null, count: found.length };
    }
    return q;
  }, async rpc(name, args) { rpc.push({ name, args }); return { error: null }; } };
  const load = loader({
    '@/lib/db/supabase': { supabaseAdmin: db }, '@/lib/admin/audit': { recordAudit: async (...args) => audits.push(args) },
    '@/lib/admin/session': { getStaffSession: async () => role ? { ...actor, role } : null },
    './config': { getWhatsAppConfig: () => settings, whatsAppEnv: key => ({ WHATSAPP_WABA_ID: '456' })[key] || '' },
    '@/lib/whatsapp/config': { getWhatsAppConfig: () => settings, whatsAppEnv: key => ({ WHATSAPP_WABA_ID: '456', WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_APP_SECRET: 'secret' })[key] || '' },
    './client': { sendTemplateMessage: async (_config, payload) => { sent.push(payload); return send ? send(payload, tables) : { ok: true, data: { messageId: `wamid.${sent.length}` } }; } },
    '@/lib/services/whatsapp.service': { WhatsAppService: { applyStatusUpdate: async () => 1 } },
  });
  return { tables, sent, audits, rpc, load, metaTemplate, service: load('src/lib/whatsapp/inbox.ts') };
}
async function withMeta(fn, value = template) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ data: [value] });
  try { await fn(); } finally { globalThis.fetch = original; }
}
const shared = loader()('src/lib/whatsapp/inbox-shared.ts');
test('league number uses final ten digits and country code exactly once', () => {
  for (const value of ['9876543210', '+91 98765 43210', '0091-9876543210', '09876543210', '91 91 9876543210']) assert.equal(shared.leagueWhatsAppNumber(value), phone);
  for (const value of ['', null, '123', '1111111111', 'mobile']) assert.equal(shared.leagueWhatsAppNumber(value), null);
});
test('service window closes exactly at 24 hours and rejects future/invalid dates', () => {
  const now = Date.now();
  assert.equal(shared.serviceWindowOpen(new Date(now - 86399999).toISOString(), now), true);
  for (const date of [new Date(now - 86400000).toISOString(), new Date(now + 1).toISOString(), 'bad', null]) assert.equal(shared.serviceWindowOpen(date, now), false);
});
test('composer rejects unapproved, media and dynamic button templates', () => {
  for (const value of [{ ...template, status: 'PAUSED' }, { ...template, components: [{ type: 'HEADER', format: 'IMAGE' }] }, { ...template, components: [{ type: 'BUTTONS', buttons: [{ type: 'URL', url: 'https://example.test/{{1}}' }] }] }]) assert.ok(shared.templateFields(value).reason);
  assert.deepEqual(shared.templateFields(template).fields, [{ component: 'body', key: 'customer' }, { component: 'body', key: 'reference' }]);
});
test('positional variables are ordered numerically and personalization replaces every occurrence', () => {
  assert.deepEqual(shared.templateFields({ ...template, components: [{ type: 'BODY', text: '{{2}} {{1}} {{2}}' }] }).fields.map(field => field.key), ['1', '2']);
  assert.equal(shared.personalize('{name} / {reference} / {name}', { name: 'A', reference: 'B' }), 'A / B / A');
});
test('custom replies use normalized recipient and idempotently skip repeated request', async () => {
  const h = harness(); const draft = { phone, batchId: randomUUID(), kind: 'text', body: 'Hi {name}' };
  assert.equal((await h.service.sendInboxMessage(draft, actor)).status, 'sent');
  assert.equal((await h.service.sendInboxMessage(draft, actor)).duplicate, true);
  assert.equal(h.sent.length, 1); assert.equal(h.sent[0].to, phone); assert.equal(h.sent[0].text.body, 'Hi Player');
  assert.match(h.sent[0].biz_opaque_callback_data, /^chat:/); assert.equal(h.audits.length, 1);
});
test('STOP, closed window and database failure block before dispatch', async () => {
  for (const options of [{ optedOut: true }, { contact: { last_inbound_at: null } }, { dbFailure: true }]) {
    const h = harness(options);
    await assert.rejects(h.service.sendInboxMessage({ phone, batchId: randomUUID(), kind: 'text', body: 'Hello' }, actor));
    assert.equal(h.sent.length, 0);
  }
});
test('utility template uses authoritative paid entry and named personalized fields', async () => withMeta(async () => {
  const h = harness();
  const result = await h.service.sendInboxMessage({ leagueId: actor.id, batchId: randomUUID(), kind: 'template', templateId: 'tpl1', variables: { 'body.customer': '{name}', 'body.reference': '{reference}' } }, actor);
  assert.equal(result.status, 'sent'); assert.equal(h.sent[0].to, phone);
  assert.deepEqual(h.sent[0].template.components[0].parameters, [{ type: 'text', text: 'Captain', parameter_name: 'customer' }, { type: 'text', text: 'GO-123', parameter_name: 'reference' }]);
}));
test('pending/unpaid league entries cannot be sent to', async () => {
  for (const league of [{ status: 'PENDING' }, { amount_paise: 0 }]) {
    const h = harness({ league }); await assert.rejects(h.service.sendInboxMessage({ leagueId: actor.id, batchId: randomUUID(), kind: 'text', body: 'Hi' }, actor), /paid/); assert.equal(h.sent.length, 0);
  }
});
test('marketing needs its own consent; utility consent is not reused', async () => withMeta(async () => {
  const h = harness(); await assert.rejects(h.service.sendInboxMessage({ phone, batchId: randomUUID(), kind: 'template', templateId: 'tpl1' }, actor), /marketing.*consent/i); assert.equal(h.sent.length, 0);
}, { ...template, category: 'MARKETING' }));
test('missing utility consent and missing variables fail closed', async () => withMeta(async () => {
  const draft = { phone, batchId: randomUUID(), kind: 'template', templateId: 'tpl1' };
  await assert.rejects(harness({ contact: { utility_consent_at: null } }).service.sendInboxMessage(draft, actor), /consent/);
  await assert.rejects(harness().service.sendInboxMessage(draft, actor), /single-line/);
}));
test('ambiguous sends stay unknown and an identical retry is not dispatched', async () => {
  const h = harness({ send: () => ({ ok: false, code: 'TIMEOUT', message: 'Timed out' }) });
  const draft = { phone, batchId: randomUUID(), kind: 'text', body: 'Hi' };
  assert.equal((await h.service.sendInboxMessage(draft, actor)).status, 'unknown');
  await h.service.sendInboxMessage(draft, actor); assert.equal(h.sent.length, 1);
});
test('early read receipt is not downgraded by the send response', async () => {
  const h = harness({ send: (_payload, tables) => { tables.whatsapp_chat_messages[0].status = 'read'; tables.whatsapp_chat_messages[0].wa_message_id = 'early'; return { ok: true, data: { messageId: 'early' } }; } });
  await h.service.sendInboxMessage({ phone, batchId: randomUUID(), kind: 'text', body: 'Hi' }, actor);
  assert.equal(h.tables.whatsapp_chat_messages[0].status, 'read');
});
test('inbound persistence is deduplicated and preserves media payload', async () => {
  const h = harness(); const message = { id: 'wamid.in', from: phone, timestamp: String(Math.floor(Date.now() / 1000)), type: 'image', image: { id: 'media1', caption: 'My pass' } };
  await h.service.storeInboundMessage(message, 'Incoming'); await h.service.storeInboundMessage(message, 'Incoming');
  assert.equal(h.tables.whatsapp_chat_messages.length, 1); assert.deepEqual(h.tables.whatsapp_chat_messages[0].payload.image, message.image);
  assert.equal(h.tables.whatsapp_contacts[0].name, 'Incoming');
});
test('consent audit preserves category separation and cannot override STOP', async () => {
  const value = { phone, category: 'MARKETING', evidence: 'Customer agreed in person on 2026-10-21.' };
  const h = harness(); await h.service.recordInboxConsent(value, actor);
  assert.ok(h.tables.whatsapp_contacts[0].marketing_consent_at); assert.equal(h.audits[0][1], 'whatsapp.consent');
  await assert.rejects(harness({ optedOut: true }).service.recordInboxConsent(value, actor), /opted out/);
});
test('GET/POST endpoints reject staff and unauthenticated users before data access', async () => {
  for (const role of ['STAFF', null]) {
    const route = harness({ role }).load('src/app/admin/(panel)/whatsapp/api/route.ts');
    assert.equal((await route.GET(new Request('https://example.test/admin/whatsapp/api'))).status, 403);
    assert.equal((await route.POST(new Request('https://example.test/admin/whatsapp/api', { method: 'POST' }))).status, 403);
  }
});
test('POST rejects cross-origin, malformed JSON and oversized requests', async () => {
  const route = harness().load('src/app/admin/(panel)/whatsapp/api/route.ts');
  for (const [origin, body, status] of [['https://bad.test', '{}', 403], ['https://example.test', 'bad', 400], ['https://example.test', 'x'.repeat(33000), 413]]) assert.equal((await route.POST(new Request('https://example.test/admin/whatsapp/api', { method: 'POST', headers: { origin }, body }))).status, status);
});
test('signed webhook stores inbound chat and rejects forged signatures', async () => {
  const h = harness(); const route = h.load('src/app/api/v1/webhooks/whatsapp/route.ts');
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ id: '456', changes: [{ field: 'messages', value: { metadata: { phone_number_id: '123' }, contacts: [{ wa_id: phone, profile: { name: 'Customer' } }], messages: [{ id: 'wamid.webhook', from: phone, type: 'text', timestamp: String(Math.floor(Date.now() / 1000)), text: { body: 'Hello admin' } }] } }] }] });
  const request = signature => new Request('https://example.test/webhook', { method: 'POST', body, headers: { 'x-hub-signature-256': signature } });
  assert.equal((await route.POST(request('sha256=bad'))).status, 400);
  assert.equal(h.tables.whatsapp_chat_messages.length, 0);
  assert.equal((await route.POST(request(`sha256=${createHmac('sha256', 'secret').update(body).digest('hex')}`))).status, 200);
  assert.equal(h.tables.whatsapp_chat_messages[0].body, 'Hello admin');
});
test('migration makes inbox tables service-role only and receipts monotonic', () => {
  const sql = readFileSync(resolve(root, 'supabase/migrations/20261021120000_whatsapp_inbox.sql'), 'utf8');
  assert.match(sql, /revoke all on public.whatsapp_contacts,public.whatsapp_chat_messages from public,anon,authenticated/);
  assert.match(sql, /enable row level security/); assert.match(sql, /status not in \('read','delivered'\)/); assert.match(sql, /greatest\(last_inbound_at,new.created_at\)/);
});