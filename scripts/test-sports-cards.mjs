/** Run: node --test scripts/test-sports-cards.mjs. No external services or writes. */
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
function load(path, mocks = {}) {
  const compiled = ts.transpileModule(readFileSync(resolve(root, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled.outputText)(id => mocks[id] ?? require(id), compiledModule, compiledModule.exports);
  return compiledModule.exports;
}

const { VenueCard } = load('src/components/mobile/sports/venue-card.tsx', {
  'next/link': { __esModule: true, default: props => createElement('a', props) },
  '@/lib/mobile/constants/config': load('src/lib/mobile/constants/config.ts'),
  '@/lib/mobile/constants/slots': load('src/lib/mobile/constants/slots.ts'),
  '@/lib/mobile/theme': load('src/lib/mobile/theme.ts'),
  '../ui': {
    Badge: ({ label }) => createElement('span', { 'data-badge': true }, label),
    SportPill: ({ sport }) => createElement('span', null, sport),
    RemoteImage: ({ uri, accessibilityLabel }) => createElement('img', { src: uri, alt: accessibilityLabel }),
    Ion: () => null,
  },
});

function venue(overrides = {}) {
  return {
    key: 'badminton-synthetic', sport: 'badminton', title: 'Badminton Synthetic',
    image: '/sports/badminton.png', location: 'GameOn Arena, 123 Sports Avenue',
    type: 'Indoor • Synthetic • Non-AC', badges: ['Indoor', 'Non-AC'],
    slotOptions: [{ durationMinutes: 60, price: 400 }], priceFrom: 400, courtsAvailable: 3,
    ...overrides,
  };
}

function render(card) {
  return renderToStaticMarkup(createElement(VenueCard, { venue: card }));
}

test('Non-AC cards omit the negative climate label and address, keeping other details', () => {
  const card = venue();
  const before = structuredClone(card);
  const html = render(card);
  assert.doesNotMatch(html, /non[\s-]*ac/i);
  assert.doesNotMatch(html, /GameOn Arena|123 Sports Avenue/);
  assert.match(html, /Indoor • Synthetic/);
  assert.match(html, /data-badge="true">Indoor/);
  assert.match(html, /Badminton Synthetic/);
  assert.match(html, /3 courts available/);
  assert.match(html, /₹400/);
  assert.match(html, /1 hr/);
  assert.match(html, /href="\/app\/sport\/badminton-synthetic"/);
  assert.deepEqual(card, before, 'Presentation must not mutate shared catalog data');
});

test('AC cards retain AC in both the badge and summary, without the address', () => {
  const html = render(venue({ type: 'Indoor • Wooden • AC', badges: ['Indoor', 'AC'] }));
  assert.match(html, /data-badge="true">AC/);
  assert.match(html, /Indoor • Wooden • AC/);
  assert.doesNotMatch(html, /GameOn Arena|123 Sports Avenue/);
});

test('Non AC spelling variants are omitted without leaving dangling summary separators', () => {
  for (const label of ['Non AC', 'non-ac', 'NON AC', 'NonAC']) {
    const html = render(venue({ type: `${label} · Outdoor · Turf · ${label}`, badges: ['Outdoor', label] }));
    assert.doesNotMatch(html, /non[\s-]*ac/i);
    assert.match(html, /Outdoor • Turf/);
    assert.doesNotMatch(html, /•\s*<|>\s*•|•\s*•/);
  }
});

test('A summary containing only Non-AC does not leave an empty details row', () => {
  const html = render(venue({ type: 'Non-AC', badges: ['Non-AC'], courtsAvailable: 1 }));
  assert.doesNotMatch(html, /non[\s-]*ac/i);
  assert.doesNotMatch(html, /<span[^>]*>\s*<\/span>/);
  assert.match(html, /1 court available/);
});

test('A dual-use turf shows every category it is listed under', () => {
  const html = render(
    venue({
      key: 'box-football-cricket',
      sport: 'football',
      sports: ['football', 'cricket'],
      title: 'Box Football / Cricket – Outdoor Turf',
      type: 'Outdoor • Turf',
      badges: ['Outdoor'],
      courtsAvailable: 1,
      href: '/app/sport/box-football-cricket',
    }),
  );
  assert.match(html, />football</);
  assert.match(html, />cricket</);
  assert.match(html, /Box Football \/ Cricket/);
  assert.match(html, /href="\/app\/sport\/box-football-cricket"/);
});

test('A card without the newer categories field falls back to its primary sport', () => {
  const html = render(venue());
  assert.match(html, />badminton</);
  assert.doesNotMatch(html, />cricket</);
});