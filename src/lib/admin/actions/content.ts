'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/db/supabase';
import { NotificationService } from '@/lib/services/notification.service';
import { DEFAULT_TIMEZONE, zonedTimeToUtc } from '@/lib/utils/date-helpers';
import { NOT_ALLOWED, formValues, invalid, type ActionState } from '../action-result';
import { recordAudit } from '../audit';
import { authorize } from '../session';
import { readImageField, removeImage, uploadImage } from '../storage';

const checkbox = z
  .string()
  .optional()
  .transform((value) => value === 'on' || value === 'true');

/** In-app routes only (the app opens links with its router), e.g. `/sports?sport=badminton`. */
const appLink = z
  .string()
  .max(300)
  .regex(/^\/(?!\/)[^\s]*$/, 'Use an app route starting with “/”, e.g. /sports?sport=badminton')
  .optional();

/** `<input type="datetime-local">` value on the venue's clock → ISO instant. */
const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Enter a valid date and time.')
  .optional()
  .transform((value) => {
    if (!value) return null;
    const [date, time] = value.split('T');
    return zonedTimeToUtc(date, `${time}:00`, DEFAULT_TIMEZONE).toISOString();
  });

/* ─── Home banners ───────────────────────────────────────────────────────── */

const bannerSchema = z
  .object({
    id: z.string().uuid().optional(),
    placement: z.enum(['HERO', 'PROMO'], { error: 'Choose where the banner appears.' }),
    title: z.string({ error: 'Enter a headline.' }).min(1, 'Enter a headline.').max(60, 'Keep the headline under 60 characters.'),
    title_accent: z.string().max(60).optional(),
    subtitle: z.string().max(160).optional(),
    badge: z.string().max(20).optional(),
    link: appLink,
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
    is_active: checkbox,
    remove_image: checkbox,
    starts_at: localDateTime,
    ends_at: localDateTime,
  })
  .refine((v) => !v.starts_at || !v.ends_at || v.ends_at > v.starts_at, {
    path: ['ends_at'],
    message: 'The end must be after the start.',
  });

function refreshContent() {
  revalidatePath('/admin', 'layout');
}

export async function saveBanner(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = bannerSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { id, remove_image, ...fields } = parsed.data;

  const image = await readImageField(formData, 'image');
  if (image && 'error' in image) return { ok: false, message: image.error, fieldErrors: { image: image.error } };

  const { data: existing } = id
    ? await supabaseAdmin.from('home_banners').select('image_url').eq('id', id).maybeSingle()
    : { data: null };
  if (id && !existing) return { ok: false, message: 'That banner no longer exists.' };

  const keepsImage = Boolean(existing?.image_url) && !remove_image;
  if (fields.placement === 'HERO' && !image && !keepsImage) {
    return { ok: false, message: 'Hero banners need an image.', fieldErrors: { image: 'Upload an image.' } };
  }

  let imageUrl = remove_image ? null : (existing?.image_url ?? null);
  if (image) {
    try {
      imageUrl = await uploadImage(image, 'banners');
    } catch (error) {
      console.error('[admin] banner image upload failed', error);
      return { ok: false, message: 'Could not upload the image. Please try again.' };
    }
  }

  const values = {
    ...fields,
    title_accent: fields.title_accent ?? null,
    subtitle: fields.subtitle ?? null,
    badge: fields.badge ?? null,
    link: fields.link ?? null,
    image_url: imageUrl,
  };

  const { data, error } = id
    ? await supabaseAdmin.from('home_banners').update(values).eq('id', id).select('id').single()
    : await supabaseAdmin.from('home_banners').insert({ ...values, created_by: actor.id }).select('id').single();

  if (error) {
    if (image) await removeImage(imageUrl);
    console.error('[admin] save banner failed', error);
    return { ok: false, message: 'Could not save the banner.' };
  }

  // The previous picture is no longer referenced.
  if (existing?.image_url && existing.image_url !== imageUrl) await removeImage(existing.image_url);

  await recordAudit(actor, id ? 'banner.update' : 'banner.create', 'banner', data.id, {
    ...values,
    image_changed: Boolean(image) || Boolean(remove_image),
  });
  refreshContent();

  if (!id) redirect('/admin/banners?created=1');
  return { ok: true, message: 'Banner saved. The app shows the change within a minute.' };
}

