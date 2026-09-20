import 'server-only';

import { randomUUID } from 'crypto';

import { supabaseAdmin } from '@/lib/db/supabase';

/** Public bucket created by supabase/migrations/20260917180000_home_content_and_notifications.sql */
const BUCKET = 'media';
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Checks the file's first bytes, so a renamed file of another type is rejected. */
function looksLikeImage(bytes: Uint8Array, type: string): boolean {
  const starts = (...sig: number[]) => sig.every((byte, i) => bytes[i] === byte);
  if (type === 'image/jpeg') return starts(0xff, 0xd8, 0xff);
  if (type === 'image/png') return starts(0x89, 0x50, 0x4e, 0x47);
  if (type === 'image/webp') return starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  return false;
}

/** The uploaded image in a form field, `null` when none was chosen, or a reason it was rejected. */
export async function readImageField(
  formData: FormData,
  field: string
): Promise<{ bytes: Uint8Array; type: string } | { error: string } | null> {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return null;

  if (!EXTENSIONS[file.type]) return { error: 'Upload a JPG, PNG or WebP image.' };
  if (file.size > MAX_IMAGE_BYTES) return { error: 'The image must be 3 MB or smaller.' };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLikeImage(bytes, file.type)) return { error: 'That file is not a valid image.' };
  return { bytes, type: file.type };
}

/** Stores an image in the public media bucket and returns its public URL. */
export async function uploadImage(image: { bytes: Uint8Array; type: string }, folder: 'banners' | 'sports' | 'court-types'): Promise<string> {
  const path = `${folder}/${randomUUID()}.${EXTENSIONS[image.type]}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, image.bytes, {
    contentType: image.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Deletes an image this panel uploaded. URLs from anywhere else are left alone. */
export async function removeImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([url.slice(index + marker.length)]);
  if (error) console.error('[admin] could not remove image', url, error.message);
}
