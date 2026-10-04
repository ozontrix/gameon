import 'server-only';
import { supabaseAdmin } from '@/lib/db/supabase';
import type { LeagueConfirmation } from '@/lib/league/confirmation';
import type { EntryQuote } from '@/lib/league/entry';
import type { LeagueBooking } from '@/lib/league/bookings';
import { LEAGUE_SPORT_IDS } from '@/lib/league/entry';
import { PAGE_SIZE } from '../constants';

export type LeagueFilters = { q?: string; sport?: string; status?: string; page?: string };
export type LeagueSearchParams = { [K in keyof LeagueFilters]?: string | string[] };

export function leagueParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function readLeagueFilters(params: LeagueSearchParams): LeagueFilters {
  const sport = leagueParam(params.sport);
  const status = leagueParam(params.status);
  return {
    q: leagueParam(params.q)?.replace(/[^\p{L}\p{N}@+ ._-]/gu, '').trim().slice(0, 100) || undefined,
    sport: LEAGUE_SPORT_IDS.includes(sport as typeof LEAGUE_SPORT_IDS[number]) ? sport : undefined,
    status: ['PENDING', 'CONFIRMED'].includes(status ?? '') ? status : undefined,
  };
}

export function leagueDetails(booking: LeagueBooking) {
  return { entry: booking.entry as unknown as LeagueConfirmation['entry'], quote: booking.quote as unknown as EntryQuote };
}

export async function listLeagueBookings(filters: LeagueFilters, page: number, pageSize = PAGE_SIZE) {
  let query = supabaseAdmin.from('league_bookings').select('*', { count: 'exact' });
  if (filters.sport) query = query.or(`sport.eq.${filters.sport},entry.cs.${JSON.stringify({ sports: [{ id: filters.sport }] })}`);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.q) {
    // Keep underscores so Razorpay identifiers (order_... / pay_...) match.
    const term = filters.q;
    query = query.or(['captain_name', 'team_name', 'email', 'phone', 'reference', 'razorpay_order_id', 'razorpay_payment_id']
      .map(field => `${field}.ilike.%${term}%`).join(','));
  }
  const { data, error, count } = await query.order('created_at', { ascending: false }).order('id')
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  return { bookings: data ?? [], total: count ?? 0 };
}

export async function getLeagueBooking(id: string) {
  const { data, error } = await supabaseAdmin.from('league_bookings').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}