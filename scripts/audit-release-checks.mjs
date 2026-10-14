/** Read-only production smoke checks and local test/build summaries. */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://gameonmultisports.com';
if (process.argv.includes('--api')) {
  // Proves whether the endpoints the released app calls exist in production.
  // 401/400 means the route is deployed and rejecting bad input; 404 means the
  // backend has not been redeployed and the app would break.
  const probes = [
    ['POST', '/api/v1/user/account-deletion', {}],
    ['POST', '/api/v1/public/feedback', {}],
    ['GET', '/api/v1/user/bookings', null],
    ['GET', '/api/v1/user/bookings/11111111-1111-4111-8111-111111111111', null],
    ['POST', '/api/v1/user/profile', {}],
  ];
  for (const [method, path, body] of probes) {
    try {
      const response = await fetch(base + path, {
        method, headers: { 'content-type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(12000),
      });
      const text = (await response.text()).replace(/\s+/g, ' ').slice(0, 160);
      console.log(JSON.stringify({ method, path, status: response.status, deployed: response.status !== 404, body: text }));
    } catch (error) { console.log(JSON.stringify({ method, path, error: error.message })); }
  }
} else if (process.argv.includes('--logs')) {
  for (const name of ['audit-final-tests.log', 'audit-serial-tests.log', 'audit-build.log']) {
    const path = resolve(root, name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    const lines = text.split('\n');
    console.log(`\n${name}\n${name.includes('tests')
      ? lines.filter(line => /ℹ|✖|not ok|^# (tests|pass|fail)/.test(line)).join('\n') || lines.slice(-40).join('\n')
      : text.slice(-6000)}`);
  }
} else {
  const base = 'https://gameonmultisports.com';
  const paths = ['/privacy', '/terms', '/delete-account', '/email-confirmed', '/api/v1/public/home', '/api/v1/public/sports', '/api/v1/public/events', '/api/v1/public/tournaments', '/api/v1/public/cancellation-policy'];
  await Promise.all(paths.map(async path => {
    try {
      const response = await fetch(base + path, { signal: AbortSignal.timeout(12000) });
      const type = response.headers.get('content-type');
      const text = await response.text();
      console.log(JSON.stringify({ path, status: response.status, type, validJson: path.startsWith('/api/') ? (() => { try { return JSON.parse(text).success === true; } catch { return false; } })() : undefined }));
    } catch (error) { console.log(JSON.stringify({ path, error: error.message })); }
  }));
}