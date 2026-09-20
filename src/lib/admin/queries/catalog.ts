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
      .select('day_of_week, open_time, close_time')
      .eq('venue_id', id)
      .order('day_of_week'),
    supabaseAdmin
      .from('facilities')
      .select('id, name, is_active, court_types ( id, name, surface_type, is_indoor, has_ac, sports ( name ) )')
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

/* ─── Court types (the priced product) ───────────────────────────────────── */

export async function listCourtTypes(filters: { venue?: string; sport?: string }) {
  let query = supabaseAdmin
    .from('court_types')
    .select(
      `id, slug, name, surface_type, is_indoor, has_ac, is_active, sort_order,
       venue_id, sport_id, venues ( name ), sports ( name ), facilities ( count ),
       court_type_slot_options ( duration_minutes, price, is_active )`
    )
    .order('sort_order');
  if (filters.venue && UUID.test(filters.venue)) query = query.eq('venue_id', filters.venue);
  if (filters.sport && UUID.test(filters.sport)) query = query.eq('sport_id', filters.sport);
  const { data, error } = await query;
  if (error) throw error;
  return data.map(({ court_type_slot_options: options, ...type }) => ({
    ...type,
    courtCount: type.facilities[0]?.count ?? 0,
    slotOptions: options
      .filter((option) => option.is_active)
      .sort((a, b) => a.duration_minutes - b.duration_minutes),
  }));
}

export async function getCourtType(id: string) {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabaseAdmin
    .from('court_types')
    .select(
      `id, slug, name, description, surface_type, is_indoor, has_ac,
       sort_order, is_active, venue_id, sport_id`
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [courts, amenities, rules, images, slotOptions] = await Promise.all([
    supabaseAdmin.from('facilities').select('id, name, is_active').eq('court_type_id', id).order('name'),
    supabaseAdmin.from('court_type_amenities').select('amenity_id').eq('court_type_id', id),
    supabaseAdmin.from('court_type_rules').select('id, rule, sort_order').eq('court_type_id', id).order('sort_order'),
    supabaseAdmin
      .from('court_type_images')
      .select('id, url, sort_order')
      .eq('court_type_id', id)
      .order('sort_order')
      .order('created_at'),
    supabaseAdmin
      .from('court_type_slot_options')
      .select('id, duration_minutes, price, is_active')
      .eq('court_type_id', id)
      .order('duration_minutes'),
  ]);

  return {
    courtType: data,
    courts: courts.data ?? [],
    amenityIds: (amenities.data ?? []).map((row) => row.amenity_id),
    rules: rules.data ?? [],
    images: images.data ?? [],
    slotOptions: slotOptions.data ?? [],
  };
}

export async function listAmenities() {
  const { data, error } = await supabaseAdmin
    .from('amenities')
    .select('id, slug, label, icon_family, icon_name')
    .order('sort_order');
  if (error) throw error;
  return data;
}

/* ─── Courts (the individual bookable units) ─────────────────────────────── */

export async function listCourts(filters: { venue?: string; sport?: string }) {
  let query = supabaseAdmin
    .from('facilities')
    .select(
      `id, name, is_active, venue_id, court_type_id, venues ( name ),
       court_types!inner ( name, surface_type, is_indoor, has_ac, sport_id, sports ( name ) )`
    )
    .order('name');
  if (filters.venue && UUID.test(filters.venue)) query = query.eq('venue_id', filters.venue);
  if (filters.sport && UUID.test(filters.sport)) query = query.eq('court_types.sport_id', filters.sport);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getCourt(id: string) {
  if (!UUID.test(id)) return null;
  const { data, error } = await supabaseAdmin
    .from('facilities')
    .select('id, name, is_active, venue_id, court_type_id')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Venues, sports, court types and courts for the catalog and closure forms. */
export async function listCatalogOptions() {
  const [venues, sports, courtTypes, courts] = await Promise.all([
    supabaseAdmin.from('venues').select('id, name, is_active').order('name'),
    supabaseAdmin.from('sports').select('id, name, is_active').order('name'),
    supabaseAdmin.from('court_types').select('id, name, venue_id, sport_id, is_active').order('sort_order'),
    supabaseAdmin.from('facilities').select('id, name, venue_id').order('name'),
  ]);
  return {
    venues: venues.data ?? [],
    sports: sports.data ?? [],
    courtTypes: courtTypes.data ?? [],
    courts: courts.data ?? [],
  };
}

export async function listSports() {
  const { data, error } = await supabaseAdmin
    .from('sports')
    .select('id, name, is_active, image_url, court_types ( facilities ( count ) )')
    .order('name');
  if (error) throw error;
  return data.map((sport) => ({
    ...sport,
    courtCount: sport.court_types.reduce((total, type) => total + (type.facilities[0]?.count ?? 0), 0),
  }));
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
