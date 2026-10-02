import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { loadProfileIdentity, PROFILE_COLUMNS, profileContactSchema, profileResponse } from '@/lib/profile';

/**
 * Only the columns a player owns.
 *
 * Non-login contact details are editable but never verified by a PATCH.
 * The authenticated login contact is locked. `referral_code`, `referred_by`
 * and `referral_bonus_paid` are absent too — the database mints or pays them,
 * and column privileges now block a client from writing them at all.
 */
const updateProfileSchema = z.object({
  ...profileContactSchema,
  fullName: z.string().trim().min(2, 'Please enter your full name').max(80).optional(),
  city: z.string().trim().max(60).nullish(),
  gender: z.string().trim().max(40).nullish(),
  /** `YYYY-MM-DD`, or null to clear it. Must be a real date in the past. */
  dateOfBirth: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
    .refine((value) => {
      const at = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(at.getTime()) && at.getTime() < Date.now();
    }, 'That date of birth is not valid')
    .nullish(),
  /**
   * Lower-case sport slugs, matching the app's `SportKind`. Validated by shape
   * rather than a fixed list, so a sport added in the admin panel does not need
   * a code change here.
   */
  preferredSports: z
    .array(z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9-]{1,30}$/, 'Invalid sport'))
    .max(8)
    .optional(),
}).strict();

/**
 * The caller's own profile.
 *
 * Reads or creates: `handle_new_user` normally makes the row at sign-up, but a
 * user created before that trigger existed (or one whose row was removed) would
 * otherwise see an empty profile forever. The service role mints the referral
 * code the way the trigger does, so a healed row is indistinguishable from one
 * the trigger created.
 */
export async function GET(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (_req, user) => {
    try {
      const { auth, identity } = await loadProfileIdentity(user.id, user.provider);
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return NextResponse.json({ success: true, data: await profileResponse(data, identity) });

      // No row — heal it. `full_name` comes from the auth metadata the sign-up
      // screens set, so the player never lands on an empty profile.
      // `referral_code` is left out: the column defaults to
      // `generate_referral_code()`, so the database mints a unique code.
      const metaName = typeof auth.user_metadata?.full_name === 'string' ? auth.user_metadata.full_name : '';

      const { data: created, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          full_name: metaName.trim(),
          email: identity.email,
          phone: identity.phone,
        })
        .select(PROFILE_COLUMNS)
        .maybeSingle();

      // A parallel request won the race; its row is the one to return.
      if (insertError) {
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .eq('id', user.id)
          .maybeSingle();
        if (existing) return NextResponse.json({ success: true, data: await profileResponse(existing, identity) });
        throw insertError;
      }

      return NextResponse.json({ success: true, data: created ? await profileResponse(created, identity) : null });
    } catch (error) {
      console.error('Get Profile Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}

/** Updates the caller's own profile. Fields left out of the body are untouched. */
export async function PATCH(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const body = await req.json().catch(() => null);
      const parsed = updateProfileSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: parsed.error.issues[0]?.message ?? 'Invalid payload',
            details: parsed.error.format(),
          },
          { status: 400 },
        );
      }

      const input = parsed.data;
      const { identity } = await loadProfileIdentity(user.id, user.provider);
      if ((identity.loginProvider === 'email' && input.email !== undefined) ||
          (identity.loginProvider === 'phone' && input.phone !== undefined)) {
        return NextResponse.json({ success: false, error: 'Your sign-in contact cannot be changed here.' }, { status: 400 });
      }
      // Only what was sent, so omitting a field never clears it. An explicit
      // empty string or null clears it.
      const patch: {
        email?: string | null;
        phone?: string | null;
        full_name?: string;
        city?: string | null;
        gender?: string | null;
        date_of_birth?: string | null;
        preferred_sports?: string[];
      } = {};
      if (input.email !== undefined) patch.email = input.email;
      if (input.phone !== undefined) patch.phone = input.phone;
      if (input.fullName !== undefined) patch.full_name = input.fullName;
      if (input.city !== undefined) patch.city = input.city || null;
      if (input.gender !== undefined) patch.gender = input.gender || null;
      if (input.dateOfBirth !== undefined) patch.date_of_birth = input.dateOfBirth || null;
      if (input.preferredSports !== undefined) patch.preferred_sports = input.preferredSports;

      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(patch)
        .eq('id', user.id)
        .select(PROFILE_COLUMNS)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: await profileResponse(data, identity) });
    } catch (error) {
      console.error('Update Profile Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
