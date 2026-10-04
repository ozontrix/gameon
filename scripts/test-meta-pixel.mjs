/** Browser mocks only: no Meta requests, real payment orders, or emails. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
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
    const localRequire = id => {
      if (id in mocks) return mocks[id];
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

function browser(storage = new Map(), { blocked = false, gpc = false } = {}) {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const previousEnv = process.env.NODE_ENV;
  const events = new EventTarget();
  const localStorage = {
    getItem: key => { if (blocked) throw new Error("Blocked"); return storage.get(key) ?? null; },
    setItem: (key, value) => { if (blocked) throw new Error("Blocked"); storage.set(key, value); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    location: { pathname: "/gameon-multisports-league/book/review" },
    localStorage, sessionStorage: localStorage,
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { globalPrivacyControl: gpc } });
  process.env.NODE_ENV = "production";
  return { storage, restore: () => {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow); else delete globalThis.window;
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator); else delete globalThis.navigator;
    if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv;
  } };
}
const categories = [
  { id: "mixed-doubles", sportId: "badminton", fee: 2000 },
  { id: "mixed-doubles", sportId: "pickleball", fee: 2400 },
];
const receipt = {
  reference: "GO-TEST", orderId: "order_test", paymentId: "pay_test", amount: 3740, currency: "INR", paidAt: "2026-10-04T12:00:00Z",
  entry: { categories, sport: "multisport", captainName: "Private Player", email: "private@example.com", phone: "9811000000", city: "Gurugram", notes: "private notes", teamName: "Private Team" },
};
function analytics() { return loader()("src/lib/analytics/meta-pixel.ts"); }
function pixelEvents() { return window.fbq.queue.filter(args => args[0] === "trackSingle"); }

test("Unknown, rejected and withdrawn consent block every event and do not initialize the SDK", () => {
  const b = browser();
  try {
    const meta = analytics(); meta.configureMetaPixel(true);
    assert.equal(meta.trackMetaEvent("PageView"), false);
    assert.equal(window.fbq, undefined);
    meta.setMarketingConsent("denied");
    assert.equal(meta.trackLeaguePurchase(receipt), false);
    assert.equal(window.fbq, undefined);
    meta.setMarketingConsent("granted");
    assert.equal(meta.trackMetaEvent("PageView"), true);
    meta.setMarketingConsent("denied");
    const count = pixelEvents().length;
    assert.equal(meta.trackMetaEvent("AddToCart"), false);
    assert.equal(meta.trackLeaguePurchase(receipt), false);
    assert.equal(pixelEvents().length, count);
    assert.deepEqual(window.fbq.queue.at(-1), ["consent", "revoke"]);
  } finally { b.restore(); }
});

test("Production flag, admin paths and Global Privacy Control protect non-public visits", () => {
  const b = browser();
  try {
    const meta = analytics(); meta.setMarketingConsent("granted");
    assert.equal(meta.trackMetaEvent("PageView"), false);
    meta.configureMetaPixel(true); process.env.NODE_ENV = "development";
    assert.equal(meta.trackMetaEvent("PageView"), false);
    process.env.NODE_ENV = "production";
    for (const path of ["/admin", "/admin/login", "/admin/multisports-league", "/api/test", "/delete-account", "/email-confirmed"]) {
      window.location.pathname = path;
      assert.equal(meta.trackMetaEvent("PageView"), false, path);
    }
    window.location.pathname = "/";
    navigator.globalPrivacyControl = true;
    meta.setMarketingConsent("granted");
    assert.equal(meta.getMarketingConsent(), "denied");
    assert.equal(meta.trackMetaEvent("PageView"), false);
    assert.equal(window.fbq, undefined);
  } finally { b.restore(); }
});

test("SDK initializes once; public SPA pageviews do not double fire on repeated effects", () => {
  const b = browser();
  try {
    const meta = analytics(); meta.configureMetaPixel(true); meta.setMarketingConsent("granted");
    assert.equal(meta.trackMetaPageView("/"), true);
    assert.equal(meta.trackMetaPageView("/"), false);
    assert.equal(meta.trackMetaPageView("/gameon-multisports-league"), true);
    assert.equal(meta.trackMetaPageView("/gameon-multisports-league"), false);
    assert.equal(meta.trackMetaPageView("/"), true);
    assert.equal(window.fbq.queue.filter(args => args[0] === "init").length, 1);
    assert.deepEqual(window.fbq.queue.find(args => args[0] === "init"), ["init", "1044470925231458"]);
    assert.deepEqual(window.fbq.queue.find(args => args[0] === "set"), ["set", "autoConfig", false, "1044470925231458"]);
    assert.equal(pixelEvents().length, 3);
  } finally { b.restore(); }
});

test("Confirmed Purchase uses discounted rupees, sport-qualified ids, and no checkout contact fields", () => {
  const b = browser();
  try {
    const meta = analytics(); meta.configureMetaPixel(true); meta.setMarketingConsent("granted");
    assert.equal(meta.trackLeaguePurchase(receipt), true);
    const event = pixelEvents()[0];
    assert.deepEqual(event.slice(0, 3), ["trackSingle", "1044470925231458", "Purchase"]);
    assert.equal(event[3].value, 3740);
    assert.equal(event[3].currency, "INR");
    assert.equal(event[3].num_items, 2);
    assert.deepEqual(event[3].content_ids, ["league:badminton:mixed-doubles", "league:pickleball:mixed-doubles"]);
    assert.deepEqual(event[4], { eventID: "league-purchase:order_test" });
    const serialized = JSON.stringify(event);
    for (const privateValue of ["Private Player", "private@example.com", "9811000000", "Gurugram", "private notes", "Private Team"]) assert.ok(!serialized.includes(privateValue));
    assert.equal(meta.trackLeaguePurchase(receipt), false);
    // A fresh module represents a full page reload: localStorage still prevents duplicates.
    const reloaded = analytics(); reloaded.configureMetaPixel(true); reloaded.refreshMarketingConsent();
    assert.equal(reloaded.trackLeaguePurchase(receipt), false);
    assert.equal(pixelEvents().filter(args => args[2] === "Purchase").length, 1);
  } finally { b.restore(); }
});

test("Missing payment proof never queues Purchase; consent refusal does not mark an unsent event", () => {
  const b = browser();
  try {
    const meta = analytics(); meta.configureMetaPixel(true); meta.setMarketingConsent("granted");
    for (const patch of [{ paymentId: "" }, { orderId: "" }, { paidAt: "" }, { amount: -1 }, { amount: NaN }, { currency: "USD" }]) assert.equal(meta.trackLeaguePurchase({ ...receipt, ...patch }), false);
    meta.setMarketingConsent("denied");
    assert.equal(meta.trackLeaguePurchase(receipt), false);
    assert.equal(b.storage.has(meta.META_PURCHASES_KEY), false);
    meta.setMarketingConsent("granted");
    assert.equal(meta.trackLeaguePurchase(receipt), true);
  } finally { b.restore(); }
});

test("Blocked storage or a broken third-party SDK cannot throw into the payment handler", () => {
  const b = browser(new Map(), { blocked: true });
  try {
    const meta = analytics(); meta.configureMetaPixel(true); meta.setMarketingConsent("granted");
    assert.equal(meta.trackLeaguePurchase(receipt), true);
    assert.equal(meta.trackLeaguePurchase(receipt), false);
    window.fbq.callMethod = () => { throw new Error("Blocked SDK"); };
    assert.equal(meta.trackMetaEvent("AddToCart"), false);
    assert.doesNotThrow(() => meta.trackLeaguePurchase({ ...receipt, orderId: "order_another" }));
    assert.doesNotThrow(() => meta.setMarketingConsent("denied"));
  } finally { b.restore(); }
});

test("Confirmed Razorpay handler tracks Purchase; failed confirmation and dismissal never do", async () => {
  const b = browser();
  const previousFetch = globalThis.fetch;
  try {
    let options;
    let confirmOk = false;
    let purchases = 0;
    let paymentEvents = 0;
    const pushes = [];
    const booking = { draft: { ...receipt.entry, selections: [{ sportId: "badminton", categoryId: "mixed-doubles" }], date: "2026-10-17" },
      sports: [{ name: "Badminton" }], categories, ready: true, pricing: { total: 3740 }, update: () => {}, clearCart: () => {} };
    window.Razorpay = class { constructor(args) { options = args; } open() {} };
    globalThis.fetch = async path => path.endsWith("/order")
      ? { ok: true, json: async () => ({ success: true, orderId: "order_test", amount: 374000, currency: "INR", keyId: "test" }) }
      : { ok: confirmOk, json: async () => ({ success: confirmOk, confirmation: confirmOk ? receipt : undefined }) };
    const load = loader({
      react: { ...React, useState: () => ["idle", () => {}] },
      "next/navigation": { useRouter: () => ({ push: path => pushes.push(path) }) },
      sonner: { toast: { error: () => {}, success: () => {}, message: () => {} } },
      "./ui": { Button: props => React.createElement("button", props) },
      "./booking-context": { useLeagueBooking: () => booking },
      "@/lib/analytics/meta-pixel": {
        trackLeaguePaymentInfo: (_id, _categories, amount) => { assert.equal(amount, 374000); paymentEvents++; },
        trackLeaguePurchase: data => { assert.equal(data, receipt); purchases++; },
      },
    });
    const { LeaguePayButton } = load("src/components/league/pay-button.tsx");
    await LeaguePayButton({ label: "Pay" }).props.onClick();
    assert.equal(purchases, 0);
    options.modal.ondismiss(); assert.equal(purchases, 0);
    const payment = { razorpay_order_id: "order_test", razorpay_payment_id: "pay_test", razorpay_signature: "signature" };
    await options.handler(payment);
    assert.equal(purchases, 0);
    assert.equal(pushes.length, 0);
    confirmOk = true;
    await options.handler(payment);
    assert.equal(purchases, 1);
    assert.equal(paymentEvents, 2);
    assert.deepEqual(pushes, ["/gameon-multisports-league/book/success"]);
  } finally { globalThis.fetch = previousFetch; b.restore(); }
});

test("AddPaymentInfo uses actual order value and deduplicates a retried order", () => {
  const b = browser();
  try {
    const meta = analytics(); meta.configureMetaPixel(true); meta.setMarketingConsent("granted");
    assert.equal(meta.trackLeaguePaymentInfo("order_test", categories, 374000), true);
    assert.equal(meta.trackLeaguePaymentInfo("order_test", categories, 374000), false);
    assert.equal(pixelEvents()[0][2], "AddPaymentInfo");
    assert.equal(pixelEvents()[0][3].value, 3740);
  } finally { b.restore(); }
});

test("Server markup offers equal consent choices without a script or noscript request; admin UI is excluded", () => {
  const load = loader({
    "next/navigation": { usePathname: () => "/" },
    "next/link": { __esModule: true, default: props => React.createElement("a", props) },
    "next/script": { __esModule: true, default: props => React.createElement("script", props) },
  });
  const { MetaPixel } = load("src/components/MetaPixel.tsx");
  const html = renderToStaticMarkup(React.createElement(MetaPixel, { enabled: true }));
  assert.match(html, /Accept marketing/); assert.match(html, /Reject marketing/);
  assert.doesNotMatch(html, /<script|<img|<noscript|connect.facebook.net/);
  assert.equal(renderToStaticMarkup(React.createElement(MetaPixel, { enabled: false })), "");
  const adminLoad = loader({ "next/navigation": { usePathname: () => "/admin/multisports-league" } });
  assert.equal(renderToStaticMarkup(React.createElement(adminLoad("src/components/MetaPixel.tsx").MetaPixel, { enabled: true })), "");
});

test("InitiateCheckout waits for consent and a restored cart, then fires once per mount", () => {
  const effects = [];
  const tracked = { current: false };
  let consent = "unknown";
  const booking = { ready: false, categories, pricing: { total: 3740 } };
  const events = [];
  const load = loader({
    react: { ...React, useEffect: effect => effects.push(effect), useRef: () => tracked, useSyncExternalStore: () => consent },
    "./booking-context": { useLeagueBooking: () => booking },
    "@/lib/analytics/meta-pixel": {
      getMarketingConsent: () => consent, getServerMarketingConsent: () => "unknown", subscribeMarketingConsent: () => () => {},
      leagueEventParameters: (items, value) => ({ count: items.length, value, currency: "INR" }),
      trackMetaEvent: (event, parameters) => { events.push({ event, parameters }); return true; },
    },
  });
  const { LeagueCheckoutTracking } = load("src/components/league/checkout-tracking.tsx");
  const run = () => { effects.length = 0; LeagueCheckoutTracking(); effects.forEach(effect => effect()); };
  run(); assert.equal(events.length, 0);
  booking.ready = true; run(); assert.equal(events.length, 0);
  consent = "granted"; run(); run();
  assert.deepEqual(events, [{ event: "InitiateCheckout", parameters: { count: 2, value: 3740, currency: "INR" } }]);
});

test("Selecting a category tracks AddToCart; deselecting it does not", () => {
  const buttons = [];
  const events = [];
  const changes = [];
  const draft = { selections: [] };
  const runtime = require("react/jsx-runtime");
  const capture = kind => (tag, props, key) => { if (tag === "button") buttons.push(props); return runtime[kind](tag, props, key); };
  const load = loader({
    "react/jsx-runtime": { ...runtime, jsx: capture("jsx"), jsxs: capture("jsxs") },
    "next/navigation": { useRouter: () => ({ push: () => {} }) },
    "next/link": { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) },
    "./cart-summary": { LeagueCartSummary: () => null },
    "./booking-context": { useLeagueBooking: () => ({ draft, ready: true, categories: [], pricing: { total: 0 }, toggleSelection: (...args) => changes.push(args) }) },
    "@/lib/analytics/meta-pixel": {
      leagueEventParameters: (items, value) => ({ id: `${items[0].sportId}:${items[0].id}`, value, currency: "INR" }),
      trackMetaEvent: (event, parameters) => events.push({ event, parameters }),
    },
  });
  const { LeagueSportDetail } = load("src/components/league/sport-detail.tsx");
  const render = () => { buttons.length = 0; renderToStaticMarkup(React.createElement(LeagueSportDetail, { sportId: "pickleball" })); };
  render();
  buttons.find(button => button["aria-label"]?.startsWith("Open Mixed Doubles,")).onClick();
  draft.selections = [{ sportId: "pickleball", categoryId: "mixed-doubles" }];
  render();
  buttons.find(button => button["aria-label"]?.startsWith("Open Mixed Doubles,")).onClick();
  assert.deepEqual(events, [{ event: "AddToCart", parameters: { id: "pickleball:mixed-doubles", value: 2400, currency: "INR" } }]);
  assert.equal(changes.length, 2);
});