import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { verifyFirebaseIdToken } from '@/lib/firebase-token';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';
import { createPhoneSession, PhoneSessionError } from '@/lib/phone-session';

const exchangeSchema = z.object({
  firebaseToken: z.string().min(1).max(8192),
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
      const userId = await findOrCreatePhoneUser(e164Phone, validation.data.referralCode);

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

      return NextResponse.json({ success: true,
        ...await createPhoneSession(userId, e164Phone, firebaseUser.uid),
      }, { headers: { 'Cache-Control': 'no-store' } });

    } catch (error) {
      if (error instanceof PhoneSessionError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 401 });
      }
      console.error('Exchange error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
