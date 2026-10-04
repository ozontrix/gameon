/** Read-only live checks. No real checkout, gateway payment or email is created. */
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env.local'), quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
assert.ok(url, 'Supabase URL is missing.');
assert.equal(new URL(url).hostname, 'uuemjenvhwopsueczbyv.supabase.co', 'Application must match the connected GameOn project.');
assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY, 'Service-role key is missing.');
assert.ok(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Anonymous key is missing.');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const server = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
const { data, error } = await server.from('league_bookings').select('id, status, amount_paise, email_status, entry, quote').limit(1);
assert.ifError(error); assert.ok(Array.isArray(data));
console.log('PASS application service role can query the live League table through PostgREST.');
for (const sport of ['badminton', 'pickleball', 'cricket', 'football']) {
  const { error: filterError } = await server.from('league_bookings').select('id')
    .or(`sport.eq.${sport},entry.cs.${JSON.stringify({ sports: [{ id: sport }] })}`)
    .or('captain_name.ilike.%verification-nonexistent%,email.ilike.%verification-nonexistent%')
    .limit(1);
  assert.ifError(filterError);
}
console.log('PASS multi-sport admin filters compose with contact search through live PostgREST.');
const browser = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, options);
const { error: denied } = await browser.from('league_bookings').select('id').limit(1);
assert.ok(denied, 'Anonymous clients must not read League bookings.');
assert.equal(denied.code, '42501');
console.log('PASS anonymous direct access to booking/contact data is denied.');
const { data: inventory, error: inventoryError } = await server.rpc('league_coupon_inventory');
assert.ifError(inventoryError);
assert.ok(Array.isArray(inventory));
console.log('PASS service role can load coupon inventory through live PostgREST.');
for (const table of ['league_coupons', 'league_coupon_uses']) {
  const { error: couponDenied } = await browser.from(table).select('*').limit(1);
  assert.ok(couponDenied, `Anonymous access to ${table} must be denied.`);
  assert.equal(couponDenied.code, '42501');
}
const { error: rpcDenied } = await browser.rpc('league_coupon_inventory');
assert.ok(rpcDenied, 'Anonymous access to coupon inventory must be denied.');
assert.equal(rpcDenied.code, '42501');
console.log('PASS anonymous access to coupon rules, contact redemptions and inventory RPC is denied.');