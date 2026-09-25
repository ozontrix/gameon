'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/db/supabase';
import { NotificationService } from '@/lib/services/notification.service';
import { NOT_ALLOWED, formValues, invalid, type ActionState } from '../action-result';
import { recordAudit } from '../audit';
import { SURFACE_TYPES, WEEKDAYS } from '../constants';
import { formatDate, todayIn } from '../format';
import { authorize } from '../session';
import { readImageField, removeImage, uploadImage } from '../storage';

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
  booking_window_days: z.coerce
    .number({ error: 'Enter how many days ahead bookings open.' })
    .int('Use whole days.')
    .min(1, 'Bookings must open at least 1 day ahead.')
    .max(365, 'Use 365 days or fewer.'),
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
  const openDays: { venue_id: string; day_of_week: number; open_time: string; close_time: string }[] = [];
  const closedDays: number[] = [];

  WEEKDAYS.forEach((dayName, day) => {
    if (values[`closed_${day}`] === 'on') {
      closedDays.push(day);
      return;
    }
    const open = values[`open_${day}`];
    const close = values[`close_${day}`];

    if (!open || !TIME.test(open) || !close || !TIME.test(close)) {
      fieldErrors[`day_${day}`] = `Set opening and closing times for ${dayName}, or mark it closed.`;
      return;
    }
    if (close <= open) {
      fieldErrors[`day_${day}`] = `${dayName}: closing time must be after opening time.`;
      return;
    }
    openDays.push({
      venue_id: venueId.data,
      day_of_week: day,
      open_time: `${open}:00`,
      close_time: `${close}:00`,
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
    open_days: openDays.map(({ day_of_week, open_time, close_time }) => ({
      day: WEEKDAYS[day_of_week],
      open_time,
      close_time,
    })),
    closed_days: closedDays.map((day) => WEEKDAYS[day]),
  });
  refreshCatalog();
  return { ok: true, message: 'Opening hours saved. Existing bookings are not moved.' };
}

/* ─── Court types ────────────────────────────────────────────────────────── */

const courtTypeSchema = z.object({
  id: z.string().uuid().optional(),
  venue_id: uuid,
  sport_id: uuid,
  slug: z
    .string({ error: 'Enter a slug.' })
    .min(2, 'Enter a slug.')
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.'),
  name: z.string({ error: 'Enter the court type name.' }).min(2, 'Enter the court type name.').max(120),
  description: z.string().max(600, 'Keep the description under 600 characters.').optional(),
  surface_type: z.enum(SURFACE_TYPES, { error: 'Choose a surface.' }),
  max_players: z.coerce
    .number({ error: 'Enter the player limit.' })
    .int()
    .min(1, 'Must be at least 1.')
    .max(200, 'Must be 200 or fewer.'),
  sort_order: z.coerce.number().int().min(0).max(999).optional(),
  is_indoor: checkbox,
  has_ac: checkbox,
  is_active: checkbox,
});

export async function saveCourtType(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = courtTypeSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...raw } = parsed.data;
  const values = {
    ...raw,
    description: raw.description?.trim() || null,
    sort_order: raw.sort_order ?? 0,
  };

  if (!id) {
    const { data, error } = await supabaseAdmin.from('court_types').insert(values).select('id').single();
    if (error) {
      console.error('[admin] create court type failed', error);
      return {
        ok: false,
        message:
          error.code === '23505'
            ? 'That slug is already used by another court type at this venue.'
            : 'Could not create the court type.',
      };
    }
    await recordAudit(actor, 'court_type.create', 'court_type', data.id, values);
    refreshCatalog();
    redirect(`/admin/court-types/${data.id}?created=1`);
  }

  const { data: before } = await supabaseAdmin
    .from('court_types')
    .select('is_active')
    .eq('id', id)
    .maybeSingle();

  // Its courts follow a venue change on their own: the composite foreign key
  // from facilities cascades on update.

  const { error } = await supabaseAdmin.from('court_types').update(values).eq('id', id);
  if (error) {
    console.error('[admin] update court type failed', error);
    return {
      ok: false,
      message:
        error.code === '23505'
          ? 'That slug is already used by another court type at this venue.'
          : 'Could not save the court type.',
    };
  }
  await recordAudit(actor, 'court_type.update', 'court_type', id, values);
  refreshCatalog();

  const notes: string[] = ['Court type saved.'];
  if (before?.is_active !== false && !values.is_active) {
    notes.push('It and its courts no longer take bookings.');
  }
  return { ok: true, message: notes.join(' ') };
}

/* ─── Court type slot options ───────────────────────────────────────────── */

