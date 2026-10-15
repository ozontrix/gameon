import { NextResponse } from 'next/server';
import { PushService } from '@/lib/services/push.service';

export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const start = Date.now(); let processed = 0;
    for (let batch = 0; batch < 20 && Date.now() - start < 230_000; batch++) {
      const result = await PushService.drain(50);
      processed += result.processed;
      if (!result.configured || result.processed < 50) return NextResponse.json({ ...result, processed }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ configured: true, processed }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ error: 'Push worker unavailable' }, { status: 503 }); }
}