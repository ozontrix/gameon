/** node --test scripts/test-league-cart.mjs. No orders, emails or remote writes. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
function loader(mocks = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = { exports: {} };
    cache.set(filename, compiled);
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    });
    const localRequire = (id) => {
      if (id in mocks) return mocks[id];
      if (id === "next/link") return { __esModule: true, default: ({ children, ...props }) => createElement("a", props, children) };
      if (id.startsWith("@/") || id.startsWith(".")) {
        const base = id.startsWith("@/") ? resolve(root, "src", id.slice(2)) : resolve(dirname(filename), id);
        return load(existsSync(`${base}.ts`) ? `${base}.ts` : `${base}.tsx`);
      }
      return require(id);
    };
    new Function("require", "module", "exports", outputText)(localRequire, compiled, compiled.exports);
    return compiled.exports;
  }
  return load;
}
const load = loader();
const cart = load("src/components/league/cart.ts");
const { SPORTS, entryFees, findSport } = load("src/components/league/data.ts");
const { parseLeagueEntry, quoteEntry } = load("src/lib/league/entry.ts");
const contact = { captainName: "Test Player", phone: "9811000000", email: "player@example.com", city: "Gurugram", teamName: "Test Team" };
const example = [
  { sportId: "badminton", categoryId: "u13-boys-singles" },
  { sportId: "badminton", categoryId: "mixed-doubles" },
  { sportId: "pickleball", categoryId: "open-singles" },
];

test("Two badminton categories and one pickleball category survive back navigation and refresh", () => {
  let draft = { ...cart.EMPTY_DRAFT, ...contact };
  for (const selection of example) draft = cart.withSelections(draft, cart.toggleCartSelection(draft.selections, selection));
  assert.equal(draft.selections.length, 3);
  assert.equal(entryFees(cart.cartCategories(draft.selections)), 4200);
  const restored = cart.restoreDraft(JSON.parse(JSON.stringify(draft)));
  assert.deepEqual(restored.selections, example);
  assert.equal(restored.captainName, contact.captainName);
  assert.equal(restored.city, contact.city);
  assert.equal(restored.date, "2026-10-17");
  assert.equal(restored.squadSize, 4);
  const result = parseLeagueEntry(restored);
  assert.equal(result.ok, true);
  assert.equal(result.entry.categories.length, 3);
  assert.equal(result.entry.sports.length, 2);
  assert.equal(result.quote.total, 4200);
});

test("Editing or removing one sport leaves all other sport selections intact", () => {
  const edited = cart.replaceSportSelections(example, "badminton", ["mens-doubles"]);
  assert.deepEqual(edited, [example[2], { sportId: "badminton", categoryId: "mens-doubles" }]);
  const removed = cart.toggleCartSelection(edited, example[2]);
  assert.deepEqual(removed, [{ sportId: "badminton", categoryId: "mens-doubles" }]);
});

test("Category ids shared between sports stay separate; duplicate pairs never double-charge", () => {
  const selections = [
    { sportId: "badminton", categoryId: "mixed-doubles" },
    { sportId: "pickleball", categoryId: "mixed-doubles" },
  ];
  const result = parseLeagueEntry({ ...contact, selections: [...selections, selections[0]], date: "2026-10-17" });
  assert.equal(result.ok, true);
  assert.equal(result.entry.categories.length, 2);
  assert.equal(result.quote.total, 4000);
});

test("All fourteen categories fit one checkout with server-derived totals and dates", () => {
  const selections = SPORTS.flatMap(sport => sport.categories.map(category => ({ sportId: sport.id, categoryId: category.id })));
  const result = parseLeagueEntry({ ...contact, selections, date: "2026-10-17", squadSize: 1, addons: { jersey: 30 } });
  assert.equal(result.ok, true);
  assert.equal(result.entry.categories.length, 14);
  assert.equal(result.entry.sports.length, 4);
  assert.equal(result.entry.squadSize, 30);
  assert.deepEqual(result.entry.dates, ["2026-10-17", "2026-10-18"]);
  assert.equal(result.quote.total, 21200);
  assert.equal(result.quote.addOnsTotal, 0);
  assert.deepEqual(result.entry.addons, []);
});

test("Invalid categories, missing selections, wrong dates, and missing team names are rejected", () => {
  for (const patch of [
    { selections: [] },
    { selections: [...example, { sportId: "football", categoryId: "mixed-doubles" }] },
    { selections: [{ sportId: "unknown", categoryId: "team" }] },
    { selections: example, date: "2026-10-18" },
    { selections: [...example, { sportId: "cricket", categoryId: "team" }], teamName: "" },
  ]) assert.equal(parseLeagueEntry({ ...contact, date: "2026-10-17", ...patch }).ok, false);
});

test("Legacy drafts migrate; corrupt selections and hidden add-ons are discarded", () => {
  const migrated = cart.restoreDraft({ ...contact, sport: "pickleball", categoryIds: ["open-singles", "open-doubles"], addons: { jersey: 2 } });
  assert.equal(migrated.selections.length, 2);
  assert.deepEqual(migrated.addons, {});
  assert.equal(migrated.date, "2026-10-18");
  assert.equal(cart.restoreDraft(null).selections.length, 0);
  assert.equal(cart.restoreDraft({ selections: [{ sportId: "football", categoryId: "bad" }, null] }).selections.length, 0);
});

function uiHarness() {
  let draft = { ...cart.EMPTY_DRAFT, ...contact };
  const pushes = [];
  const buttons = [];
  const selectionsClicked = [];
  const reactRuntime = require("react/jsx-runtime");
  const capture = (kind) => (tag, props, key) => {
    if (tag === "button") buttons.push(props);
    return reactRuntime[kind](tag, props, key);
  };
  const booking = () => {
    const categories = cart.cartCategories(draft.selections);
    const sports = [...new Set(categories.map(c => c.sportId))].map(findSport);
    return {
      draft, ready: true, categories, sports, sport: sports[0] ?? null,
      pricing: quoteEntry({ categories, addons: {}, coupon: draft.coupon }),
      toggleSelection: (sportId, categoryId) => {
        selectionsClicked.push([sportId, categoryId]);
        draft = cart.withSelections(draft, cart.toggleCartSelection(draft.selections, { sportId, categoryId }));
      },
      removeSelection: selection => { draft = cart.withSelections(draft, draft.selections.filter(item => cart.selectionKey(item) !== cart.selectionKey(selection))); },
      clearCart: () => { draft = cart.withSelections(draft, []); },
      applyCoupon: () => ({ ok: true, message: "Applied" }), removeCoupon: () => {},
    };
  };
  const uiLoad = loader({
    "@/components/league/booking-context": { useLeagueBooking: booking },
    "./booking-context": { useLeagueBooking: booking },
    "next/navigation": { useRouter: () => ({ push: href => pushes.push(href) }) },
    "next/image": { __esModule: true, default: () => null },
    "@/components/league/pay-button": { LeaguePayButton: () => createElement("button", null, "Pay combined cart") },
    "react/jsx-runtime": { ...reactRuntime, jsx: capture("jsx"), jsxs: capture("jsxs") },
  });
  const Sport = uiLoad("src/components/league/sport-detail.tsx").LeagueSportDetail;
  const Landing = uiLoad("src/components/league/landing.tsx").LeagueLanding;
  const Review = uiLoad("src/app/gameon-multisports-league/book/review/page.tsx").default;
  function render(Component, props) { buttons.length = 0; return renderToStaticMarkup(createElement(Component, props)); }
  return { sport: id => render(Sport, { sportId: id }), landing: () => render(Landing), review: () => render(Review), buttons, pushes, selectionsClicked, booking };
}

test("Sport clicks persist immediately; returning to another sport keeps the combined cart", () => {
  const h = uiHarness();
  h.sport("badminton");
  h.buttons.find(button => button["aria-label"]?.startsWith("U-13 Singles Boys,")).onClick();
  h.sport("badminton");
  h.buttons.find(button => button["aria-label"]?.startsWith("Open Mixed Doubles,")).onClick();
  assert.ok(h.landing().includes("2 categories"));
  h.sport("pickleball");
  h.buttons.find(button => button["aria-label"]?.startsWith("Open Singles,")).onClick();
  assert.equal(h.booking().categories.length, 3);
  assert.equal(h.booking().pricing.total, 4200);
  const back = h.sport("badminton");
  assert.match(back, /aria-pressed="true"/);
  assert.ok(back.includes("3 categories in cart"));
  assert.ok(h.landing().includes("₹4,200"));
  const review = h.review();
  for (const text of ["3 categories", "2 sports", "Badminton", "Pickleball", "₹4,200", "Test Player", "player@example.com", "Gurugram"]) assert.ok(review.includes(text), text);
});

test("Cart remove controls remove only the selected sport/category pair", () => {
  const h = uiHarness();
  h.booking().toggleSelection("badminton", "mixed-doubles");
  h.booking().toggleSelection("pickleball", "mixed-doubles");
  h.landing();
  h.buttons.find(button => button["aria-label"] === "Remove Badminton Open Mixed Doubles").onClick();
  assert.deepEqual(h.booking().draft.selections, [{ sportId: "pickleball", categoryId: "mixed-doubles" }]);
});