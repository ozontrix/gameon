import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  console.warn('Missing NEXT_PUBLIC_SUPABASE_URL environment variable.');
}

// ⚠️ We use the Service Role Key for backend APIs to bypass Row Level Security
// since our API layer (Services) handles authorization logic.
// NEVER expose this client to the frontend/browser.
function createSupabaseAdmin() {
  // The API authorises requests itself and relies on bypassing RLS, so a
  // publishable key is never an acceptable stand-in for the service role key.
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let client: SupabaseClient<Database> | null = null;

function supabaseAdminClient(): SupabaseClient<Database> {
  if (!client) {
    client = createSupabaseAdmin();
  }
  return client;
}

/**
 * The client is created on first use instead of at import time: importing this
 * module must never throw, because `next build` imports it while collecting page
 * data (where the Supabase env vars are not necessarily present).
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const instance = supabaseAdminClient();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

