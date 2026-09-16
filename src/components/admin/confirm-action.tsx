'use client';

import { useRef, type ReactNode } from 'react';

import type { ActionState } from '@/lib/admin/action-result';
import { ActionForm, FieldError, SubmitButton } from './action-form';
import { buttonClass, inputClass, textareaClass, type ButtonSize, type ButtonVariant } from './ui';

type Input = {
  name: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
};

/**
 * A button that asks for confirmation (and optionally a reason or reference)
 * in a modal dialog before running an admin server action.
 */
export function ConfirmAction<T = undefined>({
  action,
  hidden,
  trigger,
  triggerVariant = 'secondary',
  triggerSize = 'sm',
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  inputs = [],
}: {
  action: (state: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;
  hidden: Record<string, string>;
  trigger: ReactNode;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  inputs?: Input[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" className={buttonClass(triggerVariant, triggerSize)} onClick={() => dialogRef.current?.showModal()}>
        {trigger}
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40"
      >
        <ActionForm<T> action={action} onSuccess={() => dialogRef.current?.close()} className="space-y-4 p-5">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <div className="mt-1 text-sm text-zinc-600">{description}</div> : null}
          </div>

          {inputs.map((input) => (
            <div key={input.name} className="space-y-1.5">
              <label htmlFor={`confirm-${input.name}`} className="block text-sm font-medium text-zinc-800">
                {input.label}
                {input.required ? <span className="text-red-600"> *</span> : null}
              </label>
              {input.multiline ? (
                <textarea
                  id={`confirm-${input.name}`}
                  name={input.name}
                  placeholder={input.placeholder}
                  required={input.required}
                  rows={3}
                  className={textareaClass}
                />
              ) : (
                <input
                  id={`confirm-${input.name}`}
                  name={input.name}
                  placeholder={input.placeholder}
                  required={input.required}
                  className={inputClass}
                />
              )}
              <FieldError name={input.name} />
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={buttonClass('secondary')} onClick={() => dialogRef.current?.close()}>
              Cancel
            </button>
            <SubmitButton variant={confirmVariant} pendingLabel="Working…">
              {confirmLabel}
            </SubmitButton>
          </div>
        </ActionForm>
      </dialog>
    </>
  );
}
