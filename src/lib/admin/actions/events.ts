'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/db/supabase';
import { DEFAULT_TIMEZONE, zonedTimeToUtc } from '@/lib/utils/date-helpers';
import { NOT_ALLOWED, formValues, invalid, type ActionState } from '../action-result';
import { recordAudit } from '../audit';
import { authorize } from '../session';
import { readImageField, removeImage, uploadImage } from '../storage';

const uuid = z.string({ error: 'Choose an option.' }).uuid('Choose an option.');
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const STATUSES = ['draft', 'published', 'registration_closed', 'completed', 'cancelled'] as const;
const MAX_GALLERY_PHOTOS = 8;

/** `<input type="datetime-local">` value on the venue's clock → ISO instant. */
const localDateTime = z
  .string({ error: 'Choose when registration closes.' })
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Choose when registration closes.')
  .transform((value) => {
    const [date, time] = value.split('T');
    return zonedTimeToUtc(date, `${time}:00`, DEFAULT_TIMEZONE).toISOString();
  });

function refreshEvents() {
  revalidatePath('/admin', 'layout');
}

/* ─── Tournaments ────────────────────────────────────────────────────────── */

const tournamentSchema = z
  .object({
    id: z.string().uuid().optional(),
    court_type_id: uuid,
    title: z.string({ error: 'Enter the tournament name.' }).min(2, 'Enter the tournament name.').max(120),
    match_type: z.string({ error: 'Enter the match type, e.g. Men’s Doubles.' }).min(2).max(80),
    description: z.string().max(2000).optional(),
    format: z.string().max(160).optional(),
    team_size_label: z.string().max(80).optional(),
    team_capacity: z.coerce
      .number({ error: 'Enter the number of team slots.' })
      .int('Use a whole number.')
      .min(2, 'At least 2 teams.')
      .max(512, 'Use 512 or fewer.'),
    entry_fee: z.coerce.number({ error: 'Enter the entry fee.' }).min(0).max(100000),
    starts_on: z.string({ error: 'Choose a start date.' }).regex(DATE, 'Choose a valid date.'),
    ends_on: z.string({ error: 'Choose an end date.' }).regex(DATE, 'Choose a valid date.'),
    daily_start_time: z.string({ error: 'Choose a start time.' }).regex(TIME, 'Choose a valid time.'),
    daily_end_time: z.string({ error: 'Choose an end time.' }).regex(TIME, 'Choose a valid time.'),
    registration_closes_at: localDateTime,
    status: z.enum(STATUSES, { error: 'Choose a status.' }),
  })
  .refine((v) => v.ends_on >= v.starts_on, { error: 'End date must be on or after the start date.', path: ['ends_on'] })
  .refine((v) => v.daily_end_time > v.daily_start_time, { error: 'End time must be after the start time.', path: ['daily_end_time'] });

export async function saveTournament(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = tournamentSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, court_type_id, description, format, team_size_label, ...rest } = parsed.data;

  // The venue always follows the chosen court type — never a second, separately
  // picked field that could disagree with it.
  const { data: courtType } = await supabaseAdmin.from('court_types').select('venue_id').eq('id', court_type_id).maybeSingle();
  if (!courtType) return { ok: false, message: 'Choose a court type.', fieldErrors: { court_type_id: 'Choose a court type.' } };

  const values = {
    ...rest,
    court_type_id,
    venue_id: courtType.venue_id,
    description: description?.trim() || null,
    format: format?.trim() || null,
    team_size_label: team_size_label?.trim() || null,
  };

  if (!id) {
    const { data, error } = await supabaseAdmin.from('tournaments').insert(values).select('id').single();
    if (error) {
      console.error('[admin] create tournament failed', error);
      return { ok: false, message: 'Could not create the tournament.' };
    }
    await recordAudit(actor, 'tournament.create', 'tournament', data.id, values);
    refreshEvents();
    redirect(`/admin/tournaments/${data.id}?created=1`);
  }

  // Shrinking capacity below teams already confirmed would silently strand them.
  const { count: confirmed } = await supabaseAdmin
    .from('tournament_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', id)
    .eq('status', 'CONFIRMED');
  if ((confirmed ?? 0) > values.team_capacity) {
    return {
      ok: false,
      message: `${confirmed} teams are already confirmed — team slots can't go below that.`,
      fieldErrors: { team_capacity: `At least ${confirmed} — teams are already confirmed.` },
    };
  }

  const { error } = await supabaseAdmin.from('tournaments').update(values).eq('id', id);
  if (error) {
    console.error('[admin] update tournament failed', error);
    return { ok: false, message: 'Could not save the tournament.' };
  }
  await recordAudit(actor, 'tournament.update', 'tournament', id, values);
  refreshEvents();
  return { ok: true, message: 'Tournament saved.' };
}

