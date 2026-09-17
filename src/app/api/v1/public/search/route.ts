import { NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/middlewares/rate-limiter';
import { HomeService } from '@/lib/services/home.service';

/** Sports and courts matching `?q=` (at least 2 characters). */
export async function GET(request: Request) {
  return withRateLimit(request, { limit: 60, windowMs: 60_000 }, async (req) => {
    try {
      const q = (new URL(req.url).searchParams.get('q') ?? '').slice(0, 60);
      const data = await HomeService.search(q);
      return NextResponse.json({ success: true, data: { query: q, ...data } });
    } catch (error) {
      console.error('Search Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
