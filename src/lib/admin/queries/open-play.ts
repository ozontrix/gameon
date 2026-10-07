import 'server-only';
import { supabaseAdmin } from '@/lib/db/supabase';
import { OPEN_PLAY_DATE, OPEN_PLAY_SPORT_IDS, type OpenPlaySport } from '@/lib/open-play/constants';
import { PAGE_SIZE } from '../constants';

export type OpenPlayFilters = { q?: string; sport?: OpenPlaySport; page?: string };
export type OpenPlaySearchParams = { q?: string | string[]; sport?: string | string[]; page?: string | string[] };
export function readOpenPlayFilters(params: OpenPlaySearchParams): OpenPlayFilters {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const sport = first(params.sport);
  return {
    q: first(params.q)?.replace(/[^\p{L}\p{N}@+ .-]/gu, '').trim().slice(0, 100) || undefined,
    sport: OPEN_PLAY_SPORT_IDS.includes(sport as OpenPlaySport) ? sport as OpenPlaySport : undefined,
  };
}
export async function listOpenPlayRegistrations(filters: OpenPlayFilters, page: number, pageSize = PAGE_SIZE) {
  let query = supabaseAdmin.from('open_play_registrations').select('*', { count: 'exact' }).eq('event_date', OPEN_PLAY_DATE);
  if (filters.sport) query = query.eq('sport', filters.sport);
  if (filters.q) query = query.or(['full_name', 'email', 'phone', 'city'].map(field => `${field}.ilike.%${filters.q}%`).join(','));
  const { data, error, count } = await query.order('created_at', { ascending: false }).order('id')
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  return { registrations: data ?? [], total: count ?? 0 };
}
export async function openPlayRegistrationStats() {
  const counts = await Promise.all(OPEN_PLAY_SPORT_IDS.map(async sport => {
    const { count, error } = await supabaseAdmin.from('open_play_registrations').select('id', { count: 'exact', head: true })
      .eq('event_date', OPEN_PLAY_DATE).eq('sport', sport);
    if (error) throw error;
    return [sport, count ?? 0] as const;
  }));
  return Object.fromEntries(counts) as Record<OpenPlaySport, number>;
}