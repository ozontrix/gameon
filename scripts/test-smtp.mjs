/** node --test scripts/test-smtp.mjs. SMTP is mocked; no real email is sent. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const envKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM_EMAIL', 'SMTP_FROM_NAME', 'SMTP_APP_PASSWORD', 'NOTIFY_RECIPIENTS'];
const testEnv = {
  SMTP_USER: 'login@smtp-brevo.com', SMTP_PASSWORD: 'smtp-key',
  SMTP_FROM_EMAIL: 'info@gameonmultisports.com', NOTIFY_RECIPIENTS: 'desk@example.com',
};
async function withEnv(overrides, action) {
  const previous = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  try {
    for (const key of envKeys) delete process.env[key];
    Object.assign(process.env, testEnv, overrides);
    return await action();
  } finally {
    for (const key of envKeys) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
  }
}
function harness() {
  const cache = new Map();
  const transports = [], deliveries = [];
  let mode = 'accept', smtpError = new Error('private SMTP response');
  const nodemailer = { createTransport: options => {
    const transport = { options, closed: false };
    transports.push(transport);
    return {
      sendMail: async mail => {
        deliveries.push(mail);
        if (mode === 'throw') throw smtpError;
        return { accepted: mode === 'reject' ? [] : mode === 'bcc-only' ? ['desk@example.com'] : [mail.to] };
      },
      close: () => { transport.closed = true; },
    };
  } };
  function load(relative) {
    const filename = resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = { exports: {} }; cache.set(filename, compiled);
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    });
    const localRequire = id => {
      if (id === 'server-only') return {};
      if (id === 'nodemailer') return nodemailer;
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? resolve(root, 'src', id.slice(2)) : resolve(dirname(filename), id);
        return load(existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`);
      }
      return require(id);
    };
    new Function('require', 'module', 'exports', outputText)(localRequire, compiled, compiled.exports);
    return compiled.exports;
  }
  return { load, transports, deliveries, setMode: value => { mode = value; }, setError: value => { smtpError = value; mode = 'throw'; } };
}

test('Brevo defaults use port 587 with required STARTTLS and separate sender identity', () => withEnv({}, () => {
  const h = harness();
  const { getSmtpConfig, createSmtpTransport } = h.load('src/lib/email/smtp.ts');
  const config = getSmtpConfig();
  assert.deepEqual(config.from, { name: 'GameOn Multi Sports', address: testEnv.SMTP_FROM_EMAIL });
  createSmtpTransport(config);
  const options = h.transports[0].options;
  assert.equal(options.host, 'smtp-relay.brevo.com'); assert.equal(options.port, 587);
  assert.equal(options.secure, false); assert.equal(options.requireTLS, true);
  assert.deepEqual(options.auth, { user: testEnv.SMTP_USER, pass: testEnv.SMTP_PASSWORD });
  assert.equal(options.tls?.rejectUnauthorized, undefined);
}));

test('Explicit SMTP port 465 uses TLS from connection start', () => withEnv({ SMTP_PORT: '465', SMTP_FROM_NAME: 'GameOn' }, () => {
  const h = harness(); const smtp = h.load('src/lib/email/smtp.ts');
  smtp.createSmtpTransport(smtp.getSmtpConfig());
  assert.equal(h.transports[0].options.secure, true); assert.equal(h.transports[0].options.requireTLS, false);
  assert.equal(smtp.getSmtpConfig().from.name, 'GameOn');
}));

test('Configuration fails closed for missing credentials/sender, invalid ports and technical sender login', () => withEnv({}, () => {
  const { getSmtpConfig } = harness().load('src/lib/email/smtp.ts');
  for (const [key, value] of [['SMTP_PASSWORD', ''], ['SMTP_USER', ''], ['SMTP_FROM_EMAIL', ''], ['SMTP_FROM_EMAIL', 'bad'], ['SMTP_FROM_EMAIL', testEnv.SMTP_USER], ['SMTP_PORT', 'abc'], ['SMTP_PORT', '0'], ['SMTP_PORT', '65536'], ['SMTP_PORT', '587.5'], ['SMTP_HOST', '']]) {
    const previous = process.env[key]; process.env[key] = value;
    assert.equal(getSmtpConfig(), null, key);
    if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
  }
  delete process.env.SMTP_PASSWORD; process.env.SMTP_APP_PASSWORD = 'obsolete-google-password';
  assert.equal(getSmtpConfig(), null);
}));

test('Password trims surrounding whitespace without corrupting internal spaces', () => withEnv({ SMTP_PASSWORD: '  key with spaces  ' }, () => {
  assert.equal(harness().load('src/lib/email/smtp.ts').getSmtpConfig().pass, 'key with spaces');
}));

test('Quoted production dashboard values normalize without changing internal password characters', () => withEnv({
  SMTP_HOST: ' "smtp-relay.brevo.com" ', SMTP_PORT: "'587'", SMTP_USER: '"login@smtp-brevo.com"',
  SMTP_PASSWORD: " 'key with spaces' ", SMTP_FROM_EMAIL: '"info@gameonmultisports.com"', SMTP_FROM_NAME: '"GameOn"',
}, () => {
  const config = harness().load('src/lib/email/smtp.ts').getSmtpConfig();
  assert.equal(config.host, 'smtp-relay.brevo.com'); assert.equal(config.port, 587);
  assert.equal(config.user, testEnv.SMTP_USER); assert.equal(config.pass, 'key with spaces');
  assert.deepEqual(config.from, { name: 'GameOn', address: testEnv.SMTP_FROM_EMAIL });
}));

test('Brevo API keys, unsupported ports and multiline credentials fail closed', () => withEnv({}, () => {
  const { getSmtpConfig } = harness().load('src/lib/email/smtp.ts');
  for (const [key, value] of [['SMTP_PASSWORD', 'xkeysib-not-an-smtp-key'], ['SMTP_PASSWORD', 'key\nvalue'], ['SMTP_USER', 'login\r\nvalue'], ['SMTP_FROM_NAME', 'GameOn\nInjected'], ['SMTP_PORT', '25']]) {
    const previous = process.env[key]; process.env[key] = value;
    assert.equal(getSmtpConfig(), null, key);
    if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
  }
  process.env.SMTP_PORT = '2525';
  assert.equal(getSmtpConfig().port, 2525);
}));

test('SMTP diagnostics classify protocol failures without returning raw provider text or credentials', () => {
  const { getSmtpFailure } = harness().load('src/lib/email/smtp.ts');
  const cases = [
    [{ code: 'EAUTH', responseCode: 535, command: 'AUTH PLAIN' }, 'AUTHENTICATION'],
    [{ code: 'EAUTH', responseCode: 525 }, 'IP_NOT_AUTHORIZED'],
    [{ responseCode: 550, command: 'MAIL FROM', response: 'sender not verified' }, 'SENDER_REJECTED'],
    [{ responseCode: 550, response: 'daily sending limit exceeded' }, 'SENDING_LIMIT'],
    [{ responseCode: 550, response: 'account suspended' }, 'ACCOUNT_RESTRICTED'],
    [{ code: 'ETIMEDOUT', command: 'CONN' }, 'CONNECTION'],
    [{ code: 'ETLS' }, 'TLS'],
    [{ code: 'EENVELOPE', command: 'RCPT TO' }, 'RECIPIENT_REJECTED'],
    [{ responseCode: 451, command: 'DATA' }, 'TEMPORARY_REJECTION'],
    [null, 'UNKNOWN'],
  ];
  for (const [input, reason] of cases) assert.equal(getSmtpFailure(input).reason, reason);
  const secret = 'private-password recipient@example.com';
  const result = getSmtpFailure({ message: secret, stack: secret, code: secret, command: `AUTH ${secret}`, response: secret, responseCode: 999 });
  assert.doesNotMatch(JSON.stringify(result), /private-password|recipient@example.com/);
  assert.equal(result.code, 'UNKNOWN'); assert.equal(result.command, undefined); assert.equal(result.responseCode, undefined);
});

test('Open play stores an actionable authentication failure and logs only sanitized diagnostics', () => withEnv({}, async () => {
  const h = harness();
  h.setError(Object.assign(new Error('private-password'), { code: 'EAUTH', command: 'AUTH PLAIN', responseCode: 535, response: 'private-password recipient@example.com' }));
  const logs = []; const previous = console.error;
  console.error = (...args) => logs.push(args);
  try {
    const { sendOpenPlayConfirmationEmail } = h.load('src/lib/open-play/email.ts');
    const result = await sendOpenPlayConfirmationEmail({ id: '12345678-test', full_name: 'Test Player', email: 'player@example.com', sport: 'cricket', city: 'Gurugram' });
    assert.equal(result.sent, false); assert.match(result.error, /authentication failed.*EAUTH, SMTP 535/);
    assert.equal(logs[0][1].reason, 'AUTHENTICATION'); assert.equal(h.transports.at(-1).closed, true);
    assert.doesNotMatch(JSON.stringify({ result, logs }), /private-password|recipient@example.com/);
  } finally { console.error = previous; }
}));

test('Notify logs the Brevo IP restriction while keeping public API errors generic', () => withEnv({}, async () => {
  const h = harness();
  h.setError(Object.assign(new Error('private SMTP response'), { code: 'EAUTH', responseCode: 525 }));
  const logs = []; const previous = console.error;
  console.error = (...args) => logs.push(args);
  try {
    const { POST } = h.load('src/app/api/notify/route.ts');
    const response = await POST(new Request('https://game-on.in/api/notify', { method: 'POST', body: JSON.stringify({ type: 'newsletter', email: 'player@example.com' }) }));
    assert.equal(response.status, 500); assert.deepEqual(await response.json(), { ok: false, error: 'Failed to send email.' });
    assert.equal(logs[0][1].reason, 'IP_NOT_AUTHORIZED'); assert.equal(h.transports.at(-1).closed, true);
  } finally { console.error = previous; }
}));

function confirmation(h) {
  const { parseLeagueEntry } = h.load('src/lib/league/entry.ts');
  const { SPORTS } = h.load('src/components/league/data.ts');
  const result = parseLeagueEntry({ sport: 'badminton', categoryIds: [SPORTS[0].categories[0].id], date: '2026-10-24', captainName: 'Test Player', email: 'player@example.com', phone: '9811000000', addons: {} });
  assert.equal(result.ok, true);
  return { reference: 'GO-TEST', paymentId: 'pay_test', orderId: 'order_test', currency: 'INR', amount: result.quote.total, paidAt: '2026-10-12T00:00:00Z', emailSent: false, entry: { ...result.entry, sport: 'badminton', sportName: 'Badminton' }, quote: result.quote };
}

test('League confirmation uses Brevo, preserves customer/BCC/reply-to and closes transport', () => withEnv({}, async () => {
  const h = harness(); const input = confirmation(h);
  const { sendLeagueConfirmationEmail } = h.load('src/lib/league/email.ts');
  assert.deepEqual(await sendLeagueConfirmationEmail(input), { sent: true });
  assert.equal(h.transports[0].options.host, 'smtp-relay.brevo.com');
  assert.equal(h.deliveries[0].from.address, testEnv.SMTP_FROM_EMAIL);
  assert.equal(h.deliveries[0].to, 'player@example.com'); assert.equal(h.deliveries[0].bcc, 'desk@example.com');
  assert.equal(h.deliveries[0].replyTo, 'info@gameonmultisports.com'); assert.equal(h.transports[0].closed, true);
  for (const mode of ['reject', 'bcc-only', 'throw']) {
    h.setMode(mode); const result = await sendLeagueConfirmationEmail(input);
    assert.equal(result.sent, false); assert.doesNotMatch(result.error, /private SMTP/);
    assert.equal(h.transports.at(-1).closed, true);
  }
  const count = h.transports.length; delete process.env.SMTP_PASSWORD;
  assert.equal((await sendLeagueConfirmationEmail(input)).sent, false); assert.equal(h.transports.length, count);
}));

test('Website newsletter and early-access notifications use the shared Brevo sender', () => withEnv({}, async () => {
  const h = harness(); const { POST } = h.load('src/app/api/notify/route.ts');
  const request = type => new Request('https://game-on.in/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, email: 'player@example.com', name: 'Test Player' }) });
  for (const type of ['newsletter', 'early-access']) {
    assert.equal((await POST(request(type))).status, 200);
    assert.equal(h.transports.at(-1).options.host, 'smtp-relay.brevo.com'); assert.equal(h.transports.at(-1).closed, true);
    assert.equal(h.deliveries.at(-1).from.address, testEnv.SMTP_FROM_EMAIL);
    assert.equal(h.deliveries.at(-1).to, 'desk@example.com'); assert.equal(h.deliveries.at(-1).replyTo, 'player@example.com');
  }
  for (const mode of ['reject', 'throw']) {
    h.setMode(mode); assert.equal((await POST(request('newsletter'))).status, 500);
    assert.equal(h.transports.at(-1).closed, true);
  }
  const count = h.transports.length; delete process.env.SMTP_FROM_EMAIL;
  assert.equal((await POST(request('newsletter'))).status, 500); assert.equal(h.transports.length, count);
}));