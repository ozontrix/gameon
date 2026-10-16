/**
 * The player's profile row, as `GET /api/v1/user/profile` returns it.
 *
 * Read through the API rather than the database: only the service role may mint
 * a referral code, and the endpoint also creates the row when `handle_new_user`
 * never did. A phone sign-in carries no name until the profile is filled in, so
 * every field here other than `id` may be null.
 */

import { api } from './api-client';

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_path: string | null;
  city: string | null;
  gender: string | null;
  date_of_birth: string | null;
  preferred_sports: string[] | null;
  created_at: string | null;
  updated_at: string | null;
  /** A short-lived signed URL for the avatar, minted per read. */
  avatarUrl: string | null;
  /** True when the *login* contact is a confirmed email. */
  emailVerified: boolean;
  /** True when the *login* contact is a confirmed phone. */
  phoneVerified: boolean;
  /** Which contact the player signs in with; the other is unverified. */
  loginProvider: 'email' | 'phone';
};

/** Reads or heals the caller's own profile. Throws with the server's message. */
export async function fetchMyProfile(): Promise<Profile> {
  const res = (await api.get('/user/profile')) as { data?: Profile };
  if (!res?.data) throw new Error('The server sent no profile.');
  return res.data;
}

/**
 * Only fields that actually changed.
 *
 * Omitting a field never clears it; sending an explicit `null` does. The server
 * refuses the login contact and mints the referral code itself, so neither is here.
 */
export type ProfilePatch = {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  gender?: string | null;
  /** `YYYY-MM-DD`, or null to clear it. */
  dateOfBirth?: string | null;
  preferredSports?: string[];
};

/** Saves the given fields and returns the row as the server now holds it. */
export async function saveMyProfile(patch: ProfilePatch): Promise<Profile> {
  const res = (await api.patch('/user/profile', patch)) as { data?: Profile };
  if (!res?.data) throw new Error('The server sent no profile.');
  return res.data;
}

/** What the upload accepts, matching the endpoint's own allow-list. */
export const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PROFILE_PHOTO_MAX_BYTES = 3 * 1024 * 1024;

/**
 * Uploads a new avatar as multipart field `photo`.
 *
 * A browser has a real `<input type="file">`, so this takes the chosen `File`
 * rather than the handset's image-picker asset. The size and type are checked here
 * as well as on the server so the player is told before 3 MB goes over the wire.
 */
export async function uploadProfilePhoto(file: File): Promise<Profile> {
  if (!PROFILE_PHOTO_TYPES.includes(file.type)) {
    throw new Error('Choose a JPG, PNG or WebP image.');
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    throw new Error('The image must be 3 MB or smaller.');
  }
  const form = new FormData();
  form.append('photo', file);
  const res = (await api.fetch('/user/profile/photo', { method: 'POST', body: form })) as {
    data?: Profile;
  };
  if (!res?.data) throw new Error('The server sent no profile.');
  return res.data;
}
