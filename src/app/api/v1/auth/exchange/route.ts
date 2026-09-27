import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { verifyFirebaseIdToken } from '@/lib/firebase-token';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';

const exchangeSchema = z.object({
  firebaseToken: z.string().min(1),
});

/** The auth user registered with this phone number, if any. */
async function findUserIdByPhone(phone: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc('auth_user_id_by_phone', { p_phone: phone });
  if (error) throw error;
  return data;
}

async function findOrCreatePhoneUser(phone: string): Promise<string> {
  const existing = await findUserIdByPhone(phone);
  if (existing) return existing;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    phone,
    phone_confirm: true, // Auto-confirm since Firebase verified it
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

      // STEP A: Verify the Firebase token — never trust a number we could not verify
      const firebaseUser = await verifyFirebaseIdToken(validation.data.firebaseToken);
      if (!firebaseUser) {
        return NextResponse.json(
          { success: false, error: 'Phone verification failed or expired. Please try again.' },
          { status: 401 }
        );
      }

      // Standardize to E.164 (ensure + prefix)
      const { phoneNumber } = firebaseUser;
      const e164Phone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;

      // STEP B: Supabase Identity Resolution
      const userId = await findOrCreatePhoneUser(e164Phone);

      // STEP C: The profile row bookings belong to. `handle_new_user` created it,
      // with its referral code, when the auth user above appeared — so this only
      // records the verified phone in E.164. An insert is deliberately avoided:
      // `profiles.referral_code` is NOT NULL and only the database mints one, so
      // proposing a row without it fails the whole exchange.
      const { data: profiled, error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ phone: e164Phone })
        .eq('id', userId)
        .select('id');
      if (profileError) throw profileError;

      if (!profiled?.length) {
        // An auth user the trigger never saw (one created before it existed).
        // Sign-in still works; the missing row has to be backfilled before the
        // player's profile screens have anything to read.
        console.error(`No profiles row for auth user ${userId} — run the profile backfill.`);
      }

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
