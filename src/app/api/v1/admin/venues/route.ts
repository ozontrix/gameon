import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminService } from '@/lib/services/admin.service';

const createVenueSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  timezone: z.string().default('Asia/Kolkata'),
  is_active: z.boolean().default(true),
});

export async function GET() {
  try {
    const venues = await AdminService.getVenues();
    return NextResponse.json({ success: true, data: venues });
  } catch (error: any) {
    console.error('Get Venues Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // In production, verify Admin JWT token here.

    const body = await request.json();
    const validation = createVenueSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: validation.error.format() },
        { status: 400 }
      );
    }

    const venue = await AdminService.createVenue(validation.data);

    return NextResponse.json({
      success: true,
      message: 'Venue created successfully',
      data: venue,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create Venue Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
