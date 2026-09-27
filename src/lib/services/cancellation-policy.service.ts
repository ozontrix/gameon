import { supabaseAdmin } from '../db/supabase';

export type CancellationAppliesTo = 'booking' | 'tournament' | 'event';

export type CancellationTier = {
  id: string;
  appliesTo: CancellationAppliesTo;
  minHoursBefore: number;
  refundPercent: number;
};

function toTier(row: {
  id: string;
  applies_to: string;
  min_hours_before: number;
  refund_percent: number;
}): CancellationTier {
  return {
    id: row.id,
    appliesTo: row.applies_to as CancellationAppliesTo,
    minHoursBefore: row.min_hours_before,
    refundPercent: row.refund_percent,
  };
}

export class CancellationPolicyService {
  /** Every tier for one kind, largest notice period first. */
  static async listTiers(appliesTo: CancellationAppliesTo): Promise<CancellationTier[]> {
    const { data, error } = await supabaseAdmin
      .from('cancellation_policy_tiers')
      .select('id, applies_to, min_hours_before, refund_percent')
      .eq('applies_to', appliesTo)
      .order('min_hours_before', { ascending: false });
    if (error) throw error;
    return data.map(toTier);
  }

  /**
   * The refund percentage for a cancellation made `hoursBeforeStart` ahead of
   * the slot — the tier with the largest `min_hours_before` that notice still
   * clears. A cancellation inside every configured tier (or a kind with no
   * tiers at all) gets 0%: the policy is opt-in, never assumed.
   */
  static async refundPercentFor(appliesTo: CancellationAppliesTo, hoursBeforeStart: number): Promise<number> {
    const tiers = await CancellationPolicyService.listTiers(appliesTo);
    const tier = tiers.find((t) => hoursBeforeStart >= t.minHoursBefore);
    return tier?.refundPercent ?? 0;
  }
}
