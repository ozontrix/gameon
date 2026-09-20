import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

/**
 * The individual courts the app's booking screen picks between. Surface, AC
 * and setting come from the court's type, which owns them, and are flattened
 * here so the app keeps reading one court object. Price isn't per court: it's
 * per slot length, on the court type's slot options.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sportId = searchParams.get('sportId');
    const venueId = searchParams.get('venueId');
    const sportName = searchParams.get('sportName');
    const courtTypeId = searchParams.get('courtTypeId');

    let query = supabaseAdmin
      .from('facilities')
      .select(
        `id, venue_id, name, court_type_id,
         court_types!inner (
           sport_id, is_indoor, has_ac, surface_type, is_active,
           sports!inner ( name )
         ),
         venues!inner ( is_active )`
      )
      .eq('is_active', true)
      .eq('venues.is_active', true)
      .eq('court_types.is_active', true);

    if (courtTypeId) query = query.eq('court_type_id', courtTypeId);
    if (sportId) query = query.eq('court_types.sport_id', sportId);
    if (venueId) query = query.eq('venue_id', venueId);
    if (sportName) query = query.ilike('court_types.sports.name', `%${sportName}%`);

    const { data, error } = await query.order('name');

    if (error) throw error;

    const courts = (data ?? []).map((facility) => ({
      id: facility.id,
      venue_id: facility.venue_id,
      court_type_id: facility.court_type_id,
      name: facility.name,
      sport_id: facility.court_types.sport_id,
      is_indoor: facility.court_types.is_indoor,
      has_ac: facility.court_types.has_ac,
      surface_type: facility.court_types.surface_type,
      sports: { name: facility.court_types.sports.name },
    }));

    return NextResponse.json({ success: true, data: courts });
  } catch (error) {
    console.error('Get Public Facilities Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