const slotOptionSchema = z.object({
  id: z.string().uuid().optional(),
  court_type_id: uuid,
  duration_minutes: z.coerce
    .number({ error: 'Enter the slot length.' })
    .int('Use whole minutes.')
    .min(5, 'A slot must be at least 5 minutes.')
    .max(720, 'A slot can be at most 12 hours.'),
  price: z.coerce
    .number({ error: 'Enter the price.' })
    .positive('The price must be more than ₹0.')
    .max(100_000, 'That price looks too high.'),
  is_active: checkbox,
});

/** Adds a slot length to a court type, or edits one (its length, price, or whether it's on sale). */
export async function saveSlotOption(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = slotOptionSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...values } = parsed.data;

  const { data: before } = id
    ? await supabaseAdmin.from('court_type_slot_options').select('duration_minutes, price').eq('id', id).maybeSingle()
    : { data: null };

  const { error } = id
    ? await supabaseAdmin.from('court_type_slot_options').update(values).eq('id', id)
    : await supabaseAdmin.from('court_type_slot_options').insert(values);
  if (error) {
    console.error('[admin] save slot option failed', error);
    return {
      ok: false,
      message:
        error.code === '23505'
          ? `This court type already sells ${values.duration_minutes}-minute slots.`
          : 'Could not save the slot option.',
    };
  }

  await recordAudit(actor, id ? 'court_type.slot_updated' : 'court_type.slot_added', 'court_type', values.court_type_id, {
    ...values,
    ...(before ? { previous: before } : {}),
  });
  refreshCatalog();

  const notes = [id ? 'Slot option saved.' : 'Slot option added.'];
  if (before && (Number(before.price) !== values.price || before.duration_minutes !== values.duration_minutes)) {
    notes.push('Existing bookings keep what they were booked at.');
  }
  return { ok: true, message: notes.join(' ') };
}

/** Stops selling a slot length. Bookings already made in it are unaffected. */
export async function deleteSlotOption(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Unknown slot option.' };

  const { data, error } = await supabaseAdmin
    .from('court_type_slot_options')
    .delete()
    .eq('id', id.data)
    .select('court_type_id, duration_minutes, price')
    .maybeSingle();
  if (error) {
    console.error('[admin] delete slot option failed', error);
    return { ok: false, message: 'Could not remove the slot option.' };
  }
  if (!data) return { ok: false, message: 'That slot option was already removed.' };

  await recordAudit(actor, 'court_type.slot_removed', 'court_type', data.court_type_id, data);
  refreshCatalog();
  return { ok: true, message: `${data.duration_minutes}-minute slots removed. Existing bookings are unaffected.` };
}

/* ─── Court type photos ─────────────────────────────────────────────────── */

const MAX_COURT_TYPE_PHOTOS = 10;

/** Adds an uploaded photo to the end of a court type's gallery. */
export async function addCourtTypeImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const courtTypeId = z.string().uuid().safeParse(formData.get('courtTypeId'));
  if (!courtTypeId.success) return { ok: false, message: 'Unknown court type.' };

  const image = await readImageField(formData, 'image');
  if (!image) return { ok: false, message: 'Choose a photo to upload.' };
  if ('error' in image) return { ok: false, message: image.error };

  const { data: existing } = await supabaseAdmin
    .from('court_type_images')
    .select('sort_order')
    .eq('court_type_id', courtTypeId.data)
    .order('sort_order', { ascending: false });
  if ((existing?.length ?? 0) >= MAX_COURT_TYPE_PHOTOS) {
    return { ok: false, message: `A court type can have up to ${MAX_COURT_TYPE_PHOTOS} photos.` };
  }

  let url: string;
  try {
    url = await uploadImage(image, 'court-types');
  } catch (error) {
    console.error('[admin] court type photo upload failed', error);
    return { ok: false, message: 'Could not upload the photo. Please try again.' };
  }

  const { data, error } = await supabaseAdmin
    .from('court_type_images')
    .insert({ court_type_id: courtTypeId.data, url, sort_order: (existing?.[0]?.sort_order ?? -1) + 1 })
    .select('id')
    .single();
  if (error) {
    await removeImage(url);
    console.error('[admin] save court type photo failed', error);
    return { ok: false, message: 'Could not save the photo.' };
  }

  await recordAudit(actor, 'court_type.photo_added', 'court_type', courtTypeId.data, { imageId: data.id });
  refreshCatalog();
  return { ok: true, message: 'Photo added.' };
}

