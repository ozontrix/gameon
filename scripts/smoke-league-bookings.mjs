/** Production HTTP checks. No authentication, orders, payments or emails created. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'http://127.0.0.1:3138';
const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-p', '3138'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const stopped = new Promise(resolve => server.once('exit', resolve));
let output = '';
server.stdout.on('data', data => { output += data; });
server.stderr.on('data', data => { output += data; });
async function get(path) { return fetch(`${origin}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(30000) }); }
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    try { if ((await get('/robots.txt')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'Production server did not start.');
  for (const path of ['/', '/gameon-multisports-league',
    ...['badminton', 'pickleball', 'cricket', 'football'].map(sport => `/gameon-multisports-league/sports/${sport}`),
    ...['details', 'review', 'success'].map(step => `/gameon-multisports-league/book/${step}`),
    '/gameon-multisports-league/bookings']) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes('Marketing cookie preferences'), path);
    assert.ok(html.includes('Accept marketing') && html.includes('Reject marketing'), path);
    assert.doesNotMatch(html, /<script[^>]+src="https:\/\/connect\.facebook\.net/);
    assert.doesNotMatch(html, /<img[^>]+src="https:\/\/www\.facebook\.com\/tr/);
    if (path.startsWith('/gameon-multisports-league')) {
      const text = html.replace(/<!--[^]*?-->/g, '').replace(/&amp;/g, '&');
      assert.doesNotMatch(text, /2026-10-1[78]|1[78] (?:Oct|October)|17 & 18/, path);
      if (path.includes('/sports/')) {
        assert.match(text, path.endsWith('/cricket') ? /25 Oct,? 2026/ : /24 Oct,? 2026/, path);
        if (path.endsWith('/badminton') || path.endsWith('/pickleball')) assert.match(text, /25 Oct,? 2026/, path);
      } else {
        assert.match(text, /24 & 25 October 2026/, path);
      }
    }
  }
  const payment = await get('/gameon-multisports-league/book/payment');
  assert.equal(payment.status, 307);
  assert.equal(payment.headers.get('location'), '/gameon-multisports-league/book/review');
  console.log('PASS league landing, all sport pages and booking routes use October 24–25, 2026 with no superseded dates.');
  console.log('PASS public website and league routes render consent controls without a pre-consent Pixel script or image.');
  for (const path of ['/admin/multisports-league', '/admin/multisports-league/coupons', '/admin/multisports-league/12345678-1234-4234-8234-123456789abc', '/admin/multisports-league/export']) {
    const response = await get(path);
    assert.equal(response.status, 307, path);
    assert.match(response.headers.get('location'), /\/admin\/login/);
    console.log(`PASS ${path}: unauthenticated access redirects to login.`);
  }
  for (const endpoint of ['order', 'confirm']) {
    const response = await fetch(`${origin}/api/v1/public/league/entries/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 400, endpoint);
    assert.equal((await response.json()).success, false);
    console.log(`PASS League ${endpoint}: invalid payload rejected before payment/database writes.`);
  }
  const coupons = await get('/api/v1/public/league/coupons');
  assert.equal(coupons.status, 200);
  assert.equal(coupons.headers.get('cache-control'), 'no-store');
  assert.ok(Array.isArray((await coupons.json()).coupons));
  const invalidCoupon = await fetch(`${origin}/api/v1/public/league/coupons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(30000) });
  assert.equal(invalidCoupon.status, 400);
  console.log('PASS public coupon list loads with no-store; invalid preview is rejected.');
  const sitemap = await (await get('/sitemap.xml')).text();
  assert.doesNotMatch(sitemap, /\/admin\/multisports-league/);
  console.log('PASS League booking admin routes are absent from the public sitemap.');
} catch (error) { console.error(output.slice(-6000)); throw error; }
finally { server.kill(); await stopped; }