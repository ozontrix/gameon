import 'server-only';

import { supabaseAdmin } from '@/lib/db/supabase';
import { PAGE_SIZE } from '../constants';

export async function getReferralSettings() {
  const { data, error } = await supabaseAdmin
    .from('referral_settings')
    .select('signup_bonus_points, first_booking_bonus_points')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? { signup_bonus_points: 0, first_booking_bonus_points: 0 };
}

/** Everyone who signed up with someone's code, newest first, with who referred them. */
export async function listReferrals(page: number) {
  const from = (page - 1) * PAGE_SIZE;
  const { data: referees, count, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone, email, referred_by, referral_bonus_paid, created_at', { count: 'exact' })
    .not('referred_by', 'is', null)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;

  const referrerIds = [...new Set((referees ?? []).map((r) => r.referred_by).filter((id): id is string => Boolean(id)))];
  const { data: referrers } = referrerIds.length
    ? await supabaseAdmin.from('profiles').select('id, full_name, phone, email').in('id', referrerIds)
    : { data: [] };
  const referrerById = new Map((referrers ?? []).map((referrer) => [referrer.id, referrer]));

  return {
    total: count ?? 0,
    rows: (referees ?? []).map((referee) => ({
      ...referee,
      referrer: referee.referred_by ? referrerById.get(referee.referred_by) ?? null : null,
    })),
  };
}
