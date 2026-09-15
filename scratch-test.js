const { createClient } = require('@supabase/supabase-js');
const { SignJWT } = require('jose');

async function run() {
  const supabase = createClient('https://uuemjenvhwopsueczbyv.supabase.co', 'sb_publishable_gTdARnIZ6moAb7GEFNjZHA_s_Wp7IGv');
  
  const alg = 'HS256';
  const secret = new TextEncoder().encode('dev-dummy-secret-please-change');
  
  const token = await new SignJWT({
    aud: 'authenticated',
    role: 'authenticated',
    phone: '+919999999999',
    sub: '12345'
  })
    .setProtectedHeader({ alg, typ: 'JWT' })
    .setExpirationTime('30d')
    .sign(secret);
    
  console.log("Token:", token);
  const { data, error } = await supabase.auth.getUser(token);
  console.log("Error:", error?.message);
}
run();
