/**
 * One-off generator: copies the Game On Olympics screens into the standalone
 * Game On Multisports League landing flow (`/gameon-multisports-league`).
 *
 * The league flow has to stay completely separate from the tabbed app flow, so
 * it gets its own component module (`src/components/league`) and its own route
 * tree (`src/app/gameon-multisports-league`) rather than sharing the Olympics
 * ones — the league content can then diverge without touching the app.
 *
 * What it rewrites while copying:
 *   · `@/components/olympics/*`  → `@/components/league/*`
 *   · `/gameon-olympics/*`       → `/gameon-multisports-league/*`
 *   · `useOlympicsBooking`       → `useLeagueBooking` (own draft in sessionStorage)
 *   · event branding that names the Olympics event → the Multisports League
 *
 * The landing page itself is hand-written (see components/league/landing.tsx):
 * the league shows every sport, category and fee on one page instead of the
 * sport list → sport detail → slot drill-down the app uses.
 *
 * Run once, from the project root:  node scripts/create-multisports-league-flow.mjs
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FROM = "/gameon-olympics";
const TO = "/gameon-multisports-league";

const read = (relativePath) => readFileSync(resolve(ROOT, relativePath), "utf8");

function write(relativePath, contents) {
  const target = resolve(ROOT, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
  console.log("wrote", relativePath);
}

/** Applies every `[from, to]` pair, in order — so specific swaps come first. */
function swap(contents, pairs) {
  return pairs.reduce((result, [from, to]) => result.split(from).join(to), contents);
}

/* ── Shared client module: one copy per file, no per-screen edits. ── */
const MODULE_PAIRS = [
  ["useOlympicsBooking", "useLeagueBooking"],
  ["OlympicsBookingProvider", "LeagueBookingProvider"],
  ['"go-olympics-draft"', '"go-league-draft"'],
  ["Game On Olympics", "Game On Multisports League"],
  ["Official Olympics jersey", "Official league jersey"],
  ["Olympics home", "League home"],
  ["Olympics · ", "League · "],
  ["GO-O", "GO-L"],
  [FROM, TO],
];

/* ── Screens: same swaps, plus route retargeting. ── */
const SCREEN_PAIRS = [
  ["@/components/olympics/", "@/components/league/"],
  // Everything above the blanket base-path swap, or it would never match.
  ...MODULE_PAIRS.filter(([from]) => from !== FROM),
  // There is no per-sport page in the league — everything is on the landing
  // page — so "back to the sport" collapses onto the landing page itself.
  [`\`${FROM}/sports/\${sport.id}\``, `"${TO}"`],
  [`${FROM}/sports`, TO],
  [FROM, TO],
];

for (const name of ["data.ts", "ui.tsx", "booking-context.tsx"]) {
  write(`src/components/league/${name}`, swap(read(`src/components/olympics/${name}`), MODULE_PAIRS));
}

for (const relativePath of [
  "book/slot/page.tsx",
  "book/details/page.tsx",
  "book/review/page.tsx",
  "book/payment/page.tsx",
  "book/success/page.tsx",
  "bookings/page.tsx",
  "not-found.tsx",
]) {
  write(
    `src/app${TO}/${relativePath}`,
    swap(read(`src/app${FROM}/${relativePath}`), SCREEN_PAIRS)
  );
}
