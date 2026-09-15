import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { SignJWT } from 'jose';

export async function POST(request: Request) {
  try {
    const { firebaseToken } = await request.json();
    
    if (!firebaseToken) {
      return NextResponse.json({ success: false, error: 'Missing firebaseToken' }, { status: 400 });
    }

    let uid: string;
    let phoneNumber: string | undefined;

    // STEP A: Verify Firebase Token
    try {
      if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.warn('FIREBASE_SERVICE_ACCOUNT is missing. Bypassing STRICT verification for local dev.');
        // Unsafe manual decode for local dev only
        const payloadBase64 = firebaseToken.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
        uid = decoded.user_id || decoded.uid;
        phoneNumber = decoded.phone_number;
      } else {
        const decodedToken = await getAuth().verifyIdToken(firebaseToken);
        uid = decodedToken.uid;
        phoneNumber = decodedToken.phone_number;
      }
    } catch (e: any) {
      return NextResponse.json({ success: false, error: 'Invalid Firebase token: ' + e.message }, { status: 401 });
    }

    if (!phoneNumber) {
      return NextResponse.json({ success: false, error: 'Token missing phone_number' }, { status: 400 });
    }

    // Standardize to E.164 (ensure + prefix)
    const e164Phone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;

    // STEP B: Supabase Identity Resolution
    let sbUser: any = null;
    
    // First, look up the user by phone
    try {
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) throw error;
      
      sbUser = users.users.find(u => u.phone === e164Phone || u.phone === e164Phone.replace('+', ''));
    } catch (e) {
      console.error('Error fetching users:', e);
    }

    // If not found, create a new user
    if (!sbUser) {
      try {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone: e164Phone,
          phone_confirm: true, // Auto-confirm since Firebase verified it
        });

        if (createError) {
          throw createError;
        }
        sbUser = newUser.user;
      } catch (e: any) {
        // Handle race conditions where user was created immediately between our check and create
        console.error('Create User Error:', e);
        if (e.message?.includes('already exists') || e.code === '23505') {
           const { data: users } = await supabaseAdmin.auth.admin.listUsers();
           sbUser = users.users.find((u: any) => u.phone === e164Phone || u.phone === e164Phone.replace('+', ''));
        } else {
           return NextResponse.json({ success: false, error: 'Failed to create user in Supabase' }, { status: 500 });
        }
      }
    }

    if (!sbUser) {
       return NextResponse.json({ success: false, error: 'Identity resolution failed' }, { status: 500 });
    }

    // STEP C: Public Data Synchronization
    // Make sure the user exists in public.users to satisfy foreign keys
    await supabaseAdmin
      .from('users')
      .upsert({ id: sbUser.id, phone: e164Phone, name: 'User', role: 'USER' }, { onConflict: 'id' });

        // STEP D: Token Minting
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.error('CRITICAL: SUPABASE_JWT_SECRET is not configured in .env.local');
      return NextResponse.json({ success: false, error: 'Server misconfiguration: missing jwt secret' }, { status: 500 });
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const alg = 'HS256';
    
    // Create a Supabase-compatible JWT
    const accessToken = await new SignJWT({
      aud: 'authenticated',
      role: 'authenticated',
      phone: e164Phone,
      app_metadata: {
        provider: 'phone',
        providers: ['phone']
      }
    })
      .setProtectedHeader({ alg, typ: 'JWT' })
      .setSubject(sbUser.id)
      .setIssuedAt()
      .setExpirationTime('30d') // Hard expire in 30 days since we don't have refresh tokens
      .sign(secret);

    return NextResponse.json({
      success: true,
      access_token: accessToken,
      user_id: sbUser.id,
      phone: e164Phone
    });

  } catch (error: any) {
    console.error('Exchange error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