export async function deleteBanner(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Unknown banner.' };

  const { data, error } = await supabaseAdmin
    .from('home_banners')
    .delete()
    .eq('id', id.data)
    .select('title, placement, image_url')
    .maybeSingle();

  if (error) {
    console.error('[admin] delete banner failed', error);
    return { ok: false, message: 'Could not delete the banner.' };
  }
  if (!data) return { ok: false, message: 'That banner was already deleted.' };

  await removeImage(data.image_url);
  await recordAudit(actor, 'banner.delete', 'banner', id.data, { title: data.title, placement: data.placement });
  refreshContent();
  return { ok: true, message: 'Banner deleted.' };
}

/* ─── Broadcast notifications ────────────────────────────────────────────── */

const broadcastSchema = z.object({
  kind: z.enum(['general', 'offer', 'facility', 'tournament'], { error: 'Choose a type.' }),
  title: z.string({ error: 'Enter a title.' }).min(3, 'Enter a title.').max(80, 'Keep the title under 80 characters.'),
  body: z.string({ error: 'Enter the message.' }).min(5, 'Enter the message.').max(500, 'Keep the message under 500 characters.'),
  link: appLink,
});

export async function sendBroadcast(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const parsed = broadcastSchema.safeParse(formValues(formData));
  if (!parsed.success) return invalid(parsed.error);

  const id = await NotificationService.create({
    userId: null,
    kind: parsed.data.kind,
    title: parsed.data.title,
    body: parsed.data.body,
    link: parsed.data.link ?? null,
    createdBy: actor.id,
  });
  if (!id) return { ok: false, message: 'Could not send the notification.' };

  await recordAudit(actor, 'notification.broadcast', 'notification', id, parsed.data);
  revalidatePath('/admin/notifications');
  return { ok: true, message: 'Sent. Every app user sees it in their notifications.' };
}

export async function deleteBroadcast(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { ok: false, message: 'Unknown notification.' };

  // Only broadcasts: messages about a customer's own booking stay on their record.
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', id.data)
    .is('user_id', null)
    .select('title')
    .maybeSingle();

  if (error) {
    console.error('[admin] delete broadcast failed', error);
    return { ok: false, message: 'Could not delete the notification.' };
  }
  if (!data) return { ok: false, message: 'Only broadcasts can be deleted, and this one is already gone.' };

  await recordAudit(actor, 'notification.delete', 'notification', id.data, { title: data.title });
  revalidatePath('/admin/notifications');
  return { ok: true, message: 'Notification deleted from every user’s list.' };
}

/* ─── Sport photos ───────────────────────────────────────────────────────── */

export async function saveSportImage(_state: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await authorize('ADMIN');
  if (!actor) return NOT_ALLOWED;

  const values = formValues(formData);
  const sportId = z.string().uuid().safeParse(values.sportId);
  if (!sportId.success) return { ok: false, message: 'Unknown sport.' };
  const remove = values.remove === 'true';

  const image = await readImageField(formData, 'image');
  if (image && 'error' in image) return { ok: false, message: image.error };
  if (!image && !remove) return { ok: false, message: 'Choose an image to upload.' };

  const { data: sport } = await supabaseAdmin.from('sports').select('name, image_url').eq('id', sportId.data).maybeSingle();
  if (!sport) return { ok: false, message: 'That sport no longer exists.' };

  let imageUrl: string | null = null;
  if (image) {
    try {
      imageUrl = await uploadImage(image, 'sports');
    } catch (error) {
      console.error('[admin] sport image upload failed', error);
      return { ok: false, message: 'Could not upload the image. Please try again.' };
    }
  }

  const { error } = await supabaseAdmin.from('sports').update({ image_url: imageUrl }).eq('id', sportId.data);
  if (error) {
    await removeImage(imageUrl);
    console.error('[admin] save sport image failed', error);
    return { ok: false, message: 'Could not save the image.' };
  }
  await removeImage(sport.image_url);

  await recordAudit(actor, remove ? 'sport.image_removed' : 'sport.image_updated', 'sport', sportId.data, { name: sport.name });
  refreshContent();
  return { ok: true, message: remove ? `Photo removed from ${sport.name}.` : `Photo updated for ${sport.name}.` };
}
