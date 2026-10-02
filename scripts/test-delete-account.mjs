/** Run: node --test scripts/test-delete-account.mjs. All email delivery is mocked. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const cache = new Map();
let deliveries = [];
let failAt = 0;
let rejectAt = 0;
let closed = false;
const nodemailer = {
  createTransport: () => ({
    sendMail: async (mail) => {
      deliveries.push(mail);
      if (deliveries.length === failAt) throw new Error("Mock SMTP failure");
      return { accepted: deliveries.length === rejectAt ? [] : [mail.to] };
    },
    close: () => { closed = true; },
  }),
};

function load(relative) {
  const filename = resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = { exports: {} };
  cache.set(filename, compiled);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  });
  const localRequire = (id) => {
    if (id === "nodemailer") return nodemailer;
    if (id.startsWith("@/")) {
      const path = `src/${id.slice(2)}`;
      return load(path === "src/components/DeleteAccountForm" ? `${path}.tsx` : `${path}.ts`);
    }
    if (id.startsWith(".")) return load(`${resolve(dirname(filename), id)}.ts`);
    return require(id);
  };
  new Function("require", "module", "exports", outputText)(localRequire, compiled, compiled.exports);
  return compiled.exports;
}

const { AccountDeletionSchema, deletionReplyEmail } = load("src/lib/account-deletion.ts");
const { renderDeletionEmail, sendAccountDeletionRequest } = load("src/lib/account-deletion-email.ts");
const { POST } = load("src/app/api/delete-account/route.ts");
const valid = { accountType: "email", identifier: "player@example.com", message: "Please delete my account and related information.", consent: true };
let ip = 0;
function request(body, headers = {}) {
  return new Request("https://game-on.in/api/delete-account", {
    method: "POST", headers: { "Content-Type": "application/json", origin: "https://game-on.in", "x-forwarded-for": `test-${++ip}`, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
function resetMail() { deliveries = []; failAt = 0; rejectAt = 0; closed = false; }

test("Accepts trimmed email requests and uses account email for the copy", () => {
  const result = AccountDeletionSchema.parse({ ...valid, identifier: " Player@Example.com " });
  assert.equal(result.identifier, "Player@Example.com");
  assert.equal(deletionReplyEmail(result), "player@example.com");
});

test("Phone requests require a separate valid copy email", () => {
  const input = { ...valid, accountType: "phone", identifier: "+91 98765 43210", receiptEmail: "copy@example.com" };
  assert.equal(AccountDeletionSchema.safeParse(input).success, true);
  assert.equal(deletionReplyEmail(AccountDeletionSchema.parse(input)), "copy@example.com");
  assert.equal(AccountDeletionSchema.safeParse({ ...input, receiptEmail: "" }).success, false);
});

test("Rejects invalid contacts, short/oversized messages, missing consent and bot field", () => {
  for (const patch of [
    { identifier: "not-email" }, { identifier: "a@example.com\r\nBcc: x@example.com" },
    { accountType: "phone", identifier: "123", receiptEmail: "copy@example.com" },
    { accountType: "phone", identifier: "1234567890abc", receiptEmail: "copy@example.com" },
    { message: "short" }, { message: "x".repeat(2001) }, { consent: false }, { website: "spam" },
  ]) assert.equal(AccountDeletionSchema.safeParse({ ...valid, ...patch }).success, false);
});

test("Email HTML escapes the request message and preserves a text copy", () => {
  const input = AccountDeletionSchema.parse({ ...valid, message: "Please delete <script>alert('test')</script> & data." });
  const email = renderDeletionEmail(input, "DEL-TEST", "2 October 2026", true);
  assert.doesNotMatch(email.html, /<script>/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.match(email.text, /<script>/);
  assert.match(email.text, /not confirmation that your account has been deleted/);
});

test("Sends staff request and user copy separately with correct reply addresses", async () => {
  resetMail();
  const oldUser = process.env.SMTP_USER;
  const oldPass = process.env.SMTP_APP_PASSWORD;
  process.env.SMTP_USER = "smtp@example.com";
  process.env.SMTP_APP_PASSWORD = "mock-password";
  try {
    const result = await sendAccountDeletionRequest(AccountDeletionSchema.parse(valid), "DEL-TEST");
    assert.equal(result.accepted, true);
    assert.equal(result.copySent, true);
    assert.equal(deliveries.length, 2);
    assert.equal(deliveries[0].to, "info@gameonmultisports.com");
    assert.equal(deliveries[0].replyTo, "player@example.com");
    assert.equal(deliveries[1].to, "player@example.com");
    assert.equal(deliveries[1].replyTo, "info@gameonmultisports.com");
    assert.match(deliveries[1].text, /Please delete my account/);
    assert.equal(closed, true);
  } finally {
    if (oldUser === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = oldUser;
    if (oldPass === undefined) delete process.env.SMTP_APP_PASSWORD; else process.env.SMTP_APP_PASSWORD = oldPass;
  }
});

test("Route handles successful delivery, partial failure, SMTP rejection and missing configuration", async () => {
  const oldUser = process.env.SMTP_USER;
  const oldPass = process.env.SMTP_APP_PASSWORD;
  process.env.SMTP_USER = "smtp@example.com";
  process.env.SMTP_APP_PASSWORD = "mock-password";
  try {
    resetMail();
    const response = await POST(request(valid));
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.copySent, true);
    assert.match(data.reference, /^DEL-[A-F0-9-]+$/);

    resetMail(); failAt = 2;
    const partial = await POST(request(valid));
    assert.equal(partial.status, 200);
    assert.equal((await partial.json()).copySent, false);

    resetMail(); rejectAt = 1;
    assert.equal((await POST(request(valid))).status, 502);
    assert.equal(deliveries.length, 1);

    resetMail(); delete process.env.SMTP_APP_PASSWORD;
    assert.equal((await POST(request(valid))).status, 503);
    assert.equal(deliveries.length, 0);
  } finally {
    if (oldUser === undefined) delete process.env.SMTP_USER; else process.env.SMTP_USER = oldUser;
    if (oldPass === undefined) delete process.env.SMTP_APP_PASSWORD; else process.env.SMTP_APP_PASSWORD = oldPass;
  }
});

test("Rejects malformed JSON, cross-origin submissions and oversized payloads", async () => {
  assert.equal((await POST(request("not json"))).status, 400);
  assert.equal((await POST(request(valid, { origin: "https://other.example" }))).status, 403);
  assert.equal((await POST(request("x".repeat(12001)))).status, 413);
});

test("Returns field errors without sending mail or revealing account existence", async () => {
  resetMail();
  const response = await POST(request({ ...valid, consent: false }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).fields.consent, /confirm/);
  assert.equal(deliveries.length, 0);
});

test("Rate limits this form after three attempts per IP", async () => {
  const headers = { "x-forwarded-for": "rate-limit-test" };
  for (let index = 0; index < 3; index++) assert.equal((await POST(request({}, headers))).status, 400);
  assert.equal((await POST(request({}, headers))).status, 429);
});

test("Form renders accessible labelled controls and a request-only notice", () => {
  const { DeleteAccountForm } = load("src/components/DeleteAccountForm.tsx");
  const html = renderToStaticMarkup(createElement(DeleteAccountForm));
  assert.match(html, /for="identifier"/);
  assert.match(html, /for="message"/);
  assert.match(html, /name="consent"/);
  assert.match(html, /Send deletion request/);
  assert.match(html, /Submitting does not immediately delete your account/);
  assert.match(html, /info@gameonmultisports.com/);
});