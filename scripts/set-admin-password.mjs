/**
 * Sets a fresh password on an account that can sign in to the admin panel.
 *
 * `/admin/team` can reset a teammate's password, but that needs an admin who is
 * already signed in. When the last admin's password is lost, this is the way
 * back in: it talks to Supabase Auth with the service role key, so no session is
 * required. Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
 * .env.local.
 *
 * The password is generated the same way as `/admin/team` does (16 characters,
 * every character class, no look-alikes) and is printed here — nothing is
 * emailed. Change it under My account after signing in.
 *
 * Usage:
 *   node scripts/set-admin-password.mjs admin@game-on.in            # keep the role
 *   node scripts/set-admin-password.mjs desk@example.com ADMIN      # and set a role
 *
 * Pass a role to also grant panel access, exactly like scripts/grant-admin.mjs.
 * Omit it for an account that already has ADMIN or STAFF.
 */
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const [emailArg, roleArg] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const role = roleArg?.toUpperCase();

if (
  !email ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  (role !== undefined && !["ADMIN", "STAFF"].includes(role))
) {
  console.error("Usage: node scripts/set-admin-password.mjs <email> [ADMIN|STAFF]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

/** Matches src/lib/admin/passwords.ts, so handovers read the same everywhere. */
function temporaryPassword() {
  const sets = ["abcdefghijkmnpqrstuvwxyz", "ABCDEFGHJKLMNPQRSTUVWXYZ", "23456789", "!@#$%*?"];
  const all = sets.join("");
  const chars = sets.map((set) => set[randomInt(set.length)]);
  while (chars.length < 16) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

const { data: userId, error: lookupError } = await supabase.rpc("auth_user_id_by_email", { p_email: email });
if (lookupError) {
  console.error("Lookup failed:", lookupError.message);
  console.error("Has supabase/migrations/20260917120000_admin_panel.sql been applied?");
  process.exit(1);
}
if (!userId) {
  console.error(`No account exists for ${email}. Create one with:`);
  console.error(`  node scripts/grant-admin.mjs ${email} ${role ?? "ADMIN"}`);
  process.exit(1);
}

const password = temporaryPassword();
const patch = role ? { password, app_metadata: { role } } : { password };
const { data: updated, error } = await supabase.auth.admin.updateUserById(userId, patch);
if (error) {
  console.error("Could not set the password:", error.message);
  process.exit(1);
}

// Prove the credentials work before they are handed over, using the key the
// sign-in page itself uses. Publishable keys are public by design.
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let verified = "not checked — NEXT_PUBLIC_SUPABASE_ANON_KEY is not set";
if (publishableKey) {
  const verifier = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: session, error: signInError } = await verifier.auth.signInWithPassword({ email, password });
  if (signInError) {
    console.error("Password set, but the verification sign-in failed:", signInError.message);
    process.exit(1);
  }
  const verifiedRole = session.user?.app_metadata?.role;
  await verifier.auth.signOut({ scope: "local" });
  verified =
    verifiedRole === "ADMIN" || verifiedRole === "STAFF"
      ? `sign-in confirmed, panel role is ${verifiedRole}`
      : `sign-in confirmed, but the role is ${verifiedRole ?? "missing"} — the panel will refuse this account`;
}

const activeRole = updated.user?.app_metadata?.role;
console.log(`Password set for ${email}.`);
console.log(`Password: ${password}`);
console.log(`Panel role: ${activeRole ?? "none"}`);
console.log(`Verification: ${verified}`);
console.log("Sign in at /admin/login, then change it under My account.");
