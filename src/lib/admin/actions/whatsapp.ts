'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { WhatsAppService } from '@/lib/services/whatsapp.service';
import { NOT_ALLOWED, invalid, type ActionState } from '../action-result';
import { recordAudit } from '../audit';
import { authorize } from '../session';

const idSchema = z.object({ id: z.string().uuid('Pick a delivery to resend.') });

function refreshPanel() {
  revalidatePath('/admin/whatsapp');
  revalidatePath('/admin/whatsapp/deliveries');
}

/** Resends one delivery a team member chose from the log. */
export async function retryWhatsAppDelivery(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return invalid(parsed.error);

  let result;
  try { result = await WhatsAppService.retryMessage(parsed.data.id); }
  catch { return { ok: false, message: 'Delivery service unavailable. Please try again.' }; }
  refreshPanel();
  if (!result.ok) return { ok: false, message: result.message };

  await recordAudit(actor, 'whatsapp.retry', 'whatsapp', parsed.data.id);
  refreshPanel();
  return { ok: true, message: result.message };
}

