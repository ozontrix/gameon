import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';
import { PhoneSessionError, refreshPhoneSession } from '@/lib/phone-session';

const schema = z.object({ refresh_token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });

export async function POST(request: Request) {
  return withRateLimit(request, { limit: 30, windowMs: 60_000 }, async req => {
    try {
      const body = schema.safeParse(await req.json().catch(() => null));
      if (!body.success) return NextResponse.json({ success: false, error: 'Invalid renewal credential.' }, { status: 400 });
      return NextResponse.json({ success: true, ...await refreshPhoneSession(body.data.refresh_token) },
        { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      if (error instanceof PhoneSessionError) return NextResponse.json({ success: false, error: error.message }, { status: 401 });
      console.error('Phone session renewal failed');
      return NextResponse.json({ success: false, error: 'Session renewal is temporarily unavailable.' }, { status: 503 });
    }
  });
}