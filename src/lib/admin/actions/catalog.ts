'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/db/supabase';
import { NOT_ALLOWED, formValues, invalid, type ActionState } from '../action-result';
import { recordAudit } from '../audit';
import { SLOT_DURATIONS, SURFACE_TYPES, WEEKDAYS } from '../constants';
import { formatDate, todayIn } from '../format';
import { authorize } from '../session';

const uuid = z.string({ error: 'Choose an option.' }).uuid('Choose an option.');
const checkbox = z
  .string()
  .optional()
  .transform((value) => value === 'on' || value === 'true');

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function refreshCatalog() {
  revalidatePath('/admin', 'layout');
}

/** The number of confirmed bookings still to be played on a venue or court. */
async function upcomingBookings(filter: { venueId?: string; facilityId?: string }) {
  let query = supabaseAdmin
    .from('bookings')
    .select('id, facilities!inner ( venue_id )', { count: 'exact', head: true })
    .eq('status', 'CONFIRMED')
    .gte('booking_date', todayIn());
  if (filter.facilityId) query = query.eq('facility_id', filter.facilityId);
  if (filter.venueId) query = query.eq('facilities.venue_id', filter.venueId);
  const { count } = await query;
  return count ?? 0;
}

/* ─── Venues ─────────────────────────────────────────────────────────────── */

const venueSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string({ error: 'Enter the venue name.' }).min(2, 'Enter the venue name.').max(120),
  address: z.string().max(300).optional(),
  timezone: z.string({ error: 'Choose a timezone.' }).refine(isTimeZone, 'Choose a valid timezone.'),
  is_active: checkbox,
});

export async function saveVenue(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = venueSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...fields } = parsed.data;
  const values = { ...fields, address: fields.address ?? null };

  if (!id) {
    const { data, error } = await supabaseAdmin.from('venues').insert(values).select('id').single();
    if (error) {
      console.error('[admin] create venue failed', error);
      return { ok: false, message: 'Could not create the venue.' };
    }
    await recordAudit(actor, 'venue.create', 'venue', data.id, values);
    refreshCatalog();
    redirect(`/admin/venues/${data.id}?created=1`);
  }

  const { error } = await supabaseAdmin.from('venues').update(values).eq('id', id);
  if (error) {
    console.error('[admin] update venue failed', error);
    return { ok: false, message: 'Could not save the venue.' };
  }
  await recordAudit(actor, 'venue.update', 'venue', id, values);
  refreshCatalog();

  const pending = values.is_active ? 0 : await upcomingBookings({ venueId: id });
  return {
    ok: true,
    message: pending
      ? `Venue saved and hidden from the app. ${pending} confirmed upcoming booking(s) are unaffected — review them.`
      : 'Venue saved.',
  };
}

/* ─── Operating hours ────────────────────────────────────────────────────── */

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveOperatingHours(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const values = formValues(formData);
  const venueId = uuid.safeParse(values.venueId);
  if (!venueId.success) return { ok: false, message: 'Unknown venue.' };

  const fieldErrors: Record<string, string> = {};
  const openDays: { venue_id: string; day_of_week: number; open_time: string; close_time: string; slot_duration_minutes: number }[] = [];
  const closedDays: number[] = [];

  WEEKDAYS.forEach((dayName, day) => {
    if (values[`closed_${day}`] === 'on') {
      closedDays.push(day);
      return;
    }
    const open = values[`open_${day}`];
    const close = values[`close_${day}`];
    const duration = Number(values[`duration_${day}`]);

    if (!open || !TIME.test(open) || !close || !TIME.test(close)) {
      fieldErrors[`day_${day}`] = `Set opening and closing times for ${dayName}, or mark it closed.`;
      return;
    }
    if (close <= open) {
      fieldErrors[`day_${day}`] = `${dayName}: closing time must be after opening time.`;
      return;
    }
    if (!(SLOT_DURATIONS as readonly number[]).includes(duration)) {
      fieldErrors[`day_${day}`] = `${dayName}: choose a slot length.`;
      return;
    }
    const [oh, om] = open.split(':').map(Number);
    const [ch, cm] = close.split(':').map(Number);
    if (ch * 60 + cm - (oh * 60 + om) < duration) {
      fieldErrors[`day_${day}`] = `${dayName}: the venue must be open for at least one ${duration}-minute slot.`;
      return;
    }
    openDays.push({
      venue_id: venueId.data,
      day_of_week: day,
      open_time: `${open}:00`,
      close_time: `${close}:00`,
      slot_duration_minutes: duration,
    });
  });

  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: 'Please fix the highlighted days.', fieldErrors };
  }

  if (openDays.length) {
    const { error } = await supabaseAdmin.from('operating_hours').upsert(openDays, { onConflict: 'venue_id,day_of_week' });
    if (error) {
      console.error('[admin] save hours failed', error);
      return { ok: false, message: 'Could not save the opening hours.' };
    }
  }
  if (closedDays.length) {
    const { error } = await supabaseAdmin
      .from('operating_hours')
      .delete()
      .eq('venue_id', venueId.data)
      .in('day_of_week', closedDays);
    if (error) {
      console.error('[admin] clear closed days failed', error);
      return { ok: false, message: 'Could not save the closed days.' };
    }
  }

  await recordAudit(actor, 'operating_hours.update', 'operating_hours', venueId.data, {
    open_days: openDays.map(({ day_of_week, open_time, close_time, slot_duration_minutes }) => ({
      day: WEEKDAYS[day_of_week],
      open_time,
      close_time,
      slot_duration_minutes,
    })),
    closed_days: closedDays.map((day) => WEEKDAYS[day]),
  });
  refreshCatalog();
  return { ok: true, message: 'Opening hours saved. Existing bookings are not moved.' };
}