export async function addTournamentImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const tournamentId = z.string().uuid().safeParse(formData.get('tournamentId'));
  if (!tournamentId.success) return { ok: false, message: 'Unknown tournament.' };

  const image = await readImageField(formData, 'image');
  if (!image) return { ok: false, message: 'Choose a photo to upload.' };
  if ('error' in image) return { ok: false, message: image.error };

  const { data: existing } = await supabaseAdmin
    .from('tournament_images')
    .select('sort_order')
    .eq('tournament_id', tournamentId.data)
    .order('sort_order', { ascending: false });
  if ((existing?.length ?? 0) >= MAX_GALLERY_PHOTOS) {
    return { ok: false, message: `A tournament can have up to ${MAX_GALLERY_PHOTOS} photos.` };
  }

  let url: string;
  try {
    url = await uploadImage(image, 'tournaments');
  } catch (error) {
    console.error('[admin] tournament photo upload failed', error);
    return { ok: false, message: 'Could not upload the photo. Please try again.' };
  }

  const { data, error } = await supabaseAdmin
    .from('tournament_images')
    .insert({ tournament_id: tournamentId.data, url, sort_order: (existing?.[0]?.sort_order ?? -1) + 1 })
    .select('id')
    .single();
  if (error) {
    await removeImage(url);
    console.error('[admin] save tournament photo failed', error);
    return { ok: false, message: 'Could not save the photo.' };
  }

  await recordAudit(actor, 'tournament.photo_added', 'tournament', tournamentId.data, { imageId: data.id });
  refreshEvents();
  return { ok: true, message: 'Photo added.' };
}

export async function deleteTournamentImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('imageId'));
  if (!id.success) return { ok: false, message: 'Unknown photo.' };

  const { data, error } = await supabaseAdmin
    .from('tournament_images')
    .delete()
    .eq('id', id.data)
    .select('tournament_id, url')
    .maybeSingle();
  if (error) {
    console.error('[admin] delete tournament photo failed', error);
    return { ok: false, message: 'Could not remove the photo.' };
  }
  if (!data) return { ok: false, message: 'That photo was already removed.' };

  await removeImage(data.url);
  await recordAudit(actor, 'tournament.photo_removed', 'tournament', data.tournament_id, { imageId: id.data });
  refreshEvents();
  return { ok: true, message: 'Photo removed.' };
}

