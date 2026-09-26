'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/db/supabase';
import { NOT_ALLOWED, formValues, invalid, type ActionState } from '../action-result';
import { recordAudit } from '../audit';
import { authorize } from '../session';

const settingsSchema = z.object({
  signup_bonus_points: z.coerce.number().int().min(0).max(200_000),
  first_booking_bonus_points: z.coerce.number().int().min(0).max(200_000),
});

export async function saveReferralSettings(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = settingsSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);

  const { error } = await supabaseAdmin.from('referral_settings').update(parsed.data).eq('id', true);
  if (error) {
    console.error('[admin] save referral settings failed', error);
    return { ok: false, message: 'Could not save the referral settings.' };
  }

  await recordAudit(actor, 'referral_settings.update', 'referral', null, parsed.data);
  revalidatePath('/admin/referrals');
  return { ok: true, message: 'Referral settings saved.' };
}
