import { NextResponse } from 'next/server';
import { HomeService } from '@/lib/services/home.service';

/**
 * Content for the app's Home screen: the venue, active banners and a per-sport
 * summary ranked by bookings in the last 30 days. Public, so guests see it too.
 */
export async function GET() {
  try {
    const data = await HomeService.getHome();
    return NextResponse.json(
      { success: true, data },
      // Shared caches may reuse it briefly; banner edits show up within a minute.
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (error) {
    console.error('Get Home Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
