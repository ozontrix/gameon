/** Run: node --test scripts/test-homepage-app.mjs. No network or data writes. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const read = file => readFileSync(resolve(root, file), 'utf8');
function load(file, mocks = {}) {
  const compiled = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } });
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputText)(id => mocks[id] ?? require(id), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const data = load('src/lib/homepage-app.ts');
function render(file, name, sport = data.homepageSports[0], stores = { android: null, ios: null }) {
  const buttons = [];
  const updates = [];
  const runtime = require('react/jsx-runtime');
  const mocks = {
    react: { ...require('react'), useState: () => [sport, value => updates.push(value)] },
    'react/jsx-runtime': Object.fromEntries(['jsx', 'jsxs'].map(method => [method, (tag, props, key) => { if (tag === 'button') buttons.push(props); return runtime[method](tag, props, key); }])),
    'next/link': { __esModule: true, default: props => createElement('a', props) },
    'next/image': { __esModule: true, default: ({ fill, preload, ...props }) => { void fill; void preload; return createElement('img', props); } },
    '@/lib/homepage-app': { ...data, appStoreLinks: stores },
    '@/lib/utils': { cn: (...classes) => classes.join(' ') },
  };
  mocks['./WebAppCTA'] = load('src/components/WebAppCTA.tsx', mocks);
  const Component = load(file, mocks)[name];
  return { html: renderToStaticMarkup(createElement(Component)), buttons, updates };
}

test('All booking destinations target existing web-app routes with supported sport filters', () => {
  assert.equal(data.WEB_APP_HREF, '/app');
  assert.equal(data.sportBookingHref(), '/app/sports');
  assert.equal(data.sportBookingHref('unknown'), '/app/sports');
  assert.equal(data.sportBookingHref('box-cricket'), '/app/sports?sport=cricket&sport=football');
  assert.equal(data.sportBookingHref('cricket-nets'), '/app/sports?sport=cricket');
  assert.ok(existsSync(resolve(root, 'src/app/app/(tabs)/sports/page.tsx')));
  for (const sport of data.homepageSports) {
    assert.ok(existsSync(resolve(root, 'public', sport.image.slice(1))));
    assert.equal(new URL(data.sportBookingHref(sport.id), 'https://local.test').searchParams.get('sport'), sport.id);
  }
});

test('Hero is first, has one h1, and uses the exact requested CTA', () => {
  const { html } = render('src/components/HeroSection.tsx', 'HeroSection');
  assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
  assert.match(html, /href="\/app"[^>]*>Book the slot now/);
  assert.match(html, /No download needed/);
  assert.doesNotMatch(html, /Multi Sports League|Opening in|<form/);
});

test('Both sport pickers update selection and link to the matching catalogue', () => {
  for (const [file, name] of [['HeroSection', 'HeroSection'], ['AppDownloadSection', 'AppDownloadSection']]) {
    for (const sport of data.homepageSports) {
      const { html, buttons, updates } = render(`src/components/${file}.tsx`, name, sport);
      assert.equal(buttons.length, 4);
      assert.equal(buttons.filter(button => button['aria-pressed']).length, 1);
      assert.match(html, new RegExp(`href="/app/sports\\?sport=${sport.id}"`));
      buttons.forEach(button => button.onClick());
      assert.deepEqual(updates.map(value => value.id), data.homepageSports.map(value => value.id));
    }
  }
});

test('Download section honestly handles missing, partial and published store listings', () => {
  const missing = render('src/components/AppDownloadSection.tsx', 'AppDownloadSection').html;
  assert.equal([...missing.matchAll(/Coming soon/g)].length, 2);
  assert.match(missing, /href="\/app"/);
  assert.doesNotMatch(missing, /href="#"|<iframe|<form/);
  const partial = render('src/components/AppDownloadSection.tsx', 'AppDownloadSection', undefined, { android: 'https://play.google.com/store/apps/details?id=real', ios: null }).html;
  assert.equal([...partial.matchAll(/Coming soon/g)].length, 1);
  assert.match(partial, /rel="noopener noreferrer"/);
  const ready = render('src/components/AppDownloadSection.tsx', 'AppDownloadSection', undefined, { android: 'https://play.google.com/store/apps/details?id=real', ios: 'https://apps.apple.com/app/id123' }).html;
  assert.doesNotMatch(ready, /Coming soon/);
});

test('Store configuration rejects unsafe and unrelated destinations', () => {
  const keys = ['NEXT_PUBLIC_GAMEON_PLAY_STORE_URL', 'NEXT_PUBLIC_GAMEON_APP_STORE_URL'];
  const saved = keys.map(key => process.env[key]);
  try {
    for (const bad of ['javascript:alert(1)', 'http://play.google.com/app', 'https://evil.test/app', 'https://user:pass@play.google.com/app']) {
      process.env[keys[0]] = bad;
      assert.equal(load('src/lib/homepage-app.ts').appStoreLinks.android, null);
    }
    process.env[keys[0]] = 'https://play.google.com/store/apps/details?id=com.gameonmultisports.app';
    assert.ok(load('src/lib/homepage-app.ts').appStoreLinks.android);
  } finally { keys.forEach((key, i) => { if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i]; }); }
});

test('Homepage removes booking form and league promotion without deleting their independent flows', () => {
  const source = read('src/components/HomePage.tsx');
  assert.doesNotMatch(source, /BookingSection|HomeHighlights|#booking/);
  assert.match(source, /<AppDownloadSection \/>/);
  assert.ok(existsSync(resolve(root, 'src/app/gameon-multisports-league/page.tsx')));
  assert.match(read('src/components/SportsSection.tsx'), /href=\{sportBookingHref\(sport.id\)\}/);
  assert.match(read('src/components/ZonesSection.tsx'), /<WebAppCTA/);
});