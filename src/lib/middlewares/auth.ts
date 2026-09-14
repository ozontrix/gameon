import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../db/supabase';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

if (!getApps().length) {
  try {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountStr) {
      const serviceAccount = JSON.parse(serviceAccountStr);
      initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT not found. Firebase tokens will not be strictly verified.');
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin Initialization Error', error);
  }
}

export interface AuthenticatedUser {
  id: string;
  role: 'USER' | 'ADMIN' | 'STAFF';
  provider: 'email' | 'phone';
}

export async function withAuth(
  request: Request,
  allowedRoles: ('USER' | 'ADMIN' | 'STAFF')[],
  handler: (request: Request, user: AuthenticatedUser) => Promise<NextResponse>
) {
  console.log(`[API CALL] ${request.method} ${new URL(request.url).pathname}`);

  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Missing token' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the JWT locally using jose (avoids network call to Supabase and works with dev secrets)
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
    };

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    return handler(request, user);
  } catch (error) {
    console.error('Auth Error:', error);
    return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
  }
}
