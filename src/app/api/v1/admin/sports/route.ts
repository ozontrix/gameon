import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/db/supabase';
import { Database } from '@/types/database.types';

const createSportSchema = z.object({
  name: z.string().min(1, "Name is required"),
  is_active: z.boolean().default(true),
});

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('sports')
      .select('*')
      .order('name');

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Get Sports Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = createSportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('sports')
      .insert(validation.data)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Sport created successfully',
      data,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create Sport Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
