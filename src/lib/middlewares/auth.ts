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
    // ONLY Accept Supabase JWTs. We strictly verify them against our environment keys.
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
