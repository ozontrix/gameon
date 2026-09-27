'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { WalletError, WalletService } from '@/lib/services/wallet.service';
import { NOT_ALLOWED, formValues, invalid, type ActionState } from '../action-result';
import { recordAudit } from '../audit';
import { authorize } from '../session';

const adjustSchema = z.object({
  userId: z.string().uuid('Choose a valid customer.'),
  points: z.coerce
    .number({ error: 'Enter how many Points to credit or debit.' })
    .int('Points must be a whole number.')
    .refine((value) => value !== 0, 'Enter a non-zero amount.')
    .refine((value) => Math.abs(value) <= 200_000, 'That amount is too large.'),
  note: z
    .string({ error: 'Explain why — this is recorded in the activity log.' })
    .trim()
    .min(3, 'Explain why — this is recorded in the activity log.')
    .max(300),
});

/**
 * A manual credit or debit an admin makes directly — a goodwill gesture or a
 * correction, not something the cancellation policy or a booking computed.
 * Goes through the same wallet_adjust() as every other change, so it can
 * never overdraw a balance either.
 */
export async function adjustCustomerWallet(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = adjustSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { userId, points, note } = parsed.data;

  try {
    const balance = await WalletService.adjust(userId, points, 'admin_adjustment');
    await recordAudit(actor, 'wallet.admin_adjustment', 'wallet', userId, { points, note, balanceAfter: balance });
    revalidatePath(`/admin/customers/${userId}`);
    return {
      ok: true,
      message: `${points > 0 ? 'Credited' : 'Debited'} ${Math.abs(points)} Points. New balance: ${balance}.`,
    };
  } catch (error) {
    if (error instanceof WalletError) {
      return { ok: false, message: error.message };
    }
    console.error('[admin] wallet adjustment failed', error);
    return { ok: false, message: 'Could not adjust the wallet.' };
  }
}
