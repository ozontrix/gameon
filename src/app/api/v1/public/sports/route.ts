import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// Public endpoint to fetch all active sports
// Does not require authentication so guests can browse
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('sports')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Get Public Sports Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
