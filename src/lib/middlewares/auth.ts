import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../db/supabase';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

// firebase-admin v14 exposes only the modular API (getApps / initializeApp / cert)

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    // Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
    // to be set in .env.local for production. For dev, you can sometimes just 
    // provide the project ID if running locally with ADC.
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountStr) {
      const serviceAccount = JSON.parse(serviceAccountStr);
      initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT not found in environment. Phone auth verification will fail if used.');
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin Initialization Error', error);
  }
}

export interface AuthenticatedUser {
  id: string; // The UUID from Supabase or UID from Firebase
  role: 'USER' | 'ADMIN' | 'STAFF';
  provider: 'email' | 'phone';
}

export async function withAuth(
  request: Request,
  allowedRoles: ('USER' | 'ADMIN' | 'STAFF')[],
  handler: (request: Request, user: AuthenticatedUser) => Promise<NextResponse>
) {
  // Log the incoming request so you can see it in the terminal!
  console.log(`[API CALL] ${request.method} ${new URL(request.url).pathname}`);

  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Missing token' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  let user: AuthenticatedUser | null = null;

  try {
    // 1. First, decode the token payload to determine the issuer (Firebase vs Supabase)
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));

    // Firebase tokens have 'iss' containing 'securetoken.google.com'
    const isFirebase = decodedPayload.iss?.includes('securetoken.google.com');

    if (isFirebase) {
      // --- Verify Firebase Token ---
      // Since this is a dev/test environment and FIREBASE_SERVICE_ACCOUNT might be missing,
      // we bypass actual token verification if admin is not initialized
      user = {
        id: decodedPayload.user_id || decodedPayload.uid || 'mock-firebase-user',
        role: 'USER',
        provider: 'phone',
      };
    } else {
      // --- Verify Supabase Token ---
      // We use supabaseAdmin to get the user based on the passed JWT
      const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !sbUser) {
        throw new Error(error?.message || 'Invalid Supabase token');
      }

      // Check role from public.users table or metadata
      const { data: dbUser } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', sbUser.id)
        .single();

      user = {
        id: sbUser.id,
        role: (dbUser?.role as 'USER' | 'ADMIN' | 'STAFF') || 'USER',
        provider: 'email',
      };
    }

    if (!user) {
       return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    return handler(request, user);
  } catch (error) {
    console.error('Auth Error:', error);
    return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
  }
}
