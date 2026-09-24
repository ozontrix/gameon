import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { checkboxClass, inputClass } from '@/components/admin/ui';
import { saveCourt, saveCourtType, saveOperatingHours, saveVenue } from '@/lib/admin/actions/catalog';
import { SURFACE_TYPES, TIMEZONES, WEEKDAYS } from '@/lib/admin/constants';
import { titleCase } from '@/lib/admin/format';

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-800">
      {children}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
  );
}

function Checkbox({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-zinc-800">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className={`${checkboxClass} mt-0.5`} />
      <span>
        {label}
        {hint ? <span className="block text-xs text-zinc-500">{hint}</span> : null}
      </span>
    </label>
  );
}

/* ─── Venue ──────────────────────────────────────────────────────────────── */

export function VenueForm({
  venue,
}: {
  venue?: {
    id: string;
    name: string;
    address: string | null;
    timezone: string | null;
    booking_window_days: number;
    is_active: boolean | null;
  };
}) {
  const timezones: readonly string[] =
    venue?.timezone && !(TIMEZONES as readonly string[]).includes(venue.timezone) ? [venue.timezone, ...TIMEZONES] : TIMEZONES;

  return (
    <ActionForm action={saveVenue} className="space-y-4">
      {venue ? <input type="hidden" name="id" value={venue.id} /> : null}
      <FormMessage />
      <div className="space-y-1.5">
        <Label htmlFor="name" required>
          Name
        </Label>
        <input id="name" name="name" defaultValue={venue?.name} className={inputClass} required />
        <FieldError name="name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Address</Label>
        <input id="address" name="address" defaultValue={venue?.address ?? ''} className={inputClass} />
        <FieldError name="address" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="timezone" required>
          Timezone
        </Label>
        <select id="timezone" name="timezone" defaultValue={venue?.timezone ?? 'Asia/Kolkata'} className={inputClass}>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">Booking dates, &ldquo;today&rdquo; and check-in are judged on this clock.</p>
        <FieldError name="timezone" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="booking_window_days" required>
          Book up to (days ahead)
        </Label>
        <input
          id="booking_window_days"
          name="booking_window_days"
          type="number"
          min={1}
          max={365}
          step={1}
          defaultValue={venue?.booking_window_days ?? 14}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500">
          How far ahead the app offers dates, counting today as day 1. Front-desk bookings can go further.
        </p>
        <FieldError name="booking_window_days" />
      </div>
      <Checkbox
        name="is_active"
        label="Active"
        defaultChecked={venue ? venue.is_active !== false : true}
        hint="An inactive venue takes no new bookings, in the app or at the front desk."
      />
      <div className="flex justify-end">
        <SubmitButton>{venue ? 'Save venue' : 'Create venue'}</SubmitButton>
      </div>
    </ActionForm>
  );
}

/* ─── Opening hours ──────────────────────────────────────────────────────── */

