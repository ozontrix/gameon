/** Run: node --test scripts/test-home-highlights.mjs. No external services or writes. */
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
const read = path => readFileSync(resolve(root, path), 'utf8');
function load(path, mocks = {}) {
  const compiled = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputText)(id => mocks[id] ?? require(id), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const constants = load('src/lib/open-play/constants.ts', { '@/lib/utils/booking-dates': { PUBLIC_PAID_BOOKING_START: '2026-10-19' } });
const { homeHighlights } = load('src/lib/home-highlights.ts', { '@/lib/open-play/constants': constants });

function renderCarousel({ selected = 0, paused = false, reduced = false, hovered = false, inView = true } = {}) {
  const states = [selected, paused, hovered, inView];
  let stateIndex = 0;
  const updates = [];
  const scrolls = [];
  const buttons = [];
  const links = [];
  const groups = [];
  let section;
  let autoplay;
  const runtime = require('react/jsx-runtime');
  const capture = (tag, props) => {
    if (tag === 'button') buttons.push(props);
    if (tag === 'article') groups.push(props);
    if (tag === 'section') section = props;
  };
  const mocks = {
    react: {
      ...require('react'),
      useState: () => { const index = stateIndex++; return [states[index], value => updates.push({ index, value })]; },
      useRef: () => ({ current: null }), useEffect: () => {}, useCallback: callback => callback,
      useSyncExternalStore: () => reduced,
    },
    'react/jsx-runtime': {
      ...runtime,
      jsx: (tag, props, key) => { capture(tag, props); return runtime.jsx(tag, props, key); },
      jsxs: (tag, props, key) => { capture(tag, props); return runtime.jsxs(tag, props, key); },
    },
    'embla-carousel-react': { __esModule: true, default: () => [() => {}, {
      scrollPrev: jump => scrolls.push(['prev', jump]), scrollNext: jump => scrolls.push(['next', jump]), scrollTo: (index, jump) => scrolls.push([index, jump]),
    }] },
    'next/link': { __esModule: true, default: props => { links.push(props); return createElement('a', props); } },
    'next/image': { __esModule: true, default: ({ fill, preload, ...props }) => { void fill; void preload; return createElement('img', props); } },
    '@/lib/home-highlights': { homeHighlights },
    '@/lib/useEmblaAutoplay': { useEmblaAutoplay: (api, delay, enabled) => { autoplay = { delay, enabled }; } },
  };
  const { HomeHighlights } = load('src/components/HomeHighlights.tsx', mocks);
  const html = renderToStaticMarkup(createElement(HomeHighlights));
  return { html, buttons, links, groups, section, updates, scrolls, autoplay };
}

test('Highlights use real local images, unique IDs, and the correct public destinations', () => {
  assert.equal(new Set(homeHighlights.map(slide => slide.id)).size, homeHighlights.length);
  assert.deepEqual(homeHighlights.map(slide => slide.href), ['/open-play-registrations', '/gameon-multisports-league']);
  assert.equal(homeHighlights[0].detail, constants.OPEN_PLAY_DATE_LABEL);
  for (const slide of homeHighlights) {
    assert.ok(existsSync(resolve(root, 'public', slide.image.slice(1))));
    assert.ok(slide.imageAlt && slide.title && slide.cta);
  }
});

test('Existing hero stays below the carousel, with unique home and discovery anchors', () => {
  const homepage = read('src/components/HomePage.tsx');
  assert.ok(homepage.indexOf('<HomeHighlights />') < homepage.indexOf('<HeroSection />'));
  assert.match(read('src/components/HeroSection.tsx'), /id="discover-gameon"/);
  const { html } = renderCarousel();
  assert.match(html, /id="hero"/);
  assert.match(html, /href="#discover-gameon"/);
});

test('Only the active slide is exposed to screen readers and keyboard focus', () => {
  const { groups, links, html } = renderCarousel({ selected: 1 });
  assert.equal(groups[0]['aria-hidden'], true); assert.equal(groups[0].inert, true);
  assert.equal(groups[1]['aria-hidden'], false); assert.equal(groups[1].inert, false);
  assert.deepEqual(links.map(link => link.tabIndex), [-1, 0]);
  assert.match(html, /aria-roledescription="carousel"/);
  assert.match(html, /aria-current="true"/);
});

test('Arrows and dots navigate and stop autoplay; keyboard navigation works without motion', () => {
  const { buttons, scrolls, updates, section } = renderCarousel({ reduced: true });
  buttons.find(button => button['aria-label'] === 'Next highlight').onClick();
  buttons.find(button => button['aria-label'] === 'Previous highlight').onClick();
  buttons.find(button => button['aria-label'] === 'Show Multi Sports League').onClick();
  let prevented = false;
  section.onKeyDown({ key: 'ArrowRight', preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(scrolls, [['next', true], ['prev', true], [1, true], ['next', true]]);
  assert.ok(updates.every(update => update.index === 1 && update.value === true));
});

test('Autoplay runs only when visible, not paused, not hovered, and motion is allowed', () => {
  assert.deepEqual(renderCarousel().autoplay, { delay: 6500, enabled: true });
  for (const options of [{ paused: true }, { hovered: true }, { inView: false }, { reduced: true }]) assert.equal(renderCarousel(options).autoplay.enabled, false);
  const { buttons, updates } = renderCarousel({ paused: true });
  buttons.find(button => button['aria-label'] === 'Play slideshow').onClick();
  assert.equal(updates[0].value(true), false);
  assert.ok(!renderCarousel({ reduced: true }).buttons.some(button => button['data-rotation-control'] !== undefined));
});

test('Shared autoplay pauses for dragging and hidden tabs, wraps, and cleans up', () => {
  let effect;
  const { useEmblaAutoplay } = load('src/lib/useEmblaAutoplay.ts', { react: { useEffect: callback => { effect = callback; } } });
  const originalDocument = globalThis.document;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const timers = new Map(); const events = new Map(); const domEvents = new Map(); const scrolls = [];
  let sequence = 0; let canScroll = true;
  globalThis.document = { hidden: false, addEventListener: (name, handler) => domEvents.set(name, handler), removeEventListener: name => domEvents.delete(name) };
  globalThis.setInterval = callback => { const id = ++sequence; timers.set(id, callback); return id; };
  globalThis.clearInterval = id => timers.delete(id);
  const api = { canScrollNext: () => canScroll, scrollNext: () => scrolls.push('next'), scrollTo: index => scrolls.push(index), on: (name, handler) => events.set(name, handler), off: name => events.delete(name) };
  try {
    useEmblaAutoplay(api, 6500, false); assert.equal(effect(), undefined); assert.equal(timers.size, 0);
    useEmblaAutoplay(api, 6500, true); const cleanup = effect();
    assert.equal(timers.size, 1); [...timers.values()][0](); assert.deepEqual(scrolls, ['next']);
    canScroll = false; [...timers.values()][0](); assert.deepEqual(scrolls, ['next', 0]);
    events.get('pointerDown')(); assert.equal(timers.size, 0);
    events.get('pointerUp')(); assert.equal(timers.size, 1);
    document.hidden = true; domEvents.get('visibilitychange')(); assert.equal(timers.size, 0);
    document.hidden = false; domEvents.get('visibilitychange')(); assert.equal(timers.size, 1);
    cleanup(); assert.equal(timers.size, 0); assert.equal(events.size, 0); assert.equal(domEvents.size, 0);
  } finally {
    globalThis.document = originalDocument; globalThis.setInterval = originalSetInterval; globalThis.clearInterval = originalClearInterval;
  }
});