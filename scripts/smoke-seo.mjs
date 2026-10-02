/** Production HTTP smoke test. Run after npm run build. Read-only, no remote writes. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env.local'), quiet: true });
const port = 3137;
const origin = `http://127.0.0.1:${port}`;
const canonical = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://game-on.in').origin;
const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-p', String(port)], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const stopped = new Promise(resolve => server.once('exit', resolve));
let output = '';
server.stdout.on('data', data => { output += data.toString(); });
server.stderr.on('data', data => { output += data.toString(); });
async function get(path) { return fetch(`${origin}${path}`, { headers: { 'User-Agent': 'Twitterbot' }, redirect: 'manual', signal: AbortSignal.timeout(45000) }); }
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try { if ((await get('/robots.txt')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, `Server did not start: ${output}`);
  const paths = ['/', '/sponsorship', '/privacy', '/terms', '/delete-account', '/blogs', '/site-map', '/gameon-multisports-league', '/gameon-multisports-league/sports/badminton', '/gameon-olympics', '/gameon-olympics/sports', '/gameon-olympics/events', '/gameon-olympics/sports/pickleball'];
  const titles = new Set();
  for (const path of paths) {
    const response = await get(path); assert.equal(response.status, 200, path);
    const html = await response.text();
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1]; assert.ok(title, `Missing title: ${path}`); assert.ok(!titles.has(title), `Duplicate title: ${path}`); titles.add(title);
    const expected = `${canonical}${path === '/' ? '' : path}`;
    const canonicalTag = html.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0];
    const canonicalHref = canonicalTag?.match(/href="([^"]+)"/)?.[1];
    assert.equal(canonicalHref?.replace(/\/$/, ''), expected, `Wrong canonical: ${path} (${canonicalHref})`);
    assert.match(html, /name="description" content="[^"]+"/);
    const ogTag = html.match(/<meta[^>]*property="og:url"[^>]*>/)?.[0];
    assert.equal(ogTag?.match(/content="([^"]+)"/)?.[1]?.replace(/\/$/, ''), expected, `Wrong OG URL: ${path}`);
    if (path === '/') { assert.match(html, /SportsActivityLocation/); assert.match(html, /href="\/blogs"/); }
    console.log(`PASS ${path}: unique metadata and canonical`);
  }
  const robots = await (await get('/robots.txt')).text(); assert.ok(robots.includes(`${canonical}/sitemap.xml`));
  const sitemapResponse = await get('/sitemap.xml'); assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text(); assert.match(sitemap, /<urlset/); assert.ok(sitemap.includes(`${canonical}/blogs`)); assert.doesNotMatch(sitemap, /\/admin|\/api-docs|\/book\/|\/bookings/);
  for (const path of ['/api-docs', '/gameon-multisports-league/book/details', '/gameon-olympics/account']) {
    const html = await (await get(path)).text(); assert.match(html, /name="robots" content="noindex, nofollow"/); console.log(`PASS ${path}: noindex`);
  }
  assert.equal((await get('/blogs/nonexistent-seo-smoke-test')).status, 404);
  const admin = await get('/admin/blogs'); assert.equal(admin.status, 307); assert.match(admin.headers.get('location'), /\/admin\/login/);
  const image = await get('/social-preview'); assert.equal(image.status, 200); assert.match(image.headers.get('content-type'), /image\/png/);
  const bytes = new Uint8Array(await image.arrayBuffer()); assert.deepEqual([...bytes.slice(0, 4)], [137, 80, 78, 71]);
  console.log('PASS robots, sitemap, missing article 404, admin authentication redirect and social preview PNG');
} catch (error) {
  console.error(output.slice(-6000)); throw error;
} finally {
  server.kill();
  await stopped;
}