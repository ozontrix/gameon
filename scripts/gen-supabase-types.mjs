/**
 * Regenerate `src/types/database.types.ts` from the live Supabase project.
 *
 * The hand-maintained file in the repo was a "minimal representation" that does
 * not satisfy supabase-js's schema contract (each table needs `Relationships`,
 * the schema needs `Views` + `Functions`), which made every typed query resolve
 * to `never` and broke `next build`.
 *
 * Credentials are read from `.env.local` (git-ignored) or the shell environment:
 *   SUPABASE_ACCESS_TOKEN  – personal access token (Dashboard → Account → Access Tokens)
 *   SUPABASE_PROJECT_ID    – project ref (also accepts SUPABASE_PROJECT_REF)
 *   SUPABASE_SCHEMA        – optional, defaults to "public"
 *
 * Usage:
 *   node scripts/gen-supabase-types.mjs --dry-run   # write tmp-database.types.ts only
 *   node scripts/gen-supabase-types.mjs             # replace src/types/database.types.ts
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectId = process.env.SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_REF;
const schema = process.env.SUPABASE_SCHEMA || "public";
const dryRun = process.argv.includes("--dry-run");

const target = path.join(process.cwd(), "src", "types", "database.types.ts");
const dryRunTarget = path.join(process.cwd(), "tmp-database.types.ts");

// Tables the application code queries — used to sanity-check the output.
const REQUIRED_TABLES = [
  "users",
  "venues",
  "sports",
  "facilities",
  "operating_hours",
  "holidays_and_closures",
  "bookings",
];

if (!token) {
  console.error(
    "Missing SUPABASE_ACCESS_TOKEN (add it to .env.local or export it in your shell)."
  );
  process.exit(1);
}
if (!projectId) {
  console.error("Missing SUPABASE_PROJECT_ID (add it to .env.local or export it in your shell).");
  process.exit(1);
}

console.log(`Generating types for project ${projectId} (schema: ${schema})…`);

const result = spawnSync(
  "supabase",
  ["gen", "types", "typescript", "--project-id", projectId, "--schema", schema],
  {
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
    encoding: "utf8",
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  }
);

if (result.error) {
  console.error(`Could not run the Supabase CLI: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`Supabase CLI exited with code ${result.status}`);
  console.error((result.stdout || "").slice(-2000));
  console.error((result.stderr || "").slice(-2000));
  process.exit(result.status ?? 1);
}

const generated = result.stdout || "";

if (!/export type Database/.test(generated) || !/Tables:/.test(generated)) {
  console.error("Unexpected CLI output — refusing to overwrite the types file.");
  console.error(generated.slice(0, 800));
  process.exit(1);
}

// ─── Report what came back so mismatches with the code are obvious ───
const tables = [...generated.matchAll(/^ {6}([a-z_0-9]+): \{$/gm)].map((m) => m[1]);
const missing = REQUIRED_TABLES.filter((table) => !tables.includes(table));
const hasSchemaParts = ["Views:", "Functions:", "Enums:", "CompositeTypes:"].filter((part) =>
  generated.includes(part)
);

console.log(`Lines: ${generated.split("\n").length}  Size: ${(generated.length / 1024).toFixed(1)} KB`);
console.log(`Tables (${tables.length}): ${tables.join(", ") || "(none found)"}`);
console.log(`Schema sections present: ${hasSchemaParts.join(", ")}`);
if (missing.length) {
  console.warn(`⚠️  Tables used by the app but missing from the DB: ${missing.join(", ")}`);
} else {
  console.log("All tables used by the app are present.");
}

if (dryRun) {
  fs.writeFileSync(dryRunTarget, generated);
  console.log(`Dry run — wrote ${path.relative(process.cwd(), dryRunTarget)} (repo types untouched).`);
} else {
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, generated);
  fs.renameSync(tmp, target);
  console.log(`Wrote ${path.relative(process.cwd(), target)}.`);
}
