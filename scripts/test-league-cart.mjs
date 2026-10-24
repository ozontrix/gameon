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
const { SPORTS, entryFees, findSport, formatINR } = load("src/components/league/data.ts");
const { parseLeagueEntry, quoteEntry } = load("src/lib/league/entry.ts");
const contact = { captainName: "Test Player", phone: "9811000000", email: "player@example.com", city: "Gurugram", teamName: "Test Team" };
const example = [
  { sportId: "badminton", categoryId: "u13-boys-singles" },
  { sportId: "badminton", categoryId: "mixed-doubles" },
  { sportId: "pickleball", categoryId: "mens-beginner-singles" },
];

test("Two badminton categories and one pickleball category survive back navigation and refresh", () => {
  let draft = { ...cart.EMPTY_DRAFT, ...contact };
  for (const selection of example) draft = cart.withSelections(draft, cart.toggleCartSelection(draft.selections, selection));
  assert.equal(draft.selections.length, 3);
  assert.equal(entryFees(cart.cartCategories(draft.selections)), 3999);
  const restored = cart.restoreDraft(JSON.parse(JSON.stringify(draft)));
  assert.deepEqual(restored.selections, example);
  assert.equal(restored.captainName, contact.captainName);
  assert.equal(restored.city, contact.city);
  assert.equal(restored.date, "2026-10-24");
  assert.equal(restored.squadSize, 4);
  const result = parseLeagueEntry(restored);
  assert.equal(result.ok, true);
  assert.equal(result.entry.categories.length, 3);
  assert.equal(result.entry.sports.length, 2);
  assert.equal(result.quote.total, 3999);
});

test("Editing or removing one sport leaves all other sport selections intact", () => {
  const edited = cart.replaceSportSelections(example, "badminton", ["mens-doubles"]);
  assert.deepEqual(edited, [example[2], { sportId: "badminton", categoryId: "mens-doubles" }]);
  const removed = cart.toggleCartSelection(edited, example[2]);
  assert.deepEqual(removed, [{ sportId: "badminton", categoryId: "mens-doubles" }]);
});

test("Categories from different sports stay separate; duplicate pairs never double-charge", () => {
  const selections = [
    { sportId: "badminton", categoryId: "mixed-doubles" },
    { sportId: "pickleball", categoryId: "mixed-open-doubles" },
  ];
  const result = parseLeagueEntry({ ...contact, selections: [...selections, selections[0]], date: "2026-10-24" });
  assert.equal(result.ok, true);
  assert.equal(result.entry.categories.length, 2);
  assert.equal(result.quote.total, 4799);
});

test("All twenty categories fit one checkout with server-derived totals and dates", () => {
  const selections = SPORTS.flatMap(sport => sport.categories.map(category => ({ sportId: sport.id, categoryId: category.id })));
  const result = parseLeagueEntry({ ...contact, selections, date: "2026-10-24", squadSize: 1, addons: { jersey: 30 } });
  assert.equal(result.ok, true);
  assert.equal(result.entry.categories.length, 20);
  assert.equal(result.entry.sports.length, 4);
  assert.equal(result.entry.squadSize, 41);
  assert.deepEqual(result.entry.dates, ["2026-10-24", "2026-10-25", "2026-10-31", "2026-11-01"]);
  assert.equal(result.quote.total, 36389);
  assert.equal(result.quote.addOnsTotal, 0);
  assert.deepEqual(result.entry.addons, []);
});

test("Invalid categories, missing selections, wrong dates, and missing team names are rejected", () => {
  for (const patch of [
    { selections: [] },
    { selections: [...example, { sportId: "football", categoryId: "mixed-doubles" }] },
    { selections: [{ sportId: "unknown", categoryId: "team" }] },
    { selections: example, date: "2026-10-25" },
    { selections: [...example, { sportId: "cricket", categoryId: "team" }], teamName: "" },
  ]) assert.equal(parseLeagueEntry({ ...contact, date: "2026-10-24", ...patch }).ok, false);
});

