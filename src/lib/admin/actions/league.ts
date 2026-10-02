'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { NOT_ALLOWED, type ActionState } from '../action-result';
import { authorize } from '../session';
import { recordAudit } from '../audit';
import { getLeagueBooking } from '../queries/league';
import { deliverLeagueEmail } from '@/lib/league/bookings';

export async function retryLeagueEmail(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Unknown League booking.' };
  try {
    const booking = await getLeagueBooking(id.data);
    if (!booking || booking.status !== 'CONFIRMED') return { ok: false, message: 'Only confirmed entries can receive a pass.' };
    const confirmation = await deliverLeagueEmail(booking);
    await recordAudit(actor, 'league.email_retry', 'league_booking', booking.id, { sent: confirmation.emailSent });
    revalidatePath('/admin/multisports-league');
    revalidatePath(`/admin/multisports-league/${booking.id}`);
    return confirmation.emailSent ? { ok: true, message: 'Confirmation email sent.' } : { ok: false, message: 'Email is still sending or delivery failed. Refresh to see the latest status.' };
  } catch (error) { console.error('League email retry:', error); return { ok: false, message: 'Could not retry delivery. The paid entry remains saved.' }; }
}