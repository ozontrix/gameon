'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/db/supabase';
import { NOT_ALLOWED, formValues, invalid, type ActionState } from '../action-result';
import { recordAudit } from '../audit';
import { authorize } from '../session';

const APPLIES_TO = ['booking', 'tournament', 'event'] as const;

function refresh() {
  revalidatePath('/admin/cancellation-policy');
}

const tierSchema = z.object({
  id: z.string().uuid().optional(),
  applies_to: z.enum(APPLIES_TO, { error: 'Choose what this tier applies to.' }),
  min_hours_before: z.coerce
    .number({ error: 'Enter how many hours ahead this tier requires.' })
    .int('Use a whole number of hours.')
    .min(0, 'Use 0 or more hours.')
    .max(8760, 'Use 8760 hours (one year) or fewer.'),
  refund_percent: z.coerce
    .number({ error: 'Enter the refund percentage.' })
    .int('Use a whole percentage.')
    .min(0, 'Use 0 or more.')
    .max(100, 'Use 100 or fewer.'),
});

export async function saveCancellationTier(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = tierSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...values } = parsed.data;

  if (!id) {
    const { data, error } = await supabaseAdmin.from('cancellation_policy_tiers').insert(values).select('id').single();
    if (error) {
      return {
        ok: false,
        message:
          error.code === '23505'
            ? `There's already a tier at ${values.min_hours_before} hours for this kind.`
            : 'Could not add the tier.',
      };
    }
    await recordAudit(actor, 'cancellation_policy.tier_added', 'cancellation_policy', data.id, values);
    refresh();
    return { ok: true, message: 'Tier added.' };
  }

  const { error } = await supabaseAdmin.from('cancellation_policy_tiers').update(values).eq('id', id);
  if (error) {
    console.error('[admin] update cancellation tier failed', error);
    return {
      ok: false,
      message:
        error.code === '23505'
          ? `There's already a tier at ${values.min_hours_before} hours for this kind.`
          : 'Could not save the tier.',
    };
  }
  await recordAudit(actor, 'cancellation_policy.tier_updated', 'cancellation_policy', id, values);
  refresh();
  return { ok: true, message: 'Tier saved.' };
}

export async function deleteCancellationTier(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Unknown tier.' };

  const { error } = await supabaseAdmin.from('cancellation_policy_tiers').delete().eq('id', id.data);
  if (error) {
    console.error('[admin] delete cancellation tier failed', error);
    return { ok: false, message: 'Could not remove the tier.' };
  }

  await recordAudit(actor, 'cancellation_policy.tier_removed', 'cancellation_policy', id.data, {});
  refresh();
  return { ok: true, message: 'Tier removed.' };
}
