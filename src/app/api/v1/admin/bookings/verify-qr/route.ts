import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ReservationCheckInService } from '@/lib/services/reservation-check-in.service';
import { withAuth } from '@/lib/middlewares/auth';
import { getStaffSession } from '@/lib/admin/session';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';
import { scanFailure } from '@/lib/scanner/result';

const qrSchema = z.object({
  bookingId: z.string().max(128).optional(), // Existing staff clients remain compatible.
  qrData: z.string().max(128).optional(),
  source: z.enum(['hid', 'manual', 'camera', 'api']).default('api'),
  venueId: z.string().uuid().optional(),
  facilityId: z.string().uuid().optional(),
}).refine(value => Boolean(value.qrData?.trim() || value.bookingId?.trim()) &&
  !(value.qrData && value.bookingId), 'Supply one QR value');

const headers = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
  return withRateLimit(request, { limit: 180, windowMs: 60_000, keyPrefix: 'booking-scanner' }, async req => {
    const handle = async (actorId: string) => {
      try {
        if (!req.headers.get('content-type')?.includes('application/json')) {
          return NextResponse.json(scanFailure('invalid'), { status: 415, headers });
        }
        if (Number(req.headers.get('content-length')) > 2048) return NextResponse.json(scanFailure('invalid'), { status: 413, headers });
        const text = await req.text();
        if (text.length > 2048) return NextResponse.json(scanFailure('invalid'), { status: 413, headers });
        let body: unknown;
        try { body = JSON.parse(text); } catch { return NextResponse.json(scanFailure('invalid'), { status: 400, headers }); }
        const validation = qrSchema.safeParse(body);
        if (!validation.success) return NextResponse.json(scanFailure('invalid'), { status: 400, headers });
        const input = validation.data;
        const result = await ReservationCheckInService.verify((input.qrData ?? input.bookingId!).trim(), {
          actorId, source: input.source, venueId: input.venueId, facilityId: input.facilityId,
        });
        // Preserve the legacy top-level success fields; add structured status/details.
        const booking = result.booking;
        return NextResponse.json({ ...result, error: result.success ? undefined : result.message,
          ...(booking ? { bookingId: booking.bookingId, category: booking.category,
            facilityName: booking.facilityName, userName: booking.userName, userPhone: null } : {}),
        }, { status: result.status === 'rate_limited' ? 429 : result.success ? 200 : 400, headers });
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === '42501') return NextResponse.json(scanFailure('unauthorized'), { status: 403, headers });
        console.error('[scanner] verification unavailable', code ?? 'unexpected');
        return NextResponse.json(scanFailure('server_error'), { status: 503, headers });
      }
    };
    try {
      if (req.headers.has('authorization')) return withAuth(req, ['ADMIN', 'STAFF'], (_request, user) => handle(user.id));
      const url = new URL(req.url);
      const origin = req.headers.get('origin');
      const incomingOrigin = `${url.protocol}//${req.headers.get('host') || url.host}`;
      if ((origin && origin !== url.origin && origin !== incomingOrigin) || req.headers.get('sec-fetch-site') === 'cross-site') {
        return NextResponse.json(scanFailure('unauthorized'), { status: 403, headers });
      }
      const actor = await getStaffSession();
      if (!actor) return NextResponse.json(scanFailure('unauthorized'), { status: 401, headers });
      return handle(actor.id);
    } catch {
      return NextResponse.json(scanFailure('server_error'), { status: 503, headers });
    }
  });
}