test("Legacy drafts migrate; corrupt selections and hidden add-ons are discarded", () => {
  const migrated = cart.restoreDraft({ ...contact, sport: "pickleball", categoryIds: ["mens-beginner-singles", "mens-open-doubles"], addons: { jersey: 2 } });
  assert.equal(migrated.selections.length, 2);
  assert.deepEqual(migrated.addons, {});
  assert.equal(migrated.date, "2026-10-31");
  assert.deepEqual(cart.restoreDraft({ selections: [{ sportId: "pickleball", categoryId: "u14-singles" }] }).selections, []);
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

test("Each sport stores its requested overall tournament prize separately from entry fees", () => {
  assert.deepEqual(SPORTS.map(({ id, prizePool }) => [id, prizePool]), [
    ["badminton", 97000],
    ["pickleball", 75000],
    ["cricket", 22000],
    ["football", 22000],
  ]);
});

test("Landing, sport details and review show the rescheduled weekend", () => {
  const h = uiHarness();
  const landing = h.landing();
  assert.match(landing, /24 &amp; 25 October 2026/);
  assert.doesNotMatch(landing, /1[78] (?:Oct|October)/);
  for (const sport of SPORTS) {
    const html = h.sport(sport.id);
    assert.match(html, sport.id === "pickleball" ? /31 October &amp; 1 November 2026/ : sport.id === "cricket" ? /25 Oct,? 2026/ : /24 Oct,? 2026/);
    assert.doesNotMatch(html, /1[78] (?:Oct|October)/);
  }
  h.booking().toggleSelection("badminton", "u13-boys-singles");
  h.booking().toggleSelection("badminton", "mens-doubles");
  assert.match(h.sport("badminton"), /Please be available on 24 and 25 October/);
  const review = h.review();
  assert.match(review, /24 Oct,? 2026/);
  assert.match(review, /25 Oct,? 2026/);
  assert.doesNotMatch(review, /1[78] (?:Oct|October)/);
});

test("Badminton page and checkout share the corrected category dates", () => {
  const h = uiHarness();
  const original = JSON.stringify(SPORTS);
  const html = h.sport("badminton");
  const expected = {
    "2026-10-24": ["mixed-doubles", "mens-singles", "womens-singles", "mens-doubles"],
    "2026-10-25": ["u13-boys-singles", "u13-girls-singles", "u17-boys-singles"],
  };
  for (const [date, ids] of Object.entries(expected)) {
    const section = html.match(new RegExp(`<section[^>]*aria-labelledby="match-day-${date}"[^>]*>([\\s\\S]*?)</section>`))?.[1];
    assert.ok(section, date);
    assert.equal((section.match(/aria-pressed=/g) ?? []).length, ids.length);
    assert.ok(section.includes(`${ids.length} categories`));
    for (const category of findSport("badminton").categories) {
      assert.equal(section.includes(`>${category.name}</span>`), ids.includes(category.id), category.name);
      if (!ids.includes(category.id)) continue;
      const card = h.buttons.find(button => button["aria-label"]?.startsWith(`${category.name},`));
      const label = date.endsWith("24") ? /Sat, 24 Oct,? 2026/ : /Sun, 25 Oct,? 2026/;
      assert.match(card["aria-label"], label);
      assert.match(renderToStaticMarkup(createElement("span", null, card.children)), label);
    }
  }
  h.buttons.find(button => button["aria-label"]?.startsWith("Open Singles Men,")).onClick();
  const selected = h.sport("badminton");
  const summary = selected.slice(selected.indexOf("Your selected match days"), selected.indexOf("Add another sport"));
  assert.match(summary, /24 Oct,? 2026/);
  assert.doesNotMatch(summary, /25 Oct,? 2026/);
  const cartSummary = selected.slice(selected.lastIndexOf("Your cart"));
  assert.match(cartSummary, /24 Oct,? 2026/);
  assert.doesNotMatch(cartSummary, /25 Oct,? 2026/);
  assert.equal(h.booking().categories[0].date, "2026-10-24");
  assert.equal(h.booking().draft.date, "2026-10-24");
  assert.equal(h.booking().pricing.total, 1000);
  assert.deepEqual(h.selectionsClicked, [["badminton", "mens-singles"]]);
  assert.match(h.review(), /24 Oct,? 2026/);
  assert.doesNotMatch(h.review(), /25 Oct,? 2026/);
  assert.equal(JSON.stringify(SPORTS), original);
});

test("Badminton mixed doubles shows October 24 in its card, selection summary, cart and checkout", () => {
  const h = uiHarness();
  h.sport("badminton");
  const card = h.buttons.find(button => button["aria-label"]?.startsWith("Open Mixed Doubles,"));
  assert.match(card["aria-label"], /Sat, 24 Oct,? 2026/);
  card.onClick();
  const selected = h.sport("badminton");
  const summary = selected.slice(selected.indexOf("Your selected match days"), selected.indexOf("Add another sport"));
  const cartSummary = selected.slice(selected.lastIndexOf("Your cart"));
  for (const html of [summary, cartSummary, h.review()]) {
    assert.match(html, /24 Oct,? 2026/);
    assert.doesNotMatch(html, /25 Oct,? 2026/);
  }
  assert.equal(h.booking().categories[0].date, "2026-10-24");
  assert.equal(h.booking().draft.date, "2026-10-24");
  assert.equal(h.booking().pricing.total, 2000);
  assert.deepEqual(h.selectionsClicked, [["badminton", "mixed-doubles"]]);
});

test("Every badminton category uses the same date on its sport page, landing cart and review", () => {
  for (const [categoryId, day] of [
    ["u13-boys-singles", 25], ["u13-girls-singles", 25], ["u17-boys-singles", 25],
    ["mixed-doubles", 24], ["mens-singles", 24], ["womens-singles", 24], ["mens-doubles", 24],
  ]) {
    const h = uiHarness();
    h.booking().toggleSelection("badminton", categoryId);
    const sport = h.sport("badminton");
    const landing = h.landing();
    for (const html of [sport.slice(sport.lastIndexOf("Your cart")), landing.slice(landing.lastIndexOf("Your cart")), h.review()]) {
      assert.match(html, new RegExp(`${day} Oct,? 2026`), categoryId);
      assert.doesNotMatch(html, new RegExp(`${day === 24 ? 25 : 24} Oct,? 2026`), categoryId);
    }
  }
});

test("Other sport pages retain their category dates and original cart dates", () => {
  const h = uiHarness();
  h.booking().toggleSelection("badminton", "mens-singles");
  for (const sport of SPORTS.filter(sport => sport.id !== "badminton" && sport.id !== "pickleball")) {
    const html = h.sport(sport.id);
    for (const category of sport.categories) {
      const card = h.buttons.find(button => button["aria-label"]?.startsWith(`${category.name},`));
      assert.match(card["aria-label"], category.date.endsWith("24") ? /24 Oct,? 2026/ : /25 Oct,? 2026/);
    }
    assert.match(html.slice(html.lastIndexOf("Your cart")), /24 Oct,? 2026/);
  }
});

test("Saved drafts with old dates recalculate match dates without losing selections or contact details", () => {
  for (const [sportId, categoryId, oldDate, newDate] of [
    ["badminton", "u13-boys-singles", "2026-10-24", "2026-10-25"],
    ["badminton", "u13-girls-singles", "2026-10-24", "2026-10-25"],
    ["badminton", "u17-boys-singles", "2026-10-24", "2026-10-25"],
    ["badminton", "mens-singles", "2026-10-25", "2026-10-24"],
    ["badminton", "womens-singles", "2026-10-25", "2026-10-24"],
    ["badminton", "mens-doubles", "2026-10-25", "2026-10-24"],
    ["badminton", "mixed-doubles", "2026-10-25", "2026-10-24"],
    ["football", "team", "2026-10-17", "2026-10-24"],
    ["cricket", "team", "2026-10-18", "2026-10-25"],
  ]) {
    const selections = [{ sportId, categoryId }];
    const restored = cart.restoreDraft({ ...contact, selections, date: oldDate });
    assert.deepEqual(restored.selections, selections);
    assert.equal(restored.date, newDate);
    assert.equal(restored.email, contact.email);
    assert.equal(parseLeagueEntry(restored).ok, true);
  }
});

test("Badminton category prizes match the poster and total the tournament prize pool", () => {
  const sport = findSport("badminton");
  assert.deepEqual(sport.categories.map(({ id, prizes }) => [id, prizes.winner, prizes.runnerUp]), [
    ["u13-boys-singles", 5000, 3000],
    ["u13-girls-singles", 5000, 3000],
    ["u17-boys-singles", 7000, 5000],
    ["mixed-doubles", 10000, 6000],
    ["mens-singles", 10000, 6000],
    ["womens-singles", 7000, 5000],
    ["mens-doubles", 15000, 10000],
  ]);
  assert.equal(sport.categories.reduce((sum, { prizes }) => sum + prizes.winner + prizes.runnerUp, 0), sport.prizePool);
});

test("Each badminton card shows both prizes accessibly and keeps its original booking fee", () => {
  const h = uiHarness();
  h.sport("badminton");
  const cards = h.buttons.filter(button => button["aria-pressed"] !== undefined);
  const sport = findSport("badminton");
  assert.equal(cards.length, sport.categories.length);
  sport.categories.forEach(category => {
    const card = cards.find(button => button["aria-label"].startsWith(`${category.name},`));
    const markup = renderToStaticMarkup(createElement("span", null, card.children));
    for (const text of [category.name, "Winner", "Runner-up", formatINR(category.prizes.winner), formatINR(category.prizes.runnerUp), formatINR(category.fee)]) {
      assert.ok(markup.includes(text), `${category.name}: ${text}`);
    }
    assert.ok(card["aria-label"].includes(`winner prize ${formatINR(category.prizes.winner)}, runner-up prize ${formatINR(category.prizes.runnerUp)}`));
    card.onClick();
  });
  assert.equal(h.booking().pricing.total, 9000);
  assert.equal(h.booking().categories.length, 7);
  const selected = h.sport("badminton");
  assert.equal((selected.match(/aria-pressed="true"/g) ?? []).length, 7);
  assert.equal((selected.match(/Runner-up/g) ?? []).length, 7);
});

test("Pickleball replacement categories retain screenshot fees without obsolete category prizes", () => {
  const sport = findSport("pickleball");
  assert.ok(sport.categories.every(category => !category.prizes));
  assert.deepEqual(sport.categories.map(({ fee }) => fee), [999, 1299, 1899, 1999, 2299, 2299, 2299, 2299, 2399, 2799, 2799]);
});

test("Pickleball cards show screenshot fees accessibly without bracket dates, and all eleven preserve checkout totals", () => {
  const h = uiHarness();
  h.sport("pickleball");
  const cards = h.buttons.filter(button => button["aria-pressed"] !== undefined);
  const sport = findSport("pickleball");
  assert.equal(cards.length, sport.categories.length);
  sport.categories.forEach(category => {
    const card = cards.find(button => button["aria-label"].startsWith(`${category.name},`));
    const markup = renderToStaticMarkup(createElement("span", null, card.children));
    assert.ok(markup.includes(category.name.replaceAll("'", "&#x27;")), category.name);
    assert.ok(markup.includes(formatINR(category.fee)), category.name);
    assert.ok(markup.includes(category.squadSize === 1 ? "per person" : "per team"), category.name);
    assert.ok(card["aria-label"].includes(formatINR(category.fee)), category.name);
    assert.doesNotMatch(markup + card["aria-label"], /Oct|Nov|Winner|Runner-up/);
    card.onClick();
  });
  assert.equal(h.booking().pricing.total, 23389);
  assert.equal(h.booking().categories.length, 11);
  const selected = h.sport("pickleball");
  assert.equal((selected.match(/aria-pressed="true"/g) ?? []).length, 11);
  assert.ok(selected.includes("₹23,389"));
  assert.ok(selected.includes("₹999"));
  assert.doesNotMatch(selected, /Runner-up|match-day-2026/);
  assert.match(selected, /31 October &amp; 1 November 2026/);
  h.buttons.find(button => button["aria-label"]?.startsWith("Men's Beginner Singles,")).onClick();
  assert.equal(h.booking().pricing.total, 22390);
  assert.equal(h.booking().categories.length, 10);
});

test("Cricket and football prizes match the confirmed amounts and total each tournament prize pool", () => {
  for (const id of ["cricket", "football"]) {
    const sport = findSport(id);
    assert.deepEqual(sport.categories.map(({ id, prizes }) => [id, prizes.winner, prizes.runnerUp]), [
      ["team", 15000, 7000],
    ]);
    assert.equal(sport.categories.reduce((sum, { prizes }) => sum + prizes.winner + prizes.runnerUp, 0), sport.prizePool);
    assert.deepEqual(sport.categories.map(({ fee }) => fee), [2000]);
  }
});

test("Cricket and football cards show both prizes accessibly without changing selection or booking fees", () => {
  const h = uiHarness();
  for (const [index, id] of ["cricket", "football"].entries()) {
    h.sport(id);
    const cards = h.buttons.filter(button => button["aria-pressed"] !== undefined);
    const sport = findSport(id);
    assert.equal(cards.length, sport.categories.length);
    sport.categories.forEach(category => {
      const card = cards.find(button => button["aria-label"].startsWith(`${category.name},`));
      const markup = renderToStaticMarkup(createElement("span", null, card.children));
      for (const text of [category.name, "Winner", "Runner-up", "₹15,000", "₹7,000", "₹2,000", "per team"]) {
        assert.ok(markup.includes(text), `${id}: ${text}`);
      }
      assert.ok(card["aria-label"].includes("winner prize ₹15,000, runner-up prize ₹7,000"));
      assert.equal(card["aria-pressed"], false);
      card.onClick();
    });
    assert.equal(h.booking().pricing.total, (index + 1) * 2000);
    assert.equal(h.booking().categories.length, index + 1);
    const selected = h.sport(id);
    assert.equal((selected.match(/aria-pressed="true"/g) ?? []).length, 1);
    assert.equal((selected.match(/Runner-up/g) ?? []).length, 1);
  }
  h.buttons.find(button => button["aria-label"]?.startsWith("Team Entry (6v6),")).onClick();
  assert.equal(h.booking().pricing.total, 2000);
  assert.deepEqual(h.booking().draft.selections, [{ sportId: "cricket", categoryId: "team" }]);
  const result = parseLeagueEntry(h.booking().draft);
  assert.equal(result.ok, true);
  assert.equal(result.quote.total, 2000);
});

test("Landing cards highlight the correct tournament prizes and retain entry fees and sport links", () => {
  const cards = uiHarness().landing().split("<h2 ").slice(1);
  assert.equal(cards.length, 4);
  const expectedPrizes = ["₹97,000", "₹75,000", "₹22,000", "₹22,000"];
  const expectedFees = ["₹1,000", "₹1,000", "₹2,000", "₹2,000"];
  SPORTS.forEach((sport, index) => {
    assert.ok(cards[index].includes(sport.name), sport.name);
    assert.ok(cards[index].includes("Overall Tournament Prize"), sport.name);
    assert.ok(cards[index].includes(expectedPrizes[index]), sport.name);
    if (sport.id === "pickleball") {
      assert.ok(!cards[index].includes("Starts from"));
      assert.ok(!cards[index].includes(expectedFees[index]));
      assert.ok(cards[index].includes("31 October &amp; 1 November 2026"));
      assert.ok(cards[index].includes("11 categories"));
    } else assert.ok(cards[index].includes(expectedFees[index]), sport.name);
    assert.ok(cards[index].includes(`href="/gameon-multisports-league/sports/${sport.id}"`), sport.name);
  });
});

test("Sport clicks persist immediately; returning to another sport keeps the combined cart", () => {
  const h = uiHarness();
  h.sport("badminton");
  h.buttons.find(button => button["aria-label"]?.startsWith("U-13 Singles Boys,")).onClick();
  h.sport("badminton");
  h.buttons.find(button => button["aria-label"]?.startsWith("Open Mixed Doubles,")).onClick();
  assert.ok(h.landing().includes("2 categories"));
  h.sport("pickleball");
  h.buttons.find(button => button["aria-label"]?.startsWith("Men's Beginner Singles,")).onClick();
  assert.equal(h.booking().categories.length, 3);
  assert.equal(h.booking().pricing.total, 3999);
  const back = h.sport("badminton");
  assert.match(back, /aria-pressed="true"/);
  assert.ok(back.includes("3 categories in cart"));
  assert.ok(h.landing().includes("₹3,999"));
  const review = h.review();
  for (const text of ["3 categories", "2 sports", "Badminton", "Pickleball", "₹3,999", "Test Player", "player@example.com", "Gurugram"]) assert.ok(review.includes(text), text);
});

test("Cart remove controls remove only the selected sport/category pair", () => {
  const h = uiHarness();
  h.booking().toggleSelection("badminton", "mixed-doubles");
  h.booking().toggleSelection("pickleball", "mixed-open-doubles");
  h.landing();
  h.buttons.find(button => button["aria-label"] === "Remove Badminton Open Mixed Doubles").onClick();
  assert.deepEqual(h.booking().draft.selections, [{ sportId: "pickleball", categoryId: "mixed-open-doubles" }]);
});