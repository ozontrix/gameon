import { NextResponse } from 'next/server';
import { EventService } from '@/lib/services/event.service';

/** Public, unauthenticated: the events the app's Events rail lists. */
export async function GET() {
  try {
    const events = await EventService.listPublic();
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('Get Events Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
