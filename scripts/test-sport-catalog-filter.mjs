/** node --test scripts/test-sport-catalog-filter.mjs — route filter only, no DB or network. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const cards = [
  { key: 'box', sports: ['football', 'cricket'], type: 'Outdoor • Turf', badges: ['Outdoor'], priceFrom: 1500 },
  { key: 'cricket-nets', sports: ['cricket'], type: 'Indoor • Turf', badges: ['Indoor'], priceFrom: 450 },
  { key: 'badminton', sports: ['badminton'], type: 'Indoor • Wooden • AC', badges: ['Indoor', 'AC'], priceFrom: 600 },
];

function load(path) {
  const filename = resolve(root, path);
  const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const localRequire = id => {
    if (id === 'next/server') {
      return {
        NextResponse: {
          json: (body, init) => ({ status: init?.status ?? 200, body, json: async () => body }),
        },
      };
    }
    if (id === '@/lib/services/sports-catalog.service') {
      return { SportsCatalogService: { listCards: async () => cards } };
    }
    if (id === '@/lib/services/slot.service') {
      return {
        SlotService: {
          getSlots: async () => [{ start_time: '18:00:00', end_time: '19:00:00', available: true }],
        },
      };
    }
    if (id.startsWith('@/')) {
      const target = resolve(root, 'src', id.slice(2));
      return load(existsSync(`${target}.ts`) ? `${target}.ts` : target);
    }
    return require(id);
  };
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(localRequire, compiled, compiled.exports);
  return compiled.exports;
}

const { GET } = load('src/app/api/v1/public/sports/catalog/route.ts');

async function keys(query) {
  const response = await GET(new Request(`https://gameon.test/api/v1/public/sports/catalog${query}`));
  assert.equal(response.status, 200);
  return response.body.data.map(card => card.key);
}

test('A shared turf is returned under either sport', async () => {
  assert.deepEqual(await keys('?sport=football'), ['box']);
  assert.deepEqual(await keys('?sport=cricket'), ['box', 'cricket-nets']);
});

test('Selecting both sports returns the shared turf exactly once', async () => {
  assert.deepEqual(await keys('?sport=football&sport=cricket'), ['box', 'cricket-nets']);
});

test('No sport filter still lists every card once', async () => {
  assert.deepEqual(await keys(''), ['box', 'cricket-nets', 'badminton']);
});

test('An unrelated sport does not match the shared turf', async () => {
  assert.deepEqual(await keys('?sport=badminton'), ['badminton']);
});
