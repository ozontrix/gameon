import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';
import { revokePhoneSession } from '@/lib/phone-session';

const schema = z.object({ refresh_token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });

export async function POST(request: Request) {
  return withRateLimit(request, { limit: 30, windowMs: 60_000 }, async req => {
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) return NextResponse.json({ success: false, error: 'Invalid logout credential.' }, { status: 400 });
    try {
      await revokePhoneSession(body.data.refresh_token);
      return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return NextResponse.json({ success: false, error: 'Server logout is temporarily unavailable.' }, { status: 503 });
    }
  });
}