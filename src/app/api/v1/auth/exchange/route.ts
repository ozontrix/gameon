import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';

const exchangeSchema = z.object({
  firebaseToken: z.string().min(1),
  // Only ever applied to a brand-new account — see findOrCreatePhoneUser.
  referralCode: z.string().trim().max(20).optional(),
});

/** The auth user registered with this phone number, if any. */
async function findUserIdByPhone(phone: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('auth_user_id_by_phone', { p_phone: phone });
  if (error) throw error;
  return data;
}

async function findOrCreatePhoneUser(phone: string, referralCode?: string): Promise<string> {
  const existing = await findUserIdByPhone(phone);
  if (existing) return existing; // Returning caller — a stray code here is a no-op, not re-applied.

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    phone,
    phone_confirm: true, // Auto-confirm since Firebase verified it
    user_metadata: referralCode ? { referral_code: referralCode } : undefined,
  });
  if (data.user) return data.user.id;

  // Created by a parallel request between the lookup and the insert
  if (error?.code === 'phone_exists' || /already/i.test(error?.message ?? '')) {
    const raced = await findUserIdByPhone(phone);
    if (raced) return raced;
  }
  throw error ?? new Error('Failed to create user in Supabase');
}

export async function POST(request: Request) {
  return withRateLimit(request, { limit: 10, windowMs: 60_000 }, async (req) => {
    try {
      const validation = exchangeSchema.safeParse(await req.json().catch(() => null));
      if (!validation.success) {
        return NextResponse.json({ success: false, error: 'Missing firebaseToken' }, { status: 400 });
      }

      // STEP A: Verify Firebase Token — never trust one we could not verify
      const firebaseAuth = getFirebaseAdminAuth();
      if (!firebaseAuth) {
        console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT is not configured; refusing phone sign-in.');
        return NextResponse.json(
          { success: false, error: 'Phone sign-in is not available right now.' },
          { status: 503 }
        );
      }

      let phoneNumber: string | undefined;
      try {
        const decodedToken = await firebaseAuth.verifyIdToken(validation.data.firebaseToken);
        phoneNumber = decodedToken.phone_number;
      } catch (e) {
        console.warn('Firebase token rejected:', e);
        return NextResponse.json(
          { success: false, error: 'Phone verification failed or expired. Please try again.' },
          { status: 401 }
        );
      }

      if (!phoneNumber) {
        return NextResponse.json({ success: false, error: 'Token missing phone_number' }, { status: 400 });
      }

      // Standardize to E.164 (ensure + prefix)
      const e164Phone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;

      // STEP B: Supabase Identity Resolution
      const userId = await findOrCreatePhoneUser(e164Phone, validation.data.referralCode);

      // STEP C: The profile row bookings belong to. Only the verified phone is
      // written, so a name the player chose is never overwritten.
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({ id: userId, phone: e164Phone }, { onConflict: 'id' });
      if (profileError) throw profileError;

      // STEP D: Token Minting
      const jwtSecret = process.env.SUPABASE_JWT_SECRET;
      if (!jwtSecret) {
        console.error('CRITICAL: SUPABASE_JWT_SECRET is not configured');
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
        .setSubject(userId)
        .setIssuedAt()
        .setExpirationTime('30d') // Hard expire in 30 days since we don't have refresh tokens
        .sign(secret);

      return NextResponse.json({
        success: true,
        access_token: accessToken,
        user_id: userId,
        phone: e164Phone
      });

    } catch (error) {
      console.error('Exchange error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
