/** Mocked SMTP/database; never sends customer emails. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const id = '11111111-1111-4111-8111-111111111111';
function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    const path = resolve(root, file);
    if (cache.has(path)) return cache.get(path).exports;
    const compiledModule = { exports: {} }; cache.set(path, compiledModule);
    const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText;
    new Function('require', 'module', 'exports', code)(name => {
      if (name in mocks) return mocks[name];
      if (name === 'server-only') return {};
      if (name.startsWith('.') || name.startsWith('@/')) {
        const target = name.startsWith('@/') ? resolve(root, 'src', name.slice(2)) : resolve(dirname(path), name);
        return load(existsSync(`${target}.ts`) ? `${target}.ts` : target);
      }
      return require(name);
    }, compiledModule, compiledModule.exports);
    return compiledModule.exports;
  }
  return load;
}
const details = { category: 'booking', id, name: '<Player>', title: 'Badminton & friends', date: 'October 20, 2026',
  time: '6:00 PM – 7:00 PM', venue: 'GameOn', address: 'Venue address', timezone: 'Asia/Kolkata',
  amount: 1200, paymentStatus: 'PAID', extras: [['Court', 'Court 1'], ['Players', '4']] };
function harness({ category = 'booking', recipient = 'player@example.com', confirmed = true, smtpError, accepted = true, failSentUpdate = false } = {}) {
  const row = { id, reference_id: id, category, recipient, status: 'processing', attempts: 1, lease_id: 'lease' };
  const calls = { sent: [], patches: [], jobs: [], claims: 0, closed: 0 };
  const venue = { name: 'GameOn', address: 'Venue address', timezone: 'Asia/Kolkata' };
  const records = {
    bookings: { status: confirmed ? 'CONFIRMED' : 'CANCELLED', contact_name: 'Player', booking_date: '2026-10-20',
      start_time: '18:00:00', end_time: '19:00:00', players: 4, amount_paid: 1200, payment_status: 'PAID', facilities: { name: 'Court 1', venues: venue, court_types: { sports: { name: 'Badminton' } } } },
    event_orders: { status: confirmed ? 'CONFIRMED' : 'PENDING_PAYMENT', attendee_name: 'Player', tickets: 2, amount_paid: 500, payment_status: 'PAID', events: { title: 'Fun event', starts_on: '2026-10-20', ends_on: '2026-10-21', daily_start_time: '18:00:00', daily_end_time: '19:00:00', venues: venue } },
    tournament_registrations: { status: confirmed ? 'CONFIRMED' : 'PENDING_PAYMENT', captain_name: 'Captain', team_name: 'Team', amount_paid: 2000, payment_status: 'PAID', tournaments: { title: 'Cup', starts_on: '2026-10-20', ends_on: '2026-10-21', daily_start_time: '18:00:00', daily_end_time: '19:00:00', venues: venue } },
  };
  const db = { from(table) {
    let patch; const q = { select() { return q; }, eq() { return q; }, in() { return q; }, update(value) { patch = value; return q; },
      async maybeSingle() {
        if (table !== 'booking_emails') return { data: records[table], error: null };
        calls.patches.push(patch);
        if (patch.status === 'sent' && failSentUpdate) return { data: null, error: new Error('db failed') };
        Object.assign(row, patch); return { data: { id }, error: null };
      } }; return q;
  }, async rpc() { calls.claims++; return { data: calls.claims === 1 ? [{ ...row }] : [], error: null }; } };
  const smtp = loader()('src/lib/email/smtp.ts');
  const load = loader({ '../db/supabase': { supabaseAdmin: db }, 'next/server': { ...require('next/server'), after: job => calls.jobs.push(job) },
    '../email/smtp': { ...smtp, getSmtpConfig: () => ({ from: { address: 'info@gameonmultisports.com' } }),
      createSmtpTransport: () => ({ sendMail: async message => { calls.sent.push(message); if (smtpError) throw smtpError; return { accepted: accepted ? [recipient] : [] }; }, close: () => calls.closed++ }) },
  });
  return { row, calls, load, service: load('src/lib/services/booking-email.service.ts').BookingEmailService };
}

test('HTML/text templates contain details, private QR and escaped user input', () => {
  const { bookingConfirmationTemplate } = loader()('src/lib/email/booking-template.ts');
  for (const category of ['booking', 'event', 'tournament']) {
    const result = bookingConfirmationTemplate({ ...details, category });
    assert.match(result.subject, /confirmed/); assert.ok(result.text.includes(id));
    assert.ok(result.text.includes('Court 1')); assert.ok(result.text.includes('1,200.00'));
    assert.match(result.html, /&lt;Player&gt;/); assert.doesNotMatch(result.html, /<Player>/);
    assert.match(result.html, /cid:booking-qr/); assert.match(result.html, /max-width:600px/);
  }
});
for (const category of ['booking', 'event', 'tournament']) test(`${category}: confirmed record sends once with matching private QR attachment`, async () => {
  const h = harness({ category }); await h.service.drain();
  assert.equal(h.calls.sent.length, 1); assert.equal(h.row.status, 'sent');
  const email = h.calls.sent[0]; assert.equal(email.to, 'player@example.com');
  assert.equal(email.attachments[0].cid, 'booking-qr');
  assert.equal(email.attachments[0].content.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.match(email.messageId, /confirmation-/); assert.equal(h.calls.closed, 1);
  assert.ok(email.text.includes(category === 'event' ? 'Tickets: 2' : category === 'tournament' ? 'Team: Team' : 'Court: Court 1'));
});
for (const category of ['booking', 'event', 'tournament']) test(`${category}: unpaid/cancelled records are skipped`, async () => {
  const h = harness({ category, confirmed: false }); await h.service.deliver(h.row);
  assert.equal(h.calls.sent.length, 0); assert.equal(h.row.status, 'skipped');
});
for (const recipient of [null, '', 'bad', 'one@example.com,two@example.com', 'evil\r\nBcc:x@example.com']) test(`invalid recipient ${JSON.stringify(recipient)} is never mailed`, async () => {
  const h = harness({ recipient }); await h.service.deliver(h.row);
  assert.equal(h.row.status, 'skipped'); assert.equal(h.calls.sent.length, 0);
});
for (const code of ['EAUTH', 'EDNS', 'ECONNECTION', 'ECONNREFUSED', 'EENVELOPE', 'ETLS']) test(`${code} queues a safe retry without failing the booking`, async () => {
  const h = harness({ smtpError: Object.assign(new Error('redacted'), { code }) });
  await h.service.deliver(h.row); assert.equal(h.row.status, 'failed'); assert.ok(h.row.available_at);
});
test('explicit SMTP rejection retries; ambiguous timeout does not blindly resend', async () => {
  const rejected = harness({ smtpError: { code: 'EMESSAGE', responseCode: 451, command: 'DATA' } });
  await rejected.service.deliver(rejected.row); assert.equal(rejected.row.status, 'failed');
  const unknown = harness({ smtpError: { code: 'ETIMEDOUT', command: 'DATA' } });
  await unknown.service.deliver(unknown.row); assert.equal(unknown.row.status, 'unknown');
});
test('recipient rejection is not success and accepted mail with DB failure becomes unknown', async () => {
  const rejected = harness({ accepted: false }); await rejected.service.deliver(rejected.row); assert.equal(rejected.row.status, 'failed');
  const unknown = harness({ failSentUpdate: true }); await unknown.service.deliver(unknown.row); assert.equal(unknown.row.status, 'unknown');
});
test('schedule defers delivery until after the HTTP response', async () => {
  const h = harness(); h.service.schedule('booking', id); assert.equal(h.calls.sent.length, 0);
  assert.equal(h.calls.jobs.length, 1); await h.calls.jobs[0](); assert.equal(h.calls.sent.length, 1);
});
test('cron requires its server secret', async () => {
  const old = process.env.CRON_SECRET; process.env.CRON_SECRET = 'test-only';
  try {
    const h = harness(); const route = h.load('src/app/api/cron/booking-emails/route.ts');
    assert.equal((await route.GET(new Request('https://example.com'))).status, 401);
    assert.equal(h.calls.claims, 0);
    assert.equal((await route.GET(new Request('https://example.com', { headers: { authorization: 'Bearer test-only' } }))).status, 200);
  } finally { if (old === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = old; }
});
test('slot checkout forwards email; all confirmation flows schedule email and unpaid holds do not', () => {
  const payment = readFileSync(resolve(root, '../gameon-multisports/src/app/book/payment.tsx'), 'utf8');
  assert.match(payment, /contactEmail: draft.email.trim\(\)/);
  for (const name of ['booking', 'event', 'tournament']) {
    const service = readFileSync(resolve(root, `src/lib/services/${name}.service.ts`), 'utf8');
    assert.match(service, new RegExp(`BookingEmailService.schedule\\('${name}'`));
  }
  const sql = readFileSync(resolve(root, 'supabase/migrations/20261015170000_booking_confirmation_emails.sql'), 'utf8');
  assert.match(sql, /new.status::text <> 'CONFIRMED'/); assert.match(sql, /on conflict \(category, reference_id\) do nothing/);
  assert.match(sql, /for update skip locked/); assert.match(sql, /attempts < 5/);
});