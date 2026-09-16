'use server';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/db/supabase';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/server';
import { NOT_ALLOWED, formValues, invalid, type ActionState } from '../action-result';
import { authorize } from '../session';

const passwordSchema = z
  .object({
    currentPassword: z.string({ error: 'Enter your current password.' }).min(1, 'Enter your current password.'),
    newPassword: z
      .string({ error: 'Choose a new password.' })
      .min(10, 'Use at least 10 characters.')
      .max(72, 'Use at most 72 characters.')
      .regex(/[a-z]/, 'Include a lowercase letter.')
      .regex(/[A-Z]/, 'Include an uppercase letter.')
      .regex(/\d/, 'Include a number.'),
    confirmPassword: z.string({ error: 'Repeat the new password.' }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'The passwords do not match.' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Choose a different password.' });

export async function changeOwnPassword(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('STAFF');
  if (!actor) return NOT_ALLOWED;

  const values = formValues(formData);
  const parsed = passwordSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);

  // Prove it is really them before changing the password — a left-open session is not enough.
  const verifier = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: actor.email,
    password: parsed.data.currentPassword,
  });
  if (verifyError) {
    return { ok: false, message: 'Your current password is not correct.', fieldErrors: { currentPassword: 'Not correct.' } };
  }
  // Revoke only the session this check just opened, not the admin's browser session.
  await verifier.auth.signOut({ scope: 'local' });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(actor.id, { password: parsed.data.newPassword });
  if (error) {
    console.error('[admin] change own password failed', error);
    return { ok: false, message: error.message || 'Could not change your password.' };
  }

  return { ok: true, message: 'Password changed.' };
}
