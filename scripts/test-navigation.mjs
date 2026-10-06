/** Run: node --test scripts/test-navigation.mjs. No browser, database or remote writes. */
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
const leaguePath = '/gameon-multisports-league';

function navigation(pathname = '/', moreOpen = false) {
  const links = [];
  const buttons = [];
  const updates = [];
  const pushed = [];
  let stateIndex = 0;
  const motion = new Proxy({}, { get: (_, tag) => ({ children, initial, animate, exit, transition, layoutId, ...props }) => {
    void initial; void animate; void exit; void transition; void layoutId;
    return createElement(tag, props, children);
  } });
  const mocks = {
    react: {
      ...require('react'),
      useState: initial => {
        const index = stateIndex++;
        return [index === 2 ? moreOpen : initial, value => updates.push({ index, value })];
      },
      useEffect: () => {},
      useCallback: callback => callback,
    },
    'next/navigation': { usePathname: () => pathname, useRouter: () => ({ push: href => pushed.push(href) }) },
    'next/link': { __esModule: true, default: props => {
      links.push(props);
      return createElement('a', props, props.children);
    } },
    'next/image': { __esModule: true, default: props => createElement('img', props) },
    'framer-motion': { motion, AnimatePresence: ({ children }) => children, useScroll: () => ({ scrollYProgress: 0 }), useSpring: value => value },
    '@/lib/utils': { cn: (...classes) => classes.filter(Boolean).join(' ') },
    'react/jsx-runtime': {
      ...require('react/jsx-runtime'),
      jsx: (tag, props, key) => {
        if (tag === 'button') buttons.push(props);
        return require('react/jsx-runtime').jsx(tag, props, key);
      },
      jsxs: (tag, props, key) => {
        if (tag === 'button') buttons.push(props);
        return require('react/jsx-runtime').jsxs(tag, props, key);
      },
    },
  };
  const compiled = ts.transpileModule(readFileSync(resolve(root, 'src/components/Navigation.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputText)(id => mocks[id] ?? require(id), compiledModule, compiledModule.exports);
  const html = renderToStaticMarkup(createElement(compiledModule.exports.Navigation));
  const desktop = html.match(/<nav[^>]*aria-label="Primary desktop"[\s\S]*?<\/nav>/)?.[0];
  const mobile = html.match(/<nav[^>]*aria-label="Primary"[\s\S]*?<\/nav>/)?.[0];
  return { html, desktop, mobile, links, buttons, updates, pushed };
}

test('Desktop has exactly the essential destinations and a permanently highlighted league link', () => {
  const { desktop, links } = navigation();
  assert.ok(desktop);
  assert.deepEqual([...desktop.matchAll(/href="([^"]+)"/g)].map(match => match[1]), ['/', '/', '/#sports', '/#zones', '/sponsorship', '/blogs', leaguePath]);
  for (const label of ['Home', 'Sports', 'Zones', 'Sponsorships', 'Blogs', 'Game On Multi Sports League']) assert.ok(desktop.includes(`>${label}<`));
  assert.doesNotMatch(desktop, /For You|Community|>Book<|>Location</);
  assert.ok(links.find(link => link.href === leaguePath && !link['aria-label']).className.includes('bg-go-brand text-go-black'));
});

test('Mobile replaces Book with a highlighted GML route while retaining More', () => {
  const { mobile, links, buttons, updates } = navigation();
  assert.deepEqual([...mobile.matchAll(/href="([^"]+)"/g)].map(match => match[1]), ['/', '/#sports', '/#zones', leaguePath]);
  for (const label of ['Home', 'Sports', 'Zones', 'GML', 'More']) assert.ok(mobile.includes(`>${label}<`));
  assert.doesNotMatch(mobile, />Book<|For You|Community/);
  const league = links.find(link => link.href === leaguePath && link['aria-label']);
  assert.equal(league['aria-label'], 'Game On Multi Sports League');
  assert.ok(league.className.includes('bg-go-brand text-go-black'));
  league.onClick();
  assert.deepEqual(updates.pop(), { index: 2, value: false });
  const more = buttons.find(button => button['aria-label'] === 'More');
  assert.equal(more['aria-expanded'], false);
  more.onClick();
  assert.equal(updates.pop().value(false), true);
});

test('More contains Sponsorships, Blogs, Book and Location and closes on route selection', () => {
  const { html, links, buttons, updates, pushed } = navigation('/blogs', true);
  const sheet = html.slice(html.indexOf('role="dialog"'));
  for (const label of ['Sponsorships', 'Blogs', 'Book', 'Location']) assert.ok(sheet.includes(`>${label}<`));
  assert.doesNotMatch(sheet, /For You|Community/);
  links.find(link => link.href === '/sponsorship' && link.onClick).onClick();
  assert.deepEqual(updates.pop(), { index: 2, value: false });
  buttons.find(button => renderToStaticMarkup(button.children).includes('>Book<')).onClick();
  assert.deepEqual(pushed, ['/#booking']);
});

test('Blogs and nested articles use immediate route-based desktop and More active states', () => {
  for (const path of ['/blogs', '/blogs/court-story']) {
    const { links, buttons } = navigation(path);
    assert.equal(links.find(link => link.href === '/blogs')['aria-current'], 'page');
    assert.equal(links.find(link => link.href === '/')['aria-current'], undefined);
    assert.ok(buttons.find(button => button['aria-label'] === 'More').className.includes('text-go-brand'));
  }
});

test('League and nested league routes highlight the correct desktop and mobile destinations', () => {
  for (const path of [leaguePath, `${leaguePath}/sports/badminton`]) {
    const { links } = navigation(path);
    const leagueLinks = links.filter(link => link.href === leaguePath);
    assert.equal(leagueLinks.length, 2);
    assert.ok(leagueLinks.every(link => link['aria-current'] === 'page'));
  }
});

test('All blog pages inherit shared navigation and reserve space for fixed desktop/mobile bars', () => {
  const source = readFileSync(resolve(root, 'src/app/blogs/layout.tsx'), 'utf8');
  assert.match(source, /import \{ Navigation \} from '@\/components\/Navigation'/);
  assert.match(source, /<Navigation \/>/);
  assert.doesNotMatch(source, /Blog navigation/);
  assert.match(source, /lg:pt-36/);
  assert.match(source, /pb-\[calc\(6rem\+env\(safe-area-inset-bottom\)\)\]/);
});

test('Home header keeps only the league CTA without an early-access or booking CTA', () => {
  const source = readFileSync(resolve(root, 'src/components/HomePage.tsx'), 'utf8');
  assert.match(source, /<Navigation \/>/);
  assert.match(source, /<HeroSection \/>/);
  assert.doesNotMatch(source, /onNotifyClick|NotifyModal/);
  const { desktop, html } = navigation('/', true);
  assert.doesNotMatch(html, /Get Early Access|Notify|Book Your Slots? Now/);
  assert.equal([...desktop.matchAll(/bg-go-brand text-go-black/g)].length, 1);
});

test('Hero league CTA contains its smaller booking text inside the same link', () => {
  const source = readFileSync(resolve(root, 'src/components/HeroSection.tsx'), 'utf8');
  const ast = ts.createSourceFile('HeroSection.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const leagueLinks = [];
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'Link') {
      const href = node.openingElement.attributes.properties.find(attribute =>
        ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === 'href');
      if (href?.initializer && ts.isStringLiteral(href.initializer) && href.initializer.text === leaguePath) leagueLinks.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.equal(leagueLinks.length, 1);
  const cta = leagueLinks[0].getText(ast);
  assert.match(cta, /<span>Game On Multi Sports League<\/span>/);
  assert.match(cta, /flex flex-col items-center/);
  assert.match(cta, /text-\[10px\][^>]*>Book Your Slot Now<\/span>/);
  assert.match(cta, /focus-visible:outline/);
  assert.doesNotMatch(source, /Get Early Access|onNotifyClick/);
});