export function OperatingHoursForm({
  venueId,
  hours,
}: {
  venueId: string;
  hours: { day_of_week: number; open_time: string; close_time: string }[];
}) {
  return (
    <ActionForm action={saveOperatingHours} className="space-y-4">
      <input type="hidden" name="venueId" value={venueId} />
      <FormMessage />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="py-2 pr-3 font-medium">Day</th>
              <th className="py-2 pr-3 font-medium">Opens</th>
              <th className="py-2 pr-3 font-medium">Closes</th>
              <th className="py-2 font-medium">Closed</th>
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((dayName, day) => {
              const row = hours.find((entry) => entry.day_of_week === day);
              return (
                <tr key={dayName} className="border-t border-zinc-100 align-top">
                  <td className="py-2 pr-3 font-medium text-zinc-900">
                    {dayName}
                    <FieldError name={`day_${day}`} />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="time"
                      name={`open_${day}`}
                      defaultValue={row?.open_time.slice(0, 5) ?? '06:00'}
                      className={inputClass}
                      aria-label={`${dayName} opening time`}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="time"
                      name={`close_${day}`}
                      defaultValue={row?.close_time.slice(0, 5) ?? '22:00'}
                      className={inputClass}
                      aria-label={`${dayName} closing time`}
                    />
                  </td>
                  <td className="py-2 align-middle">
                    <input
                      type="checkbox"
                      name={`closed_${day}`}
                      defaultChecked={!row}
                      className={checkboxClass}
                      aria-label={`Closed on ${dayName}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        Changes apply to slots offered from now on. Existing bookings keep their times — check the schedule after changing hours.
        Slot lengths and prices are set on each court type.
      </p>
      <div className="flex justify-end">
        <SubmitButton>Save hours</SubmitButton>
      </div>
    </ActionForm>
  );
}

/* ─── Court type (the priced product) ────────────────────────────────────── */

export function CourtTypeForm({
  courtType,
  venues,
  sports,
  defaultVenueId,
}: {
  courtType?: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    venue_id: string;
    sport_id: string;
    surface_type: string;
    is_indoor: boolean;
    has_ac: boolean;
    sort_order: number;
    is_active: boolean;
  };
  venues: { id: string; name: string }[];
  sports: { id: string; name: string; is_active: boolean | null }[];
  defaultVenueId?: string;
}) {
  return (
    <ActionForm action={saveCourtType} className="space-y-4">
      {courtType ? <input type="hidden" name="id" value={courtType.id} /> : null}
      <FormMessage />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" required>
            Name
          </Label>
          <input id="name" name="name" defaultValue={courtType?.name} placeholder="Badminton – Indoor Wooden (AC)" className={inputClass} />
          <p className="text-xs text-zinc-500">Shown as the card title in the app.</p>
          <FieldError name="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug" required>
            Slug
          </Label>
          <input id="slug" name="slug" defaultValue={courtType?.slug} placeholder="badminton-wooden-ac" className={inputClass} />
          <p className="text-xs text-zinc-500">Lowercase, hyphenated, unique within the venue.</p>
          <FieldError name="slug" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={2}
            defaultValue={courtType?.description ?? ''}
            placeholder="Sprung wooden floor, air-conditioned hall."
            className={inputClass}
          />
          <FieldError name="description" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="venue_id" required>
            Venue
          </Label>
          <select id="venue_id" name="venue_id" defaultValue={courtType?.venue_id ?? defaultVenueId ?? ''} className={inputClass}>
            <option value="" disabled>
              Choose a venue
            </option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
          <FieldError name="venue_id" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sport_id" required>
            Sport
          </Label>
          <select id="sport_id" name="sport_id" defaultValue={courtType?.sport_id ?? ''} className={inputClass}>
            <option value="" disabled>
              Choose a sport
            </option>
            {sports.map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
                {sport.is_active === false ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
          <FieldError name="sport_id" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="surface_type" required>
            Surface
          </Label>
          <select id="surface_type" name="surface_type" defaultValue={courtType?.surface_type ?? 'synthetic'} className={inputClass}>
            {(courtType && !(SURFACE_TYPES as readonly string[]).includes(courtType.surface_type)
              ? [courtType.surface_type, ...SURFACE_TYPES]
              : SURFACE_TYPES
            ).map((surface) => (
              <option key={surface} value={surface}>
                {titleCase(surface)}
              </option>
            ))}
          </select>
          <FieldError name="surface_type" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sort_order">Sort order</Label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            min={0}
            step="1"
            defaultValue={courtType?.sort_order ?? 0}
            className={inputClass}
          />
          <p className="text-xs text-zinc-500">Lower numbers come first in the app.</p>
          <FieldError name="sort_order" />
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <Checkbox name="is_indoor" label="Indoor" defaultChecked={courtType?.is_indoor ?? true} />
        <Checkbox name="has_ac" label="Air-conditioned" defaultChecked={courtType?.has_ac ?? false} />
        <Checkbox
          name="is_active"
          label="Taking bookings"
          defaultChecked={courtType ? courtType.is_active !== false : true}
          hint="Untick to hide this type and its courts from the app."
        />
      </div>
      <div className="flex justify-end">
        <SubmitButton>{courtType ? 'Save court type' : 'Create court type'}</SubmitButton>
      </div>
    </ActionForm>
  );
}

/* ─── Court (one bookable unit of a type) ────────────────────────────────── */

export function CourtForm({
  court,
  courtTypes,
  defaultCourtTypeId,
}: {
  court?: {
    id: string;
    name: string;
    court_type_id: string;
    is_active: boolean | null;
  };
  courtTypes: { id: string; name: string; venue_id: string; is_active: boolean | null }[];
  defaultCourtTypeId?: string;
}) {
  return (
    <ActionForm action={saveCourt} className="space-y-4">
      {court ? <input type="hidden" name="id" value={court.id} /> : null}
      <FormMessage />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" required>
            Court name
          </Label>
          <input id="name" name="name" defaultValue={court?.name} placeholder="Badminton Court 1" className={inputClass} />
          <FieldError name="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="court_type_id" required>
            Court type
          </Label>
          <select
            id="court_type_id"
            name="court_type_id"
            defaultValue={court?.court_type_id ?? defaultCourtTypeId ?? ''}
            className={inputClass}>
            <option value="" disabled>
              Choose a court type
            </option>
            {courtTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
                {type.is_active === false ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">Sets the surface, climate, venue and price for this court.</p>
          <FieldError name="court_type_id" />
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <Checkbox
          name="is_active"
          label="Taking bookings"
          defaultChecked={court ? court.is_active !== false : true}
          hint="Untick for maintenance or retired courts."
        />
      </div>
      <div className="flex justify-end">
        <SubmitButton>{court ? 'Save court' : 'Create court'}</SubmitButton>
      </div>
    </ActionForm>
  );
}
