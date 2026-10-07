/** Real Chrome interaction checks using native CDP. Registration responses are intercepted: no live writes. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
assert.ok(existsSync(chromePath), 'Set CHROME_PATH to an installed Chrome executable.');
const profile = mkdtempSync(resolve(tmpdir(), 'gameon-open-play-chrome-'));
const artifacts = resolve(tmpdir(), 'gameon-open-play-previews'); mkdirSync(artifacts, { recursive: true });
const origin = 'http://127.0.0.1:3142';
const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-p', '3142'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let serverOutput = ''; server.stdout.on('data', data => { serverOutput += data; }); server.stderr.on('data', data => { serverOutput += data; });
const serverStopped = new Promise(resolve => server.once('exit', resolve));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9342', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const chromeStopped = new Promise(resolve => chrome.once('exit', resolve));
let socket;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let sequence = 0;
const calls = new Map();
const errors = [];
const submissions = [];
let mode = 'success';
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { calls.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    calls.set(id, { resolve: result => { clearTimeout(timeout); resolve(result); }, reject: error => { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression, label) {
  for (let i = 0; i < 80; i++) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); }
  throw new Error(`Timed out waiting for ${label}`);
}
async function screenshot(name) {
  const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(resolve(artifacts, name), Buffer.from(data, 'base64'));
}
async function navigate() {
  await command('Page.navigate', { url: `${origin}/open-play-registrations?utm_source=instagram&utm_campaign=open_play_oct18&utm_content=cricket` });
  await until(`document.querySelector('[data-sport="cricket"]') && document.querySelector('button[type="submit"]')`, 'form render');
  await evaluate('document.fonts.ready'); await sleep(500);
}
async function fillForm(sport = 'cricket') {
  await evaluate(`document.querySelector('[data-sport="${sport}"]').click();
    const change = (name, value) => { const input = document.querySelector('[name="' + name + '"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); };
    change('fullName', 'Browser Test Player'); change('phone', '9811000000');
    const consent = document.querySelector('[name="contactConsent"]'); if (!consent.checked) consent.click();`);
  await sleep(50);
}
try {
  let page;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    try {
      const response = await fetch('http://127.0.0.1:9342/json/list'); const targets = await response.json();
      page = targets.find(target => target.type === 'page');
      if (page && (await fetch(`${origin}/robots.txt`)).ok) break;
    } catch { /* Chrome / Next are still starting. */ }
    await sleep(200);
  }
  assert.ok(page, 'Chrome debugging endpoint unavailable.');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const call = calls.get(message.id); if (!call) return; calls.delete(message.id);
      if (message.error) call.reject(new Error(message.error.message)); else call.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    else if (message.method === 'Fetch.requestPaused') {
      const { requestId, request } = message.params;
      if (request.url.includes('/api/v1/public/open-play/registrations')) {
        submissions.push(JSON.parse(request.postData));
        const payload = mode === 'error' ? { success: false, error: 'Test storage is temporarily unavailable.' } : { success: true, created: mode === 'success', registrationId: mode === 'success' ? 'browser-test-id' : null, eventDate: '2026-10-18' };
        setTimeout(() => command('Fetch.fulfillRequest', { requestId, responseCode: mode === 'error' ? 503 : mode === 'duplicate' ? 200 : 201, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(payload)).toString('base64') }).catch(error => errors.push(String(error))), 300);
      } else command('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(error => errors.push(String(error)));
    }
  });
  await command('Page.enable'); await command('Runtime.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: '*api/v1/public/open-play/registrations*' }, { urlPattern: '*connect.facebook.net*' }, { urlPattern: '*facebook.com/tr*' }] });
  await command('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('gameon-marketing-consent-v1','denied');` });
  for (const width of [375, 768, 1024, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: width < 640 });
    await navigate();
    const layout = await evaluate(`({ width: innerWidth, scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth, title: !!document.querySelector('h1'), choices: document.querySelectorAll('[data-sport]').length, inputFont: getComputedStyle(document.querySelector('[name="phone"]')).fontSize, cta: getComputedStyle(document.querySelector('.op-mobile-cta')).display })`);
    assert.ok(layout.scroll <= width && layout.body <= width, `Overflow at ${width}: ${JSON.stringify(layout)}`);
    assert.equal(layout.choices, 4); assert.equal(layout.inputFont, '16px'); assert.equal(layout.cta === 'none', width >= 1024);
    await screenshot(`landing-${width}.png`);
    if (width === 375) { await evaluate(`document.querySelector('#register').scrollIntoView();`); await sleep(300); await screenshot('form-mobile.png'); }
    console.log(`PASS ${width}px responsive layout, input sizes and CTA visibility`);
  }
  await evaluate(`document.querySelector('form').requestSubmit();`);
  await until(`document.querySelector('#op-sport-error')`, 'sport validation'); assert.equal(submissions.length, 0);
  await evaluate(`document.querySelectorAll('.op-sport-card')[1].click()`); await sleep(150);
  assert.equal(await evaluate(`document.querySelector('[data-sport="football"]').getAttribute('aria-pressed')`), 'true');
  await fillForm('pickleball');
  await evaluate(`document.querySelector('form').requestSubmit(); document.querySelector('form').requestSubmit();`);
  try { await until(`document.body.innerText.toLowerCase().includes('you’re on the list.')`, 'saved confirmation'); }
  catch (error) {
    console.error('Submission diagnostics', JSON.stringify({ submissions, errors, page: await evaluate(`({ text: document.querySelector('#register').innerText, inputs: Array.from(document.querySelectorAll('form input')).map(input => ({ name: input.name, value: input.value, checked: input.checked })) })`) }));
    await screenshot('submission-error.png'); throw error;
  }
  assert.equal(submissions.length, 1); assert.equal(submissions[0].sport, 'pickleball'); assert.equal(submissions[0].marketingConsent, false); assert.equal(submissions[0].attribution.utm_source, 'instagram');
  assert.equal(await evaluate(`document.activeElement.getAttribute('role')`), 'status');
  await screenshot('success-desktop.png');
  console.log('PASS validation, sport card selection, saved confirmation, UTM labels and duplicate-click prevention');
  mode = 'duplicate'; await navigate(); await fillForm(); await evaluate(`document.querySelector('form').requestSubmit()`);
  await until(`document.body.innerText.toLowerCase().includes('already registered')`, 'duplicate confirmation');
  mode = 'error'; await navigate(); await fillForm(); await evaluate(`document.querySelector('form').requestSubmit()`);
  await until(`document.body.innerText.includes('Test storage is temporarily unavailable.')`, 'recoverable error');
  assert.equal(await evaluate(`document.querySelector('[name="fullName"]').value`), 'Browser Test Player'); assert.equal(await evaluate(`document.querySelector('button[type="submit"]').disabled`), false);
  console.log('PASS duplicate and failure states preserve details and permit retry');
  await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.op-art-stamp')).animationName`), 'none');
  assert.equal(errors.length, 0, `Browser exceptions: ${JSON.stringify(errors)}`);
  console.log(`PASS reduced-motion support and no browser exceptions. Screenshots: ${artifacts}`);
} finally {
  socket?.close(); chrome.kill(); server.kill();
  await Promise.all([chromeStopped, serverStopped]); await sleep(200);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may take a moment to release profile handles on Windows. */ }
}