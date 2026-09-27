'use client';

import { Trash2 } from 'lucide-react';

import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { inputClass, textareaClass } from '@/components/admin/ui';
import type { ActionState } from '@/lib/admin/action-result';

type Section = { id: string; title: string; body: string };
type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * The free-form blocks editor shared by tournaments and events — prizes,
 * rules, "what's on", written by an admin without a release. One component:
 * the two only differ in which hidden field names their owner id and which
 * actions save it.
 */
export function EventSectionsEditor({
  ownerId,
  ownerField,
  sections,
  saveAction,
  deleteAction,
}: {
  ownerId: string;
  /** The hidden field name both actions expect for the owner id, e.g. "tournament_id". */
  ownerField: string;
  sections: Section[];
  saveAction: Action;
  deleteAction: Action;
}) {
  return (
    <div className="space-y-4">
      {sections.length === 0 ? (
        <p className="text-sm text-zinc-500">No sections yet — the detail screen shows none until you add one.</p>
      ) : (
        <ul className="space-y-4 divide-y divide-zinc-100">
          {sections.map((section) => (
            <li key={section.id} className="space-y-2 pt-4 first:pt-0">
              <div className="flex flex-wrap items-start gap-3">
                <ActionForm action={saveAction} className="min-w-40 flex-1 space-y-1">
                  <input type="hidden" name="id" value={section.id} />
                  <input type="hidden" name={ownerField} value={ownerId} />
                  <label className="text-xs text-zinc-600">Heading</label>
                  <input name="title" defaultValue={section.title} className={inputClass} />
                  <textarea name="body" defaultValue={section.body} rows={3} className={`${textareaClass} mt-2`} />
                  <div className="flex items-center gap-2 pt-1">
                    <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
                      Save
                    </SubmitButton>
                    <FormMessage />
                  </div>
                  <FieldError name="title" />
                  <FieldError name="body" />
                </ActionForm>
                <ActionForm action={deleteAction}>
                  <input type="hidden" name="id" value={section.id} />
                  <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                    <Trash2 className="size-3.5" aria-hidden />
                    <span className="sr-only">Remove section</span>
                  </SubmitButton>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ActionForm action={saveAction} resetOnSuccess className="space-y-2 border-t border-zinc-200 pt-4">
        <input type="hidden" name={ownerField} value={ownerId} />
        <div className="space-y-1">
          <label className="text-xs text-zinc-600">Heading</label>
          <input name="title" placeholder="Prizes" className={inputClass} />
          <FieldError name="title" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-600">Text</label>
          <textarea name="body" rows={3} placeholder="Winner — ₹25,000 + trophy…" className={textareaClass} />
          <FieldError name="body" />
        </div>
        <SubmitButton size="sm" pendingLabel="Adding…">
          Add section
        </SubmitButton>
        <FormMessage />
      </ActionForm>
    </div>
  );
}
