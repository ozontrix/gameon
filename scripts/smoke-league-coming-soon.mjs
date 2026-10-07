/** Run after npm run build. Read-only HTTP checks; no bookings or payments created. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'http://127.0.0.1:3140';
const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-p', '3140'], {
  cwd: root, stdio: ['ignore', 'pipe', 'pipe'],
});
const stopped = new Promise(resolve => server.once('exit', resolve));
let output = '';
server.stdout.on('data', data => { output += data; });
server.stderr.on('data', data => { output += data; });
const get = path => fetch(`${origin}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(5000) });

try {
  let ready = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    if (server.exitCode !== null) throw new Error(output);
    try { if ((await get('/robots.txt')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, `Production server did not start: ${output}`);
  const response = await get('/gameon-multisports-league');
  assert.equal(response.status, 200);
  // React's streamed HTML can place separator comments between adjacent text nodes.
  const html = (await response.text()).replace(/<!--[\s\S]*?-->/g, '');
  assert.match(html, /<h1[^>]*id="league-coming-soon-title"[^>]*>Bookings will be <span[^>]*>open soon<\/span><\/h1>/);
  assert.match(html, /<a[^>]*href="\/"[^>]*>[\s\S]*?Go home<\/a>/);
  assert.doesNotMatch(html, /Pick your sport\.|Enter the league\.|Select Sport/);
  assert.doesNotMatch(html, /href="\/gameon-multisports-league\/(?:sports|book)\//);
  for (const path of ['/', '/gameon-multisports-league/sports/pickleball', '/gameon-multisports-league/book/details']) {
    const other = await get(path);
    assert.equal(other.status, 200, path);
    assert.doesNotMatch(await other.text(), /id="league-coming-soon-title"/, path);
  }
  console.log('PASS league landing serves only the temporary view; home, sport and booking routes remain unchanged.');
} catch (error) {
  console.error(output.slice(-6000));
  throw error;
} finally {
  server.kill();
  await stopped;
}