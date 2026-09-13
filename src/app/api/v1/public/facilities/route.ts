import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sportId = searchParams.get('sportId');
    const venueId = searchParams.get('venueId');
    const sportName = searchParams.get('sportName');

    let query = supabaseAdmin
      .from('facilities')
      .select('id, venue_id, sport_id, name, is_indoor, has_ac, surface_type, price_per_hour, sports!inner(name)')
      .eq('is_active', true);

    if (sportId) query = query.eq('sport_id', sportId);
    if (venueId) query = query.eq('venue_id', venueId);
    if (sportName) query = query.ilike('sports.name', `%${sportName}%`);

    const { data, error } = await query.order('name');

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Get Public Facilities Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
