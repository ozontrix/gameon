/** Native Chrome checks. Run: node scripts/browser-home-highlights.mjs --background.
 * Run a production build: node scripts/browser-home-highlights.mjs --build --background.
 * Logs, results and screenshots live in the OS temp directory. No registrations are submitted.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, openSync, closeSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(filename), '..');
const build = process.argv.includes('--build');
const artifacts = resolve(tmpdir(), 'gameon-home-highlights');
mkdirSync(artifacts, { recursive: true });
const resultPath = resolve(artifacts, build ? 'build-result.json' : 'browser-result.json');
if (process.argv.includes('--background')) {
  rmSync(resultPath, { force: true });
  const logPath = resolve(artifacts, build ? 'build.log' : 'browser.log');
  const log = openSync(logPath, 'w');
  const child = spawn(process.execPath, [filename, ...(build ? ['--build'] : [])], { cwd: root, detached: true, stdio: ['ignore', log, log] });
  child.unref(); closeSync(log);
  console.log(`Started PID ${child.pid}. Log: ${logPath}. Result: ${resultPath}`);
} else if (build) {
  const child = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'build'], { cwd: root, stdio: 'inherit' });
  child.once('error', error => { writeFileSync(resultPath, JSON.stringify({ success: false, error: error.message })); process.exitCode = 1; });
  child.once('exit', code => { writeFileSync(resultPath, JSON.stringify({ success: code === 0, code })); process.exitCode = code ?? 1; });
} else {
  await browserChecks();
}

async function browserChecks() {
  const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  assert.ok(existsSync(chromePath), 'Set CHROME_PATH to an installed Chrome executable.');
  const profile = mkdtempSync(resolve(tmpdir(), 'gameon-home-chrome-'));
  const origin = 'http://127.0.0.1:3146';
  const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-p', '3146'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let serverOutput = ''; server.stdout.on('data', data => { serverOutput += data; }); server.stderr.on('data', data => { serverOutput += data; });
  const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9346', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
  const stopped = [server, chrome].map(child => new Promise(resolve => child.once('exit', resolve)));
  const errors = []; let socket; let sequence = 0; const calls = new Map();
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  function command(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => { calls.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, method === 'Page.navigate' ? 120000 : 20000);
      calls.set(id, { resolve: result => { clearTimeout(timeout); resolve(result); }, reject: error => { clearTimeout(timeout); reject(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function until(expression, label) {
    for (let i = 0; i < 600; i++) { if (await evaluate(`Boolean(${expression})`)) return; await sleep(100); }
    const diagnostic = await evaluate(`({ url: location.href, title: document.title, buttons: Array.from(document.querySelectorAll('#hero button')).map(button => ({ label: button.getAttribute('aria-label'), disabled: button.disabled })), text: document.body.innerText.slice(0, 500) })`);
    throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(diagnostic)}`);
  }
  const active = `document.querySelector('#hero article[aria-hidden="false"]')?.id`;
  const button = label => `document.querySelector('#hero button[aria-label="${label}"]')`;
  async function click(label) { await evaluate(`${button(label)}.click()`); await sleep(1600); }
  async function screenshot(name) {
    const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(resolve(artifacts, name), Buffer.from(data, 'base64'));
  }
  try {
    let page;
    for (let i = 0; i < 200; i++) {
      if (server.exitCode !== null) throw new Error(serverOutput);
      try {
        const targets = await (await fetch('http://127.0.0.1:9346/json/list')).json();
        page = targets.find(target => target.type === 'page');
        if (page && (await fetch(`${origin}/robots.txt`)).ok) break;
      } catch { /* Processes are starting. */ }
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
    });
    await command('Page.enable'); await command('Runtime.enable');
    await command('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('gameon-marketing-consent-v1','denied');` });
    await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await command('Page.navigate', { url: origin });
    await until(`${button('Next highlight')} && !${button('Next highlight')}.disabled && ${button('Pause slideshow')}`, 'carousel hydration');
    await click('Pause slideshow'); await evaluate('document.fonts.ready');
    for (const width of [320, 375, 768, 1024, 1440]) {
      await command('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 640 });
      await sleep(700);
      for (const [label, id] of [['Show Open play', 'highlight-open-play'], ['Show Multi Sports League', 'highlight-multisports-league']]) {
        await click(label); await until(`${active} === '${id}'`, label);
        await until(`Array.from(document.querySelectorAll('#hero img')).every(img => img.complete && img.naturalWidth > 0)`, 'venue images');
        const layout = await evaluate(`(() => { const slide = document.querySelector('#hero article[aria-hidden="false"]'); const cta = slide.querySelector('a').getBoundingClientRect(); const image = slide.querySelector('img').getBoundingClientRect(); const content = slide.querySelector('h2').getBoundingClientRect(); return { scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth, cta: { x: cta.x, right: cta.right, width: cta.width, height: cta.height }, image: { top: image.top, bottom: image.bottom }, content: { top: content.top }, slides: document.querySelectorAll('#hero article').length, heroCount: document.querySelectorAll('#hero').length, existing: !!document.querySelector('#discover-gameon') }; })()`);
        assert.ok(layout.scroll <= width && layout.body <= width, `Overflow at ${width}: ${JSON.stringify(layout)}`);
        assert.ok(layout.cta.x >= 0 && layout.cta.right <= width && layout.cta.height >= 44, `CTA at ${width}`);
        assert.equal(layout.heroCount, 1); assert.equal(layout.existing, true); assert.equal(layout.slides, 2);
        if (width < 1024) assert.ok(layout.content.top >= layout.image.bottom, 'Mobile content is below image');
        await screenshot(`${id}-${width}.png`);
      }
      console.log(`PASS responsive layouts and both images at ${width}px`);
    }
    await click('Show Open play'); await click('Next highlight'); assert.equal(await evaluate(active), 'highlight-multisports-league');
    await click('Next highlight'); assert.equal(await evaluate(active), 'highlight-open-play');
    await click('Previous highlight'); assert.equal(await evaluate(active), 'highlight-multisports-league');
    await evaluate(`${button('Next highlight')}.focus()`);
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
    await sleep(650); assert.equal(await evaluate(active), 'highlight-open-play');
    console.log('PASS arrows, looping, dots and keyboard navigation');
    await click('Play slideshow'); await sleep(7200); assert.equal(await evaluate(active), 'highlight-multisports-league');
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 400 });
    await sleep(7200); assert.equal(await evaluate(active), 'highlight-multisports-league');
    await command('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1439, y: 999 });
    await click('Pause slideshow'); await sleep(7200); assert.equal(await evaluate(active), 'highlight-multisports-league');
    console.log('PASS autoplay, hover pause and explicit pause');
    await command('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await until(`!${button('Pause slideshow')} && !${button('Play slideshow')}`, 'reduced motion controls');
    await click('Next highlight'); assert.equal(await evaluate(active), 'highlight-open-play');
    await sleep(7200); assert.equal(await evaluate(active), 'highlight-open-play');
    console.log('PASS reduced motion disables autoplay while manual navigation works');
    await command('Emulation.setDeviceMetricsOverride', { width: 375, height: 1000, deviceScaleFactor: 1, mobile: true });
    await command('Emulation.setTouchEmulationEnabled', { enabled: true }); await sleep(700);
    await command('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 160 }] });
    for (const x of [260, 220, 180, 140, 100, 60]) { await command('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 160 }] }); await sleep(35); }
    await command('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(700);
    assert.equal(await evaluate(active), 'highlight-multisports-league');
    console.log('PASS mobile touch swipe');
    assert.deepEqual(errors, [], 'No browser runtime errors');
    writeFileSync(resultPath, JSON.stringify({ success: true, widths: [320, 375, 768, 1024, 1440], artifacts }, null, 2));
  } catch (error) {
    console.error(error, serverOutput);
    writeFileSync(resultPath, JSON.stringify({ success: false, error: String(error), errors }, null, 2));
    process.exitCode = 1;
  } finally {
    socket?.close();
    if (process.platform === 'win32') {
      for (const child of [chrome, server]) {
        if (child.exitCode === null) {
          await new Promise(resolve => spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' }).once('exit', resolve));
        }
      }
    } else { chrome.kill(); server.kill(); }
    await Promise.all(stopped);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Browser may still hold its profile briefly. */ }
  }
}