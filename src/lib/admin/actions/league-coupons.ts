'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { CouponFormSchema } from '@/lib/league/coupons';
import { authorize } from '../session';
import { recordAudit } from '../audit';
import { NOT_ALLOWED, type ActionState } from '../action-result';

export async function createLeagueCoupon(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;
  const parsed = CouponFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid coupon settings.' };
  try {
    const { data, error } = await supabaseAdmin.from('league_coupons').insert(parsed.data).select('id').single();
    if (error) return { ok: false, message: error.code === '23505' ? 'That coupon code already exists. Use a new code.' : 'Coupon could not be created.' };
    await recordAudit(actor, 'league.coupon_create', 'league_coupon', data.id, parsed.data);
    revalidatePath('/admin/multisports-league/coupons');
    return { ok: true, message: 'Coupon created. It is now available at League checkout.' };
  } catch (error) {
    console.error('League coupon creation:', error);
    return { ok: false, message: 'Coupon could not be created. Refresh before retrying.' };
  }
}

export async function setLeagueCouponActive(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;
  const parsed = z.object({ id: z.uuid(), active: z.enum(['true', 'false']) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: 'Invalid coupon.' };
  try {
    const active = parsed.data.active === 'true';
    const { data, error } = await supabaseAdmin.from('league_coupons').update({ active }).eq('id', parsed.data.id).select('id').single();
    if (error) throw error;
    await recordAudit(actor, 'league.coupon_status', 'league_coupon', data.id, { active });
    revalidatePath('/admin/multisports-league/coupons');
    return { ok: true, message: active ? 'Coupon activated; limits still apply.' : 'Coupon deactivated. Existing payment orders retain their promised discount.' };
  } catch (error) {
    console.error('League coupon status:', error);
    return { ok: false, message: 'Coupon status could not be changed.' };
  }
}