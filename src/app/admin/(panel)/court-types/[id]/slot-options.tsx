'use client';

import { Trash2 } from 'lucide-react';

import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { checkboxClass, inputClass } from '@/components/admin/ui';
import { deleteSlotOption, saveSlotOption } from '@/lib/admin/actions/catalog';
import { formatMoney } from '@/lib/admin/format';

type SlotOption = { id: string; duration_minutes: number; price: number; is_active: boolean };

/** `90` → `1 h 30 min`. */
function lengthLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} h` : '', rest ? `${rest} min` : ''].filter(Boolean).join(' ');
}

/**
 * The slot lengths this court type sells and the price of each. The player
 * picks one in the app; slots then run back-to-back from opening time in that
 * length, and that price is what's charged.
 */
export function SlotOptions({ courtTypeId, options }: { courtTypeId: string; options: SlotOption[] }) {
  return (
    <div className="space-y-4">
      {options.length === 0 ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No slot lengths yet — this card is hidden from the app until you add one.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {options.map((option) => (
            <li key={option.id} className="flex flex-wrap items-end gap-3 py-3">
              <ActionForm action={saveSlotOption} className="flex flex-1 flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={option.id} />
                <input type="hidden" name="court_type_id" value={courtTypeId} />
                <label className="space-y-1 text-xs text-zinc-600">
                  Length (min)
                  <input
                    name="duration_minutes"
                    type="number"
                    min={5}
                    max={720}
                    step={1}
                    defaultValue={option.duration_minutes}
                    className={`${inputClass} w-24`}
                  />
                </label>
                <label className="space-y-1 text-xs text-zinc-600">
                  Price (₹)
                  <input
                    name="price"
                    type="number"
                    min={1}
                    step={1}
                    defaultValue={Number(option.price)}
                    className={`${inputClass} w-28`}
                  />
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm text-zinc-800">
                  <input type="checkbox" name="is_active" defaultChecked={option.is_active} className={checkboxClass} />
                  On sale
                </label>
                <span className="pb-2 text-xs text-zinc-500">
                  {lengthLabel(option.duration_minutes)} for {formatMoney(option.price)}
                </span>
                <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
                  Save
                </SubmitButton>
                <div className="w-full">
                  <FormMessage />
                  <FieldError name="duration_minutes" />
                  <FieldError name="price" />
                </div>
              </ActionForm>
              <ActionForm action={deleteSlotOption}>
                <input type="hidden" name="id" value={option.id} />
                <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                  <Trash2 className="size-3.5" aria-hidden />
                  <span className="sr-only">Remove {option.duration_minutes}-minute slots</span>
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}

      <ActionForm action={saveSlotOption} resetOnSuccess className="flex flex-wrap items-end gap-3 border-t border-zinc-200 pt-4">
        <input type="hidden" name="court_type_id" value={courtTypeId} />
        <input type="hidden" name="is_active" value="on" />
        <label className="space-y-1 text-xs text-zinc-600">
          Length (min)
          <input name="duration_minutes" type="number" min={5} max={720} step={1} placeholder="60" className={`${inputClass} w-24`} />
        </label>
        <label className="space-y-1 text-xs text-zinc-600">
          Price (₹)
          <input name="price" type="number" min={1} step={1} placeholder="600" className={`${inputClass} w-28`} />
        </label>
        <SubmitButton size="sm" pendingLabel="Adding…">
          Add slot length
        </SubmitButton>
        <div className="w-full">
          <FormMessage />
          <FieldError name="duration_minutes" />
          <FieldError name="price" />
        </div>
      </ActionForm>
      <p className="text-xs text-zinc-500">
        Any length from 5 minutes to 12 hours, e.g. 15, 45 or 55. Slots start at opening time and run back-to-back in the
        chosen length. Price changes apply to new bookings only.
      </p>
    </div>
  );
}
