/** Regression checks using Node's test runner and the existing TypeScript compiler.
 * Run: node --test scripts/test-league-flow.mjs
 * No gateway orders are created and no emails are sent.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const cache = new Map();

// Compile just the shared catalog/validation/email modules, resolving the same
// @/ aliases as the app. This keeps tests independent of Next's server runtime.
function load(relative) {
  const filename = resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = { exports: {} };
  cache.set(filename, compiled);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const localRequire = (id) => {
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}.ts`);
    if (id.startsWith(".")) return load(`${resolve(dirname(filename), id)}.ts`);
    return require(id);
  };
  new Function("require", "module", "exports", outputText)(localRequire, compiled, compiled.exports);
  return compiled.exports;
}

const { SPORTS, categoryDates, categoryFeeUnit, entryFees, entryTickets, findCategories, findSport, scheduleLabel } = load("src/components/league/data.ts");
const { parseLeagueEntry, quoteEntry } = load("src/lib/league/entry.ts");
const { confirmationSchedule } = load("src/lib/league/confirmation.ts");
const { renderLeagueConfirmationEmail } = load("src/lib/league/email.ts");

const payload = (sport, categoryIds, date) => ({
  sport, categoryIds, date,
  captainName: "Test Player", phone: "9811000000", email: "player@example.com",
  teamName: "Test Team", addons: {}, coupon: null,
});

test("Badminton has exactly the seven requested categories, dates and fees", () => {
  const badminton = findSport("badminton");
  assert.deepEqual(badminton.categories.map(({ name, date, fee, squadSize }) => [name, date, fee, squadSize]), [
    ["U-13 Singles Boys", "2026-10-17", 1000, 1],
    ["U-13 Singles Girls", "2026-10-17", 1000, 1],
    ["U-17 Singles Boys", "2026-10-17", 1000, 1],
    ["Open Mixed Doubles", "2026-10-17", 2000, 2],
    ["Open Singles Men", "2026-10-18", 1000, 1],
    ["Open Singles Women", "2026-10-18", 1000, 1],
    ["Doubles Men", "2026-10-18", 2000, 2],
  ]);
});

test("Pickleball has five requested categories with fees matching badminton", () => {
  assert.deepEqual(findSport("pickleball").categories.map(({ name, date, fee }) => [name, date, fee]), [
    ["Under 14 Singles", "2026-10-17", 1000],
    ["Under 14 Doubles", "2026-10-17", 2000],
    ["Open Mixed Doubles", "2026-10-17", 2000],
    ["Open Singles", "2026-10-18", 1000],
    ["Open Doubles", "2026-10-18", 2000],
  ]);
});

test("Pickleball checkout totals use the new singles and doubles fees", () => {
  const ids = findSport("pickleball").categories.map(({ id }) => id);
  const result = parseLeagueEntry(payload("pickleball", ids, "2026-10-17"));
  assert.equal(result.ok, true);
  assert.equal(result.quote.entryFee, 8000);
  assert.equal(result.quote.total, 8000);
  assert.equal(result.entry.squadSize, 8);
  assert.deepEqual(result.entry.dates, ["2026-10-17", "2026-10-18"]);
});

test("Team formats/fees remain unchanged with Football on 17th and Cricket on 18th", () => {
  for (const [id, name, size, date] of [
    ["football", "Team Entry (6v6)", 6, "2026-10-17"],
    ["cricket", "Team Entry (7v7)", 7, "2026-10-18"],
  ]) {
    const sport = findSport(id);
    assert.equal(sport.categories.length, 1);
    assert.deepEqual(sport.categories.map(({ name, squadSize, date, fee }) => [name, squadSize, date, fee]), [[name, size, date, 2000]]);
    const result = parseLeagueEntry(payload(id, ["team"], date));
    assert.equal(result.ok, true);
    assert.equal(result.quote.total, 2000);
    assert.deepEqual(result.entry.dates, [date]);
  }
});

test("Every category can be validated individually with correct squad and fee unit", () => {
  for (const sport of SPORTS) {
    for (const category of sport.categories) {
      const result = parseLeagueEntry(payload(sport.id, [category.id], category.date));
      assert.equal(result.ok, true, category.name);
      assert.equal(result.entry.date, category.date);
      assert.equal(result.quote.total, category.fee);
      assert.equal(result.entry.squadSize, category.squadSize);
      assert.equal(categoryFeeUnit(category), category.squadSize === 1 ? "person" : "team");
    }
  }
});

test("Multi-day entries derive sorted dates regardless of selection order", () => {
  const categories = findCategories(findSport("badminton"), ["mens-doubles", "mixed-doubles"]);
  assert.deepEqual(categoryDates(categories), ["2026-10-17", "2026-10-18"]);
  assert.equal(entryFees(categories), 4000);
  assert.equal(entryTickets(categories), 4);
  assert.match(scheduleLabel(categories), /17 Oct,? 2026.*18 Oct,? 2026/);
  const result = parseLeagueEntry(payload("badminton", categories.map(({ id }) => id), "2026-10-17"));
  assert.equal(result.ok, true);
  assert.deepEqual(result.entry.dates, ["2026-10-17", "2026-10-18"]);
});

test("All seven badminton categories are supported by payment validation", () => {
  const ids = findSport("badminton").categories.map(({ id }) => id);
  const result = parseLeagueEntry(payload("badminton", ids, "2026-10-17"));
  assert.equal(result.ok, true);
  assert.equal(result.quote.entryFee, 9000);
  assert.equal(result.entry.squadSize, 9);
});

test("Wrong dates, removed categories, and unknown categories are rejected", () => {
  for (const input of [
    payload("cricket", ["team"], "2026-10-17"),
    payload("badminton", ["mens-singles"], "2026-10-17"),
    payload("football", ["team"], "2026-10-18"),
    payload("badminton", ["womens-doubles"], "2026-10-18"),
    payload("pickleball", ["mens-singles"], "2026-10-18"),
    payload("badminton", ["unknown"], "2026-10-17"),
    payload("badminton", ["mixed-doubles"], "2026-12-12"),
  ]) assert.equal(parseLeagueEntry(input).ok, false);
});

test("Repeated category IDs do not cause duplicate fees", () => {
  const result = parseLeagueEntry(payload("badminton", ["mens-doubles", "mens-doubles"], "2026-10-18"));
  assert.equal(result.ok, true);
  assert.equal(result.quote.total, 2000);
  assert.equal(findCategories(findSport("badminton"), ["mens-doubles", "mens-doubles"]).length, 1);
});

test("Add-ons and coupon totals use the updated fees", () => {
  const categories = findCategories(findSport("badminton"), ["mens-singles", "mens-doubles"]);
  const quote = quoteEntry({ categories, addons: { jersey: 3 }, coupon: "EARLYBIRD" });
  assert.equal(quote.entryFee, 3000);
  assert.equal(quote.addOnsTotal, 1500);
  assert.equal(quote.discount, 675);
  assert.equal(quote.total, 3825);
});

test("Confirmation and email include category-specific dates for both days", () => {
  const result = parseLeagueEntry(payload("badminton", ["mixed-doubles", "mens-doubles"], "2026-10-17"));
  assert.equal(result.ok, true);
  const confirmation = {
    reference: "GOL-TEST01", orderId: "order_test", paymentId: "pay_test", amount: 4000,
    currency: "INR", paidAt: "2026-10-02T12:00:00Z", emailSent: false,
    entry: { ...result.entry, sport: "badminton", sportName: "Badminton" }, quote: result.quote,
  };
  assert.match(confirmationSchedule(confirmation.entry), /17 Oct,? 2026.*18 Oct,? 2026/);
  const email = renderLeagueConfirmationEmail(confirmation);
  assert.match(email.text, /Open Mixed Doubles: Saturday, 17 October,? 2026/);
  assert.match(email.text, /Doubles Men: Sunday, 18 October,? 2026/);
  assert.match(email.html, /Saturday, 17 October,? 2026/);
  assert.match(email.html, /Sunday, 18 October,? 2026/);
  assert.match(email.text, /₹4,000/);
});

test("Older confirmation receipts retain their original stored date", () => {
  const oldEntry = { categories: [{ id: "team", name: "Team Entry (7v7)" }], date: "2026-10-18" };
  assert.match(confirmationSchedule(oldEntry), /18 Oct,? 2026/);
});

test("Shared schedule UI renders every selected category, day and fee", () => {
  const { CategorySchedule } = load("src/components/league/category-schedule.tsx");
  const categories = findCategories(findSport("badminton"), ["mixed-doubles", "mens-singles"]);
  const html = renderToStaticMarkup(createElement(CategorySchedule, { categories }));
  assert.match(html, /Open Mixed Doubles/);
  assert.match(html, /Open Singles Men/);
  assert.match(html, /17 Oct,? 2026/);
  assert.match(html, /18 Oct,? 2026/);
  assert.match(html, /₹2,000/);
  assert.match(html, /₹1,000/);
  assert.match(html, /per team/);
  assert.match(html, /per person/);
  assert.equal((html.match(/<li /g) ?? []).length, 2);
});