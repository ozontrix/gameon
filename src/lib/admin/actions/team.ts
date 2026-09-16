'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/db/supabase';
import { NOT_ALLOWED, formValues, invalid, type ActionState } from '../action-result';
import { recordAudit } from '../audit';
import { temporaryPassword } from '../passwords';
import { authorize } from '../session';

export type TeamCredentials = { email: string; temporaryPassword: string };

const roleSchema = z.enum(['ADMIN', 'STAFF'], { error: 'Choose a role.' });

async function adminCount(): Promise<number> {
  const { data } = await supabaseAdmin.rpc('admin_team_members');
  return (data ?? []).filter((member) => member.role === 'ADMIN').length;
}

/* ─── Add ────────────────────────────────────────────────────────────────── */

const addSchema = z.object({
  email: z.string({ error: 'Enter an email address.' }).email('Enter a valid email address.').max(254),
  fullName: z.string().max(80).optional(),
  role: roleSchema,
});

/**
 * Gives an existing account a team role, or creates the account with a
 * one-time password the admin hands over. Nothing is emailed.
 */
export async function addTeamMember(
  _state: ActionState<TeamCredentials>,
  formData: FormData
): Promise<ActionState<TeamCredentials>> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = addSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const email = parsed.data.email.toLowerCase();
  const { role, fullName } = parsed.data;

  const { data: existingId, error: lookupError } = await supabaseAdmin.rpc('auth_user_id_by_email', { p_email: email });
  if (lookupError) {
    console.error('[admin] team lookup failed', lookupError);
    return { ok: false, message: 'Could not look up that email address.' };
  }

  if (existingId) {
    const { data: existing } = await supabaseAdmin.auth.admin.getUserById(existingId);
    if (existing.user?.app_metadata?.role === role) {
      return { ok: false, message: `${email} is already ${role === 'ADMIN' ? 'an admin' : 'on the staff'}.` };
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(existingId, { app_metadata: { role } });
    if (error) {
      console.error('[admin] grant role failed', error);
      return { ok: false, message: 'Could not update that account.' };
    }
    if (fullName) {
      await supabaseAdmin.from('profiles').update({ full_name: fullName }).eq('id', existingId).eq('full_name', '');
    }

    await recordAudit(actor, 'team.grant_role', 'team_member', existingId, { email, role });
    revalidatePath('/admin/team');
    return { ok: true, message: `${email} can now sign in to the admin panel with their existing password.` };
  }

  const password = temporaryPassword();
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
    app_metadata: { role },
  });

  if (error || !created.user) {
    console.error('[admin] create team member failed', error);
    return { ok: false, message: error?.message ?? 'Could not create the account.' };
  }

  await recordAudit(actor, 'team.create', 'team_member', created.user.id, { email, role });
  revalidatePath('/admin/team');
  return {
    ok: true,
    message: `Account created for ${email}.`,
    data: { email, temporaryPassword: password },
  };
}

/* ─── Change role ────────────────────────────────────────────────────────── */

const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['ADMIN', 'STAFF', 'NONE'], { error: 'Choose a role.' }),
});

export async function changeTeamRole(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = changeRoleSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { userId, role } = parsed.data;

  if (userId === actor.id) {
    return { ok: false, message: 'You cannot change your own role. Ask another admin.' };
  }

  const { data: target } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (!target.user) return { ok: false, message: 'That account no longer exists.' };
  const currentRole = target.user.app_metadata?.role;
  if (currentRole === (role === 'NONE' ? undefined : role)) return { ok: true, message: 'No change.' };

  if (currentRole === 'ADMIN' && role !== 'ADMIN' && (await adminCount()) <= 1) {
    return { ok: false, message: 'There must always be at least one admin.' };
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    // A null value removes the key from app_metadata.
    app_metadata: { role: role === 'NONE' ? null : role },
  });
  if (error) {
    console.error('[admin] change role failed', error);
    return { ok: false, message: 'Could not change the role.' };
  }

  await recordAudit(actor, role === 'NONE' ? 'team.revoke_access' : 'team.change_role', 'team_member', userId, {
    email: target.user.email,
    from: currentRole ?? null,
    to: role === 'NONE' ? null : role,
  });
  revalidatePath('/admin/team');
  return {
    ok: true,
    message: role === 'NONE' ? `${target.user.email} no longer has admin panel access.` : `${target.user.email} is now ${role === 'ADMIN' ? 'an admin' : 'staff'}.`,
  };
}

/* ─── Reset password ─────────────────────────────────────────────────────── */

export async function resetTeamPassword(
  _state: ActionState<TeamCredentials>,
  formData: FormData
): Promise<ActionState<TeamCredentials>> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const userId = z.string().uuid().safeParse(formData.get('userId'));
  if (!userId.success) return { ok: false, message: 'Unknown team member.' };
  if (userId.data === actor.id) return { ok: false, message: 'Change your own password from My account.' };

  const { data: target } = await supabaseAdmin.auth.admin.getUserById(userId.data);
  const role = target.user?.app_metadata?.role;
  if (!target.user?.email || (role !== 'ADMIN' && role !== 'STAFF')) {
    return { ok: false, message: 'Only team members with an email login can be reset here.' };
  }

  const password = temporaryPassword();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId.data, { password });
  if (error) {
    console.error('[admin] reset password failed', error);
    return { ok: false, message: 'Could not reset the password.' };
  }

  await recordAudit(actor, 'team.reset_password', 'team_member', userId.data, { email: target.user.email });
  return {
    ok: true,
    message: `Password reset for ${target.user.email}.`,
    data: { email: target.user.email, temporaryPassword: password },
  };
}
