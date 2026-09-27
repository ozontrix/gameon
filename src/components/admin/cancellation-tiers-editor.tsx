'use client';

import { Trash2 } from 'lucide-react';

import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { inputClass } from '@/components/admin/ui';
import { deleteCancellationTier, saveCancellationTier } from '@/lib/admin/actions/cancellation-policy';

type Tier = { id: string; applies_to: string; min_hours_before: number; refund_percent: number };

/**
 * "Cancel at least N hours before the slot and get X% back." Any number of
 * tiers; the one with the largest hours-before that a real cancellation still
 * clears is the one that applies, so they read best sorted largest-first,
 * which the query this component receives already does.
 */
export function CancellationTiersEditor({ appliesTo, tiers }: { appliesTo: string; tiers: Tier[] }) {
  return (
    <div className="space-y-4">
      {tiers.length === 0 ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No tiers configured — every cancellation currently gets a 0% refund. Add a tier below.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {tiers.map((tier) => (
            <li key={tier.id} className="flex flex-wrap items-end gap-3 py-3">
              <ActionForm action={saveCancellationTier} className="flex flex-1 flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={tier.id} />
                <input type="hidden" name="applies_to" value={appliesTo} />
                <label className="space-y-1 text-xs text-zinc-600">
                  At least this many hours before
                  <input
                    name="min_hours_before"
                    type="number"
                    min={0}
                    max={8760}
                    step={1}
                    defaultValue={tier.min_hours_before}
                    className={`${inputClass} w-32`}
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-600">
                  Refund %
                  <input
                    name="refund_percent"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    defaultValue={tier.refund_percent}
                    className={`${inputClass} w-24`}
                  />
                </label>
                <span className="pb-2 text-xs text-zinc-500">
                  Cancel ≥ {tier.min_hours_before}h before → {tier.refund_percent}% back
                </span>
                <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
                  Save
                </SubmitButton>
                <div className="w-full">
                  <FormMessage />
                  <FieldError name="min_hours_before" />
                  <FieldError name="refund_percent" />
                </div>
              </ActionForm>
              <ActionForm action={deleteCancellationTier}>
                <input type="hidden" name="id" value={tier.id} />
                <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                  <Trash2 className="size-3.5" aria-hidden />
                  <span className="sr-only">Remove tier</span>
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}

      <ActionForm
        action={saveCancellationTier}
        resetOnSuccess
        className="flex flex-wrap items-end gap-3 border-t border-zinc-200 pt-4"
      >
        <input type="hidden" name="applies_to" value={appliesTo} />
        <label className="space-y-1 text-xs text-zinc-600">
          At least this many hours before
          <input name="min_hours_before" type="number" min={0} max={8760} step={1} placeholder="24" className={`${inputClass} w-32`} />
        </label>
        <label className="space-y-1 text-xs text-zinc-600">
          Refund %
          <input name="refund_percent" type="number" min={0} max={100} step={1} placeholder="100" className={`${inputClass} w-24`} />
        </label>
        <SubmitButton size="sm" pendingLabel="Adding…">
          Add tier
        </SubmitButton>
        <div className="w-full">
          <FormMessage />
        </div>
      </ActionForm>
    </div>
  );
}
