import 'server-only';

import { supabaseAdmin } from '@/lib/db/supabase';

/** Every configured tier, one kind at a time, largest notice period first. */
export async function listCancellationTiers(appliesTo: string) {
  const { data, error } = await supabaseAdmin
    .from('cancellation_policy_tiers')
    .select('id, applies_to, min_hours_before, refund_percent')
    .eq('applies_to', appliesTo)
    .order('min_hours_before', { ascending: false });
  if (error) throw error;
  return data;
}
