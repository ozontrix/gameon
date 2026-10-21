/** Read-only deployment preflight. Never sends a WhatsApp message or prints secrets. */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const expected = 'https://uuemjenvhwopsueczbyv.supabase.co';
if (url !== expected) throw new Error('Local database does not match the connected project; no remote changes should be applied.');
console.log('Local database matches the connected Supabase project.');
if (process.argv.includes('--tables')) {
  const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const table of ['whatsapp_contacts', 'whatsapp_chat_messages']) {
    const { error, count } = await db.from(table).select('*', { count: 'exact', head: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`${table}: reachable; ${count} records`);
  }
}
for (const key of ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_WABA_ID', 'WHATSAPP_APP_SECRET', 'WHATSAPP_VERIFY_TOKEN']) console.log(`${key}: ${process.env[key]?.trim() ? 'set' : 'MISSING'}`);