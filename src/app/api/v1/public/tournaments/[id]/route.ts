import { NextResponse } from 'next/server';
import { TournamentService } from '@/lib/services/tournament.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Public, unauthenticated: one tournament by id, whatever its status. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tournament = UUID.test(id) ? await TournamentService.getPublic(id) : null;

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tournament });
  } catch (error) {
    console.error('Get Tournament Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
