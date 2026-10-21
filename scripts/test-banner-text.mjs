/** node --test scripts/test-banner-text.mjs — mocked UI/database; no external writes. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function loader(base, mocks = {}) {
  function load(file) {
    const filename = resolve(base, file);
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const mod = { exports: {} };
    const localRequire = name => {
      if (name in mocks) return mocks[name];
      if (name.startsWith('.') || name.startsWith('@/')) {
        const target = name.startsWith('@/') ? resolve(base, 'src', name.slice(2)) : resolve(dirname(filename), name);
        return load(existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`);
      }
      return require(name);
    };
    new Function('require', 'module', 'exports', compiled)(localRequire, mod, mod.exports);
    return mod.exports;
  }
  return load;
}
const hooks = { useEffect() {}, useRef: value => ({ current: value }), useState: value => [value, () => {}] };
function expand(node) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(expand);
  if (typeof node.type === 'function') return expand(node.type(node.props));
  return { type: node.type, props: { ...node.props, children: expand(node.props?.children) } };
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
const slide = { id: 'slide', showText: true, title: 'Saved headline', titleAccent: 'Saved accent', subtitle: 'Saved subtitle', imageUrl: 'https://example.test/banner.jpg', link: '/sports' };
const variants = [
  { name: 'disabled with saved copy', patch: { showText: false }, visible: false },
  { name: 'enabled with no copy', patch: { title: '', titleAccent: null, subtitle: null }, visible: false },
  { name: 'enabled with whitespace only', patch: { title: '  ', titleAccent: '\n', subtitle: ' ' }, visible: false },
  { name: 'missing flag fails closed', patch: { showText: undefined }, visible: false },
  { name: 'enabled with all copy', patch: {}, visible: true },
  { name: 'enabled with subtitle only', patch: { title: '', titleAccent: null }, visible: true },
];
for (const variant of variants) {
  test(`web: ${variant.name} renders copy and scrim together`, () => {
    const item = { ...slide, ...variant.patch };
    const content = { banners: { hero: [item] } };
    const mocks = {
      react: hooks,
      'next/link': 'Link',
      '@/lib/mobile/constants/motion': { HERO_AUTOPLAY_MS: 5000 },
      '@/lib/mobile/theme': { Brand: { text: '#fff', accent: '#f97316', textSecondary: '#ddd' }, Layout: {}, Radius: {}, Spacing: {}, Typography: {} },
      '../home-content-provider': { useHomeContent: () => ({ content }) },
      '../ui': { RemoteImage: 'RemoteImage' },
    };
    const tree = expand(loader(root, mocks)('src/components/mobile/home/hero-banner.tsx').HeroBanner());
    const all = nodes(tree);
    const overlay = all.some(n => n.props?.style?.background?.includes('linear-gradient'));
    assert.equal(overlay, variant.visible);
    const copy = all.filter(n => n.type === 'span' && n.props?.style?.color);
    assert.equal(copy.length > 0, variant.visible);
    assert.equal(all.filter(n => n.type === 'RemoteImage').length, 1);
    assert.ok(all.some(n => n.type === 'Link' && n.props.href === '/sports'));
    if (!variant.visible) assert.ok(all.some(n => n.props?.accessibilityLabel === 'Home banner' || n.props?.['aria-label'] === 'Home banner'));
  });
}

function actionHarness() {
  const writes = [], audits = [];
  const db = { from() {
    const q = { select() { return q; }, eq() { return q; },
      update(value) { writes.push(value); return q; }, insert(value) { writes.push(value); return q; },
      async maybeSingle() { return { data: { image_url: 'https://example.test/saved.jpg' } }; },
      async single() { return { data: { id: 'banner' }, error: null }; } };
    return q;
  } };
  const load = loader(root, {
    'next/cache': { revalidatePath() {} }, 'next/navigation': { redirect() {} },
    '@/lib/db/supabase': { supabaseAdmin: db }, '@/lib/services/notification.service': {},
    '@/lib/utils/date-helpers': { DEFAULT_TIMEZONE: 'Asia/Kolkata' },
    '../session': { authorize: async () => ({ id: 'admin' }) },
    '../audit': { recordAudit: async (...args) => audits.push(args) },
    '../storage': { readImageField: async () => null, removeImage: async () => {}, uploadImage: async () => '' },
  });
  const save = async (fields = {}) => {
    const form = new FormData();
    for (const [key, value] of Object.entries({ id: '11111111-1111-4111-8111-111111111111', placement: 'HERO', is_active: 'on', ...fields })) form.set(key, value);
    return load('src/lib/admin/actions/content.ts').saveBanner(null, form);
  };
  return { save, writes, audits };
}
test('admin can save image-only hero with no title', async () => {
  const h = actionHarness();
  assert.equal((await h.save()).ok, true);
  assert.equal(h.writes[0].title, '');
  assert.equal(h.writes[0].show_text, false);
  assert.equal(h.writes[0].image_url, 'https://example.test/saved.jpg');
});
test('admin toggling text preserves copy and records the setting', async () => {
  const h = actionHarness();
  for (const show_text of ['on', '']) assert.equal((await h.save({ title: 'Saved copy', show_text })).ok, true);
  assert.deepEqual(h.writes.map(w => [w.title, w.show_text]), [['Saved copy', true], ['Saved copy', false]]);
  assert.equal(h.audits.length, 2);
});
test('admin enabled but empty hero remains valid without placeholder copy', async () => {
  const h = actionHarness();
  assert.equal((await h.save({ show_text: 'on', title: '  ' })).ok, true);
  assert.equal(h.writes[0].title, '');
});
test('promo still requires its headline', async () => {
  const h = actionHarness();
  const result = await h.save({ placement: 'PROMO' });
  assert.equal(result.ok, false);
  assert.ok(result.fieldErrors.title);
  assert.equal(h.writes.length, 0);
});

test('public home API suppresses hidden hero copy but preserves promo cards', async () => {
  const banners = [
    { id: 'hidden', placement: 'HERO', title: 'Saved', title_accent: 'Accent', subtitle: 'Details', show_text: false },
    { id: 'visible', placement: 'HERO', title: 'Visible', show_text: true },
    { id: 'promo', placement: 'PROMO', title: 'Offer', show_text: false },
  ];
  const db = { from(table) {
    const q = { select() { return q; }, eq() { return q; }, order() { return q; }, gte() { return q; }, lte() { return q; },
      then(resolve) { return Promise.resolve({ data: table === 'home_banners' ? banners : [], error: null }).then(resolve); } };
    return q;
  } };
  const { HomeService } = loader(root, {
    '../db/supabase': { supabaseAdmin: db }, '../admin/format': { todayIn: () => '2026-10-20', addDays: () => '2026-09-20' },
  })('src/lib/services/home.service.ts');
  const result = await HomeService.getHome();
  assert.equal(result.banners.hero[0].showText, false);
  assert.equal(result.banners.hero[0].title, '');
  assert.equal(result.banners.hero[0].titleAccent, null);
  assert.equal(result.banners.hero[0].subtitle, null);
  assert.equal(result.banners.hero[1].title, 'Visible');
  assert.equal(result.banners.promo[0].title, 'Offer');
  assert.equal(result.banners.promo[0].showText, true);
});

test('admin preview and checkbox update without erasing saved fields', () => {
  const state = []; let cursor = 0;
  const formHooks = { useEffect() {}, useState(initial) {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [state[index], value => { state[index] = value; }];
  } };
  const { BannerForm } = loader(root, {
    react: formHooks,
    '@/components/admin/action-form': Object.fromEntries(['ActionForm', 'FieldError', 'FormMessage', 'SubmitButton'].map(n => [n, n])),
    '@/components/admin/ui': {}, '@/lib/admin/actions/content': {},
  })('src/app/admin/(panel)/banners/banner-form.tsx');
  const banner = { placement: 'HERO', title: 'Saved headline', title_accent: 'Accent', subtitle: 'Detail', show_text: false };
  const render = () => { cursor = 0; return nodes(BannerForm({ banner })); };
  let all = render();
  const overlay = list => list.some(n => n.props?.className?.includes('from-black/85'));
  assert.equal(overlay(all), false);
  all.find(n => n.props?.name === 'show_text').props.onChange({ target: { checked: true } });
  all = render();
  assert.equal(overlay(all), true);
  assert.equal(all.find(n => n.props?.name === 'title').props.value, 'Saved headline');
  for (const name of ['title', 'title_accent', 'subtitle']) all.find(n => n.props?.name === name).props.onChange({ target: { value: ' ' } });
  assert.equal(overlay(render()), false);
});