/** Read-only verification of the connected blog database. Never prints credentials. */
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env.local'), quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
assert.ok(url, 'Supabase URL is missing.');
assert.equal(new URL(url).hostname, 'uuemjenvhwopsueczbyv.supabase.co', 'Connector and application project must match.');
console.log('PASS application and connector target the same GameOn project.');
if (!process.argv.includes('--project-only')) {
  assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY, 'Service-role key is missing.');
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const server = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, options);
  const { data, error } = await server.from('blog_posts').select('id, slug, status, published_at').limit(1);
  assert.ifError(error);
  assert.ok(Array.isArray(data));
  console.log('PASS blog table is available through PostgREST using the application service role.');
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  assert.ok(publicKey, 'Anonymous key is missing.');
  const publicClient = createClient(url, publicKey, options);
  const { error: denied } = await publicClient.from('blog_posts').select('id').limit(1);
  assert.ok(denied, 'Anonymous users must not read the blog table directly.');
  assert.equal(denied.code, '42501');
  console.log('PASS anonymous direct table access is denied.');
}