/** Isolated real-React Chrome test. Mock API, no authentication or live writes.
 * Bundles installed project dependencies in memory; no new build dependency.
 * node scripts/browser-scanner.mjs
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modules = [];
const ids = new Map();
function bundle(filename) {
  if (ids.has(filename)) return ids.get(filename);
  const id = modules.length; ids.set(filename, id); modules.push('');
  const require = createRequire(filename);
  let text = readFileSync(filename, 'utf8');
  if (/\.tsx?$/.test(filename)) text = ts.transpileModule(text, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  text = text.replace(/require\(["']([^"']+)["']\)/g, (_match, name) => {
    if (name === 'next/link') return '({__esModule:true,default:({children,...props})=>requireReact.createElement("a",props,children)})';
    let target;
    if (name.startsWith('@/')) {
      target = resolve(root, 'src', name.slice(2));
      target += existsSync(`${target}.ts`) ? '.ts' : '.tsx';
    } else if (name.startsWith('.')) {
      target = resolve(dirname(filename), name);
      if (!existsSync(target)) target += existsSync(`${target}.ts`) ? '.ts' : '.tsx';
    } else target = require.resolve(name);
    return `load(${bundle(target)})`;
  });
  modules[id] = `function(module,exports){${text}\n}`;
  return id;
}
const stationId = bundle(resolve(root, 'src/app/admin/(panel)/check-in/check-in-station.tsx'));
const require = createRequire(import.meta.url);
const reactId = bundle(require.resolve('react'));
const clientId = bundle(require.resolve('react-dom/client'));
const id = '11111111-1111-4111-8111-111111111111';
const api = `/api/v1/admin/bookings/verify-qr`;
const script = `const process={env:{NODE_ENV:'production'}};const modules=[${modules.join(',')}];const cache={};
function load(id){if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;modules[id](m,m.exports);return m.exports;}
const requireReact=load(${reactId});load(${clientId}).createRoot(document.getElementById('root')).render(requireReact.createElement(load(${stationId}).CheckInStation));`;
const chunks = resolve(root, '.next/static/chunks');
const css = existsSync(chunks) ? readdirSync(chunks).filter(name => name.endsWith('.css')).map(name => readFileSync(resolve(chunks, name), 'utf8')).join('\n') : '';
// Match AdminRootLayout's inherited text/surface styles; the marketing body is light-on-dark.
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/station.css"></head><body><div class="relative isolate min-h-screen bg-zinc-50 font-sans text-zinc-900"><main style="max-width:1000px;margin:auto;padding:16px"><div id="root"></div></main></div><script src="/station.js"></script></body></html>`;
let mode = 'success';
const requests = [];
const server = createServer(async (request, response) => {
  if (request.url === '/station.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(script); return; }
  if (request.url === '/station.css') { response.setHeader('Content-Type', 'text/css'); response.end(css); return; }
  if (request.url === api) {
    let body = ''; for await (const part of request) body += part;
    requests.push(JSON.parse(body));
    await new Promise(resolve => setTimeout(resolve, 100));
    if (mode === 'offline') { request.socket.destroy(); return; }
    const status = mode === 'duplicate' ? 'already_checked_in' : mode === 'error' ? 'cancelled' : 'checked_in';
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ success: status === 'checked_in', status,
      message: status === 'checked_in' ? 'Booking verified' : status === 'cancelled' ? 'Booking cancelled' : 'Already checked in',
      booking: { bookingId: id, category: 'booking', userName: 'Scanner Test Player', facilityName: 'Court 2', sport: 'Badminton',
        venueName: 'GameOn', timezone: 'Asia/Kolkata', date: '2026-10-17', endDate: '2026-10-17', startTime: '19:00', endTime: '20:00',
        scannedAt: '2026-10-17T13:32:00Z' } })); return;
  }
  response.setHeader('Content-Type', 'text/html'); response.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(resolve(tmpdir(), 'gameon-scanner-browser-'));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
assert.ok(existsSync(chromePath), 'Set CHROME_PATH to Chrome');
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9348', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let socket;
let sequence = 0;
const calls = new Map();
const errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { calls.delete(id); reject(new Error(`CDP timeout ${method}`)); }, 10000);
    calls.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description);
  return result.result.value;
}
async function until(text) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(`document.querySelector('section')?.textContent.includes(${JSON.stringify(text)})`)) return;
    await sleep(50);
  }
  throw new Error(`Screen did not show ${text}`);
}
async function scan(code = id, gap = 2) {
  for (const key of code) {
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key, text: key });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key });
    if (gap) await sleep(gap);
  }
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', windowsVirtualKeyCode: 13 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', windowsVirtualKeyCode: 13 });
}
try {
  let page;
  for (let i = 0; i < 100; i++) {
    try { page = (await (await fetch('http://127.0.0.1:9348/json/list')).json()).find(x => x.type === 'page'); if (page) break; } catch {}
    await sleep(100);
  }
  assert.ok(page, 'Chrome did not start'); socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const call = calls.get(message.id); if (!call) return; calls.delete(message.id); if (message.error) call.reject(new Error(message.error.message)); else call.resolve(message.result); }
    else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  });
  await command('Runtime.enable'); await command('Page.enable');
  await command('Page.navigate', { url: origin }); await until('Ready to scan');
  assert.ok(css.length > 0, 'Run next build before the styled browser test');
  for (const width of [375, 768, 1024, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: width < 640 });
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), `Horizontal overflow at ${width}`);
  }
  const readyImage = await command('Page.captureScreenshot', { format: 'png' });
  const readyPath = resolve(tmpdir(), 'gameon-scanner-ready.png'); writeFileSync(readyPath, Buffer.from(readyImage.data, 'base64'));
  await evaluate(`window.passedEnterKeys=0;window.addEventListener('keydown',event=>{if(event.key==='Enter')window.passedEnterKeys++})`);
  await scan();
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', windowsVirtualKeyCode: 13 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await evaluate('window.passedEnterKeys'), 0, 'CR+LF must not activate another control');
  await until('Booking verified'); assert.equal(requests.length, 1);
  await scan(); assert.equal(requests.length, 1, 'Rapid duplicate should be suppressed');
  await sleep(1300); mode = 'duplicate'; await scan(); await until('Already checked in');
  assert.equal(requests.length, 2);
  await sleep(5100); await until('Ready to scan');
  assert.match(await evaluate(`document.querySelector('[aria-label="Most recent scan"]').textContent`), /Already checked in/);
  await scan(id, 100); assert.equal(requests.length, 2, 'Human typing must not verify');
  await evaluate(`document.querySelector('details').open=true;document.querySelector('#scanner-manual').focus()`);
  await scan(); assert.equal(requests.length, 2, 'Editable input must not auto-verify');
  await evaluate(`document.querySelector('#scanner-manual').blur()`);
  mode = 'error'; await scan(`gameon:event:${id}`); await until('Booking cancelled');
  mode = 'offline'; await scan(`gameon:tournament:${id}`); await until('Check internet connection');
  assert.deepEqual(errors, []);
  console.log(`PASS: real React/Chrome HID scans, duplicate lock, reset/recent result, slow typing, editable-field safety, cancellation and network failure. Responsive widths: 375, 768, 1024, 1440. Preview: ${readyPath}`);
} finally {
  socket?.close(); chrome.kill(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  await sleep(600); try { rmSync(profile, { recursive: true, force: true }); } catch {}
}