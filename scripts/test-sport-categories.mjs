/** node --test scripts/test-sport-categories.mjs — pure helpers, no services or DB. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync(resolve(root, 'src/lib/utils/sport-key.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
});
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputText)(require, module, module.exports);
const {
  APP_SPORT_KEYS,
  cardMatchesSports,
  isAppSportKey,
  mergeSportKeys,
  sportKeyFor,
  sportKeysFor,
  sportKeysFromColumn,
} = module.exports;

test('A combined turf name keeps football primary and names both categories', () => {
  assert.equal(sportKeyFor('Box Football / Cricket – Outdoor Turf'), 'football');
  assert.deepEqual(sportKeysFor('Box Football / Cricket – Outdoor Turf'), ['football', 'cricket']);
});

test('Single-sport names still map to exactly one category', () => {
  assert.deepEqual(sportKeysFor('Cricket Practice Nets – Indoor Turf'), ['cricket']);
  assert.deepEqual(sportKeysFor('Badminton – Indoor Wooden (AC Court)'), ['badminton']);
  assert.deepEqual(sportKeysFor('Pickleball – Outdoor'), ['pickleball']);
  assert.deepEqual(sportKeysFor('Table Tennis'), []);
});

test('A stored category column is canonical, deduplicated and rejects unknown keys', () => {
  assert.deepEqual(
    sportKeysFromColumn(['football', 'cricket', 'football', 'tennis'], 'anything'),
    ['cricket', 'football'],
  );
  assert.deepEqual(sportKeysFromColumn([], 'Box Football / Cricket'), ['football', 'cricket']);
  assert.deepEqual(sportKeysFromColumn(null, 'Badminton'), ['badminton']);
});

test('Admin picks merge with the primary sport and can never leave a card uncategorised', () => {
  assert.deepEqual(mergeSportKeys('Box Football / Cricket', []), ['football']);
  const merged = mergeSportKeys('Box Football / Cricket', ['cricket']);
  assert.ok(merged.includes('football'));
  assert.ok(merged.includes('cricket'));
  assert.equal(new Set(merged).size, merged.length);

  assert.deepEqual(mergeSportKeys('Badminton', ['cricket']), ['badminton', 'cricket']);
  assert.deepEqual(mergeSportKeys('Table Tennis', []), []);
  assert.deepEqual(mergeSportKeys('Badminton', ['not-a-sport']), ['badminton']);
});

test('One shared card matches either filter and is not duplicated by both', () => {
  const sharedTurf = mergeSportKeys('Box Football / Cricket', ['football', 'cricket']);
  assert.equal(cardMatchesSports(sharedTurf, ['cricket']), true);
  assert.equal(cardMatchesSports(sharedTurf, ['football']), true);
  assert.equal(cardMatchesSports(sharedTurf, ['football', 'cricket']), true);
  assert.equal(cardMatchesSports(sharedTurf, ['badminton']), false);
  assert.equal(cardMatchesSports(sharedTurf, []), false);
});

test('Category constants contain exactly the four app chips', () => {
  assert.deepEqual([...APP_SPORT_KEYS], ['badminton', 'pickleball', 'cricket', 'football']);
  for (const key of APP_SPORT_KEYS) assert.equal(isAppSportKey(key), true);
  assert.equal(isAppSportKey('tennis'), false);
  assert.equal(isAppSportKey(null), false);
});
