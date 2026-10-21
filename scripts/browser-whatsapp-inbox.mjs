/** Isolated real React/Chrome checks with a fake inbox API. Never sends live messages. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modules = [], ids = new Map();
function bundle(filename) {
  if (ids.has(filename)) return ids.get(filename);
  const id = modules.length; ids.set(filename, id); modules.push('');
  const require = createRequire(filename);
  let text = readFileSync(filename, 'utf8');
  if (/\.tsx?$/.test(filename)) text = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  text = text.replace(/require\(["']([^"']+)["']\)/g, (_match, name) => {
    if (name === 'next/link') return '({__esModule:true,default:({children,...props})=>requireReact.createElement("a",props,children)})';
    let target;
    if (name.startsWith('@/')) { target = resolve(root, 'src', name.slice(2)); target += existsSync(`${target}.ts`) ? '.ts' : '.tsx'; }
    else if (name.startsWith('.')) target = resolve(dirname(filename), name);
    else target = require.resolve(name);
    if (!existsSync(target)) target += existsSync(`${target}.ts`) ? '.ts' : '.tsx';
    return `load(${bundle(target)})`;
  });
  modules[id] = `function(module,exports){${text}\n}`; return id;
}
const workspace = bundle(resolve(root, 'src/components/admin/whatsapp-workspace.tsx'));
const require = createRequire(import.meta.url);
const react = bundle(require.resolve('react')), client = bundle(require.resolve('react-dom/client'));
const script = `const process={env:{NODE_ENV:'production'}};const modules=[${modules.join(',')}];const cache={};function load(id){if(cache[id])return cache[id].exports;const m={exports:{}};cache[id]=m;modules[id](m,m.exports);return m.exports;}const requireReact=load(${react});load(${client}).createRoot(document.getElementById('root')).render(requireReact.createElement(load(${workspace}).WhatsAppWorkspace,{initialTab:'inbox'}));`;
const chunks = resolve(root, '.next/static/chunks');
const css = existsSync(chunks) ? readdirSync(chunks).filter(name => name.endsWith('.css')).map(name => readFileSync(resolve(chunks, name), 'utf8')).join('\n') : '';
const phone = '919876543210', sent = [];
const contact = { phone, name: 'Test Player', last_message_at: new Date().toISOString(), last_inbound_at: new Date().toISOString(), utility_consent_at: new Date().toISOString() };
const recipients = [1, 2, 3].map((number, index) => ({ id: `entry-${number}`, name: `Player ${number}`, phone: index === 2 ? phone : `91987654321${index}`, rawPhone: '+91 98765 43210', reference: `GO-${number}`, amount: 200 }));
const messages = [{ id: 'm1', phone, direction: 'inbound', body: 'Hello GameOn', message_type: 'text', status: 'received', created_at: new Date().toISOString() }];
const server = createServer(async (req, res) => {
  if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(script); }
  if (req.url === '/style.css') { res.setHeader('Content-Type', 'text/css'); return res.end(css); }
  if (req.url.startsWith('/admin/whatsapp/api')) {
    res.setHeader('Content-Type', 'application/json'); const url = new URL(req.url, 'http://localhost');
    let data;
    if (req.method === 'POST') { let raw = ''; for await (const part of req) raw += part; const body = JSON.parse(raw); sent.push(body); data = { status: 'sent' }; }
    else if (url.searchParams.get('op') === 'account') data = { configured: true, webhookConfigured: true, subscribedAppCount: 1, phone: { verified_name: 'Test GameOn', code_verification_status: 'VERIFIED' }, templates: [{ id: 'tpl', name: 'league_update', language: 'en', category: 'UTILITY', status: 'APPROVED', components: [{ type: 'BODY', text: 'Hello {{1}}' }] }] };
    else if (url.searchParams.get('op') === 'messages') data = { contact, messages, optedOut: false, next: null };
    else if (url.searchParams.get('op') === 'league') data = { recipients, total: 3 };
    else data = { contacts: [contact], total: 1 };
    return res.end(JSON.stringify(data));
  }
  res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><main class="min-h-screen bg-zinc-50 p-4 text-zinc-900"><div id="root"></div></main><script src="/bundle.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profile = mkdtempSync(resolve(tmpdir(), 'gameon-wa-browser-'));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
assert.ok(existsSync(chromePath), 'Set CHROME_PATH to Chrome.');
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9351', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let socket, sequence = 0; const calls = new Map(), errors = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function command(method, params = {}) { return new Promise((resolve, reject) => { const id = ++sequence; const timer = setTimeout(() => reject(new Error(`CDP timeout ${method}`)), 10000); calls.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject }); socket.send(JSON.stringify({ id, method, params })); }); }
async function evaluate(expression) { const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description); return result.result.value; }
async function until(expression) { for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await sleep(50); } throw new Error(`Timed out: ${expression}`); }
const button = text => `Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes(${JSON.stringify(text)}))`;
async function click(text) { await evaluate(`${button(text)}.click()`); await sleep(100); }
async function select(id, value) { await evaluate(`(()=>{const el=document.getElementById(${JSON.stringify(id)});const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set;setter.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('change',{bubbles:true}));})()`); await sleep(100); }
try {
  let page;
  for (let i = 0; i < 100; i++) { try { page = (await (await fetch('http://127.0.0.1:9351/json/list')).json()).find(item => item.type === 'page'); if (page) break; } catch {} await sleep(100); }
  assert.ok(page, 'Chrome did not start'); socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id) { const call = calls.get(message.id); if (!call) return; calls.delete(message.id); if (message.error) call.reject(new Error(message.error.message)); else call.resolve(message.result); } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails); });
  await command('Runtime.enable'); await command('Page.enable');
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await command('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });
  await until(`document.body.innerText.includes('Test Player')`);
  await click('Test Player'); await until(`document.body.innerText.includes('Hello GameOn')`);
  assert.equal(await evaluate(`document.body.innerText.includes('24-hour reply window open')`), true);
  await select('wa-kind', 'text');
  await evaluate(`document.querySelector('label input[type=checkbox]').click()`);
  await click('Send to 1 recipient'); await until(`document.body.innerText.includes('Finished 1 recipient')`);
  assert.equal(sent.length, 1); assert.equal(sent[0].phone, phone); assert.equal(sent[0].kind, 'text');
  console.log('PASS inbox history, custom reply, confirmation and send result');
  await click('Bulk messages'); await until(`document.body.innerText.includes('Player 3')`);
  await click('Select all matching entries'); await until(`document.body.innerText.includes('3 entries · 2 unique numbers')`);
  await select('wa-kind', 'text'); await evaluate(`document.querySelector('label input[type=checkbox]:not([aria-label])').click()`);
  await click('Clear selection'); assert.equal(await evaluate(`${button('Send to 0 recipient')}.disabled`), true);
  await click('Select this page');
  await evaluate(`document.querySelector('input[aria-label="Select Player 2 GO-2"]').click()`); await sleep(100);
  assert.equal(await evaluate(`${button('Send to 1 recipient')}.disabled`), true, 'Changing targets must require confirmation again');
  await evaluate(`document.querySelector('input[aria-label="Select Player 2 GO-2"]').click()`); await sleep(100);
  await click('Send to 2 recipient'); await until(`document.body.innerText.includes('Finished 2 recipient')`);
  assert.equal(sent.length, 3); assert.deepEqual(sent.slice(1).map(item => item.leagueId), ['entry-3', 'entry-2']);
  console.log('PASS select all, phone dedupe, target-change confirmation and bulk send');
  await click('Account & templates'); await until(`document.body.innerText.includes('Test GameOn')`);
  assert.equal(await evaluate(`document.body.innerText.includes('league_update')`), true);
  console.log('PASS account and template listing');
  await command('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: true });
  for (const tab of ['Inbox', 'Bulk messages', 'Account & templates']) { await click(tab); assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'), true, `${tab} must fit mobile width`); }
  assert.deepEqual(errors, []); console.log('PASS 375px mobile layout; no runtime errors');
} finally {
  socket?.close(); chrome.kill(); await new Promise(resolve => server.close(resolve));
  await sleep(300); rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
}