/* ─── Courts ─────────────────────────────────────────────────────────────── */

const courtSchema = z.object({
  id: z.string().uuid().optional(),
  venue_id: uuid,
  sport_id: uuid,
  name: z.string({ error: 'Enter the court name.' }).min(2, 'Enter the court name.').max(120),
  surface_type: z.enum(SURFACE_TYPES, { error: 'Choose a surface.' }),
  price_per_hour: z.coerce
    .number({ error: 'Enter the hourly price.' })
    .positive('The hourly price must be more than ₹0.')
    .max(100_000, 'That price looks too high.'),
  is_indoor: checkbox,
  has_ac: checkbox,
  is_active: checkbox,
});

export async function saveCourt(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = courtSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...values } = parsed.data;

  if (!id) {
    const { data, error } = await supabaseAdmin.from('facilities').insert(values).select('id').single();
    if (error) {
      console.error('[admin] create court failed', error);
      return { ok: false, message: 'Could not create the court.' };
    }
    await recordAudit(actor, 'court.create', 'court', data.id, values);
    refreshCatalog();
    redirect(`/admin/courts/${data.id}?created=1`);
  }

  const { data: before } = await supabaseAdmin.from('facilities').select('price_per_hour, is_active').eq('id', id).maybeSingle();
  const { error } = await supabaseAdmin.from('facilities').update(values).eq('id', id);
  if (error) {
    console.error('[admin] update court failed', error);
    return { ok: false, message: 'Could not save the court.' };
  }
  await recordAudit(actor, 'court.update', 'court', id, {
    ...values,
    previous_price_per_hour: before?.price_per_hour ?? null,
  });
  refreshCatalog();

  const notes: string[] = ['Court saved.'];
  if (before && Number(before.price_per_hour) !== values.price_per_hour) {
    notes.push('The new price applies to new bookings only.');
  }
  if (before?.is_active !== false && !values.is_active) {
    const pending = await upcomingBookings({ facilityId: id });
    notes.push(
      pending
        ? `It no longer takes bookings, but ${pending} confirmed upcoming booking(s) remain — review them.`
        : 'It no longer takes bookings.'
    );
  }
  return { ok: true, message: notes.join(' ') };
}

/* ─── Sports ─────────────────────────────────────────────────────────────── */

const sportSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string({ error: 'Enter the sport name.' }).min(2, 'Enter the sport name.').max(60),
  is_active: checkbox,
});

