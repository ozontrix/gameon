import 'server-only';

import type { User } from '@supabase/supabase-js';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';

export const PROFILE_PHOTO_BUCKET = 'profile-photos';
export const PROFILE_COLUMNS =
  'id, full_name, email, phone, avatar_path, city, gender, date_of_birth, preferred_sports, created_at, updated_at';

export const profileContactSchema = {
  email: z.string().trim().toLowerCase().max(254).email('Please enter a valid email address').nullable().optional(),
  phone: z.string().trim().transform((value) => {
    const digits = value.replace(/[\s()-]/g, '');
    return /^\d{10}$/.test(digits) ? `+91${digits}` : digits;
  }).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Enter a 10-digit Indian number or an international number with country code')).nullable().optional(),
};

/** Auth records, not editable profile fields, are the verification authority. */
export function profileIdentity(auth: User, provider: 'email' | 'phone') {
  return {
    loginProvider: provider,
    email: provider === 'email' ? auth.email || null : null,
    phone: provider === 'phone' ? auth.phone || null : null,
    emailVerified: provider === 'email' && Boolean(auth.email && auth.email_confirmed_at),
    phoneVerified: provider === 'phone' && Boolean(auth.phone && auth.phone_confirmed_at),
  };
}

export async function loadProfileIdentity(id: string, provider: 'email' | 'phone') {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
  if (error || !data.user) throw error ?? new Error('Account not found');
  return { auth: data.user, identity: profileIdentity(data.user, provider) };
}

/** A temporary private photo URL; no browser or device gets the service key. */
export async function profileResponse<T extends { id: string; email: string | null; phone: string | null; avatar_path: string | null }>(
  row: T,
  identity: ReturnType<typeof profileIdentity>,
) {
  let avatarUrl: string | null = null;
  if (row.avatar_path?.startsWith(`${row.id}/`)) {
    const { data, error } = await supabaseAdmin.storage
      .from(PROFILE_PHOTO_BUCKET).createSignedUrl(row.avatar_path, 3600);
    if (error) console.error('Profile photo URL error:', error.message);
    else avatarUrl = data.signedUrl;
  }
  return {
    ...row,
    // Auth contact takes precedence only for the login identity. The other
    // field is a manually saved, unverified contact, never an auth update.
    email: identity.loginProvider === 'email' ? identity.email : row.email,
    phone: identity.loginProvider === 'phone' ? identity.phone : row.phone,
    avatarUrl,
    emailVerified: identity.emailVerified,
    phoneVerified: identity.phoneVerified,
    loginProvider: identity.loginProvider,
  };
}