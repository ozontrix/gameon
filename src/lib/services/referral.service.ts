import { supabaseAdmin } from '../db/supabase';

export type ReferralSummary = {
  code: string;
  signupBonusPoints: number;
  firstBookingBonusPoints: number;
  totalReferred: number;
  totalPointsEarned: number;
};

export class ReferralService {
  /** The caller's own code, the current admin-set amounts, and their referral stats. */
  static async getSummary(userId: string): Promise<ReferralSummary> {
    const [{ data: profile, error: profileError }, { data: settings }, { count: totalReferred }, { data: bonusRows }] =
      await Promise.all([
        supabaseAdmin.from('profiles').select('referral_code').eq('id', userId).maybeSingle(),
        supabaseAdmin.from('referral_settings').select('signup_bonus_points, first_booking_bonus_points').limit(1).maybeSingle(),
        supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', userId),
        supabaseAdmin.from('wallet_transactions').select('points').eq('user_id', userId).eq('reason', 'referral_bonus'),
      ]);
    if (profileError) throw profileError;

    return {
      code: profile?.referral_code ?? '',
      signupBonusPoints: settings?.signup_bonus_points ?? 0,
      firstBookingBonusPoints: settings?.first_booking_bonus_points ?? 0,
      totalReferred: totalReferred ?? 0,
      totalPointsEarned: (bonusRows ?? []).reduce((sum, row) => sum + row.points, 0),
    };
  }
}
