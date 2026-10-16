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
