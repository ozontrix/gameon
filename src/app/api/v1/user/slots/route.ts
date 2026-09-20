import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SlotService } from '@/lib/services/slot.service';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';

// Input validation schema
const querySchema = z.object({
  facilityId: z.string().uuid("Invalid Facility ID format"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  // One of the court type's slot lengths, in minutes. The day is laid out in it.
  duration: z.coerce.number().int().min(5).max(720),
});

export async function GET(request: Request) {
  // Apply a rate limit: 30 requests per 1 minute per IP
  return withRateLimit(request, { limit: 30, windowMs: 60000 }, async (req) => {
    try {
      // 1. Extract and validate query parameters
      const { searchParams } = new URL(req.url);
      const facilityId = searchParams.get('facilityId');
      const date = searchParams.get('date');
      const duration = searchParams.get('duration');

      const validationResult = querySchema.safeParse({ facilityId, date, duration });

      if (!validationResult.success) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: validationResult.error.format() },
          { status: 400 }
        );
      }

      const { facilityId: validFacilityId, date: validDate, duration: durationMinutes } = validationResult.data;

      // 2. Call our Business Logic Service
      // Every slot of the day, each flagged `available`, so the app can grey out taken ones
      const slots = await SlotService.getSlots(validFacilityId, validDate, { durationMinutes });

      // 3. Return the response to the mobile app
      return NextResponse.json({
        success: true,
        data: {
          facilityId: validFacilityId,
          date: validDate,
          durationMinutes,
          slots,
        },
      });
      
    } catch (error: any) {
      console.error('Slot API Error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Internal Server Error' },
        { status: 500 }
      );
    }
  });
}
