import type { ZodError } from 'zod';

/** What every admin server action returns to the form that called it. */
export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** `useActionState` state before the first submission. */
export type ActionState<T = undefined> = ActionResult<T> | null;

export const NOT_ALLOWED: ActionResult<never> = {
  ok: false,
  message: "You don't have permission to do that.",
};

/** First validation message per field, keyed by the form field name. */
export function invalid(error: ZodError, message = 'Please fix the highlighted fields.'): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { ok: false, message, fieldErrors };
}

/** Reads a submitted form into a plain object for zod, turning empty strings into undefined. */
export function formValues(formData: FormData): Record<string, string | undefined> {
  const values: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    values[key] = trimmed === '' ? undefined : trimmed;
  }
  return values;
}
