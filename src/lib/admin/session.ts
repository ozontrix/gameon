import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { supabaseAdmin } from '@/lib/db/supabase';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type StaffRole = 'ADMIN' | 'STAFF';

export type StaffSession = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
};

/**
 * The signed-in team member, or `null` for anyone else.
 *
 * `getUser()` asks Supabase Auth, so a revoked role or a deleted account takes
 * effect immediately — the role in a still-valid JWT is not trusted here.
 * Memoised per request.
 */
export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = user.app_metadata?.role;
  if (role !== 'ADMIN' && role !== 'STAFF') return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const email = user.email ?? '';
  return {
    id: user.id,
    email,
    name: profile?.full_name?.trim() || email.split('@')[0] || 'Team member',
    role,
  };
});

/** For admin pages: any team member, otherwise off to the login page. */
export async function requireStaff(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect('/admin/login');
  return session;
}

/** For admin-only pages: staff are sent back to the dashboard. */
export async function requireAdmin(): Promise<StaffSession> {
  const session = await requireStaff();
  if (session.role !== 'ADMIN') redirect('/admin?denied=1');
  return session;
}

/**
 * For server actions, which must never redirect a caller that is not allowed —
 * they get a failed result instead. Returns `null` when not permitted.
 */
export async function authorize(minimum: StaffRole): Promise<StaffSession | null> {
  const session = await getStaffSession();
  if (!session) return null;
  if (minimum === 'ADMIN' && session.role !== 'ADMIN') return null;
  return session;
}
