/** node --test scripts/test-open-play.mjs. All writes and auth are mocked. */
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
    const file = resolve(root, relative);
    if (cache.has(file)) return cache.get(file).exports;
    const compiled = { exports: {} }; cache.set(file, compiled);
    const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } });
    const localRequire = id => {
      if (id in mocks) return mocks[id];
      if (id === 'server-only' || id.endsWith('.css')) return {};
      if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => createElement('a', props, children) };
      if (id === 'next/image') return { __esModule: true, default: props => { const attributes = { ...props }; delete attributes.priority; return createElement('img', attributes); } };
      if (id === 'framer-motion') return { useReducedMotion: () => false, motion: new Proxy({}, { get: (_, tag) => props => { const attributes = { ...props }; for (const key of ['initial', 'animate', 'whileInView', 'viewport', 'transition']) delete attributes[key]; return createElement(tag, attributes); } }) };
      if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? resolve(root, 'src', id.slice(2)) : resolve(dirname(file), id);
        return load(existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`);
      }
      return require(id);
    };
    new Function('require', 'module', 'exports', outputText)(localRequire, compiled, compiled.exports);
    return compiled.exports;
  }
  return load;
}
const load = loader();
const { OpenPlayRegistrationSchema, normalizeOpenPlayPhone, openPlayAttribution } = load('src/lib/open-play/registration.ts');
const constants = load('src/lib/open-play/constants.ts');
const valid = { fullName: 'Test Player', phone: '9811000000', sport: 'cricket', contactConsent: true };

test('All four sports accept minimal details; contacts normalize and marketing is opt-in', () => {
  for (const sport of constants.OPEN_PLAY_SPORT_IDS) {
    const input = OpenPlayRegistrationSchema.parse({ ...valid, sport });
    assert.equal(input.email, ''); assert.equal(input.city, ''); assert.equal(input.marketingConsent, false);
  }
  for (const phone of ['9811000000', '+91 98110 00000', '91-9811000000', '(09811000000)']) assert.equal(normalizeOpenPlayPhone(phone), valid.phone);
  assert.equal(OpenPlayRegistrationSchema.parse({ ...valid, fullName: '  Test Player  ', email: ' Test@Example.com ' }).email, 'test@example.com');
});
test('Validation rejects unsupported sports, bad contacts, missing consent, bot submissions and oversized attribution', () => {
  for (const patch of [{ sport: 'tennis' }, { sport: '' }, { fullName: ' ' }, { fullName: '<script>' }, { phone: '123' }, { phone: 'abc9811000000' }, { phone: '5811000000' }, { email: 'bad' }, { contactConsent: false }, { website: 'spam' }, { city: 'a'.repeat(81) }, { attribution: { utm_source: 'a'.repeat(121) } }]) {
    assert.equal(OpenPlayRegistrationSchema.safeParse({ ...valid, ...patch }).success, false, JSON.stringify(patch));
  }
});
test('Campaign extraction is bounded and excludes ad click identifiers, contacts and full URLs', () => {
  const labels = openPlayAttribution('?utm_source=instagram&utm_campaign=open_play_oct18&fbclid=private&email=test@example.com');
  assert.equal(labels.utm_source, 'instagram'); assert.equal(labels.utm_campaign, 'open_play_oct18');
  assert.deepEqual(Object.keys(labels), ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']);
  assert.equal(openPlayAttribution(`?utm_content=${'a'.repeat(300)}`).utm_content.length, 120);
});
test('Open play closes at the end of October 18 in India, not before the evening', () => {
  assert.equal(constants.openPlayIsClosed(Date.parse('2026-10-18T18:29:59Z')), false);
  assert.equal(constants.openPlayIsClosed(Date.parse('2026-10-18T18:30:00Z')), true);
});

function routeHarness({ fail = false, created = true, closed = false } = {}) {
  const writes = [];
  const api = loader({
    '@/lib/open-play/constants': { ...constants, openPlayIsClosed: () => closed },
    '@/lib/open-play/server': { saveOpenPlayRegistration: async input => { writes.push(input); if (fail) throw new Error('Private DB detail'); return { created, registrationId: created ? 'test-id' : null }; } },
  })('src/app/api/v1/public/open-play/registrations/route.ts');
  return { api, writes };
}
let ip = 0;
function request(body, extra = {}) {
  return new Request('https://game-on.in/api/v1/public/open-play/registrations', { method: 'POST', headers: { origin: 'https://game-on.in', 'Content-Type': 'application/json', 'x-forwarded-for': `op-${++ip}`, ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
test('New registrations return success only after persistence; duplicates return no record ID', async () => {
  const h = routeHarness(); const response = await h.api.POST(request(valid));
  assert.equal(response.status, 201); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(h.writes.length, 1); assert.equal(h.writes[0].phone, valid.phone);
  const result = await response.json(); assert.equal(result.registrationId, 'test-id'); assert.equal(result.eventDate, '2026-10-18');
  assert.equal(result.phone, undefined); assert.equal(result.fullName, undefined);
  const duplicate = await routeHarness({ created: false }).api.POST(request(valid));
  assert.equal(duplicate.status, 200); assert.deepEqual(await duplicate.json(), { success: true, created: false, registrationId: null, eventDate: '2026-10-18' });
});
test('API blocks cross-origin, malformed, oversized, invalid, bot and expired requests before persistence', async () => {
  const h = routeHarness();
  for (const [input, headers, status] of [[valid, { origin: 'https://evil.example' }, 403], [valid, { 'sec-fetch-site': 'cross-site' }, 403], ['{bad', {}, 400], ['a'.repeat(6001), {}, 413], [{ ...valid, sport: 'tennis' }, {}, 400], [{ ...valid, website: 'bot' }, {}, 400]]) {
    assert.equal((await h.api.POST(request(input, headers))).status, status);
  }
  assert.equal(h.writes.length, 0);
  const expired = routeHarness({ closed: true }); assert.equal((await expired.api.POST(request(valid))).status, 410); assert.equal(expired.writes.length, 0);
});
test('Same-origin submissions work when Next normalizes its internal hostname', async () => {
  const h = routeHarness();
  const req = new Request('http://localhost:3141/api/v1/public/open-play/registrations', {
    method: 'POST', headers: { origin: 'http://127.0.0.1:3141', host: '127.0.0.1:3141', 'Content-Type': 'application/json' }, body: JSON.stringify(valid),
  });
  assert.equal((await h.api.POST(req)).status, 201);
});
test('Storage failure is a retryable failure, never a fabricated confirmation or database leak', async () => {
  const response = await routeHarness({ fail: true }).api.POST(request(valid));
  assert.equal(response.status, 503); const result = await response.json(); assert.equal(result.success, false); assert.doesNotMatch(result.error, /Private DB/);
});
test('Submission rate limit is isolated and enforced', async () => {
  const h = routeHarness();
  for (let i = 0; i < 8; i++) assert.equal((await h.api.POST(request(valid, { 'x-forwarded-for': 'same-open-play-ip' }))).status, 201);
  assert.equal((await h.api.POST(request(valid, { 'x-forwarded-for': 'same-open-play-ip' }))).status, 429); assert.equal(h.writes.length, 8);
});
test('Persistence uses conflict-safe insert and never overwrites duplicate contact details', async () => {
  let saved; let options; let returned = { id: 'id' }; let dbError = null;
  const { saveOpenPlayRegistration } = loader({ '@/lib/db/supabase': { supabaseAdmin: { from: name => {
    assert.equal(name, 'open_play_registrations');
    return { upsert: (input, config) => { saved = input; options = config; return { select: () => ({ maybeSingle: async () => ({ data: returned, error: dbError }) }) }; } };
  } } } })('src/lib/open-play/server.ts');
  assert.deepEqual(await saveOpenPlayRegistration(OpenPlayRegistrationSchema.parse(valid)), { created: true, registrationId: 'id' });
  assert.equal(saved.event_date, constants.OPEN_PLAY_DATE); assert.equal(saved.phone, valid.phone); assert.equal(saved.marketing_consent, false);
  assert.deepEqual(options, { onConflict: 'event_date,phone,sport', ignoreDuplicates: true });
  returned = null; assert.deepEqual(await saveOpenPlayRegistration(OpenPlayRegistrationSchema.parse(valid)), { created: false, registrationId: null });
  dbError = { message: 'internal' }; await assert.rejects(() => saveOpenPlayRegistration(OpenPlayRegistrationSchema.parse(valid)), /could not be saved/);
});

const row = { id: 'test-id', event_date: constants.OPEN_PLAY_DATE, sport: 'cricket', full_name: 'Test Player', phone: '9811000000', email: 'test@example.com', city: 'Gurugram', contact_consent: true, marketing_consent: false, attribution: { utm_source: 'instagram', utm_campaign: 'oct18' }, created_at: '2026-10-07T10:00:00Z' };
test('Admin filters sanitize query syntax and ignore invalid sport values', () => {
  const { readOpenPlayFilters } = loader({ '@/lib/db/supabase': { supabaseAdmin: {} } })('src/lib/admin/queries/open-play.ts');
  const filters = readOpenPlayFilters({ q: [' hi,%() ', 'ignored'], sport: ['football', 'tennis'] });
  assert.deepEqual(filters, { q: 'hi', sport: 'football' }); assert.equal(readOpenPlayFilters({ sport: 'tennis' }).sport, undefined);
});
test('Admin page lists saved records and checks authorization before reads', async () => {
  const mocks = {
    '@/lib/admin/session': { requireAdmin: async () => ({ role: 'ADMIN' }) },
    '@/lib/admin/queries/open-play': { readOpenPlayFilters: () => ({}), listOpenPlayRegistrations: async () => ({ registrations: [row], total: 1 }), openPlayRegistrationStats: async () => ({ cricket: 1, football: 0, badminton: 0, pickleball: 0 }) },
  };
  const Page = loader(mocks)('src/app/admin/(panel)/open-play-registrations/page.tsx').default;
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
  for (const text of ['Open Play Registrations', 'Test Player', 'test@example.com', '9811000000', 'instagram', 'oct18', 'Event updates only', 'Export CSV']) assert.ok(html.includes(text), text);
  let reads = 0;
  const denied = loader({ ...mocks, '@/lib/admin/session': { requireAdmin: async () => { throw new Error('DENIED'); } }, '@/lib/admin/queries/open-play': { ...mocks['@/lib/admin/queries/open-play'], listOpenPlayRegistrations: async () => { reads++; } } })('src/app/admin/(panel)/open-play-registrations/page.tsx').default;
  await assert.rejects(() => denied({ searchParams: Promise.resolve({}) }), /DENIED/); assert.equal(reads, 0);
});
test('CSV denies unauthenticated/staff access and paginates all registrations safely', async () => {
  let actor = null; const pages = [];
  const route = loader({
    '@/lib/admin/session': { getStaffSession: async () => actor },
    '@/lib/admin/queries/open-play': { readOpenPlayFilters: () => ({}), listOpenPlayRegistrations: async (_filters, page) => { pages.push(page); return { registrations: page < 3 ? Array.from({ length: 500 }, () => row) : [{ ...row, full_name: '=DANGEROUS()' }], total: 1001 }; } },
  })('src/app/admin/(panel)/open-play-registrations/export/route.ts');
  const req = new Request('https://game-on.in/admin/open-play-registrations/export');
  assert.equal((await route.GET(req)).status, 401); actor = { role: 'STAFF' }; assert.equal((await route.GET(req)).status, 403); assert.equal(pages.length, 0);
  actor = { role: 'ADMIN' }; const response = await route.GET(req); const csv = await response.text();
  assert.equal(response.headers.get('cache-control'), 'no-store'); assert.deepEqual(pages, [1, 2, 3]);
  assert.match(csv, /"'=DANGEROUS\(\)"/); assert.equal(csv.trim().split('\r\n').length, 1002);
});
test('Landing renders original graphics, four sport choices, accessible fields and honest event copy', () => {
  const { OpenPlayLanding } = load('src/components/open-play/landing.tsx');
  const html = renderToStaticMarkup(createElement(OpenPlayLanding, { closed: false }));
  for (const text of ['YOUR SUNDAY.', 'ON US.', '18 October 2026', '19 October 2026', 'DJ party', 'Pizza party', 'Coffee party', 'dandiya', 'court-scene.svg', 'op-mobile-cta', 'id="register"', 'name="contactConsent"']) assert.ok(html.includes(text), text);
  assert.equal((html.match(/data-sport=/g) ?? []).length, 4); assert.match(html, /name="fullName"/); assert.match(html, /name="phone"/);
  assert.doesNotMatch(html, /<input[^>]+name="marketingConsent"[^>]+checked/);
  const closed = renderToStaticMarkup(createElement(OpenPlayLanding, { closed: true }));
  assert.match(closed, /Registrations for October 18 are now closed/); assert.doesNotMatch(closed, /<form/);
});
test('Lead tracking is consent-aware, PII-free and deduplicated only after successful tracking', () => {
  const previous = globalThis.window; const events = []; let allowed = false;
  globalThis.window = { sessionStorage: { getItem: () => null, setItem: () => {} } };
  try {
    const { trackOpenPlayLead } = loader({ './meta-pixel': { trackMetaEvent: (...args) => { if (!allowed) return false; events.push(args); return true; } } })('src/lib/analytics/open-play.ts');
    assert.equal(trackOpenPlayLead('id', 'cricket'), false); allowed = true;
    assert.equal(trackOpenPlayLead('id', 'cricket'), true); assert.equal(trackOpenPlayLead('id', 'cricket'), false);
    assert.equal(events.length, 1); assert.equal(events[0][0], 'Lead'); assert.equal(events[0][1].value, 0);
    assert.doesNotMatch(JSON.stringify(events), /Test Player|9811000000|example.com/);
  } finally { globalThis.window = previous; }
});
test('Paid court dates reject October 18 and permit October 19; guards run before database queries', async () => {
  const { isPublicPaidBookingDate } = load('src/lib/utils/booking-dates.ts');
  assert.equal(isPublicPaidBookingDate('2026-10-18'), false); assert.equal(isPublicPaidBookingDate('2026-10-19'), true);
  let reads = 0;
  const mockedLoad = loader({ '../db/supabase': { supabaseAdmin: { from: () => { reads++; throw new Error('DB'); } } } });
  const { SlotService } = mockedLoad('src/lib/services/slot.service.ts');
  assert.deepEqual(await SlotService.getSlots('court', '2026-10-18', { durationMinutes: 60 }), []); assert.equal(reads, 0);
  const { BookingService } = mockedLoad('src/lib/services/booking.service.ts');
  await assert.rejects(() => BookingService.createBooking('user', { facilityId: 'court', date: '2026-10-18', startTime: '10:00', endTime: '11:00' }), /19 October/); assert.equal(reads, 0);
});