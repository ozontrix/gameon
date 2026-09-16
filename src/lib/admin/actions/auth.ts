'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formValues, invalid, type ActionState } from '../action-result';

const signInSchema = z.object({
  email: z.string({ error: 'Enter your email address.' }).email('Enter a valid email address.'),
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.'),
  next: z.string().optional(),
});

/** Only same-site admin paths may be used as the post-login destination. */
function safeNext(next: string | undefined): string {
  return next && next.startsWith('/admin') && !next.startsWith('//') && !next.startsWith('/admin/login') ? next : '/admin';
}

export async function signIn(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { ok: false, message: 'That email and password combination is not valid.' };
  }

  const role = data.user.app_metadata?.role;
  if (role !== 'ADMIN' && role !== 'STAFF') {
    await supabase.auth.signOut();
    return { ok: false, message: 'This account does not have access to the admin panel.' };
  }

  redirect(safeNext(parsed.data.next));
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
