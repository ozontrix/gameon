'use client';

import { createContext, useActionState, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import type { ActionState } from '@/lib/admin/action-result';
import { buttonClass, type ButtonSize, type ButtonVariant } from './ui';

type AdminAction<T> = (state: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;

const FormStateContext = createContext<ActionState<unknown>>(null);

/**
 * A `<form>` bound to an admin server action.
 *
 * Shows the action's message as a toast, exposes per-field errors to
 * {@link FieldError}, and can hand the result to `children` (e.g. to show a
 * one-time password). Works without JavaScript too, as a plain form post.
 */
export function ActionForm<T = undefined>({
  action,
  children,
  className,
  resetOnSuccess = false,
  toastOnSuccess = true,
  onSuccess,
}: {
  action: AdminAction<T>;
  children: ReactNode | ((state: ActionState<T>) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  toastOnSuccess?: boolean;
  onSuccess?: (state: Extract<ActionState<T>, { ok: true }>) => void;
}) {
  const [state, formAction] = useActionState<ActionState<T>, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (toastOnSuccess) toast.success(state.message);
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(state);
    } else {
      toast.error(state.message);
    }
    // Only when a new result arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <FormStateContext.Provider value={state}>
      <form ref={formRef} action={formAction} className={className} noValidate>
        {typeof children === 'function' ? children(state) : children}
      </form>
    </FormStateContext.Provider>
  );
}

/** The validation message for one field of the surrounding {@link ActionForm}. */
export function useFieldError(name: string): string | undefined {
  const state = useContext(FormStateContext);
  return state && !state.ok ? state.fieldErrors?.[name] : undefined;
}

export function FieldError({ name }: { name: string }) {
  const error = useFieldError(name);
  return error ? <p className="text-xs text-red-600">{error}</p> : null;
}

/** Shows the form-level failure message inline (in addition to the toast). */
export function FormMessage() {
  const state = useContext(FormStateContext);
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {state.message}
    </p>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  size = 'md',
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-disabled={pending}
      className={buttonClass(variant, size, className)}
    >
      {pending ? (
        <>
          <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />
          {pendingLabel ?? 'Saving…'}
        </>
      ) : (
        children
      )}
    </button>
  );
}
