import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('venues')
      .select('id, name, address, timezone')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Get Public Venues Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
