/** Production Chrome checks. Run: node scripts/browser-homepage-app.mjs --background.
 * Screenshots and results are written to the OS temp directory. No bookings submitted.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, openSync, closeSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(filename), '..');
const artifacts = resolve(tmpdir(), 'gameon-homepage-app');
mkdirSync(artifacts, { recursive: true });
const resultPath = resolve(artifacts, 'result.json');
if (process.argv.includes('--background')) {
  rmSync(resultPath, { force: true });
  const log = openSync(resolve(artifacts, 'browser.log'), 'w');
  const child = spawn(process.execPath, [filename], { cwd: root, detached: true, stdio: ['ignore', log, log] });
  child.unref(); closeSync(log);
  console.log(`Started PID ${child.pid}. Results: ${resultPath}`);
} else { await checks(); }

async function checks() {
  const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  assert.ok(existsSync(chromePath), 'Set CHROME_PATH to installed Chrome.');
  const profile = mkdtempSync(resolve(tmpdir(), 'gameon-homepage-chrome-'));
  const origin = 'http://127.0.0.1:3148';
  const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-p', '3148'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; server.stdout.on('data', data => { output += data; }); server.stderr.on('data', data => { output += data; });
  const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9348', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  let socket; let sequence = 0; const calls = new Map(); const errors = []; const layouts = [];
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { calls.delete(id); reject(new Error(`Timeout: ${method}`)); }, 30000);
      calls.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function until(expression, label) {
    for (let i = 0; i < 200; i++) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); }
    throw new Error(`Timed out: ${label}`);
  }
  async function screenshot(name) {
    const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(resolve(artifacts, name), Buffer.from(data, 'base64'));
  }
  try {
    let target;
    for (let i = 0; i < 200; i++) {
      if (server.exitCode !== null) throw new Error(output);
      try { const targets = await (await fetch('http://127.0.0.1:9348/json/list')).json(); target = targets.find(item => item.type === 'page'); if (target && (await fetch(`${origin}/robots.txt`)).ok) break; } catch { /* Starting. */ }
      await sleep(200);
    }
    assert.ok(target, 'Chrome unavailable');
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) { const call = calls.get(message.id); if (!call) return; calls.delete(message.id); if (message.error) call.reject(new Error(message.error.message)); else call.resolve(message.result); }
      else if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
      else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(arg => arg.value ?? arg.description).join(' '));
    });
    await command('Page.enable'); await command('Runtime.enable');
    await command('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('gameon-marketing-consent-v1','denied');` });
    await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await command('Page.navigate', { url: origin });
    await until(`document.querySelector('#hero button[aria-pressed]')`, 'hero');
    await sleep(1800); await evaluate('document.fonts.ready');
    assert.equal(await evaluate(`document.querySelector('main section').id`), 'hero');
    assert.equal(await evaluate(`document.querySelectorAll('#booking, [aria-roledescription="carousel"][id="hero"]').length`), 0);
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('#hero a')).find(a => a.textContent.trim() === 'Book the slot now')?.getAttribute('href')`), '/app');
    for (const width of [320, 375, 768, 1024, 1440]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 640 });
      await evaluate(`window.scrollTo({top:0,behavior:'instant'})`); await sleep(600);
      const layout = await evaluate(`({ width:innerWidth, scrollWidth:document.documentElement.scrollWidth, heroWidth:document.querySelector('#hero').getBoundingClientRect().width, h1:document.querySelector('h1').getBoundingClientRect().toJSON() })`);
      assert.ok(layout.scrollWidth <= width + 1, `Horizontal overflow at ${width}: ${JSON.stringify(layout)}`);
      layouts.push(layout);
      await screenshot(`hero-${width}.png`);
      for (const id of ['hero', 'download-app']) {
        await evaluate(`document.querySelector('#${id}').scrollIntoView({behavior:'instant',block:'start'})`); await sleep(900);
        for (const sport of ['pickleball', 'badminton', 'cricket', 'football']) {
          await evaluate(`Array.from(document.querySelectorAll('#${id} button[aria-pressed]')).find(button => button.textContent.trim().toLowerCase() === '${sport}').click()`);
          await sleep(100);
          assert.equal(await evaluate(`document.querySelectorAll('#${id} button[aria-pressed="true"]').length`), 1);
          assert.ok(await evaluate(`Boolean(document.querySelector('#${id} a[href="/app/sports?sport=${sport}"]'))`), `${id} ${sport} destination`);
        }
        if (id === 'download-app') await screenshot(`app-${width}.png`);
      }
    }
    await evaluate(`document.querySelector('#hero').scrollIntoView({behavior:'instant'}); Array.from(document.querySelectorAll('#hero button[aria-pressed]')).find(button => button.textContent.trim() === 'Badminton').focus()`);
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
    await sleep(200);
    assert.equal(await evaluate(`document.activeElement.getAttribute('aria-pressed')`), 'true');
    assert.equal(await evaluate(`document.activeElement.textContent.trim()`), 'Badminton');
    await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await evaluate(`Array.from(document.querySelectorAll('#hero button[aria-pressed]')).find(button => button.textContent.trim() === 'Cricket').click()`);
    await sleep(200);
    assert.ok(await evaluate(`Boolean(document.querySelector('#hero a[href="/app/sports?sport=cricket"]'))`), 'Sport picker works with reduced motion');
    await evaluate(`window.scrollTo({top:0,behavior:'instant'})`); await sleep(400);
    await evaluate(`Array.from(document.querySelectorAll('#hero a')).find(a => a.textContent.trim() === 'Book the slot now').click()`);
    await until(`location.pathname === '/app'`, 'CTA navigation to web app');
    assert.equal(errors.length, 0, `Runtime errors: ${JSON.stringify(errors)}`);
    writeFileSync(resultPath, JSON.stringify({ success: true, layouts, errors, navigation: '/app', artifacts }, null, 2));
    console.log('PASS responsive layouts, both sport pickers, homepage removals, and real web-app navigation.');
  } catch (error) {
    console.error(error, output);
    writeFileSync(resultPath, JSON.stringify({ success: false, error: String(error), errors, layouts }, null, 2));
    process.exitCode = 1;
  } finally {
    socket?.close();
    for (const child of [chrome, server]) {
      if (child.exitCode === null) {
        if (process.platform === 'win32') await new Promise(resolve => spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' }).once('exit', resolve));
        else child.kill();
      }
    }
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Profile briefly locked by Chrome. */ }
  }
}