export async function moveTournamentImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('imageId'));
  const direction = z.enum(['up', 'down']).safeParse(formData.get('direction'));
  if (!id.success || !direction.success) return { ok: false, message: 'Unknown photo.' };

  const { data: photo } = await supabaseAdmin.from('tournament_images').select('id, tournament_id').eq('id', id.data).maybeSingle();
  if (!photo) return { ok: false, message: 'That photo no longer exists.' };

  const { data: gallery } = await supabaseAdmin
    .from('tournament_images')
    .select('id')
    .eq('tournament_id', photo.tournament_id)
    .order('sort_order')
    .order('created_at');
  const order = (gallery ?? []).map((entry) => entry.id);
  const from = order.indexOf(photo.id);
  const to = direction.data === 'up' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= order.length) return { ok: true, message: 'Order unchanged.' };

  [order[from], order[to]] = [order[to], order[from]];
  const results = await Promise.all(
    order.map((imageId, index) => supabaseAdmin.from('tournament_images').update({ sort_order: index }).eq('id', imageId))
  );
  if (results.some((result) => result.error)) {
    console.error('[admin] reorder tournament photos failed', results.find((result) => result.error)?.error);
    return { ok: false, message: 'Could not reorder the photos.' };
  }

  await recordAudit(actor, 'tournament.photos_reordered', 'tournament', photo.tournament_id, { order });
  refreshEvents();
  return { ok: true, message: 'Photo order saved.' };
}

const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  tournament_id: uuid,
  title: z.string({ error: 'Enter a heading.' }).min(1, 'Enter a heading.').max(80),
  body: z.string({ error: 'Enter the text for this block.' }).min(1, 'Enter the text for this block.').max(4000),
});

export async function saveTournamentSection(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = sectionSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, tournament_id, ...fields } = parsed.data;

  if (!id) {
    const { count } = await supabaseAdmin
      .from('tournament_sections')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournament_id);
    const { data, error } = await supabaseAdmin
      .from('tournament_sections')
      .insert({ ...fields, tournament_id, sort_order: count ?? 0 })
      .select('id')
      .single();
    if (error) {
      console.error('[admin] create tournament section failed', error);
      return { ok: false, message: 'Could not add the section.' };
    }
    await recordAudit(actor, 'tournament.section_added', 'tournament', tournament_id, { sectionId: data.id });
    refreshEvents();
    return { ok: true, message: 'Section added.' };
  }

  const { error } = await supabaseAdmin.from('tournament_sections').update(fields).eq('id', id);
  if (error) {
    console.error('[admin] update tournament section failed', error);
    return { ok: false, message: 'Could not save the section.' };
  }
  await recordAudit(actor, 'tournament.section_updated', 'tournament', tournament_id, { sectionId: id });
  refreshEvents();
  return { ok: true, message: 'Section saved.' };
}

export async function deleteTournamentSection(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Unknown section.' };

  const { data, error } = await supabaseAdmin.from('tournament_sections').delete().eq('id', id.data).select('tournament_id').maybeSingle();
  if (error) {
    console.error('[admin] delete tournament section failed', error);
    return { ok: false, message: 'Could not remove the section.' };
  }
  if (!data) return { ok: true, message: 'Section already removed.' };

  await recordAudit(actor, 'tournament.section_removed', 'tournament', data.tournament_id, { sectionId: id.data });
  refreshEvents();
  return { ok: true, message: 'Section removed.' };
}

/* ─── Events (occasions) ─────────────────────────────────────────────────── */

const eventSchema = z
  .object({
    id: z.string().uuid().optional(),
    venue_id: uuid,
    sport_id: z.string().uuid().optional(),
    title: z.string({ error: 'Enter the event name.' }).min(2, 'Enter the event name.').max(120),
    category: z.string({ error: 'Enter a category, e.g. Family Sports Day.' }).min(2).max(80),
    description: z.string().max(2000).optional(),
    format: z.string().max(160).optional(),
    starts_on: z.string({ error: 'Choose a start date.' }).regex(DATE, 'Choose a valid date.'),
    ends_on: z.string({ error: 'Choose an end date.' }).regex(DATE, 'Choose a valid date.'),
    daily_start_time: z.string({ error: 'Choose a start time.' }).regex(TIME, 'Choose a valid time.'),
    daily_end_time: z.string({ error: 'Choose an end time.' }).regex(TIME, 'Choose a valid time.'),
    registration_closes_at: localDateTime,
    entry_fee: z.coerce.number().min(0).max(100000).optional(),
    fee_unit: z.string().max(40).optional(),
    ticket_capacity: z.coerce
      .number({ error: 'Enter how many tickets this event sells.' })
      .int('Use a whole number.')
      .min(1, 'At least 1 ticket.')
      .max(100000),
    max_tickets_per_order: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(STATUSES, { error: 'Choose a status.' }),
  })
  .refine((v) => v.ends_on >= v.starts_on, { error: 'End date must be on or after the start date.', path: ['ends_on'] })
  .refine((v) => v.daily_end_time > v.daily_start_time, { error: 'End time must be after the start time.', path: ['daily_end_time'] });

