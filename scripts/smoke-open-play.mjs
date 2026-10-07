/** Production HTTP checks; no live records, payments or emails created. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'http://127.0.0.1:3141';
const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-p', '3141'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const stopped = new Promise(resolve => server.once('exit', resolve));
let output = ''; server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; });
const get = path => fetch(`${origin}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
try {
  let ready = false;
  for (let i = 0; i < 50; i++) { if (server.exitCode !== null) throw new Error(output); try { if ((await get('/robots.txt')).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 300)); }
  assert.ok(ready, output);
  const response = await get('/open-play-registrations'); assert.equal(response.status, 200);
  const html = (await response.text()).replace(/<!--[^]*?-->/g, '');
  for (const text of ['YOUR SUNDAY.', '18 October 2026', '19 October 2026', 'data-sport="cricket"', 'data-sport="football"', 'data-sport="badminton"', 'data-sport="pickleball"', 'DJ party', 'Pizza party', 'Coffee party']) assert.ok(html.includes(text), text);
  assert.match(html, /<link rel="canonical"[^>]+open-play-registrations/);
  assert.doesNotMatch(html, /<script[^>]+src="https:\/\/connect\.facebook\.net/);
  const image = await get('/open-play-registrations/social-preview'); assert.equal(image.status, 200); assert.match(image.headers.get('content-type'), /image\/png/); assert.ok((await image.arrayBuffer()).byteLength > 1000);
  assert.equal((await get('/open-play/court-scene.svg')).status, 200); const calendar = await get('/open-play/october-18.ics'); assert.match(await calendar.text(), /DTSTART;VALUE=DATE:20261018/);
  for (const path of ['/admin/open-play-registrations', '/admin/open-play-registrations/export']) { const denied = await get(path); assert.equal(denied.status, 307); assert.match(denied.headers.get('location'), /\/admin\/login/); }
  const invalid = await fetch(`${origin}/api/v1/public/open-play/registrations`, { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: '{}' }); assert.equal(invalid.status, 400); assert.equal((await invalid.json()).success, false);
  const crossSite = await fetch(`${origin}/api/v1/public/open-play/registrations`, { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }); assert.equal(crossSite.status, 403);
  assert.equal((await get('/api/v1/public/open-play/registrations')).status, 405);
  const sitemap = await (await get('/sitemap.xml')).text(); assert.match(sitemap, /open-play-registrations/); assert.doesNotMatch(sitemap, /\/admin\/open-play/);
  console.log('PASS landing, social graphic, calendar, protected admin routes, rejected submissions and sitemap. No live registration writes.');
} catch (error) { console.error(output.slice(-3000)); throw error; }
finally { server.kill(); await stopped; }