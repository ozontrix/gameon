import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AdminService } from '@/lib/services/admin.service';
import { withAuth, AuthenticatedUser } from '@/lib/middlewares/auth';

/**
 * A court is just a named unit of its type now: surface, AC, setting and
 * price all belong to the court type it points at.
 */
const createFacilitySchema = z.object({
  court_type_id: z.string().uuid('Invalid Court Type ID'),
  name: z.string().min(1, 'Name is required'),
  is_active: z.boolean().default(true),
});

export async function GET(request: Request) {
  return withAuth(request, ['ADMIN', 'STAFF'], async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const venueId = searchParams.get('venueId') || undefined;

      const facilities = await AdminService.getFacilities(venueId);
      return NextResponse.json({ success: true, data: facilities });
    } catch (error: any) {
      console.error('Get Facilities Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}

export async function POST(request: Request) {
  return withAuth(request, ['ADMIN'], async (req, user: AuthenticatedUser) => {
    try {
      const body = await req.json();
      const validation = createFacilitySchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid payload', details: validation.error.format() },
          { status: 400 }
        );
      }

      const facility = await AdminService.createFacility(validation.data);

      return NextResponse.json({
        success: true,
        message: 'Facility created successfully',
        data: facility,
      }, { status: 201 });

    } catch (error: any) {
      console.error('Create Facility Error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}
