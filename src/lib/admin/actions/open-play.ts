'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/db/supabase';
import { deliverOpenPlayEmail } from '@/lib/open-play/server';
import { NOT_ALLOWED, type ActionState } from '../action-result';
import { authorize } from '../session';
import { recordAudit } from '../audit';

export async function retryOpenPlayEmail(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;
  const id = z.uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Unknown open play registration.' };
  try {
    const { data, error } = await supabaseAdmin.from('open_play_registrations').select('*').eq('id', id.data).maybeSingle();
    if (error || !data) return { ok: false, message: 'Registration not found.' };
    if (!data.email) return { ok: false, message: 'This older registration has no email address.' };
    const sent = await deliverOpenPlayEmail(data);
    await recordAudit(actor, 'open_play.email_retry', 'open_play_registration', data.id, { sent });
    revalidatePath('/admin/open-play-registrations');
    return sent ? { ok: true, message: 'Confirmation email sent.' } : { ok: false, message: 'Email is still sending or delivery failed. The registration remains saved.' };
  } catch { return { ok: false, message: 'Could not retry confirmation email. The registration remains saved.' }; }
}