export async function saveSport(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = sportSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...values } = parsed.data;

  const { data: duplicate } = await supabaseAdmin
    .from('sports')
    .select('id')
    .ilike('name', values.name)
    .neq('id', id ?? '00000000-0000-0000-0000-000000000000')
    .limit(1)
    .maybeSingle();
  if (duplicate) return { ok: false, message: 'A sport with that name already exists.', fieldErrors: { name: 'Already exists.' } };

  const { data, error } = id
    ? await supabaseAdmin.from('sports').update(values).eq('id', id).select('id').single()
    : await supabaseAdmin.from('sports').insert(values).select('id').single();

  if (error) {
    console.error('[admin] save sport failed', error);
    return { ok: false, message: 'Could not save the sport.' };
  }
  await recordAudit(actor, id ? 'sport.update' : 'sport.create', 'sport', data.id, values);
  refreshCatalog();
  return { ok: true, message: id ? 'Sport saved.' : `${values.name} added.` };
}

/* ─── Closures ───────────────────────────────────────────────────────────── */

const closureSchema = z
  .object({
    venue_id: uuid,
    facility_id: z.string().uuid().optional(),
    date: z.string({ error: 'Choose a date.' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
    all_day: checkbox,
    start_time: z.string().regex(TIME, 'Enter a start time.').optional(),
    end_time: z.string().regex(TIME, 'Enter an end time.').optional(),
    reason: z.string({ error: 'Give a reason, e.g. “Diwali” or “Floor repair”.' }).min(3, 'Give a reason.').max(200),
  })
  .superRefine((value, ctx) => {
    if (value.date < todayIn()) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Choose today or a later date.' });
    if (value.all_day) return;
    if (!value.start_time) ctx.addIssue({ code: 'custom', path: ['start_time'], message: 'Enter a start time.' });
    if (!value.end_time) ctx.addIssue({ code: 'custom', path: ['end_time'], message: 'Enter an end time.' });
    if (value.start_time && value.end_time && value.end_time <= value.start_time) {
      ctx.addIssue({ code: 'custom', path: ['end_time'], message: 'End time must be after the start time.' });
    }
  });

export async function createClosure(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = closureSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const input = parsed.data;

  if (input.facility_id) {
    const { data: court } = await supabaseAdmin.from('facilities').select('venue_id').eq('id', input.facility_id).maybeSingle();
    if (court?.venue_id !== input.venue_id) {
      return { ok: false, message: 'That court is not at the selected venue.', fieldErrors: { facility_id: 'Not at this venue.' } };
    }
  }

  const values = {
    venue_id: input.venue_id,
    facility_id: input.facility_id ?? null,
    date: input.date,
    start_time: input.all_day ? null : `${input.start_time}:00`,
    end_time: input.all_day ? null : `${input.end_time}:00`,
    reason: input.reason,
  };

  const { data, error } = await supabaseAdmin.from('holidays_and_closures').insert(values).select('id').single();
  if (error) {
    console.error('[admin] create closure failed', error);
    return { ok: false, message: 'Could not add the closure.' };
  }
  await recordAudit(actor, 'closure.create', 'closure', data.id, values);

  // Existing bookings are never removed automatically; tell the admin which ones clash.
  let clashes = supabaseAdmin
    .from('bookings')
    .select('id, start_time, end_time, facilities!inner ( venue_id )')
    .eq('booking_date', input.date)
    .eq('status', 'CONFIRMED')
    .eq('facilities.venue_id', input.venue_id);
  if (input.facility_id) clashes = clashes.eq('facility_id', input.facility_id);
  const { data: bookings } = await clashes;
  const overlapping = (bookings ?? []).filter(
    (b) => !values.start_time || (b.start_time < values.end_time! && b.end_time > values.start_time)
  ).length;

  refreshCatalog();
  return {
    ok: true,
    message: overlapping
      ? `Closure added for ${formatDate(input.date)}. ${overlapping} confirmed booking(s) fall inside it — cancel or move them from Bookings.`
      : `Closure added for ${formatDate(input.date)}.`,
  };
}

export async function deleteClosure(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = uuid.safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Unknown closure.' };

  const { data, error } = await supabaseAdmin
    .from('holidays_and_closures')
    .delete()
    .eq('id', id.data)
    .select('venue_id, facility_id, date, start_time, end_time, reason')
    .maybeSingle();

  if (error) {
    console.error('[admin] delete closure failed', error);
    return { ok: false, message: 'Could not remove the closure.' };
  }
  if (!data) return { ok: false, message: 'That closure was already removed.' };

  await recordAudit(actor, 'closure.delete', 'closure', id.data, data);
  refreshCatalog();
  return { ok: true, message: 'Closure removed. Those slots can be booked again.' };
}
