/**
 * Gives an account access to the admin panel (/admin), or creates it.
 *
 * Needed once, for the first admin — after that, admins manage the team from
 * /admin/team. Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from
 * .env.local.
 *
 * Usage:
 *   node scripts/grant-admin.mjs owner@example.com            # ADMIN
 *   node scripts/grant-admin.mjs desk@example.com STAFF
 *
 * An existing account keeps its password. A new account is created with a
 * one-time password printed here — change it under My account after signing in.
 */
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const [emailArg, roleArg = "ADMIN"] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const role = roleArg.toUpperCase();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["ADMIN", "STAFF"].includes(role)) {
  console.error("Usage: node scripts/grant-admin.mjs <email> [ADMIN|STAFF]");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

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

const { data: existingId, error: lookupError } = await supabase.rpc("auth_user_id_by_email", { p_email: email });
if (lookupError) {
  console.error("Lookup failed:", lookupError.message);
  console.error("Has supabase/migrations/20260917120000_admin_panel.sql been applied?");
  process.exit(1);
}

if (existingId) {
  const { error } = await supabase.auth.admin.updateUserById(existingId, { app_metadata: { role } });
  if (error) {
    console.error("Could not update the account:", error.message);
    process.exit(1);
  }
  console.log(`${email} is now ${role}. They sign in at /admin/login with their existing password.`);
} else {
  const password = temporaryPassword();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  });
  if (error) {
    console.error("Could not create the account:", error.message);
    process.exit(1);
  }
  console.log(`Created ${email} as ${role}.`);
  console.log(`One-time password: ${password}`);
  console.log("Sign in at /admin/login, then change it under My account.");
}
