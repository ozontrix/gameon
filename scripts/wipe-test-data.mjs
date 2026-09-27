/**
 * Deletes player/test accounts so the app can be exercised from a clean slate.
 *
 * Accounts that can sign in to the admin panel are never touched. They are
 * protected twice over: by the email allow-list below, and independently by
 * their app_metadata.role, so a mistake in either check cannot lock an admin out
 * of /admin. Deleting an auth user cascades to public.profiles and from there to
 * notifications, notification_reads, wallets and wallet_transactions. Auth's own
 * identities, sessions, MFA factors and webauthn rows cascade too, which is why
 * the Admin API is used here rather than a DELETE on auth.users.
 *
 * Rows that do NOT cascade are deliberately left to SQL, because a wrong guess
 * here would silently orphan them. public.bookings.user_id is ON DELETE SET NULL,
 * so booking history survives user deletion and has to go first:
 *
 *   delete from public.bookings;
 *   delete from public.users;   -- legacy table, only the scratch scripts read it
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 *
 * Usage:
 *   node scripts/wipe-test-data.mjs           # dry run — lists what would go
 *   node scripts/wipe-test-data.mjs --yes     # actually delete
 *
 * Admin accounts can be recreated afterwards with scripts/grant-admin.mjs.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

/** Never deleted, whatever their metadata says. */
const PROTECTED_EMAILS = new Set(["admin@game-on.in", "staff@game-on.in"]);
const PANEL_ROLES = new Set(["ADMIN", "STAFF"]);

const confirmed = process.argv.includes("--yes");

/**
 * Points at the account a human can recognise. `||`, not `??`: the Admin API
 * returns an empty string (not null) for the email of a phone-only account, and
 * `??` would happily print that blank.
 */
const label = (account) => account.email || account.phone || account.id;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // The Admin API pages at 1000 per call, so walk every page rather than trusting a default.
  const accounts = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("Could not list accounts:", error.message);
      process.exitCode = 1;
      return;
    }
    accounts.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const isProtected = (account) =>
    PROTECTED_EMAILS.has((account.email ?? "").toLowerCase()) || PANEL_ROLES.has(account.app_metadata?.role);

  const keep = accounts.filter(isProtected);
  const targets = accounts.filter((account) => !isProtected(account));

  console.log(`${accounts.length} account(s) in the database.\n`);
  console.log(`Keeping ${keep.length}:`);
  for (const account of keep) {
    console.log(`  - ${label(account)} [${account.app_metadata?.role ?? "no panel role"}]`);
  }
  console.log(`\nDeleting ${targets.length}:`);
  for (const account of targets) {
    console.log(`  - ${label(account)}  (${account.id})`);
  }

  if (targets.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  if (!confirmed) {
    console.log("\nDry run. Re-run with --yes to delete these accounts and everything linked to them.");
    return;
  }

  let failed = 0;
  for (const account of targets) {
    // shouldSoftDelete is passed explicitly as false: this project has a
    // auth.users.deleted_at column, and a flag-only row would keep the address
    // taken for signup, which is the opposite of a clean slate.
    const { error } = await supabase.auth.admin.deleteUser(account.id, false);
    if (error) {
      failed += 1;
      console.error(`  ! ${label(account)} — ${error.message}`);
    } else {
      console.log(`  deleted ${label(account)}`);
    }
  }

  console.log(`\nDeleted ${targets.length - failed} of ${targets.length} account(s).`);
  if (failed > 0) {
    console.error("Some accounts survived — check the messages above before retrying.");
    process.exitCode = 1;
    return;
  }
  console.log("Clear public.bookings separately — its user_id is ON DELETE SET NULL.");
}

// Exit code is set through process.exitCode rather than process.exit(): calling
// exit() while undici is still closing its keep-alive sockets trips a libuv
// assertion on Windows and reports a bogus 3221226505.
await main();
