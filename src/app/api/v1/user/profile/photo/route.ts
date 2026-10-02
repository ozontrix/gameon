import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middlewares/auth';
import { supabaseAdmin } from '@/lib/db/supabase';
import { MAX_IMAGE_BYTES, readImageField } from '@/lib/admin/storage';
import { loadProfileIdentity, PROFILE_COLUMNS, PROFILE_PHOTO_BUCKET, profileResponse } from '@/lib/profile';

export const runtime = 'nodejs';
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/** Bound the entire multipart body before parsing, including chunked requests. */
async function readPhotoForm(request: Request) {
  const limit = MAX_IMAGE_BYTES + 64 * 1024;
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing photo');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error('The image must be 3 MB or smaller.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData();
}

export async function POST(request: Request) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    let uploaded: string | null = null;
    try {
      let form: FormData;
      try { form = await readPhotoForm(req); }
      catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Invalid upload' }, { status: 400 });
      }
      const image = await readImageField(form, 'photo');
      if (!image || 'error' in image) {
        return NextResponse.json({ success: false, error: image && 'error' in image ? image.error : 'Choose a profile photo.' }, { status: 400 });
      }

      const { identity } = await loadProfileIdentity(user.id, user.provider);
      const { data: previous, error: readError } = await supabaseAdmin.from('profiles')
        .select('avatar_path').eq('id', user.id).maybeSingle();
      if (readError) throw readError;
      if (!previous) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });

      const path = `${user.id}/${randomUUID()}.${EXTENSIONS[image.type]}`;
      const { error: uploadError } = await supabaseAdmin.storage.from(PROFILE_PHOTO_BUCKET)
        .upload(path, image.bytes, { contentType: image.type, cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      uploaded = path;

      let update = supabaseAdmin.from('profiles').update({ avatar_path: path }).eq('id', user.id);
      update = previous.avatar_path ? update.eq('avatar_path', previous.avatar_path) : update.is('avatar_path', null);
      const { data, error } = await update.select(PROFILE_COLUMNS).maybeSingle();
      if (error || !data) throw error ?? new Error('Your photo changed during upload. Please try again.');
      uploaded = null; // The DB now owns this image; never delete it on a response error.

      if (previous.avatar_path?.startsWith(`${user.id}/`)) {
        const { error: removeError } = await supabaseAdmin.storage.from(PROFILE_PHOTO_BUCKET).remove([previous.avatar_path]);
        if (removeError) console.error('Old profile photo cleanup:', removeError.message);
      }
      return NextResponse.json({ success: true, data: await profileResponse(data, identity) });
    } catch (error) {
      if (uploaded) await supabaseAdmin.storage.from(PROFILE_PHOTO_BUCKET).remove([uploaded]);
      console.error('Profile photo upload error:', error);
      return NextResponse.json({ success: false, error: 'Could not upload your profile photo. Please try again.' }, { status: 500 });
    }
  });
}