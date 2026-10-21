/** Production smoke against the connected database. Read-only; run after next build. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'http://localhost:3158';
const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-p', '3158'], { cwd: root, stdio: 'ignore' });
server.on('error', error => { console.error(error); process.exitCode = 1; });
try {
  let response;
  for (let i = 0; i < 70; i++) {
    try {
      response = await fetch(`${origin}/api/v1/public/home`);
      if (response.ok) break;
    } catch { /* Server starting. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(response?.ok, 'Public home should return 200');
  const { data } = await response.json();
  for (const banner of data.banners.hero) {
    assert.equal(typeof banner.showText, 'boolean');
    assert.ok(banner.imageUrl);
    if (!banner.showText) {
      assert.equal(banner.title, '');
      assert.equal(banner.titleAccent, null);
      assert.equal(banner.subtitle, null);
    }
  }
  assert.equal((await fetch(`${origin}/app/home`)).status, 200);
  console.log(`Production smoke passed: /app/home 200; ${data.banners.hero.length} hero slides with valid visibility flags and images.`);
} finally {
  server.kill();
}