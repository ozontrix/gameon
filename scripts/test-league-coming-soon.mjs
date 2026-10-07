/** Run: node --test scripts/test-league-coming-soon.mjs. No remote writes. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function load(relative, mocks = {}, transform = source => source) {
  const source = transform(readFileSync(resolve(root, relative), 'utf8'));
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(id => mocks[id] ?? require(id), compiled, compiled.exports);
  return compiled.exports;
}

const { LeagueBookingsComingSoon } = load('src/components/league/bookings-coming-soon.tsx', {
  'next/link': { __esModule: true, default: ({ children, ...props }) => createElement('a', props, children) },
});

function page(enabled = true) {
  const { default: Page } = load('src/app/gameon-multisports-league/page.tsx', {
    '@/lib/seo': { pageMetadata: value => value },
    '@/components/seo/breadcrumbs': { Breadcrumbs: () => createElement('nav', null, 'Original breadcrumbs') },
    '@/components/league/landing': { LeagueLanding: () => createElement('div', null, 'Original league content') },
    '@/components/league/bookings-coming-soon': { LeagueBookingsComingSoon },
  }, source => enabled ? source : source.replace('SHOW_BOOKINGS_COMING_SOON = true', 'SHOW_BOOKINGS_COMING_SOON = false'));
  return renderToStaticMarkup(createElement(Page));
}

test('League landing immediately shows only the coming-soon view', () => {
  const html = page();
  assert.match(html, /Bookings will be <span[^>]*>open soon<\/span>/);
  assert.match(html, /aria-labelledby="league-coming-soon-title"/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.doesNotMatch(html, /Original breadcrumbs|Original league content/);
});

test('Temporary view covers the viewport in brand colors and provides an accessible home link', () => {
  const html = page();
  assert.match(html, /fixed inset-0 z-50/);
  assert.match(html, /min-h-dvh overflow-y-auto bg-go-black/);
  assert.match(html, /text-go-brand/);
  assert.match(html, /<a href="\/"[^>]*>.*Go home<\/a>/);
  assert.match(html, /focus-visible:outline-go-brand/);
  assert.doesNotMatch(html, /<button|role="dialog"|href="\/gameon-multisports-league/);
});

test('Switching off one flag restores the existing breadcrumbs and league page', () => {
  const html = page(false);
  assert.match(html, /Original breadcrumbs/);
  assert.match(html, /Original league content/);
  assert.doesNotMatch(html, /Bookings will be|league-coming-soon-title|Go home/);
});