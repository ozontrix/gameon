'use client';

import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { inputClass } from '@/components/admin/ui';
import { signIn } from '@/lib/admin/actions/auth';

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={signIn} className="space-y-4" toastOnSuccess={false}>
      <input type="hidden" name="next" value={next ?? ''} />
      <FormMessage />
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus className={inputClass} />
        <FieldError name="email" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
        <FieldError name="password" />
      </div>
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </ActionForm>
  );
}
