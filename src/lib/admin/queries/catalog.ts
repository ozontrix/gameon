import 'server-only';

import { supabaseAdmin } from '@/lib/db/supabase';
import { todayIn } from '../format';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listVenues() {
  const { data, error } = await supabaseAdmin
    .from('venues')
    .select('id, name, address, timezone, is_active, facilities ( count )')
    .order('name');
  if (error) throw error;
  return data.map((venue) => ({ ...venue, courtCount: venue.facilities[0]?.count ?? 0 }));
}

export async function getVenue(id: string) {
  if (!UUID.test(id)) return null;

  const { data: venue, error } = await supabaseAdmin
    .from('venues')
    .select('id, name, address, timezone, is_active, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!venue) return null;

  const [hours, courts, closures] = await Promise.all([
    supabaseAdmin
      .from('operating_hours')
      .select('day_of_week, open_time, close_time, slot_duration_minutes')
      .eq('venue_id', id)
      .order('day_of_week'),
    supabaseAdmin
      .from('facilities')
      .select('id, name, surface_type, is_indoor, has_ac, price_per_hour, is_active, sports ( name )')
      .eq('venue_id', id)
      .order('name'),
    supabaseAdmin
      .from('holidays_and_closures')
      .select('id, date, start_time, end_time, reason, facilities ( name )')
      .eq('venue_id', id)
      .gte('date', todayIn(venue.timezone ?? undefined))
      .order('date')
      .limit(10),
  ]);

  return { venue, hours: hours.data ?? [], courts: courts.data ?? [], closures: closures.data ?? [] };
}

export async function listCourts(filters: { venue?: string; sport?: string }) {
  let query = supabaseAdmin
    .from('facilities')
    .select('id, name, surface_type, is_indoor, has_ac, price_per_hour, is_active, venue_id, sport_id, venues ( name ), sports ( name )')
    .order('name');
  if (filters.venue && UUID.test(filters.venue)) query = query.eq('venue_id', filters.venue);
  if (filters.sport && UUID.test(filters.sport)) query = query.eq('sport_id', filters.sport);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCourt(id: string) {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabaseAdmin
    .from('facilities')
    .select('id, name, surface_type, is_indoor, has_ac, price_per_hour, is_active, venue_id, sport_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Venues and sports for court and closure forms. */
export async function listCatalogOptions() {
  const [venues, sports, courts] = await Promise.all([
    supabaseAdmin.from('venues').select('id, name, is_active').order('name'),
    supabaseAdmin.from('sports').select('id, name, is_active').order('name'),
    supabaseAdmin.from('facilities').select('id, name, venue_id').order('name'),
  ]);
  return { venues: venues.data ?? [], sports: sports.data ?? [], courts: courts.data ?? [] };
}

export async function listSports() {
  const { data, error } = await supabaseAdmin
    .from('sports')
    .select('id, name, is_active, facilities ( count )')
    .order('name');
  if (error) throw error;
  return data.map((sport) => ({ ...sport, courtCount: sport.facilities[0]?.count ?? 0 }));
}

export async function listClosures(view: 'upcoming' | 'past') {
  const today = todayIn();
  let query = supabaseAdmin
    .from('holidays_and_closures')
    .select('id, date, start_time, end_time, reason, venue_id, facility_id, venues ( name ), facilities ( name )');
  query =
    view === 'upcoming'
      ? query.gte('date', today).order('date', { ascending: true })
      : query.lt('date', today).order('date', { ascending: false });
  const { data, error } = await query.limit(200);
  if (error) throw error;
  return data;
}