export async function saveEvent(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = eventSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, sport_id, description, format, fee_unit, entry_fee, ...rest } = parsed.data;

  const values = {
    ...rest,
    sport_id: sport_id || null,
    description: description?.trim() || null,
    format: format?.trim() || null,
    fee_unit: fee_unit?.trim() || 'per person',
    entry_fee: entry_fee ?? null,
    max_tickets_per_order: rest.max_tickets_per_order ?? 10,
  };

  if (!id) {
    const { data, error } = await supabaseAdmin.from('events').insert(values).select('id').single();
    if (error) {
      console.error('[admin] create event failed', error);
      return { ok: false, message: 'Could not create the event.' };
    }
    await recordAudit(actor, 'event.create', 'event', data.id, values);
    refreshEvents();
    redirect(`/admin/events/${data.id}?created=1`);
  }

  const { count: confirmed } = await supabaseAdmin
    .from('event_orders')
    .select('tickets', { count: 'exact', head: true })
    .eq('event_id', id)
    .eq('status', 'CONFIRMED');
  if ((confirmed ?? 0) > values.ticket_capacity) {
    return {
      ok: false,
      message: `${confirmed} tickets are already sold — capacity can't go below that.`,
      fieldErrors: { ticket_capacity: `At least ${confirmed} — tickets are already sold.` },
    };
  }

  const { error } = await supabaseAdmin.from('events').update(values).eq('id', id);
  if (error) {
    console.error('[admin] update event failed', error);
    return { ok: false, message: 'Could not save the event.' };
  }
  await recordAudit(actor, 'event.update', 'event', id, values);
  refreshEvents();
  return { ok: true, message: 'Event saved.' };
}

export async function addEventImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const eventId = z.string().uuid().safeParse(formData.get('eventId'));
  if (!eventId.success) return { ok: false, message: 'Unknown event.' };

  const image = await readImageField(formData, 'image');
  if (!image) return { ok: false, message: 'Choose a photo to upload.' };
  if ('error' in image) return { ok: false, message: image.error };

  const { data: existing } = await supabaseAdmin
    .from('event_images')
    .select('sort_order')
    .eq('event_id', eventId.data)
    .order('sort_order', { ascending: false });
  if ((existing?.length ?? 0) >= MAX_GALLERY_PHOTOS) {
    return { ok: false, message: `An event can have up to ${MAX_GALLERY_PHOTOS} photos.` };
  }

  let url: string;
  try {
    url = await uploadImage(image, 'events');
  } catch (error) {
    console.error('[admin] event photo upload failed', error);
    return { ok: false, message: 'Could not upload the photo. Please try again.' };
  }

  const { data, error } = await supabaseAdmin
    .from('event_images')
    .insert({ event_id: eventId.data, url, sort_order: (existing?.[0]?.sort_order ?? -1) + 1 })
    .select('id')
    .single();
  if (error) {
    await removeImage(url);
    console.error('[admin] save event photo failed', error);
    return { ok: false, message: 'Could not save the photo.' };
  }

  await recordAudit(actor, 'event.photo_added', 'event', eventId.data, { imageId: data.id });
  refreshEvents();
  return { ok: true, message: 'Photo added.' };
}

