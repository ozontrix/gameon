/** Real Storage smoke check: temporary image only, always removed; no user rows changed. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env.local'), quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && key, 'Server Supabase environment is required.');
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = client.storage.from('profile-photos');
const path = `${randomUUID()}/${randomUUID()}.png`;
const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1kAAAAASUVORK5CYII=', 'base64');
let uploaded = false;
try {
  const result = await bucket.upload(path, bytes, { contentType: 'image/png', upsert: false });
  assert.ifError(result.error); uploaded = true;
  const signed = await bucket.createSignedUrl(path, 60);
  assert.ifError(signed.error);
  const response = await fetch(signed.data.signedUrl);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  const publicResponse = await fetch(bucket.getPublicUrl(path).data.publicUrl);
  assert.ok(!publicResponse.ok, 'Private photos must not be readable via public URLs.');
  console.log('PASS real private Storage upload, signed download, and public-access denial.');
} finally {
  if (uploaded) {
    const result = await bucket.remove([path]);
    assert.ifError(result.error);
    console.log('PASS temporary smoke-check photo removed; no user profiles changed.');
  }
}