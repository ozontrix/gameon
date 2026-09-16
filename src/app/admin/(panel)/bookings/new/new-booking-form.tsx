'use client';

import { useState } from 'react';

import { ActionForm, FieldError, FormMessage, SubmitButton, useFieldError } from '@/components/admin/action-form';
import { inputClass, textareaClass } from '@/components/admin/ui';
import { createFrontDeskBooking } from '@/lib/admin/actions/bookings';
import { COUNTER_PAYMENT_METHODS } from '@/lib/admin/constants';
import { formatMoney, formatTimeRange, titleCase } from '@/lib/admin/format';
import { cn } from '@/lib/utils';

type SlotOption = { start_time: string; end_time: string; available: boolean; price: number };

function SlotPicker({ slots, initialSlot }: { slots: SlotOption[]; initialSlot?: string }) {
  const error = useFieldError('slot');
  const initial = slots.find((slot) => slot.available && slot.start_time === initialSlot);
  const [selected, setSelected] = useState(initial ? `${initial.start_time}|${initial.end_time}` : '');

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-800">
        Time slot <span className="text-red-600">*</span>
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {slots.map((slot) => {
          const value = `${slot.start_time}|${slot.end_time}`;
          const checked = selected === value;
          return (
            <label
              key={value}
              className={cn(
                'relative flex cursor-pointer flex-col rounded-lg border px-3 py-2 text-sm transition',
                !slot.available && 'cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400',
                slot.available && !checked && 'border-zinc-300 hover:border-zinc-500',
                checked && 'border-zinc-950 bg-zinc-950 text-white'
              )}
            >
              <input
                type="radio"
                name="slot"
                value={value}
                disabled={!slot.available}
                checked={checked}
                onChange={() => setSelected(value)}
                className="sr-only"
              />
              <span className="font-medium">{formatTimeRange(slot.start_time, slot.end_time)}</span>
              <span className={cn('text-xs', checked ? 'text-zinc-300' : 'text-zinc-500')}>
                {slot.available ? formatMoney(slot.price) : 'Unavailable'}
              </span>
            </label>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </fieldset>
  );
}

export function NewBookingForm({
  facilityId,
  date,
  slots,
  initialSlot,
}: {
  facilityId: string;
  date: string;
  slots: SlotOption[];
  initialSlot?: string;
}) {
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID'>('PAID');

  return (
    <ActionForm action={createFrontDeskBooking} className="space-y-6 px-5 py-4" toastOnSuccess={false}>
      <input type="hidden" name="facilityId" value={facilityId} />
      <input type="hidden" name="date" value={date} />
      <FormMessage />

      <SlotPicker slots={slots} initialSlot={initialSlot} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="contactName" className="block text-sm font-medium text-zinc-800">
            Customer name <span className="text-red-600">*</span>
          </label>
          <input id="contactName" name="contactName" autoComplete="off" className={inputClass} required />
          <FieldError name="contactName" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="contactPhone" className="block text-sm font-medium text-zinc-800">
            Phone <span className="text-red-600">*</span>
          </label>
          <input id="contactPhone" name="contactPhone" type="tel" inputMode="tel" placeholder="98765 43210" className={inputClass} required />
          <FieldError name="contactPhone" />
          <p className="text-xs text-zinc-500">If it matches an app account, the booking shows up in their app.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="players" className="block text-sm font-medium text-zinc-800">
            Players
          </label>
          <input id="players" name="players" type="number" min={1} max={50} className={inputClass} />
          <FieldError name="players" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-zinc-800">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={2} maxLength={200} className={textareaClass} />
          <FieldError name="notes" />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4">
        <legend className="px-1 text-sm font-medium text-zinc-800">Payment</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentStatus"
              value="PAID"
              checked={paymentStatus === 'PAID'}
              onChange={() => setPaymentStatus('PAID')}
            />
            Paid now
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="paymentStatus"
              value="UNPAID"
              checked={paymentStatus === 'UNPAID'}
              onChange={() => setPaymentStatus('UNPAID')}
            />
            Pay at the venue later
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {paymentStatus === 'PAID' ? (
            <div className="space-y-1.5">
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-zinc-800">
                Method <span className="text-red-600">*</span>
              </label>
              <select id="paymentMethod" name="paymentMethod" defaultValue="CASH" className={inputClass}>
                {COUNTER_PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {titleCase(method)}
                  </option>
                ))}
              </select>
              <FieldError name="paymentMethod" />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label htmlFor="amount" className="block text-sm font-medium text-zinc-800">
              Amount (₹)
            </label>
            <input id="amount" name="amount" type="number" min={0} step="0.01" placeholder="Court price" className={inputClass} />
            <FieldError name="amount" />
            <p className="text-xs text-zinc-500">Leave empty to charge the court&apos;s price. Complimentary is always ₹0.</p>
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Booking…">Confirm booking</SubmitButton>
      </div>
    </ActionForm>
  );
}
