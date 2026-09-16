'use client';

import { useState } from 'react';

import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { checkboxClass, inputClass } from '@/components/admin/ui';
import { createClosure } from '@/lib/admin/actions/catalog';

export function ClosureForm({
  venues,
  courts,
  today,
}: {
  venues: { id: string; name: string }[];
  courts: { id: string; name: string; venue_id: string | null }[];
  today: string;
}) {
  const [venueId, setVenueId] = useState(venues[0]?.id ?? '');
  const [allDay, setAllDay] = useState(true);
  const venueCourts = courts.filter((court) => court.venue_id === venueId);

  return (
    <ActionForm action={createClosure} resetOnSuccess className="space-y-3">
      <FormMessage />
      <div className="space-y-1.5">
        <label htmlFor="venue_id" className="block text-sm font-medium text-zinc-800">
          Venue
        </label>
        <select id="venue_id" name="venue_id" value={venueId} onChange={(event) => setVenueId(event.target.value)} className={inputClass}>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
        <FieldError name="venue_id" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="facility_id" className="block text-sm font-medium text-zinc-800">
          Applies to
        </label>
        <select id="facility_id" name="facility_id" key={venueId} defaultValue="" className={inputClass}>
          <option value="">Whole venue</option>
          {venueCourts.map((court) => (
            <option key={court.id} value={court.id}>
              {court.name}
            </option>
          ))}
        </select>
        <FieldError name="facility_id" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="date" className="block text-sm font-medium text-zinc-800">
          Date
        </label>
        <input id="date" name="date" type="date" min={today} defaultValue={today} className={inputClass} />
        <FieldError name="date" />
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-800">
        <input
          type="checkbox"
          name="all_day"
          checked={allDay}
          onChange={(event) => setAllDay(event.target.checked)}
          className={checkboxClass}
        />
        Closed all day
      </label>
      {allDay ? null : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="start_time" className="block text-sm font-medium text-zinc-800">
              From
            </label>
            <input id="start_time" name="start_time" type="time" className={inputClass} />
            <FieldError name="start_time" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="end_time" className="block text-sm font-medium text-zinc-800">
              Until
            </label>
            <input id="end_time" name="end_time" type="time" className={inputClass} />
            <FieldError name="end_time" />
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <label htmlFor="reason" className="block text-sm font-medium text-zinc-800">
          Reason
        </label>
        <input id="reason" name="reason" placeholder="e.g. Diwali, floor repair, private event" className={inputClass} />
        <FieldError name="reason" />
      </div>
      <SubmitButton className="w-full">Add closure</SubmitButton>
    </ActionForm>
  );
}
