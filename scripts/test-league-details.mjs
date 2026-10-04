/** Run: node --test scripts/test-league-details.mjs. No remote writes. */
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

function details(sportId, patch = {}) {
  const cache = new Map();
  const updates = [];
  const pushed = [];
  const buttons = [];
  let booking;
  const mocks = {
    "next/navigation": { useRouter: () => ({ push: (href) => pushed.push(href) }) },
    "next/link": { __esModule: true, default: ({ children, ...props }) => createElement("a", props, children) },
    "@/components/league/booking-context": { useLeagueBooking: () => booking },
  };
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const compiled = { exports: {} };
    cache.set(filename, compiled);
    const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    });
    const localRequire = (id) => {
      if (mocks[id]) return mocks[id];
      if (!id.startsWith("@/") && !id.startsWith(".")) return require(id);
      const base = id.startsWith("@/") ? resolve(root, "src", id.slice(2)) : resolve(dirname(filename), id);
      return load([`${base}.ts`, `${base}.tsx`].find(existsSync));
    };
    new Function("require", "module", "exports", outputText)(localRequire, compiled, compiled.exports);
    return compiled.exports;
  }
  const data = load(resolve(root, "src/components/league/data.ts"));
  const { quoteEntry } = load(resolve(root, "src/lib/league/entry.ts"));
  const cart = load(resolve(root, "src/components/league/cart.ts"));
  const initialSport = data.findSport(sportId);
  const selections = patch.selections ?? (initialSport ? [{ sportId, categoryId: initialSport.categories[0].id }] : []);
  const categories = cart.cartCategories(selections);
  const sports = [...new Set(categories.map((item) => item.sportId))].map((id) => data.findSport(id));
  const sport = sports[0] ?? null;
  const draft = {
    teamName: "Test Team", captainName: "Test Player", phone: "9811000000",
    email: "player@example.com", city: "Gurugram", addons: {}, coupon: null, selections, ...patch,
  };
  booking = {
    draft, ready: true, sport, sports, categories,
    removeSelection: (selection) => updates.push({ removed: selection }),
    pricing: quoteEntry({ categories, addons: draft.addons, coupon: draft.coupon }),
    update: (value) => updates.push(value),
  };
  const ui = load(resolve(root, "src/components/league/ui.tsx"));
  mocks["@/components/league/ui"] = {
    ...ui,
    Button: (props) => {
      buttons.push(props);
      return createElement(ui.Button, props);
    },
  };
  const Page = load(resolve(root, "src/app/gameon-multisports-league/book/details/page.tsx")).default;
  const html = renderToStaticMarkup(createElement(Page));
  return { html, updates, pushed, buttons, booking, data };
}

test("Details pages retain player/team fields and omit all optional extras", () => {
  for (const sportId of ["badminton", "pickleball", "cricket", "football"]) {
    const { html, buttons, booking, data } = details(sportId);
    for (const label of ["Your categories &amp; match days", "Mobile number", "Email", "City", "Entry fee"]) {
      assert.ok(html.includes(label), `${sportId}: ${label}`);
    }
    assert.ok(html.includes(booking.sport.mode === "team" ? "Captain name" : "Player name"));
    assert.ok(html.includes(data.formatINR(booking.pricing.entryFee)));
    assert.doesNotMatch(html, /Optional extras|Add-ons|Official league jersey|Match photos|Fewer|More/);
    assert.equal(buttons.find(({ children }) => children[0] === "Review").disabled, false);
  }
});

test("Older draft extras are excluded from the details total and cleared before review", () => {
  const { html, updates, pushed, buttons, booking } = details("pickleball", { addons: { jersey: 2, recording: 1 } });
  assert.equal(booking.pricing.addOnsTotal, 1999);
  assert.ok(html.includes("₹1,000"));
  assert.ok(!html.includes("₹2,999"));
  buttons.find(({ children }) => children[0] === "Review").onClick();
  assert.deepEqual(updates, [{ squadSize: 1, addons: {} }]);
  assert.deepEqual(pushed, ["/gameon-multisports-league/book/review"]);
});

test("Required contact validation still disables review", () => {
  const { html, buttons } = details("cricket", { teamName: "", email: "" });
  assert.match(html, /Add team name, email to continue/);
  assert.equal(buttons.find(({ children }) => children[0] === "Review").disabled, true);
});

test("Details without a category still direct the player to browse sports", () => {
  const { html } = details(null);
  assert.match(html, /Nothing to fill in yet/);
  assert.match(html, /Browse sports/);
});

test("Mixed sports use one contact form and require a team name for any team sport", () => {
  const selections = [
    { sportId: "badminton", categoryId: "u13-boys-singles" },
    { sportId: "pickleball", categoryId: "open-doubles" },
    { sportId: "cricket", categoryId: "team" },
    { sportId: "football", categoryId: "team" },
  ];
  const { html, buttons } = details(null, { selections, teamName: "" });
  for (const text of ["Your details", "4 categories selected across 4 sports", "Badminton", "Pickleball", "Box Cricket 7v7", "Football 6v6", "₹7,400"]) assert.ok(html.includes(text), text);
  assert.equal((html.match(/placeholder="Full name"/g) ?? []).length, 1);
  assert.equal((html.match(/type="email"/g) ?? []).length, 1);
  assert.equal((html.match(/inputMode="tel"/g) ?? []).length, 1);
  assert.match(html, /Add team name to continue/);
  assert.equal(buttons.find(({ children }) => children[0] === "Review").disabled, true);
  assert.doesNotMatch(html, /20-a-side/);
});