export async function deleteEventImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('imageId'));
  if (!id.success) return { ok: false, message: 'Unknown photo.' };

  const { data, error } = await supabaseAdmin.from('event_images').delete().eq('id', id.data).select('event_id, url').maybeSingle();
  if (error) {
    console.error('[admin] delete event photo failed', error);
    return { ok: false, message: 'Could not remove the photo.' };
  }
  if (!data) return { ok: false, message: 'That photo was already removed.' };

  await removeImage(data.url);
  await recordAudit(actor, 'event.photo_removed', 'event', data.event_id, { imageId: id.data });
  refreshEvents();
  return { ok: true, message: 'Photo removed.' };
}

export async function moveEventImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('imageId'));
  const direction = z.enum(['up', 'down']).safeParse(formData.get('direction'));
  if (!id.success || !direction.success) return { ok: false, message: 'Unknown photo.' };

  const { data: photo } = await supabaseAdmin.from('event_images').select('id, event_id').eq('id', id.data).maybeSingle();
  if (!photo) return { ok: false, message: 'That photo no longer exists.' };

  const { data: gallery } = await supabaseAdmin
    .from('event_images')
    .select('id')
    .eq('event_id', photo.event_id)
    .order('sort_order')
    .order('created_at');
  const order = (gallery ?? []).map((entry) => entry.id);
  const from = order.indexOf(photo.id);
  const to = direction.data === 'up' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= order.length) return { ok: true, message: 'Order unchanged.' };

  [order[from], order[to]] = [order[to], order[from]];
  const results = await Promise.all(
    order.map((imageId, index) => supabaseAdmin.from('event_images').update({ sort_order: index }).eq('id', imageId))
  );
  if (results.some((result) => result.error)) {
    console.error('[admin] reorder event photos failed', results.find((result) => result.error)?.error);
    return { ok: false, message: 'Could not reorder the photos.' };
  }

  await recordAudit(actor, 'event.photos_reordered', 'event', photo.event_id, { order });
  refreshEvents();
  return { ok: true, message: 'Photo order saved.' };
}

const eventSectionSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: uuid,
  title: z.string({ error: 'Enter a heading.' }).min(1, 'Enter a heading.').max(80),
  body: z.string({ error: 'Enter the text for this block.' }).min(1, 'Enter the text for this block.').max(4000),
});

export async function saveEventSection(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = eventSectionSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, event_id, ...fields } = parsed.data;

  if (!id) {
    const { count } = await supabaseAdmin.from('event_sections').select('id', { count: 'exact', head: true }).eq('event_id', event_id);
    const { data, error } = await supabaseAdmin
      .from('event_sections')
      .insert({ ...fields, event_id, sort_order: count ?? 0 })
      .select('id')
      .single();
    if (error) {
      console.error('[admin] create event section failed', error);
      return { ok: false, message: 'Could not add the section.' };
    }
    await recordAudit(actor, 'event.section_added', 'event', event_id, { sectionId: data.id });
    refreshEvents();
    return { ok: true, message: 'Section added.' };
  }

  const { error } = await supabaseAdmin.from('event_sections').update(fields).eq('id', id);
  if (error) {
    console.error('[admin] update event section failed', error);
    return { ok: false, message: 'Could not save the section.' };
  }
  await recordAudit(actor, 'event.section_updated', 'event', event_id, { sectionId: id });
  refreshEvents();
  return { ok: true, message: 'Section saved.' };
}

export async function deleteEventSection(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Unknown section.' };

  const { data, error } = await supabaseAdmin.from('event_sections').delete().eq('id', id.data).select('event_id').maybeSingle();
  if (error) {
    console.error('[admin] delete event section failed', error);
    return { ok: false, message: 'Could not remove the section.' };
  }
  if (!data) return { ok: true, message: 'Section already removed.' };

  await recordAudit(actor, 'event.section_removed', 'event', data.event_id, { sectionId: id.data });
  refreshEvents();
  return { ok: true, message: 'Section removed.' };
}
