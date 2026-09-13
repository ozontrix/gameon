import { NextResponse } from 'next/server';
import { z } from 'zod';
import { BookingService } from '@/lib/services/booking.service';

const qrSchema = z.object({
  bookingId: z.string().uuid("Invalid QR Code (Not a UUID)"),
});

export async function POST(request: Request) {
  try {
    // ⚠️ Security Note: In a real app, this endpoint MUST be protected by Admin/Staff Auth Middleware
    // Ensure the request comes from an authenticated staff member.

    const body = await request.json();
    const validation = qrSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid QR Code Format' },
        { status: 400 }
      );
    }

    const result = await BookingService.verifyQRCode(validation.data.bookingId);

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('QR Verification Error:', error.message);
    
    // Return 400 or 403 based on the error type so the Staff App can show a red screen
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'QR Verification Failed' 
      },
      { status: 400 }
    );
  }
}