/** Removes one photo, and the file too if this panel uploaded it. */
export async function deleteCourtTypeImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('imageId'));
  if (!id.success) return { ok: false, message: 'Unknown photo.' };

  const { data, error } = await supabaseAdmin
    .from('court_type_images')
    .delete()
    .eq('id', id.data)
    .select('court_type_id, url')
    .maybeSingle();
  if (error) {
    console.error('[admin] delete court type photo failed', error);
    return { ok: false, message: 'Could not remove the photo.' };
  }
  if (!data) return { ok: false, message: 'That photo was already removed.' };

  await removeImage(data.url);
  await recordAudit(actor, 'court_type.photo_removed', 'court_type', data.court_type_id, { imageId: id.data });
  refreshCatalog();
  return { ok: true, message: 'Photo removed.' };
}

/** Swaps a photo with its neighbour, so the gallery can be reordered (and the cover changed). */
export async function moveCourtTypeImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('imageId'));
  const direction = z.enum(['up', 'down']).safeParse(formData.get('direction'));
  if (!id.success || !direction.success) return { ok: false, message: 'Unknown photo.' };

  const { data: photo } = await supabaseAdmin
    .from('court_type_images')
    .select('id, court_type_id')
    .eq('id', id.data)
    .maybeSingle();
  if (!photo) return { ok: false, message: 'That photo no longer exists.' };

  const { data: gallery } = await supabaseAdmin
    .from('court_type_images')
    .select('id')
    .eq('court_type_id', photo.court_type_id)
    .order('sort_order')
    .order('created_at');
  const order = (gallery ?? []).map((entry) => entry.id);
  const from = order.indexOf(photo.id);
  const to = direction.data === 'up' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= order.length) return { ok: true, message: 'Order unchanged.' };

  [order[from], order[to]] = [order[to], order[from]];
  // Rewrite every position, which also repairs any gaps or ties left behind.
  const results = await Promise.all(
    order.map((imageId, index) =>
      supabaseAdmin.from('court_type_images').update({ sort_order: index }).eq('id', imageId)
    )
  );
  if (results.some((result) => result.error)) {
    console.error('[admin] reorder court type photos failed', results.find((result) => result.error)?.error);
    return { ok: false, message: 'Could not reorder the photos.' };
  }

  await recordAudit(actor, 'court_type.photos_reordered', 'court_type', photo.court_type_id, { order });
  refreshCatalog();
  return { ok: true, message: 'Photo order saved.' };
}

/* ─── Courts ─────────────────────────────────────────────────────────────── */

const courtSchema = z.object({
  id: z.string().uuid().optional(),
  court_type_id: uuid,
  name: z.string({ error: 'Enter the court name.' }).min(2, 'Enter the court name.').max(120),
  is_active: checkbox,
});

export async function saveCourt(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = courtSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...values } = parsed.data;

  // A court sits at whatever venue its type does; the composite foreign key
  // rejects any other pairing, so derive it rather than ask for it.
  const { data: courtType } = await supabaseAdmin
    .from('court_types')
    .select('venue_id')
    .eq('id', values.court_type_id)
    .maybeSingle();
  if (!courtType) return { ok: false, message: 'Choose a court type.' };
  const row = { ...values, venue_id: courtType.venue_id };

  if (!id) {
    const { data, error } = await supabaseAdmin.from('facilities').insert(row).select('id').single();
    if (error) {
      console.error('[admin] create court failed', error);
      return { ok: false, message: 'Could not create the court.' };
    }
    await recordAudit(actor, 'court.create', 'court', data.id, row);
    refreshCatalog();
    redirect(`/admin/courts/${data.id}?created=1`);
  }

  const { data: before } = await supabaseAdmin.from('facilities').select('is_active').eq('id', id).maybeSingle();
  const { error } = await supabaseAdmin.from('facilities').update(row).eq('id', id);
  if (error) {
    console.error('[admin] update court failed', error);
    return { ok: false, message: 'Could not save the court.' };
  }
  await recordAudit(actor, 'court.update', 'court', id, row);
  refreshCatalog();

  const notes: string[] = ['Court saved.'];
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
  );

  // Customers with an app account hear about it straight away.
  for (const booking of overlapping) {
    await NotificationService.notifyBooking(booking.id, {
      type: 'closure',
      closureId: data.id,
      allDay: !values.start_time,
      startTime: values.start_time,
      endTime: values.end_time,
      reason: input.reason,
      wholeVenue: !input.facility_id,
    });
  }

  refreshCatalog();
  return {
    ok: true,
    message: overlapping.length
      ? `Closure added for ${formatDate(input.date)}. ${overlapping.length} confirmed booking(s) fall inside it — the customers were notified in the app; cancel or move the bookings from Bookings.`
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
