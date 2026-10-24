/** Production Chrome checks. Order/confirm requests and Razorpay are mocked: no payments or live writes. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
assert.ok(existsSync(chromePath), 'Set CHROME_PATH to an installed Chrome executable.');
const profile = mkdtempSync(resolve(tmpdir(), 'gameon-league-payments-'));
const origin = 'http://127.0.0.1:3143';
const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-p', '3143'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let output = ''; server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; });
const serverStopped = new Promise(resolve => server.once('exit', resolve));
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9343', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const chromeStopped = new Promise(resolve => chrome.once('exit', resolve));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, sequence = 0;
const calls = new Map(), errors = [], orders = [];
let total = 1200;
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { calls.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    calls.set(id, { resolve: value => { clearTimeout(timeout); resolve(value); }, reject: error => { clearTimeout(timeout); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression) {
  for (let i = 0; i < 100; i++) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); }
  throw new Error(`Timed out: ${expression}. Page: ${JSON.stringify(await evaluate(`({text: document.body.innerText.slice(-4500), buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent), radios: Array.from(document.querySelectorAll('input[type="radio"]')).map(r => ({value:r.value,checked:r.checked})), draft: sessionStorage.getItem('go-league-draft')})`))}`);
}
try {
  let page;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(output);
    try { page = (await (await fetch('http://127.0.0.1:9343/json/list')).json()).find(p => p.type === 'page'); if (page && (await fetch(`${origin}/robots.txt`)).ok) break; } catch {}
    await sleep(200);
  }
  assert.ok(page, 'Chrome / production server unavailable.');
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
      let payload;
      if (request.url.includes('/entries/order')) {
        const entry = JSON.parse(request.postData).entry; orders.push(entry);
        const amount = entry.paymentPlan === 'DEPOSIT_20' ? total * 20 : total * 100;
        payload = { success: true, orderId: 'order_browser', amount, currency: 'INR', keyId: 'mock_key' };
      } else if (request.url.includes('/coupons')) payload = { coupons: [] };
      else { command('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }).catch(error => errors.push(String(error))); return; }
      command('Fetch.fulfillRequest', { requestId, responseCode: 201, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(payload)).toString('base64') }).catch(error => {
        // Navigation can cancel a background coupon fetch before CDP fulfills it.
        // Never suppress order interception failures or actual runtime errors.
        if (request.url.includes('/coupons') && error.message === 'Invalid InterceptionId.') return;
        errors.push(String(error));
      });
    }
  });
  await command('Page.enable'); await command('Runtime.enable');
  await command('Fetch.enable', { patterns: [{ urlPattern: '*api/v1/public/league/*' }, { urlPattern: '*checkout.razorpay.com*' }, { urlPattern: '*connect.facebook.net*' }, { urlPattern: '*facebook.com/tr*' }] });
  await command('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('gameon-marketing-consent-v1','denied'); window.Razorpay = class { constructor(options) { window.mockCheckout = options; } open() {} };` });
  await command('Page.navigate', { url: `${origin}/gameon-multisports-league/book/review` });
  await until(`document.querySelector('h1')`);
  const selections = [
    ['badminton', 'u13-boys-singles', 1000], ['pickleball', 'mens-beginner-singles', 999],
    ['cricket', 'team', 2000], ['football', 'team', 2000],
  ];
  for (const width of [375, 768, 1024, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: width < 640 });
    await evaluate(`sessionStorage.removeItem('go-league-draft')`);
    await command('Page.navigate', { url: `${origin}/gameon-multisports-league/sports/pickleball` });
    await until(`document.querySelectorAll('button[aria-pressed]').length === 11 && !document.querySelector('button[aria-pressed]').disabled`);
    assert.equal(await evaluate(`document.querySelector('h1').textContent`), 'Pickleball Showdown');
    assert.equal(await evaluate(`document.body.innerText.includes('31 October & 1 November 2026')`), true);
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('button[aria-pressed]')).map(b => b.textContent.match(/₹[\\d,]+/)?.[0])`), ['₹999', '₹1,299', '₹1,899', '₹1,999', '₹2,299', '₹2,299', '₹2,299', '₹2,299', '₹2,399', '₹2,799', '₹2,799']);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('button[aria-pressed]')).every(b => b.getAttribute('aria-label').includes('₹') && /per (person|team)/.test(b.textContent) && !/October|November|Oct,|Nov,/.test(b.textContent + b.getAttribute('aria-label')))`), true);
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `pickleball category overflow at ${width}`);
    await evaluate(`document.querySelector('button[aria-pressed]').click()`);
    await until(`document.querySelector('button[aria-pressed="true"]')`);
    assert.equal(await evaluate(`document.querySelector('button[aria-pressed="true"]').innerText.includes('₹999')`), true);
    await command('Page.navigate', { url: `${origin}/gameon-multisports-league` });
    await until(`Array.from(document.querySelectorAll('h2')).some(h => h.textContent === 'Pickleball Showdown')`);
    assert.equal(await evaluate(`(() => { const card = Array.from(document.querySelectorAll('h2')).find(h => h.textContent === 'Pickleball Showdown').closest('.glass-subtle'); return card && card.innerText.includes('11 categories') && card.innerText.includes('31 October & 1 November 2026') && !card.innerText.toLowerCase().includes('starts from'); })()`), true);
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `league overflow at ${width}`);
    await command('Page.navigate', { url: `${origin}/gameon-multisports-league/book/review` });
    await until(`document.querySelector('h1')`);
    for (const [sportId, categoryId, amount] of selections) {
      total = amount;
      await evaluate(`sessionStorage.setItem('go-league-draft', JSON.stringify({ selections: [{sportId:'${sportId}',categoryId:'${categoryId}'}], captainName:'Browser Test Player', teamName:'Browser Team', email:'browser-test@example.com', phone:'9811000000', city:'Gurugram' }));`);
      await command('Page.reload');
      await until(`document.querySelectorAll('input[name="league-payment-plan"]').length === 2 && Array.from(document.querySelectorAll('button')).some(b => !b.disabled && b.textContent.includes('Pay in full ·'))`);
      assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `${sportId} overflow at ${width}`);
      for (const plan of ['DEPOSIT_20', 'FULL']) {
        await evaluate(`document.querySelector('input[value="${plan}"]').click()`);
        await until(`Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('${plan === 'FULL' ? 'Pay in full ·' : 'Book with 20% ·'}'))`);
        await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('${plan === 'FULL' ? 'Pay in full ·' : 'Book with 20% ·'}')).click()`);
        await until('window.mockCheckout');
        const checkout = await evaluate(`({ amount: window.mockCheckout.amount, description: window.mockCheckout.description })`);
        assert.equal(checkout.amount, plan === 'FULL' ? total * 100 : total * 20);
        assert.equal(orders.at(-1).paymentPlan, plan);
        await evaluate(`window.mockCheckout.modal.ondismiss(); window.mockCheckout = null;`);
      }
      await evaluate(`document.querySelector('input[value="DEPOSIT_20"]').click()`);
      await command('Page.reload');
      await until(`document.querySelector('input[value="DEPOSIT_20"]')?.checked && Array.from(document.querySelectorAll('button')).some(b => !b.disabled && b.textContent.includes('Book with 20% ·'))`);
    }
    console.log(`PASS ${width}px: all sports show two choices, submit correct plan/paise, persist selection, and fit viewport.`);
  }
  assert.equal(orders.length, 32);
  assert.deepEqual(errors, []);
  console.log('PASS 32 intercepted checkouts; no live orders, payments or emails.');
} catch (error) { console.error(output.slice(-4000)); throw error; }
finally { socket?.close(); chrome.kill(); server.kill(); await Promise.all([chromeStopped, serverStopped]); await sleep(200); try { rmSync(profile, { recursive: true, force: true }); } catch {} }