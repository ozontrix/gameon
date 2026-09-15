const fs = require('fs');
const path = require('path');

const exFile = path.join(__dirname, 'src/app/api/v1/auth/exchange/route.ts');
let exCode = fs.readFileSync(exFile, 'utf8');
exCode = exCode.replace(
  "const jwtSecret = process.env.SUPABASE_JWT_SECRET || 'dev-dummy-secret-please-change';",
  "const jwtSecret = process.env.SUPABASE_JWT_SECRET;"
);
exCode = exCode.replace(
  "if (!process.env.SUPABASE_JWT_SECRET) {\\n      console.warn('WARNING: Using dummy JWT secret for local dev because SUPABASE_JWT_SECRET is missing');\\n    }",
  "if (!jwtSecret) {\\n      console.error('CRITICAL: SUPABASE_JWT_SECRET is not configured in .env.local');\\n      return NextResponse.json({ success: false, error: 'Server misconfiguration: missing jwt secret' }, { status: 500 });\\n    }"
);
fs.writeFileSync(exFile, exCode);

const mwFile = path.join(__dirname, 'src/lib/middlewares/auth.ts');
let mwCode = fs.readFileSync(mwFile, 'utf8');
const oldVerify = `    // Verify the JWT locally using jose (avoids network call to Supabase and works with dev secrets)
    const { jwtVerify } = require('jose');
    const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET || 'dev-dummy-secret-please-change');
    const { payload } = await jwtVerify(token, secret);

    const userId = payload.sub as string;
    if (!userId) throw new Error('Invalid token: missing sub');

    // Fetch the user's role from the public schema
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const user: AuthenticatedUser = {
      id: userId,
      role: (dbUser?.role as 'USER' | 'ADMIN' | 'STAFF') || 'USER',
      provider: (payload.app_metadata as any)?.provider === 'phone' ? 'phone' : 'email',
    };`;

const newVerify = `    // ONLY Accept Supabase JWTs. We strictly verify them against our environment keys.
    const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !sbUser) {
      throw new Error(error?.message || 'Invalid token');
    }

    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', sbUser.id)
      .single();

    const user: AuthenticatedUser = {
      id: sbUser.id,
      role: (dbUser?.role as 'USER' | 'ADMIN' | 'STAFF') || 'USER',
      provider: sbUser.app_metadata?.provider === 'phone' ? 'phone' : 'email',
    };`;

mwCode = mwCode.replace(oldVerify, newVerify);
fs.writeFileSync(mwFile, mwCode);
